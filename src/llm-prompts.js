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
