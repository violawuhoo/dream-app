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
        "You are Veil, a master of dream interpretation. Your interpretation MUST strictly follow this 3-part structure:\n\n1. **Core Symbols**: Pick the 1-2 most significant objects or images and briefly explain their essence.\n2. **Coherent Narrative**: In one or two sentences, explain what the whole dream means as a unified experience.\n3. **Waking Life Implications**: Briefly suggest how this mirrors the user's current conscious life.\n\nKeep the entire response concise and impactful. Use bold for key insights.",
    },
    {
      role: "user",
      content: [
        "Dream Summary:",
        summary,
        "Provide the focused 3-part interpretation now.",
      ].join("\n\n"),
    },
  ];
}

export function buildLifeConnectionInterpretationMessages({ session, lifeEvent }: { session: any; lifeEvent: string }) {
  return [
    {
      role: "system",
      content:
        "You are Veil. The user has provided a specific life event or feeling that they believe connects to their dream. Your task is to provide an updated, more grounded 3-part interpretation that weaves the dream symbols together with this waking-life context.\n\nStructure:\n1. **Refined Symbols**: Re-examine the symbols in light of the new context.\n2. **Integrated Narrative**: How the dream and the life event form a single story.\n3. **Direct Life Guidance**: Specific psychological advice or insight based on this connection.\n\nUse bold for key insights.",
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
        "Provide the updated 3-part interpretation now.",
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
        `You are Veil, a master of dream interpretation and Tarot. Your interpretation MUST strictly follow this 2-part structure:

1. **The Card's Essence**: Explain what the drawn card (**${tarotCard.name}**) means in its traditional sense.
2. **Integrated Confirmation**: Explain what this card, combined with the dream and the user's life context, offers as a final insight or confirmation.

Keep it deep, resonant, and concise. Use bold for key insights.`,
    },
    {
      role: "user",
      content: [
        "Dream Summary:",
        session.summary,
        "Life Context:",
        lifeContext,
        `Drawn Tarot Card: **${tarotCard.name}**\nCard Meaning: ${tarotCard.meaning}`,
        "Provide the focused 2-part Tarot interpretation now.",
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
