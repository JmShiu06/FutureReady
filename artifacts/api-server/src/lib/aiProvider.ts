import { generateLlmExplanation, RunpodConfigurationError } from "./runpod";
import { generateGlmExplanation, GlmPrivacyError } from "./glm";

type Input = Parameters<typeof generateLlmExplanation>[0];
type Options = Parameters<typeof generateLlmExplanation>[1] & { signal?: AbortSignal };

/** Early CV-route guard, independent of CV parsing and its schema. */
export function assertCvProviderAllowed(env: Record<string, string | undefined> = process.env): void {
  if (env.AI_PROVIDER?.trim() === "glm") throw new GlmPrivacyError();
}

/** Server configuration only: never accept a provider choice or credentials in request bodies. */
export async function generateAiExplanation(input: Input, options: Options = {}): Promise<{ explanation: string }> {
  const env = options.env ?? process.env;
  switch (env.AI_PROVIDER?.trim() || "qwen") {
    case "qwen": return generateLlmExplanation(input, options);
    case "glm": return generateGlmExplanation(input, options);
    default: throw new RunpodConfigurationError("Unsupported AI_PROVIDER. Choose qwen or glm in the server configuration.");
  }
}
