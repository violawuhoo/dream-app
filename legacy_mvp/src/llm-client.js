async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "The dream thread could not reach the model.");
  }
  return payload;
}

export async function requestDreamFollowUp({ session, latestUserMessage, continuation = false }) {
  const payload = await postJson("/api/dream-chat", {
    stage: "expand",
    session,
    latestUserMessage,
    continuation,
  });

  return payload.content;
}

export async function requestDreamSummary({ session }) {
  const payload = await postJson("/api/dream-chat", {
    stage: "struct",
    session,
  });

  return payload.content;
}

export async function requestDreamInterpretation({ session }) {
  const payload = await postJson("/api/dream-chat", {
    stage: "interpret",
    session,
  });

  return payload.content;
}

export async function requestDreamTitle({ session }) {
  const payload = await postJson("/api/dream-chat", {
    stage: "title",
    session,
  });

  return payload.content;
}
