// ============================================================
// AI Personalization Engine
// ------------------------------------------------------------
// Ships with a deterministic mock engine that produces realistic,
// personalized output from the user's answers. Every function is a
// drop-in seam for a real LLM call (see callLLM at the bottom).
// ============================================================

import {
  ALL_BADGES,
  PRACTICE_SCENARIOS,
  PROFILE_TITLES,
  ROLE_MODEL_INSPIRATION,
} from "./content";
import {
  calculateScores,
  identifyLearnerChallengeType,
  intensityFromGoal,
} from "./scoring";
import { PracticeFeedback, Scores, TrainingDay, UserProfile } from "./types";

// ---------- Age-aware example bank ----------
export function ageBand(age: number | null): "child" | "teen" | "adult" {
  if (age == null) return "adult";
  if (age < 13) return "child";
  if (age < 18) return "teen";
  return "adult";
}

export function ageContextWord(age: number | null): string {
  const band = ageBand(age);
  if (band === "child") return "with your friends, classroom, and family";
  if (band === "teen") return "at school, with friends, and in class presentations";
  return "in meetings, presentations, networking, and career moments";
}

// ---------- Strengths & growth areas ----------
export function identifyStrengths(scores: Scores, p: UserProfile): string[] {
  const ordered: { label: string; score: number; msg: string }[] = [
    { label: "clarity", score: scores.clarity, msg: "You can explain ideas in a clear and simple way." },
    { label: "confidence", score: scores.confidence, msg: "You carry confidence into the way you speak." },
    { label: "listening", score: scores.listening, msg: "You listen carefully before you respond." },
    { label: "storytelling", score: scores.storytelling, msg: "You can connect ideas with emotion and tell a story." },
    { label: "assertiveness", score: scores.assertiveness, msg: "You can stand your ground and negotiate calmly." },
    { label: "networking", score: scores.networking, msg: "You find it natural to open conversations with people." },
    { label: "growthMindset", score: scores.growthMindset, msg: "You treat feedback as fuel for growth." },
  ];
  const top = ordered.sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.msg);
  // Always recognise effort.
  top.unshift("You are motivated to improve, and that is where every strong communicator begins.");
  return top.slice(0, 3);
}

export function identifyGrowthAreas(scores: Scores): string[] {
  const ordered: { label: string; score: number; msg: string }[] = [
    { label: "clarity", score: scores.clarity, msg: "Clear and structured message delivery" },
    { label: "confidence", score: scores.confidence, msg: "Confidence under pressure" },
    { label: "listening", score: scores.listening, msg: "Active listening" },
    { label: "storytelling", score: scores.storytelling, msg: "Engaging storytelling" },
    { label: "assertiveness", score: scores.assertiveness, msg: "Assertive communication" },
    { label: "networking", score: scores.networking, msg: "Starting conversations and networking" },
  ];
  return ordered.sort((a, b) => a.score - b.score).slice(0, 3).map((x) => x.msg);
}

// ---------- Profile title ----------
export function pickProfileTitle(scores: Scores, p: UserProfile): string {
  const o = scores.overall;
  if (o >= 85) return "Power Communicator";
  if (o >= 78) return "Influence Builder";
  if (o >= 70) {
    if (scores.storytelling >= 70) return "Story-Driven Speaker";
    if (scores.assertiveness >= 70) return "Strategic Communicator";
    return "Confident Speaker";
  }
  if (o >= 60) {
    if (p.selfReflects === "Yes") return "Reflective Communicator";
    return "High-Potential Communicator";
  }
  if (o >= 50) return "Developing Communicator";
  if (scores.confidence < 45 && scores.networking < 45) return "Quiet Builder";
  return "Emerging Communicator";
}

// ---------- Role model inspiration ----------
export function generateRoleModelInspiration(p: UserProfile): { name: string; line: string } {
  const name = p.roleModels[0] || p.otherRoleModel || "";
  if (!name) {
    return {
      name: "Your own authentic voice",
      line: "Your training plan will focus on building a natural, confident style that is unmistakably yours.",
    };
  }
  const line =
    ROLE_MODEL_INSPIRATION[name] ||
    `Your training plan will draw on the qualities you admire in ${name} — clarity, presence, and connection.`;
  return { name, line };
}

// ---------- Motivational quote ----------
export function generateMotivationalQuote(scores: Scores): string {
  const o = scores.overall;
  return (
    `You are already ${o}% on the path toward stronger communication. ` +
    "With focused practice, you can turn your voice into influence, your ideas into opportunities, and your confidence into career growth."
  );
}

// ---------- Training plan (7-day) ----------
export function generateTrainingPlan(p: UserProfile): TrainingDay[] {
  const skill = p.selectedPowerSkill || p.selectedGoals[0] || "Public Speaking";
  const intensity = intensityFromGoal(p.dailyUpskillingGoal);
  const band = ageBand(p.age);
  const audience =
    band === "adult"
      ? "a colleague or in a meeting"
      : band === "teen"
        ? "a friend or your class"
        : "a friend or your family";

  const role = p.roleModels[0] || p.otherRoleModel || "";
  const roleTag = role ? ` Channel ${role}'s style as you do it.` : "";
  const style = (p.learningStyle || "").toLowerCase();
  const min = `(~${intensity.minutes} min)`;

  // Learning-style aware day-3 / day-6 framing.
  const styleDay = style.includes("roleplay")
    ? "Run an AI roleplay in the Practice Room and respond out loud."
    : style.includes("theor")
      ? "Study one framework (e.g. STAR or Hook-Point-Close), then apply it once."
      : style.includes("real-life") || style.includes("scenario")
        ? "Use a real situation from your week and rehearse how you would handle it."
        : "Do a short hands-on drill and repeat it twice.";

  const day5 =
    p.presentationFeeling === "Very nervous" || p.presentationFeeling === "I avoid presentations"
      ? "Practice slow breathing and a calm power-pose, then rehearse two strong opening lines."
      : "Rehearse two strong opening lines and one memorable closing line.";

  return [
    {
      day: 1,
      title: "Speak Clearly",
      task: `Practice explaining one idea in 60 seconds with one clear opening line.${roleTag} ${min}`,
    },
    {
      day: 2,
      title: "Build Confidence",
      task: `Record yourself speaking about a topic you enjoy. Listen back once and note one strength. ${min}`,
    },
    {
      day: 3,
      title: `Your Way of Learning`,
      task: `${styleDay} Focus on ${skill}. ${min}`,
    },
    {
      day: 4,
      title: "Body Language",
      task: `Practice posture, eye contact, and calm hand movement in front of a mirror or camera. ${min}`,
    },
    {
      day: 5,
      title: "Handle Nervousness",
      task: `${day5} ${min}`,
    },
    {
      day: 6,
      title: "Mini Presentation",
      task: `Give a 2-minute presentation about ${skill} to ${audience}.${roleTag}`,
    },
    {
      day: 7,
      title: "AI Feedback",
      task: "Submit a short speech in the Practice Room and receive AI improvement advice.",
    },
  ];
}

// ---------- Daily challenge ----------
export function generateDailyChallenge(p: UserProfile): string {
  const challenges = [
    "Record a 45-second self-introduction with one strong opening sentence.",
    "Explain a complex idea to someone in under 60 seconds using one example.",
    "Tell a 90-second story using Situation → Challenge → Action → Lesson.",
    "Practice a confident posture and keep eye contact for a 1-minute talk.",
    "Open a conversation with a genuine question and listen for 30 seconds before replying.",
    "Deliver a 2-minute mini presentation and close with one clear call to action.",
  ];
  const seed = (p.attempts.length + (p.age || 1)) % challenges.length;
  return challenges[seed];
}

// ---------- Full communication profile ----------
export interface CommunicationProfile {
  scores: Scores;
  profileTitle: string;
  strengths: string[];
  growthAreas: string[];
  learnerChallengeType: string;
  learnerChallengeBlurb: string;
  roleModel: { name: string; line: string };
  motivationalQuote: string;
  trainingPlan: TrainingDay[];
  intensity: { label: string; range: string };
}

export function generateCommunicationProfile(p: UserProfile): CommunicationProfile {
  const scores = calculateScores(p);
  const challenge = identifyLearnerChallengeType(p, scores);
  const intensity = intensityFromGoal(p.dailyUpskillingGoal);
  return {
    scores,
    profileTitle: pickProfileTitle(scores, p),
    strengths: identifyStrengths(scores, p),
    growthAreas: identifyGrowthAreas(scores),
    learnerChallengeType: challenge.type,
    learnerChallengeBlurb: challenge.blurb,
    roleModel: generateRoleModelInspiration(p),
    motivationalQuote: generateMotivationalQuote(scores),
    trainingPlan: generateTrainingPlan(p),
    intensity: { label: intensity.label, range: intensity.range },
  };
}

// ============================================================
// Practice feedback (simulated AI coach)
// ============================================================

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function scoreFromText(text: string, base: number): number {
  const words = countWords(text);
  const hasOpening = /^(hi|hello|thank|my name|i am|good morning|good afternoon|today|let me)/i.test(text.trim());
  const hasNumbers = /\d/.test(text);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  let s = base;
  if (words >= 25) s += 6;
  if (words >= 60) s += 4;
  if (words < 12) s -= 14;
  if (hasOpening) s += 5;
  if (sentences >= 2) s += 4;
  if (hasNumbers) s += 2;
  // Gentle variability seeded by length.
  s += (words % 5) - 2;
  return Math.max(35, Math.min(96, Math.round(s)));
}

export function generatePracticeFeedback(
  response: string,
  scenarioId: string,
  p: UserProfile,
): PracticeFeedback {
  const scenario = PRACTICE_SCENARIOS.find((x) => x.id === scenarioId);
  const base = 60 + Math.round((p.scores.overall - 50) * 0.2);
  const clarity = scoreFromText(response, base + 4);
  const confidence = scoreFromText(response, base);
  const structure = scoreFromText(response, base + 2);
  const empathy = scoreFromText(response, base + 6);
  const persuasion = scoreFromText(response, base - 1);
  const storytelling = scoreFromText(response, base + 1);
  const overall = Math.round((clarity + confidence + structure + empathy + persuasion + storytelling) / 6);

  const words = countWords(response);
  const lowestPair = [
    ["a stronger opening and a clearer ending", structure],
    ["more confident pacing — slow down and breathe", confidence],
    ["a sharper, more persuasive core message", persuasion],
    ["a clearer structure so ideas flow in order", clarity],
  ].sort((a, b) => (a[1] as number) - (b[1] as number))[0][0] as string;

  const didWell =
    words < 12
      ? "You made a start, which is the hardest step. Your tone is approachable."
      : "You expressed your idea clearly and kept a friendly, natural tone.";

  const betterVersion = buildBetterVersion(scenario?.title || "your response", response);

  const microChallenge =
    "Repeat your answer in 45 seconds with one clear opening sentence and one strong closing sentence.";

  return {
    overall,
    clarity,
    confidence,
    structure,
    empathy,
    persuasion,
    storytelling,
    didWell,
    improve: `Your response needs ${lowestPair}.`,
    betterVersion,
    microChallenge,
  };
}

function buildBetterVersion(title: string, response: string): string {
  const t = title.toLowerCase();
  if (t.includes("introduce")) {
    return "“Hello, I'm [name]. I help [who] achieve [value] by [how]. In short — I turn ideas into clear, confident action.”";
  }
  if (t.includes("story")) {
    return "“Last year I faced [challenge]. I decided to [action]. It was not easy, but it taught me [lesson] — and I have used it ever since.”";
  }
  if (t.includes("project")) {
    return "“Our goal was [goal]. We delivered [key result], which means [impact]. Next, we will [next step].”";
  }
  if (t.includes("criticism")) {
    return "“Thank you for the honest feedback. You are right that [point]. Here is what I will change going forward: [specific action].”";
  }
  if (t.includes("interview")) {
    return "“In my last role, the situation was [S]. My task was [T]. I [action], and as a result [measurable result].”";
  }
  return "“Thank you for the opportunity. My idea is simple: we can improve [outcome] by [clear action] and [clear action]. The result is [benefit].”";
}

// ============================================================
// Badge logic
// ============================================================
export function recomputeBadges(p: UserProfile): string[] {
  const earned = new Set(p.badges);
  const attempts = p.attempts;
  if (attempts.length >= 1) earned.add("First Speech");
  if (attempts.length >= 5) earned.add("Feedback Champion");
  if (attempts.some((a) => a.scenarioId === "shortstory")) earned.add("Story Builder");
  if (attempts.some((a) => a.scenarioId === "networking")) earned.add("Networking Starter");
  if (attempts.some((a) => a.scenarioId === "project" || a.scenarioId === "openpresentation"))
    earned.add("Presentation Ready");
  if (attempts.some((a) => a.scenarioId === "disagree")) earned.add("Conflict Resolver");
  if (attempts.some((a) => a.scenarioId === "criticism" || a.scenarioId === "interview"))
    earned.add("Active Listener");
  if (attempts.some((a) => a.feedback.confidence >= 75)) earned.add("Confident Voice");
  if (attempts.some((a) => a.feedback.overall >= 85)) earned.add("Power Communicator");
  if (p.streak >= 3) earned.add("Consistency Builder");
  // keep only known badges
  return ALL_BADGES.filter((b) => earned.has(b.name)).map((b) => b.name);
}

// ============================================================
// LLM INTEGRATION SEAM
// ------------------------------------------------------------
// Replace the mock functions above by routing through callLLM().
// The app reads NEXT_PUBLIC_LLM_PROVIDER / server env to decide.
//
// Example (server route /app/api/coach/route.ts):
//   const text = await callLLM({ system, prompt });
//
// Wire to OpenAI, Claude, Gemini, or any provider here.
// ============================================================

export interface LLMRequest {
  system: string;
  prompt: string;
  temperature?: number;
}

export async function callLLM(req: LLMRequest): Promise<string> {
  // TODO: connect a real provider. Suggested implementation:
  //
  //   const res = await fetch("/api/coach", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify(req),
  //   });
  //   const data = await res.json();
  //   return data.text;
  //
  // The server route should read an API key from process.env and call:
  //   - Anthropic:  https://api.anthropic.com/v1/messages  (model: claude-opus-4-8)
  //   - OpenAI:     https://api.openai.com/v1/chat/completions
  //   - Gemini:     https://generativelanguage.googleapis.com/v1beta/models/...
  //
  // Until a provider is configured, we fall back to the local mock.
  return Promise.resolve("[mock-llm] " + req.prompt.slice(0, 80));
}

export function isLLMConfigured(): boolean {
  // Flip this once a provider + API route are wired up.
  return false;
}
