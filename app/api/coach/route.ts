// ============================================================
// LLM coaching endpoint (scaffold).
// ------------------------------------------------------------
// This route is the single place to wire a real LLM provider.
// It currently returns a clear "not configured" response so the
// frontend transparently falls back to the local mock engine.
//
// To enable a provider, set an API key in the environment and
// uncomment the matching block below.
// ============================================================

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { system, prompt, temperature } = await req.json();

  // ---- ANTHROPIC (Claude) ----
  // const key = process.env.ANTHROPIC_API_KEY;
  // if (key) {
  //   const res = await fetch("https://api.anthropic.com/v1/messages", {
  //     method: "POST",
  //     headers: {
  //       "x-api-key": key,
  //       "anthropic-version": "2023-06-01",
  //       "content-type": "application/json",
  //     },
  //     body: JSON.stringify({
  //       model: "claude-opus-4-8",
  //       max_tokens: 800,
  //       temperature: temperature ?? 0.6,
  //       system,
  //       messages: [{ role: "user", content: prompt }],
  //     }),
  //   });
  //   const data = await res.json();
  //   return NextResponse.json({ text: data.content?.[0]?.text ?? "" });
  // }

  // ---- OPENAI ----
  // const key = process.env.OPENAI_API_KEY;
  // if (key) {
  //   const res = await fetch("https://api.openai.com/v1/chat/completions", {
  //     method: "POST",
  //     headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
  //     body: JSON.stringify({
  //       model: "gpt-4o",
  //       temperature: temperature ?? 0.6,
  //       messages: [
  //         { role: "system", content: system },
  //         { role: "user", content: prompt },
  //       ],
  //     }),
  //   });
  //   const data = await res.json();
  //   return NextResponse.json({ text: data.choices?.[0]?.message?.content ?? "" });
  // }

  // ---- GEMINI ----
  // const key = process.env.GEMINI_API_KEY; // call generativelanguage.googleapis.com

  return NextResponse.json(
    {
      configured: false,
      text: "",
      note: "No LLM provider configured. The app is using its built-in mock coach. See app/api/coach/route.ts to connect OpenAI, Claude, or Gemini.",
      echo: { system: system?.slice(0, 60), prompt: prompt?.slice(0, 60), temperature },
    },
    { status: 200 },
  );
}
