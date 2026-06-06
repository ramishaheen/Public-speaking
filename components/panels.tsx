"use client";

import React from "react";

// ---------------- Transformation panel (before / after) ----------------
const BEFORE_AFTER: { before: string; after: string }[] = [
  { before: "Nervous Voice", after: "Confident Presence" },
  { before: "Scattered Ideas", after: "Clear Message" },
  { before: "Avoiding Confrontation", after: "Assertive Communication" },
  { before: "Avoiding Eye Contact", after: "Calm, Steady Gaze" },
  { before: "Fear of Judgment", after: "Strong Opening" },
];

function SpeakerAvatar({ confident }: { confident: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" aria-hidden>
      <defs>
        <linearGradient id={confident ? "after-g" : "before-g"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={confident ? "#39ff88" : "#3a4654"} />
          <stop offset="100%" stopColor={confident ? "#1faf5e" : "#1a2430"} />
        </linearGradient>
      </defs>
      <circle cx="32" cy="22" r="11" fill={`url(#${confident ? "after-g" : "before-g"})`} opacity={confident ? 0.95 : 0.6} />
      <path
        d="M14 54c0-10 8-16 18-16s18 6 18 16"
        fill="none"
        stroke={confident ? "#39ff88" : "#3a4654"}
        strokeWidth="3"
        strokeLinecap="round"
        opacity={confident ? 0.95 : 0.6}
      />
      {confident && (
        <g stroke="#34e0d6" strokeWidth="1.5" opacity="0.7">
          <line x1="50" y1="14" x2="56" y2="11" />
          <line x1="51" y1="22" x2="58" y2="22" />
          <line x1="50" y1="30" x2="56" y2="33" />
        </g>
      )}
    </svg>
  );
}

function Meter({ label, value, tone }: { label: string; value: number; tone: "low" | "high" }) {
  return (
    <div>
      <div className="flex justify-between text-[9px] uppercase tracking-wide text-mist">
        <span>{label}</span>
        <span className={tone === "high" ? "text-neon" : "text-mist"}>{value}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/50">
        <div
          className={tone === "high" ? "h-full rounded-full bg-neon" : "h-full rounded-full bg-steel"}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function TransformationPanel({ compact }: { compact?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-neon/20 bg-black/40">
      {/* scanning line */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
        <div className="absolute inset-x-0 h-16 animate-scan bg-gradient-to-b from-transparent via-neon/10 to-transparent" />
      </div>
      <div className="grid grid-cols-2">
        <div className="border-r border-neon/15 p-4">
          <div className="terminal-text text-[10px] uppercase tracking-widest text-mist">BEFORE</div>
          <div className="mt-3 flex flex-col items-center gap-2">
            <SpeakerAvatar confident={false} />
            <div className="space-y-2 self-stretch pt-2">
              <Meter label="Confidence" value={28} tone="low" />
              <Meter label="Clarity" value={34} tone="low" />
              {!compact && <Meter label="Eye Contact" value={22} tone="low" />}
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="terminal-text text-[10px] uppercase tracking-widest text-neon">AFTER</div>
          <div className="mt-3 flex flex-col items-center gap-2">
            <SpeakerAvatar confident />
            <div className="space-y-2 self-stretch pt-2">
              <Meter label="Confidence" value={88} tone="high" />
              <Meter label="Clarity" value={84} tone="high" />
              {!compact && <Meter label="Eye Contact" value={91} tone="high" />}
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 border-t border-neon/15 text-center">
        <div className="border-r border-neon/15 px-2 py-2 text-[11px] text-mist">
          {BEFORE_AFTER[0].before}
        </div>
        <div className="px-2 py-2 text-[11px] text-neon">{BEFORE_AFTER[0].after}</div>
      </div>
    </div>
  );
}

// ---------------- Score circle ----------------
export function ScoreCircle({
  value,
  label,
  size = 140,
}: {
  value: number;
  label?: string;
  size?: number;
}) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1a2430" strokeWidth="8" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#39ff88"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s ease", filter: "drop-shadow(0 0 6px rgba(57,255,136,0.5))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-glow text-white">{value}%</span>
        {label && <span className="terminal-text text-[10px] uppercase tracking-wide text-mist">{label}</span>}
      </div>
    </div>
  );
}

// ---------------- Horizontal score bar ----------------
export function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-mist">
        <span>{label}</span>
        <span className="text-neon">{value}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-neonDim to-neon"
          style={{ width: `${value}%`, transition: "width 1s ease" }}
        />
      </div>
    </div>
  );
}

// ---------------- Skill card ----------------
export function SkillCard({ name, icon }: { name: string; icon?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-neon/15 bg-black/30 px-3 py-2.5 transition-colors hover:border-neon/40">
      {icon && <span className="text-lg">{icon}</span>}
      <span className="text-sm font-medium text-white/90">{name}</span>
    </div>
  );
}

// ---------------- Generic info card ----------------
export function InfoCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-neon/15 bg-black/30 p-4">
      <div className="terminal-text text-[10px] uppercase tracking-widest text-mist">{label}</div>
      <div className={`mt-1.5 text-sm font-medium ${accent ? "text-neon" : "text-white/90"}`}>{value}</div>
    </div>
  );
}

// ---------------- Motivation card ----------------
export function MotivationCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-teal/30 bg-teal/5 p-5 text-[15px] leading-relaxed text-white/90">
      {children}
    </div>
  );
}

// ---------------- Badge card ----------------
export function BadgeCard({
  name,
  icon,
  hint,
  earned,
}: {
  name: string;
  icon: string;
  hint: string;
  earned: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-xl border p-3 text-center transition-all ${
        earned
          ? "border-neon/50 bg-neon/10 shadow-neonSoft"
          : "border-steel bg-black/30 opacity-50 grayscale"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="mt-1 text-xs font-semibold text-white/90">{name}</span>
      <span className="mt-0.5 text-[10px] leading-tight text-mist">{earned ? "Unlocked" : hint}</span>
    </div>
  );
}
