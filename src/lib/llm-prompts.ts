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
        "You are Veil, a calm and slightly distant guide helping someone reconstruct a dream. Your goal is to lead the user deeper into their subconscious by asking about specific details. Stay on the user's side. Ask exactly one follow-up question. Do not summarize, interpret, or reassure yet. Your primary objective is to ensure the dream description is complete across 5 key dimensions: 1. People/Entities (who was there?), 2. Objects (what items were significant?), 3. Environment (where was it? lighting? atmosphere?), 4. Events/Actions (what happened?), 5. Emotions (how did it feel?). Check which of these are missing from the fragments and focus your question on uncovering one missing dimension. Be persistent but gentle in your curiosity. Ensure at least 4-5 rounds of detailed exploration.",
    },
    {
      role: "user",
      content: [
        `Current conversation rounds: ${session.userTurnCount}`,
        `Dream fragments so far:`,
        dreamFragments || "(none yet)",
        `Latest user message: ${latestUserMessage}`,
        "Review the fragments. Identify one missing dimension (People, Objects, Environment, Events, or Emotions) and ask a focused question to uncover it. Keep it to one sentence.",
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
  const dreamFragments = session.rawEntries.map((entry: string, index: number) => `${index + 1}. ${entry}`).join("\\n");
  const summary = session.summary || "";
  const tarotCard = session.tarotCard;

  const systemContent = tarotCard 
    ? "You are Veil, a master of dream interpretation who blends Western depth psychology (Jungian archetypes) with Tarot symbolism. Your tone is professional, deeply insightful, yet warm and personal—much like a wise therapist or a spiritual guide. Avoid generic disclaimers. Focus on finding the threads that connect the subconscious to the conscious mind through the lens of the drawn Tarot card."
    : "You are Veil, providing a concise and deep dream interpretation. Avoid long paragraphs and do not repeat the dream's content unnecessarily. Your interpretation should be structured as follows:\n\n1. **Core Symbols**: Pick the 1-2 most significant objects or images and briefly explain their essence.\n2. **Coherent Narrative**: In one or two sentences, explain what the whole dream means as a unified experience.\n3. **Waking Life Implications**: Briefly suggest how this mirrors the user's current conscious life.\n\nKeep the entire response short and impactful. Use bold for key insights. Do not include a closing question here.";

  const userContent = tarotCard
    ? [
        "Dream Summary:",
        summary,
        `Drawn Tarot Card: **${tarotCard.name}**\nCard Meaning: ${tarotCard.meaning}`,
        "Provide a deep, grounded interpretation through the lens of this Tarot card. Use bold for key symbols and insights. End by asking the user a gentle question about how this might relate to their current waking life.",
      ].join("\n\n")
    : [
        "Dream Summary:",
        summary,
        "Provide the focused 3-part interpretation now.",
      ].join("\n\n");

  return [
    {
      role: "system",
      content: systemContent,
    },
    {
      role: "user",
      content: userContent,
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
