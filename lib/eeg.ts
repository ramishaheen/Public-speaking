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

// Default ThinkGear Connector endpoint. Some local bridges expose a
// WebSocket on this port; configurable for advanced setups.
const TGC_WS_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_THINKGEAR_WS) ||
  "ws://127.0.0.1:13854";

export function startEEG(
  mode: EEGMode,
  onSample: (s: EEGSample) => void,
  onStatus: (s: EEGStatus, detail?: string) => void,
): EEGHandle {
  if (mode === "sim") return startSimulation(onSample, onStatus);
  return startDevice(onSample, onStatus);
}

// ---------------- Real device (ThinkGear Connector) ----------------
function startDevice(
  onSample: (s: EEGSample) => void,
  onStatus: (s: EEGStatus, detail?: string) => void,
): EEGHandle {
  onStatus("connecting");
  let ws: WebSocket | null = null;
  let closed = false;

  try {
    ws = new WebSocket(TGC_WS_URL);
  } catch (e) {
    onStatus("error", "Could not open a connection to the ThinkGear Connector.");
    return { stop: () => {} };
  }

  const failTimer = setTimeout(() => {
    if (ws && ws.readyState !== WebSocket.OPEN) {
      onStatus(
        "error",
        "No ThinkGear Connector detected. Start the NeuroSky ThinkGear Connector app (or use Simulation).",
      );
      try {
        ws?.close();
      } catch {}
    }
  }, 4000);

  ws.onopen = () => {
    clearTimeout(failTimer);
    onStatus("connected");
    // Ask the connector for JSON output.
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
      if (typeof a === "number") {
        onSample({ attention: clamp(a), meditation: clamp(m ?? 0), poorSignal: poor });
      }
    } catch {
      /* ignore malformed frames */
    }
  };

  ws.onerror = () => {
    if (!closed)
      onStatus(
        "error",
        "Connection error. Ensure the ThinkGear Connector is running, then retry — or use Simulation.",
      );
  };

  ws.onclose = () => {
    clearTimeout(failTimer);
  };

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
