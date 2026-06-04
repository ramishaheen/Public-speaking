"use client";

import React, { useEffect, useRef, useState } from "react";
import { ProgressBar } from "./terminal";

const COMMAND_LINES = [
  "opening USER_PROFILE...",
  "reading SPEAKING_GOALS...",
  "scanning confidence patterns...",
  "analyzing storytelling behavior...",
  "detecting growth barriers...",
  "calculating communication power score...",
  "matching role model inspiration...",
  "generating personalized speaking plan...",
  "training path ready.",
];

const ROTATING = [
  "Analyzing your speaking goals…",
  "Identifying your communication strengths…",
  "Detecting your growth areas…",
  "Building your personal power skills roadmap…",
  "Preparing your AI training plan…",
  "Matching your learning style…",
  "Creating your practice challenges…",
];

export function TerminalLoadingAnalysis({ onDone }: { onDone: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const [percent, setPercent] = useState(0);
  const [rotIdx, setRotIdx] = useState(0);
  const [done, setDone] = useState(false);
  const doneCalled = useRef(false);

  useEffect(() => {
    let i = 0;
    const lineTimer = setInterval(() => {
      if (i < COMMAND_LINES.length) {
        setLines((prev) => [...prev, COMMAND_LINES[i]]);
        i++;
      } else {
        clearInterval(lineTimer);
        setDone(true);
      }
    }, 520);

    const pctTimer = setInterval(() => {
      setPercent((p) => {
        const next = p + Math.random() * 7 + 2;
        return next >= 100 ? 100 : Math.round(next);
      });
    }, 240);

    const rotTimer = setInterval(() => setRotIdx((r) => (r + 1) % ROTATING.length), 1400);

    return () => {
      clearInterval(lineTimer);
      clearInterval(pctTimer);
      clearInterval(rotTimer);
    };
  }, []);

  useEffect(() => {
    if (done && percent >= 100 && !doneCalled.current) {
      doneCalled.current = true;
    }
  }, [done, percent]);

  const ready = done && percent >= 100;

  return (
    <div className="space-y-5">
      <div className="terminal-text min-h-[220px] rounded-xl border border-neon/20 bg-black/60 p-4 text-sm">
        {lines.map((l, idx) => (
          <div key={idx} className="animate-fadeUp text-neon/90">
            <span className="text-neon">&gt;</span> {l}
          </div>
        ))}
        {!ready && (
          <div className="text-neon">
            <span className="text-neon">&gt;</span> <span className="animate-blink">▋</span>
          </div>
        )}
        {ready && (
          <div className="mt-3 text-glow text-base font-bold text-neon">COMMUNICATION PROFILE READY.</div>
        )}
      </div>

      <ProgressBar percent={percent} label="AI_ANALYSIS" />

      <div className="min-h-[24px] text-center text-sm text-mist">
        {!ready ? (
          <span key={rotIdx} className="animate-fadeUp">
            {ROTATING[rotIdx]}
          </span>
        ) : (
          <span className="text-neon">All systems ready.</span>
        )}
      </div>

      {ready && (
        <button
          onClick={onDone}
          className="w-full animate-fadeUp rounded-xl border border-neon/60 bg-neon/10 px-6 py-3 font-semibold text-neon transition-all hover:bg-neon/20 hover:shadow-neon"
        >
          View My Growth Areas ›
        </button>
      )}
    </div>
  );
}
