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

// ============================================================
// Content-aware speech analyzer (used when no LLM key is set).
// Each aspect is scored from DISTINCT signals in the actual text,
// and the notes cite exactly what was found.
// ============================================================

const FILLERS = [
  "um", "uh", "er", "ah", "like", "you know", "basically", "actually",
  "literally", "sort of", "kind of", "i mean", "well", "yeah", "okay so",
];
const HEDGES = [
  "maybe", "perhaps", "i think", "i guess", "i suppose", "probably", "possibly",
  "hopefully", "just", "a little", "somewhat", "might", "i'm not sure", "kind of", "sort of",
];
const STRONG = [
  "will", "can", "definitely", "absolutely", "committed", "deliver", "achieve",
  "lead", "create", "build", "drive", "ensure", "proven", "confident", "know",
];
const CONNECTORS = [
  "first", "second", "third", "then", "next", "finally", "because", "therefore",
  "so that", "however", "in addition", "as a result", "for example", "which means", "after",
];
const AUDIENCE = [
  "you", "your", "we", "us", "our", "together", "team", "understand",
  "help", "support", "listen", "imagine", "let's", "share",
];
const VALUE = [
  "improve", "increase", "result", "impact", "benefit", "value", "save",
  "grow", "outcome", "success", "goal", "solve", "better", "faster", "stronger",
];
const STORY = [
  "when", "once", "last year", "years ago", "ago", "remember", "story",
  "happened", "suddenly", "realized", "learned", "discovered", "decided", "moment",
];

function countMatches(haystack: string, needles: string[]): { count: number; found: string[] } {
  const found: string[] = [];
  let count = 0;
  for (const n of needles) {
    const re = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const m = haystack.match(re);
    if (m && m.length) {
      count += m.length;
      if (!found.includes(n)) found.push(n);
    }
  }
  return { count, found };
}

interface SpeechAnalysis {
  words: number;
  sentences: number;
  avgSentenceLen: number;
  fillers: { count: number; found: string[] };
  hedges: { count: number; found: string[] };
  strong: { count: number; found: string[] };
  connectors: { count: number; found: string[] };
  audience: { count: number; found: string[] };
  value: { count: number; found: string[] };
  story: { count: number; found: string[] };
  hasOpening: boolean;
  hasClosing: boolean;
  hasNumbers: boolean;
  hasQuestion: boolean;
}

function analyzeSpeech(text: string): SpeechAnalysis {
  const t = text.trim();
  const lower = t.toLowerCase();
  const words = countWords(t);
  const sentenceParts = t.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const sentences = Math.max(sentenceParts.length, t ? 1 : 0);
  return {
    words,
    sentences,
    avgSentenceLen: sentences ? Math.round(words / sentences) : 0,
    fillers: countMatches(lower, FILLERS),
    hedges: countMatches(lower, HEDGES),
    strong: countMatches(lower, STRONG),
    connectors: countMatches(lower, CONNECTORS),
    audience: countMatches(lower, AUDIENCE),
    value: countMatches(lower, VALUE),
    story: countMatches(lower, STORY),
    hasOpening: /^(hi|hello|thank|my name|i am|i'm|good morning|good afternoon|today|let me|imagine|hey)/i.test(t),
    hasClosing: /(thank you|in short|to sum|in conclusion|that's why|so let's|i'd love|looking forward|in summary)[.!]?$/i.test(t),
    hasNumbers: /\d/.test(t),
    hasQuestion: /\?/.test(t),
  };
}

const clampScore = (n: number) => Math.max(20, Math.min(98, Math.round(n)));

export function generatePracticeFeedback(
  response: string,
  scenarioId: string,
  p: UserProfile,
): PracticeFeedback {
  const scenario = PRACTICE_SCENARIOS.find((x) => x.id === scenarioId);
  const a = analyzeSpeech(response);
  const tilt = Math.round((p.scores.overall - 50) * 0.12); // small personal baseline tilt

  // Very short answers can't demonstrate much — score honestly low.
  const shortPenalty = a.words < 8 ? -28 : a.words < 15 ? -12 : 0;

  // --- CLARITY: concise sentences, few fillers, readable length ---
  let clarity = 70 + tilt + shortPenalty;
  clarity -= a.fillers.count * 5;
  if (a.avgSentenceLen > 28) clarity -= 10; // run-on sentences
  if (a.avgSentenceLen >= 8 && a.avgSentenceLen <= 20) clarity += 8;
  if (a.words >= 20 && a.words <= 90) clarity += 4;

  // --- CONFIDENCE: assertive verbs up, hedging down ---
  let confidence = 66 + tilt + shortPenalty;
  confidence += Math.min(a.strong.count * 4, 16);
  confidence -= Math.min(a.hedges.count * 5, 25);
  if (a.hasClosing) confidence += 5;

  // --- STRUCTURE: opening + closing + connectors + multiple sentences ---
  let structure = 60 + tilt + shortPenalty;
  if (a.hasOpening) structure += 9;
  if (a.hasClosing) structure += 9;
  structure += Math.min(a.connectors.count * 5, 18);
  if (a.sentences >= 3) structure += 6;
  if (a.sentences <= 1 && a.words > 25) structure -= 8; // one long blob

  // --- EMPATHY: audience-oriented language, questions ---
  let empathy = 62 + tilt + shortPenalty;
  empathy += Math.min(a.audience.count * 4, 20);
  if (a.hasQuestion) empathy += 6;

  // --- PERSUASION: value/benefit words, evidence/numbers, a call to action ---
  let persuasion = 60 + tilt + shortPenalty;
  persuasion += Math.min(a.value.count * 5, 22);
  if (a.hasNumbers) persuasion += 6;
  if (a.hasClosing) persuasion += 4;

  // --- STORYTELLING: narrative markers, concrete past-tense arc ---
  let storytelling = 58 + tilt + shortPenalty;
  storytelling += Math.min(a.story.count * 5, 24);
  if (a.value.count > 0 && a.story.count > 0) storytelling += 5; // story with a takeaway

  clarity = clampScore(clarity);
  confidence = clampScore(confidence);
  structure = clampScore(structure);
  empathy = clampScore(empathy);
  persuasion = clampScore(persuasion);
  storytelling = clampScore(storytelling);
  const overall = Math.round(
    (clarity + confidence + structure + empathy + persuasion + storytelling) / 6,
  );

  // ---- Specific, content-cited notes ----
  const strengths: string[] = [];
  if (a.hasOpening) strengths.push("you opened with a clear hook");
  if (a.connectors.count >= 2)
    strengths.push(`you signposted with connectors like "${a.connectors.found.slice(0, 2).join('", "')}"`);
  if (a.strong.count >= 2) strengths.push("you used assertive, ownership language");
  if (a.audience.count >= 3) strengths.push("you spoke to the listener, not just at them");
  if (a.story.count >= 2) strengths.push("you brought a concrete story, not just claims");
  if (a.value.count >= 2) strengths.push("you named a clear benefit/outcome");
  const didWell =
    a.words < 8
      ? "You made a start — but there's too little here to evaluate. Give a few full sentences so each skill can be measured."
      : strengths.length
        ? `Strong points: ${strengths.slice(0, 2).join("; ")}.`
        : "Your tone is natural and approachable — a good base to build structure and specifics on.";

  // Build precise improvement targeting the weakest aspect.
  const ranked = (
    [
      ["clarity", clarity],
      ["confidence", confidence],
      ["structure", structure],
      ["empathy", empathy],
      ["persuasion", persuasion],
      ["storytelling", storytelling],
    ] as [string, number][]
  ).sort((x, y) => x[1] - y[1]);
  const weakest = ranked[0][0];

  const improveMap: Record<string, string> = {
    clarity: a.fillers.count
      ? `Cut filler words — you used ${a.fillers.count} (e.g. "${a.fillers.found.slice(0, 2).join('", "')}"). Pause instead of filling the gap.`
      : a.avgSentenceLen > 28
        ? "Break up long sentences — your average sentence is very long. Aim for one idea per sentence."
        : "Tighten your phrasing so each sentence carries one clear idea.",
    confidence: a.hedges.count
      ? `Drop hedging language — you used ${a.hedges.count} (e.g. "${a.hedges.found.slice(0, 2).join('", "')}"). Say "I will" instead of "I think maybe".`
      : "Add assertive verbs (will, deliver, create) and end on a definite statement.",
    structure: !a.hasOpening
      ? "Add a clear opening line that states who you are or what your point is, before the details."
      : !a.hasClosing
        ? "Add a closing line that lands the point (e.g. \"In short, …\"). Right now it stops without resolving."
        : "Order your ideas with signposts: first… then… finally.",
    empathy: "Speak to the listener — use \"you\"/\"we\", and frame the value for them, not just for you.",
    persuasion: a.hasNumbers
      ? "Turn your point into a benefit + a call to action (\"which means…, so let's…\")."
      : "Add one concrete proof point (a number, example, or result) and a clear call to action.",
    storytelling: "Anchor it in a brief story: a moment, what you did, and the lesson — that makes it memorable.",
  };

  const microMap: Record<string, string> = {
    clarity: "Re-record in 45s with zero filler words — pause instead of saying \"um\".",
    confidence: "Say it again replacing every \"I think/maybe\" with \"I will\".",
    structure: "Re-do it with exactly: 1 opening line, 2 body points, 1 closing line.",
    empathy: "Rewrite it using \"you\" or \"we\" at least twice.",
    persuasion: "Add one number and one call-to-action sentence, then re-record.",
    storytelling: "Tell it as a 30-second story: moment → action → lesson.",
  };

  return {
    overall,
    clarity,
    confidence,
    structure,
    empathy,
    persuasion,
    storytelling,
    didWell,
    improve: `Biggest lever — ${weakest} (${ranked[0][1]}/100): ${improveMap[weakest]}`,
    betterVersion: buildBetterVersion(scenarioId, response),
    microChallenge: microMap[weakest],
  };
}

// A strong, structured model answer for every Practice Room scenario.
const BETTER_VERSION_BY_ID: Record<string, string> = {
  intro30:
    "“Hi, I'm [name]. I help [who] achieve [value] by [how]. In short — I turn ideas into clear, confident action.”",
  shortstory:
    "“Last year I faced [challenge]. I decided to [action]. It wasn't easy, but it taught me [lesson] — and I've used it ever since.”",
  explainidea:
    "“Here's the idea in one line: [core idea]. Think of it like [simple analogy]. It matters because [benefit] — so the takeaway is [one clear point].”",
  disagree:
    "“I see your point about [their view], and I value it. I see it differently: [your view], because [reason]. Could we try [common-ground option]?”",
  project:
    "“Our goal was [goal]. We delivered [key result], which means [impact]. The next step is [next step], and I'll own [your part].”",
  networking:
    "“Hi, I'm [name] — I really enjoyed [shared context]. What brings you here today? … That's interesting; I work on [your area], so I'd love to hear more about [their topic].”",
  criticism:
    "“Thank you for the honest feedback. You're right that [point]. Here's what I'll change going forward: [specific action], and I'll follow up by [date].”",
  negotiate:
    "“I understand you need [their need]. What I need is [your need]. Here's a fair middle path: [specific proposal] — that way we both get [shared benefit].”",
  pressure:
    "“Let me take this clearly. The key point is [main point]. Two things matter most: [point 1] and [point 2]. So my recommendation is [decision].”",
  leadership:
    "“Quick update: we're [status] on [goal]. The win this week is [win]. The one risk is [risk], and here's my plan: [action]. I need [specific support].”",
  interview:
    "“In my last role, the situation was [S]. My task was [T]. I [action], and as a result [measurable result]. It's exactly the kind of challenge I'd bring to this role.”",
  openpresentation:
    "“[Surprising fact or question]. Today I'll show you [promise] in three parts: [A], [B], [C]. By the end, you'll be able to [audience takeaway]. Let's begin.”",
};

function buildBetterVersion(scenarioId: string, response: string): string {
  return (
    BETTER_VERSION_BY_ID[scenarioId] ||
    "“Thank you for the opportunity. My point is simple: we can improve [outcome] by [clear action] and [clear action]. The result is [benefit].”"
  );
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
