"use client";

import React from "react";
import { TerminalHeader, TerminalStatusBar, ProgressBar, Typewriter } from "./terminal";
import { NavigationButtons, ValidationNote } from "./controls";

export function QuestionScreen({
  path,
  step,
  totalSteps,
  question,
  supportive,
  statusItems,
  children,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  hideBack,
  validation = "",
  progressLabel = "PROFILE_BUILD",
}: {
  path: string;
  step: number;
  totalSteps: number;
  question: string;
  supportive?: string;
  statusItems: string[];
  children?: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hideBack?: boolean;
  validation?: string;
  progressLabel?: string;
}) {
  const percent = Math.round((step / totalSteps) * 100);
  return (
    <div className="mx-auto w-full max-w-2xl animate-fadeUp">
      <div className="overflow-hidden rounded-xl shadow-glass">
        <TerminalHeader path={path} />
        <div className="glass rounded-b-xl border-t-0 p-5 sm:p-7">
          <div className="mb-4 flex items-center justify-between">
            <span className="terminal-text text-[11px] uppercase tracking-widest text-mist">
              STEP {step} / {totalSteps}
            </span>
            <span className="terminal-text text-[11px] text-neon">SYS_STATUS: [QUESTION_READY]</span>
          </div>
          <ProgressBar percent={percent} label={progressLabel} />

          <h1 className="mt-5 text-xl font-bold leading-snug text-white sm:text-[26px]">
            <span className="terminal-text mr-2 text-neon">&gt;</span>
            <Typewriter text={question} />
          </h1>
          {supportive && <p className="mt-2 text-sm leading-relaxed text-mist">{supportive}</p>}

          <div className="mt-5">{children}</div>

          <ValidationNote message={validation} />

          <NavigationButtons
            onBack={onBack}
            onNext={onNext}
            nextLabel={nextLabel}
            nextDisabled={nextDisabled}
            hideBack={hideBack}
          />

          <TerminalStatusBar items={statusItems} />
        </div>
      </div>
    </div>
  );
}
