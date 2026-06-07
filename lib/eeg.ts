"use client";

// ============================================================
// EEG / MindWave focus source.
// ------------------------------------------------------------
// Supports a real NeuroSky MindWave headset via the ThinkGear
// Connector (a small app that runs on the user's machine and
// exposes a local socket), and a built-in Simulation mode so the
// focus assessment is fully usable without hardware.
//
// ThinkGear Socket Protocol streams JSON lines like:
//   {"eSense":{"attention":57,"meditation":40},"poorSignalLevel":0}
// ============================================================

export interface BandPowers {
  delta: number; // 0-100 display scale
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
}

export interface EEGSample {
  attention: number; // 0-100 focus (eSense attention)
  meditation: number; // 0-100 calm (eSense meditation)
  poorSignal: number; // 0 = perfect contact, 200 = no contact
  bands?: BandPowers; // live EEG band powers (delta..gamma)
}

// What each brainwave band reflects for public speaking.
export const BAND_MEANING: { key: keyof BandPowers; label: string; hz: string; color: string; meaning: string }[] = [
  { key: "delta", label: "Delta", hz: "0.5–4 Hz", color: "#6366f1", meaning: "Deep rest. High while speaking = disengaged or drowsy — keep this low." },
  { key: "theta", label: "Theta", hz: "4–8 Hz", color: "#1FB6A8", meaning: "Mind-wandering & imagination. Spikes = distraction; a little fuels storytelling." },
  { key: "alpha", label: "Alpha", hz: "8–12 Hz", color: "#39FF14", meaning: "Calm, relaxed alertness — your composed-confidence band. Healthy alpha = low nerves." },
  { key: "beta", label: "Beta", hz: "12–30 Hz", color: "#E6B800", meaning: "Active focus & engagement while presenting. Very high = over-arousal / anxiety." },
  { key: "gamma", label: "Gamma", hz: "30+ Hz", color: "#f472b6", meaning: "Peak processing & sharp articulation — brief bursts when you're 'on'." },
];

export type EEGStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "no-signal"
  | "error"
  | "simulating";

export interface EEGHandle {
  stop: () => void;
}

export type EEGMode = "device" | "sim";

// Optional WebSocket bridge to a local ThinkGear server (advanced setups).
// NOTE: a hosted HTTPS page cannot open an insecure ws:// URL, so the default
// device path is the Web Serial API (works browser-native over HTTPS).
const TGC_WS_URL =
  typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_THINKGEAR_WS : undefined;

// MindWave (USB dongle) is typically 9600; MindWave Mobile is 57600.
const MINDWAVE_BAUD =
  (typeof process !== "undefined" && Number(process.env?.NEXT_PUBLIC_MINDWAVE_BAUD)) || 57600;

export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

// Remembered MindWave serial port, so reconnects skip the picker dialog.
let preferredPort: any = null;

export function startEEG(
  mode: EEGMode,
  onSample: (s: EEGSample) => void,
  onStatus: (s: EEGStatus, detail?: string) => void,
  opts?: { baud?: number },
): EEGHandle {
  if (mode === "sim") return startSimulation(onSample, onStatus);
  if (TGC_WS_URL) return startThinkGearWS(TGC_WS_URL, onSample, onStatus);
  return startSerial(onSample, onStatus, opts?.baud ?? MINDWAVE_BAUD);
}

// ---------------- Real device via Web Serial (browser-native, HTTPS-safe) ----------------
// Reads the ThinkGear binary stream directly from the MindWave's serial port
// (USB dongle, or a Bluetooth-paired MindWave Mobile that appears as a COM port).
function startSerial(
  onSample: (s: EEGSample) => void,
  onStatus: (s: EEGStatus, detail?: string) => void,
  baud: number,
): EEGHandle {
  if (!isWebSerialSupported()) {
    onStatus(
      "error",
      "This browser can't access serial devices. Use Chrome or Edge on desktop, or run Simulation.",
    );
    return { stop: () => {} };
  }

  onStatus("connecting");
  let cancelled = false;
  let port: any = null;
  let reader: any = null;

  (async () => {
    const serial = (navigator as any).serial;
    try {
      // Auto-pick: reuse the MindWave the user granted before (this session or
      // a previous one) so they don't have to choose from the dialog each time.
      let chosen: any = preferredPort;
      if (!chosen) {
        try {
          const granted = await serial.getPorts();
          if (granted && granted.length === 1) chosen = granted[0];
        } catch {}
      }
      // Otherwise show the picker (must run inside the click gesture).
      if (!chosen) chosen = await serial.requestPort();
      port = chosen;
      try {
        await port.open({ baudRate: baud });
      } catch {
        // A remembered port can go stale; fall back to a fresh pick once.
        if (chosen === preferredPort) {
          preferredPort = null;
          port = await serial.requestPort();
          await port.open({ baudRate: baud });
        } else {
          throw new Error("open failed");
        }
      }
      preferredPort = port; // remember for next time
    } catch (e: any) {
      if (!cancelled)
        onStatus(
          "error",
          "No device selected, or the port couldn't open. Pick \"MindWave Mobile\" in the dialog (or run Simulation).",
        );
      return;
    }

    onStatus("connected", "Port open — waiting for data…");
    const parser = new ThinkGearParser((sample) => {
      if (cancelled) return;
      onSample(sample); // includes poorSignal so the UI can show contact quality
    });

    try {
      reader = port.readable.getReader();
      while (!cancelled) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) parser.push(value as Uint8Array);
      }
    } catch (e: any) {
      if (!cancelled) onStatus("error", "Lost connection to the device.");
    } finally {
      try {
        reader?.releaseLock();
      } catch {}
      try {
        await port?.close();
      } catch {}
    }
  })();

  return {
    stop: () => {
      cancelled = true;
      try {
        reader?.cancel();
      } catch {}
      try {
        port?.close();
      } catch {}
    },
  };
}

// ThinkGear binary protocol parser.
// Packet: 0xAA 0xAA <pLen> <payload[pLen]> <checksum>
// Payload codes: 0x02 poorSignal, 0x04 attention, 0x05 meditation (each 1 byte).
class ThinkGearParser {
  private buf: number[] = [];
  private poorSignal = 200;
  private lastAttention = 0;
  private lastMeditation = 0;
  private bands: BandPowers | undefined;
  constructor(private emit: (s: EEGSample) => void) {}

  push(chunk: Uint8Array) {
    for (let i = 0; i < chunk.length; i++) this.buf.push(chunk[i]);
    this.parse();
  }

  private parse() {
    while (this.buf.length >= 4) {
      // find sync 0xAA 0xAA
      if (this.buf[0] !== 0xaa || this.buf[1] !== 0xaa) {
        this.buf.shift();
        continue;
      }
      const pLen = this.buf[2];
      if (pLen >= 0xaa) {
        // invalid length, resync
        this.buf.shift();
        continue;
      }
      if (this.buf.length < 3 + pLen + 1) return; // wait for more bytes
      const payload = this.buf.slice(3, 3 + pLen);
      const checksum = this.buf[3 + pLen];
      const sum = payload.reduce((a, b) => (a + b) & 0xff, 0);
      const expected = ~sum & 0xff;
      this.buf = this.buf.slice(3 + pLen + 1);
      if (checksum !== expected) continue; // drop corrupt packet
      this.handlePayload(payload);
    }
  }

  private handlePayload(p: number[]) {
    let i = 0;
    let updated = false;
    while (i < p.length) {
      const code = p[i++];
      if (code === 0x55) {
        // EXCODE marker — no value byte, the real code follows
        continue;
      } else if (code === 0x02) {
        this.poorSignal = p[i++];
        updated = true;
      } else if (code === 0x04) {
        this.lastAttention = p[i++];
        updated = true;
      } else if (code === 0x05) {
        this.lastMeditation = p[i++];
        updated = true;
      } else if (code === 0x83) {
        // ASIC EEG power: 8 bands × 3-byte big-endian values
        const len = p[i++];
        if (len === 24) {
          const raw: number[] = [];
          for (let b = 0; b < 8; b++) {
            const v = (p[i] << 16) | (p[i + 1] << 8) | p[i + 2];
            raw.push(v);
            i += 3;
          }
          // raw order: delta, theta, lowAlpha, highAlpha, lowBeta, highBeta, lowGamma, midGamma
          const norm = (v: number) => clamp(Math.round(Math.log10(v + 1) * 14));
          this.bands = {
            delta: norm(raw[0]),
            theta: norm(raw[1]),
            alpha: norm((raw[2] + raw[3]) / 2),
            beta: norm((raw[4] + raw[5]) / 2),
            gamma: norm((raw[6] + raw[7]) / 2),
          };
          updated = true;
        } else {
          i += len;
        }
      } else if (code >= 0x80) {
        // other multi-byte value: next byte is length
        const len = p[i++];
        i += len;
      } else {
        // other single-byte value (e.g. blink) we don't use
        i += 1;
      }
    }
    // Emit on any relevant update — including poor-signal-only packets — so the
    // UI can show that data is flowing and the current contact quality.
    if (updated) {
      this.emit({
        attention: clamp(this.lastAttention),
        meditation: clamp(this.lastMeditation),
        poorSignal: this.poorSignal,
        bands: this.bands,
      });
    }
  }
}

// ---------------- Optional ThinkGear WebSocket bridge (advanced) ----------------
function startThinkGearWS(
  url: string,
  onSample: (s: EEGSample) => void,
  onStatus: (s: EEGStatus, detail?: string) => void,
): EEGHandle {
  onStatus("connecting");
  let ws: WebSocket | null = null;
  let closed = false;

  try {
    ws = new WebSocket(url);
  } catch {
    onStatus("error", "Could not open the ThinkGear WebSocket bridge.");
    return { stop: () => {} };
  }

  const failTimer = setTimeout(() => {
    if (ws && ws.readyState !== WebSocket.OPEN) {
      onStatus("error", "No ThinkGear bridge detected at " + url + " (or run Simulation).");
      try {
        ws?.close();
      } catch {}
    }
  }, 4000);

  ws.onopen = () => {
    clearTimeout(failTimer);
    onStatus("connected");
    try {
      ws?.send(JSON.stringify({ enableRawOutput: false, format: "Json" }));
    } catch {}
  };
  ws.onmessage = (evt) => {
    if (closed) return;
    try {
      const data = JSON.parse(String(evt.data));
      const a = data?.eSense?.attention;
      const m = data?.eSense?.meditation;
      const poor = typeof data?.poorSignalLevel === "number" ? data.poorSignalLevel : 0;
      if (poor >= 200) onStatus("no-signal", "Adjust the headset — no signal.");
      else onStatus("connected");
      if (typeof a === "number")
        onSample({ attention: clamp(a), meditation: clamp(m ?? 0), poorSignal: poor });
    } catch {
      /* ignore */
    }
  };
  ws.onerror = () => {
    if (!closed) onStatus("error", "WebSocket bridge error — or run Simulation.");
  };
  ws.onclose = () => clearTimeout(failTimer);

  return {
    stop: () => {
      closed = true;
      clearTimeout(failTimer);
      try {
        ws?.close();
      } catch {}
    },
  };
}

// ---------------- Simulation (no hardware) ----------------
// Produces a realistic attention signal: a random walk that drifts,
// with occasional distraction dips and focus surges.
function startSimulation(
  onSample: (s: EEGSample) => void,
  onStatus: (s: EEGStatus) => void,
): EEGHandle {
  onStatus("simulating");
  let attention = 55 + Math.random() * 15;
  let meditation = 50 + Math.random() * 15;
  let t = 0;

  const id = setInterval(() => {
    t += 1;
    // gentle drift toward a moving target
    const target = 60 + 18 * Math.sin(t / 9) + (Math.random() - 0.5) * 14;
    attention += (target - attention) * 0.25 + (Math.random() - 0.5) * 6;
    // occasional distraction dip
    if (Math.random() < 0.06) attention -= 18 + Math.random() * 15;
    // occasional focus surge
    if (Math.random() < 0.05) attention += 12 + Math.random() * 12;
    attention = clamp(attention);

    meditation += (55 - meditation) * 0.15 + (Math.random() - 0.5) * 8;
    meditation = clamp(meditation);

    // Plausible band powers tied to focus/calm, with noise and bursts.
    const j = () => (Math.random() - 0.5) * 14;
    const bands = {
      delta: clamp(100 - attention * 0.6 + j()), // high when disengaged
      theta: clamp(70 - meditation * 0.4 + j()), // mind-wandering
      alpha: clamp(meditation * 0.85 + j()), // calm alertness
      beta: clamp(attention * 0.85 + j()), // active focus
      gamma: clamp(attention * 0.5 + (Math.random() < 0.1 ? 30 : 0) + j()), // bursts
    };

    onSample({
      attention: Math.round(attention),
      meditation: Math.round(meditation),
      poorSignal: 0,
      bands,
    });
  }, 1000);

  return { stop: () => clearInterval(id) };
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ============================================================
// Focus session analytics
// ============================================================
export interface FocusResult {
  focusScore: number; // avg attention
  stability: number; // 100 - normalized volatility
  peak: number;
  timeInFlowPct: number; // % of samples with attention >= 70
  durationSec: number;
  samples: number[];
  createdAt: number;
  noData?: boolean; // true when no usable EEG signal was captured
  validSamples?: number;
}

export function analyzeFocus(samples: number[], durationSec: number): FocusResult {
  // Only count real, non-zero readings — a MindWave reports 0 when there is
  // no clean signal, so an all-zero session means nothing was captured.
  const valid = samples.filter((s) => s > 0);
  if (valid.length < 3) {
    return {
      focusScore: 0,
      stability: 0,
      peak: 0,
      timeInFlowPct: 0,
      durationSec,
      samples,
      createdAt: Date.now(),
      noData: true,
      validSamples: valid.length,
    };
  }
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  const variance = valid.reduce((a, b) => a + (b - avg) ** 2, 0) / valid.length;
  const sd = Math.sqrt(variance);
  const stability = Math.max(0, Math.min(100, Math.round(100 - sd * 2.2)));
  const peak = Math.max(...valid);
  const inFlow = valid.filter((s) => s >= 70).length;
  return {
    focusScore: Math.round(avg),
    stability,
    peak,
    timeInFlowPct: Math.round((inFlow / valid.length) * 100),
    durationSec,
    samples,
    createdAt: Date.now(),
    noData: false,
    validSamples: valid.length,
  };
}

const STORE_KEY = "etihad_focus_last";

export function saveFocusResult(r: FocusResult) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(r));
  } catch {}
}

export function loadFocusResult(): FocusResult | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as FocusResult) : null;
  } catch {
    return null;
  }
}

// Public-speaking-oriented insights from a focus result.
export function focusInsights(r: FocusResult): { headline: string; tips: string[] } {
  const tips: string[] = [];
  let headline: string;
  if (r.focusScore >= 75) {
    headline = "Excellent focus — you hold attention like a seasoned speaker.";
  } else if (r.focusScore >= 55) {
    headline = "Solid focus with room to steady it under the spotlight.";
  } else {
    headline = "Your focus drifts — training it will calm nerves and sharpen delivery.";
  }
  if (r.stability < 60)
    tips.push(
      "Your attention was volatile. Practice a 3-breath reset before speaking to steady it.",
    );
  if (r.timeInFlowPct < 50)
    tips.push(
      `You were in deep focus only ${r.timeInFlowPct}% of the time. Rehearse your opening until it feels automatic so your mind stays present.`,
    );
  if (r.peak >= 85)
    tips.push(
      `You hit a peak of ${r.peak}/100 — you can reach high focus; the goal is to sustain it.`,
    );
  if (r.focusScore >= 75)
    tips.push("Anchor this state with a pre-talk ritual so you can summon it on demand.");
  if (tips.length === 0)
    tips.push("Keep practicing with the headset to build a repeatable focus baseline.");
  return { headline, tips };
}
