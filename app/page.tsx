"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/store";
import {
  ASSESSMENT_QUESTIONS,
  BARRIER_OPTIONS,
  CRITICISM_OPTIONS,
  DAILY_GOAL_OPTIONS,
  GLOBAL_ROLE_MODELS,
  ARAB_ROLE_MODELS,
  LEARNING_STYLE_OPTIONS,
  LEARNING_TIME_OPTIONS,
  POWER_SKILLS_GRID,
  POWER_SKILL_AWARENESS_MESSAGES,
  POWER_SKILL_AWARENESS_OPTIONS,
  POWER_SKILL_TO_BEGIN,
  PRESENTATION_FEELING_OPTIONS,
  SCALE_LABELS,
  SCENARIO_NETWORKING_OPTIONS,
  SCENARIO_STORY_OPTIONS,
  SPEAKING_GOALS,
} from "@/lib/content";
import { generateCommunicationProfile, ageContextWord } from "@/lib/ai";
import { WelcomeHero } from "@/components/WelcomeHero";
import { QuestionScreen } from "@/components/QuestionScreen";
import {
  AssessmentSlider,
  PrimaryButton,
  SecondaryButton,
  SelectGrid,
  TextInput,
  ValidationNote,
} from "@/components/controls";
import { TerminalHeader, TerminalStatusBar, ProgressBar } from "@/components/terminal";
import { TerminalLoadingAnalysis } from "@/components/loading";
import { InfoCard, MotivationCard, ScoreCircle, SkillCard } from "@/components/panels";

// Ordered onboarding steps.
const STEPS = [
  "welcome",
  "goals",
  "age",
  "rolemodel",
  "awareness",
  "powerskills",
  "assessment",
  "motivation",
  "scenarios",
  "presentation",
  "criticism",
  "barrier",
  "initialprofile",
  "choose",
  "learningstyle",
  "learningtime",
  "dailygoal",
  "reflection",
  "loading",
  "growth",
  "push",
  "belief",
  "finish",
  "challenge",
  "email",
  "plan",
] as const;
type Step = (typeof STEPS)[number];

// Screens that show the numbered progress counter.
const NUMBERED: Step[] = STEPS.filter(
  (s) => !["welcome", "loading", "plan"].includes(s),
) as Step[];
const TOTAL = NUMBERED.length;
const stepNo = (s: Step) => NUMBERED.indexOf(s) + 1;

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, update, hydrated } = useProfile();
  const [idx, setIdx] = useState(0);
  const [validation, setValidation] = useState("");

  const step = STEPS[idx];
  const go = (n: number) => {
    setValidation("");
    setIdx((i) => Math.min(STEPS.length - 1, Math.max(0, i + n)));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const next = () => go(1);
  const back = () => go(-1);

  // Live computed profile (used by initial profile, growth, challenge, plan).
  const computed = useMemo(() => generateCommunicationProfile(profile), [profile]);

  const baseStatus = [
    "SYS_STATUS: [READY]",
    "USER_STAGE: [ONBOARDING]",
    "AI_COACH: [ACTIVE]",
  ];

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="terminal-text animate-pulse text-neon">INITIALIZING SPEAKING ROOM…</div>
      </main>
    );
  }

  // ---------------- WELCOME ----------------
  if (step === "welcome") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <WelcomeHero
          onStart={next}
          hasProgress={profile.onboardingComplete || !!profile.selectedGoals.length}
          onResume={() => {
            if (profile.onboardingComplete) router.push("/dashboard");
            else setIdx(1);
          }}
        />
      </main>
    );
  }

  // ---------------- LOADING ----------------
  if (step === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="mx-auto w-full max-w-2xl">
          <div className="overflow-hidden rounded-xl shadow-glass">
            <TerminalHeader path="C:\ETIHAD\SPEAKING_ROOM\ANALYSIS" />
            <div className="glass rounded-b-xl border-t-0 p-5 sm:p-7">
              <h1 className="mb-4 text-xl font-bold text-white">Analyzing Your Communication Profile</h1>
              <TerminalLoadingAnalysis onDone={next} />
              <TerminalStatusBar
                items={["SYS_STATUS: [ANALYZING]", "MODULE: [POWER_SKILLS]", "MEMORY: [SESSION]"]}
              />
            </div>
          </div>
        </div>
      </main>
    );
  }

  const wrap = (children: React.ReactNode) => (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">{children}</main>
  );

  // ---------------- GOALS ----------------
  if (step === "goals") {
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\SPEAKING_GOALS"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="What kind of speaking skills would you like to develop?"
        supportive="Select all that apply. Your choices shape your personalized plan."
        statusItems={baseStatus}
        validation={validation}
        hideBack
        onNext={() => {
          if (profile.selectedGoals.length === 0) return setValidation("Please choose at least one option to continue.");
          next();
        }}
      >
        <SelectGrid
          multi
          columns={2}
          options={SPEAKING_GOALS}
          values={profile.selectedGoals}
          onChange={(v) => update({ selectedGoals: v })}
        />
      </QuestionScreen>,
    );
  }

  // ---------------- AGE ----------------
  if (step === "age") {
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\USER_PROFILE"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="How old are you?"
        supportive="We tailor every example and scenario to be appropriate for your age."
        statusItems={baseStatus}
        validation={validation}
        onBack={back}
        onNext={() => {
          const a = profile.age;
          if (a == null || isNaN(a)) return setValidation("Please enter your age.");
          if (a < 5 || a > 110) return setValidation("Please enter a realistic age.");
          next();
        }}
      >
        <div className="max-w-xs">
          <TextInput
            type="number"
            value={profile.age == null ? "" : String(profile.age)}
            onChange={(v) => update({ age: v === "" ? null : Number(v) })}
            placeholder="e.g. 24"
          />
        </div>
        {profile.age != null && profile.age >= 5 && profile.age <= 110 && (
          <p className="terminal-text mt-3 text-xs text-teal">
            &gt; Examples will be tuned for {ageContextWord(profile.age)}.
          </p>
        )}
      </QuestionScreen>,
    );
  }

  // ---------------- ROLE MODEL ----------------
  if (step === "rolemodel") {
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\ROLE_MODELS"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="Whose communication style feels powerful or inspiring to you?"
        supportive="Choose one or more. We will use their style to personalize your training tone."
        statusItems={baseStatus}
        validation={validation}
        onBack={back}
        onNext={() => {
          if (profile.roleModels.length === 0 && !profile.otherRoleModel.trim())
            return setValidation("Please choose at least one, or type a name under 'Other'.");
          next();
        }}
      >
        <RoleModelGroup
          title="Global Speakers"
          items={GLOBAL_ROLE_MODELS}
          selected={profile.roleModels}
          onToggle={(name) =>
            update({
              roleModels: profile.roleModels.includes(name)
                ? profile.roleModels.filter((r) => r !== name)
                : [...profile.roleModels, name],
            })
          }
        />
        <RoleModelGroup
          title="Arab Speakers"
          items={ARAB_ROLE_MODELS}
          selected={profile.roleModels}
          onToggle={(name) =>
            update({
              roleModels: profile.roleModels.includes(name)
                ? profile.roleModels.filter((r) => r !== name)
                : [...profile.roleModels, name],
            })
          }
        />
        <div className="mt-4">
          <label className="terminal-text text-xs uppercase tracking-wide text-mist">
            Other — write the name
          </label>
          <div className="mt-1.5 max-w-sm">
            <TextInput
              value={profile.otherRoleModel}
              onChange={(v) => update({ otherRoleModel: v })}
              placeholder="Someone who inspires you"
            />
          </div>
        </div>
      </QuestionScreen>,
    );
  }

  // ---------------- AWARENESS ----------------
  if (step === "awareness") {
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\POWER_SKILLS"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="How much do you know about power skills?"
        statusItems={["SYS_STATUS: [READY]", "MODULE: [POWER_SKILLS]", "AI_COACH: [ACTIVE]"]}
        validation={validation}
        onBack={back}
        onNext={() => {
          if (!profile.powerSkillAwareness) return setValidation("Please choose one option to continue.");
          next();
        }}
      >
        <SelectGrid
          options={POWER_SKILL_AWARENESS_OPTIONS}
          values={profile.powerSkillAwareness ? [profile.powerSkillAwareness] : []}
          onChange={(v) => update({ powerSkillAwareness: v[0] })}
        />
        {profile.powerSkillAwareness && (
          <div className="mt-4 animate-fadeUp">
            <MotivationCard>{POWER_SKILL_AWARENESS_MESSAGES[profile.powerSkillAwareness]}</MotivationCard>
          </div>
        )}
      </QuestionScreen>,
    );
  }

  // ---------------- POWER SKILLS EXPLANATION ----------------
  if (step === "powerskills") {
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\POWER_SKILLS\INFO"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="What Are Power Skills?"
        supportive="Power skills are the human skills that help you succeed in real life, work, study, leadership, and relationships. They help you communicate clearly, handle pressure, influence others, solve problems, and become more confident."
        statusItems={["SYS_STATUS: [READY]", "MODULE: [POWER_SKILLS]", "STATUS: [LOADED]"]}
        nextLabel="Start My Communication Assessment"
        onBack={back}
        onNext={next}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {POWER_SKILLS_GRID.map((s) => (
            <SkillCard key={s.name} name={s.name} icon={s.icon} />
          ))}
        </div>
        <div className="mt-4">
          <MotivationCard>
            Your ability to connect, lead, express yourself, and get ahead in life is what power
            skills are all about.
          </MotivationCard>
        </div>
      </QuestionScreen>,
    );
  }

  // ---------------- ASSESSMENT ----------------
  if (step === "assessment") {
    const answered = Object.keys(profile.assessmentAnswers).length;
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\ASSESSMENT"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="Communication Self-Assessment"
        supportive="Rate each statement from 1 (Never) to 5 (Always). Be honest — this calibrates your plan."
        statusItems={["SYS_STATUS: [SCANNING]", "SCORE_ENGINE: [ACTIVE]", "MEMORY: [SESSION]"]}
        validation={validation}
        onBack={back}
        onNext={() => {
          if (answered < ASSESSMENT_QUESTIONS.length)
            return setValidation(`Please answer all ${ASSESSMENT_QUESTIONS.length} statements (${answered} done).`);
          next();
        }}
      >
        <div className="space-y-5">
          {ASSESSMENT_QUESTIONS.map((q) => (
            <div key={q.id} className="rounded-xl border border-neon/10 bg-black/20 p-4">
              <div className="mb-3 flex gap-2 text-sm text-white/90">
                <span className="terminal-text text-neon">{String(q.id).padStart(2, "0")}.</span>
                <span>{q.text}</span>
              </div>
              <AssessmentSlider
                value={profile.assessmentAnswers[q.id] ?? 0}
                labels={SCALE_LABELS}
                onChange={(v) =>
                  update({ assessmentAnswers: { ...profile.assessmentAnswers, [q.id]: v } })
                }
              />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <ProgressBar
            percent={Math.round((answered / ASSESSMENT_QUESTIONS.length) * 100)}
            label="ASSESSMENT"
          />
        </div>
      </QuestionScreen>,
    );
  }

  // ---------------- MOTIVATION ----------------
  if (step === "motivation") {
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\MESSAGE"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="You are not here just to speak better."
        statusItems={baseStatus}
        onBack={back}
        onNext={next}
      >
        <MotivationCard>
          <p className="font-semibold text-white">
            You are here to reveal the strongest version of yourself.
          </p>
          <p className="mt-3">
            Every powerful speaker was once unsure. Every confident leader started with practice.
            Every inspiring communicator learned how to turn fear into presence, ideas into stories,
            and words into influence.
          </p>
          <p className="mt-3 text-neon">Today, your communication journey begins.</p>
        </MotivationCard>
      </QuestionScreen>,
    );
  }

  // ---------------- SCENARIOS ----------------
  if (step === "scenarios") {
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\SCENARIOS"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="Let's look at how you communicate in real situations."
        statusItems={baseStatus}
        validation={validation}
        onBack={back}
        onNext={() => {
          if (!profile.scenarioStory || !profile.scenarioNetworking)
            return setValidation("Please answer both scenarios to continue.");
          next();
        }}
      >
        <p className="mb-2 text-sm font-medium text-white/90">
          When sharing a fun story with your friends, what usually happens?
        </p>
        <SelectGrid
          options={SCENARIO_STORY_OPTIONS}
          values={profile.scenarioStory ? [profile.scenarioStory] : []}
          onChange={(v) => update({ scenarioStory: v[0] })}
        />
        <p className="mb-2 mt-6 text-sm font-medium text-white/90">
          At a networking event, what feels more like you?
        </p>
        <SelectGrid
          options={SCENARIO_NETWORKING_OPTIONS}
          values={profile.scenarioNetworking ? [profile.scenarioNetworking] : []}
          onChange={(v) => update({ scenarioNetworking: v[0] })}
        />
      </QuestionScreen>,
    );
  }

  // ---------------- PRESENTATION ----------------
  if (step === "presentation") {
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\PRESENTATION"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="How do you feel when you are asked to give a presentation?"
        statusItems={baseStatus}
        validation={validation}
        onBack={back}
        onNext={() => {
          if (!profile.presentationFeeling) return setValidation("Please choose one option to continue.");
          next();
        }}
      >
        <SelectGrid
          options={PRESENTATION_FEELING_OPTIONS}
          values={profile.presentationFeeling ? [profile.presentationFeeling] : []}
          onChange={(v) => update({ presentationFeeling: v[0] })}
        />
      </QuestionScreen>,
    );
  }

  // ---------------- CRITICISM ----------------
  if (step === "criticism") {
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\FEEDBACK_STYLE"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="How do you react to constructive criticism?"
        statusItems={baseStatus}
        validation={validation}
        onBack={back}
        onNext={() => {
          if (!profile.criticismReaction) return setValidation("Please choose one option to continue.");
          next();
        }}
      >
        <SelectGrid
          options={CRITICISM_OPTIONS}
          values={profile.criticismReaction ? [profile.criticismReaction] : []}
          onChange={(v) => update({ criticismReaction: v[0] })}
        />
      </QuestionScreen>,
    );
  }

  // ---------------- BARRIER ----------------
  if (step === "barrier") {
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\GROWTH_BARRIER"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="What usually stands in the way of your self-growth?"
        statusItems={baseStatus}
        validation={validation}
        onBack={back}
        onNext={() => {
          if (!profile.selfGrowthBarrier) return setValidation("Please choose one option to continue.");
          if (profile.selfGrowthBarrier === "Other" && !profile.otherBarrier.trim())
            return setValidation("Please describe your barrier.");
          next();
        }}
      >
        <SelectGrid
          options={BARRIER_OPTIONS}
          values={profile.selfGrowthBarrier ? [profile.selfGrowthBarrier] : []}
          onChange={(v) => update({ selfGrowthBarrier: v[0] })}
        />
        {profile.selfGrowthBarrier === "Other" && (
          <div className="mt-3 max-w-sm animate-fadeUp">
            <TextInput
              value={profile.otherBarrier}
              onChange={(v) => update({ otherBarrier: v })}
              placeholder="Tell us what holds you back"
            />
          </div>
        )}
      </QuestionScreen>,
    );
  }

  // ---------------- INITIAL PROFILE ----------------
  if (step === "initialprofile") {
    const s = computed.scores;
    return wrap(
      <div className="mx-auto w-full max-w-2xl animate-fadeUp">
        <div className="overflow-hidden rounded-xl shadow-glass">
          <TerminalHeader path="C:\ETIHAD\SPEAKING_ROOM\PROFILE" />
          <div className="glass rounded-b-xl border-t-0 p-5 sm:p-7">
            <div className="mb-4 terminal-text text-[11px] uppercase tracking-widest text-mist">
              STEP {stepNo(step)} / {TOTAL} · USER PROFILE DETECTED
            </div>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <ScoreCircle value={s.overall} label="POWER SCORE" />
              <div>
                <h1 className="text-2xl font-extrabold text-white">{computed.profileTitle}</h1>
                <p className="mt-1 text-sm text-mist">Your initial communication profile</p>
              </div>
            </div>

            <p className="mt-5 text-[15px] leading-relaxed text-white/90">
              Your Communication Power Score is <span className="font-bold text-neon">{s.overall}%</span>. You are a{" "}
              <span className="font-semibold text-white">{computed.profileTitle}</span> with strong
              potential. Your top strength right now is{" "}
              <span className="text-neon">{computed.strengths[1] || computed.strengths[0]}</span>{" "}
              Your next growth areas are {computed.growthAreas.join(", ").toLowerCase()}.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <InfoCard label="Top Strength" value={computed.strengths[1] || computed.strengths[0]} accent />
              <InfoCard label="Main Growth Area" value={computed.growthAreas[0]} />
            </div>

            <div className="mt-4 space-y-3 rounded-xl border border-neon/15 bg-black/30 p-4">
              <p className="text-sm text-white/85">
                Communication is not only a soft skill. It is a career accelerator. The better you
                communicate, the more likely you are to lead meetings, influence decisions, build
                trust, negotiate opportunities, and create professional visibility.
              </p>
              <p className="text-sm text-mist">
                When you master communication, you <span className="text-neon">can improve</span> your
                ability to win interviews, lead teams, negotiate better opportunities, present ideas,
                and build powerful relationships — which <span className="text-neon">may increase</span>{" "}
                your career value, visibility, and income potential.
              </p>
            </div>

            <div className="mt-6">
              <PrimaryButton full onClick={next}>
                Continue Building My Plan
              </PrimaryButton>
            </div>
            <TerminalStatusBar items={["SYS_STATUS: [READY]", "SCORE_ENGINE: [ACTIVE]", "PROFILE: [DRAFTED]"]} />
          </div>
        </div>
      </div>,
    );
  }

  // ---------------- CHOOSE SKILL ----------------
  if (step === "choose") {
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\SELECT_SKILL"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="Which power skill would you like to begin with?"
        statusItems={baseStatus}
        validation={validation}
        onBack={back}
        onNext={() => {
          if (!profile.selectedPowerSkill) return setValidation("Please choose one skill to continue.");
          next();
        }}
      >
        <SelectGrid
          columns={2}
          options={POWER_SKILL_TO_BEGIN}
          values={profile.selectedPowerSkill ? [profile.selectedPowerSkill] : []}
          onChange={(v) => update({ selectedPowerSkill: v[0] })}
        />
      </QuestionScreen>,
    );
  }

  // ---------------- LEARNING STYLE ----------------
  if (step === "learningstyle") {
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\LEARNING_STYLE"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="How would you like to learn this skill?"
        statusItems={baseStatus}
        validation={validation}
        onBack={back}
        onNext={() => {
          if (!profile.learningStyle) return setValidation("Please choose one option to continue.");
          next();
        }}
      >
        <SelectGrid
          options={LEARNING_STYLE_OPTIONS}
          values={profile.learningStyle ? [profile.learningStyle] : []}
          onChange={(v) => update({ learningStyle: v[0] })}
        />
      </QuestionScreen>,
    );
  }

  // ---------------- LEARNING TIME ----------------
  if (step === "learningtime") {
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\LEARNING_TIME"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="When is your favorite time to learn something new?"
        statusItems={baseStatus}
        validation={validation}
        onBack={back}
        onNext={() => {
          if (!profile.favoriteLearningTime) return setValidation("Please choose one option to continue.");
          next();
        }}
      >
        <SelectGrid
          columns={2}
          options={LEARNING_TIME_OPTIONS}
          values={profile.favoriteLearningTime ? [profile.favoriteLearningTime] : []}
          onChange={(v) => update({ favoriteLearningTime: v[0] })}
        />
      </QuestionScreen>,
    );
  }

  // ---------------- DAILY GOAL ----------------
  if (step === "dailygoal") {
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\DAILY_GOAL"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="What is your daily upskilling goal?"
        supportive="This sets the intensity of your daily practice."
        statusItems={baseStatus}
        validation={validation}
        onBack={back}
        onNext={() => {
          if (!profile.dailyUpskillingGoal) return setValidation("Please choose one option to continue.");
          next();
        }}
      >
        <div className="grid gap-2.5">
          {DAILY_GOAL_OPTIONS.map((o) => {
            const selected = profile.dailyUpskillingGoal === o.label;
            return (
              <button
                key={o.label}
                onClick={() => update({ dailyUpskillingGoal: o.label })}
                className={`rounded-xl border px-4 py-3 text-left transition-all ${
                  selected
                    ? "border-neon bg-neon/10 shadow-neonSoft"
                    : "border-steel bg-black/30 hover:border-neon/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${selected ? "text-neon" : "text-white"}`}>{o.label}</span>
                  <span className="terminal-text text-[10px] text-mist">{o.intensity}</span>
                </div>
                <p className="mt-1 text-sm text-mist">{o.desc}</p>
              </button>
            );
          })}
        </div>
      </QuestionScreen>,
    );
  }

  // ---------------- REFLECTION ----------------
  if (step === "reflection") {
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\REFLECTION"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="Do you usually self-reflect after conversations, presentations, or important situations?"
        statusItems={baseStatus}
        validation={validation}
        onBack={back}
        onNext={() => {
          if (!profile.selfReflects) return setValidation("Please choose one option to continue.");
          next();
        }}
      >
        <SelectGrid
          columns={2}
          options={["Yes", "No"]}
          values={profile.selfReflects ? [profile.selfReflects] : []}
          onChange={(v) => update({ selfReflects: v[0] })}
        />
        {profile.selfReflects === "Yes" && (
          <div className="mt-4 animate-fadeUp">
            <MotivationCard>
              Great. Self-reflection is one of the fastest ways to improve communication because it
              helps you notice patterns, strengths, and blind spots.
            </MotivationCard>
          </div>
        )}
        {profile.selfReflects === "No" && (
          <div className="mt-4 animate-fadeUp">
            <MotivationCard>
              No problem. This AI trainer will help you build a simple reflection habit after each
              practice, so improvement becomes easier and more natural.
            </MotivationCard>
          </div>
        )}
      </QuestionScreen>,
    );
  }

  // ---------------- GROWTH AREAS SUMMARY ----------------
  if (step === "growth") {
    return wrap(
      <div className="mx-auto w-full max-w-2xl animate-fadeUp">
        <div className="overflow-hidden rounded-xl shadow-glass">
          <TerminalHeader path="C:\ETIHAD\SPEAKING_ROOM\GROWTH_AREAS" />
          <div className="glass rounded-b-xl border-t-0 p-5 sm:p-7">
            <div className="mb-2 terminal-text text-[11px] uppercase tracking-widest text-mist">
              STEP {stepNo(step)} / {TOTAL}
            </div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Your Growth Map</h1>
            <p className="mt-1 text-sm text-mist">
              Based on your answers, we identified your main goals and growth areas.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <InfoCard label="Main Speaking Goal" value={profile.selectedGoals[0] || "Public Speaking"} accent />
              <InfoCard label="Current Confidence Level" value={`${computed.scores.confidence}%`} />
              <InfoCard label="Communication Strength" value={computed.strengths[1] || computed.strengths[0]} />
              <InfoCard label="Growth Area" value={computed.growthAreas[0]} />
              <InfoCard label="Recommended Starting Skill" value={profile.selectedPowerSkill || "Public Speaking"} accent />
              <InfoCard label="Daily Practice Intensity" value={computed.intensity.label} />
              <InfoCard label="Learning Style" value={profile.learningStyle || "Both theory and practice"} />
              <InfoCard label="Best Learning Time" value={profile.favoriteLearningTime || "Any spare time"} />
            </div>
            <div className="mt-6">
              <PrimaryButton full onClick={next}>
                Continue
              </PrimaryButton>
            </div>
            <TerminalStatusBar items={["SYS_STATUS: [READY]", "GROWTH_MAP: [GENERATED]", "AI_COACH: [ACTIVE]"]} />
          </div>
        </div>
      </div>,
    );
  }

  // ---------------- FRIENDLY PUSH ----------------
  if (step === "push") {
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\MOTIVATION_PREF"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="Would you like a friendly push when you need motivation?"
        statusItems={baseStatus}
        validation={validation}
        onBack={back}
        onNext={() => {
          if (!profile.friendlyPush) return setValidation("Please choose one option to continue.");
          next();
        }}
      >
        <SelectGrid
          options={["Yes, motivate me when I slow down", "No, I prefer to move at my own pace"]}
          values={profile.friendlyPush ? [profile.friendlyPush] : []}
          onChange={(v) => update({ friendlyPush: v[0] })}
        />
      </QuestionScreen>,
    );
  }

  // ---------------- PRACTICE BELIEF ----------------
  if (step === "belief") {
    const msg: Record<string, string> = {
      Yes: "Exactly. Communication improves through practice, feedback, repetition, and reflection.",
      No: "That is okay. This journey will show you how small practical exercises can make learning faster and easier.",
      "Not sure":
        "Fair answer. You will experience how short, focused practice can turn knowledge into real communication ability.",
    };
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\PRACTICE_BELIEF"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="Do you believe practice is crucial for effective learning?"
        statusItems={baseStatus}
        validation={validation}
        onBack={back}
        onNext={() => {
          if (!profile.practiceBelief) return setValidation("Please choose one option to continue.");
          next();
        }}
      >
        <SelectGrid
          columns={2}
          options={["Yes", "No", "Not sure"]}
          values={profile.practiceBelief ? [profile.practiceBelief] : []}
          onChange={(v) => update({ practiceBelief: v[0] })}
        />
        {profile.practiceBelief && (
          <div className="mt-4 animate-fadeUp">
            <MotivationCard>{msg[profile.practiceBelief]}</MotivationCard>
          </div>
        )}
      </QuestionScreen>,
    );
  }

  // ---------------- FINISH WHAT YOU START ----------------
  if (step === "finish") {
    const msg: Record<string, string> = {
      Yes: "You seem ready for a structured growth journey. We will keep your plan progressive and achievement-based.",
      No: "No problem. We will use small wins, short exercises, and motivational nudges to help you stay consistent.",
      Sometimes:
        "That is very common. We will design your plan with flexible steps, quick progress moments, and simple daily wins.",
    };
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\COMMITMENT"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="Are you usually inclined to finish what you start?"
        statusItems={baseStatus}
        validation={validation}
        onBack={back}
        onNext={() => {
          if (!profile.finishesWhatStarts) return setValidation("Please choose one option to continue.");
          next();
        }}
      >
        <SelectGrid
          columns={2}
          options={["Yes", "No", "Sometimes"]}
          values={profile.finishesWhatStarts ? [profile.finishesWhatStarts] : []}
          onChange={(v) => update({ finishesWhatStarts: v[0] })}
        />
        {profile.finishesWhatStarts && (
          <div className="mt-4 animate-fadeUp">
            <MotivationCard>{msg[profile.finishesWhatStarts]}</MotivationCard>
          </div>
        )}
      </QuestionScreen>,
    );
  }

  // ---------------- LEARNER CHALLENGE TYPE ----------------
  if (step === "challenge") {
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\LEARNER_TYPE"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="We identified how you learn best."
        statusItems={["SYS_STATUS: [READY]", "LEARNER_PROFILE: [MATCHED]", "AI_COACH: [ACTIVE]"]}
        onBack={back}
        onNext={next}
      >
        <div className="rounded-xl border border-neon/30 bg-neon/5 p-5">
          <div className="terminal-text text-[11px] uppercase tracking-widest text-mist">
            LEARNING CHALLENGE TYPE
          </div>
          <div className="mt-1 text-2xl font-extrabold text-glow text-neon">
            {computed.learnerChallengeType}
          </div>
          <p className="mt-3 text-sm text-white/85">{computed.learnerChallengeBlurb}</p>
          <p className="mt-3 text-sm text-mist">
            This does not define you. It simply helps us design a smarter learning path that fits how
            you grow.
          </p>
        </div>
      </QuestionScreen>,
    );
  }

  // ---------------- EMAIL ----------------
  if (step === "email") {
    const finalize = () => {
      const email = profile.email.trim();
      if (!email) return setValidation("Please enter your email address.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return setValidation("Please enter a valid email address.");
      // Persist the computed profile permanently.
      update({
        scores: computed.scores,
        profileTitle: computed.profileTitle,
        strengths: computed.strengths,
        growthAreas: computed.growthAreas,
        learnerChallengeType: computed.learnerChallengeType,
        trainingPlan: computed.trainingPlan,
        onboardingComplete: true,
      });
      next();
    };
    return wrap(
      <QuestionScreen
        path="C:\ETIHAD\SPEAKING_ROOM\DELIVERY"
        step={stepNo(step)}
        totalSteps={TOTAL}
        question="Where should we send your personalized communication plan?"
        statusItems={["SYS_STATUS: [READY]", "EMAIL_CAPTURE: [SECURE]", "PLAN: [PENDING]"]}
        validation={validation}
        nextLabel="Generate My Speaking Plan"
        onBack={back}
        onNext={finalize}
      >
        <div className="max-w-md">
          <TextInput
            type="email"
            value={profile.email}
            onChange={(v) => update({ email: v })}
            placeholder="you@example.com"
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-mist">
          We will use your email only to send your training plan, progress updates, and learning
          reminders. You can unsubscribe or update your preferences anytime.
        </p>
      </QuestionScreen>,
    );
  }

  // ---------------- FINAL PLAN ----------------
  if (step === "plan") {
    const rm = computed.roleModel;
    return wrap(
      <div className="mx-auto w-full max-w-3xl animate-fadeUp">
        <div className="overflow-hidden rounded-xl shadow-glass">
          <TerminalHeader path="C:\ETIHAD\SPEAKING_ROOM\TRAINING_PLAN" />
          <div className="glass rounded-b-xl border-t-0 p-5 sm:p-8">
            <div className="terminal-text text-[11px] uppercase tracking-widest text-neon">
              VOICE INTO INFLUENCE MODE: ON
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
              Your Personalized Speaking Room Plan
            </h1>

            <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row">
              <ScoreCircle value={computed.scores.overall} label="POWER SCORE" />
              <div className="flex-1">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <InfoCard label="Main Goal" value={profile.selectedGoals[0] || "Public Speaking"} accent />
                  <InfoCard label="Current Profile" value={computed.profileTitle} />
                  <InfoCard label="Recommended First Skill" value={profile.selectedPowerSkill || "Public Speaking"} accent />
                  <InfoCard label="Daily Practice Intensity" value={`${computed.intensity.label} — ${computed.intensity.range}`} />
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-teal/30 bg-teal/5 p-4">
              <div className="terminal-text text-[10px] uppercase tracking-widest text-teal">
                ROLE MODEL INSPIRATION
              </div>
              <p className="mt-1 text-sm text-white/90">
                <span className="font-semibold text-white">{rm.name}</span> — {rm.line}
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-neon/15 bg-black/30 p-4">
                <div className="terminal-text text-[10px] uppercase tracking-widest text-mist">KEY STRENGTHS</div>
                <ul className="mt-2 space-y-1.5 text-sm text-white/85">
                  {computed.strengths.map((s, i) => (
                    <li key={i}>
                      <span className="text-neon">+</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-neon/15 bg-black/30 p-4">
                <div className="terminal-text text-[10px] uppercase tracking-widest text-mist">GROWTH AREAS</div>
                <ul className="mt-2 space-y-1.5 text-sm text-white/85">
                  {computed.growthAreas.map((g, i) => (
                    <li key={i}>
                      <span className="text-gold">→</span> {g}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <InfoCard label="Learner Challenge Type" value={computed.learnerChallengeType} accent />
              <InfoCard label="Learning Style" value={profile.learningStyle || "Both theory and practice"} />
            </div>

            <div className="mt-5">
              <MotivationCard>{computed.motivationalQuote}</MotivationCard>
            </div>

            <h2 className="mt-7 text-lg font-bold text-white">Your 7-Day Plan</h2>
            <div className="mt-3 space-y-2.5">
              {computed.trainingPlan.map((d) => (
                <div key={d.day} className="flex gap-3 rounded-xl border border-neon/15 bg-black/30 p-3.5">
                  <div className="terminal-text flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-neon/40 bg-neon/10 text-sm font-bold text-neon">
                    {d.day}
                  </div>
                  <div>
                    <div className="font-semibold text-white">
                      Day {d.day}: {d.title}
                    </div>
                    <div className="text-sm text-mist">{d.task}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton full onClick={() => router.push("/practice")}>
                Enter Practice Room
              </PrimaryButton>
              <SecondaryButton onClick={() => router.push("/dashboard")}>View Dashboard</SecondaryButton>
            </div>
            <TerminalStatusBar items={["SYS_STATUS: [READY]", "PLAN: [GENERATED]", "AI_COACH: [ACTIVE]"]} />
          </div>
        </div>
      </div>,
    );
  }

  return null;
}

// ---------------- Role model group helper ----------------
function RoleModelGroup({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: { name: string; trait: string }[];
  selected: string[];
  onToggle: (name: string) => void;
}) {
  return (
    <div className="mb-4">
      <div className="terminal-text mb-2 text-xs uppercase tracking-widest text-mist">{title}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((m) => {
          const sel = selected.includes(m.name);
          return (
            <button
              key={m.name}
              onClick={() => onToggle(m.name)}
              className={`rounded-lg border px-3 py-2 text-left transition-all ${
                sel ? "border-neon bg-neon/10 shadow-neonSoft" : "border-steel bg-black/30 hover:border-neon/40"
              }`}
            >
              <div className={`text-sm font-medium ${sel ? "text-neon" : "text-white/90"}`}>{m.name}</div>
              <div className="text-[11px] text-mist">{m.trait}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
