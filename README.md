# ECHO — Your Personal Cognitive Memory

> *"The starter app remembers what you said. ECHO understands how your thoughts evolve."*

ECHO is a secure, full-stack cognitive AI journaling platform built with React, Node.js, Cloud Firestore, Firebase Authentication, and Google Gemini models with automated multi-model fallback resiliency.

---

## 1. Architecture & Security Baseline

- **Identity Verification**: Authoritative cryptographic token validation using Firebase Admin SDK on the server (`req.user.uid`). Client-supplied user IDs are completely untrusted and rejected.
- **Data Isolation**: User partitions scoped strictly to `/users/{userId}/interactions/{interactionId}` and `/users/{userId}/decisions/{decisionId}`.
- **Firestore Security Rules**: Strict owner-scoped access (`request.auth != null && request.auth.uid == userId`) with zero public fallback.
- **Gemini Fallback Ladder**: Server-only API keys with automated cascading (`gemini-3.8-flash` → `gemini-3.7-flash` → `gemini-3.6-flash` → `gemini-3.1-flash-lite`).
- **Zero-Relevance & Grounded Guardrails**: Factual recall grounded strictly in retrieved historical documents. "Ask Your Past Self" does not hallucinate memories when insufficient data exists.
- **Cognitive Capabilities**:
  - **Reflect & Multi-Turn Journaling**: Real-time conversation with context continuity and fast AI Actions (Key Insights, Summarize, Next Steps, Brainstorm).
  - **Memory Archive**: Full-text search and date filtering across all reflections.
  - **Ask Your Past Self**: Historical query engine identifying memories found, trajectory of thinking, and cognitive synthesis.
  - **Decision Replay**: Log choices, record outcomes, and generate AI counterfactual retrospective evaluations.
  - **Thought Evolution**: Chronological shifts across mindset, goals, emotional state, and open inquiries.
  - **ECHO Insights**: Longitudinal cognitive patterns, shifting priorities, and recurring dilemmas.

---

## 2. Prerequisites & Environment Setup

### Enable Google Cloud APIs
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `GEMINI_API_KEY` is configured on the server environment. Do not prefix with `VITE_` or expose in client bundles.

---

## 3. Secret Management Setup (Google Cloud Secret Manager)

Store operational credentials dynamically without committing secrets:

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the Cloud Run runtime service account permission to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Firestore Security Configuration

Ensure rules are deployed from `firestore.rules`:

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

Deploy rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 5. Google Cloud Run Deployment

Build and deploy the application container to Cloud Run:

```bash
# Deploy to Cloud Run with Secret Manager binding and automated port binding
gcloud run deploy echo-journal \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --update-labels=dev-tutorial=cloud-run-ai-challenge
```

---

## 6. Local Development & Verification Commands

```bash
# Install dependencies
npm install

# Run TypeScript type check
npm run lint

# Build full-stack production bundle
npm run build

# Start production server
npm start
```
