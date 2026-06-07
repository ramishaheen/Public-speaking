"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useProfile } from "@/lib/store";
import { generateSkillsStatus } from "@/lib/ai";
import { requestSkillsStatus, fetchLLMStatus, SkillsStatus } from "@/lib/llm-client";
import { loadFocusResult } from "@/lib/eeg";
import { AppShell, SectionTitle } from "@/components/shell";
import { TerminalHeader, TerminalStatusBar } from "@/components/terminal";
import { PrimaryButton, SecondaryButton } from "@/components/controls";
import { ScoreBar } from "@/components/panels";

export default function SkillsPage() {
  const { profile, hydrated } = useProfile();
  const [report, setReport] = useState<SkillsStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState<"gemini" | "heuristic" | null>(null);

  const avgScores = useMemo(() => {
    const a = profile.attempts || [];
    if (!a.length) return {};
    const keys = ["clarity", "confidence", "structure", "empathy", "persuasion", "storytelling"] as const;
    const out: Record<string, number> = {};
    for (const k of keys) {
      out[k] = Math.round(a.reduce((s, x) => s + (Number((x.feedback as any)[k]) || 0), 0) / a.length);
    }
    return out;
  }, [profile.attempts]);

  const generate = async () => {
    setLoading(true);
    setReport(null);
    const focus = loadFocusResult();
    const payload = {
      selectedGoals: profile.selectedGoals,
      assessmentAnswers: profile.assessmentAnswers,
      presentationFeeling: profile.presentationFeeling,
      criticismReaction: profile.criticismReaction,
      selfGrowthBarrier: profile.selfGrowthBarrier,
      selfReflects: profile.selfReflects,
      finishesWhatStarts: profile.finishesWhatStarts,
      profileTitle: profile.profileTitle,
      scores: profile.scores,
      roleModel: profile.roleModels[0] || profile.otherRoleModel || "",
      avgScores,
      attempts: (profile.attempts || []).slice(0, 12).map((a) => ({
        scenario: a.scenarioTitle,
        overall: a.feedback.overall,
        clarity: a.feedback.clarity,
        confidence: a.feedback.confidence,
        structure: a.feedback.structure,
        empathy: a.feedback.empathy,
        persuasion: a.feedback.persuasion,
        storytelling: a.feedback.storytelling,
      })),
      focus: focus
        ? { focusScore: focus.focusScore, stability: focus.stability, timeInFlowPct: focus.timeInFlowPct }
        : null,
    };

    const status = await fetchLLMStatus();
    let r: SkillsStatus | null = null;
    if (status.configured) {
      r = await requestSkillsStatus(payload);
      if (r) setEngine("gemini");
    }
    if (!r) {
      await new Promise((res) => setTimeout(res, 500));
      r = generateSkillsStatus(profile) as SkillsStatus;
      setEngine("heuristic");
    }
    setReport(r);
    setLoading(false);
  };

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="terminal-text animate-pulse text-neon">LOADING SKILLS_REPORT…</div>
      </main>
    );
  }

  if (!profile.onboardingComplete) {
    return (
      <AppShell active="skills">
        <div className="mx-auto max-w-md rounded-xl border border-neon/20 bg-black/40 p-8 text-center">
          <div className="text-4xl">📊</div>
          <h2 className="mt-3 text-xl font-bold text-white">Complete the assessment first</h2>
          <p className="mt-2 text-sm text-mist">
            Your skills status and blind spots are built from your assessment, practice attempts, and
            focus sessions.
          </p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-xl border border-neon/60 bg-neon/10 px-6 py-3 font-semibold text-neon hover:bg-neon/20"
          >
            Start Assessment ›
          </Link>
        </div>
      </AppShell>
    );
  }

  const attempts = profile.attempts?.length || 0;

  return (
    <AppShell active="skills">
      <SectionTitle sub="An AI synthesis of your assessment, practice, and focus data — including the blind spots you can't see yourself.">
        AI Skills Status & Blind Spots
      </SectionTitle>

      <div className="overflow-hidden rounded-xl shadow-glass">
        <TerminalHeader path="C:\ETIHAD\SPEAKING_ROOM\SKILLS_STATUS" />
        <div className="glass rounded-b-xl border-t-0 p-5 sm:p-7">
          {!report && !loading && (
            <div className="text-center">
              <p className="mx-auto max-w-lg text-sm text-mist">
                This report combines everything you&apos;ve done — your self-assessment, your{" "}
                <Link href="/practice" className="text-neon underline">
                  Practice Room
                </Link>{" "}
                attempts ({attempts}), and your{" "}
                <Link href="/neuroscience" className="text-neon underline">
                  NeuroScience
                </Link>{" "}
                focus session — and finds where your self-perception and your measured performance
                diverge.
              </p>
              <div className="mt-5">
                <PrimaryButton onClick={generate}>Generate my skills report</PrimaryButton>
              </div>
              {attempts < 3 && (
                <p className="mt-3 text-[11px] text-gold">
                  Tip: complete at least 3 Practice Room scenarios for a sharper, higher-confidence report.
                </p>
              )}
            </div>
          )}

          {loading && (
            <div className="terminal-text space-y-1 py-6 text-sm text-neon/90">
              <div>&gt; gathering assessment, practice & focus data…</div>
              <div>&gt; comparing self-perception vs measured performance…</div>
              <div>&gt; surfacing blind spots… <span className="animate-blink">▋</span></div>
            </div>
          )}

          {report && !loading && <Report report={report} engine={engine} onRegen={generate} />}

          <TerminalStatusBar
            items={[
              `ENGINE: [${engine === "gemini" ? "GEMINI" : engine === "heuristic" ? "HEURISTIC" : "READY"}]`,
              `ATTEMPTS: [${attempts}]`,
              `STATUS: [${report ? "COMPLETE" : "AWAITING"}]`,
            ]}
          />
        </div>
      </div>
    </AppShell>
  );
}

function Report({
  report,
  engine,
  onRegen,
}: {
  report: SkillsStatus;
  engine: "gemini" | "heuristic" | null;
  onRegen: () => void;
}) {
  return (
    <div className="animate-fadeUp">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="terminal-text text-[11px] uppercase tracking-widest text-neon">
          SKILLS STATUS REPORT
        </div>
        <div className="flex items-center gap-2">
          <span className="terminal-text rounded-md border border-steel bg-black/30 px-2 py-0.5 text-[10px] text-mist">
            confidence: {report.confidence}
          </span>
          <span
            className={`terminal-text rounded-md border px-2 py-0.5 text-[10px] ${
              engine === "gemini" ? "border-neon/50 bg-neon/10 text-neon" : "border-steel bg-black/30 text-mist"
            }`}
          >
            {engine === "gemini" ? "by Gemini" : "heuristic"}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-end gap-3">
        <span className="text-4xl font-extrabold text-glow text-white">{report.overall}</span>
        <span className="mb-1 text-sm text-mist">/ 100 overall</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/90">{report.headline}</p>

      {report.strengths?.length > 0 && (
        <div className="mt-4 rounded-xl border border-neon/15 bg-black/30 p-4">
          <div className="terminal-text text-[10px] uppercase tracking-widest text-neon">Strengths</div>
          <ul className="mt-2 space-y-1.5 text-sm text-white/90">
            {report.strengths.map((s, i) => (
              <li key={i}>
                <span className="text-neon">+</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="mt-5 text-sm font-bold uppercase tracking-widest text-mist">Skills breakdown</h3>
      <div className="mt-3 space-y-3">
        {report.skills.map((s, i) => (
          <div key={i} className="rounded-xl border border-neon/10 bg-black/30 p-3.5">
            <ScoreBar label={`${s.name}${s.level ? ` · ${s.level}` : ""}`} value={s.score} />
            {s.evidence && <p className="mt-1.5 text-xs text-mist">{s.evidence}</p>}
            {s.advice && <p className="mt-1 text-xs text-teal">→ {s.advice}</p>}
          </div>
        ))}
      </div>

      <h3 className="mt-6 text-sm font-bold uppercase tracking-widest text-gold">
        🔎 Blind spots
      </h3>
      <p className="text-[11px] text-mist">Gaps between how you see yourself and what the data shows.</p>
      <div className="mt-3 space-y-3">
        {report.blindSpots.map((b, i) => (
          <div key={i} className="rounded-xl border border-gold/30 bg-gold/5 p-4">
            <div className="text-sm font-semibold text-gold">{b.title}</div>
            <p className="mt-1 text-sm text-white/90">{b.gap}</p>
            {b.why && <p className="mt-1 text-xs text-mist">Why it matters: {b.why}</p>}
            {b.fix && <p className="mt-1 text-xs text-teal">Fix: {b.fix}</p>}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-neon/20 bg-neon/5 p-4">
        <div className="terminal-text text-[10px] uppercase tracking-widest text-neon">
          Priority focus
        </div>
        <p className="mt-1 text-sm text-white/90">{report.priorityFocus}</p>
      </div>

      {report.nextSteps?.length > 0 && (
        <div className="mt-4">
          <div className="terminal-text text-[10px] uppercase tracking-widest text-mist">Next steps</div>
          <ol className="mt-2 space-y-1.5 text-sm text-white/90">
            {report.nextSteps.map((n, i) => (
              <li key={i} className="flex gap-2">
                <span className="terminal-text text-neon">{i + 1}.</span>
                <span>{n}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <PrimaryButton onClick={onRegen}>Regenerate</PrimaryButton>
        <Link href="/practice">
          <SecondaryButton>Back to Practice</SecondaryButton>
        </Link>
      </div>
    </div>
  );
}
