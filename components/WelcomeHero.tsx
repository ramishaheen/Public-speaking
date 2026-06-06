"use client";

import React from "react";
import { TerminalHeader, TerminalStatusBar, RotatingText, Cursor } from "./terminal";
import { TransformationPanel, SkillCard } from "./panels";
import { TRANSFORMATION_HEADLINES } from "@/lib/content";

const HERO_SKILLS = [
  { name: "Public Speaking", icon: "🎤" },
  { name: "Confidence", icon: "🔥" },
  { name: "Storytelling", icon: "📖" },
  { name: "Leadership Communication", icon: "🧭" },
  { name: "Power Skills", icon: "⚡" },
];

export function WelcomeHero({ onStart, hasProgress, onResume }: { onStart: () => void; hasProgress: boolean; onResume: () => void }) {
  return (
    <div className="mx-auto w-full max-w-5xl animate-fadeUp">
      <div className="overflow-hidden rounded-2xl shadow-glass">
        <TerminalHeader path="C:\ETIHAD\SPEAKING_ROOM\" />
        <div className="glass rounded-b-2xl border-t-0 p-6 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
            {/* Left: terminal checklist */}
            <div className="terminal-text rounded-xl border border-neon/20 bg-black/50 p-4 text-sm">
              <div className="mb-3 text-[11px] uppercase tracking-widest text-mist">DIRECTORY</div>
              <ul className="space-y-2 text-neon/90">
                <li>[&gt;] SYSTEM</li>
                <li>[&gt;] USER_NOTES</li>
                <li>[&gt;] SPEAKING_GOALS</li>
                <li>[&gt;] POWER_SKILLS</li>
                <li>[&gt;] TRAINING_PLAN</li>
              </ul>
              <div className="mt-4 border-t border-neon/15 pt-3 text-[11px] text-mist">
                INITIALIZING SPEAKING ROOM<span className="animate-blink">…</span>
              </div>
            </div>

            {/* Center: headline + CTA */}
            <div>
              <div className="terminal-text text-xs uppercase tracking-[3px] text-neon/70">
                Etihad Speaking Room AI Trainer
              </div>
              <h1 className="mt-3 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
                Turn Your Voice <br />
                Into <span className="text-glow text-neon">Influence.</span>
              </h1>

              <div className="terminal-text mt-5 min-h-[28px] text-lg text-teal">
                <span className="text-neon">&gt; </span>
                <RotatingText items={TRANSFORMATION_HEADLINES} />
                <Cursor />
              </div>

              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/85">
                Welcome to Etihad Speaking Room AI Trainer — your personal AI coach for
                communication, confidence, and power skills.
              </p>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
                The way you speak can change how people see you, trust you, follow you, and
                remember you. Let&apos;s discover your communication style and build your speaking
                power step by step.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={onStart}
                  className="rounded-xl border border-neon/60 bg-neon/10 px-7 py-3.5 text-base font-bold text-neon transition-all animate-pulseGlow hover:bg-neon/20"
                >
                  Start My Speaking Journey ›
                </button>
                {hasProgress && (
                  <button
                    onClick={onResume}
                    className="terminal-text rounded-xl border border-steel bg-black/30 px-5 py-3.5 text-sm text-mist transition-colors hover:border-neon/40 hover:text-neon"
                  >
                    Resume session
                  </button>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {HERO_SKILLS.map((s) => (
                  <SkillCard key={s.name} name={s.name} icon={s.icon} />
                ))}
              </div>
            </div>
          </div>

          {/* Transformation panel */}
          <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="rounded-xl border border-neon/15 bg-black/30 p-5">
              <div className="terminal-text text-[11px] uppercase tracking-widest text-mist">
                SPLIT-SCREEN ANALYSIS
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/85">
                Every powerful speaker was once unsure. Our AI lab scans your communication
                behavior and maps the path from <span className="text-mist">nervous</span> to{" "}
                <span className="text-neon">confident presence</span>.
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-mist">
                <li>
                  <span className="text-mist">BEFORE:</span> Nervous Voice →{" "}
                  <span className="text-neon">AFTER:</span> Confident Presence
                </li>
                <li>
                  <span className="text-mist">BEFORE:</span> Scattered Ideas →{" "}
                  <span className="text-neon">AFTER:</span> Clear Message
                </li>
                <li>
                  <span className="text-mist">BEFORE:</span> Avoiding Confrontation →{" "}
                  <span className="text-neon">AFTER:</span> Assertive Communication
                </li>
              </ul>
            </div>
            <TransformationPanel />
          </div>

          <TerminalStatusBar
            items={[
              "SYS_STATUS: [READY]",
              "REQ_TYPE: [AI_COACHING]",
              "PROFILE: [NOT_STARTED]",
              "AI_COACH: [ACTIVE]",
            ]}
          />
        </div>
      </div>
    </div>
  );
}
