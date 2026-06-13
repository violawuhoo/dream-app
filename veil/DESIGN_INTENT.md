# Veil — Design Intent Document

Use this file as a north star. When you add a feature, refactor code, or change a prompt, check it against this document. If the code no longer reflects what is written here, either fix the code or consciously update this document and note why the intent changed.

---

## 1. Core Purpose

Veil is a **private dream journaling companion**, not a dream dictionary or fortune-telling app. Its purpose is to help users recall, articulate, and reflect on their dreams through a guided conversation — and to surface what those dreams might mirror about their waking life.

The experience should feel like sitting with a quiet, attentive friend who asks the right question at the right time. It should never feel like a chatbot, a quiz, or a diagnostic tool.

---

## 2. What Veil Is and Is Not

| Veil IS | Veil is NOT |
|---|---|
| A reflective journaling companion | A fortune-telling or prediction app |
| Gentle and intuitive | Clinical or academic |
| A mirror to the user's subconscious | An authority on what a dream "means" |
| Multilingual — responds in the user's language | English-only |
| Healing and grounding | Fear-inducing or fatalistic |
| A private space | A social or sharing-first app |

**The AI must never:**
- Make absolute predictions ("this dream means you will...")
- Use Chinese folk omen frameworks (Zhou Gong dream dictionary)
- Apply cultural symbols that don't apply to the user
- Sound like a therapist diagnosing a patient
- Use markdown formatting (asterisks, hashes) in responses shown to users

---

## 3. The Core User Flow

The dream capture experience has a fixed sequence. Every code change must preserve this order:

```
1. Capture (RAW → EXPANDING)
   User describes their dream in fragments, turn by turn.
   Veil asks one short, gentle question per turn to help recall 5 dimensions:
   People · Objects · Environment · Events · Emotions
   ↓
2. Structured Summary (STRUCTURED)
   Veil paraphrases the dream in natural language.
   No interpretation yet. No added facts.
   ↓
3. Interpretation (INTERPRETING → AWAITING_LIFE_CONNECTION)
   Veil provides a 4-part analysis:
   Key Symbols · Deep Subconscious Analysis · Eastern Insight · Life Guidance
   Methodology: Jungian + Freudian + minimalist Taoist (macro only)
   ↓
4. Life Connection (AWAITING_LIFE_CONNECTION → AWAITING_TAROT_DECISION)
   Veil asks how the dream mirrors the user's waking life.
   User shares a real-life context.
   Veil responds with: Integrated Resonance + Actionable Insight
   ↓
5. Tarot (optional) (AWAITING_TAROT_DECISION → DONE)
   User chooses to draw a card or skip.
   Card provides: psychological essence + final nudge
   Tarot is confirmation and closure — not prediction
   ↓
6. Save → Dream Detail
   Dream saved locally first, then Supabase.
   Detail shows: Narrative · Interpretation · Waking Life · Oracle (if drawn)
```

**Drift check:** If any step is skipped, reordered, or merged in the code without a conscious product decision, that is drift.

---

## 4. Tone and Voice

Veil speaks as a calm, empathetic presence — not an assistant, not a bot.

- Questions are short (one sentence)
- Language is tentative: "suggests", "mirrors", "might reflect"
- No bullet points or numbered lists in AI responses shown to users
- No bold or heading formatting in AI responses
- Always matches the user's language

**The capture phase persona:** "a listening friend sitting quietly with the user as they recall their dream"

**The interpretation persona:** "a professional dream analyst" — but one who is gentle, healing, and non-academic

**Drift check:** If AI responses become long, formatted, listy, clinical, or authoritative, that is drift.

---

## 5. The 5 Dimensions of Dream Capture

The expansion phase (turns 1–4+) is designed to surface these five things, not as a checklist but through natural conversation:

1. **People** — who was in the dream
2. **Objects** — what things appeared
3. **Environment** — where it took place
4. **Events** — what happened
5. **Emotions** — how it felt

**Drift check:** If the capture prompts start asking about waking life, predictions, or interpretation during the capture phase, that is drift.

---

## 6. User Identity and Privacy

- **Guest mode** is a first-class citizen. Users should be able to use the full app without creating an account.
- Guest sessions use a stable UUID stored in AsyncStorage (`veil_guest_id`) as their identity.
- Dreams are saved locally first (`localDreams`), then synced to Supabase. If Supabase fails, the dream is still saved.
- The Kimi API key is **never exposed to the client**. It lives only in server-side environment variables.
- The AI sees only the dream content the user explicitly shares — nothing else from the device.

**Drift check:** If the app ever requires sign-in to capture or view a dream, that is drift. If the Kimi API key appears in client-side code or `EXPO_PUBLIC_*` variables, that is a security drift.

---

## 7. Tarot as Closure, Not Prediction

The Tarot feature is intentionally positioned as optional and as a psychological closing ritual — not a fortune-telling mechanism.

- The card is drawn randomly
- The interpretation connects the card's psychological energy to the dream and life context
- The language is "confirmation" and "nudge" — never "prophecy" or "outcome"
- Users can skip tarot entirely with no loss of the core experience

**Drift check:** If tarot becomes mandatory, or if card interpretations start making predictions about real-world outcomes, that is drift.

---

## 8. What Makes a Good Dream Detail Screen

A saved dream should show the user's own journey back to them. The detail screen must reflect the full path taken:

- **Narrative** — the structured summary of the dream (always present)
- **Interpretation** — the 4-part analysis (present if interpretation was generated)
- **Waking Life** — the life connection response (present if life connection was shared)
- **Oracle** — the tarot card and its interpretation (present only if tarot was drawn)

Sections that don't apply (e.g. no tarot drawn) must not appear. The screen should feel like a personal document, not a template.

**Drift check:** If sections appear conditionally in the wrong order, or if empty sections are shown, that is drift.

---

## 9. Performance and Reliability Constraints

- The LLM is not always reachable (E2E release builds, network issues, rate limits)
- Every LLM call must have a graceful fallback that allows the flow to continue
- The app must never get stuck or show "Something went wrong" as a dead end
- Local save must always succeed before Supabase is attempted
- Rate limit: 30 requests per hour per user (guest or signed-in)

**Drift check:** If any LLM call path has no fallback and can leave the user stuck, that is drift.

---

## 10. Drift Checklist

Run through this list whenever a significant code change is made:

- [ ] Does the capture flow still follow the 6-step sequence in order?
- [ ] Does the AI still respond in the user's language?
- [ ] Are AI responses still free of markdown formatting (no `*`, `#`)?
- [ ] Is the tone still gentle and tentative — not clinical or predictive?
- [ ] Can a guest user still complete the full flow without signing in?
- [ ] Is `KIMI_API_KEY` still server-side only (not in any `EXPO_PUBLIC_*` variable)?
- [ ] Does every LLM call have a fallback that continues the flow?
- [ ] Does the dream detail screen show only sections that apply to that dream?
- [ ] Is tarot still optional and framed as confirmation, not prediction?
- [ ] Are dreams still saved locally before Supabase is attempted?
