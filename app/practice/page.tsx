"use client";

import React, { useEffect, useRef, useState } from "react";
import { useProfile } from "@/lib/store";
import { PRACTICE_SCENARIOS, EMOTIONAL_HOOKS } from "@/lib/content";
import { generatePracticeFeedback, recomputeBadges, generateDailyChallenge } from "@/lib/ai";
import { fetchLLMStatus, requestFeedback } from "@/lib/llm-client";
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
  const [engine, setEngine] = useState<"gemini" | "mock">("mock");
  const [usedEngine, setUsedEngine] = useState<"gemini" | "mock" | null>(null);

  // recording state
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recError, setRecError] = useState("");
  const [wasSpoken, setWasSpoken] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef<string>("");

  const scenario = PRACTICE_SCENARIOS.find((s) => s.id === scenarioId)!;

  // Detect whether Gemini is configured (key present in env).
  useEffect(() => {
    fetchLLMStatus().then((s) => setEngine(s.configured ? "gemini" : "mock"));
  }, []);

  // -------- recording --------
  const startRecording = async () => {
    setRecError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0] ? (chunksRef.current[0] as Blob).type : "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);

      // Live transcription via the Web Speech API where available (Chrome/Edge/Safari).
      const SR: any =
        (typeof window !== "undefined" && (window as any).SpeechRecognition) ||
        (typeof window !== "undefined" && (window as any).webkitSpeechRecognition);
      if (SR) {
        baseTextRef.current = response ? response.trim() + " " : "";
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        rec.onresult = (event: any) => {
          let finalText = "";
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const tr = event.results[i];
            if (tr.isFinal) finalText += tr[0].transcript;
            else interim += tr[0].transcript;
          }
          if (finalText) baseTextRef.current += finalText + " ";
          setResponse((baseTextRef.current + interim).trimStart());
          setWasSpoken(true);
        };
        rec.onerror = () => {};
        recognitionRef.current = rec;
        try {
          rec.start();
        } catch {
          /* ignore double-start */
        }
      }
    } catch (e: any) {
      setRecError(
        "Microphone access was blocked. Allow mic permission in your browser, or type your answer instead.",
      );
      setRecording(false);
    }
  };

  const stopRecording = () => {
    try {
      mediaRecorderRef.current?.stop();
    } catch {}
    try {
      recognitionRef.current?.stop();
    } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
  };

  const toggleRecording = () => (recording ? stopRecording() : startRecording());

  // -------- submit --------
  const submit = async () => {
    if (!response.trim()) return;
    setAnalyzing(true);
    setFeedback(null);

    let fb: PracticeFeedback | null = null;
    let used: "gemini" | "mock" = "mock";

    if (engine === "gemini") {
      fb = await requestFeedback({
        response,
        scenarioTitle: scenario.title,
        coachLines: scenario.coachLines,
        age: profile.age,
        selectedGoals: profile.selectedGoals,
        roleModelName: profile.roleModels[0] || profile.otherRoleModel || "",
        audioTranscript: wasSpoken,
      });
      if (fb) used = "gemini";
    }
    if (!fb) {
      // local mock fallback — keep UX snappy
      await new Promise((r) => setTimeout(r, 600));
      fb = generatePracticeFeedback(response, scenarioId, profile);
      used = "mock";
    }

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
    setUsedEngine(used);
    setAnalyzing(false);
  };

  const retry = () => {
    setFeedback(null);
    setResponse("");
    setAudioUrl(null);
    setWasSpoken(false);
    setUsedEngine(null);
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
      <SectionTitle sub="An active AI coaching console. Pick a scenario, respond by voice or text, and get instant feedback.">
        Practice Room
      </SectionTitle>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        {/* Left: scenario console */}
        <div className="overflow-hidden rounded-xl shadow-glass">
          <TerminalHeader path="C:\ETIHAD\SPEAKING_ROOM\PRACTICE_MODE" />
          <div className="glass rounded-b-xl border-t-0 p-5">
            <div className="flex items-center justify-between">
              <span className="terminal-text text-[11px] text-neon">SYS_STATUS: [LIVE_PRACTICE]</span>
              <span
                className={`terminal-text rounded-md border px-2 py-0.5 text-[10px] ${
                  engine === "gemini"
                    ? "border-neon/50 bg-neon/10 text-neon"
                    : "border-steel bg-black/30 text-mist"
                }`}
                title={
                  engine === "gemini"
                    ? "Gemini is connected — evaluation is LLM-powered."
                    : "No API key found — using the built-in mock coach. Add GEMINI_API_KEY to enable Gemini."
                }
              >
                AI_ENGINE: [{engine === "gemini" ? "GEMINI" : "MOCK"}]
              </span>
            </div>

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
              Your response {wasSpoken && <span className="text-neon">(transcribed from voice)</span>}
            </label>
            <div className="mt-1.5">
              <TextArea value={response} onChange={setResponse} placeholder="Type your answer here, or use the mic to speak it..." rows={6} />
            </div>

            {/* Voice recording (real) */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={toggleRecording}
                className={`terminal-text flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                  recording
                    ? "border-neon bg-neon/10 text-neon animate-pulseGlow"
                    : "border-steel text-mist hover:border-neon/40 hover:text-neon"
                }`}
              >
                {recording ? "■ Stop recording" : "🎙 Record answer"}
              </button>
              {audioUrl && !recording && (
                <audio src={audioUrl} controls className="h-8 max-w-[220px]" />
              )}
              {recording && (
                <span className="terminal-text text-[11px] text-neon">
                  ● listening… <span className="animate-blink">▋</span>
                </span>
              )}
            </div>
            {recError && <p className="terminal-text mt-2 text-xs text-gold">! {recError}</p>}
            <p className="mt-1.5 text-[11px] text-mist">
              Voice is recorded in your browser and transcribed live where supported (Chrome, Edge,
              Safari). You can edit the transcript before submitting.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <PrimaryButton onClick={submit} disabled={analyzing || !response.trim()}>
                {analyzing ? "Analyzing…" : "Submit to AI Coach"}
              </PrimaryButton>
              <SecondaryButton onClick={retry}>Retry</SecondaryButton>
            </div>

            <TerminalStatusBar
              items={[
                "SYS_STATUS: [PRACTICE_MODE]",
                `FEEDBACK: [${engine === "gemini" ? "GEMINI" : "LIVE"}]`,
                "CONFIDENCE_TRACKER: [ON]",
              ]}
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
                <div>&gt; {engine === "gemini" ? "sending to Gemini coach…" : "scoring clarity, confidence, structure…"}</div>
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

            {feedback && !analyzing && (
              <FeedbackReport
                fb={feedback}
                onChallenge={generateDailyChallenge(profile)}
                engine={usedEngine}
              />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function FeedbackReport({
  fb,
  onChallenge,
  engine,
}: {
  fb: PracticeFeedback;
  onChallenge: string;
  engine: "gemini" | "mock" | null;
}) {
  return (
    <div className="animate-fadeUp">
      <div className="flex items-center justify-between">
        <div className="terminal-text text-[11px] uppercase tracking-widest text-neon">
          COMMUNICATION FEEDBACK REPORT
        </div>
        <span
          className={`terminal-text rounded-md border px-2 py-0.5 text-[10px] ${
            engine === "gemini" ? "border-neon/50 bg-neon/10 text-neon" : "border-steel bg-black/30 text-mist"
          }`}
        >
          {engine === "gemini" ? "evaluated by Gemini" : "mock evaluation"}
        </span>
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
