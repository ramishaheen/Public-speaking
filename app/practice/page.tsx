"use client";

import React, { useState } from "react";
import { useProfile } from "@/lib/store";
import { PRACTICE_SCENARIOS, EMOTIONAL_HOOKS } from "@/lib/content";
import { generatePracticeFeedback, recomputeBadges, generateDailyChallenge } from "@/lib/ai";
import { PracticeAttempt, PracticeFeedback } from "@/lib/types";
import { AppShell, SectionTitle } from "@/components/shell";
import { TerminalHeader, TerminalStatusBar, RotatingText } from "@/components/terminal";
import { PrimaryButton, SecondaryButton, TextArea } from "@/components/controls";
import { ScoreBar } from "@/components/panels";

export default function PracticePage() {
  const { profile, update, hydrated } = useProfile();
  const [scenarioId, setScenarioId] = useState(PRACTICE_SCENARIOS[0].id);
  const [response, setResponse] = useState("");
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [recording, setRecording] = useState(false);

  const scenario = PRACTICE_SCENARIOS.find((s) => s.id === scenarioId)!;

  const submit = () => {
    if (!response.trim()) return;
    setAnalyzing(true);
    setFeedback(null);
    // Simulate AI latency (swap for callLLM()).
    setTimeout(() => {
      const fb = generatePracticeFeedback(response, scenarioId, profile);
      const attempt: PracticeAttempt = {
        id: `${Date.now()}`,
        scenarioId,
        scenarioTitle: scenario.title,
        response,
        feedback: fb,
        createdAt: Date.now(),
      };
      const attempts = [attempt, ...profile.attempts];
      const newStreak = Math.max(profile.streak, Math.min(7, attempts.length));
      const next = { ...profile, attempts, streak: newStreak };
      update({ attempts, streak: newStreak, badges: recomputeBadges(next) });
      setFeedback(fb);
      setAnalyzing(false);
    }, 1400);
  };

  const retry = () => {
    setFeedback(null);
    setResponse("");
  };

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="terminal-text animate-pulse text-neon">LOADING PRACTICE_MODE…</div>
      </main>
    );
  }

  return (
    <AppShell active="practice">
      <SectionTitle sub="An active AI coaching console. Pick a scenario, respond, and get instant feedback.">
        Practice Room
      </SectionTitle>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        {/* Left: scenario console */}
        <div className="overflow-hidden rounded-xl shadow-glass">
          <TerminalHeader path="C:\ETIHAD\SPEAKING_ROOM\PRACTICE_MODE" />
          <div className="glass rounded-b-xl border-t-0 p-5">
            <div className="terminal-text text-[11px] text-neon">SYS_STATUS: [LIVE_PRACTICE]</div>

            <label className="terminal-text mt-4 block text-xs uppercase tracking-wide text-mist">
              Select scenario
            </label>
            <select
              value={scenarioId}
              onChange={(e) => {
                setScenarioId(e.target.value);
                retry();
              }}
              className="mt-1.5 w-full rounded-xl border border-steel bg-black/50 px-3 py-2.5 text-white outline-none focus:border-neon/60"
            >
              {PRACTICE_SCENARIOS.map((s) => (
                <option key={s.id} value={s.id} className="bg-carbon">
                  {s.title}
                </option>
              ))}
            </select>

            <div className="mt-4 rounded-xl border border-neon/15 bg-black/40 p-4">
              <div className="text-sm font-semibold text-white">Scenario</div>
              <div className="mt-1 text-sm text-teal">{scenario.title}</div>
              <div className="terminal-text mt-3 space-y-1 text-xs text-neon/80">
                <div className="text-mist">AI Coach:</div>
                {scenario.coachLines.map((l, i) => (
                  <div key={i}>
                    <span className="text-neon">&gt;</span> {l}
                  </div>
                ))}
              </div>
            </div>

            <label className="terminal-text mt-4 block text-xs uppercase tracking-wide text-mist">
              Your response
            </label>
            <div className="mt-1.5">
              <TextArea value={response} onChange={setResponse} placeholder="Type your answer here..." rows={6} />
            </div>

            {/* Voice recording placeholder */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => setRecording((r) => !r)}
                className={`terminal-text flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                  recording ? "border-neon bg-neon/10 text-neon animate-pulseGlow" : "border-steel text-mist hover:border-neon/40"
                }`}
                title="Voice recording is a UI placeholder — connect the Web Audio / MediaRecorder API later."
              >
                {recording ? "● RECORDING…" : "🎙 Record audio (beta)"}
              </button>
              <span className="text-[11px] text-mist">Voice capture can be connected later.</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <PrimaryButton onClick={submit} disabled={analyzing || !response.trim()}>
                {analyzing ? "Analyzing…" : "Submit to AI Coach"}
              </PrimaryButton>
              <SecondaryButton onClick={retry}>Retry</SecondaryButton>
            </div>

            <TerminalStatusBar
              items={["SYS_STATUS: [PRACTICE_MODE]", "FEEDBACK: [LIVE]", "CONFIDENCE_TRACKER: [ON]"]}
            />
          </div>
        </div>

        {/* Right: feedback report */}
        <div className="overflow-hidden rounded-xl shadow-glass">
          <TerminalHeader path="C:\ETIHAD\SPEAKING_ROOM\FEEDBACK_REPORT" />
          <div className="glass min-h-[300px] rounded-b-xl border-t-0 p-5">
            {analyzing && (
              <div className="terminal-text space-y-1 text-sm text-neon/90">
                <div>&gt; receiving response…</div>
                <div>&gt; scoring clarity, confidence, structure…</div>
                <div>&gt; drafting improvements… <span className="animate-blink">▋</span></div>
              </div>
            )}

            {!analyzing && !feedback && (
              <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
                <div className="text-4xl">🎤</div>
                <p className="mt-3 max-w-xs text-sm text-mist">
                  Submit your response to receive a full <span className="text-neon">Communication Feedback Report</span>.
                </p>
                <div className="terminal-text mt-4 text-xs text-teal">
                  <RotatingText items={EMOTIONAL_HOOKS} />
                </div>
              </div>
            )}

            {feedback && !analyzing && <FeedbackReport fb={feedback} onChallenge={generateDailyChallenge(profile)} />}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function FeedbackReport({ fb, onChallenge }: { fb: PracticeFeedback; onChallenge: string }) {
  return (
    <div className="animate-fadeUp">
      <div className="terminal-text text-[11px] uppercase tracking-widest text-neon">
        COMMUNICATION FEEDBACK REPORT
      </div>
      <div className="mt-3 flex items-end gap-3">
        <span className="text-4xl font-extrabold text-glow text-white">{fb.overall}</span>
        <span className="mb-1 text-sm text-mist">/ 100 overall</span>
      </div>

      <div className="mt-4 space-y-2.5">
        <ScoreBar label="Clarity" value={fb.clarity} />
        <ScoreBar label="Confidence" value={fb.confidence} />
        <ScoreBar label="Structure" value={fb.structure} />
        <ScoreBar label="Empathy" value={fb.empathy} />
        <ScoreBar label="Persuasion" value={fb.persuasion} />
        <ScoreBar label="Storytelling" value={fb.storytelling} />
      </div>

      <div className="mt-4 space-y-3">
        <Block title="What you did well" tone="neon">
          {fb.didWell}
        </Block>
        <Block title="Growth area" tone="gold">
          {fb.improve}
        </Block>
        <Block title="Better version" tone="teal">
          {fb.betterVersion}
        </Block>
        <Block title="Micro-challenge" tone="neon">
          {fb.microChallenge}
        </Block>
      </div>

      <div className="mt-4 rounded-xl border border-teal/30 bg-teal/5 p-3 text-xs text-mist">
        <span className="terminal-text text-teal">NEXT_CHALLENGE:</span> {onChallenge}
      </div>
    </div>
  );
}

function Block({
  title,
  children,
  tone,
}: {
  title: string;
  children: React.ReactNode;
  tone: "neon" | "gold" | "teal";
}) {
  const color = tone === "neon" ? "text-neon" : tone === "gold" ? "text-gold" : "text-teal";
  return (
    <div className="rounded-xl border border-neon/10 bg-black/30 p-3.5">
      <div className={`terminal-text text-[10px] uppercase tracking-widest ${color}`}>{title}</div>
      <p className="mt-1 text-sm leading-relaxed text-white/90">{children}</p>
    </div>
  );
}
