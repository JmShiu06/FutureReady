import { z } from "zod";
import type { AiEvidence, AiSkillSuggestion } from "@workspace/api-zod";
import { careerDataset } from "./careerMatcher";
import { detectSkills } from "./cvSkillExtractor";
import { parseSkillSuggestions, validateQualitativeAnswer, type prepareAiContext } from "./aiEvidence";

type PreparedContext = Awaited<ReturnType<typeof prepareAiContext>>;
const prose = z.string().trim().min(1).max(2400).refine(text => !/^(?:\{|\[)|```/.test(text), "Expected explanation prose, not JSON or code fences.");
const reason = z.string().trim().min(1).max(240);
const cvOutput = z.object({
  explanation: prose,
  skills: z.array(z.object({ skill: z.string().min(1).max(60), evidence: z.string().min(1).max(240) }).strict()).max(12),
}).strict();
const roadmapOutput = z.object({
  explanation: prose,
  resources: z.array(z.object({ resourceId: z.string().min(1).max(120), reason }).strict()).max(6),
}).strict();
const marketOutput = z.object({ explanation: prose, sourceIds: z.array(z.string().min(1).max(120)).min(1).max(6) }).strict();

/** Validate every machine-readable reference before rendering into the unchanged API envelope. */
export function parseFeatureAnswer(text: string, context: PreparedContext): {
  explanation: string; contextSummary: string[]; evidence: AiEvidence[]; suggestions?: AiSkillSuggestion[];
} {
  const extra: string[] = [];
  const evidence = [...context.evidence];
  let explanation: string;
  let suggestions: AiSkillSuggestion[] | undefined;
  if (context.output === "profile-skills") {
    suggestions = parseSkillSuggestions(text, context.allowedSuggestions);
    explanation = "Review these AI-suggested skills for the fictional career goal. Confirm each skill and self-rate proficiency before adding it to your draft.";
  } else if (context.output === "cv-skills") {
    const result = cvOutput.parse(JSON.parse(text));
    const cv = context.context.fictionalCv as { text: string };
    const allowed = context.context.canonicalCandidates as string[];
    const seen = new Set<string>();
    for (const candidate of result.skills) {
      if (!careerDataset.allSkills.includes(candidate.skill) || !allowed.includes(candidate.skill)
        || seen.has(candidate.skill) || !cv.text.includes(candidate.evidence)
        || !detectSkills(candidate.evidence).includes(candidate.skill)) {
        throw new Error("Unsupported canonical skill or CV evidence.");
      }
      seen.add(candidate.skill);
      extra.push(`AI candidate (not proficiency): ${candidate.skill}; exact fictional CV evidence: "${candidate.evidence}"`);
    }
    if (!result.skills.length) extra.push("No supported AI skill candidates returned; the local extraction remains available.");
    explanation = result.explanation;
  } else if (context.output === "resource-references") {
    const result = roadmapOutput.parse(JSON.parse(text));
    const seen = new Set<string>();
    for (const reference of result.resources) {
      const resource = context.resources.find(item => item.id === reference.resourceId);
      if (!resource || seen.has(reference.resourceId)) throw new Error("Unsupported or duplicate resource reference.");
      validateQualitativeAnswer(reference.reason);
      seen.add(reference.resourceId);
      extra.push(`Validated catalogue ID ${resource.id}: ${reference.reason}`);
      evidence.push({
        title: `${resource.title} — ${resource.provider}`, url: resource.url,
        note: `Catalogue facts: ${resource.cost}; ${resource.duration_label}. These facts and the URL come from the existing catalogue, not the model.`,
      });
    }
    if (!result.resources.length) extra.push("No verified resource references returned; do not treat practice suggestions as verified courses.");
    explanation = result.explanation;
  } else if (context.output === "source-references") {
    const result = marketOutput.parse(JSON.parse(text));
    if (new Set(result.sourceIds).size !== result.sourceIds.length
      || result.sourceIds.some(id => !context.sourceIds.includes(id))
      || context.sourceIds.some(id => !result.sourceIds.includes(id))) {
      throw new Error("Unsupported, missing or duplicate source reference.");
    }
    extra.push(`Validated evidence source IDs: ${result.sourceIds.join(", ")}`);
    explanation = result.explanation;
  } else {
    explanation = prose.parse(text);
  }
  validateQualitativeAnswer(explanation);
  return { explanation, suggestions, contextSummary: [...context.contextSummary, ...extra], evidence };
}
