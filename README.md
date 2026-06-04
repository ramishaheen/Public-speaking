# Etihad Speaking Room AI Trainer

**Turn Your Voice Into Influence.**

An AI-powered speaking, communication, confidence, and power-skills trainer. Users enter a
retro-futuristic AI speaking lab, complete a personalized diagnostic assessment, get analyzed by an
AI coach, and receive a personalized speaking-improvement mission with a 7-day plan, a practice room,
simulated AI feedback, progress tracking, and an admin analytics view.

> Suitable for students, employees, professionals, leaders, universities, corporate academies,
> training centers, banks, government entities, and youth programs. All coaching content is
> respectful, inclusive, age-appropriate, and professional.

---

## 1. What was built

A complete, production-ready **Next.js 14 + TypeScript + Tailwind CSS** web app.

- **Full onboarding flow** (welcome → 23 diagnostic steps → loading analysis → personalized plan),
  presented as a retro AI terminal with typewriter questions, terminal headers, progress bars, and
  system status bars.
- **Scoring engine** — converts 15 self-assessment answers (with reverse-scoring for negative items)
  plus scenario answers into 8 normalized scores: overall, clarity, confidence, listening,
  storytelling, assertiveness, networking, growth mindset.
- **Personalized diagnosis engine** — profile title, strengths, growth areas, and a prioritized
  **learner challenge type** (Fear of Judgment → Low Confidence → Low Consistency → Busy →
  Overthinking → Fast Growth → Practical → Reflective).
- **Training plan generator** — role-model-aware tone + age-aware examples + intensity from the daily
  goal, producing a 7-day plan.
- **Practice Room** — pick a scenario, respond (text now; voice-capture UI placeholder), and receive a
  full Communication Feedback Report (overall + 6 subscores, what you did well, growth area, a better
  version, and a micro-challenge).
- **Progress Dashboard** — power score, subscores, stats, streak, mission/next challenge, motivational
  quote, and 10 unlockable badges.
- **Admin Dashboard** — cohort metrics, most-selected and most-difficult skills, top learner types,
  and CSV/report export placeholders (mock data).
- **Local-storage persistence** of the full `UserProfile`, with a backend-ready seam.
- **Mock AI engine** that produces realistic, personalized output, plus a clear LLM integration seam.

Safety: "flirting" is replaced by **Social Confidence & Respectful Rapport**; examples adapt for
under-13, 13–17, and 18+ audiences. No guaranteed-income claims (only "can improve / may increase").

---

## 2. Main files

```
app/
  layout.tsx              Root layout, fonts, ProfileProvider, lab background
  globals.css             Terminal/glassmorphism theme, scanlines, animations
  page.tsx                Onboarding flow orchestrator (all 23 steps + welcome + plan)
  practice/page.tsx       Practice Room + AI feedback report
  dashboard/page.tsx      Progress dashboard (scores, badges, mission)
  admin/page.tsx          Admin analytics dashboard (mock data)
  api/coach/route.ts      LLM endpoint scaffold (Claude / OpenAI / Gemini)

lib/
  types.ts                UserProfile, Scores, feedback, training day types
  content.ts              Goals, role models, questions, scenarios, badges, copy
  scoring.ts              Scoring engine + learner-challenge-type logic
  ai.ts                   Personalization engine, mock feedback, callLLM() seam
  store.ts                React Context + localStorage persistence

components/
  terminal.tsx            TerminalHeader, StatusBar, ProgressBar, Typewriter, RotatingText, Cursor
  controls.tsx            Buttons, SelectGrid, OptionButton, AssessmentSlider, inputs, nav
  panels.tsx              TransformationPanel, ScoreCircle, ScoreBar, SkillCard, InfoCard, BadgeCard
  loading.tsx             TerminalLoadingAnalysis (animated system scan)
  QuestionScreen.tsx      Reusable terminal question wrapper
  WelcomeHero.tsx         Welcome / hero screen
  shell.tsx               AppShell + nav for dashboard/practice/admin
```

---

## 3. How to run

```bash
npm install
npm run dev      # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

Requires Node 18+ (built and tested on Node 22).

---

## 4. Where to connect a real LLM API later

The app ships with a deterministic mock engine, so it works fully with **no API key**.

To go live with a provider:

1. Open **`app/api/coach/route.ts`** and uncomment the block for your provider
   (Anthropic Claude, OpenAI, or Gemini). Add the API key to the environment, e.g.:
   ```
   ANTHROPIC_API_KEY=...
   # or OPENAI_API_KEY=...  /  GEMINI_API_KEY=...
   ```
2. In **`lib/ai.ts`**, implement `callLLM()` to `fetch("/api/coach", …)` (a commented example is
   included) and flip `isLLMConfigured()` to `true`.
3. Route the personalization functions (`generatePracticeFeedback`, `generateCommunicationProfile`,
   etc.) through `callLLM()` where you want real model output. They already accept the full
   `UserProfile`, so you can build rich prompts from it.

The mock remains a graceful fallback whenever a provider is not configured or a call fails.

---

## 5. Assumptions made

- **Stack:** Next.js App Router (React 18, TypeScript, Tailwind) was chosen as the "modern frontend
  framework"; local state + Context with localStorage persistence ("local state first"), with a clear
  backend seam (`persist()` in `lib/store.ts`, `/api/coach`).
- **Role models** are represented by neutral SVG avatars and trait descriptions — no real celebrity
  photos are used.
- **Voice recording** is a UI placeholder (the spec allows this); it can be wired to the browser
  `MediaRecorder` API later.
- **Email & profile** are stored in localStorage for the prototype; production should POST to a secured
  backend (the seam is marked in `lib/store.ts`).
- **Admin data** is mock cohort data blended with the current local session; no real PII is stored.
- The 23-step counter merges a few of the spec's adjacent message screens onto single screens (e.g.,
  the two networking/story scenarios share one screen) while preserving all questions and copy.
```
