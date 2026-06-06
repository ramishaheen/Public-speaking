"use client";

// ============================================================
// Client-side bridge to the Gemini coaching endpoint.
// Every function fails soft: returns null if the LLM is not
// configured or the call errors, so callers use the mock engine.
// ============================================================

import { PracticeFeedback, TrainingDay } from "./types";

export interface LLMStatus {
  configured: boolean;
  provider: string;
  model: string;
}

export interface LLMPlan {
  roleModelInsight?: string;
  strengths: string[];
  growthAreas: string[];
  motivationalQuote: string;
  trainingPlan: TrainingDay[];
}

export async function fetchLLMStatus(): Promise<LLMStatus> {
  try {
    const res = await fetch("/api/llm", { method: "GET" });
    if (!res.ok) return { configured: false, provider: "gemini", model: "" };
    return (await res.json()) as LLMStatus;
  } catch {
    return { configured: false, provider: "gemini", model: "" };
  }
}

async function post(task: string, payload: unknown): Promise<any | null> {
  try {
    const res = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, payload }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.configured || json?.error || !json?.data) return null;
    return json.data;
  } catch {
    return null;
  }
}

export async function requestPlan(payload: unknown): Promise<LLMPlan | null> {
  const data = await post("plan", payload);
  if (!data || !Array.isArray(data.trainingPlan) || data.trainingPlan.length === 0) return null;
  return data as LLMPlan;
}

export type FeedbackWithTranscript = PracticeFeedback & { transcript?: string };

export async function requestFeedback(payload: unknown): Promise<FeedbackWithTranscript | null> {
  const data = await post("feedback", payload);
  if (!data || typeof data.overall !== "number") return null;
  return data as FeedbackWithTranscript;
}
