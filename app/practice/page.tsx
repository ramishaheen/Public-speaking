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
  const [hasAudio, setHasAudio] = useState(false);
  const [srSupported, setSrSupported] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef<string>("");
  const audioBlobRef = useRef<Blob | null>(null);

  const scenario = PRACTICE_SCENARIOS.find((s) => s.id === scenarioId)!;

  // Detect whether Gemini is configured (key present in env).
  useEffect(() => {
    fetchLLMStatus().then((s) => setEngine(s.configured ? "gemini" : "mock"));
    const SR =
      (typeof window !== "undefined" && (window as any).SpeechRecognition) ||
      (typeof window !== "undefined" && (window as any).webkitSpeechRecognition);
    setSrSupported(!!SR);
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
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || (chunksRef.current[0] ? (chunksRef.current[0] as Blob).type : "audio/webm"),
        });
        audioBlobRef.current = blob;
        setHasAudio(blob.size > 0);
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

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  // -------- submit --------
  const submit = async () => {
    const hasText = !!response.trim();
    const canUseAudio = engine === "gemini" && !!audioBlobRef.current;
    if (!hasText && !canUseAudio) {
      setRecError(
        "No answer to evaluate yet. Type your answer, or record again in Chrome/Edge/Safari for live transcription. (With a Gemini key, your voice recording is transcribed automatically.)",
      );
      return;
    }
    setRecError("");
    setAnalyzing(true);
    setFeedback(null);

    const base = {
      scenarioTitle: scenario.title,
      coachLines: scenario.coachLines,
      age: profile.age,
      selectedGoals: profile.selectedGoals,
      roleModelName: profile.roleModels[0] || profile.otherRoleModel || "",
    };

    let fb: (PracticeFeedback & { transcript?: string }) | null = null;
    let used: "gemini" | "mock" = "mock";

    if (engine === "gemini") {
      // Prefer transcribing the actual audio (works in every browser).
      if (audioBlobRef.current) {
        try {
          const data = await blobToBase64(audioBlobRef.current);
          fb = await requestFeedback({
            ...base,
            response,
            audio: { data, mimeType: audioBlobRef.current.type || "audio/webm" },
          });
        } catch {
          fb = null;
        }
      }
      // No audio (or audio failed) but we have text → evaluate the text.
      if (!fb && hasText) {
        fb = await requestFeedback({ ...base, response, audioTranscript: wasSpoken });
      }
      if (fb) {
        used = "gemini";
        if (fb.transcript && fb.transcript.trim()) setResponse(fb.transcript.trim());
      }
    }

    if (!fb) {
      // local mock fallback (text only — keep UX snappy)
      if (!hasText) {
        setAnalyzing(false);
        setRecError(
          "Voice evaluation needs a Gemini key. For now, type your answer (or use Chrome/Edge/Safari, which transcribes your voice live as you speak).",
        );
        return;
      }
      await new Promise((r) => setTimeout(r, 600));
      fb = generatePracticeFeedback(response, scenarioId, profile);
      used = "mock";
    }

    const finalResponse = fb.transcript && fb.transcript.trim() ? fb.transcript.trim() : response;
    const attempt: PracticeAttempt = {
      id: `${Date.now()}`,
      scenarioId,
      scenarioTitle: scenario.title,
      response: finalResponse,
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
    setHasAudio(false);
    setUsedEngine(null);
    setRecError("");
    audioBlobRef.current = null;
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
            {hasAudio && !recording && (
              <p className="terminal-text mt-2 text-[11px] text-neon">
                ✓ recording captured —{" "}
                {engine === "gemini"
                  ? "Gemini will transcribe & evaluate it when you submit."
                  : "submit to evaluate (the live transcript is in the box above)."}
              </p>
            )}
            <p className="mt-1.5 text-[11px] text-mist">
              {engine === "gemini"
                ? "Speak your answer and submit — Gemini transcribes the recording and evaluates it, in any browser."
                : srSupported
                  ? "Your voice is transcribed live into the box as you speak (Chrome, Edge, Safari). Edit it, then submit."
                  : "This browser can't transcribe speech locally. Recording still works — type your answer, or use Chrome/Edge/Safari. (Adding a Gemini key enables voice in every browser.)"}
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

      {fb.summary && (
        <div className="mt-3 rounded-xl border border-neon/20 bg-neon/5 p-3.5">
          <div className="terminal-text text-[10px] uppercase tracking-widest text-neon">Verdict</div>
          <p className="mt-1 text-sm leading-relaxed text-white/90">{fb.summary}</p>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <ScoreRow label="Clarity" value={fb.clarity} note={fb.aspectNotes?.clarity} />
        <ScoreRow label="Confidence" value={fb.confidence} note={fb.aspectNotes?.confidence} />
        <ScoreRow label="Structure" value={fb.structure} note={fb.aspectNotes?.structure} />
        <ScoreRow label="Empathy" value={fb.empathy} note={fb.aspectNotes?.empathy} />
        <ScoreRow label="Persuasion" value={fb.persuasion} note={fb.aspectNotes?.persuasion} />
        <ScoreRow label="Storytelling" value={fb.storytelling} note={fb.aspectNotes?.storytelling} />
      </div>

      {fb.observations && fb.observations.length > 0 && (
        <div className="mt-4 rounded-xl border border-neon/10 bg-black/30 p-3.5">
          <div className="terminal-text text-[10px] uppercase tracking-widest text-teal">
            Detailed observations
          </div>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-white/90">
            {fb.observations.map((o, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-neon">›</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <Block title="What you did well" tone="neon">
          {fb.didWell}
        </Block>
        <Block title="Biggest growth area" tone="gold">
          {fb.improve}
        </Block>
        <Block title="Stronger version of your answer" tone="teal">
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

function ScoreRow({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div>
      <ScoreBar label={label} value={value} />
      {note && <p className="mt-1 pl-0.5 text-xs leading-relaxed text-mist">{note}</p>}
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
