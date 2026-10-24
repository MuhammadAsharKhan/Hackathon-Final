import AiLog from "../models/AiLog.js";

const trimMessage = (value) => String(value ?? "").slice(0, 500);

export const recordAiLog = async ({
  user,
  kind,
  message,
  toolsUsed = [],
  status = "ok",
  latencyMs = 0,
  error = "",
}) => {
  try {
    await AiLog.create({
      userId: user?.id ?? null,
      role: user?.role ?? "",
      kind,
      message: trimMessage(message),
      toolsUsed,
      status,
      latencyMs,
      error: String(error ?? "").slice(0, 300),
    });
  } catch (logError) {
    // A failed log must never hide the answer from the user.
    console.warn(`AI log write failed: ${logError.message}`);
  }
};

// Runs one AI request and records its outcome. The caller keeps its own error
// handling; this only measures and logs.
export const runLoggedAi = async ({ user, kind, message, execute }) => {
  const startedAt = Date.now();

  try {
    const result = await execute();
    await recordAiLog({
      user,
      kind,
      message,
      toolsUsed: result?.toolsUsed ?? [],
      status: "ok",
      latencyMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    const status = error?.code === "ai_timeout" ? "timeout" : "error";
    await recordAiLog({
      user,
      kind,
      message,
      status,
      error: error?.message ?? "",
      latencyMs: Date.now() - startedAt,
    });
    throw error;
  }
};
