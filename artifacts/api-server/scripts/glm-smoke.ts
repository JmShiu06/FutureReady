import { generateAiExplanation } from "../src/lib/aiProvider";
import { logger } from "../src/lib/logger";

// This script is deliberately excluded from `test` and never runs during startup/build.
if (!process.argv.includes("--authorize-paid-request")) {
  logger.error("Not run. This command makes a paid GLM request. Obtain explicit authorization, then pass --authorize-paid-request.");
  process.exitCode = 1;
} else {
  try {
    const expected = "GLM connection test successful.";
    const result = await generateAiExplanation({
      instruction: `Reply with exactly: ${expected}`,
      context: { synthetic: true, task: "harmless connection test" },
    }, { env: { AI_PROVIDER: "glm", GLM_API_KEY: process.env.GLM_API_KEY } });
    if (result.explanation !== expected) throw new Error("Unexpected final answer");
    logger.info("GLM live smoke test succeeded with the expected harmless final answer.");
  } catch {
    // Never print thrown errors, upstream payloads, credentials or headers.
    logger.error("GLM live smoke test failed or returned an unexpected final answer. No automatic retry was made.");
    process.exitCode = 1;
  }
}
