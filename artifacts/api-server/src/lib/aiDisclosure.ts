import type { AiFeatureInfo, AiInfo } from "@workspace/api-zod";
import { getLlmModelInfo } from "./runpod";

const example = "User-selected fictional example plus the feature's reviewed app evidence; no real profile or CV.";
const features: AiFeatureInfo[] = [
  { id: "market-trends", title: "Summarise market trends with AI", description: "Optional narrative about dated DOSM observations supplied by the app, not a forecast or a source of new statistics.", usesLanguageModel: true, usage: "generation", inputScope: "Reviewed DOSM context and the chosen fictional example, after confirmation." },
  { id: "skill-analysis", title: "Skill analysis", description: "Explains selected saved profile skill names, complementary strengths, role context and practical learning suggestions. It does not grade skills or calculate match scores.", usesLanguageModel: true, usage: "generation", inputScope: "Only explicitly selected skill names after consent; no name, CV text, ratings or other profile fields." },
  { id: "skill-learning-guidance", title: "Skill-based learning guidance", description: "Displays the learning section of the same transient Skill analysis response. Opening this page alone does not make another model request.", usesLanguageModel: true, usage: "reused-output", inputScope: "Reuses the previously consented Skill analysis result; no additional data is sent merely by opening the page." },
  { id: "cv-analysis", title: "Optional explanation of one detected skill", description: "Explains one canonical skill chosen in the CV review. CV extraction itself does not use a language model.", usesLanguageModel: true, usage: "generation", inputScope: "One explicitly selected canonical skill name only; never the CV file or raw text." },
  ...([
    ["career-explorer", "Career explorer example", "Narrative career context for a fictional skill profile."],
    ["learning-roadmap", "Learning roadmap example explanation", "Optional narrative about a fictional skill gap and the app's existing verified resource catalogue; it does not order or modify the saved pathway."],
    ["digital-twin", "Digital twin example explanation", "Describes fictional progress and scenario assumptions, not the user's learning history."],
    ["task-exposure", "Task exposure example explanation", "Explains reviewed task traits for a fictional example, not a prediction about a person."],
    ["job-fit", "Sample listing fit explanation", "Explains existing overlap for a fictional sample listing; it cannot create a real vacancy or change the score."],
    ["sdg-contribution", "SDG example explanation", "Optional narrative about existing reviewed SDG evidence for a fictional example; it cannot create a verified mapping."],
    ["profile-skills", "Profile skills example explanation", "Explains the skill context of a fictional example, not a real private profile."],
  ] as const).map(([id, title, description]) => ({ id, title, description, usesLanguageModel: true, usage: "generation" as const, inputScope: example })),
  { id: "cv-extraction", title: "CV reading, OCR and skill detection", description: "Local PDF/DOCX/text extraction, offline OCR, exact/related skill matching and local candidate-name recognition. No language-model generation request is used.", usesLanguageModel: false, usage: "local", inputScope: "The upload is processed transiently by this backend; the file and full extracted text are not sent to a language model." },
];

/** Uses the generator's runtime identity, not a second model-name constant. */
export function getAiDisclosure(env: Record<string, string | undefined> = process.env): AiInfo {
  return {
    ...getLlmModelInfo(env),
    features,
    nonAiUses: [
      "Match scores and O*NET skill overlap use the existing documented deterministic formula.",
      "Suitability and scenario rankings use reviewed data and documented assumptions, not language-model output.",
      "Skill gaps, roadmap order, time and cost estimates are calculated by application rules and the curated resource catalogue.",
      "SDG mappings come from reviewed role-and-duty evidence; an AI explanation cannot create or verify a mapping.",
      "DOSM data refreshes and research/source retrieval fetch existing sources; they do not generate facts with a language model.",
      "CV extraction, OCR, skill detection and candidate-name recognition run locally without a language model.",
    ],
    guardrails: [
      "AI receives only the feature's disclosed, consented input: selected skill names, or explicitly labelled fictional examples and reviewed public evidence.",
      "The app supplies and attaches its reviewed source evidence. Check the cited sources; AI wording may contain mistakes and is not independently verified evidence.",
      "AI must not invent jobs, courses, URLs or statistics. Structured outputs are checked against the app's allowed records and evidence boundaries.",
      "AI text never changes scores, confirmed skills, saved roadmap progress or SDG mappings. Users make the final learning and career decisions.",
    ],
    dataPractices: [
      "CV files and full extracted text are processed transiently and are not saved by the backend or sent to the language model.",
      "A detected candidate name stays in the in-memory CV session. Reviewed skills and other profile fields can be saved to this browser after confirmation.",
      "Device profiles, preferences and roadmap progress may be stored in browser storage; this is not a claim that the browser stores no personal data.",
      "Skill-analysis inputs and results are transient and are not persisted or logged by the backend. Use fictional or redacted data for demonstrations.",
      "This public disclosure endpoint returns model identity and feature descriptions only, never API keys, endpoint URLs, prompts or CV/profile contents.",
    ],
  };
}
