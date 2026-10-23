import { generateAiExplanation } from "../src/lib/aiProvider";
import { logger } from "../src/lib/logger";

// This script is deliberately excluded from `test` and never runs during startup/build.
if (!process.argv.includes("--authorize-paid-request")) {
  logger.error("Not run. This command makes a paid GLM request. Obtain explicit authorization, then pass --authorize-paid-request.");
  process.exitCode = 1;
} else {
  let submissions = 0;
  const statuses: { operation: string; httpStatus: number; jobStatus?: string }[] = [];
  let usage: Record<string, number> | undefined;
  const fetcher: typeof fetch = async (url, init) => {
    const path = new URL(String(url)).pathname;
    const operation = path.endsWith("/run") ? "submit" : path.includes("/status/") ? "poll" : "cancel";
    if (operation === "submit" && ++submissions > 1) throw new Error("Second submission blocked");
    const response = await fetch(url, init);
    const record: typeof statuses[number] = { operation, httpStatus: response.status };
    statuses.push(record);
    // Inspect a bounded clone; never log payloads, IDs, headers or upstream error text.
    try {
      const reader = response.clone().body?.getReader();
      if (reader) {
        const chunks: Uint8Array[] = [];
        let bytes = 0;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 65536) { void reader.cancel(); throw new Error("Too large"); }
          chunks.push(value);
        }
        const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (["COMPLETED", "IN_QUEUE", "IN_PROGRESS", "FAILED", "CANCELLED", "TIMED_OUT"].includes(data.status)) record.jobStatus = data.status;
        const reported = data.output?.[0]?.result?.usage ?? data.usage;
        if (reported && typeof reported === "object") {
          usage = {};
          for (const key of ["prompt_tokens", "completion_tokens", "total_tokens", "cost"]) {
            if (typeof reported[key] === "number" && Number.isFinite(reported[key])) usage[key] = reported[key];
          }
        }
      }
    } catch { /* Diagnostics never replace adapter validation. */ }
    return response;
  };
  try {
    const expected = "GLM connection test successful.";
    const result = await generateAiExplanation({
      instruction: `Reply with exactly: ${expected}`,
      context: { synthetic: true, task: "harmless connection test" },
    }, { env: { AI_PROVIDER: "glm", GLM_API_KEY: process.env.GLM_API_KEY }, fetcher });
    if (result.explanation !== expected) throw new Error("Unexpected final answer");
    if (result.provider?.id !== "glm") throw new Error("Provider not confirmed");
    logger.info({ submissions, statuses, nonEmpty: Boolean(result.explanation), matchedExpected: true,
      providerId: result.provider.id, usage: usage ?? null }, "GLM smoke result");
    logger.info("GLM live smoke test succeeded with the expected harmless final answer.");
  } catch {
    // Never print thrown errors, upstream payloads, credentials or headers.
    logger.error("GLM live smoke test failed or returned an unexpected final answer. No automatic retry was made.");
    logger.info({ submissions, statuses, usage: usage ?? null }, "Redacted GLM smoke diagnostics");
    process.exitCode = 1;
  }
}
