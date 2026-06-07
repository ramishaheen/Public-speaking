"use client";

import React, { useEffect, useRef, useState } from "react";
import { useProfile } from "@/lib/store";
import { AppShell, SectionTitle } from "@/components/shell";
import { TerminalHeader, TerminalStatusBar } from "@/components/terminal";
import { PrimaryButton, SecondaryButton } from "@/components/controls";
import {
  startEEG,
  analyzeFocus,
  saveFocusResult,
  loadFocusResult,
  focusInsights,
  EEGHandle,
  EEGStatus,
  EEGMode,
  FocusResult,
} from "@/lib/eeg";

const SESSION_SECONDS = 60;

type Phase = "intro" | "connecting" | "running" | "results";

export default function NeurosciencePage() {
  const { profile, hydrated } = useProfile();
  const [phase, setPhase] = useState<Phase>("intro");
  const [mode, setMode] = useState<EEGMode>("sim");
  const [status, setStatus] = useState<EEGStatus>("idle");
  const [statusDetail, setStatusDetail] = useState("");
  const [attention, setAttention] = useState(0);
  const [meditation, setMeditation] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [result, setResult] = useState<FocusResult | null>(null);
  const [last, setLast] = useState<FocusResult | null>(null);
  const [hasSignal, setHasSignal] = useState(false); // a real, non-zero EEG reading arrived

  const handleRef = useRef<EEGHandle | null>(null);
  const samplesRef = useRef<number[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setLast(loadFocusResult());
    return () => {
      handleRef.current?.stop();
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const beginConnect = (m: EEGMode) => {
    setMode(m);
    setPhase("connecting");
    setStatusDetail("");
    setHasSignal(false);
    samplesRef.current = [];
    handleRef.current?.stop();
    handleRef.current = startEEG(
      m,
      (s) => {
        setAttention(s.attention);
        setMeditation(s.meditation);
        // Only a clean, non-zero attention reading counts as a real signal.
        if (s.attention > 0 && s.poorSignal < 200) setHasSignal(true);
      },
      (st, detail) => {
        setStatus(st);
        if (detail) setStatusDetail(detail);
      },
    );
  };

  const startSession = () => {
    samplesRef.current = [];
    setSecondsLeft(SESSION_SECONDS);
    setPhase("running");
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      // record current attention each second
      samplesRef.current.push(attentionRef.current);
      setSecondsLeft((s) => {
        if (s <= 1) {
          finishSession();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  // keep a ref of latest attention for the interval closure
  const attentionRef = useRef(0);
  useEffect(() => {
    attentionRef.current = attention;
  }, [attention]);

  const finishSession = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    handleRef.current?.stop();
    const r = analyzeFocus(samplesRef.current, SESSION_SECONDS);
    setResult(r);
    // Only persist a real session (don't store an empty "no signal" run).
    if (!r.noData) {
      saveFocusResult(r);
      setLast(r);
    }
    setPhase("results");
  };

  const reset = () => {
    handleRef.current?.stop();
    if (tickRef.current) clearInterval(tickRef.current);
    setPhase("intro");
    setStatus("idle");
    setAttention(0);
    setResult(null);
  };

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="terminal-text animate-pulse text-neon">LOADING NEURO_MODE…</div>
      </main>
    );
  }

  // "ready" = we can actually measure focus. Simulation is ready immediately;
  // a real device is ready only once a clean, non-zero signal arrives.
  const connected = status === "connected" || status === "simulating";
  const ready = mode === "sim" ? status === "simulating" : hasSignal;

  return (
    <AppShell active="neuroscience">
      <SectionTitle sub="A separate EEG-based assessment that measures and trains the focus behind great public speaking.">
        NeuroScience · MindWave Focus Lab
      </SectionTitle>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        {/* Left: console */}
        <div className="overflow-hidden rounded-xl shadow-glass">
          <TerminalHeader path="C:\ETIHAD\SPEAKING_ROOM\NEURO\MINDWAVE" />
          <div className="glass rounded-b-xl border-t-0 p-5">
            {phase === "intro" && (
              <IntroPanel onConnect={beginConnect} last={last} />
            )}

            {phase === "connecting" && (
              <ConnectPanel
                mode={mode}
                status={status}
                detail={statusDetail}
                attention={attention}
                ready={ready}
                connected={connected}
                onStart={startSession}
                onRetry={() => beginConnect(mode)}
                onSwitchSim={() => beginConnect("sim")}
                onBack={reset}
              />
            )}

            {phase === "running" && (
              <RunningPanel secondsLeft={secondsLeft} mode={mode} onStop={finishSession} />
            )}

            {phase === "results" && result && result.noData && (
              <NoDataPanel
                mode={mode}
                onAgain={() => beginConnect(mode)}
                onSwitchSim={() => beginConnect("sim")}
                onHome={reset}
              />
            )}

            {phase === "results" && result && !result.noData && (
              <ResultsPanel result={result} onAgain={() => beginConnect(mode)} onHome={reset} />
            )}

            <TerminalStatusBar
              items={[
                `MODE: [${mode === "sim" ? "SIMULATION" : "MINDWAVE"}]`,
                `SIGNAL: [${ready ? "LOCKED" : status.toUpperCase()}]`,
                `SESSION: [${phase.toUpperCase()}]`,
              ]}
            />
          </div>
        </div>

        {/* Right: live focus gauge */}
        <div className="overflow-hidden rounded-xl shadow-glass">
          <TerminalHeader path="C:\ETIHAD\SPEAKING_ROOM\NEURO\LIVE_FOCUS" />
          <div className="glass flex min-h-[320px] flex-col items-center justify-center rounded-b-xl border-t-0 p-5">
            <FocusGauge
              value={phase === "results" && result && !result.noData ? result.focusScore : attention}
              live={phase === "running"}
              label={
                phase === "results"
                  ? result?.noData
                    ? "NO SIGNAL"
                    : "FOCUS SCORE"
                  : "LIVE FOCUS"
              }
            />
            <div className="mt-4 grid w-full grid-cols-2 gap-2">
              <MiniStat label="Attention" value={attention} />
              <MiniStat label="Calm" value={meditation} />
            </div>
            {phase === "running" && (
              <p className="mt-4 text-center text-xs text-mist">
                Keep speaking your rehearsed opening aloud. Stay present — let your focus drive the meter.
              </p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ---------------- Panels ----------------
function IntroPanel({
  onConnect,
  last,
}: {
  onConnect: (m: EEGMode) => void;
  last: FocusResult | null;
}) {
  return (
    <div className="animate-fadeUp">
      <div className="terminal-text text-[11px] uppercase tracking-widest text-neon">
        NEURO_PROTOCOL: FOCUS_UNDER_PRESSURE
      </div>
      <h3 className="mt-2 text-lg font-bold text-white">Train the focus behind your voice</h3>
      <p className="mt-2 text-sm leading-relaxed text-mist">
        This lab uses an EEG headset (NeuroSky <span className="text-neon">MindWave</span>) to read
        your live attention while you speak. You&apos;ll run a {SESSION_SECONDS}-second focus
        session, then get a focus score, stability, and speaking-specific coaching. No headset?
        Run it in <span className="text-teal">Simulation</span> to see exactly how it works.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Step n={1} t="Connect" d="Pair your MindWave or pick Simulation." />
        <Step n={2} t="Speak & focus" d="Deliver your opening for 60s." />
        <Step n={3} t="Get insights" d="Focus score + how to steady it." />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton onClick={() => onConnect("device")}>Connect MindWave</PrimaryButton>
        <SecondaryButton onClick={() => onConnect("sim")}>Run Simulation</SecondaryButton>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-mist">
        Real device: use <span className="text-neon">Chrome or Edge on desktop</span>. Plug in the
        MindWave USB dongle (or pair a MindWave Mobile so it shows as a serial/COM port), click{" "}
        <span className="text-neon">Connect MindWave</span>, and pick the port. No headset? Use{" "}
        <span className="text-teal">Simulation</span>.
      </p>

      {last && (
        <div className="mt-4 rounded-xl border border-teal/25 bg-teal/5 p-3 text-xs text-mist">
          <span className="terminal-text text-teal">LAST_SESSION:</span> focus {last.focusScore}/100
          · stability {last.stability} · {last.timeInFlowPct}% in flow
        </div>
      )}
    </div>
  );
}

function ConnectPanel({
  mode,
  status,
  detail,
  attention,
  ready,
  connected,
  onStart,
  onRetry,
  onSwitchSim,
  onBack,
}: {
  mode: EEGMode;
  status: EEGStatus;
  detail: string;
  attention: number;
  ready: boolean;
  connected: boolean;
  onStart: () => void;
  onRetry: () => void;
  onSwitchSim: () => void;
  onBack: () => void;
}) {
  const isError = status === "error";
  // Device port opened but no clean brainwave signal yet.
  const waitingForSignal = mode === "device" && connected && !ready && !isError;
  return (
    <div className="animate-fadeUp">
      <div className="terminal-text text-[11px] uppercase tracking-widest text-neon">
        {mode === "sim" ? "SIMULATION_LINK" : "MINDWAVE_LINK"}
      </div>
      <div className="mt-3 space-y-1.5 text-sm">
        <LinkLine
          ok={mode === "sim" ? ready : connected}
          text={mode === "sim" ? "Simulation engine started" : connected ? "Serial port connected" : "Opening serial port…"}
        />
        <LinkLine ok={ready} text={ready ? "Brainwave signal locked" : isError ? "No signal" : "Waiting for a clean signal…"} />
        {ready && <LinkLine ok={attention > 0} text={`Live attention: ${attention}/100`} />}
      </div>

      {isError && (
        <p className="terminal-text mt-3 rounded-lg border border-gold/30 bg-gold/5 p-2.5 text-xs text-gold">
          ! {detail || "Could not connect to a MindWave device."}
        </p>
      )}

      {waitingForSignal && (
        <p className="mt-3 rounded-lg border border-gold/30 bg-gold/5 p-2.5 text-xs text-gold">
          Port connected, but no brainwave data yet. Put the headset on so the{" "}
          <span className="font-semibold">forehead sensor touches your skin</span> and the{" "}
          <span className="font-semibold">ear clip is on your earlobe</span>. The button unlocks once
          a real signal arrives — we won&apos;t fake a result.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton onClick={onStart} disabled={!ready}>
          {ready ? "Start 60s Focus Session" : "Waiting for signal…"}
        </PrimaryButton>
        {(isError || waitingForSignal) && mode === "device" && (
          <>
            <SecondaryButton onClick={onRetry}>Retry device</SecondaryButton>
            <SecondaryButton onClick={onSwitchSim}>Use Simulation</SecondaryButton>
          </>
        )}
        {!isError && !waitingForSignal && <SecondaryButton onClick={onBack}>Back</SecondaryButton>}
      </div>
    </div>
  );
}

function RunningPanel({
  secondsLeft,
  mode,
  onStop,
}: {
  secondsLeft: number;
  mode: EEGMode;
  onStop: () => void;
}) {
  const pct = Math.round(((SESSION_SECONDS - secondsLeft) / SESSION_SECONDS) * 100);
  return (
    <div className="animate-fadeUp">
      <div className="terminal-text text-[11px] uppercase tracking-widest text-neon">
        RECORDING_FOCUS · {mode === "sim" ? "SIM" : "MINDWAVE"}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-4xl font-extrabold text-glow text-white">{secondsLeft}</span>
        <span className="text-sm text-mist">seconds left</span>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full border border-steel bg-black/40">
        <div
          className="h-full bg-neon/70 transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-4 rounded-xl border border-neon/15 bg-black/30 p-4 text-sm text-white/90">
        <div className="terminal-text text-[10px] uppercase tracking-widest text-teal">SPEAK NOW</div>
        <p className="mt-1">
          Deliver your 30-second introduction — then keep going: explain what you do and the value
          you bring. Hold your attention on the message, not the nerves.
        </p>
      </div>
      <div className="mt-5">
        <SecondaryButton onClick={onStop}>Stop & analyze</SecondaryButton>
      </div>
    </div>
  );
}

function NoDataPanel({
  mode,
  onAgain,
  onSwitchSim,
  onHome,
}: {
  mode: EEGMode;
  onAgain: () => void;
  onSwitchSim: () => void;
  onHome: () => void;
}) {
  return (
    <div className="animate-fadeUp">
      <div className="terminal-text text-[11px] uppercase tracking-widest text-gold">
        NO_SIGNAL_CAPTURED
      </div>
      <p className="mt-2 text-sm font-semibold text-white">
        No usable brainwave data was recorded — so there&apos;s no score to show.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-mist">
        The session ran but the headset never sent a clean attention reading (it stayed at 0). A
        focus score from that would be meaningless, so we won&apos;t invent one.
      </p>
      <div className="mt-3 rounded-xl border border-gold/25 bg-gold/5 p-3.5 text-sm text-white/90">
        <div className="terminal-text text-[10px] uppercase tracking-widest text-gold">
          Checklist
        </div>
        <ul className="mt-2 space-y-1.5">
          <li>› Wear it so the <b>forehead sensor sits on bare skin</b> (above the eyebrow).</li>
          <li>› Clip the <b>ear contact onto your earlobe</b> — both contacts are required.</li>
          <li>› Confirm you selected the actual <b>MindWave</b> port, and the headset is powered on.</li>
          <li>› Sit still for a few seconds so it can lock a signal before starting.</li>
        </ul>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton onClick={onAgain}>
          {mode === "sim" ? "Try again" : "Reconnect headset"}
        </PrimaryButton>
        {mode === "device" && <SecondaryButton onClick={onSwitchSim}>Run Simulation</SecondaryButton>}
        <SecondaryButton onClick={onHome}>Back</SecondaryButton>
      </div>
    </div>
  );
}

function ResultsPanel({
  result,
  onAgain,
  onHome,
}: {
  result: FocusResult;
  onAgain: () => void;
  onHome: () => void;
}) {
  const { headline, tips } = focusInsights(result);
  return (
    <div className="animate-fadeUp">
      <div className="terminal-text text-[11px] uppercase tracking-widest text-neon">
        NEURO_FOCUS_REPORT
      </div>
      <p className="mt-2 text-sm font-semibold text-white">{headline}</p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Focus" value={`${result.focusScore}`} accent />
        <Stat label="Stability" value={`${result.stability}`} />
        <Stat label="Peak" value={`${result.peak}`} />
        <Stat label="In flow" value={`${result.timeInFlowPct}%`} />
      </div>

      <Sparkline samples={result.samples} />

      <div className="mt-4 rounded-xl border border-gold/25 bg-gold/5 p-3.5">
        <div className="terminal-text text-[10px] uppercase tracking-widest text-gold">
          Focus coaching for speaking
        </div>
        <ul className="mt-2 space-y-1.5 text-sm text-white/90">
          {tips.map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-gold">›</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton onClick={onAgain}>Run again</PrimaryButton>
        <SecondaryButton onClick={onHome}>Done</SecondaryButton>
      </div>
    </div>
  );
}

// ---------------- Small UI bits ----------------
function FocusGauge({ value, live, label }: { value: number; live: boolean; label: string }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c - (pct / 100) * c;
  const color = pct >= 70 ? "#39FF14" : pct >= 45 ? "#1FB6A8" : "#E6B800";
  return (
    <div className="relative h-48 w-48">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={r} fill="none" stroke="#1b2433" strokeWidth="12" />
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-5xl font-extrabold text-white ${live ? "animate-pulse" : ""}`}>
          {Math.round(pct)}
        </span>
        <span className="terminal-text mt-1 text-[10px] uppercase tracking-widest text-mist">
          {label}
        </span>
      </div>
    </div>
  );
}

function Sparkline({ samples }: { samples: number[] }) {
  if (!samples.length) return null;
  const w = 100;
  const h = 28;
  const step = samples.length > 1 ? w / (samples.length - 1) : w;
  const pts = samples
    .map((s, i) => `${(i * step).toFixed(1)},${(h - (s / 100) * h).toFixed(1)}`)
    .join(" ");
  return (
    <div className="mt-4">
      <div className="terminal-text mb-1 text-[10px] uppercase tracking-widest text-mist">
        Focus timeline
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full rounded-lg border border-steel bg-black/40">
        <polyline points={pts} fill="none" stroke="#39FF14" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-steel bg-black/30 p-2 text-center">
      <div className="terminal-text text-[9px] uppercase tracking-widest text-mist">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-3 text-center ${
        accent ? "border-neon/40 bg-neon/10" : "border-steel bg-black/30"
      }`}
    >
      <div className="terminal-text text-[9px] uppercase tracking-widest text-mist">{label}</div>
      <div className={`text-2xl font-extrabold ${accent ? "text-neon" : "text-white"}`}>{value}</div>
    </div>
  );
}

function Step({ n, t, d }: { n: number; t: string; d: string }) {
  return (
    <div className="rounded-xl border border-neon/15 bg-black/30 p-3">
      <div className="terminal-text flex h-7 w-7 items-center justify-center rounded-lg border border-neon/40 bg-neon/10 text-xs font-bold text-neon">
        {n}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{t}</div>
      <div className="text-xs text-mist">{d}</div>
    </div>
  );
}

function LinkLine({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="terminal-text flex items-center gap-2 text-xs">
      <span className={ok ? "text-neon" : "text-mist"}>{ok ? "✓" : "›"}</span>
      <span className={ok ? "text-white/90" : "text-mist"}>{text}</span>
    </div>
  );
}
