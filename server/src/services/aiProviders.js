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

const safeArguments = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const geminiContents = (messages) =>
  messages.map((message) => {
    if (message.role === "assistant") {
      const parts = [];
      if (message.content) parts.push({ text: message.content });
      for (const call of message.toolCalls ?? []) {
        parts.push({
          functionCall: { name: call.name, args: call.arguments ?? {} },
          // Gemini 3 rejects the next turn when a function call comes back
          // without the signature it issued with that call.
          ...(call.signature ? { thoughtSignature: call.signature } : {}),
        });
      }
      return { role: "model", parts };
    }

    if (message.role === "tool") {
      const response = safeArguments(message.content);
      return {
        role: "user",
        parts: [
          {
            functionResponse: {
              name: message.name,
              response: { result: response },
            },
          },
        ],
      };
    }

    return { role: "user", parts: [{ text: message.content }] };
  });

export const askGemini = async ({
  apiKey,
  model,
  baseUrl,
  systemPrompt,
  messages,
  tools = [],
  timeoutMs,
}) => {
  const url = `${baseUrl}/models/${model}:generateContent`;
  const response = await postJsonRequest(
    url,
    { "x-goog-api-key": apiKey },
    {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: geminiContents(messages),
      ...(tools.length > 0
        ? {
            tools: [{ functionDeclarations: tools }],
            toolConfig: { functionCallingConfig: { mode: "AUTO" } },
          }
        : {}),
    },
    timeoutMs
  );

  if (!response.ok) await throwProviderError(response);

  const responseBody = await readJsonResponse(response);
  const parts = responseBody.candidates?.[0]?.content?.parts || [];

  const text = parts
    .filter((part) => typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();

  const toolCalls = parts
    .filter((part) => part.functionCall?.name)
    .map((part, index) => ({
      id: `gemini-${index}`,
      name: part.functionCall.name,
      arguments: safeArguments(part.functionCall.args),
      signature: part.thoughtSignature ?? null,
    }));

  return { text, toolCalls };
};

const openAiMessages = (systemPrompt, messages) => [
  { role: "system", content: systemPrompt },
  ...messages.map((message) => {
    if (message.role === "assistant") {
      return {
        role: "assistant",
        content: message.content || null,
        ...(message.toolCalls?.length
          ? {
              tool_calls: message.toolCalls.map((call) => ({
                id: call.id,
                type: "function",
                function: {
                  name: call.name,
                  arguments: JSON.stringify(call.arguments ?? {}),
                },
              })),
            }
          : {}),
      };
    }

    if (message.role === "tool") {
      return {
        role: "tool",
        tool_call_id: message.toolCallId,
        // The OpenAI shape only carries text, so a structured result is sent
        // as its JSON string.
        content:
          typeof message.content === "string"
            ? message.content
            : JSON.stringify(message.content ?? {}),
      };
    }

    return { role: "user", content: message.content };
  }),
];

export const askGrok = async ({
  apiKey,
  model,
  baseUrl,
  systemPrompt,
  messages,
  tools = [],
  timeoutMs,
}) => {
  const url = `${baseUrl}/chat/completions`;
  const response = await postJsonRequest(
    url,
    { Authorization: `Bearer ${apiKey}` },
    {
      model,
      messages: openAiMessages(systemPrompt, messages),
      ...(tools.length > 0
        ? {
            tools: tools.map((tool) => ({ type: "function", function: tool })),
            tool_choice: "auto",
          }
        : {}),
    },
    timeoutMs
  );

  if (!response.ok) await throwProviderError(response);

  const responseBody = await readJsonResponse(response);
  const choice = responseBody.choices?.[0]?.message ?? {};

  const toolCalls = (choice.tool_calls ?? [])
    .filter((call) => call.function?.name)
    .map((call) => ({
      id: call.id,
      name: call.function.name,
      arguments: safeArguments(call.function.arguments),
    }));

  return { text: String(choice.content || "").trim(), toolCalls };
};
