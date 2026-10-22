import { careerDataset, matchProfileSkills } from "./careerMatcher";
import { featureInstruction } from "./llmPrompts";

export type AiFeature = "career-explorer" | "cv-analysis" | "learning-roadmap" | "digital-twin" | "task-exposure" | "market-trends" | "job-fit" | "sdg-contribution" | "profile-skills";
export type AiSampleId = "data-starter" | "operations-starter";

const examples = {
  "data-starter": {
    label: "Fictional data starter",
    skills: ["Python", "Excel", "data visualization"],
    role: "Data Analyst / BI",
    confirmedSkill: "SQL",
    taskTraits: ["repeated digital data preparation", "human judgment when checking results"],
  },
  "operations-starter": {
    label: "Fictional operations starter",
    skills: ["project coordination", "customer research", "data storytelling"],
    role: "Business Analyst",
    confirmedSkill: "SQL",
    taskTraits: ["repeatable reporting", "people-facing communication", "accountability for exceptions"],
  },
} as const;

export function syntheticExplanationContext(feature: AiFeature, sampleId: AiSampleId): {
  instruction: string; context: Record<string, unknown>; sampleLabel: string; contextSummary: string[];
} {
  const sample = examples[sampleId];
  const result = matchProfileSkills(careerDataset, [...sample.skills]);
  const match = result.matches.find(item => item.roleFamily === sample.role);
  if (!match) throw new Error("Synthetic example role is not in the dataset.");
  const after = matchProfileSkills(careerDataset, [...sample.skills, sample.confirmedSkill])
    .matches.find(item => item.roleFamily === sample.role);
  const summary = [
    `Synthetic skills: ${sample.skills.join(", ")}`,
    `Dataset role: ${sample.role}`,
    `Deterministic overlap: ${match.matchedSkills.length}/${match.skillsConsidered} (${match.score}%), not a hiring probability.`,
  ];
  const context: Record<string, unknown> = {
    synthetic: true,
    sample: sample.label,
    skills: sample.skills,
    targetRole: sample.role,
    dataset: careerDataset.source.datasetName,
    measurement: "Skill overlap only; not Malaysian demand, employability, or a hiring probability.",
    exactAndRelatedMappings: result.skillMappings,
    deterministicMatch: match,
  };
  if (feature === "cv-analysis") {
    context.cvInput = "Fictional reviewed skill detections only; no document text, name, contact details, or real CV.";
    summary.push("Fictional reviewed CV skills only; no uploaded CV or text is sent.");
  }
  if (feature === "digital-twin") {
    context.fictionalConfirmation = { completedMilestoneOnlyChangesProgress: true, separatelyConfirmedSkill: sample.confirmedSkill, after };
    summary.push(`Fictional separate skill confirmation: ${sample.confirmedSkill}; no real profile changes.`);
  }
  if (feature === "learning-roadmap") summary.push("Practice suggestions only; your existing roadmap and progress are unchanged.");
  if (feature === "task-exposure") {
    context.taskTraits = sample.taskTraits;
    summary.push(`Synthetic task traits: ${sample.taskTraits.join("; ")}`);
  }
  return { instruction: featureInstruction(feature), context, sampleLabel: sample.label, contextSummary: summary };
}
