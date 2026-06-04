"use client";

import React from "react";

// ---------------- Primary / secondary buttons ----------------
export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
  full,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  full?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`group relative inline-flex items-center justify-center gap-2 rounded-xl border border-neon/60 bg-neon/10 px-6 py-3 font-semibold text-neon transition-all hover:bg-neon/20 hover:shadow-neon disabled:cursor-not-allowed disabled:border-steel disabled:bg-steel/30 disabled:text-mist disabled:shadow-none ${
        full ? "w-full" : ""
      }`}
    >
      {children}
      <span className="transition-transform group-hover:translate-x-0.5">›</span>
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="terminal-text inline-flex items-center gap-2 rounded-xl border border-steel bg-black/30 px-4 py-3 text-sm text-mist transition-colors hover:border-neon/40 hover:text-neon"
    >
      ‹ {children}
    </button>
  );
}

export function NavigationButtons({
  onBack,
  onNext,
  nextLabel = "Continue",
  backLabel = "Previous Command",
  nextDisabled,
  hideBack,
  fullNext,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  hideBack?: boolean;
  fullNext?: boolean;
}) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      {!hideBack ? <SecondaryButton onClick={onBack}>{backLabel}</SecondaryButton> : <span />}
      <PrimaryButton onClick={onNext} disabled={nextDisabled} full={fullNext}>
        {nextLabel}
      </PrimaryButton>
    </div>
  );
}

// ---------------- Option button (terminal command style) ----------------
export function OptionButton({
  label,
  selected,
  onClick,
  multi,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
        selected
          ? "border-neon bg-neon/10 text-neon shadow-neonSoft"
          : "border-steel bg-black/30 text-mist hover:border-neon/40 hover:text-white"
      }`}
    >
      <span
        className={`terminal-text text-xs ${selected ? "text-neon" : "text-mist group-hover:text-neon/70"}`}
      >
        {multi ? (selected ? "[x]" : "[ ]") : selected ? "[›]" : "[ ]"}
      </span>
      <span className="text-sm font-medium leading-snug sm:text-[15px]">{label}</span>
    </button>
  );
}

// ---------------- Multi/single select grid ----------------
export function SelectGrid({
  options,
  values,
  onChange,
  multi,
  columns = 1,
}: {
  options: string[];
  values: string[];
  onChange: (next: string[]) => void;
  multi?: boolean;
  columns?: 1 | 2;
}) {
  const toggle = (opt: string) => {
    if (multi) {
      onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);
    } else {
      onChange([opt]);
    }
  };
  return (
    <div className={`grid gap-2.5 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {options.map((opt) => (
        <OptionButton
          key={opt}
          label={opt}
          multi={multi}
          selected={values.includes(opt)}
          onClick={() => toggle(opt)}
        />
      ))}
    </div>
  );
}

// ---------------- Assessment slider (1..5) ----------------
export function AssessmentSlider({
  value,
  onChange,
  labels,
}: {
  value: number;
  onChange: (v: number) => void;
  labels: string[];
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex h-11 flex-1 items-center justify-center rounded-lg border text-sm font-semibold transition-all ${
              value === n
                ? "border-neon bg-neon/15 text-neon shadow-neonSoft"
                : "border-steel bg-black/30 text-mist hover:border-neon/40"
            }`}
            aria-label={`${n} - ${labels[n - 1]}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide text-mist">
        <span>1 · {labels[0]}</span>
        <span className="text-neon">{value ? labels[value - 1] : "—"}</span>
        <span>5 · {labels[4]}</span>
      </div>
    </div>
  );
}

// ---------------- Text inputs ----------------
export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-steel bg-black/40 px-4 py-3 text-white placeholder:text-mist/60 outline-none transition-colors focus:border-neon/60 focus:shadow-neonSoft"
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 5,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-none rounded-xl border border-steel bg-black/40 px-4 py-3 text-white placeholder:text-mist/60 outline-none transition-colors focus:border-neon/60 focus:shadow-neonSoft"
    />
  );
}

// ---------------- Validation note ----------------
export function ValidationNote({ message }: { message: string }) {
  if (!message) return null;
  return <p className="terminal-text mt-3 text-xs text-gold">! {message}</p>;
}
