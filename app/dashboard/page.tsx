"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useProfile } from "@/lib/store";
import { ALL_BADGES, EMOTIONAL_HOOKS } from "@/lib/content";
import { generateDailyChallenge } from "@/lib/ai";
import { AppShell, SectionTitle } from "@/components/shell";
import { TerminalHeader, TerminalStatusBar, RotatingText } from "@/components/terminal";
import { ScoreCircle, ScoreBar, InfoCard, BadgeCard, MotivationCard } from "@/components/panels";

export default function DashboardPage() {
  const { profile, hydrated } = useProfile();

  const improvement = useMemo(() => {
    if (profile.attempts.length === 0) return 0;
    const avg =
      profile.attempts.reduce((a, b) => a + b.feedback.overall, 0) / profile.attempts.length;
    return Math.round(avg - profile.scores.overall);
  }, [profile.attempts, profile.scores.overall]);

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="terminal-text animate-pulse text-neon">LOADING DASHBOARD…</div>
      </main>
    );
  }

  if (!profile.onboardingComplete) {
    return (
      <AppShell active="dashboard">
        <div className="mx-auto max-w-md rounded-xl border border-neon/20 bg-black/40 p-8 text-center">
          <div className="text-4xl">🛰️</div>
          <h2 className="mt-3 text-xl font-bold text-white">No profile yet</h2>
          <p className="mt-2 text-sm text-mist">
            Complete the onboarding assessment to unlock your communication control center.
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

  const s = profile.scores;
  const earned = new Set(profile.badges);
  const completed = profile.attempts.length;
  const nextChallenge = generateDailyChallenge(profile);

  return (
    <AppShell active="dashboard">
      <SectionTitle sub="Your communication control center.">Progress Dashboard</SectionTitle>

      {/* Top row: power score + mission */}
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="overflow-hidden rounded-xl shadow-glass">
          <TerminalHeader path="C:\ETIHAD\SPEAKING_ROOM\POWER_SCORE" />
          <div className="glass flex flex-col items-center rounded-b-xl border-t-0 p-6">
            <ScoreCircle value={s.overall} label="POWER SCORE" />
            <div className="mt-3 text-lg font-bold text-white">{profile.profileTitle}</div>
            <div className="terminal-text mt-1 text-xs text-mist">
              {improvement >= 0 ? "+" : ""}
              {improvement}% vs. baseline
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl shadow-glass">
          <TerminalHeader path="C:\ETIHAD\SPEAKING_ROOM\MISSION" />
          <div className="glass rounded-b-xl border-t-0 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-neon/20 bg-neon/5 p-4">
                <div className="terminal-text text-[10px] uppercase tracking-widest text-neon">
                  CURRENT_MISSION:
                </div>
                <p className="mt-1 text-sm text-white/90">Improve your opening sentence.</p>
              </div>
              <div className="rounded-xl border border-teal/20 bg-teal/5 p-4">
                <div className="terminal-text text-[10px] uppercase tracking-widest text-teal">
                  NEXT_CHALLENGE:
                </div>
                <p className="mt-1 text-sm text-white/90">{nextChallenge}</p>
              </div>
              <InfoCard
                label="POWER_SKILL_STATUS"
                value={`${profile.selectedPowerSkill || "Public Speaking"}: In Progress`}
                accent
              />
              <InfoCard
                label="STREAK"
                value={`${profile.streak} day${profile.streak === 1 ? "" : "s"} 🔥`}
              />
            </div>
            <div className="mt-4">
              <Link
                href="/practice"
                className="inline-block rounded-xl border border-neon/60 bg-neon/10 px-5 py-2.5 font-semibold text-neon hover:bg-neon/20"
              >
                Continue Practice ›
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Scores breakdown */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="glass rounded-xl p-5">
          <div className="terminal-text mb-3 text-[11px] uppercase tracking-widest text-mist">
            COMMUNICATION SUBSCORES
          </div>
          <div className="space-y-2.5">
            <ScoreBar label="Confidence" value={s.confidence} />
            <ScoreBar label="Storytelling" value={s.storytelling} />
            <ScoreBar label="Listening" value={s.listening} />
            <ScoreBar label="Networking" value={s.networking} />
            <ScoreBar label="Assertiveness" value={s.assertiveness} />
            <ScoreBar label="Clarity" value={s.clarity} />
            <ScoreBar label="Growth Mindset" value={s.growthMindset} />
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="terminal-text mb-3 text-[11px] uppercase tracking-widest text-mist">
            STATS
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InfoCard label="Completed Exercises" value={String(completed)} accent />
            <InfoCard label="Streak" value={`${profile.streak} days`} />
            <InfoCard label="Current Skill" value={profile.selectedPowerSkill || "Public Speaking"} />
            <InfoCard label="Improvement" value={`${improvement >= 0 ? "+" : ""}${improvement}%`} accent />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-neon/15 bg-black/30 p-4">
              <div className="terminal-text text-[10px] uppercase tracking-widest text-mist">STRENGTHS</div>
              <ul className="mt-2 space-y-1 text-sm text-white/85">
                {profile.strengths.slice(0, 2).map((x, i) => (
                  <li key={i}>
                    <span className="text-neon">+</span> {x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-neon/15 bg-black/30 p-4">
              <div className="terminal-text text-[10px] uppercase tracking-widest text-mist">GROWTH AREAS</div>
              <ul className="mt-2 space-y-1 text-sm text-white/85">
                {profile.growthAreas.slice(0, 2).map((x, i) => (
                  <li key={i}>
                    <span className="text-gold">→</span> {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Quote of the day */}
      <div className="mt-4">
        <MotivationCard>
          <div className="terminal-text text-[10px] uppercase tracking-widest text-teal">
            MOTIVATIONAL QUOTE OF THE DAY
          </div>
          <p className="mt-2 text-[15px]">
            <RotatingText items={EMOTIONAL_HOOKS} interval={4000} />
          </p>
        </MotivationCard>
      </div>

      {/* Badges */}
      <div className="mt-4 glass rounded-xl p-5">
        <div className="terminal-text mb-3 flex items-center justify-between text-[11px] uppercase tracking-widest text-mist">
          <span>BADGES</span>
          <span className="text-neon">
            {profile.badges.length} / {ALL_BADGES.length} unlocked
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
          {ALL_BADGES.map((b) => (
            <BadgeCard key={b.name} name={b.name} icon={b.icon} hint={b.hint} earned={earned.has(b.name)} />
          ))}
        </div>
      </div>

      <TerminalStatusBar
        items={["SYS_STATUS: [READY]", "POWER_SKILL_STATUS: [IN_PROGRESS]", "AI_COACH: [ACTIVE]"]}
      />
    </AppShell>
  );
}
