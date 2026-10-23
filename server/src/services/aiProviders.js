const TIMEOUT_MS = 12000;

export class ProviderError extends Error {
  constructor(kind, summary, retryAfterSeconds = 0) {
    super(summary);
    this.name = "ProviderError";
    this.kind = kind;
    this.summary = summary;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const isAbortError = (error) =>
  error.name === "TimeoutError" || error.name === "AbortError";

const postJsonRequest = async (url, headers, body, timeoutMs = TIMEOUT_MS) => {
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (networkError) {
    if (isAbortError(networkError)) {
      throw new ProviderError("cooldown", "Request timed out");
    }
    throw new ProviderError("cooldown", "Network error");
  }
};

// A 200 answer can still be HTML or cut off. The abort also fires while the
// body is read, which happens outside the fetch call above.
const readJsonResponse = async (response) => {
  try {
    return await response.json();
  } catch (readError) {
    if (isAbortError(readError)) {
      throw new ProviderError("cooldown", "Request timed out");
    }
    throw new ProviderError("request", "Provider returned an unreadable response");
  }
};

const readErrorResponse = async (response) => {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return "";
  }
};

// Auth errors disable a key. Rate limits and server errors cool it down.
const classifyStatus = (status, responseBody) => {
  if (status === 401 || status === 403) return "auth";
  if (/api key not valid/i.test(responseBody)) return "auth";
  if (status === 429 || status >= 500) return "cooldown";
  return "request";
};

const readRetryAfterSeconds = (response) => {
  const seconds = Number(response.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0;
};

const throwProviderError = async (response) => {
  const responseBody = await readErrorResponse(response);
  const kind = classifyStatus(response.status, responseBody);
  const summary =
    kind === "auth"
      ? "Invalid API key"
      : `${response.status} ${response.statusText}`.trim();

  throw new ProviderError(
    kind,
    summary,
    readRetryAfterSeconds(response)
  );
};

export const askGemini = async ({
  apiKey,
  model,
  baseUrl,
  systemPrompt,
  messages,
  timeoutMs,
}) => {
  const url = `${baseUrl}/models/${model}:generateContent`;
  const response = await postJsonRequest(
    url,
    { "x-goog-api-key": apiKey },
    {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
    },
    timeoutMs
  );

  if (!response.ok) await throwProviderError(response);

  const responseBody = await readJsonResponse(response);
  const contentParts =
    responseBody.candidates?.[0]?.content?.parts || [];

  return contentParts
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
  timeoutMs,
}) => {
  const url = `${baseUrl}/chat/completions`;
  const response = await postJsonRequest(
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
    },
    timeoutMs
  );

  if (!response.ok) await throwProviderError(response);

  const responseBody = await readJsonResponse(response);
  return String(
    responseBody.choices?.[0]?.message?.content || ""
  ).trim();
};
