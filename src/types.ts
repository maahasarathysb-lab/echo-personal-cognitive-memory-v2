export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

export interface Interaction {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  summary?: string;
}

export interface GeminiReflectRequest {
  prompt: string;
  history?: Array<{
    role: 'user' | 'model';
    content: string;
  }>;
}

export interface GeminiReflectResponse {
  text: string;
  model: string;
}

export interface GeminiSummarizeRequest {
  text: string;
}

export interface GeminiSummarizeResponse {
  summary: string;
  model: string;
}

export interface SupportingMemory {
  date: string;
  reflectionTitle: string;
  excerpt: string;
}

export interface AskPastSelfRequest {
  question: string;
  clientMemories?: Interaction[];
}

export interface AskPastSelfResponse {
  answer: string;
  hasEnoughMemories: boolean;
  supportingMemories: SupportingMemory[];
  interpretation: string;
  model?: string;
}

export interface HealthResponse {
  status: string;
}

export type NavView =
  | 'reflect'
  | 'memory'
  | 'ask_past_self'
  | 'decisions'
  | 'thought_evolution'
  | 'insights';

export type ReflectionActionType = 'key_insights' | 'summarize' | 'next_steps' | 'brainstorm';

export interface ActionRequest {
  action: ReflectionActionType;
  content: string;
  history?: Array<{
    role: 'user' | 'model';
    content: string;
  }>;
}

export interface ActionResponse {
  action: ReflectionActionType;
  result: string;
  model: string;
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  date: string;
  reasons: string[];
  alternativesConsidered: string[];
  confidenceScore: number; // 1 to 10
  expectedOutcome: string;
  actualOutcome?: string;
  reflectionLesson?: string;
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface AnalyzeDecisionRequest {
  decision: Decision;
}

export interface AnalyzeDecisionResponse {
  analysis: string;
  keyTakeaways: string[];
  model: string;
}

export interface ThoughtEvolutionStage {
  date: string;
  reflectionTitle: string;
  thoughtExcerpt: string;
  shiftSummary: string;
}

export interface ThoughtEvolutionRequest {
  topic: string;
  clientMemories?: Interaction[];
}

export interface ThoughtEvolutionResponse {
  topic: string;
  timeline: ThoughtEvolutionStage[];
  inflectionPoints: string[];
  recurringThemes: string[];
  evolutionSynthesis: string;
  hasEnoughMemories: boolean;
  model?: string;
}

export interface EchoInsightsRequest {
  clientMemories?: Interaction[];
}

export interface EchoInsightsResponse {
  recurringThemes: string[];
  frequentlyDiscussedTopics: string[];
  changesInPriorities: string[];
  repeatedConcerns: string[];
  positiveProgress: string[];
  unresolvedPatterns: string[];
  supportingMemories: SupportingMemory[];
  hasEnoughMemories: boolean;
  model?: string;
}

