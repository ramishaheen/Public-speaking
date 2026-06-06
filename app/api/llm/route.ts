// ============================================================
// Gemini-powered coaching endpoint.
// ------------------------------------------------------------
// Acts as a professional public-speaking trainer & advisor.
// Two tasks:
//   - "plan":     build a personalized plan from ALL onboarding answers,
//                 tailored to the selected role model's speaking style.
//   - "feedback": evaluate a practice response like a pro speaking coach.
//
// Enabled automatically when GEMINI_API_KEY is set in the environment
// (e.g. Vercel → Settings → Environment Variables). With no key the
// route reports { configured:false } and the app uses its local mock.
// ============================================================

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const TRAINER_PERSONA = `You are an elite professional public-speaking trainer, communication coach, and advisor with 20+ years of experience coaching executives, students, and world-class speakers.
You are warm, encouraging, specific, and practical. You never use manipulative, romantic, sexual, aggressive, or unsafe coaching.
You always keep advice respectful, inclusive, age-appropriate, and professional.
You speak like a real human mentor, not a survey. You give concrete, actionable guidance.
You never promise guaranteed income — only use phrasing like "can improve", "may increase", "helps you build".`;

function ageRules(age: number | null): string {
  if (age == null) return "";
  if (age < 13)
    return "The learner is under 13. Use only school, friends, classroom, family, and simple, safe social/presentation examples. No workplace, sales, romantic, or adult scenarios.";
  if (age < 18)
    return "The learner is a teenager (13-17). Use school, friends, classroom, family, club, and simple presentation examples. Avoid workplace pressure, sales manipulation, romantic, or adult-oriented scenarios.";
  return "The learner is an adult (18+). You may use professional, leadership, career, meeting, interview, networking, and presentation examples.";
}

// Tolerant JSON extraction from a model response.
function parseJSON(text: string): any {
  if (!text) throw new Error("empty model response");
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object found");
  return JSON.parse(raw.slice(start, end + 1));
}

async function callGemini(opts: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<string> {
  const key = process.env.GEMINI_API_KEY!;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: "user", parts: [{ text: opts.user }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0.7,
        responseMimeType: "application/json",
        maxOutputTokens: 2048,
      },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
  return text;
}

export async function GET() {
  return NextResponse.json({
    configured: !!process.env.GEMINI_API_KEY,
    provider: "gemini",
    model: MODEL,
  });
}

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ configured: false });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ configured: true, error: "bad request" }, { status: 400 });
  }

  const { task, payload } = body || {};

  try {
    if (task === "plan") {
      const data = await buildPlan(payload);
      return NextResponse.json({ configured: true, data });
    }
    if (task === "feedback") {
      const data = await buildFeedback(payload);
      return NextResponse.json({ configured: true, data });
    }
    return NextResponse.json({ configured: true, error: "unknown task" }, { status: 400 });
  } catch (e: any) {
    // Surface the error but let the client fall back to the mock engine.
    return NextResponse.json(
      { configured: true, error: String(e?.message || e) },
      { status: 200 },
    );
  }
}

// ---------------- PLAN ----------------
async function buildPlan(p: any) {
  const roleModel = p?.roleModel?.name || "the learner's own authentic voice";
  const roleModelTrait = p?.roleModel?.trait || "clarity, presence, and connection";

  const user = `Create a deeply personalized public-speaking improvement plan. Use EVERY answer below — each one must visibly influence the plan.

LEARNER ANSWERS (all of these matter):
- Speaking goals selected: ${JSON.stringify(p?.selectedGoals || [])}
- Age: ${p?.age ?? "unknown"}
- ${ageRules(p?.age ?? null)}
- Role model / character chosen: ${roleModel} (known for ${roleModelTrait})
- Power-skills awareness: ${p?.powerSkillAwareness || "unknown"}
- Communication scores (0-100): ${JSON.stringify(p?.scores || {})}
- Computed profile title: ${p?.profileTitle || ""}
- Story-sharing scenario answer: ${p?.scenarioStory || ""}
- Networking scenario answer: ${p?.scenarioNetworking || ""}
- Feeling about presentations: ${p?.presentationFeeling || ""}
- Reaction to constructive criticism: ${p?.criticismReaction || ""}
- Main self-growth barrier: ${p?.selfGrowthBarrier || ""} ${p?.otherBarrier ? `(${p.otherBarrier})` : ""}
- Power skill to begin with: ${p?.selectedPowerSkill || ""}
- Preferred learning style: ${p?.learningStyle || ""}
- Favorite learning time: ${p?.favoriteLearningTime || ""}
- Daily upskilling intensity: ${p?.dailyIntensity || ""}
- Self-reflection habit: ${p?.selfReflects || ""}
- Wants friendly motivational push: ${p?.friendlyPush || ""}
- Believes practice is crucial: ${p?.practiceBelief || ""}
- Finishes what they start: ${p?.finishesWhatStarts || ""}
- Learner challenge type: ${p?.learnerChallengeType || ""}

CRITICAL INSTRUCTIONS:
1. TAILOR THE ENTIRE PLAN to ${roleModel}'s style of public speaking (${roleModelTrait}). The 7 daily tasks, the tone, and the techniques must clearly reflect how ${roleModel} communicates. Reference their approach explicitly.
2. The daily task length/intensity must match "${p?.dailyIntensity || "moderate"}".
3. Honor the learning style "${p?.learningStyle || ""}" (e.g. more drills for practical, more concepts for theoretical, roleplay for AI roleplay, micro-tasks for short daily challenges).
4. Address the learner's barrier "${p?.selfGrowthBarrier || ""}" and challenge type "${p?.learnerChallengeType || ""}" directly in how the plan is structured.
5. Keep all examples appropriate for the learner's age.

Return ONLY valid JSON with this exact shape:
{
  "roleModelInsight": "1-2 sentences on how this plan reflects ${roleModel}'s speaking style",
  "strengths": ["3 specific, personalized strengths"],
  "growthAreas": ["3 specific growth areas, lowercase short phrases"],
  "motivationalQuote": "2-3 sentence motivating message that references their score and goals",
  "trainingPlan": [
    {"day": 1, "title": "short title", "task": "concrete task tailored to role model + answers"},
    {"day": 2, "title": "...", "task": "..."},
    {"day": 3, "title": "...", "task": "..."},
    {"day": 4, "title": "...", "task": "..."},
    {"day": 5, "title": "...", "task": "..."},
    {"day": 6, "title": "...", "task": "..."},
    {"day": 7, "title": "...", "task": "..."}
  ]
}`;

  const text = await callGemini({ system: TRAINER_PERSONA, user, temperature: 0.8 });
  const obj = parseJSON(text);
  // Normalize / clamp
  obj.strengths = (obj.strengths || []).slice(0, 3).map(String);
  obj.growthAreas = (obj.growthAreas || []).slice(0, 3).map(String);
  obj.trainingPlan = (obj.trainingPlan || [])
    .slice(0, 7)
    .map((d: any, i: number) => ({
      day: Number(d.day) || i + 1,
      title: String(d.title || `Day ${i + 1}`),
      task: String(d.task || ""),
    }));
  return obj;
}

// ---------------- FEEDBACK ----------------
async function buildFeedback(p: any) {
  const roleModel = p?.roleModelName || "their chosen role model";
  const user = `Evaluate this practice response as a professional public-speaking coach.

Scenario: ${p?.scenarioTitle || ""}
Coaching cues for this scenario: ${JSON.stringify(p?.coachLines || [])}
Learner age: ${p?.age ?? "unknown"}. ${ageRules(p?.age ?? null)}
Learner's role model / target style: ${roleModel}.
Learner's current goals: ${JSON.stringify(p?.selectedGoals || [])}.

LEARNER'S RESPONSE (this is ${p?.audioTranscript ? "a transcript of their spoken answer" : "their typed answer"}):
"""${p?.response || ""}"""

Score each dimension 0-100 honestly (do not inflate). Give specific, kind, actionable feedback that nudges them toward ${roleModel}'s speaking style. The "betterVersion" must be a rewritten, stronger version of THEIR answer (same scenario), with a strong opening and closing.

Return ONLY valid JSON with this exact shape:
{
  "overall": 0,
  "clarity": 0,
  "confidence": 0,
  "structure": 0,
  "empathy": 0,
  "persuasion": 0,
  "storytelling": 0,
  "didWell": "what they did well (1-2 sentences, specific)",
  "improve": "the single most important growth area (1-2 sentences)",
  "betterVersion": "a stronger rewritten version of their answer",
  "microChallenge": "one concrete micro-challenge for next time"
}`;

  const text = await callGemini({ system: TRAINER_PERSONA, user, temperature: 0.6 });
  const o = parseJSON(text);
  const num = (v: any, d = 60) => {
    const n = Math.round(Number(v));
    return isNaN(n) ? d : Math.max(0, Math.min(100, n));
  };
  return {
    overall: num(o.overall),
    clarity: num(o.clarity),
    confidence: num(o.confidence),
    structure: num(o.structure),
    empathy: num(o.empathy),
    persuasion: num(o.persuasion),
    storytelling: num(o.storytelling),
    didWell: String(o.didWell || ""),
    improve: String(o.improve || ""),
    betterVersion: String(o.betterVersion || ""),
    microChallenge: String(o.microChallenge || ""),
  };
}
