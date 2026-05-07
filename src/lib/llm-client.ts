export async function callLLM(messages: any[], temperature = 0.7) {
  const response = await fetch("/api/dream-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages, temperature }),
  });

  if (!response.ok) {
    throw new Error("Failed to get response from LLM");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
