# Cognitive‑State Assisted Public Speaking Analysis

> **Framing (non‑negotiable):** MindWave Mobile 2 is a **single‑channel (FP1) EEG**
> headset. It is used here only for **cognitive‑state estimation** (attention,
> relaxation, stability, blink, signal quality). It does **not** measure
> confidence, charisma, persuasion, emotional intelligence, leadership, or
> "truth." EEG is **one signal among many** and is **capped at 20%** of any
> final score. Language is always probabilistic ("may indicate," "is consistent
> with," "requires confirmation").

---

## A. Measurement Architecture

Four layers feed a transparent weighted model:

| Layer | Source | Weight | Notes |
|------|--------|-------:|-------|
| 1. Voice & Speech | microphone audio | **40%** | WPM, pauses, fillers, energy, pitch variation, clarity, structure |
| 2. Public‑Speaking Rubric | LLM + speech features | **30%** | 10 evidence‑based dimensions |
| 3. EEG Cognitive‑State | MindWave 2 | **20% (max)** | stability vs **personal baseline**, not universal norms |
| 4. Self‑Reflection | post‑speech survey | **10%** | perceived vs measured alignment |

EEG weight is **reduced** when signal quality < 80% and **excluded** (re‑normalize
the other layers to 100%) when signal quality < 60%, with an explicit notice.

```
final = 0.40*voice + 0.30*rubric + 0.20*eeg + 0.10*reflection      (quality ≥ 80%)
final = 0.40*voice + 0.30*rubric + (0.20*q')*eeg + 0.10*reflection  (60% ≤ q < 80%, q'=q/80)
final = renormalize(0.40*voice + 0.30*rubric + 0.10*reflection)     (quality < 60%, EEG shown but excluded)
```

---

## B. EEG Data Cleaning & Validation

Per the ThinkGear stream (1 Hz eSense + blink + 8 band powers + poorSignal 0–200):

1. **Quality gate** — drop every sample with `poorSignal ≥ 50`; track % retained.
2. **Warm‑up trim** — discard the first **20–30 s** of each capture (settling/noise).
3. **Outlier/spike rejection** — reject points outside `median ± 3·MAD`.
4. **Smoothing** — exponential moving average (α≈0.3) + rolling windows of
   **5 s / 10 s / 30 s** for trend vs instantaneous.
5. **Never** judge on a single reading; require ≥ N valid samples (default 15).
6. **Confidence** is attached to every EEG insight from `validRatio` and sample count.

```
clean(series):
  s = [x for x in series if x.poorSignal < 50]
  s = s[warmupSeconds:]                      # 20–30 s
  s = rejectOutliers(s, k=3)                 # MAD
  att = ema(s.attention, α=0.3)
  med = ema(s.meditation, α=0.3)
  validRatio = len(s) / len(series)
  return {att, med, validRatio, n=len(s)}
```

---

## C. Calibration → Personal Cognitive Profile

Run **before** evaluation; compare speech to the **speaker's own** baseline.

1. **Resting** — 60 s sitting silently.
2. **Focus** — 60 s reading a short paragraph.
3. **Speaking** — 60 s on an easy topic.
4. **Stress** — 30 s answering a surprise question.

For each: average & variability of attention/meditation, blink frequency,
signal‑quality %, band averages. Stored as the user's `CognitiveBaseline`,
updated over time (rolling, EWMA across sessions).

```
baseline = {
  rest:   stats(clean(rest60)),
  focus:  stats(clean(focus60)),
  speak:  stats(clean(speak60)),
  stress: stats(clean(stress30)),
  updatedAt, sessions
}
```

---

## D. Live Session Measurement

- Timestamp EEG @1 Hz, record audio (and optional video).
- Segment: **Opening / Idea 1 / Idea 2 / Idea 3 / Closing** (by time or pauses).
- Per‑segment scores; detect **instability**, **aligned strong moments**
  (focus + steady voice + flow), **nervousness rises**, and **recovery** after disruption.

---

## E. Scoring Formulas

**EEG Stability Score (0–100)** — the only thing EEG contributes:

```
eegStability =
  0.30 * focusConsistency      # 100 - normalized stdev(attention)
+ 0.25 * relaxationStability   # 100 - normalized stdev(meditation)
+ 0.20 * recoveryAbility       # speed of return to baseline after dips
+ 0.15 * baselineAlignment     # closeness of session mean to speak‑baseline
+ 0.10 * signalReliability     # % valid samples
```

**Rubric dimensions (0–100, evidence‑based):**
Clarity · Structure · Confidence · Vocal variety · Emotional control ·
Persuasion · Engagement · Storytelling · Audience connection · Cognitive stability.

- *Confidence* ← voice steadiness, pause control, continuity, (posture if video), EEG stability.
- *Stress* ← attention spikes + reduced relaxation + unstable voice + excess pauses + baseline deviation.
- *Engagement* ← vocal variety + storytelling + rhetorical questions + examples + flow.

---

## F. Output Report Structure

1. **Executive Summary** — overall score, confidence estimate, cognitive‑state
   stability, strongest skill, main improvement area.
2. **Measurement Reliability** — EEG signal quality, audio quality, video (if any),
   analysis confidence, **what we can / cannot measure**.
3. **Skills Breakdown** — per skill: score · evidence · interpretation · coaching.
4. **EEG Cognitive‑State Analysis** — avg attention/relaxation, trends, cognitive‑load
   & stress‑spike & recovery moments, baseline comparison — careful language only.
5. **Timeline** — per minute/segment: voice quality, flow, EEG stability, possible
   nervousness, strong/weak moments, advice.
6. **Coaching Plan** — 3 quick wins · 3 drills · 1 daily · 1 weekly · 1 advanced.

---

## G. Dashboard Components

Live attention trend · live relaxation trend · signal‑quality indicator ·
speaking speed · pause analysis · confidence estimate · cognitive‑stability score ·
timeline markers · final‑report button · coaching panel. Color logic:
**green** reliable/strong · **yellow** moderate · **red** unreliable/unstable —
styled as a coaching tool, **not** a medical diagnosis.

---

## H. Error Handling

Detect & explain: poor headset contact · Bluetooth disconnect · abnormal spikes ·
missing data · low audio quality · too‑short speech · incomplete calibration ·
inconsistent baseline. Each degrades gracefully and is shown in the Reliability section.

---

## I. Limitations (always shown)

- Single‑channel forehead EEG → coarse attention/relaxation proxies only.
- eSense values are proprietary, not raw neuroscience metrics.
- No claim of emotion, confidence, or truth detection.
- EEG ≤ 20% of score; excluded under poor signal.
- Results are **coaching guidance**, not clinical or psychological assessment.

---

## J. Implementation Map (code)

- `lib/eeg-analysis.ts` — cleaning, baseline stats, EEG stability, reliability, confidence.
- `lib/scoring-model.ts` — weighted final score, EEG cap/exclusion, confidence tiers.
- `lib/eeg.ts` — device/stream (ThinkGear parser, bands, poorSignal) + simulation.
- NeuroScience flow — calibration → live session (cleaned) → self‑reflection → responsible report.

**Phase status:** Engine + scoring + reliability framing + self‑reflection = built.
Voice/audio analytics, full 4‑stage calibration UI, per‑segment timeline, and the
full live dashboard are the next phases.
