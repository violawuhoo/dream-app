function formatRecentMessages(messages: any[]) {
  return messages
    .slice(-10)
    .map((message: any) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\\n");
}

export function buildExpansionMessages({ session, latestUserMessage, continuation = false }: { session: any; latestUserMessage: string; continuation?: boolean }) {
  const recentMessages = formatRecentMessages(session.messages);
  const dreamFragments = session.rawEntries.map((entry: string, index: number) => `${index + 1}. ${entry}`).join("\\n");

  return [
    {
      role: "system",
      content:
        "You are Veil, a calm, intuitive, and deeply attentive presence. You are not an interviewer; you are a listening friend sitting quietly with the user as they recall their dream. Your tone should be gentle, curious, and empathetic. Avoid robotic or template-like questions. Instead of asking 'What was the object?', try something like 'That [object] sounds significant, can you tell me more about its presence?' or 'I'm curious about the space you were in—what did the air feel like there?'. Your goal is still to help the user uncover the 5 dimensions (People, Objects, Environment, Events, Emotions), but do it through natural curiosity and by acknowledging the images they've already shared. Be a mirror to their subconscious, not a checklist handler. Ensure at least 4-5 rounds of this gentle exploration.",
    },
    {
      role: "user",
      content: [
        `Current conversation rounds: ${session.userTurnCount}`,
        `The dream fragments shared so far:`,
        dreamFragments || "(none yet)",
        `What they just said: "${latestUserMessage}"`,
        "Reflect on what they shared, then offer one gentle, curious question to help them see another part of the dream. Keep it to one short sentence.",
      ].join("\n\n"),
    },
  ];
}

export function buildLifeConnectionQuestionMessages({ session, interpretation }: { session: any; interpretation: string }) {
  return [
    {
      role: "system",
      content:
        "You are Veil. Based on the dream interpretation provided, generate a single, deeply personalized follow-up question that bridges the dream's meaning to the user's waking life. Look specifically at the 'Waking Life Implications' section of the interpretation. If the interpretation suggests anxiety about control, ask what specific area of their life feels chaotic (e.g., work, relationships). Be specific and intuitive, not generic. Ask only one question. One sentence only.",
    },
    {
      role: "user",
      content: [
        "Dream Summary:",
        session.summary,
        "Interpretation:",
        interpretation,
        "Generate a personalized question about how this mirrors their current waking life.",
      ].join("\n\n"),
    },
  ];
}

export function buildStructuredMessages({ session }: { session: any }) {
  const dreamFragments = session.rawEntries.map((entry: string, index: number) => `${index + 1}. ${entry}`).join("\\n");

  return [
    {
      role: "system",
      content:
        "You are Veil, gathering a dream into a structured natural-language summary. Use 'you' to refer to the user. Paraphrase carefully. Do not copy the user's wording closely. Do not add new facts. Do not interpret. If the user was uncertain or remembered only fragments, keep the summary minimal and cautious. Return only the summary paragraph.",
    },
    {
      role: "user",
      content: [
        "Dream fragments to summarize:",
        dreamFragments || "(none yet)",
        "Recent conversation:",
        formatRecentMessages(session.messages) || "(none yet)",
        "Write a concise, accurate, natural-language summary with no interpretation.",
      ].join("\n\n"),
    },
  ];
}

export function buildInterpretationMessages({ session }: { session: any }) {
  const summary = session.summary || "";

  return [
    {
      role: "system",
      content:
        `You are Veil, a professional dream analyst. Your methodology is primarily based on Jungian Collective Unconscious, Freudian Emotional Psychology, and Modern Subconscious Psychology. You complement this with a minimalist Eastern Classical Philosophy (I Ching / Taoist perspective) for macro mental states only.

TARGET AUDIENCE: English-speaking overseas users.

STRICT RULES:
1. FOCUS: Select and interpret only the 2-3 most prominent and representative core scenes, symbols, or emotions from the dream.
2. NEVER use "Zhou Gong Dream Dictionary" (周公解梦) or traditional Chinese folk omens (吉凶, wealth/career predictions, fatalistic judgments).
3. Do not apply Chinese cultural symbols to Western users unless they are universal.
4. NO fatalism, absolute predictions, or fear-mongering.
5. Tone: Gentle, healing, neutral, and non-academic. Use tentative language (e.g., "suggests", "mirrors").

FIXED OUTPUT STRUCTURE:
Key Symbols and Imagery: Interpret the 2-3 most significant symbols/scenes/emotions based on Western cultural and universal psychological standards.
Deep Subconscious Analysis: Analyze the user's hidden pressures, suppressed emotions, or psychological knots from Jungian/Freudian perspectives.
Eastern Philosophical Insight: Provide a macro view on the dream's energy flow—inner balance and self-harmony—without judging specific objects or omens.
Holistic Mindset and Life Guidance: Offer gentle, neutral, and healing suggestions for emotional adjustment and self-awareness.

CRITICAL: Do not use any markdown formatting like * or #. Use the exact format 'Section Title: Content'. Each section should be a single paragraph. Output in English.`,
    },
    {
      role: "user",
      content: [
        "Dream Summary:",
        summary,
        "Provide the focused 4-part interpretation now, selecting the 2-3 most representative elements.",
      ].join("\n\n"),
    },
  ];
}

export function buildLifeConnectionInterpretationMessages({ session, lifeEvent }: { session: any; lifeEvent: string }) {
  return [
    {
      role: "system",
      content:
        `You are Veil, a professional dream analyst. The user has shared a specific life event. Provide an updated 2-part interpretation that bridges the dream to reality.

STRICT RULES:
1. No fatalism, no omens, no superstition. 
2. Follow Western cultural symbols.
3. Tone: Gentle, healing, objective, and grounded.

FIXED OUTPUT STRUCTURE (Strictly only these two sections):
Integrated Resonance: Deeply connect all core dream symbols, scenes, and emotions to the shared life event. Map each element specifically to the user's current situation, hidden emotions, or unspoken pressures. Be specific and avoid vague generalities.
Actionable Insight: Provide concrete, practical, and immediate actions or mindset adjustments. Avoid generic "soul soup" or abstract advice. Give clear, grounded steps the user can take right now.

CRITICAL: Do not use any markdown formatting like * or #. Use the exact format 'Section Title: Content'. Each section should be a single paragraph. Output in English.`,
    },
    {
      role: "user",
      content: [
        "Dream Summary:",
        session.summary,
        "Initial Interpretation:",
        session.interpretation,
        "User's Life Context:",
        lifeEvent,
        "Provide the focused 2-part life-connection mapping and actionable guidance now.",
      ].join("\n\n"),
    },
  ];
}

export function buildTarotInterpretationMessages({ session }: { session: any }) {
  const tarotCard = session.tarotCard;
  const lifeContext = session.lifeConnection || "(none provided)";

  return [
    {
      role: "system",
      content:
        `You are Veil, a professional dream analyst. Provide a concise 2-part Tarot confirmation that aligns with your psychological and minimalist philosophical approach:

The Card's Essence: Explain the psychological energy of ${tarotCard.name} and how it reflects the dream's state.
Final Nudge: A very brief closing thought or suggestion based on the synergy of the dream, life context, and card.

CRITICAL: Do not use any markdown formatting like * or #. Use the exact format 'Section Title: Content'. Each section should be a single paragraph. Output in English.`,
    },
    {
      role: "user",
      content: [
        "Dream Summary:",
        session.summary,
        "Life Context:",
        lifeContext,
        `Drawn Tarot Card: ${tarotCard.name}\nCard Meaning: ${tarotCard.meaning}`,
        "Provide the brief 2-part Tarot confirmation now.",
      ].join("\n\n"),
    },
  ];
}

export function buildLifeConnectionMessages({ session, userResponse }: { session: any; userResponse: string }) {
  return [
    {
      role: "system",
      content:
        "You are Veil. The user has just shared how your interpretation relates to their life. Provide a final, brief, and deeply resonant closing thought. Stay supportive and insightful. One or two sentences maximum.",
    },
    {
      role: "user",
      content: [
        "Dream Summary:",
        session.summary,
        "Your Interpretation:",
        session.interpretation,
        "User's reflection on life connection:",
        userResponse,
        "Provide a short, resonant closing response.",
      ].join("\n\n"),
    },
  ];
}

export function buildTitleMessages({ session }: { session: any }) {
  const summary = session.summary || session.rawEntries.join(" ");

  return [
    {
      role: "system",
      content:
        "You are Veil, creating a concise, evocative title for a dream record. The title should capture the core feeling or most striking image from the dream. Keep it short (1-2 sentences maximum). Be poetic but grounded. Do not use clickbait. Do not interpret deeply - just capture the essence.",
    },
    {
      role: "user",
      content: [
        "Dream summary or fragments:",
        summary || "(none yet)",
        "Write a concise, evocative title for this dream record.",
      ].join("\n\n"),
    },
  ];
}
