# Dream App (MVP)

AI-native dream journaling app. The product starts from dream expression, guides the user to reconstruct the dream with minimal follow-up questions, optionally interprets it in a grounded (non-absolute) way, and saves it to an archive.

## Current MVP scope

- Text-only experience
- No image generation / tarot / I Ching
- Local persistence (browser `localStorage`)
- LLM-backed follow-up questions, structured summary, and interpretation

## Core user flow

1. User opens the app
2. Presence-like entry screen invites them to describe their dream
3. User enters dream in free-form conversation
4. AI guides with minimal follow-up questions (one question at a time)
5. AI paraphrases into a structured natural-language summary (no interpretation)
6. User confirms or corrects the summary
7. AI asks whether the user wants interpretation
8. If yes, AI provides grounded but non-absolute interpretation
9. User saves the dream record (or discards)
10. User can view history

## Conversation states (state machine)

- `RAW`: initial capture (user starts describing)
- `EXPANDING`: LLM asks one follow-up question at a time
- `AWAITING_CONTINUE_DECISION`: periodic “anything else?” check-in
- `STRUCTURED`: structured summary is produced and awaiting confirmation/correction
- `INTERPRETING`: asking whether to interpret (and/or generating interpretation)
- `DONE`: session ends; record can be saved

## Tech stack

- Frontend: HTML + CSS + Vanilla JS (ES Modules)
- Backend: Node.js server (serves static assets + `/api/*` endpoints)
- LLM Provider: Kimi (Moonshot) by default; optional Groq/OpenRouter
- Storage: browser `localStorage`
- Deploy: Vercel (full-stack)

## Project structure

- `index.html`: screens/layout
- `src/main.js`: UI wiring/rendering + client-side state
- `src/orchestrator.js`: conversation state machine + flow logic
- `src/llm-client.js`: client wrapper for calling `/api/dream-chat`
- `src/llm-prompts.js`: isolated prompts for follow-up/summary/interpretation/title
- `src/dream-model.js`: state enums + dream/session model
- `src/storage.js`: local persistence (records + simple user placeholder)
- `src/styles.css`: UI styling
- `server.js`: Node server (static + API + provider config)

## Running locally

1. Install dependencies:

```bash
npm install
```

2. Create `.env`:

```bash
cp .env.example .env
```

3. Set environment variables in `.env`:

- `KIMI_API_KEY=...`
- `KIMI_MODEL=moonshot-v1-8k` (optional)

4. Start:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Deploy (Vercel)

- Import the GitHub repo in Vercel
- Set `KIMI_API_KEY` as an Environment Variable (Production)
- Deploy

## Roadmap architecture (for iOS launch ~1k users + future in-app payments)

This repo is a good MVP foundation. For App Store launch and payments, the recommended architecture evolves into “Web UI (Capacitor) + API backend + DB + Auth + Billing”.

### Phase 1: Production-ready web + mobile packaging

- Keep the UI as-is; package with Capacitor for iOS
- Keep LLM calls server-side (never ship API keys in the client)
- Add basic observability (request IDs, error capture)
- Add rate limiting and timeouts on `/api/*`

### Phase 2: User accounts + cloud sync

- Add a real auth provider (Apple + Google are the priority for iOS)
- Add database (PostgreSQL) and an ORM (Prisma)
- Data model (minimum):
  - `users`
  - `dream_records` (title, narrative, raw_input, interpretation, keywords, emotions, created_at)
  - `subscriptions` / `entitlements` (for paid access)
- Move persistence from `localStorage` → DB (keep local cache for offline UX)

### Phase 3: In-app payments

- Use iOS In-App Purchase via a billing layer (e.g. RevenueCat) to reduce complexity
- Server verifies receipts / processes webhooks and stores entitlements
- Gate premium features by entitlements (e.g. interpretation depth, history search, exports)

## Notes

- Prompts are isolated and configurable (`src/llm-prompts.js`) to support future language selection and prompt tuning.
- Conversation state logic is separated from UI (`src/orchestrator.js`) to enable future refactors or swapping the LLM adapter.
