// ============================================================
// Static content: goals, role models, questions, options
// ============================================================

export const SPEAKING_GOALS: string[] = [
  "Public Speaking",
  "Assertive Communication",
  "Storytelling",
  "Effective Communication",
  "Leadership Communication",
  "Negotiation",
  "Conflict Resolution",
  "Confidence Building",
  "Body Language",
  "Listening Skills",
  "Networking Communication",
  "Humor & Wit",
  "Social Confidence & Respectful Rapport",
  "Presentation Skills",
  "Interview Communication",
  "Team Communication",
  "Sales Pitching",
  "Emotional Intelligence in Communication",
];

export const POWER_SKILLS_GRID: { name: string; icon: string }[] = [
  { name: "Communication", icon: "💬" },
  { name: "Leadership", icon: "🧭" },
  { name: "Conflict Resolution", icon: "🤝" },
  { name: "Productivity", icon: "⚡" },
  { name: "Creativity", icon: "✨" },
  { name: "Networking", icon: "🌐" },
  { name: "Emotional Intelligence", icon: "❤️" },
  { name: "Negotiation", icon: "⚖️" },
  { name: "Critical Thinking", icon: "🧠" },
  { name: "Collaboration", icon: "👥" },
  { name: "Confidence", icon: "🔥" },
  { name: "Adaptability", icon: "🌱" },
];

export const GLOBAL_ROLE_MODELS: { name: string; trait: string }[] = [
  { name: "Steve Jobs", trait: "clarity, simplicity, product storytelling" },
  { name: "Oprah Winfrey", trait: "empathy, emotional connection" },
  { name: "Malala Yousafzai", trait: "courage and purpose" },
  { name: "Martin Luther King Jr.", trait: "vision, rhythm, and inspiration" },
  { name: "Brené Brown", trait: "vulnerability and authentic connection" },
  { name: "Michelle Obama", trait: "warmth, authenticity, and conviction" },
  { name: "Richard Branson", trait: "approachable, bold leadership" },
  { name: "Princess Diana", trait: "compassion and human connection" },
  { name: "Donald Glover", trait: "creativity and original expression" },
  { name: "Barack Obama", trait: "cadence, calm, and persuasion" },
  { name: "Simon Sinek", trait: "starting with why and purpose" },
  { name: "Jacinda Ardern", trait: "empathetic and steady leadership" },
  { name: "Nelson Mandela", trait: "dignity, patience, and moral clarity" },
  { name: "Tony Robbins", trait: "energy, motivation, and presence" },
];

export const ARAB_ROLE_MODELS: { name: string; trait: string }[] = [
  { name: "Sheikh Mohammed bin Rashid Al Maktoum", trait: "leadership clarity, ambition, future vision" },
  { name: "Queen Rania Al Abdullah", trait: "elegance, diplomacy, advocacy" },
  { name: "Ahmed Al Shugairi", trait: "simplicity and youth engagement" },
  { name: "Mahmoud Darwish", trait: "poetic language and emotional depth" },
  { name: "Gibran Khalil Gibran", trait: "wisdom and lyrical expression" },
  { name: "Dr. Mustafa Mahmoud", trait: "thoughtful, reflective explanation" },
  { name: "Bassem Youssef", trait: "humor, timing, and sharp messaging" },
  { name: "Sheikh Zayed bin Sultan Al Nahyan", trait: "vision, humility, and unity" },
  { name: "Sultan Qaboos bin Said", trait: "calm wisdom and diplomacy" },
  { name: "Anas Bukhash", trait: "deep questions and human conversation" },
  { name: "Nizar Qabbani", trait: "emotional, poetic language" },
  { name: "Fairuz", trait: "timeless, soulful expression" },
  { name: "Huda Al Khamis-Kanoo", trait: "cultural vision and advocacy" },
  { name: "Dr. Hayat Sindi", trait: "science communication and inspiration" },
];

// Role model -> training tone personalization
export const ROLE_MODEL_INSPIRATION: Record<string, string> = {
  "Steve Jobs":
    "Your training plan will focus on simple messages, strong openings, and memorable storytelling.",
  "Oprah Winfrey":
    "Your training plan will focus on emotional connection, empathy, and asking powerful questions.",
  "Malala Yousafzai":
    "Your training plan will focus on speaking with courage, purpose, and a clear message that matters.",
  "Martin Luther King Jr.":
    "Your training plan will focus on rhythm, vision, and language that inspires and moves people.",
  "Queen Rania Al Abdullah":
    "Your training plan will focus on elegant communication, advocacy, diplomacy, and clear public messaging.",
  "Ahmed Al Shugairi":
    "Your training plan will focus on simplicity, relevance, youth-friendly communication, and meaningful examples.",
  "Bassem Youssef":
    "Your training plan will focus on humor, timing, confidence, and message control.",
  "Sheikh Mohammed bin Rashid Al Maktoum":
    "Your training plan will focus on visionary leadership, concise direction, and future-focused messaging.",
  "Anas Bukhash":
    "Your training plan will focus on deep questions, genuine curiosity, and human conversation.",
  "Barack Obama":
    "Your training plan will focus on calm cadence, structured persuasion, and confident delivery.",
  "Simon Sinek":
    "Your training plan will focus on starting with why, clarity of purpose, and inspiring belief.",
};

export const POWER_SKILL_AWARENESS_OPTIONS = [
  "I already know them professionally",
  "I know a few skills",
  "I have heard the term but I am not sure",
  "I have never heard about power skills",
];

export const POWER_SKILL_AWARENESS_MESSAGES: Record<string, string> = {
  "I already know them professionally":
    "You already understand that communication is not just about speaking. It is about influence, clarity, leadership, and emotional intelligence. This journey will help you sharpen your power skills and turn them into a stronger advantage in your career and personal life.",
  "I know a few skills":
    "Great start. Power skills are the human abilities that help you connect, lead, persuade, solve problems, and grow. In this journey, we will turn what you already know into practical habits.",
  "I have heard the term but I am not sure":
    "No problem. Power skills are the skills that help people succeed beyond technical knowledge. They include communication, leadership, creativity, teamwork, empathy, conflict resolution, and problem-solving.",
  "I have never heard about power skills":
    "Power skills are the skills that help you connect with people, express your ideas, lead others, manage conflict, build trust, and move forward in life. They are often the difference between being talented and being truly influential.",
};

// ---- Self-assessment (1..5 scale) ----
export const ASSESSMENT_QUESTIONS: { id: number; text: string; negative: boolean }[] = [
  { id: 1, text: "I have trouble expressing my ideas clearly.", negative: true },
  { id: 2, text: "I try to avoid direct confrontation.", negative: true },
  { id: 3, text: "I can negotiate my way through difficult situations.", negative: false },
  { id: 4, text: "I often get lost in my thoughts when people are talking to me.", negative: true },
  { id: 5, text: "I feel nervous when speaking in front of others.", negative: true },
  { id: 6, text: "I can make a story exciting when sharing it with friends.", negative: false },
  { id: 7, text: "I struggle to keep people interested when I talk.", negative: true },
  { id: 8, text: "I find it easy to start conversations at networking events.", negative: false },
  { id: 9, text: "I usually hang back and wait for others to start conversations.", negative: true },
  { id: 10, text: "I feel confident presenting my ideas.", negative: false },
  { id: 11, text: "I listen carefully before responding.", negative: false },
  { id: 12, text: "I can explain complex ideas in a simple way.", negative: false },
  { id: 13, text: "I can handle criticism without becoming defensive.", negative: false },
  { id: 14, text: "I use body language effectively when speaking.", negative: false },
  { id: 15, text: "I can speak with confidence even when I feel pressure.", negative: false },
];

export const SCALE_LABELS = ["Never", "Rarely", "Sometimes", "Often", "Always"];

export const SCENARIO_STORY_OPTIONS = [
  "I make it exciting and people enjoy listening",
  "I start well but lose energy halfway",
  "I struggle to keep people interested",
  "I avoid telling stories because I do not know how",
  "I tell too many details and people lose focus",
];

export const SCENARIO_NETWORKING_OPTIONS = [
  "I easily start conversations",
  "I can start conversations, but I feel nervous",
  "I wait for others to talk to me",
  "I avoid networking if possible",
  "I do not know what to say after the first hello",
];

export const PRESENTATION_FEELING_OPTIONS = [
  "Confident and ready",
  "A little nervous but able to manage",
  "Very nervous",
  "I avoid presentations",
  "I feel prepared only if I memorize everything",
];

export const CRITICISM_OPTIONS = [
  "I see it as a growth opportunity",
  "I accept it but feel uncomfortable",
  "I become defensive",
  "I take it personally",
  "I avoid feedback whenever possible",
];

export const BARRIER_OPTIONS = [
  "I am too busy",
  "I do not practice consistently",
  "I do not know where to start",
  "I get bored quickly",
  "I fear judgment",
  "I have an unstable routine",
  "I procrastinate",
  "I lose motivation",
  "I compare myself to others",
  "Other",
];

export const POWER_SKILL_TO_BEGIN = [
  "Public Speaking",
  "Effective Communication",
  "Empathy",
  "Social Confidence & Respectful Rapport",
  "Confidence",
  "Body Language",
  "Storytelling",
  "Humor & Wit",
  "Negotiation",
  "Conflict Resolution",
  "Leadership Communication",
  "Active Listening",
  "Presentation Skills",
  "Networking",
  "Interview Communication",
];

export const LEARNING_STYLE_OPTIONS = [
  "Theoretical explanation",
  "Practical exercises",
  "Both theory and practice",
  "Real-life scenarios",
  "AI roleplay practice",
  "Short daily challenges",
];

export const LEARNING_TIME_OPTIONS = [
  "Morning",
  "During commute",
  "Any spare time",
  "Before bed",
  "During work/study breaks",
  "Weekend",
  "I prefer flexible reminders",
];

export const DAILY_GOAL_OPTIONS = [
  {
    label: "Casual",
    desc: "I want to improve slowly and comfortably.",
    intensity: "Casual — 5 to 10 minutes daily",
  },
  {
    label: "Bold",
    desc: "I want to challenge myself and grow faster.",
    intensity: "Bold — 10 to 15 minutes daily",
  },
  {
    label: "Serious",
    desc: "I want structured learning with clear progress.",
    intensity: "Serious — 15 to 25 minutes daily",
  },
  {
    label: "Ambitious",
    desc: "I want strong transformation and measurable improvement.",
    intensity: "Ambitious — 25 to 40 minutes daily",
  },
];

// Rotating emotional headlines (welcome / loading / dashboard)
export const TRANSFORMATION_HEADLINES = [
  "I used to be afraid of public speaking.",
  "I was horrible at public speaking.",
  "I never knew how to express my ideas.",
  "I avoided presentations until I trained my voice.",
  "I had ideas, but I did not know how to say them.",
  "I was nervous… then I learned how to speak with power.",
];

export const EMOTIONAL_HOOKS = [
  "I was afraid to speak. Now I know how to lead with my voice.",
  "I had powerful ideas, but I did not know how to express them.",
  "I used to avoid presentations. Now I train for them.",
  "Confidence is not magic. It is practice, feedback, and repetition.",
  "Your voice is not just sound. It is influence.",
  "Communication opens doors before your CV does.",
  "Power skills are how talent becomes visible.",
  "Strong speakers are not born. They are trained.",
  "Your next opportunity may depend on how clearly you speak.",
  "Every powerful message starts with one clear sentence.",
];

// Practice scenarios
export const PRACTICE_SCENARIOS: {
  id: string;
  title: string;
  coachLines: string[];
}[] = [
  {
    id: "intro30",
    title: "Introduce yourself in 30 seconds",
    coachLines: ["Speak with clarity.", "Start with who you are.", "Add what you do.", "End with what value you bring."],
  },
  {
    id: "shortstory",
    title: "Tell a short story",
    coachLines: ["Set the scene quickly.", "Introduce a challenge.", "Show the action.", "End with a clear lesson."],
  },
  {
    id: "explainidea",
    title: "Explain an idea clearly",
    coachLines: ["Lead with the core message.", "Use one simple example.", "Avoid jargon.", "Summarize in one line."],
  },
  {
    id: "disagree",
    title: "Handle disagreement respectfully",
    coachLines: ["Acknowledge the other view.", "State your position calmly.", "Use 'I' statements.", "Look for common ground."],
  },
  {
    id: "project",
    title: "Present a project",
    coachLines: ["Open with the goal.", "Share the key result.", "Keep it structured.", "Close with next steps."],
  },
  {
    id: "networking",
    title: "Start a networking conversation",
    coachLines: ["Open warmly.", "Ask a genuine question.", "Listen actively.", "Find a shared interest."],
  },
  {
    id: "criticism",
    title: "Respond to criticism",
    coachLines: ["Stay calm and open.", "Thank them for the input.", "Reflect before reacting.", "Show what you will do next."],
  },
  {
    id: "negotiate",
    title: "Negotiate a simple situation",
    coachLines: ["State what you want clearly.", "Explain the why.", "Stay respectful.", "Offer a fair option."],
  },
  {
    id: "pressure",
    title: "Speak with confidence under pressure",
    coachLines: ["Breathe before you start.", "Slow down your pace.", "Use a strong first line.", "Keep eye contact."],
  },
  {
    id: "leadership",
    title: "Give a leadership update",
    coachLines: ["Start with the headline.", "Share progress and blockers.", "Be concise.", "End with a clear call to action."],
  },
  {
    id: "interview",
    title: "Practice an interview answer",
    coachLines: ["Use the STAR structure.", "Situation and task first.", "Then your action.", "End with the result."],
  },
  {
    id: "openpresentation",
    title: "Open a presentation strongly",
    coachLines: ["Hook with a question or fact.", "State why it matters.", "Preview your message.", "Project calm energy."],
  },
];

export const ALL_BADGES: { name: string; icon: string; hint: string }[] = [
  { name: "First Speech", icon: "🎤", hint: "Complete your first practice." },
  { name: "Story Builder", icon: "📖", hint: "Practice a storytelling scenario." },
  { name: "Confident Voice", icon: "🔥", hint: "Score 75+ on confidence." },
  { name: "Active Listener", icon: "👂", hint: "Practice a listening-focused scenario." },
  { name: "Networking Starter", icon: "🌐", hint: "Practice a networking scenario." },
  { name: "Presentation Ready", icon: "📊", hint: "Practice presenting." },
  { name: "Conflict Resolver", icon: "🤝", hint: "Practice handling disagreement." },
  { name: "Power Communicator", icon: "⚡", hint: "Score 85+ overall in practice." },
  { name: "Consistency Builder", icon: "📈", hint: "Reach a 3-day streak." },
  { name: "Feedback Champion", icon: "🏆", hint: "Complete 5 practices." },
];

export const PROFILE_TITLES = [
  "Emerging Communicator",
  "Developing Communicator",
  "Confident Speaker",
  "Reflective Communicator",
  "Story-Driven Speaker",
  "Strategic Communicator",
  "Quiet Builder",
  "High-Potential Communicator",
  "Influence Builder",
  "Power Communicator",
];
