import { z } from "zod";
import type { AiExplanationInput, AiEvidence, AiSkillSuggestion } from "@workspace/api-zod";
import { sdgMappings } from "@workspace/workforce-evidence";
import { syntheticExplanationContext } from "./aiExamples";
import { dosmLabourForceService } from "./dosmData";
import { occupationEvidence, getOccupationSources } from "./occupationEvidence";
import { jobProvider } from "../services/job_provider";
import { detectSkills } from "./cvSkillExtractor";
import { matchProfileSkills, careerDataset } from "./careerMatcher";

export class AiContextError extends Error {
  constructor(readonly status: 422 | 503, message: string) { super(message); }
}

type Dependencies = {
  getLabourForce?: typeof dosmLabourForceService.get;
  getJob?: typeof jobProvider.getJobDetails;
};

/** Selectors only. Profile data and private CV content never enter this function. */
export async function prepareAiContext(input: AiExplanationInput, dependencies: Dependencies = {}) {
  const base = syntheticExplanationContext(input.feature, input.sampleId);
  const evidence: AiEvidence[] = [];
  let allowedSuggestions: string[] = [];
  const add = (item: AiEvidence) => {
    evidence.push(item);
    base.contextSummary.push(`${item.title}${item.date ? ` (${item.date})` : ""}: ${item.note}`);
  };
  const sampleMatch = base.context.deterministicMatch as { missingSkills: string[] };
  if (["career-explorer", "cv-analysis", "learning-roadmap", "digital-twin", "profile-skills"].includes(input.feature)) {
    add({ title: String(base.context.dataset), note: "Bundled role-skill dataset and unchanged exact/related matcher. Not official Malaysian demand or a hiring probability." });
  }
  if (input.feature === "career-explorer") {
    const mapping = occupationEvidence.mappings.find(m => m.masco4 === "2524");
    if (mapping) {
      const sources = getOccupationSources();
      const occupation = occupationEvidence.onet.occupations[mapping.onetSocCode];
      base.context.occupationalEvidence = {
        scope: "Related Data Professionals example; not an exact mapping of the dataset role or its score.",
        mycolTitle: mapping.mycolTitle, onetTitle: mapping.onetTitle,
        relation: mapping.relation, limitations: mapping.limitations,
        documentedSkills: occupation.skills.filter(s => s.importance.value >= 3 && !s.importance.recommendSuppress && !s.level.notRelevant).slice(0, 8).map(s => s.name),
        geography: "US occupational skills, not Malaysian vacancies or hiring probability.",
      };
      add({ title: sources.mycol.title, url: sources.mycol.landingUrl, note: "TalentCorp MyCOL critical-occupation evidence, separate from personal overlap." });
      add({ title: sources.onet.name, url: sources.onet.databaseUrl, date: sources.onet.releaseDate, note: "US occupational skill evidence; mapped relationships have documented limitations." });
    }
    base.instruction += " Describe strengths, gaps, one realistic transition step and the official-evidence limitations. Keep the two evidence sources and dataset overlap separate.";
  }
  if (input.feature === "cv-analysis") {
    const fictionalCv = input.sampleId === "data-starter"
      ? "Fictional sample CV: used Python and Excel to prepare reports and data visualization for a practice project."
      : "Fictional sample CV: practised project coordination, customer research and data storytelling in a training project.";
    const detected = detectSkills(fictionalCv);
    base.context.fictionalCv = { text: fictionalCv, detectedSkills: detected, matching: matchProfileSkills(careerDataset, detected).skillMappings };
    base.instruction += " Explain the locally detected skills, missing target skills, a truthful CV-improvement example and a practice step. Never invent achievements, employment or proficiency. Do not advise adding a missing skill or experience to a CV before it has been acquired; suggest practice first and only evidence-based edits.";
    base.contextSummary.push("Fixed fictional CV excerpt; locally detected using the existing CV detector. Real uploads are never used here.");
  }
  if (input.feature === "learning-roadmap") {
    base.context.studyConstraints = { weeklyHours: input.sampleId === "data-starter" ? 4 : 2, budgetMYR: 0, level: "beginner", sequence: sampleMatch.missingSkills.slice(0, 3) };
    base.instruction += " Explain the supplied practice sequence, short beginner exercises and a study strategy within the fictional time budget using free practice. Do not name course providers, prices or URLs.";
    base.contextSummary.push(`Fictional study budget: RM 0; ${input.sampleId === "data-starter" ? 4 : 2} hours weekly. No real roadmap is modified.`);
  }
  if (input.feature === "digital-twin") {
    base.context.scenarios = [
      { name: "Moderate AI adoption", assumptions: ["Assistive tools adopted team by team.", "Human review remains mandatory.", "Existing workflows change gradually."], priorities: ["AI literacy", "Data storytelling", "Facilitation"] },
      { name: "Fast AI adoption", assumptions: ["Assistive tools spread across several functions at once.", "Teams invest in oversight and change support.", "Workflow redesign proceeds faster than in the moderate scenario."], priorities: ["AI literacy", "Critical thinking", "Process improvement", "Workforce planning"] },
    ];
    base.instruction += " Compare the moderate and rapid adoption assumptions, possible priority changes and preparation. These workshop assumptions are not predictions or results from a forecasting model. Preserve existing before/after calculations.";
    base.contextSummary.push("Moderate/fast adoption: existing manually authored workshop assumptions, no validated probabilities or effect sizes.");
  }
  if (input.feature === "market-trends") {
    let data: Awaited<ReturnType<typeof dosmLabourForceService.get>>;
    try { data = await (dependencies.getLabourForce ?? dosmLabourForceService.get)(); }
    catch { throw new AiContextError(503, "Verified DOSM observations are unavailable. No market figures or AI trend explanation were invented. Retry later; other features remain available."); }
    const recent = data.observations.slice(-3);
    if (!recent.length) throw new AiContextError(503, "No dated DOSM observations are available to explain.");
    const first = recent[0];
    const last = recent.at(-1)!;
    const direction = (before: number, after: number) => after > before ? "increased" : after < before ? "decreased" : "unchanged";
    // Numerical observations remain in the authoritative evidence panel. Give the model
    // computed directions only, so it cannot round or reinterpret official figures.
    base.context = {
      synthetic: true, profileUsed: false, source: data.metadata.sourceName,
      period: "The latest available observation months; exact dates are shown separately.",
      observedDirections: {
        unemploymentRate: direction(first.unemploymentRate, last.unemploymentRate),
        participationRate: direction(first.participationRate, last.participationRate),
      },
      stale: data.isStale,
      limitations: [
        "National aggregates only, not occupation vacancies or skill demand.",
        "Observed changes do not establish AI causation or predict future changes.",
        "Population benchmarks changed; take care across benchmark boundaries.",
        data.isStale ? "These observations are stale or a refresh failed; not live information." : "Latest available observations are not real-time data.",
      ],
    };
    base.sampleLabel = "Dated DOSM evidence · AI interpretation";
    base.contextSummary = recent.map(o => `${o.date}: unemployment ${o.unemploymentRate}%; participation ${o.participationRate}%. National aggregates, not skill demand.`);
    add({ title: data.metadata.sourceName, url: data.metadata.sourceUrl, date: data.metadata.latestObservationDate, note: `${data.isStale ? "Stale observations; " : ""}${data.warning ?? "Latest available official observations, not a live jobs feed."} ${data.metadata.caveats.join(" ")}` });
  }
  if (input.feature === "job-fit") {
    if (!input.jobId) throw new AiContextError(422, "Select an existing job listing before asking for a job-fit explanation.");
    const job = await (dependencies.getJob ?? jobProvider.getJobDetails)(input.jobId);
    if (!job) throw new AiContextError(422, "This listing is no longer available. Return to Job Search and choose an existing listing.");
    const scores = await jobProvider.matchJobs(base.context.skills as string[], [job.id]);
    const match = scores.find(s => s.jobId === job.id);
    base.context = {
      synthetic: true, sample: base.sampleLabel, skills: base.context.skills,
      listing: { id: job.id, title: job.title, description: job.description.slice(0, 3500), requiredSkills: job.requiredSkills.slice(0, 20), demo: job.demo, match },
      boundary: "Compare only with the supplied listing requirements, not the separate role-skill catalogue. No employment probability.",
    };
    base.contextSummary = [
      `Fictional learner skills: ${(base.context.skills as string[]).join(", ")}`,
      ...(match ? [`Existing provider's exact skill overlap: ${match.matchedSkills.length}/${match.skillsConsidered} (${match.score}%), not a hiring probability.`] : []),
    ];
    // Company names, salary and URLs are unnecessary for qualitative preparation advice.
    add({ title: job.title, date: job.datePosted, ...(job.externalUrl ? { url: job.externalUrl } : {}), note: job.demo ? "Existing provider's fictional sample listing, not a live vacancy. Compared with a fictional learner only." : "Existing provider listing description; availability is not independently verified. Fictional learner only." });
    base.contextSummary.push(`Listed requirements: ${job.requiredSkills.join(", ")}`);
  }
  if (input.feature === "sdg-contribution") {
    const mappings = sdgMappings.filter(m => m.goal === input.goal && m.status === "source-supported" && m.sourceUrl && m.sourceObservation);
    if (!mappings.length) throw new AiContextError(422, "No source-supported mapping exists for the selected goal. Unverified examples cannot be explained as evidence of contribution.");
    base.context = {
      synthetic: true, profileUsed: false,
      topic: input.goal === 4 ? "Quality Education" : "Reduced Inequalities",
      mappings: mappings.map(m => ({
        fictionalRoleId: m.roleId, skills: m.skills,
        sourceSupportedObservation: m.sourceObservation!.replace(/Targets?\s+[\d.]+(?:[–-][\d.]+)?/gi, "The cited UN targets"),
        limitation: "The source supports thematic relevance only, not demonstrated role outcomes.",
      })),
      boundary: "Thematic relevance only, not an official occupational classification or measured impact.",
    };
    base.sampleLabel = "Selected SDG evidence · thematic relevance only";
    base.contextSummary = [];
    for (const m of mappings) {
      add({ title: m.sourceTitle!, url: m.sourceUrl!, date: m.sourceDate!, note: m.sourceObservation! });
      base.contextSummary.push(`Supported thematic skills: ${m.skills.join(", ")}. ${m.explanation}`);
    }
  }
  if (input.feature === "profile-skills") {
    allowedSuggestions = sampleMatch.missingSkills.slice(0, 8).filter(s => s.length <= 60);
    base.context.allowedSuggestions = allowedSuggestions;
    base.context.fictionalBackground = input.sampleId === "data-starter" ? "Beginner with practice reporting projects; interested in data analysis." : "Beginner with practice coordination projects; interested in business analysis.";
    base.contextSummary.push("Suggestions are drawn only from existing dataset gaps for the fictional career goal. Proficiency must be self-rated and every addition confirmed.");
  }
  // Keep scores, denominators, costs and durations authoritative on the server/UI.
  // The model explains skills and assumptions, not numerical calculations.
  if (base.context.deterministicMatch) {
    const match = base.context.deterministicMatch as { matchedSkills: string[]; missingSkills: string[] };
    base.context.deterministicMatch = { matchedSkills: match.matchedSkills, missingSkills: match.missingSkills.slice(0, 10) };
    base.context.dataset = "Bundled role-skill dataset; citation and figures are shown separately.";
  }
  if (input.feature === "learning-roadmap") {
    base.context.studyConstraints = {
      weeklyTime: input.sampleId === "data-starter" ? "four hours per week" : "two hours per week",
      budget: "free practice only", level: "beginner", sequence: sampleMatch.missingSkills.slice(0, 3),
    };
  }
  if (input.feature === "digital-twin") {
    const confirmation = base.context.fictionalConfirmation as { after?: { matchedSkills: string[]; missingSkills: string[] }; separatelyConfirmedSkill: string };
    base.context.fictionalConfirmation = {
      separatelyConfirmedSkill: confirmation.separatelyConfirmedSkill,
      completedMilestoneOnlyChangesProgress: true,
      after: confirmation.after ? { matchedSkills: confirmation.after.matchedSkills, missingSkills: confirmation.after.missingSkills.slice(0, 10) } : null,
    };
  }
  if (input.feature === "job-fit") {
    const listing = base.context.listing as { match?: { matchedSkills: string[]; missingSkills: string[] } };
    if (listing.match) listing.match = { matchedSkills: listing.match.matchedSkills, missingSkills: listing.match.missingSkills };
  }
  return { ...base, evidence, allowedSuggestions, json: input.feature === "profile-skills" };
}

/** Authoritative numbers, source links and citations come from the server, never from model prose. */
export function validateQualitativeAnswer(text: string): void {
  if (/\d|https?:|www\.|\[[^\]]+\]\(|\bdoi:|【/i.test(text)) {
    throw new Error("Model prose must be qualitative; figures and citations are displayed separately.");
  }
}

export function parseSkillSuggestions(text: string, allowed: string[]): AiSkillSuggestion[] {
  const schema = z.object({ suggestions: z.array(z.object({
    skill: z.string().min(1).max(60),
    rationale: z.string().min(1).max(240),
  }).strict()).min(1).max(4) }).strict();
  const result = schema.parse(JSON.parse(text));
  const seen = new Set<string>();
  for (const suggestion of result.suggestions) {
    if (!allowed.includes(suggestion.skill) || seen.has(suggestion.skill)) throw new Error("Unapproved or duplicate skill suggestion.");
    validateQualitativeAnswer(suggestion.rationale);
    seen.add(suggestion.skill);
  }
  return result.suggestions;
}
