"use client";

import React, { useMemo } from "react";
import { useProfile } from "@/lib/store";
import { AppShell, SectionTitle } from "@/components/shell";
import { TerminalHeader, TerminalStatusBar } from "@/components/terminal";
import { ScoreBar } from "@/components/panels";

// Mock cohort data (no real sensitive data in the prototype).
const MOCK = {
  users: 1284,
  avgScore: 64,
  completionRate: 71,
  practiceSessions: 5390,
  topSkills: [
    { name: "Public Speaking", value: 42 },
    { name: "Confidence Building", value: 38 },
    { name: "Presentation Skills", value: 33 },
    { name: "Storytelling", value: 27 },
    { name: "Assertive Communication", value: 21 },
    { name: "Networking Communication", value: 18 },
  ],
  hardestSkills: [
    { name: "Negotiation", value: 58 },
    { name: "Conflict Resolution", value: 54 },
    { name: "Confidence under pressure", value: 49 },
    { name: "Humor & Wit", value: 44 },
  ],
  learnerTypes: [
    { name: "Low Confidence Learner", value: 31 },
    { name: "Busy Learner", value: 24 },
    { name: "Fear of Judgment Learner", value: 17 },
    { name: "Practical Learner", value: 15 },
    { name: "Reflective Learner", value: 13 },
  ],
};

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="terminal-text text-[10px] uppercase tracking-widest text-mist">{label}</div>
      <div className="mt-1 text-3xl font-extrabold text-glow text-white">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-neon">{sub}</div>}
    </div>
  );
}

function BarList({ title, items, suffix = "%" }: { title: string; items: { name: string; value: number }[]; suffix?: string }) {
  const max = Math.max(...items.map((i) => i.value));
  return (
    <div className="glass rounded-xl p-5">
      <div className="terminal-text mb-3 text-[11px] uppercase tracking-widest text-mist">{title}</div>
      <div className="space-y-2.5">
        {items.map((it) => (
          <div key={it.name}>
            <div className="flex justify-between text-xs text-mist">
              <span>{it.name}</span>
              <span className="text-neon">
                {it.value}
                {suffix}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-neonDim to-neon"
                style={{ width: `${(it.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { profile, hydrated } = useProfile();

  // Blend the live local user into the cohort so the admin view reflects this session.
  const stats = useMemo(() => {
    const liveUsers = profile.onboardingComplete ? 1 : 0;
    return {
      users: MOCK.users + liveUsers,
      avgScore: profile.onboardingComplete
        ? Math.round((MOCK.avgScore * MOCK.users + profile.scores.overall) / (MOCK.users + 1))
        : MOCK.avgScore,
      sessions: MOCK.practiceSessions + profile.attempts.length,
    };
  }, [profile]);

  const exportEmails = () => {
    const rows = [["email", "profile_title", "score", "skill"]];
    if (profile.email) {
      rows.push([
        profile.email,
        profile.profileTitle || "—",
        String(profile.scores.overall),
        profile.selectedPowerSkill || "—",
      ]);
    }
    // Placeholder export — production would pull from the backend.
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "etihad_email_list.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="terminal-text animate-pulse text-neon">LOADING ADMIN…</div>
      </main>
    );
  }

  return (
    <AppShell active="admin">
      <SectionTitle sub="Cohort analytics (mock data for the prototype).">Admin Dashboard</SectionTitle>

      <div className="overflow-hidden rounded-xl shadow-glass">
        <TerminalHeader path="C:\ETIHAD\SPEAKING_ROOM\ADMIN\OVERVIEW" />
        <div className="glass rounded-b-xl border-t-0 p-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Total Users" value={stats.users.toLocaleString()} sub="+ live session" />
            <MetricCard label="Avg. Communication Score" value={`${stats.avgScore}%`} />
            <MetricCard label="Avg. Completion Rate" value={`${MOCK.completionRate}%`} />
            <MetricCard label="Practice Sessions" value={stats.sessions.toLocaleString()} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <BarList title="Most Selected Skills" items={MOCK.topSkills} />
        <BarList title="Most Difficult Skills (avg. score)" items={MOCK.hardestSkills} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <BarList title="Top Learner Challenge Types" items={MOCK.learnerTypes} />
        <div className="glass rounded-xl p-5">
          <div className="terminal-text mb-3 text-[11px] uppercase tracking-widest text-mist">
            USER PROGRESS SUMMARY
          </div>
          <div className="space-y-2.5">
            <ScoreBar label="Onboarding completion" value={MOCK.completionRate} />
            <ScoreBar label="Reached Day 7" value={48} />
            <ScoreBar label="Submitted AI feedback" value={61} />
            <ScoreBar label="Earned a badge" value={73} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={exportEmails}
              className="terminal-text rounded-lg border border-neon/40 bg-neon/10 px-4 py-2 text-xs text-neon hover:bg-neon/20"
            >
              ⬇ Export Email List (placeholder)
            </button>
            <button
              onClick={() => window.print()}
              className="terminal-text rounded-lg border border-steel bg-black/30 px-4 py-2 text-xs text-mist hover:border-neon/40 hover:text-neon"
            >
              ⬇ Export Report (placeholder)
            </button>
          </div>
          <p className="mt-3 text-[11px] text-mist">
            Export functions are wired as placeholders. In production they would pull from a secured
            backend rather than local session data.
          </p>
        </div>
      </div>

      <TerminalStatusBar items={["SYS_STATUS: [READY]", "MODULE: [ADMIN]", "DATA: [MOCK]"]} />
    </AppShell>
  );
}
