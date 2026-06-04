// ============================================================
// Scoring Engine
// Converts onboarding answers into normalized 0..100 scores.
// ============================================================

import { ASSESSMENT_QUESTIONS } from "./content";
import { AssessmentAnswers, Scores, UserProfile } from "./types";

/** Reverse a 1..5 score for negatively-phrased items: 1->5, 2->4, 3->3, 4->2, 5->1 */
export function adjust(qid: number, raw: number): number {
  const q = ASSESSMENT_QUESTIONS.find((x) => x.id === qid);
  if (!q) return raw;
  return q.negative ? 6 - raw : raw;
}

/** Convert a list of 1..5 adjusted values to a 0..100 score. */
function pct(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round((avg / 5) * 100);
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

const presentationConfidenceDelta: Record<string, number> = {
  "Confident and ready": 10,
  "A little nervous but able to manage": 5,
  "Very nervous": -5,
  "I avoid presentations": -10,
  "I feel prepared only if I memorize everything": -3,
};

const criticismGrowthDelta: Record<string, number> = {
  "I see it as a growth opportunity": 12,
  "I accept it but feel uncomfortable": 4,
  "I become defensive": -6,
  "I take it personally": -8,
  "I avoid feedback whenever possible": -12,
};

export function calculateScores(p: UserProfile): Scores {
  const a: AssessmentAnswers = p.assessmentAnswers || {};
  const A = (id: number) => adjust(id, a[id] ?? 3); // default to neutral 3 if missing

  // Overall = average of all adjusted answers, normalized.
  const all = ASSESSMENT_QUESTIONS.map((q) => A(q.id));
  let overall = pct(all);

  // Subscores (mapped per spec)
  let clarity = pct([A(1), A(12)]);
  let confidence = pct([A(5), A(10), A(15)]);
  let listening = pct([A(4), A(11)]);
  let storytelling = pct([A(6), A(7)]);
  let assertiveness = pct([A(2), A(3)]);
  let networking = pct([A(8), A(9)]);
  let growthMindset = pct([A(13)]);

  // Presentation feeling adjusts confidence.
  confidence = clamp(confidence + (presentationConfidenceDelta[p.presentationFeeling] ?? 0));

  // Criticism reaction adjusts growth mindset.
  growthMindset = clamp(growthMindset + (criticismGrowthDelta[p.criticismReaction] ?? 0));

  // Slight nudge of overall toward confidence/growth context.
  overall = clamp(Math.round(overall * 0.85 + confidence * 0.08 + growthMindset * 0.07));

  return {
    overall: clamp(overall),
    clarity: clamp(clarity),
    confidence: clamp(confidence),
    listening: clamp(listening),
    storytelling: clamp(storytelling),
    assertiveness: clamp(assertiveness),
    networking: clamp(networking),
    growthMindset: clamp(growthMindset),
  };
}

export interface IntensityInfo {
  label: string;
  range: string;
  minutes: number;
}

export function intensityFromGoal(dailyGoal: string): IntensityInfo {
  switch (dailyGoal) {
    case "Casual":
      return { label: "Casual", range: "5 to 10 minutes daily", minutes: 8 };
    case "Bold":
      return { label: "Bold", range: "10 to 15 minutes daily", minutes: 12 };
    case "Serious":
      return { label: "Serious", range: "15 to 25 minutes daily", minutes: 20 };
    case "Ambitious":
      return { label: "Ambitious", range: "25 to 40 minutes daily", minutes: 32 };
    default:
      return { label: "Bold", range: "10 to 15 minutes daily", minutes: 12 };
  }
}

// ---------------- Learner challenge type ----------------
// Priority order (highest first):
// 1 Fear of Judgment, 2 Low Confidence, 3 Low Consistency, 4 Busy,
// 5 Overthinking, 6 Fast Growth, 7 Practical, 8 Reflective

export interface LearnerChallenge {
  type: string;
  blurb: string;
}

const CHALLENGE_BLURBS: Record<string, string> = {
  "Busy Learner":
    "You may want to improve, but time pressure makes consistency difficult. Your plan will use short, focused practice moments.",
  "Fear of Judgment Learner":
    "You may hold back because you worry how others will react. Your plan will start with safe private practice before live speaking challenges.",
  "Low Consistency Learner":
    "You may start with energy but struggle to continue. Your plan will use micro-challenges, streaks, and friendly nudges.",
  "Overthinking Learner":
    "You may have strong ideas but get stuck organizing them. Your plan will help you structure thoughts quickly and speak with clarity.",
  "Low Confidence Learner":
    "You may understand what you want to say but feel nervous expressing it. Your plan will build confidence through small wins.",
  "Fast Growth Learner":
    "You are ready for challenge and measurable progress. Your plan will include stronger exercises and more advanced practice.",
  "Practical Learner":
    "You learn best by doing. Your plan will focus on real-life exercises, roleplay, and feedback.",
  "Reflective Learner":
    "You improve through thinking, journaling, and analyzing your experiences. Your plan will include reflection prompts and guided improvement.",
};

export function identifyLearnerChallengeType(p: UserProfile, scores: Scores): LearnerChallenge {
  const barrier = (p.selfGrowthBarrier || "").toLowerCase();
  const otherBarrier = (p.otherBarrier || "").toLowerCase();
  const barrierText = `${barrier} ${otherBarrier}`;
  const finishes = p.finishesWhatStarts;
  const learning = (p.learningStyle || "").toLowerCase();

  const matches: string[] = [];

  // Fear of Judgment (priority 1)
  if (barrierText.includes("fear") || barrierText.includes("judg")) {
    matches.push("Fear of Judgment Learner");
  }
  // Low Confidence (priority 2)
  if (scores.confidence < 50) {
    matches.push("Low Confidence Learner");
  }
  // Low Consistency (priority 3)
  if (
    (finishes === "No" || finishes === "Sometimes") &&
    (barrierText.includes("procrast") ||
      barrierText.includes("consist") ||
      barrierText.includes("motivation") ||
      barrierText.includes("routine") ||
      barrierText.includes("bored") ||
      finishes === "No")
  ) {
    matches.push("Low Consistency Learner");
  }
  // Busy (priority 4)
  if (barrierText.includes("busy")) {
    matches.push("Busy Learner");
  }
  // Overthinking (priority 5)
  if (scores.listening < 50 || scores.clarity < 45) {
    matches.push("Overthinking Learner");
  }
  // Fast Growth (priority 6)
  if (p.dailyUpskillingGoal === "Ambitious" && scores.overall >= 65) {
    matches.push("Fast Growth Learner");
  }
  // Practical (priority 7)
  if (learning.includes("practical") || learning.includes("roleplay")) {
    matches.push("Practical Learner");
  }
  // Reflective (priority 8)
  if (p.selfReflects === "Yes") {
    matches.push("Reflective Learner");
  }

  const priority = [
    "Fear of Judgment Learner",
    "Low Confidence Learner",
    "Low Consistency Learner",
    "Busy Learner",
    "Overthinking Learner",
    "Fast Growth Learner",
    "Practical Learner",
    "Reflective Learner",
  ];

  const type = priority.find((t) => matches.includes(t)) || "Reflective Learner";
  return { type, blurb: CHALLENGE_BLURBS[type] };
}
