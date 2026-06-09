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
  BandPowers,
  BAND_MEANING,
} from "@/lib/eeg";
import {
  eegStability,
  buildTimeline,
  computeBaseline,
  saveBaseline,
  loadBaseline,
  EEGBaseline,
  EEGStability,
  TimelineSegment,
} from "@/lib/eeg-analysis";

const SESSION_SECONDS = 60;
const BASELINE_SECONDS = 60;
const SEGMENT_LABELS = ["Opening", "Build-up", "Core", "Closing"];

type Phase = "intro" | "connecting" | "running" | "results" | "calibrating";

interface EEGAnalysis {
  stability: EEGStability;
  timeline: TimelineSegment[];
}

export default function NeurosciencePage() {
  const { profile, hydrated } = useProfile();
  const [phase, setPhase] = useState<Phase>("intro");
  const [mode, setMode] = useState<EEGMode>("device");
  const [status, setStatus] = useState<EEGStatus>("idle");
  const [statusDetail, setStatusDetail] = useState("");
  const [attention, setAttention] = useState(0);
  const [meditation, setMeditation] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [result, setResult] = useState<FocusResult | null>(null);
  const [last, setLast] = useState<FocusResult | null>(null);
  const [hasSignal, setHasSignal] = useState(false); // a real, non-zero EEG reading arrived
  const [bands, setBands] = useState<BandPowers | null>(null);
  const [poorSignal, setPoorSignal] = useState(200); // 0 = perfect contact, 200 = none
  const [baseline, setBaseline] = useState<EEGBaseline | null>(null);
  const [analysis, setAnalysis] = useState<EEGAnalysis | null>(null);
  const [calibLeft, setCalibLeft] = useState(BASELINE_SECONDS);
  const [validCount, setValidCount] = useState(0);

  const handleRef = useRef<EEGHandle | null>(null);
  const samplesRef = useRef<number[]>([]);
  const medSamplesRef = useRef<number[]>([]);
  const poorRef = useRef(200);
  const validRef = useRef(0);
  const totalRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Webcam preview (see yourself present while focus is measured).
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState("");
  const camStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCamera = async () => {
    setCamError("");
    if (camStreamRef.current) {
      setCamOn(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      camStreamRef.current = stream;
      setCamOn(true);
    } catch {
      setCamError("Camera blocked — allow camera access to see yourself present (optional).");
      setCamOn(false);
    }
  };

  const stopCamera = () => {
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    camStreamRef.current = null;
    setCamOn(false);
  };

  // Bind the camera stream to the <video> element whenever it mounts.
  useEffect(() => {
    if (videoRef.current && camStreamRef.current) {
      videoRef.current.srcObject = camStreamRef.current;
    }
  }, [camOn, phase]);

  useEffect(() => {
    setLast(loadFocusResult());
    setBaseline(loadBaseline());
    return () => {
      handleRef.current?.stop();
      if (tickRef.current) clearInterval(tickRef.current);
      camStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // keep latest meditation + poor signal for the sampling interval
  const medRef = useRef(0);
  useEffect(() => {
    medRef.current = meditation;
  }, [meditation]);
  useEffect(() => {
    poorRef.current = poorSignal;
  }, [poorSignal]);

  const beginConnect = (m: EEGMode) => {
    setMode(m);
    setPhase("connecting");
    setStatusDetail("");
    setHasSignal(false);
    setBands(null);
    setPoorSignal(200);
    samplesRef.current = [];
    startCamera(); // show webcam preview during connect + session
    handleRef.current?.stop();
    handleRef.current = startEEG(
      m,
      (s) => {
        setAttention(s.attention);
        setMeditation(s.meditation);
        setPoorSignal(s.poorSignal);
        if (s.bands) setBands(s.bands);
        // A real signal needs a non-zero reading AND decent electrode contact.
        if (s.attention > 0 && s.poorSignal < 50) setHasSignal(true);
      },
      (st, detail) => {
        setStatus(st);
        if (detail) setStatusDetail(detail);
      },
    );
  };

  const startSession = () => {
    samplesRef.current = [];
    medSamplesRef.current = [];
    validRef.current = 0;
    totalRef.current = 0;
    setSecondsLeft(SESSION_SECONDS);
    setPhase("running");
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      samplesRef.current.push(attentionRef.current);
      medSamplesRef.current.push(medRef.current);
      totalRef.current += 1;
      if (attentionRef.current > 0 && poorRef.current < 50) validRef.current += 1;
      setSecondsLeft((s) => {
        if (s <= 1) {
          finishSession();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  // ---- baseline calibration (resting) ----
  const startCalibration = () => {
    samplesRef.current = [];
    medSamplesRef.current = [];
    setCalibLeft(BASELINE_SECONDS);
    setPhase("calibrating");
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      samplesRef.current.push(attentionRef.current);
      medSamplesRef.current.push(medRef.current);
      setCalibLeft((s) => {
        if (s <= 1) {
          finishCalibration();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const finishCalibration = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    const b = computeBaseline(samplesRef.current, medSamplesRef.current);
    if (b.n >= 10) {
      saveBaseline(b);
      setBaseline(b);
    }
    samplesRef.current = [];
    medSamplesRef.current = [];
    setPhase("connecting"); // back to ready state, headset still streaming
  };

  // keep a ref of latest attention for the interval closure
  const attentionRef = useRef(0);
  useEffect(() => {
    attentionRef.current = attention;
  }, [attention]);

  const finishSession = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    handleRef.current?.stop();
    stopCamera();
    const r = analyzeFocus(samplesRef.current, SESSION_SECONDS);
    setResult(r);
    // Only persist a real session (don't store an empty "no signal" run).
    if (!r.noData) {
      saveFocusResult(r);
      setLast(r);
      // Deeper analysis: stability (vs baseline) + segmented timeline.
      const validRatio = totalRef.current ? validRef.current / totalRef.current : 0;
      const stability = eegStability(
        samplesRef.current,
        medSamplesRef.current,
        validRatio,
        baseline,
      );
      const timeline = buildTimeline(samplesRef.current.filter((s) => s > 0), SEGMENT_LABELS);
      setAnalysis({ stability, timeline });
    } else {
      setAnalysis(null);
    }
    setPhase("results");
  };

  const reset = () => {
    handleRef.current?.stop();
    if (tickRef.current) clearInterval(tickRef.current);
    stopCamera();
    setPhase("intro");
    setStatus("idle");
    setAttention(0);
    setResult(null);
    setAnalysis(null);
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
                baseline={baseline}
                onStart={startSession}
                onCalibrate={startCalibration}
                onRetry={() => beginConnect(mode)}
                onSwitchSim={() => beginConnect("sim")}
                onBack={reset}
              />
            )}

            {phase === "calibrating" && (
              <CalibratePanel secondsLeft={calibLeft} onStop={finishCalibration} />
            )}

            {phase === "running" && (
              <RunningPanel secondsLeft={secondsLeft} mode={mode} onStop={finishSession} />
            )}

            {(phase === "connecting" || phase === "running" || phase === "calibrating") && (
              <BrainwavesPanel bands={bands} />
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

            {phase === "results" && result && !result.noData && analysis && (
              <EEGAnalysisPanel analysis={analysis} baseline={baseline} />
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
            {(phase === "connecting" || phase === "running" || phase === "calibrating") && (
              <CameraView videoRef={videoRef} on={camOn} error={camError} live={phase === "running"} />
            )}
            <FocusGauge
              value={phase === "results" && result && !result.noData ? result.focusScore : attention}
              live={phase === "running" || phase === "calibrating"}
              label={
                phase === "results"
                  ? result?.noData
                    ? "NO SIGNAL"
                    : "FOCUS SCORE"
                  : phase === "calibrating"
                    ? "CALIBRATING"
                    : "LIVE FOCUS"
              }
            />
            <div className="mt-4 grid w-full grid-cols-2 gap-2">
              <MiniStat label="Attention" value={attention} />
              <MiniStat label="Calm" value={meditation} />
            </div>
            {mode === "device" &&
              (phase === "connecting" || phase === "running" || phase === "calibrating") && (
                <SignalQuality poor={poorSignal} />
              )}
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
        session, then get a focus score, stability, and speaking-specific coaching.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Step n={1} t="Connect" d="Power on and pair your MindWave headset." />
        <Step n={2} t="Speak on camera" d="Present for 60s while it reads focus." />
        <Step n={3} t="Get insights" d="Focus score + how to steady it." />
      </div>
      <p className="mt-3 text-[11px] text-mist">
        📷 Your <span className="text-teal">webcam</span> turns on so you can watch yourself present
        (the video stays on your device — nothing is uploaded). Allow camera access when prompted.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton onClick={() => onConnect("device")}>Connect MindWave</PrimaryButton>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-mist">
        Use <span className="text-neon">Chrome or Edge on desktop</span>. Power on the MindWave so it
        pairs as a serial/COM port, click <span className="text-neon">Connect MindWave</span>, and
        select your headset&apos;s port (on Windows this is the MindWave&apos;s outgoing COM port).
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
  baseline,
  onStart,
  onCalibrate,
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
  baseline: EEGBaseline | null;
  onStart: () => void;
  onCalibrate: () => void;
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

      {ready && (
        <div className="mt-3 rounded-lg border border-teal/25 bg-teal/5 p-2.5 text-[11px] text-mist">
          {baseline ? (
            <>
              <span className="terminal-text text-teal">BASELINE_SET:</span> resting attention{" "}
              {baseline.meanAttention} (±{baseline.sdAttention}). Your session is scored against your
              own baseline.
            </>
          ) : (
            <>
              <span className="terminal-text text-gold">RECOMMENDED:</span> calibrate a 60s resting
              baseline first — it makes scoring personal (you vs you), not a universal norm.
            </>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <PrimaryButton onClick={onStart} disabled={!ready}>
          {ready ? "Start 60s Focus Session" : "Waiting for signal…"}
        </PrimaryButton>
        {ready && (
          <SecondaryButton onClick={onCalibrate}>
            {baseline ? "Re-calibrate baseline" : "Calibrate baseline (60s rest)"}
          </SecondaryButton>
        )}
        {(isError || waitingForSignal) && (
          <SecondaryButton onClick={onRetry}>Retry device</SecondaryButton>
        )}
        {!isError && !waitingForSignal && !ready && (
          <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        )}
      </div>
    </div>
  );
}

function CalibratePanel({ secondsLeft, onStop }: { secondsLeft: number; onStop: () => void }) {
  const pct = Math.round(((BASELINE_SECONDS - secondsLeft) / BASELINE_SECONDS) * 100);
  return (
    <div className="animate-fadeUp">
      <div className="terminal-text text-[11px] uppercase tracking-widest text-teal">
        CALIBRATING_RESTING_BASELINE
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-4xl font-extrabold text-glow text-white">{secondsLeft}</span>
        <span className="text-sm text-mist">seconds — sit still & relax</span>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full border border-steel bg-black/40">
        <div className="h-full bg-teal/70 transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-4 rounded-xl border border-teal/20 bg-teal/5 p-3 text-sm text-white/90">
        Relax with your eyes open, breathing normally — don&apos;t talk. We&apos;re recording your
        calm resting state so we can measure how your focus changes when you speak.
      </p>
      <div className="mt-5">
        <SecondaryButton onClick={onStop}>Finish early</SecondaryButton>
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
        <PrimaryButton onClick={onAgain}>Reconnect headset</PrimaryButton>
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
function EEGAnalysisPanel({
  analysis,
  baseline,
}: {
  analysis: EEGAnalysis;
  baseline: EEGBaseline | null;
}) {
  const s = analysis.stability;
  const confColor =
    s.confidence === "high" ? "text-neon" : s.confidence === "medium" ? "text-gold" : "text-mist";
  return (
    <div className="mt-4 animate-fadeUp">
      <div className="flex items-center justify-between">
        <div className="terminal-text text-[11px] uppercase tracking-widest text-neon">
          EEG COGNITIVE-STATE ANALYSIS
        </div>
        <span className={`terminal-text text-[10px] ${confColor}`}>confidence: {s.confidence}</span>
      </div>

      <div className="mt-2 flex items-end gap-2">
        <span className="text-3xl font-extrabold text-white">{s.score}</span>
        <span className="mb-1 text-xs text-mist">/ 100 cognitive stability</span>
      </div>

      <div className="mt-3 space-y-2">
        <MiniBar label="Focus consistency" value={s.focusConsistency} />
        <MiniBar label="Relaxation stability" value={s.relaxationStability} />
        <MiniBar label="Recovery after dips" value={s.recoveryAbility} />
        <MiniBar label="Baseline alignment" value={s.baselineAlignment} />
        <MiniBar label="Signal reliability" value={s.signalReliability} />
      </div>

      <div className="mt-4">
        <div className="terminal-text text-[10px] uppercase tracking-widest text-teal">
          Focus timeline
        </div>
        <div className="mt-2 space-y-2">
          {analysis.timeline.map((seg, i) => (
            <div key={i} className="rounded-lg border border-steel bg-black/30 p-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-white">{seg.label}</span>
                <span className="terminal-text text-xs text-mist">
                  {seg.avgAttention}/100 ·{" "}
                  {seg.trend === "rising" ? "▲" : seg.trend === "falling" ? "▼" : "▬"} {seg.trend}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/50">
                <div
                  className="h-full rounded-full bg-neon/60"
                  style={{ width: `${seg.avgAttention}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-mist">{seg.note}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-snug text-mist">
        {baseline
          ? `Scored against your resting baseline (attention ${baseline.meanAttention}).`
          : "No personal baseline yet — calibrate a resting baseline for more accurate, personalized scoring."}{" "}
        These figures are cognitive-state proxies from a single-channel EEG; they <b>may indicate</b>{" "}
        focus and composure trends but do not measure confidence, emotion, or truth.
      </p>
    </div>
  );
}

function MiniBar({ label, value }: { label: string; value: number }) {
  const c = value >= 70 ? "#39FF14" : value >= 45 ? "#1FB6A8" : "#E6B800";
  return (
    <div>
      <div className="flex justify-between text-[11px] text-mist">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-black/50">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: c }} />
      </div>
    </div>
  );
}

function SignalQuality({ poor }: { poor: number }) {
  // poor: 0 = perfect contact, 200 = no contact.
  const quality = Math.max(0, Math.min(100, Math.round(100 - (poor / 200) * 100)));
  const good = poor < 50;
  const label =
    poor >= 200 ? "No contact" : poor >= 100 ? "Very poor" : poor >= 50 ? "Weak" : poor > 0 ? "Good" : "Excellent";
  const color = good ? "#39FF14" : poor >= 100 ? "#ef4444" : "#E6B800";
  return (
    <div className="mt-3 w-full rounded-xl border border-steel bg-black/30 p-3">
      <div className="flex items-center justify-between">
        <span className="terminal-text text-[10px] uppercase tracking-widest text-mist">
          Headset contact
        </span>
        <span className="terminal-text text-xs" style={{ color }}>
          {label} ({quality}%)
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full border border-steel bg-black/50">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${quality}%`, backgroundColor: color }} />
      </div>
      {!good && (
        <p className="mt-2 text-[11px] leading-snug text-gold">
          Contact is weak, so Attention/Calm read near 0 and the bands are mostly noise. Press the
          <b> forehead sensor onto bare skin</b> (above the eyebrow, move hair aside) and clip the
          <b> ear contact firmly on your earlobe</b>. Sit still — it clears in a few seconds.
        </p>
      )}
    </div>
  );
}

function BrainwavesPanel({ bands }: { bands: BandPowers | null }) {
  return (
    <div className="mt-4 rounded-xl border border-neon/15 bg-black/40 p-4">
      <div className="flex items-center justify-between">
        <div className="terminal-text text-[10px] uppercase tracking-widest text-neon">
          LIVE BRAINWAVES <span className="text-mist">(relative %)</span>
        </div>
        <div className="terminal-text text-[10px] text-mist">
          {bands ? "streaming" : "waiting for data…"}
        </div>
      </div>

      {bands && (
        <div className="mt-3 rounded-lg border border-gold/25 bg-gold/5 p-2.5">
          <div className="flex items-center justify-between">
            <span className="terminal-text text-[10px] uppercase tracking-widest text-gold">
              Engagement index
            </span>
            <span className="terminal-text text-xs text-gold">{bands.engagement}/100</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-black/50">
            <div
              className="h-full rounded-full bg-gold/70 transition-all duration-500"
              style={{ width: `${bands.engagement}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-mist">
            Beta / (Alpha+Theta) — task engagement &amp; arousal. ~40–70 is an engaged,
            composed presenting state; very high may indicate over-arousal/anxiety.
          </p>
        </div>
      )}

      <div className="mt-3 space-y-2.5">
        {BAND_MEANING.map((b) => {
          const v = bands ? (bands[b.key] as number) : 0;
          return (
            <div key={b.key}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-white">
                  {b.label}{" "}
                  <span className="terminal-text text-[10px] font-normal text-mist">{b.hz}</span>
                </span>
                <span className="terminal-text text-xs text-mist">{v}</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full border border-steel bg-black/50">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${v}%`, backgroundColor: b.color }}
                />
              </div>
              <p className="mt-1 text-[11px] leading-snug text-mist">{b.meaning}</p>
            </div>
          );
        })}
      </div>
      {bands ? (
        <p className="mt-3 text-[10px] leading-snug text-mist">
          Shown as a share of your spectrum (they sum to ~100%). Slow Delta is naturally the
          largest — read <b>changes vs your own baseline</b>, not absolute values. Single-channel
          EEG: these are cognitive-state proxies, not exact measures.
        </p>
      ) : (
        <p className="terminal-text mt-3 text-[11px] text-mist">
          Bars animate once the headset streams EEG band power. If they stay flat on a real device,
          no data is reaching the browser — try reconnecting or a different port.
        </p>
      )}
    </div>
  );
}

function CameraView({
  videoRef,
  on,
  error,
  live,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  on: boolean;
  error: string;
  live: boolean;
}) {
  return (
    <div className="mb-4 w-full">
      <div className="relative w-full overflow-hidden rounded-xl border border-steel bg-black/60">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`h-44 w-full object-cover ${on ? "" : "hidden"}`}
          style={{ transform: "scaleX(-1)" }}
        />
        {!on && (
          <div className="flex h-44 w-full flex-col items-center justify-center text-center">
            <div className="text-2xl">📷</div>
            <p className="mt-1 max-w-[220px] text-[11px] text-mist">
              {error || "Starting camera… allow access to watch yourself present."}
            </p>
          </div>
        )}
        {on && live && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="terminal-text text-[10px] text-white">REC</span>
          </div>
        )}
      </div>
    </div>
  );
}

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
