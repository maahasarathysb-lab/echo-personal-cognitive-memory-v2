# ECHO — Your Personal Cognitive Memory

> *The starter app remembers what you said. ECHO understands how your thoughts evolve.*

[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-Cloud%20Run-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/run)
[![Vertex AI](https://img.shields.io/badge/Vertex%20AI-Gemini%202.5%20Flash-34A853?logo=google&logoColor=white)](https://cloud.google.com/vertex-ai)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![React 19](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript-61DAFB?logo=react&logoColor=black)](https://react.dev/)

---

## 1. Project Overview

**ECHO** is a privacy-first personal cognitive memory platform designed to bridge the gap between daily journaling and long-term self-understanding. While traditional note-taking tools capture static text, ECHO structures and connects your cognitive journey over time:

- **Reflections**: Real-time contemplative dialogues and daily thoughts
- **Memories**: Chronologically organized, owner-isolated cognitive archive
- **Decisions**: Decision logging, confidence tracking, and retrospective learning
- **Goals & Priorities**: Tracing mindset shifts, milestones, and focus areas
- **Thought Evolution**: Longitudinal analysis of how perspectives transform over weeks and months
- **Longitudinal Patterns**: Surfacing recurring dilemmas, breakthroughs, and cognitive themes

### Why ECHO is Different

| Dimension | Traditional Journal | Typical AI Journal | ECHO Personal Cognitive Memory |
|---|---|---|---|
| **Primary Question** | *"What did I write?"* | *"Can AI summarize this entry?"* | *"How has my thinking changed across time?"* |
| **Context Horizon** | Single entry (isolated) | Single prompt/session | Continuous longitudinal timeline |
| **Historical Recall** | Manual keyword search | Hallucinates or guesses | Grounded retrieval with zero-relevance guardrails |
| **Cognitive Growth** | Static storage | Ephemeral chat | Decision replay, thought evolution & trajectory tracking |
| **Data Privacy** | Local or vendor silo | Public LLM prompts | Cryptographic owner-isolation via Firebase & Cloud Firestore |

---

## 2. Core Features

### 🪞 Reflect
- **Persistent Multi-Turn Reflection**: Context-preserving contemplative dialogue powered by Google Cloud Vertex AI.
- **Fast AI Actions**:
  - **Key Insights**: Distill the core cognitive themes and latent realizations from the session.
  - **Summarize**: Generate concise synthesis of multi-turn reflective thoughts.
  - **Next Steps**: Extract actionable, pragmatic intentions from reflective entries.
  - **Brainstorm**: Explore counter-perspectives, lateral ideas, and alternative frameworks.

### 📚 Memory Archive
- **Owner-Isolated Storage**: Every interaction is privately indexed under authenticated user boundaries.
- **Chronological Timeline**: Seamless access to historical reflections with intuitive search and date filtering.
- **Cognitive Detail Inspection**: Review original prompts, AI guidance, extracted milestones, and mood metrics.

### ⭐ Flagship Feature: Ask Your Past Self
Ask natural questions about your historical mindset, struggles, and decisions:
- *"What was I struggling with when I started my project?"*
- *"When did I start becoming more confident in my technical direction?"*
- *"What did I believe before I changed my mind about career priorities?"*
- *"Have I faced a dilemma like this before?"*
- *"What recurring themes keep coming up across my reflections?"*
- *"Show me how my thinking has changed over the past few months."*

**Grounded Synthesis Guarantee**: ECHO retrieves supporting memories through a hybrid lexical and concept-expansion pipeline. **ECHO does not invent unsupported memories, dates, quotes, or experiences.** When sufficient relevant historical evidence cannot be found, the system gracefully responds that there are not enough relevant memories to answer confidently.

### ⚖️ Decision Replay
- **Decision Capture**: Log decisions with context, initial confidence levels, core rationales, and considered alternatives.
- **Outcome Assessment**: Record expected versus actual outcomes alongside cognitive lessons learned.
- **AI Retrospective Evaluation**: Generate balanced retrospective insights analyzing decision quality, cognitive biases, and calibration.

### 🧬 Thought Evolution
- **Longitudinal Progression**: Track changes in mindset, goals, emotional state, and active inquiries across time.
- **Pivotal Moments**: Identify inflection points where core beliefs, confidence, or priorities shifted.
- **Learning Trajectory**: Synthesize long-term cognitive patterns into actionable self-awareness.

### 💡 ECHO Insights
- **Positive Progress**: Celebrate mindset breakthroughs and cognitive resilience.
- **Shifting Priorities**: Surface how attention and effort have naturally migrated across projects and life themes.
- **Recurring Themes & Unresolved Questions**: Highlight persistent inquiries and repeated dilemmas requiring deliberate focus.

---

## 3. Complete System Architecture

```
[ User Browser ]
       │
       ▼
[ React 19 + TypeScript + Vite (Tailwind CSS v4) ]
       │
       ▼ Google Sign-In
[ Firebase Authentication ] ──► Cryptographic Firebase ID Token (JWT)
       │
       ▼ Authorization: Bearer <idToken>
[ Google Cloud Run (echo-memory) ]
       │
       ├─► Server-Side Token Verification (Firebase Admin SDK)
       │         │
       │         ▼ Authoritative Verified req.user.uid
       │   (Client-supplied UID strictly ignored)
       │
       ├─► Owner-Isolated Database Retrieval
       │         │
       │         ▼
       │   [ Cloud Firestore ]
       │   ├── /users/{uid}/interactions/{interactionId}
       │   └── /users/{uid}/decisions/{decisionId}
       │
       ├─► Memory Retrieval Pipeline
       │   ├── Query Concept Expansion
       │   ├── Root-Stem Extraction & Lexical Scoring
       │   ├── Thematic / Phrase Match Scoring
       │   └── Zero-Relevance Guard
       │
       ▼ Service Account IAM Authentication (No API Key in Prod)
[ Google Cloud Vertex AI ]
       │
       ├── Primary Model: Gemini 2.5 Flash
       │         │ (Automatic transient-error / timeout cascade)
       │         ▼
       └── Fallback Model: Gemini 2.5 Flash Lite
                 │
                 ▼ Grounded Cognitive Synthesis
[ ECHO Web UI ] ◄┘ (Response + Supporting Memories)
```

---

## 4. Authentication Architecture

ECHO enforces a strict defense-in-depth security model:

1. **Client-Side Authentication**: Users sign in via Firebase Authentication using the Google Sign-In provider.
2. **Cryptographic ID Token**: Upon successful sign-in, Firebase issues a signed ID token with a strict expiration window.
3. **Server-Side Token Verification**: Every API call transmits the token via the `Authorization: Bearer <token>` header. The Express server validates the token cryptographically using the `firebase-admin` SDK (`adminAuth.verifyIdToken`).
4. **Authoritative Identity Binding**:
   - The user identity is extracted strictly from `decodedToken.uid` and attached to `req.user.uid`.
   - **Zero Trust for Client UIDs**: The server never accepts, reads, or trusts user IDs passed in JSON request bodies or URL parameters.

---

## 5. Firestore Owner Isolation

All persistent cognitive data is partitioned under per-user subcollections in Cloud Firestore:

- `/users/{uid}/interactions/{interactionId}`: Individual reflection sessions and conversational message threads.
- `/users/{uid}/decisions/{decisionId}`: Structured decision logs, confidence metrics, and AI retrospectives.

### Firestore Security Rules

Cloud Firestore enforces hardware-level owner isolation. Security rules located in `firestore.rules` verify that the requester is authenticated and matches the path owner:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;

      match /interactions/{interactionId} {
        allow read, write: if request.auth != null
                           && request.auth.uid == userId;
      }

      match /decisions/{decisionId} {
        allow read, write: if request.auth != null
                           && request.auth.uid == userId;
      }
    }
  }
}
```

Cross-user document reads, writes, or enumeration are rejected by default at the database engine level.

---

## 6. 🤖 Vertex AI & Gemini Architecture

Production inference in ECHO is powered directly by **Google Cloud Vertex AI** using the official `@google/genai` SDK:

- **Primary Model**: `gemini-2.5-flash` — High-speed, high-context cognitive reflection and synthesis.
- **Fallback Model**: `gemini-2.5-flash-lite` — Automated failover ensuring sub-second response resilience during traffic surges or upstream timeouts.
- **IAM Service Account Authentication**: When running in Google Cloud Run, the application authenticates directly to the Vertex AI platform using the Cloud Run runtime service account (Application Default Credentials).
- **Zero Frontend Secret Exposure**: No AI API keys or credentials are ever sent to the browser or stored in client-side bundles.

---

## 7. Ask Your Past Self: Memory Retrieval Pipeline

The flagship historical inquiry engine uses a multi-stage retrieval and synthesis pipeline:

```
[ User Question ]
       │
       ▼
[ Firebase Auth Verification ] ──► Authenticated req.user.uid
       │
       ▼
[ Fetch User's Private Reflections ] (Scoped strictly to /users/{uid}/interactions)
       │
       ▼
[ Concept Expansion ] (Generates 12–22 related domains, emotions, synonyms via Vertex AI)
       │
       ▼
[ Hybrid Relevance Scoring ]
  ├── Exact phrase & title matches (+10 to +12)
  ├── Lexical keyword & root-stem matching (+2 to +6)
  └── Expanded concept & thematic co-occurrence (+1 to +8)
       │
       ▼
[ Zero-Relevance Guard ]
  ├── Total score < threshold OR no matching documents?
  └── YES ──► Return graceful response: "I couldn't find enough relevant memories..."
  └── NO  ──► Select Top Supporting Memories (up to 5 documents)
       │
       ▼
[ Grounded Synthesis Prompt ]
  ├── User Question
  ├── Chronologically ordered supporting memory excerpts
  └── Strict anti-hallucination system instruction
       │
       ▼
[ Vertex AI Gemini 2.5 Flash / Flash Lite ]
       │
       ▼
[ Output Response ] (Grounded answer + verified supporting memories)
```

---

## 8. Grounding & AI Guardrails

- **Zero-Relevance Guard**: When a question lacks sufficient matching evidence in the user's historical records, ECHO refuses to guess. It informs the user transparently that no relevant memories exist on that topic.
- **Anti-Hallucination Directives**: System prompts explicitly forbid inventing dates, hypothetical outcomes, or false memories.
- **Supporting Memory Transparency**: The application surfaces the specific historical entries used to formulate the synthesis, allowing users to verify the context directly.
- **Cascading Model Resilience**: If `gemini-2.5-flash` encounters a rate-limit (429), server error (500/503), or timeout, the request immediately cascades to `gemini-2.5-flash-lite` within the remaining deadline budget.

---

## 9. Security & Privacy

- **Owner-Isolated Firestore**: Data paths are strictly partitioned per authenticated Google user.
- **No Client-Supplied Identity Trust**: The server validates the cryptographic ID token for every operation.
- **Server-Side AI Execution**: Vertex AI calls occur entirely server-side in Cloud Run; frontend clients never interface with AI endpoints directly without authentication.
- **IAM Principle of Least Privilege**: The Cloud Run service account is granted only the specific roles required (`Vertex AI User`, `Cloud Datastore User`).
- **No Private Content in URLs**: All sensitive payloads are transmitted via secure HTTPS POST request bodies with size limits.

---

## 10. Cognitive Safety

ECHO is designed as a personal, reflective cognitive companion:

> **Cognitive Safety Notice**: ECHO's insights, longitudinal patterns, and retrospective analyses are derived entirely from user-recorded reflections to aid personal self-awareness, clarity, and intentionality. ECHO is **not** a clinical diagnostic tool and does not provide psychiatric, psychological, or medical evaluation or treatment.

---

## 11. Google Cloud Services

| Service | Purpose |
|---|---|
| **Google Cloud Run** | Fully managed containerized full-stack hosting (`echo-memory` in `asia-south1`) |
| **Google Cloud Vertex AI** | Production Gemini inference (`gemini-2.5-flash` & `gemini-2.5-flash-lite`) |
| **Cloud Firestore** | Serverless NoSQL document database providing owner-isolated persistence |
| **Firebase Authentication** | Secure Google Sign-In identity provider and cryptographic token issuance |
| **Firebase Admin SDK** | Server-side ID token verification and authoritative UID resolution |
| **Secret Manager** | Optional management of configuration variables across environments |
| **Artifact Registry & Cloud Build** | Production container packaging, image storage, and automated deployment |

---

## 12. Technology Stack

### Frontend
- **React 19** (`react`, `react-dom` v19.0.1)
- **TypeScript** (v5.8.2)
- **Vite 6** (Modern build tooling & dev server middleware)
- **Tailwind CSS v4** (Utility-first styling with custom cognitive dark palette)
- **Lucide React** (Consistent iconography)
- **Motion** (`motion/react` v12.23.24 for fluid, restrained transitions)

### Backend
- **Node.js 20+** & **Express 4** (Production API & Vite integration)
- **TypeScript & tsx** (Type-safe backend development)
- **esbuild** (Bundles server to high-performance standalone `dist/server.cjs`)
- **Firebase Admin SDK** (`firebase-admin` v14.3.0)

### Artificial Intelligence
- **@google/genai SDK** (`^2.4.0`)
- **Google Cloud Vertex AI**
- Primary: `gemini-2.5-flash`
- Fallback: `gemini-2.5-flash-lite`

### Database & Security
- **Cloud Firestore** (`firebase` v12.18.0 client SDK + REST fallback)
- **Firestore Security Rules** (Version 2 rules enforcing `request.auth.uid == userId`)

---

## 13. Local Development

### Prerequisites
- Node.js 20.x or later
- npm 10.x or later
- Google Cloud SDK (`gcloud` CLI)
- Firebase CLI (`firebase-tools`)

### 1. Clone & Install
```bash
git clone https://github.com/maahasarathysb-lab/echo-personal-cognitive-memory-v2.git
cd echo-personal-cognitive-memory-v2
npm install
```

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```

Configure the environment variables in `.env`:
```env
# Backend Google Cloud / Firebase configuration
FIREBASE_PROJECT_ID=your-gcp-project-id
FIRESTORE_DATABASE_ID=(default)

# Client-side Firebase configuration (available from Firebase Console)
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-gcp-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 3. Local Vertex AI Authentication
Authenticate your local environment with Google Cloud Application Default Credentials (ADC):
```bash
gcloud auth application-default login
gcloud config set project your-gcp-project-id
```

### 4. Start Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 14. Local Verification Commands

The project uses clean, standard scripts defined in `package.json`:

```bash
# Type check the codebase without emitting artifacts
npm run lint

# Compile frontend with Vite and bundle server with esbuild into dist/server.cjs
npm run build

# Start the compiled production server on port 3000
npm start

# Clean build artifacts
npm run clean
```

---

## 15. Firebase Setup

1. **Create Firebase Project**: In the [Firebase Console](https://console.firebase.google.com/), link your Google Cloud project.
2. **Enable Google Authentication**:
   - Go to **Authentication** → **Sign-in method**.
   - Enable **Google** provider and configure your support email.
   - Add your development and production domains (e.g. `localhost`, your Cloud Run URL) to **Authorized domains**.
3. **Provision Firestore**:
   - Create a Firestore database in your target region.
4. **Deploy Security Rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## 16. Vertex AI Setup

Enable the required Vertex AI APIs on your Google Cloud project:

```bash
gcloud services enable \
  aiplatform.googleapis.com \
  run.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com
```

Grant Vertex AI permissions to your Cloud Run runtime service account:

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

*Note: In production on Cloud Run, authentication to Vertex AI is handled automatically via IAM and Google Cloud runtime service account credentials. No manual API keys are required for production AI calls.*

---

## 17. Cloud Run Deployment

ECHO is deployed to Google Cloud Run with container packaging:

- **Service Name**: `echo-memory`
- **Region**: `asia-south1`
- **Challenge Label**: `dev-tutorial=cloud-run-ai-challenge`

### Deployment Command

```bash
gcloud run deploy echo-memory \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars FIREBASE_PROJECT_ID=YOUR_PROJECT_ID,FIRESTORE_DATABASE_ID=(default) \
  --update-labels=dev-tutorial=cloud-run-ai-challenge
```

---

## 18. Project Structure

```
.
├── .env.example                  # Template of required environment variables
├── firestore.rules               # Cloud Firestore security rules enforcing owner-isolation
├── package.json                  # Dependencies, scripts, and build configuration
├── server.ts                     # Express server, Firebase Admin auth, & Vertex AI integration
├── tsconfig.json                 # TypeScript compiler configuration
├── vite.config.ts                # Vite build and development configuration
├── index.html                    # Single-page application HTML entry point
├── metadata.json                 # AI Studio applet metadata and capabilities
└── src/
    ├── main.tsx                  # React entry point
    ├── App.tsx                   # Top-level application controller & auth state
    ├── types.ts                  # Shared TypeScript interfaces for reflections & decisions
    ├── index.css                 # Tailwind CSS v4 styling & typography
    ├── lib/
    │   └── firebase.ts           # Client-side Firebase App & Auth initialization
    └── components/
        ├── AskPastSelfView.tsx   # ⭐ Flagship: Ask Your Past Self historical query UI
        ├── CognitiveAtmosphere.tsx # Background ambient atmosphere canvas
        ├── DecisionReplayView.tsx  # Decision log, outcome tracking & AI retrospectives
        ├── EchoInsightsView.tsx    # Longitudinal patterns & priority shift analytics
        ├── EchoLogo.tsx            # Mathematical vector branding component
        ├── JournalDashboard.tsx    # Core journal workspace & view router
        ├── LoginView.tsx           # Google Sign-In & cognitive introduction
        ├── MemoryView.tsx          # Chronological memory archive with search
        ├── Navigation.tsx          # Top bar, section titles & navigation items
        ├── ProfileDropdown.tsx     # Google account profile menu & session controls
        ├── SettingsModal.tsx       # Account settings, privacy metrics & deletion modal
        └── ThoughtEvolutionView.tsx # Longitudinal mindset & milestone evolution
```

---

## 19. Reliability & Error Handling

- **Token Validation Defense**: Rejects unauthenticated requests with `401 Unauthorized` before invoking database queries or AI generation.
- **Model Fallback**: Cascades from `gemini-2.5-flash` to `gemini-2.5-flash-lite` if the primary model encounters rate limits, errors, or timeouts.
- **Bounded Request Timeouts**: Each model attempt is governed by an independent `AbortController` (12s per model, 48s total request deadline).
- **Graceful Zero-Relevance Handling**: Questions without matching historical context return structured insufficient-context responses rather than failing silently or hallucinating.
- **Firestore Resilience**: Supports both direct Firestore REST retrieval and client-provided authenticated reflection mirrors as a resilient secondary data channel.

---

## 20. Testing & Verification

The project undergoes systematic quality verification:

- **Type Safety**: Full codebase strict typing verified via `npm run lint` (`tsc --noEmit`).
- **Production Build**: Verified single-bundle server output (`dist/server.cjs`) and minified frontend assets via `npm run build`.
- **Authentication**: Verified Google Sign-In, token issuance, and server-side cryptographic token validation.
- **Owner Isolation**: Verified that user collections cannot be accessed across distinct Google identities.
- **AI Synthesis**: Verified multi-turn reflection, fast AI actions, decision retrospectives, and Ask Your Past Self historical query synthesis.

---

## 21. Challenge Attribution

Built for the **Google Cloud × Hack2skill Gen AI Academy APAC Edition Ideathon**.

Tagged with: **#AccelerateAIwithCloudRun**

---

## 22. Author Information

**Maahasarathy SB**

- **GitHub**: [https://github.com/maahasarathysb-lab/echo-personal-cognitive-memory-v2](https://github.com/maahasarathysb-lab/echo-personal-cognitive-memory-v2)
- **LinkedIn**: [https://www.linkedin.com/in/maahasarathy/](https://www.linkedin.com/in/maahasarathy/)
- **Email**: [maahasarathy@gmail.com](https://mail.google.com/mail/?view=cm&fs=1&to=maahasarathy@gmail.com)

---

*ECHO — Your Personal Cognitive Memory. Built on Google Cloud, Vertex AI, and Cloud Run.*
