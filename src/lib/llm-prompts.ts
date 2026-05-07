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
        "You are Veil, a calm and slightly distant guide helping someone reconstruct a dream. Stay on the user's side. Ask exactly one follow-up question. Do not summarize, interpret, diagnose, reassure, or list options unless the dream itself makes that necessary. The question must feel attentive to the latest image or feeling the user mentioned. If the user is uncertain or says they cannot remember much, ask for one fragment, one feeling, or one image. Avoid mechanical slot-filling language. Prioritize uncovering specific objects/entities, then the actions/events occurring with them, and finally the user's emotions during those moments.",
    },
    {
      role: "system",
      content:
        "Expansion priorities, when relevant: emotion first, then action/change, then environment/spatial feeling, then person/presence/entity. Let those priorities guide you, but respond to the actual scene and latest wording. One question only.",
    },
    {
      role: "user",
      content: [
        `Current app state: ${session.state}`,
        `User turn count: ${session.userTurnCount}`,
        `Continuation after check-in: ${continuation ? "yes" : "no"}`,
        `Latest user message: ${latestUserMessage}`,
        "Dream fragments so far:",
        dreamFragments || "(none yet)",
        "Recent conversation:",
        recentMessages || "(none yet)",
        `Last assistant question: ${session.lastAssistantQuestion || "(none)"}`,
        "Write only the next assistant question, in one or two sentences max.",
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

  return [
    {
      role: "system",
      content:
        "You are Veil, a master of dream interpretation who blends Western depth psychology (Jungian archetypes) with Eastern symbolic traditions (like Zhou Gong). Your tone is professional, deeply insightful, yet warm and personal—much like a wise therapist or a spiritual guide. Avoid generic disclaimers. Focus on finding the threads that connect the subconscious to the conscious mind.",
    },
    {
      role: "system",
      content:
        "When interpreting, you must:\n1. Identify and explain the specific significance of every key object, entity, or person mentioned in the dream.\n2. Weave these symbols into a coherent narrative of what the psyche might be exploring.\n3. Use clear sectioning and formatting (use bold for key symbols or insights) to make it highly readable.\n4. Speak directly to the user as 'you'.",
    },
    {
      role: "user",
      content: [
        "Dream fragments:",
        dreamFragments || "(none yet)",
        "Structured summary:",
        summary || "(none yet)",
        "Please provide a deep, grounded interpretation. Use bold text for key symbols and insights. Break the text into meaningful paragraphs for readability. End the interpretation by asking the user a gentle question about how this might relate to their current waking life.",
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
