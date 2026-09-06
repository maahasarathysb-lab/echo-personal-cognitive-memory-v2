# ECHO — Setbacks & Engineering Lessons

ECHO was not built in a straight line. Several technical and product challenges had to be diagnosed and resolved before reaching the final production version.

This document records the major setbacks encountered during development, what caused them, how they were diagnosed, and what was changed.

---

## 1. Gemini API Prepay / Billing Block

### Problem

The initial production version of ECHO used the Gemini API through an `GEMINI_API_KEY`.

Although the application was correctly configured, Gemini requests from the deployed Cloud Run service began returning `503` responses.

### What We Observed

Cloud Run logs showed the Gemini fallback ladder receiving `429` responses with a message indicating that the available prepayment credits were depleted.

The issue was not caused by application authentication, Firestore, or request formatting.

### Root Cause

The Gemini API account was using AI Studio prepaid billing, and the available prepaid balance had reached ₹0.

The Google Cloud promotional credits available to the project could not simply be used by the existing AI Studio prepaid configuration without satisfying the required prepaid billing state.

### Solution

Instead of adding another paid AI Studio prepayment, production inference was migrated from the Gemini API-key path to Vertex AI.

### Lesson

A working API key does not necessarily mean that the production billing path is healthy. Billing configuration must be treated as part of production infrastructure.

---

## 2. AI Studio Free Generation Limit

### Problem

During development, the original Google AI Studio account reached its available free generation limit.

This interrupted the development workflow even though the application itself was still functional.

### Solution

Development was moved to a separate AI Pro account where the ECHO project could continue to be developed and synchronized with GitHub.

The production runtime was still designed around Google Cloud infrastructure rather than depending on the consumer AI Studio subscription.

### Lesson

The development environment and production inference infrastructure should not be unnecessarily coupled.

---

## 3. Migration from Gemini API Key to Vertex AI

### Problem

The original application architecture used:

- `GEMINI_API_KEY`
- Gemini API access through the API key
- a Gemini model fallback ladder

The production billing problem made this approach unsuitable for the final deployment.

### Solution

ECHO was migrated to Vertex AI using the Cloud Run runtime service account.

The server now initializes the Google Gen AI client using Vertex AI configuration:

- Google Cloud project
- `us-central1` Vertex AI location
- Application Default Credentials
- Cloud Run service account authorization

No Gemini API key is required for production inference.

### Security Improvement

This also simplified the production security boundary because the application can authenticate to Vertex AI through its Google Cloud runtime identity rather than exposing or depending on a client-side credential.

### Lesson

Cloud-native identity-based authentication is preferable for production workloads when the application already runs inside Google Cloud.

---

## 4. Vertex AI Model Availability / 404 Errors

### Problem

After migrating to Vertex AI, the first deployment still failed.

The existing fallback ladder referenced models that were not available through the selected Vertex AI endpoint.

Cloud Run logs showed `404 Publisher model` errors.

### Root Cause

The model names used by the previous Gemini API configuration were not directly interchangeable with the selected Vertex AI publisher-model endpoint.

### Solution

The fallback ladder was changed to Vertex-compatible models:

- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`

A direct Vertex AI REST request was then tested successfully before redeploying.

### Result

The final Cloud Run revision successfully generated AI responses using Gemini 2.5 Flash.

### Lesson

Changing an AI provider endpoint is not just a credential change. Model availability and endpoint compatibility must also be verified.

---

## 5. Cloud Run Service Account and IAM Configuration

### Problem

After moving to Vertex AI, Cloud Run needed permission to call Vertex AI.

The runtime service account did not automatically have the required Vertex AI permissions.

### Solution

The Cloud Run runtime service account was granted:

`roles/aiplatform.user`

The required Google Cloud APIs were also enabled, including:

- Vertex AI API
- Cloud Run API
- Cloud Build API
- Artifact Registry API

### Lesson

Production AI access should be explicitly controlled through IAM rather than relying on broad project-level credentials.

---

## 6. Firebase Authorized Domain Authentication Error

### Problem

Google Sign-In initially failed inside the Google AI Studio preview environment.

The application displayed an authentication error even though Firebase Authentication itself was configured correctly.

### Root Cause

The temporary AI Studio preview domains were not included in Firebase Authentication's authorized domains.

### Solution

The relevant AI Studio preview domains were added to:

Firebase Authentication → Settings → Authorized domains

Google Sign-In then worked successfully inside the preview.

### Lesson

Authentication can fail because of the hosting environment even when the application authentication logic is correct. Preview and deployment domains must be explicitly considered.

---

## 7. User-Isolated Firestore Memory

### Problem

ECHO stores personal reflections, decisions, and historical memories.

A major security requirement was ensuring that one authenticated user could never access another user's memory.

### Solution

The application was designed around authenticated ownership:

1. Firebase authenticates the user.
2. The server verifies the Firebase ID token.
3. The UID is obtained from the verified token.
4. The server does not trust a client-supplied UID.
5. Firestore data is scoped to the authenticated owner.

The resulting ownership boundary is:

`/users/{uid}/interactions`

### Lesson

Personal memory applications require the identity boundary to be enforced on the server, not merely represented in frontend state.

---

## 8. AI Hallucination / Zero-Relevance Problem

### Problem

A memory assistant should not produce a confident historical answer when the user's stored reflections contain no relevant evidence.

An early retrieval approach could allow unrelated memories to enter the synthesis process.

### Solution

ECHO introduced a zero-relevance guard.

The retrieval pipeline now:

1. Retrieves private memories.
2. Expands the user's query into relevant concepts.
3. Performs lexical and concept-based matching.
4. Scores candidate memories.
5. Removes zero-relevance results.
6. Sends only relevant evidence to the synthesis stage.
7. Refuses to generate a historical interpretation when sufficient evidence does not exist.

When no sufficient evidence exists, ECHO explicitly states that it could not find enough relevant memories to answer confidently.

### Lesson

A trustworthy memory assistant needs the ability to say:

> "I don't have enough evidence."

rather than filling gaps with plausible-sounding AI output.

---

## 9. Memory Retrieval Accuracy

### Problem

Simple keyword matching was not sufficient for questions about personal thought evolution.

A user might describe the same idea using different words across different reflections.

### Solution

ECHO introduced hybrid retrieval using:

- lexical matching
- phrase matching
- concept matching
- stemming
- Gemini-assisted concept expansion

The system then selects the most relevant memories for grounded synthesis.

### Result

Ask Your Past Self can connect related reflections across time instead of relying only on exact keyword matches.

### Lesson

Longitudinal personal memory requires semantic relationships as well as literal text matching.

---

## 10. Local Git Repository Misconfiguration

### Problem

During local development, Git was accidentally initialized at the wrong directory level.

The repository status showed unrelated directories such as:

- Documents
- Downloads
- `.anaconda`
- `.VirtualBox`

instead of containing only the ECHO project.

### Risk

Running `git add .` from that location could have staged unrelated personal files.

### Solution

Local Git operations were stopped immediately.

The local folder was used only for:

- dependency installation
- TypeScript validation
- production build verification

The authoritative project source remained synchronized through the intended GitHub / AI Studio workflow.

### Lesson

Always verify `git status` and repository root before staging or pushing a project.

---

## 11. UI / UX Iterations

### Problem

The initial landing page did not communicate the product's purpose or differentiate ECHO strongly enough.

The application also needed to present complex cognitive-memory features without becoming visually overwhelming.

### Solution

The interface was redesigned around ECHO's cognitive-memory identity.

The final landing experience communicates:

- Reflect
- Remember
- Understand
- Evolve

The authenticated application was then structured around:

- Reflect
- Memory
- Ask Your Past Self
- Decisions
- Thought Evolution
- ECHO Insights

### Lesson

For AI products, the interface should communicate the product's mental model, not simply expose AI functionality.

---

## 12. Vite HMR / WebSocket Errors

### Problem

The Google AI Studio preview showed repeated Vite HMR WebSocket/retry errors.

These errors appeared in the development environment even though the application itself continued to function.

### Diagnosis

The errors were related to the preview environment's handling of Vite HMR rather than the application's production request path.

### Solution

The development server configuration was adjusted so that Vite HMR was disabled in the preview middleware configuration.

Production builds continued to use the compiled application.

### Result

The remaining preview issue was classified as a non-blocking development-environment issue rather than a production application failure.

### Lesson

Development-preview infrastructure errors should be separated from actual production application failures.

---

## 13. Final Build and Production Validation

### Problem

Before final deployment, the project had to be validated across several independent layers.

### Validation

The application was checked through:

- TypeScript compilation
- production build
- Cloud Run deployment
- Firebase authentication
- Firestore persistence
- Vertex AI generation
- memory retrieval
- Ask Your Past Self
- Decision Replay
- Thought Evolution
- ECHO Insights

### Result

The production application successfully:

- authenticates users through Google
- isolates user memory
- stores reflections
- retrieves historical memories
- generates grounded AI responses
- handles insufficient historical context
- uses Vertex AI Gemini 2.5 Flash
- runs on Google Cloud Run

### Lesson

A production AI application is not complete when the model responds successfully. Authentication, authorization, persistence, retrieval, failure handling, deployment, and user experience must all be validated together.

---

# Final Engineering Takeaway

The biggest lesson from building ECHO was that an AI application is more than a model call.

The final architecture evolved around four principles:

1. **Identity first** — every memory belongs to an authenticated owner.
2. **Evidence before generation** — historical answers must be grounded in stored memories.
3. **Graceful failure** — the system should fail honestly instead of inventing information.
4. **Cloud-native production infrastructure** — Vertex AI, Cloud Run, Firebase Authentication, Firestore, IAM, and controlled deployment boundaries work together as one system.

ECHO's setbacks directly shaped the final product rather than being separate from it.
