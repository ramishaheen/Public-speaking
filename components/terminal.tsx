"use client";

import React, { useEffect, useState } from "react";

// ---------------- Terminal header ----------------
export function TerminalHeader({ path }: { path: string }) {
  return (
    <div className="select-none rounded-t-xl border border-neon/20 bg-carbon/80">
      <div className="flex items-center justify-between border-b border-neon/15 px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-gold/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-neon/70" />
        </div>
        <div className="terminal-text truncate text-[11px] text-mist">{path}</div>
        <div className="w-12" />
      </div>
      <div className="terminal-text flex gap-4 px-3 py-1 text-[11px] text-neon/70">
        <span>[FILE]</span>
        <span>[EDIT]</span>
        <span>[VIEW]</span>
        <span>[HELP]</span>
      </div>
    </div>
  );
}

// ---------------- Status bar ----------------
export function TerminalStatusBar({ items }: { items: string[] }) {
  return (
    <div className="terminal-text mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-neon/15 bg-black/40 px-3 py-2 text-[10px] uppercase tracking-wide text-mist">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-neon/30">|</span>}
          <span dangerouslySetInnerHTML={{ __html: highlightBrackets(it) }} />
        </React.Fragment>
      ))}
    </div>
  );
}

function highlightBrackets(s: string): string {
  return s.replace(/\[([^\]]+)\]/g, '<span class="text-neon">[$1]</span>');
}

// ---------------- Terminal window wrapper ----------------
export function TerminalWindow({
  path,
  children,
  className = "",
}: {
  path: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl shadow-glass ${className}`}>
      <TerminalHeader path={path} />
      <div className="glass rounded-b-xl border-t-0 p-5 sm:p-7">{children}</div>
    </div>
  );
}

// ---------------- Progress bar (terminal blocks) ----------------
export function ProgressBar({ percent, label }: { percent: number; label?: string }) {
  const blocks = 16;
  const filled = Math.round((percent / 100) * blocks);
  return (
    <div className="terminal-text text-[11px] text-neon">
      <div className="flex items-center justify-between text-mist">
        <span>{label || "PROFILE_BUILD"}</span>
        <span className="text-neon">{percent}%</span>
      </div>
      <div className="mt-1 tracking-[2px]">
        <span className="text-neon">{"█".repeat(filled)}</span>
        <span className="text-steel">{"░".repeat(Math.max(0, blocks - filled))}</span>
      </div>
    </div>
  );
}

// ---------------- Blinking cursor ----------------
export function Cursor() {
  return <span className="animate-blink text-neon">▋</span>;
}

// ---------------- Typewriter ----------------
export function Typewriter({
  text,
  speed = 18,
  className = "",
  showCursor = true,
}: {
  text: string;
  speed?: number;
  className?: string;
  showCursor?: boolean;
}) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return (
    <span className={className}>
      {shown}
      {showCursor && shown.length < text.length && <Cursor />}
    </span>
  );
}

// ---------------- Rotating text ----------------
export function RotatingText({
  items,
  interval = 2600,
  className = "",
}: {
  items: string[];
  interval?: number;
  className?: string;
}) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % items.length), interval);
    return () => clearInterval(id);
  }, [items.length, interval]);
  return (
    <span key={idx} className={`animate-fadeUp ${className}`}>
      {items[idx]}
    </span>
  );
}
