"use client";

// ============================================================
// EEG analysis: personal baseline, cleaning, stability scoring,
// and timeline segmentation — per the measurement design doc.
// EEG is a cognitive-state PROXY only (single-channel FP1).
// ============================================================

export interface EEGBaseline {
  meanAttention: number;
  sdAttention: number;
  meanMeditation: number;
  sdMeditation: number;
  n: number;
  createdAt: number;
}

export interface EEGStability {
  score: number; // 0-100 composite
  focusConsistency: number;
  relaxationStability: number;
  recoveryAbility: number;
  baselineAlignment: number;
  signalReliability: number;
  confidence: "low" | "medium" | "high";
}

export interface TimelineSegment {
  label: string;
  avgAttention: number;
  minAttention: number;
  maxAttention: number;
  trend: "rising" | "falling" | "steady";
  note: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function stdev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}

// Drop a short warm-up and zero/no-signal readings, then EMA-smooth.
export function cleanSeries(samples: number[], warmup = 3): number[] {
  const trimmed = samples.slice(Math.min(warmup, Math.floor(samples.length * 0.15)));
  const valid = trimmed.filter((s) => s > 0);
  if (valid.length === 0) return [];
  const out: number[] = [];
  let ema = valid[0];
  const a = 0.3;
  for (const v of valid) {
    ema = a * v + (1 - a) * ema;
    out.push(ema);
  }
  return out;
}

export function computeBaseline(attention: number[], meditation: number[]): EEGBaseline {
  const a = attention.filter((x) => x > 0);
  const m = meditation.filter((x) => x > 0);
  return {
    meanAttention: Math.round(mean(a)),
    sdAttention: Math.round(stdev(a)),
    meanMeditation: Math.round(mean(m)),
    sdMeditation: Math.round(stdev(m)),
    n: a.length,
    createdAt: Date.now(),
  };
}

// EEG stability score per design doc:
// 30% focus consistency + 25% relaxation stability + 20% recovery
// + 15% baseline alignment + 10% signal reliability.
export function eegStability(
  attention: number[],
  meditation: number[],
  validRatio: number,
  baseline?: EEGBaseline | null,
): EEGStability {
  const att = cleanSeries(attention);
  const med = cleanSeries(meditation);

  const focusConsistency = clamp(100 - stdev(att) * 2.2);
  const relaxationStability = clamp(100 - stdev(med) * 2.2);

  // Recovery: how quickly attention returns toward its own mean after dips.
  const m = mean(att);
  let dips = 0;
  let recovered = 0;
  for (let i = 1; i < att.length - 1; i++) {
    if (att[i] < m * 0.7 && att[i - 1] >= m * 0.7) {
      dips++;
      // look ahead up to 5 samples for recovery
      for (let j = i + 1; j < Math.min(att.length, i + 6); j++) {
        if (att[j] >= m * 0.9) {
          recovered++;
          break;
        }
      }
    }
  }
  const recoveryAbility = dips === 0 ? 80 : clamp((recovered / dips) * 100);

  // Baseline alignment: closeness of session mean to the speaking baseline.
  let baselineAlignment = 65;
  if (baseline && baseline.meanAttention > 0) {
    const diff = Math.abs(m - baseline.meanAttention);
    baselineAlignment = clamp(100 - diff * 1.5);
  }

  const signalReliability = clamp(validRatio * 100);

  const score = clamp(
    0.3 * focusConsistency +
      0.25 * relaxationStability +
      0.2 * recoveryAbility +
      0.15 * baselineAlignment +
      0.1 * signalReliability,
  );

  const confidence: EEGStability["confidence"] =
    att.length >= 30 && signalReliability >= 80
      ? "high"
      : att.length >= 15 && signalReliability >= 60
        ? "medium"
        : "low";

  return {
    score,
    focusConsistency,
    relaxationStability,
    recoveryAbility,
    baselineAlignment,
    signalReliability,
    confidence,
  };
}

// Split the attention series into labeled segments (opening → closing).
export function buildTimeline(attention: number[], labels: string[]): TimelineSegment[] {
  const valid = attention.filter((s) => s >= 0);
  if (valid.length === 0) return [];
  const n = labels.length;
  const size = Math.max(1, Math.floor(valid.length / n));
  const segments: TimelineSegment[] = [];
  for (let i = 0; i < n; i++) {
    const slice = valid.slice(i * size, i === n - 1 ? valid.length : (i + 1) * size);
    if (slice.length === 0) continue;
    const avg = clamp(mean(slice));
    const first = mean(slice.slice(0, Math.ceil(slice.length / 2)));
    const last = mean(slice.slice(Math.floor(slice.length / 2)));
    const trend: TimelineSegment["trend"] =
      last - first > 6 ? "rising" : first - last > 6 ? "falling" : "steady";
    const note =
      avg >= 70
        ? "strong, sustained focus"
        : avg >= 50
          ? "moderate focus" + (trend === "falling" ? " — slipping" : "")
          : "focus dipped — possible nervousness or distraction";
    segments.push({
      label: labels[i],
      avgAttention: avg,
      minAttention: clamp(Math.min(...slice)),
      maxAttention: clamp(Math.max(...slice)),
      trend,
      note,
    });
  }
  return segments;
}

const BASELINE_KEY = "etihad_eeg_baseline";
export function saveBaseline(b: EEGBaseline) {
  try {
    localStorage.setItem(BASELINE_KEY, JSON.stringify(b));
  } catch {}
}
export function loadBaseline(): EEGBaseline | null {
  try {
    const raw = localStorage.getItem(BASELINE_KEY);
    return raw ? (JSON.parse(raw) as EEGBaseline) : null;
  } catch {
    return null;
  }
}
