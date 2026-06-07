"use client";

// ============================================================
// Voice & Speech analytics — measures DELIVERY (not just words)
// from a recorded audio Blob using the Web Audio API:
//   pace (WPM), pauses, fillers, vocal energy/dynamics, pitch variation.
// All processing is on-device; nothing is uploaded.
// ============================================================

export interface VoiceMetrics {
  durationSec: number;
  speakingSec: number;
  wpm: number | null;
  pauseCount: number;
  pauseTotalSec: number;
  longestPauseSec: number;
  fillerCount: number;
  fillerWords: string[];
  energyVariationPct: number; // vocal dynamics: 0 = flat/monotone loudness
  pitchMeanHz: number | null;
  pitchVariationSemitones: number | null; // higher = more expressive intonation
  monotoneRisk: number; // 0-100, higher = flatter delivery
  wordCount: number;
}

const FILLERS = [
  "um", "uh", "er", "ah", "like", "you know", "basically", "actually",
  "literally", "sort of", "kind of", "i mean", "well", "so yeah", "right",
];

export function countFillers(transcript: string): { count: number; found: string[] } {
  const t = (transcript || "").toLowerCase();
  const found: string[] = [];
  let count = 0;
  for (const f of FILLERS) {
    const re = new RegExp(`\\b${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    const m = t.match(re);
    if (m) {
      count += m.length;
      found.push(f);
    }
  }
  return { count, found };
}

export async function analyzeVoice(blob: Blob, transcript: string): Promise<VoiceMetrics | null> {
  try {
    const arrayBuf = await blob.arrayBuffer();
    const AC: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    const audio = await ctx.decodeAudioData(arrayBuf.slice(0));
    ctx.close?.();

    const sr = audio.sampleRate;
    const data = audio.getChannelData(0);
    const durationSec = audio.duration;

    // ---- frame-based RMS energy ----
    const frame = Math.max(256, Math.floor(sr * 0.03)); // ~30ms
    const frameDur = frame / sr;
    const rms: number[] = [];
    for (let i = 0; i + frame <= data.length; i += frame) {
      let sum = 0;
      for (let j = 0; j < frame; j++) {
        const v = data[i + j];
        sum += v * v;
      }
      rms.push(Math.sqrt(sum / frame));
    }
    if (rms.length === 0) return null;

    const maxRms = Math.max(...rms);
    const threshold = Math.max(0.015, maxRms * 0.12); // speaking vs silence
    const speakingFrames = rms.filter((r) => r > threshold);
    const speakingSec = speakingFrames.length * frameDur;

    // ---- pause detection (silence runs inside speech) ----
    let pauseCount = 0;
    let pauseTotalSec = 0;
    let longestPauseSec = 0;
    let run = 0;
    let started = false;
    for (let i = 0; i < rms.length; i++) {
      const speaking = rms[i] > threshold;
      if (speaking) {
        if (run > 0 && started) {
          const dur = run * frameDur;
          if (dur >= 0.25) {
            pauseCount++;
            pauseTotalSec += dur;
            longestPauseSec = Math.max(longestPauseSec, dur);
          }
        }
        run = 0;
        started = true;
      } else if (started) {
        run++;
      }
    }

    // ---- vocal dynamics (energy variation across speaking frames) ----
    let energyVariationPct = 0;
    if (speakingFrames.length > 1) {
      const mean = speakingFrames.reduce((a, b) => a + b, 0) / speakingFrames.length;
      const variance =
        speakingFrames.reduce((a, b) => a + (b - mean) ** 2, 0) / speakingFrames.length;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
      energyVariationPct = Math.round(Math.max(0, Math.min(100, cv * 130)));
    }

    // ---- pitch (F0) via autocorrelation on a decimated signal ----
    const pitch = estimatePitch(data, sr, rms, threshold, frame);

    // ---- words / WPM / fillers ----
    const wordCount = (transcript || "").trim().split(/\s+/).filter(Boolean).length;
    const wpm = speakingSec > 1 && wordCount > 0 ? Math.round(wordCount / (speakingSec / 60)) : null;
    const fillers = countFillers(transcript);

    const monotoneRisk =
      pitch.variationSemitones == null
        ? 100 - energyVariationPct
        : Math.round(
            Math.max(0, Math.min(100, 100 - pitch.variationSemitones * 22 - energyVariationPct * 0.3)),
          );

    return {
      durationSec: round1(durationSec),
      speakingSec: round1(speakingSec),
      wpm,
      pauseCount,
      pauseTotalSec: round1(pauseTotalSec),
      longestPauseSec: round1(longestPauseSec),
      fillerCount: fillers.count,
      fillerWords: fillers.found,
      energyVariationPct,
      pitchMeanHz: pitch.meanHz,
      pitchVariationSemitones: pitch.variationSemitones,
      monotoneRisk,
      wordCount,
    };
  } catch {
    return null;
  }
}

function estimatePitch(
  data: Float32Array,
  sr: number,
  rms: number[],
  threshold: number,
  frame: number,
): { meanHz: number | null; variationSemitones: number | null } {
  // Decimate to ~16 kHz for speed.
  const target = 16000;
  const step = Math.max(1, Math.floor(sr / target));
  const dsr = sr / step;
  const minHz = 75;
  const maxHz = 350;
  const minLag = Math.floor(dsr / maxHz);
  const maxLag = Math.floor(dsr / minHz);
  const win = Math.min(1024, maxLag * 2);
  const f0s: number[] = [];

  // Analyze a subset of voiced frames.
  for (let fi = 0; fi < rms.length; fi += 4) {
    if (rms[fi] <= threshold) continue;
    const start = Math.floor((fi * frame) / step);
    if (start + win >= Math.floor(data.length / step)) break;

    // build decimated window
    const w = new Float32Array(win);
    for (let i = 0; i < win; i++) w[i] = data[(start + i) * step] || 0;

    let bestLag = -1;
    let best = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < win - lag; i++) sum += w[i] * w[i + lag];
      if (sum > best) {
        best = sum;
        bestLag = lag;
      }
    }
    // normalize confidence against zero-lag energy
    let energy = 0;
    for (let i = 0; i < win; i++) energy += w[i] * w[i];
    if (bestLag > 0 && energy > 0 && best / energy > 0.3) {
      f0s.push(dsr / bestLag);
    }
  }

  if (f0s.length < 5) return { meanHz: null, variationSemitones: null };
  // median + robust spread
  f0s.sort((a, b) => a - b);
  const median = f0s[Math.floor(f0s.length / 2)];
  const inliers = f0s.filter((f) => f > median * 0.6 && f < median * 1.7);
  if (inliers.length < 5) return { meanHz: Math.round(median), variationSemitones: null };
  const mean = inliers.reduce((a, b) => a + b, 0) / inliers.length;
  // stdev in semitones
  const semis = inliers.map((f) => 12 * Math.log2(f / mean));
  const sv = Math.sqrt(semis.reduce((a, b) => a + b * b, 0) / semis.length);
  return { meanHz: Math.round(mean), variationSemitones: round1(sv) };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

// Human-readable interpretation for the UI / coaching.
export function voiceSummary(m: VoiceMetrics): string[] {
  const out: string[] = [];
  if (m.wpm != null) {
    const pace =
      m.wpm < 110 ? "a bit slow" : m.wpm > 170 ? "fast — risk of rushing" : "a good conversational pace";
    out.push(`Pace ${m.wpm} wpm (${pace}).`);
  }
  out.push(
    `${m.pauseCount} pause(s), ${m.pauseTotalSec}s total${m.longestPauseSec ? `, longest ${m.longestPauseSec}s` : ""}.`,
  );
  if (m.fillerCount) out.push(`${m.fillerCount} filler(s): ${m.fillerWords.slice(0, 4).join(", ")}.`);
  out.push(
    m.monotoneRisk > 60
      ? `Delivery sounds fairly flat (monotone risk ${m.monotoneRisk}/100) — add vocal variety.`
      : `Good vocal variety (monotone risk ${m.monotoneRisk}/100).`,
  );
  return out;
}
