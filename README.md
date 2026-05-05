# Dream App MVP

Text-only MVP for an AI-native dream journaling app.

## What is included

- Presence-led entry screen
- Conversational dream capture flow
- Explicit flow states: `RAW`, `EXPANDING`, `STRUCTURED`, `INTERPRETING`, `DONE`
- Paraphrased dream summary step with user correction
- Optional interpretation step with grounded, non-absolute language
- Local persistence via `localStorage`
- History/archive view

## Structure

- `index.html`: shell and screen layout
- `src/main.js`: UI wiring and rendering
- `src/orchestrator.js`: conversation state logic and configurable flow behavior
- `src/prompts.js`: isolated prompt and tone copy
- `src/dream-model.js`: state enum and dream record model
- `src/storage.js`: local persistence layer
- `src/styles.css`: atmospheric UI styling

## Running locally

This MVP is a client-only app. Open `index.html` in a browser, or serve the folder with any static file server.

## Notes

- The orchestration layer is deliberately separated from UI so a future LLM adapter can replace the current heuristic extraction logic.
- The dream record shape is extensible for later image-generation and memory-layer additions.
