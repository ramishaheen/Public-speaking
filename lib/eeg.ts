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

export interface EEGSample {
  attention: number; // 0-100 focus (eSense attention)
  meditation: number; // 0-100 calm (eSense meditation)
  poorSignal: number; // 0 = perfect contact, 200 = no contact
}

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

export function startEEG(
  mode: EEGMode,
  onSample: (s: EEGSample) => void,
  onStatus: (s: EEGStatus, detail?: string) => void,
): EEGHandle {
  if (mode === "sim") return startSimulation(onSample, onStatus);
  if (TGC_WS_URL) return startThinkGearWS(TGC_WS_URL, onSample, onStatus);
  return startSerial(onSample, onStatus);
}

// ---------------- Real device via Web Serial (browser-native, HTTPS-safe) ----------------
// Reads the ThinkGear binary stream directly from the MindWave's serial port
// (USB dongle, or a Bluetooth-paired MindWave Mobile that appears as a COM port).
function startSerial(
  onSample: (s: EEGSample) => void,
  onStatus: (s: EEGStatus, detail?: string) => void,
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
    try {
      // Must run inside the click gesture that called startEEG.
      port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: MINDWAVE_BAUD });
    } catch (e: any) {
      if (!cancelled)
        onStatus(
          "error",
          "No device selected, or the port couldn't open. Pick your MindWave port (or run Simulation).",
        );
      return;
    }

    onStatus("connected");
    const parser = new ThinkGearParser((sample) => {
      if (cancelled) return;
      if (sample.poorSignal >= 200) onStatus("no-signal", "Adjust the headset — no signal.");
      else onStatus("connected");
      onSample(sample);
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
  private poorSignal = 0;
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
    let attention: number | null = null;
    let meditation: number | null = null;
    while (i < p.length) {
      const code = p[i++];
      if (code === 0x02) {
        this.poorSignal = p[i++];
      } else if (code === 0x04) {
        attention = p[i++];
      } else if (code === 0x05) {
        meditation = p[i++];
      } else if (code >= 0x80) {
        // multi-byte value: next byte is length
        const len = p[i++];
        i += len;
      } else {
        // single-byte value we don't use
        i += 1;
      }
    }
    if (attention !== null || meditation !== null) {
      this.emit({
        attention: clamp(attention ?? 0),
        meditation: clamp(meditation ?? 0),
        poorSignal: this.poorSignal,
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

    onSample({ attention: Math.round(attention), meditation: Math.round(meditation), poorSignal: 0 });
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
}

export function analyzeFocus(samples: number[], durationSec: number): FocusResult {
  if (samples.length === 0) {
    return {
      focusScore: 0,
      stability: 0,
      peak: 0,
      timeInFlowPct: 0,
      durationSec,
      samples: [],
      createdAt: Date.now(),
    };
  }
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance =
    samples.reduce((a, b) => a + (b - avg) ** 2, 0) / samples.length;
  const sd = Math.sqrt(variance);
  const stability = Math.max(0, Math.min(100, Math.round(100 - sd * 2.2)));
  const peak = Math.max(...samples);
  const inFlow = samples.filter((s) => s >= 70).length;
  return {
    focusScore: Math.round(avg),
    stability,
    peak,
    timeInFlowPct: Math.round((inFlow / samples.length) * 100),
    durationSec,
    samples,
    createdAt: Date.now(),
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
