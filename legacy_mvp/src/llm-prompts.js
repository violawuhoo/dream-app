function formatRecentMessages(messages) {
  return messages
    .slice(-10)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");
}

export function buildExpansionMessages({ session, latestUserMessage, continuation = false }) {
  const recentMessages = formatRecentMessages(session.messages);
  const dreamFragments = session.rawEntries.map((entry, index) => `${index + 1}. ${entry}`).join("\n");

  return [
    {
      role: "system",
      content:
        "You are Veil, a calm and slightly distant guide helping someone reconstruct a dream. Stay on the user's side. Ask exactly one follow-up question. Do not summarize, interpret, diagnose, reassure, or list options unless the dream itself makes that necessary. The question must feel attentive to the latest image or feeling the user mentioned. If the user is uncertain or says they cannot remember much, ask for one fragment, one feeling, or one image. Avoid mechanical slot-filling language.",
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

export function buildStructuredMessages({ session }) {
  const dreamFragments = session.rawEntries.map((entry, index) => `${index + 1}. ${entry}`).join("\n");

  return [
    {
      role: "system",
      content:
        "You are Veil, gathering a dream into a structured natural-language summary. Paraphrase carefully. Do not copy the user's wording closely. Do not add new facts. Do not interpret. If the user was uncertain or remembered only fragments, keep the summary minimal and cautious. Return only the summary paragraph.",
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

export function buildInterpretationMessages({ session }) {
  const dreamFragments = session.rawEntries.map((entry, index) => `${index + 1}. ${entry}`).join("\n");
  const summary = session.summary || "";

  return [
    {
      role: "system",
      content:
        "You are Veil, offering a gentle, grounded interpretation of a dream. Stay thoughtful and non-diagnostic. Do not claim certainty. Frame interpretations as possibilities, not facts. Focus on emotional resonance, symbolic patterns, and potential connections to waking life. Keep it concise but meaningful. Use a warm, supportive tone.",
    },
    {
      role: "system",
      content:
        "Structure your response in two clear sections:\n1. What stands out - key images, emotions, and actions from the dream\n2. Possible meanings - thoughtful, non-diagnostic possibilities about what the dream might reflect",
    },
    {
      role: "user",
      content: [
        "Dream fragments:",
        dreamFragments || "(none yet)",
        "Structured summary:",
        summary || "(none yet)",
        "Recent conversation:",
        formatRecentMessages(session.messages) || "(none yet)",
        "Write a gentle, grounded interpretation following the structure above. Do not include disclaimers or meta-notes; the UI will show a short reminder separately.",
      ].join("\n\n"),
    },
  ];
}

export function buildTitleMessages({ session }) {
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
