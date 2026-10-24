import LeaveType from "../models/LeaveType.js";
import ApiError from "../utils/ApiError.js";
import { now } from "../utils/clock.js";
import { todayIn } from "../utils/dates.js";
import { callWithPool } from "./aiKeyPool.js";
import { buildSystemPrompt } from "./aiPrompts.js";
import { loadAiSettings } from "./aiSetup.js";
import { executeTool, toolsForRole } from "./aiTools.js";
import { getSettings } from "./settingsService.js";

export const MAX_MODEL_CALLS = 4;
export const TOTAL_BUDGET_MS = 15000;
export const HISTORY_LIMIT = 20;
export const AI_UNAVAILABLE =
  "The assistant is not available right now. Please try again in a minute.";
const STEPS_EXHAUSTED =
  "I could not finish that answer. Please ask a narrower question.";

// A provider failure, a missing key or a timeout all reach the client as the
// same friendly message; the code stays for the server log.
export const normalizeAiError = (error) => {
  if (error instanceof ApiError && error.statusCode === 503) {
    return new ApiError(503, AI_UNAVAILABLE, undefined, error.code ?? "ai_unavailable");
  }
  return error;
};

const loadPromptContext = async (user, currentInstant) => {
  const [companySettings, leaveTypes, aiSettings] = await Promise.all([
    getSettings(),
    LeaveType.find().sort({ code: 1 }).lean(),
    loadAiSettings(),
  ]);

  const today = todayIn(companySettings?.timezone, currentInstant);

  return {
    aiSettings,
    systemPrompt: buildSystemPrompt({
      user,
      settings: companySettings,
      leaveTypes,
      today,
    }),
  };
};

const runToolCalls = async (toolCalls, context, allowedNames) => {
  const results = [];

  for (const call of toolCalls) {
    const result = await executeTool(call.name, call.arguments, context, allowedNames);
    results.push({
      call,
      content: JSON.stringify(result),
    });
  }

  return results;
};

export const runChat = async ({
  user,
  message,
  conversation,
  now: currentInstant = now(),
}) => {
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const { aiSettings, systemPrompt } = await loadPromptContext(user, currentInstant);
  const tools = toolsForRole(user.role);
  const toolsUsed = [];

  const history = (conversation?.messages ?? [])
    .slice(-HISTORY_LIMIT)
    .map((entry) => ({ role: entry.role, content: entry.content }));

  const messages = [...history, { role: "user", content: message }];
  const allowedTools = new Set(tools.map((tool) => tool.name));
  const context = {
    user,
    employeeId: user.employeeId ?? null,
    now: currentInstant,
  };

  for (let step = 1; step <= MAX_MODEL_CALLS; step += 1) {
    if (Date.now() >= deadline) {
      throw new ApiError(503, AI_UNAVAILABLE, undefined, "ai_timeout");
    }

    // The last call carries no tools, so the model has to answer in text.
    const allowTools = step < MAX_MODEL_CALLS;
    let answer;
    try {
      answer = await callWithPool({
        settings: aiSettings,
        systemPrompt,
        messages,
        tools: allowTools ? tools : [],
        deadline,
      });
    } catch (error) {
      throw normalizeAiError(error);
    }

    messages.push({
      role: "assistant",
      content: answer.text,
      toolCalls: answer.toolCalls,
    });

    if (answer.toolCalls.length === 0) {
      return {
        reply: answer.text,
        toolsUsed,
        provider: answer.provider,
        model: answer.model,
      };
    }

    if (!allowTools) {
      return {
        reply: answer.text || STEPS_EXHAUSTED,
        toolsUsed,
        provider: answer.provider,
        model: answer.model,
      };
    }

    const results = await runToolCalls(answer.toolCalls, context, [...allowedTools]);
    for (const result of results) {
      // A rejected tool never ran, so it is not reported as used.
      if (allowedTools.has(result.call.name)) toolsUsed.push(result.call.name);
      messages.push({
        role: "tool",
        toolCallId: result.call.id,
        name: result.call.name,
        content: result.content,
      });
    }
  }

  return { reply: STEPS_EXHAUSTED, toolsUsed, provider: "", model: "" };
};
