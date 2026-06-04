// ============================================================
// Etihad Speaking Room AI Trainer — Core Types
// ============================================================

export type AssessmentAnswers = Record<number, number>; // questionId 1..15 -> 1..5

export interface Scores {
  overall: number;
  clarity: number;
  confidence: number;
  listening: number;
  storytelling: number;
  assertiveness: number;
  networking: number;
  growthMindset: number;
}

export interface PracticeAttempt {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  response: string;
  feedback: PracticeFeedback;
  createdAt: number;
}

export interface PracticeFeedback {
  overall: number;
  clarity: number;
  confidence: number;
  structure: number;
  empathy: number;
  persuasion: number;
  storytelling: number;
  didWell: string;
  improve: string;
  betterVersion: string;
  microChallenge: string;
}

export interface TrainingDay {
  day: number;
  title: string;
  task: string;
}

export interface UserProfile {
  // --- onboarding data ---
  selectedGoals: string[];
  age: number | null;
  roleModels: string[];
  otherRoleModel: string;
  powerSkillAwareness: string;
  assessmentAnswers: AssessmentAnswers;
  scenarioStory: string;
  scenarioNetworking: string;
  presentationFeeling: string;
  criticismReaction: string;
  selfGrowthBarrier: string;
  otherBarrier: string;
  selectedPowerSkill: string;
  learningStyle: string;
  favoriteLearningTime: string;
  dailyUpskillingGoal: string;
  selfReflects: string;
  friendlyPush: string;
  practiceBelief: string;
  finishesWhatStarts: string;
  email: string;

  // --- derived data ---
  scores: Scores;
  profileTitle: string;
  strengths: string[];
  growthAreas: string[];
  learnerChallengeType: string;
  trainingPlan: TrainingDay[];

  // --- engagement / progress ---
  attempts: PracticeAttempt[];
  badges: string[];
  streak: number;
  onboardingComplete: boolean;
  lastUpdated: number;
}

export const emptyScores: Scores = {
  overall: 0,
  clarity: 0,
  confidence: 0,
  listening: 0,
  storytelling: 0,
  assertiveness: 0,
  networking: 0,
  growthMindset: 0,
};

export const defaultProfile: UserProfile = {
  selectedGoals: [],
  age: null,
  roleModels: [],
  otherRoleModel: "",
  powerSkillAwareness: "",
  assessmentAnswers: {},
  scenarioStory: "",
  scenarioNetworking: "",
  presentationFeeling: "",
  criticismReaction: "",
  selfGrowthBarrier: "",
  otherBarrier: "",
  selectedPowerSkill: "",
  learningStyle: "",
  favoriteLearningTime: "",
  dailyUpskillingGoal: "",
  selfReflects: "",
  friendlyPush: "",
  practiceBelief: "",
  finishesWhatStarts: "",
  email: "",
  scores: { ...emptyScores },
  profileTitle: "",
  strengths: [],
  growthAreas: [],
  learnerChallengeType: "",
  trainingPlan: [],
  attempts: [],
  badges: [],
  streak: 0,
  onboardingComplete: false,
  lastUpdated: 0,
};
