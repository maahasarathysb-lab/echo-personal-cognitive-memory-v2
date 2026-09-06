import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { initializeApp as initAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

// Determine Firebase Project ID and Firestore Database ID securely
let firebaseProjectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
let firestoreDbId = process.env.FIRESTORE_DATABASE_ID || '(default)';

try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!firebaseProjectId && cfg.projectId) {
      firebaseProjectId = cfg.projectId;
    }
    if (cfg.firestoreDatabaseId) {
      firestoreDbId = cfg.firestoreDatabaseId;
    }
  }
} catch {
  // Intentionally suppressed
}

// Initialize Firebase Admin for server-side token validation
const adminApp = !getAdminApps().length
  ? initAdminApp({
      projectId: firebaseProjectId || undefined,
    })
  : getAdminApps()[0];

const adminAuth = getAdminAuth(adminApp);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '100kb' }));

// Health Check endpoint (Public, does not leak secrets)
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

// Security Middleware: Authoritative Firebase ID token verification
async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized: Empty bearer token' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (!decoded || !decoded.uid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
    }
    // Bind authoritative user identity derived from cryptographic token verification
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
    };
    return next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '';
    // Never expose internal stack traces or secrets to the client
    if (message.includes('expired')) {
      return res.status(401).json({ error: 'Unauthorized: Token has expired' });
    }
    return res.status(401).json({ error: 'Unauthorized: Token verification failed' });
  }
}

// Resilient Gemini Model Fallback Ladder
const FALLBACK_LADDER = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
] as const;

interface FallbackResult {
  text: string;
  model: string;
}

interface GenerateOptions {
  systemInstruction?: string;
  totalTimeoutMs?: number;
  temperature?: number;
  responseMimeType?: string;
}

/**
 * Executes a Gemini content generation request through the fallback ladder.
 * Bounded timeout per model: 12 seconds.
 * Fresh AbortController instantiated for each attempt.
 * Transient errors (429, 503, 404, 500, timeouts) sequentially cascade to the next model.
 */
async function generateWithFallback(
  contents: Array<{ role: string; parts: Array<{ text: string }> }>,
  options?: GenerateOptions | string,
  totalTimeoutMsParam = 48000
): Promise<FallbackResult> {

  const systemInstruction = typeof options === 'string' ? options : options?.systemInstruction;
  const totalTimeoutMs = typeof options === 'object' && options?.totalTimeoutMs ? options.totalTimeoutMs : totalTimeoutMsParam;
  const temperature = typeof options === 'object' && options?.temperature !== undefined ? options.temperature : 0.7;
  const responseMimeType = typeof options === 'object' ? options?.responseMimeType : undefined;

  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0544024101',
    location: 'us-central1',
  });
  const deadline = Date.now() + totalTimeoutMs;
  let lastError: unknown = null;

  for (const model of FALLBACK_LADDER) {
    const remainingTime = deadline - Date.now();
    if (remainingTime <= 1000) {
      break;
    }

    const attemptTimeout = Math.min(12000, remainingTime);
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), attemptTimeout);

    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: systemInstruction || undefined,
          abortSignal: controller.signal,
          temperature,
          responseMimeType,
        },
      });

      const text = response?.text;
      if (typeof text === 'string' && text.trim().length > 0) {
        return { text: text.trim(), model };
      }
    } catch (err: unknown) {
      lastError = err;
      // Continue to next model in fallback ladder without leaking credentials in logs
      const errName = err instanceof Error ? err.name : 'UnknownError';
      const errMsg = err instanceof Error ? err.message : '';
      console.warn(`Fallback attempt for model ${model} did not complete (${errName}: ${errMsg.substring(0, 80)}). Cascading...`);
    } finally {
      clearTimeout(timerId);
    }
  }

  throw new Error(
    `All models in fallback ladder exhausted. Last error: ${
      lastError instanceof Error ? lastError.message : 'Unknown failure'
    }`
  );
}

// POST /api/gemini/reflect
app.post('/api/gemini/reflect', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  // Defensive Payload Ingestion
  const payload = (req.body && typeof req.body === 'object') ? req.body : {};
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';

  // Input Validation & Length Limits
  if (!prompt) {
    return res.status(400).json({ error: 'A journal prompt is required' });
  }

  if (prompt.length > 5000) {
    return res.status(400).json({ error: 'Journal prompt exceeds maximum limit of 5,000 characters' });
  }

  const rawHistory = Array.isArray(payload.history) ? payload.history : [];
  if (rawHistory.length > 20) {
    return res.status(400).json({ error: 'Conversation history exceeds maximum limit of 20 turns' });
  }

  // Format and sanitize history turns
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  for (const turn of rawHistory) {
    if (!turn || typeof turn !== 'object') continue;
    const role = turn.role === 'model' ? 'model' : 'user';
    const content = typeof turn.content === 'string' ? turn.content.trim() : '';
    if (!content) continue;

    // Sanitize message turn length (max 4,000 characters)
    const sanitizedContent = content.length > 4000 ? content.slice(0, 4000) : content;
    contents.push({
      role,
      parts: [{ text: sanitizedContent }],
    });
  }

  // Append the current turn
  contents.push({
    role: 'user',
    parts: [{ text: prompt }],
  });

  const systemInstruction =
    'You are ECHO, a deeply thoughtful, calm, and insightful cognitive reflection partner. ' +
    'You help the user explore their thoughts, understand cognitive patterns, and gently offer clarifying questions and perspective. ' +
    'Keep your reflections empathetic, clear, intelligent, and grounded. Do not lecture, give unsolicited generic advice, or act like a generic assistant.';

  try {
    const result = await generateWithFallback(contents, systemInstruction);
    return res.status(200).json({
      text: result.text,
      model: result.model,
    });
  } catch {
    // Return safe generic error without exposing server internals or API keys
    return res.status(503).json({
      error: 'Unable to generate reflection at this time. Please retry in a moment.',
    });
  }
});

// POST /api/gemini/summarize
app.post('/api/gemini/summarize', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const payload = (req.body && typeof req.body === 'object') ? req.body : {};
  const text = typeof payload.text === 'string' ? payload.text.trim() : '';

  if (!text) {
    return res.status(400).json({ error: 'Text content is required for summarization' });
  }

  const boundedText = text.length > 4000 ? text.slice(0, 4000) : text;
  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: `Given the following journal entry, provide a concise, meaningful title (under 6 words) that captures the core cognitive theme. Respond with only the title and no quotes or punctuation.\n\nEntry:\n${boundedText}`,
        },
      ],
    },
  ];

  try {
    const result = await generateWithFallback(contents, undefined, 24000);
    return res.status(200).json({
      summary: result.text,
      model: result.model,
    });
  } catch {
    return res.status(503).json({
      error: 'Unable to generate summary at this time.',
    });
  }
});

// Helper types & functions for Firestore REST document parsing
interface FirestoreField {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  mapValue?: { fields?: Record<string, FirestoreField> };
  arrayValue?: { values?: FirestoreField[] };
  timestampValue?: string;
}

function parseFirestoreField(field: FirestoreField): any {
  if (!field || typeof field !== 'object') return null;
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return parseInt(field.integerValue, 10);
  if (field.doubleValue !== undefined) return field.doubleValue;
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.timestampValue !== undefined) return field.timestampValue;
  if (field.mapValue?.fields) {
    const obj: Record<string, any> = {};
    for (const [k, v] of Object.entries(field.mapValue.fields)) {
      obj[k] = parseFirestoreField(v);
    }
    return obj;
  }
  if (field.arrayValue) {
    return (field.arrayValue.values || []).map(parseFirestoreField);
  }
  return null;
}

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'didn', 'do', 'does', 'doing', 'don', 'down', 'during', 'each', 'few', 'for',
  'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
  'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me',
  'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only',
  'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn', 'we',
  'were', 'weren', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would',
  'you', 'your', 'yours', 'yourself', 'yourselves'
]);

function extractRootStem(term: string): string {
  if (term.length <= 3) return term;
  if (term.endsWith('ing') && term.length > 5) return term.slice(0, -3);
  if (term.endsWith('edly') && term.length > 6) return term.slice(0, -4);
  if (term.endsWith('ed') && term.length > 4) return term.slice(0, -2);
  if (term.endsWith('ies') && term.length > 5) return term.slice(0, -3) + 'y';
  if (term.endsWith('es') && term.length > 4) return term.slice(0, -2);
  if (term.endsWith('s') && !term.endsWith('ss') && term.length > 3) return term.slice(0, -1);
  if (term.endsWith('tion') && term.length > 6) return term.slice(0, -4);
  if (term.endsWith('ment') && term.length > 6) return term.slice(0, -4);
  return term;
}

interface ScoreBreakdown {
  combinedScore: number;
  lexicalScore: number;
  conceptScore: number;
}

function scoreMemoryHybrid(
  title: string,
  userText: string,
  reflectionText: string,
  query: string,
  concepts: string[]
): ScoreBreakdown {
  const qLower = query.toLowerCase();
  const titleLower = title.toLowerCase();
  const userLower = userText.toLowerCase();
  const reflectionLower = reflectionText.toLowerCase();
  const allText = `${titleLower} ${userLower} ${reflectionLower}`;

  // 1. Lexical Scoring
  let lexicalScore = 0;
  const qTerms = qLower
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));

  if (userLower.includes(qLower) || reflectionLower.includes(qLower)) {
    lexicalScore += 10;
  }
  if (titleLower.includes(qLower)) {
    lexicalScore += 12;
  }

  for (const term of qTerms) {
    let termFound = false;
    if (titleLower.includes(term)) {
      lexicalScore += 6;
      termFound = true;
    }
    if (userLower.includes(term)) {
      lexicalScore += 4;
      termFound = true;
    }
    if (reflectionLower.includes(term)) {
      lexicalScore += 2;
      termFound = true;
    }

    if (!termFound) {
      const stem = extractRootStem(term);
      if (stem.length >= 4) {
        if (titleLower.includes(stem)) lexicalScore += 3;
        if (userLower.includes(stem)) lexicalScore += 2;
      }
    }
  }

  // 2. Concept / Semantic Scoring
  let conceptScore = 0;
  const seenConcepts = new Set<string>();

  for (const rawConcept of concepts) {
    const concept = rawConcept.trim().toLowerCase();
    if (!concept || concept.length <= 2 || STOP_WORDS.has(concept) || seenConcepts.has(concept)) {
      continue;
    }
    seenConcepts.add(concept);

    if (concept.includes(' ')) {
      // Multi-word phrase concept
      if (titleLower.includes(concept)) {
        conceptScore += 8;
      } else if (userLower.includes(concept)) {
        conceptScore += 7;
      } else if (reflectionLower.includes(concept)) {
        conceptScore += 3;
      } else {
        const words = concept.split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
        if (words.length > 1 && words.every((w) => allText.includes(w))) {
          conceptScore += 5;
        }
      }
    } else {
      // Single word concept
      let matched = false;
      if (titleLower.includes(concept)) {
        conceptScore += 5;
        matched = true;
      }
      if (userLower.includes(concept)) {
        conceptScore += 3;
        matched = true;
      }
      if (reflectionLower.includes(concept)) {
        conceptScore += 1;
        matched = true;
      }

      if (!matched) {
        const stem = extractRootStem(concept);
        if (stem.length >= 4) {
          if (titleLower.includes(stem)) conceptScore += 3;
          if (userLower.includes(stem)) conceptScore += 2;
        }
      }
    }
  }

  const combinedScore = lexicalScore + conceptScore;
  return {
    combinedScore,
    lexicalScore,
    conceptScore,
  };
}

async function expandQueryConcepts(question: string): Promise<string[]> {
  const prompt = `You are a query concept expansion assistant for a personal reflection journal search.
Given a user's reflective question, output 12 to 22 search concepts, synonyms, related work/life topics, emotional/mental states, and domain phrases that might appear in their past journal entries.
CRITICAL RULES:
- Include both broad synonyms and specific subtopics/terms that someone writing reflections about this topic would use.
- For career questions, include terms like: career, job, profession, career direction, career choice, AI engineering, data analytics, software development, technical work, management, leadership, role.
- For mental/emotional states (e.g. scattered, stuck), include terms like: scattered, overwhelmed, competing priorities, parallel decisions, uncertainty, lack of focus, distracted, torn, task switching.
- For struggles or dilemmas, include terms like: decisions, struggling, weighing alternatives, uncertainty, trade-offs, dilemma, options, crossroads, hesitation.
- For technical activities (e.g. coding), include terms like: hands-on coding, programming, software, building, energized, revitalized, flow state, creative momentum.
- Output ONLY a valid JSON object: { "concepts": ["concept1", "concept2", ...] }
- Do NOT answer the question or make claims.

User Question: "${question}"`;

  try {
    const res = await generateWithFallback(
      [{ role: 'user', parts: [{ text: prompt }] }],
      {
        temperature: 0.1,
        responseMimeType: 'application/json',
        totalTimeoutMs: 12000,
      }
    );

    const cleanJson = (res.text || '').replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    const parsed = JSON.parse(cleanJson);
    if (Array.isArray(parsed.concepts)) {
      return parsed.concepts
        .filter((c: any) => typeof c === 'string' && c.trim().length > 1)
        .map((c: string) => c.trim().toLowerCase());
    }
    return [];
  } catch (err) {
    console.warn('Query concept expansion non-fatal fallback:', err instanceof Error ? err.message : err);
    return [];
  }
}

interface RawInteraction {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{ role: string; content: string; timestamp?: string }>;
}

async function fetchUserInteractionsFromFirestore(
  projectId: string,
  databaseId: string,
  uid: string,
  authHeader: string
): Promise<RawInteraction[]> {
  const dbId = databaseId || '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/users/${encodeURIComponent(uid)}/interactions?pageSize=30`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!res.ok) {
      console.warn(`Firestore REST request responded with status ${res.status}`);
      return [];
    }

    const data = (await res.json()) as { documents?: Array<{ name: string; fields: Record<string, FirestoreField> }> };
    if (!data.documents || !Array.isArray(data.documents)) {
      return [];
    }

    return data.documents.map((doc) => {
      const id = doc.name.split('/').pop() || '';
      const fields = doc.fields || {};
      const parsed: Record<string, any> = {};
      for (const [k, v] of Object.entries(fields)) {
        parsed[k] = parseFirestoreField(v);
      }
      return {
        id,
        title: typeof parsed.title === 'string' ? parsed.title : 'Untitled Reflection',
        createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      };
    });
  } catch (err) {
    console.warn('Firestore REST fetch exception:', err instanceof Error ? err.message : err);
    return [];
  }
}

// POST /api/gemini/ask-past-self
app.post('/api/gemini/ask-past-self', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  // CRITICAL SECURITY: UID is derived STRICTLY from the verified Firebase ID token.
  // Never accept any client-supplied userId.
  const uid = req.user?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'Unauthorized: Missing verified user context' });
  }

  const payload = (req.body && typeof req.body === 'object') ? req.body : {};
  const question = typeof payload.question === 'string' ? payload.question.trim() : '';

  if (!question || question.length === 0) {
    return res.status(400).json({ error: 'A valid question is required' });
  }

  if (question.length > 1000) {
    return res.status(400).json({ error: 'Question exceeds maximum length of 1000 characters' });
  }

  const authHeader = req.headers.authorization as string;

  // Retrieve user's historical reflections belonging ONLY to that UID
  let rawInteractions: RawInteraction[] = [];
  if (firebaseProjectId) {
    rawInteractions = await fetchUserInteractionsFromFirestore(
      firebaseProjectId,
      firestoreDbId,
      uid,
      authHeader
    );
  }

  // Fallback to client-provided authenticated session reflections if REST API returned empty
  if (rawInteractions.length === 0 && Array.isArray(payload.clientMemories)) {
    rawInteractions = payload.clientMemories
      .filter((m: any) => m && typeof m === 'object' && typeof m.title === 'string' && Array.isArray(m.messages))
      .map((m: any) => ({
        id: typeof m.id === 'string' ? m.id : '',
        title: m.title,
        createdAt: typeof m.createdAt === 'string' ? m.createdAt : new Date().toISOString(),
        updatedAt: typeof m.updatedAt === 'string' ? m.updatedAt : new Date().toISOString(),
        messages: m.messages,
      }));
  }

  const INSUFFICIENT_MEMORY_ANSWER = "I couldn't find enough relevant memories in your reflections to answer that confidently.";

  // If no reflections exist in user's history, return immediate grounded response
  if (rawInteractions.length === 0) {
    return res.status(200).json({
      answer: INSUFFICIENT_MEMORY_ANSWER,
      hasEnoughMemories: false,
      supportingMemories: [],
      interpretation: '',
      model: FALLBACK_LADDER[0],
    });
  }

  // 1. Expand query concepts using lightweight Gemini semantic expansion
  const expandedConcepts = await expandQueryConcepts(question);

  // 2. Bounded hybrid retrieval strategy: format, score, and select top relevant memories
  interface CandidateMemory {
    id: string;
    title: string;
    dateStr: string;
    userText: string;
    assistantText: string;
    score: number;
    lexicalScore: number;
    conceptScore: number;
    rawText: string;
  }

  const candidates: CandidateMemory[] = rawInteractions.map((item) => {
    const title = item.title || 'Untitled Reflection';
    const rawDate = item.createdAt || item.updatedAt;
    let dateStr = 'Unknown date';
    try {
      dateStr = new Date(rawDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      dateStr = rawDate;
    }

    const userMsgs = (item.messages || [])
      .filter((m) => m.role === 'user' && typeof m.content === 'string')
      .map((m) => m.content.trim())
      .filter(Boolean);

    const assistantMsgs = (item.messages || [])
      .filter((m) => m.role === 'model' && typeof m.content === 'string')
      .map((m) => m.content.trim())
      .filter(Boolean);

    const userText = userMsgs.join(' ');
    const assistantText = assistantMsgs.join(' ');
    const { combinedScore, lexicalScore, conceptScore } = scoreMemoryHybrid(
      title,
      userText,
      assistantText,
      question,
      expandedConcepts
    );

    const rawText = `Date: ${dateStr}\nTitle: ${title}\nUser wrote: ${userMsgs.join('\n')}\nECHO reflection: ${assistantMsgs.join('\n')}`;

    return {
      id: item.id,
      title,
      dateStr,
      userText,
      assistantText,
      score: combinedScore,
      lexicalScore,
      conceptScore,
      rawText,
    };
  });

  // CRITICAL ZERO-RELEVANCE GUARD:
  // Filter out any memory that has zero relevance (no lexical match and no concept match).
  // If none of the user's memories contain meaningful evidence relevant to the question,
  // short-circuit IMMEDIATELY. Do NOT pass arbitrary recent memories to Gemini!
  const relevantCandidates = candidates.filter((c) => c.score > 0);

  if (relevantCandidates.length === 0) {
    return res.status(200).json({
      answer: INSUFFICIENT_MEMORY_ANSWER,
      hasEnoughMemories: false,
      supportingMemories: [],
      interpretation: '',
      model: FALLBACK_LADDER[0],
    });
  }

  // Sort relevant candidates by combined relevance score descending
  relevantCandidates.sort((a, b) => b.score - a.score);

  // Select top 5 to 8 bounded memories (maximum 8 memories sent to Gemini)
  const selectedCandidates = relevantCandidates.slice(0, 8);

  const formattedMemories = selectedCandidates
    .map((c, idx) => `--- Reflection ${idx + 1} (Relevance Score: ${c.score}) ---\n${c.rawText}`)
    .join('\n\n');

  const systemInstruction = `You are ECHO's "Ask Your Past Self" cognitive memory engine.
Your task is to answer a user's question about their past reflections, thinking, and decisions based STRICTLY AND ONLY on the provided retrieved memories.

STRICT GROUNDING RULES:
1. NEVER fabricate, invent, assume, or extrapolate past memories, events, dates, or feelings that are not explicitly documented in the provided memories.
2. If the provided memories do NOT contain enough information or relevance to answer the question confidently, your answer MUST BE EXACTLY:
"I couldn't find enough relevant memories in your reflections to answer that confidently."
Set "hasEnoughMemories": false, set "supportingMemories": [], and set "interpretation": "".
DO NOT generate any interpretation, inferred historical patterns, or claims about the user if sufficient relevant memories are not found.
3. If there ARE sufficient relevant memories in the provided text to answer the question, your response MUST be structured as valid JSON with:
   - "answer": A direct, grounded synthesis answering the user's question, citing evidence strictly from their past reflections.
   - "hasEnoughMemories": true
   - "supportingMemories": A non-empty list of the specific memories used, each with:
     - "date": Date of the reflection (e.g. "Sep 1, 2026")
     - "reflectionTitle": Title of the reflection
     - "excerpt": Short, exact quote or faithful excerpt from what the user thought/wrote.
   - "interpretation": Labeled clearly as ECHO's cognitive interpretation. Analyze how the user's patterns, beliefs, or emotions have shifted or remained consistent over time.

Respond with raw JSON only matching the schema.`;

  const userContent = `User Question: ${question}\n\nRetrieved Historical Memories:\n${formattedMemories}`;

  try {
    const result = await generateWithFallback(
      [
        {
          role: 'user',
          parts: [{ text: userContent }],
        },
      ],
      {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json',
        totalTimeoutMs: 36000,
      }
    );

    let parsed: any;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      // Fallback in case response contained slight formatting
      const cleanJson = result.text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      parsed = JSON.parse(cleanJson);
    }

    let answer = typeof parsed.answer === 'string'
      ? parsed.answer.trim()
      : INSUFFICIENT_MEMORY_ANSWER;
    let hasEnoughMemories = Boolean(parsed.hasEnoughMemories);
    let supportingMemories = Array.isArray(parsed.supportingMemories)
      ? parsed.supportingMemories.map((sm: any) => ({
          date: typeof sm.date === 'string' ? sm.date : '',
          reflectionTitle: typeof sm.reflectionTitle === 'string' ? sm.reflectionTitle : 'Past Reflection',
          excerpt: typeof sm.excerpt === 'string' ? sm.excerpt : '',
        })).filter((sm: any) => sm.excerpt || sm.reflectionTitle)
      : [];
    let interpretation = typeof parsed.interpretation === 'string' ? parsed.interpretation.trim() : '';

    // Security & Grounding requirement:
    // The backend remains the authority for whether sufficient historical context exists.
    // If hasEnoughMemories is false, or the answer indicates insufficient memories,
    // or zero supporting memories were identified, strictly prohibit generating or returning any interpretation.
    if (
      !hasEnoughMemories ||
      answer.includes("couldn't find enough relevant memories") ||
      supportingMemories.length === 0
    ) {
      hasEnoughMemories = false;
      answer = INSUFFICIENT_MEMORY_ANSWER;
      supportingMemories = [];
      interpretation = '';
    }

    return res.status(200).json({
      answer,
      hasEnoughMemories,
      supportingMemories,
      interpretation,
      model: result.model,
    });
  } catch (err: unknown) {
    console.error('Ask Past Self generation error:', err instanceof Error ? err.message : err);
    return res.status(503).json({
      error: 'Unable to query past memories at this moment. Please try again shortly.',
    });
  }
});

// POST /api/gemini/action
// Phase 2: Useful AI Reflection Actions (Key Insights, Summarize, Next Steps, Brainstorm)
app.post('/api/gemini/action', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const payload = (req.body && typeof req.body === 'object') ? req.body : {};
  const action = typeof payload.action === 'string' ? payload.action.trim().toLowerCase() : '';
  const content = typeof payload.content === 'string' ? payload.content.trim() : '';

  const ALLOWED_ACTIONS = ['key_insights', 'summarize', 'next_steps', 'brainstorm'];
  if (!ALLOWED_ACTIONS.includes(action)) {
    return res.status(400).json({ error: 'Invalid action requested' });
  }

  if (!content) {
    return res.status(400).json({ error: 'Reflection content is required' });
  }

  const boundedContent = content.length > 5000 ? content.slice(0, 5000) : content;

  let systemInstruction = 'You are ECHO, a deeply reflective and calm cognitive companion. ';
  let userPrompt = '';

  switch (action) {
    case 'key_insights':
      systemInstruction += 'Your task is to identify 3 to 5 core cognitive themes, underlying assumptions, and recurring values expressed in this reflection. Present them clearly and concisely with brief explanations.';
      userPrompt = `Please analyze the key cognitive insights and underlying patterns in this reflection:\n\n${boundedContent}`;
      break;
    case 'summarize':
      systemInstruction += 'Your task is to provide an elegant, thoughtful 2 to 3 sentence cognitive synthesis of this reflection. Capture the essence of what the user is navigating.';
      userPrompt = `Please provide a thoughtful 2-3 sentence summary capturing the crux of this reflection:\n\n${boundedContent}`;
      break;
    case 'next_steps':
      systemInstruction += 'Your task is to suggest 3 to 4 thoughtful, low-pressure micro-actions or reflective questions the user can explore next, fostering clarity and calm intentionality.';
      userPrompt = `Based on this reflection, suggest 3-4 grounded, actionable next steps or reflective inquiry points:\n\n${boundedContent}`;
      break;
    case 'brainstorm':
      systemInstruction += 'Your task is to provide 4 to 5 creative, constructive alternative perspectives, reframings, or thought experiments to help the user look at their situation from fresh angles.';
      userPrompt = `Brainstorm 4-5 constructive alternative angles or thought experiments for this situation:\n\n${boundedContent}`;
      break;
  }

  try {
    const result = await generateWithFallback(
      [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction,
      28000
    );

    return res.status(200).json({
      action,
      result: result.text,
      model: result.model,
    });
  } catch {
    return res.status(503).json({
      error: 'Unable to perform reflection action at this time. Please retry.',
    });
  }
});

// POST /api/gemini/thought-evolution
// Phase 4: Thought Evolution over Time
app.post('/api/gemini/thought-evolution', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'Unauthorized: Missing user context' });
  }

  const payload = (req.body && typeof req.body === 'object') ? req.body : {};
  const topic = typeof payload.topic === 'string' ? payload.topic.trim() : '';

  if (!topic) {
    return res.status(400).json({ error: 'A topic is required' });
  }

  if (topic.length > 200) {
    return res.status(400).json({ error: 'Topic exceeds maximum allowed length' });
  }

  const authHeader = req.headers.authorization as string;

  let rawInteractions: RawInteraction[] = [];
  if (firebaseProjectId) {
    rawInteractions = await fetchUserInteractionsFromFirestore(
      firebaseProjectId,
      firestoreDbId,
      uid,
      authHeader
    );
  }

  if (rawInteractions.length === 0 && Array.isArray(payload.clientMemories)) {
    rawInteractions = payload.clientMemories
      .filter((m: any) => m && typeof m === 'object' && typeof m.title === 'string' && Array.isArray(m.messages))
      .map((m: any) => ({
        id: typeof m.id === 'string' ? m.id : '',
        title: m.title,
        createdAt: typeof m.createdAt === 'string' ? m.createdAt : new Date().toISOString(),
        updatedAt: typeof m.updatedAt === 'string' ? m.updatedAt : new Date().toISOString(),
        messages: m.messages,
      }));
  }

  const INSUFFICIENT_EVOLUTION = {
    topic,
    timeline: [],
    inflectionPoints: [],
    recurringThemes: [],
    evolutionSynthesis: `I couldn't find enough historical reflections regarding "${topic}" to trace your thought evolution yet. As you record more reflections on this theme, ECHO will map your trajectory here.`,
    hasEnoughMemories: false,
    model: FALLBACK_LADDER[0],
  };

  if (rawInteractions.length === 0) {
    return res.status(200).json(INSUFFICIENT_EVOLUTION);
  }

  const expandedConcepts = await expandQueryConcepts(topic);

  // Score memories using hybrid scoring
  const scored = rawInteractions.map((item) => {
    const title = item.title || 'Untitled Reflection';
    const userMsgs = (item.messages || [])
      .filter((m) => m.role === 'user' && typeof m.content === 'string')
      .map((m) => m.content.trim())
      .filter(Boolean);
    const assistantMsgs = (item.messages || [])
      .filter((m) => m.role === 'model' && typeof m.content === 'string')
      .map((m) => m.content.trim())
      .filter(Boolean);

    const userText = userMsgs.join(' ');
    const assistantText = assistantMsgs.join(' ');
    const { combinedScore } = scoreMemoryHybrid(title, userText, assistantText, topic, expandedConcepts);

    const rawDate = item.createdAt || item.updatedAt;
    let dateStr = 'Unknown date';
    try {
      dateStr = new Date(rawDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      dateStr = rawDate;
    }

    return {
      id: item.id,
      title,
      dateStr,
      timestamp: new Date(rawDate).getTime() || 0,
      userText: userText.slice(0, 1000),
      score: combinedScore,
    };
  });

  const relevant = scored.filter((s) => s.score > 0);
  if (relevant.length === 0) {
    return res.status(200).json(INSUFFICIENT_EVOLUTION);
  }

  // Chronological order (oldest to newest) to trace true evolution
  relevant.sort((a, b) => a.timestamp - b.timestamp);
  const selected = relevant.slice(0, 8);

  const formattedHistory = selected
    .map((s, idx) => `[Entry ${idx + 1}] Date: ${s.dateStr} | Title: "${s.title}"\nUser Reflection: "${s.userText}"`)
    .join('\n\n');

  const systemInstruction = `You are ECHO's Thought Evolution engine.
Analyze how the user's mindset, perspective, and attitude regarding "${topic}" have evolved across the chronological entries provided.
Strict grounding: Only cite statements and shifts that actually appear in the reflections. Do not invent feelings, events, or outcomes.
Output strictly JSON matching this structure:
{
  "timeline": [
    {
      "date": "Date string",
      "reflectionTitle": "Reflection Title",
      "thoughtExcerpt": "Direct quote or close excerpt representing their mindset at this time",
      "shiftSummary": "1 sentence describing what they realized or shifted in this stage"
    }
  ],
  "inflectionPoints": [
    "Key pivotal realization or perspective shift 1",
    "Key pivotal realization or perspective shift 2"
  ],
  "recurringThemes": [
    "Theme that persists across time"
  ],
  "evolutionSynthesis": "A 2-3 paragraph empathetic, grounded narrative explaining how their thoughts matured from the earliest to the most recent entry."
}`;

  try {
    const result = await generateWithFallback(
      [{ role: 'user', parts: [{ text: `Topic: ${topic}\n\nChronological Entries:\n${formattedHistory}` }] }],
      {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json',
        totalTimeoutMs: 36000,
      }
    );

    let parsed: any;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      const clean = result.text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      parsed = JSON.parse(clean);
    }

    const timeline = Array.isArray(parsed.timeline) ? parsed.timeline : [];
    const inflectionPoints = Array.isArray(parsed.inflectionPoints) ? parsed.inflectionPoints : [];
    const recurringThemes = Array.isArray(parsed.recurringThemes) ? parsed.recurringThemes : [];
    const evolutionSynthesis = typeof parsed.evolutionSynthesis === 'string' ? parsed.evolutionSynthesis.trim() : '';

    return res.status(200).json({
      topic,
      timeline,
      inflectionPoints,
      recurringThemes,
      evolutionSynthesis: evolutionSynthesis || 'ECHO traced consistent development across your reflections.',
      hasEnoughMemories: true,
      model: result.model,
    });
  } catch (err) {
    console.error('Thought evolution generation error:', err);
    return res.status(503).json({
      error: 'Unable to analyze thought evolution at this time. Please retry shortly.',
    });
  }
});

// POST /api/gemini/insights
// Phase 5: ECHO Grounded Insights Dashboard
app.post('/api/gemini/insights', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'Unauthorized: Missing user context' });
  }

  const payload = (req.body && typeof req.body === 'object') ? req.body : {};
  const authHeader = req.headers.authorization as string;

  let rawInteractions: RawInteraction[] = [];
  if (firebaseProjectId) {
    rawInteractions = await fetchUserInteractionsFromFirestore(
      firebaseProjectId,
      firestoreDbId,
      uid,
      authHeader
    );
  }

  if (rawInteractions.length === 0 && Array.isArray(payload.clientMemories)) {
    rawInteractions = payload.clientMemories
      .filter((m: any) => m && typeof m === 'object' && typeof m.title === 'string' && Array.isArray(m.messages))
      .map((m: any) => ({
        id: typeof m.id === 'string' ? m.id : '',
        title: m.title,
        createdAt: typeof m.createdAt === 'string' ? m.createdAt : new Date().toISOString(),
        updatedAt: typeof m.updatedAt === 'string' ? m.updatedAt : new Date().toISOString(),
        messages: m.messages,
      }));
  }

  if (rawInteractions.length < 2) {
    return res.status(200).json({
      recurringThemes: ['Begin journaling more reflections to unlock pattern detection.'],
      frequentlyDiscussedTopics: ['Reflective Thinking'],
      changesInPriorities: [],
      repeatedConcerns: [],
      positiveProgress: ['Started your cognitive reflection journey with ECHO.'],
      unresolvedPatterns: [],
      supportingMemories: [],
      hasEnoughMemories: false,
      model: FALLBACK_LADDER[0],
    });
  }

  // Format up to 12 recent reflections
  const boundedInteractions = rawInteractions.slice(0, 12);
  const formattedSummary = boundedInteractions
    .map((item, idx) => {
      const userMsgs = (item.messages || [])
        .filter((m) => m.role === 'user' && typeof m.content === 'string')
        .map((m) => m.content.trim())
        .join(' ');
      const rawDate = item.createdAt || item.updatedAt;
      let dateStr = 'Unknown';
      try {
        dateStr = new Date(rawDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch {
        dateStr = rawDate;
      }
      return `Reflection ${idx + 1} (${dateStr} - "${item.title}"):\nUser: ${userMsgs.slice(0, 600)}`;
    })
    .join('\n\n');

  const systemInstruction = `You are ECHO's Cognitive Insights synthesizer.
Analyze the user's private reflections to identify meaningful cognitive themes, changing priorities, and areas of positive progress.
CRITICAL SAFETY & GROUNDING RULES:
1. Do NOT make any medical, psychological, psychiatric, or clinical diagnostic claims. This is a personal reflection tool.
2. Ground all insights strictly in what the user wrote.
3. Return raw JSON matching this schema:
{
  "recurringThemes": ["Theme 1", "Theme 2", "Theme 3"],
  "frequentlyDiscussedTopics": ["Topic 1", "Topic 2", "Topic 3"],
  "changesInPriorities": ["Shift 1", "Shift 2"],
  "repeatedConcerns": ["Concern 1", "Concern 2"],
  "positiveProgress": ["Progress 1", "Progress 2"],
  "unresolvedPatterns": ["Open inquiry or ongoing dilemma 1"],
  "supportingMemories": [
    {
      "date": "Sep 2, 2026",
      "reflectionTitle": "Title",
      "excerpt": "Specific quote illustrating the theme"
    }
  ]
}`;

  try {
    const result = await generateWithFallback(
      [{ role: 'user', parts: [{ text: `User's Recent Reflections:\n\n${formattedSummary}` }] }],
      {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json',
        totalTimeoutMs: 36000,
      }
    );

    let parsed: any;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      const clean = result.text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      parsed = JSON.parse(clean);
    }

    return res.status(200).json({
      recurringThemes: Array.isArray(parsed.recurringThemes) ? parsed.recurringThemes : [],
      frequentlyDiscussedTopics: Array.isArray(parsed.frequentlyDiscussedTopics) ? parsed.frequentlyDiscussedTopics : [],
      changesInPriorities: Array.isArray(parsed.changesInPriorities) ? parsed.changesInPriorities : [],
      repeatedConcerns: Array.isArray(parsed.repeatedConcerns) ? parsed.repeatedConcerns : [],
      positiveProgress: Array.isArray(parsed.positiveProgress) ? parsed.positiveProgress : [],
      unresolvedPatterns: Array.isArray(parsed.unresolvedPatterns) ? parsed.unresolvedPatterns : [],
      supportingMemories: Array.isArray(parsed.supportingMemories) ? parsed.supportingMemories : [],
      hasEnoughMemories: true,
      model: result.model,
    });
  } catch (err) {
    console.error('Insights generation error:', err);
    return res.status(503).json({
      error: 'Unable to synthesize insights at this moment.',
    });
  }
});

// POST /api/gemini/analyze-decision
// Phase 3: Decision Replay AI Analysis
app.post('/api/gemini/analyze-decision', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const payload = (req.body && typeof req.body === 'object') ? req.body : {};
  const decision = payload.decision;

  if (!decision || typeof decision !== 'object' || typeof decision.title !== 'string') {
    return res.status(400).json({ error: 'Valid decision payload is required' });
  }

  const title = String(decision.title || '').slice(0, 200);
  const description = String(decision.description || '').slice(0, 2000);
  const reasons = Array.isArray(decision.reasons) ? decision.reasons.map((r: any) => String(r).slice(0, 300)).join(', ') : '';
  const alternatives = Array.isArray(decision.alternativesConsidered) ? decision.alternativesConsidered.map((a: any) => String(a).slice(0, 300)).join(', ') : '';
  const confidence = Number(decision.confidenceScore) || 5;
  const expectedOutcome = String(decision.expectedOutcome || '').slice(0, 1000);
  const actualOutcome = String(decision.actualOutcome || '').slice(0, 1000);
  const reflectionLesson = String(decision.reflectionLesson || '').slice(0, 1000);

  const prompt = `Decision Title: ${title}
Description: ${description}
Reasons: ${reasons}
Alternatives Considered: ${alternatives}
Initial Confidence: ${confidence}/10
Expected Outcome: ${expectedOutcome}
${actualOutcome ? `Actual Outcome: ${actualOutcome}` : 'Status: Active (Outcome pending)'}
${reflectionLesson ? `User Reflection/Lesson: ${reflectionLesson}` : ''}`;

  const systemInstruction = `You are ECHO's Decision Replay Analyst.
Provide a clear, objective, and constructive retrospective on this decision.
Analyze:
1. The alignment between the initial reasoning, confidence level, and expectations.
2. If completed: What does the gap between expected and actual outcome reveal about cognitive assumptions or external factors?
3. If active: What should the user watch out for as the decision unfolds?
4. Key Takeaways: 3 concise bullet points for future decisions.
Return strictly JSON matching:
{
  "analysis": "Structured narrative analysis (2-3 paragraphs)",
  "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"]
}`;

  try {
    const result = await generateWithFallback(
      [{ role: 'user', parts: [{ text: prompt }] }],
      {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json',
        totalTimeoutMs: 28000,
      }
    );

    let parsed: any;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      const clean = result.text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      parsed = JSON.parse(clean);
    }

    return res.status(200).json({
      analysis: typeof parsed.analysis === 'string' ? parsed.analysis : 'Analysis completed.',
      keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
      model: result.model,
    });
  } catch (err) {
    console.error('Decision analysis error:', err);
    return res.status(503).json({
      error: 'Unable to analyze decision at this time.',
    });
  }
});


// Start server with Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (0.0.0.0) [NODE_ENV=${process.env.NODE_ENV || 'development'}]`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot failure:', err);
  process.exit(1);
});



