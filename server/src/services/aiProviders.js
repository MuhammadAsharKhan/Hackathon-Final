const TIMEOUT_MS = 20000;

export class ProviderError extends Error {
  constructor(kind, summary, retryAfterSeconds = 0) {
    super(summary);
    this.name = "ProviderError";
    this.kind = kind;
    this.summary = summary;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const postJson = async (url, headers, body) => {
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new ProviderError("cooldown", "Request timed out");
    }
    throw new ProviderError("cooldown", "Network error");
  }
};

const readErrorBody = async (response) => {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return "";
  }
};

const classifyStatus = (status, body) => {
  if (status === 401 || status === 403) return "auth";
  if (/api key not valid/i.test(body)) return "auth";
  if (status === 429 || status >= 500) return "cooldown";
  return "request";
};

const retryAfterSeconds = (response) => {
  const value = Number(response.headers.get("retry-after"));
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
};

const failFromResponse = async (response) => {
  const body = await readErrorBody(response);
  const kind = classifyStatus(response.status, body);
  const summary =
    kind === "auth"
      ? "Invalid API key"
      : `${response.status} ${response.statusText}`.trim();

  throw new ProviderError(kind, summary, retryAfterSeconds(response));
};

export const askGemini = async ({
  apiKey,
  model,
  baseUrl,
  systemPrompt,
  messages,
}) => {
  const url = `${baseUrl}/models/${model}:generateContent`;
  const response = await postJson(
    url,
    { "x-goog-api-key": apiKey },
    {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
    }
  );

  if (!response.ok) await failFromResponse(response);

  const payload = await response.json();
  const parts = payload.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => part.text || "")
    .join("")
    .trim();
};

export const askGrok = async ({
  apiKey,
  model,
  baseUrl,
  systemPrompt,
  messages,
}) => {
  const url = `${baseUrl}/chat/completions`;
  const response = await postJson(
    url,
    { Authorization: `Bearer ${apiKey}` },
    {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    }
  );

  if (!response.ok) await failFromResponse(response);

  const payload = await response.json();
  return String(payload.choices?.[0]?.message?.content || "").trim();
};
