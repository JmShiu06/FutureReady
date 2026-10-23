import { it } from "node:test";
import assert from "node:assert/strict";
import { prepareCvCareerExplanation, parseCvCareerExplanation, CvCareerInputError } from "./cvCareerExplanation";
import { matchCvCareerSkills } from "./cvCareerCatalogue";
import { learningResources } from "../data/learningResources";
import { cvCertifications } from "../data/cvCertifications";

export const syntheticReviewedCv = {
  skills: ["python", "sql"],
  languages: ["English"], extractionLimited: true,
};
export const syntheticSections = {
  skillAnalysis: "The reviewed CV lists python and sql. Together these could support a workflow that retrieves data and automates its preparation; skill names alone do not show the quality of the result.",
  careerMatchAnalysis: "AI Engineer: python and sql could transfer to preparing inputs for experimentation; machine learning is not yet evidenced in the supplied reference. This is pooled skill evidence, not a verified requirement.\n\nData Analyst: sql could support querying records while python could help repeat an analysis. Data visualization is not yet evidenced, limiting discussion of how results might be presented.\n\nData Engineer: python and sql could support transforming records between tables. Data pipelines are not yet evidenced, so operational delivery cannot be assessed.",
  skillGapAnalysis: "Start by exploring ai, shared across the supplied reference families, to understand the context of automated data work. Then communication could help explain the purpose and limits of an analysis. Neither is evidenced here; this is not proof of inability.",
  improvementSuggestions: "Explore ai concepts, then communication. Apply them by using python and sql to prepare a small fictional dataset and writing a short explanation of its limitations. Check the output against the source records. No verified resource yet for ai or communication.",
  strengths: "Querying and scripting potentially complement each other across retrieval and repeatable preparation, but demonstrated ability cannot be established from these labels.",
  areasForGrowth: "For your own review, compare a work sample with its intended outcome and note what you contributed. No project history or proficiency evidence was shared.",
};

it("uses only reviewed facts, unchanged match scores and catalogue resources", () => {
  const before = JSON.stringify(syntheticReviewedCv);
  const prepared = prepareCvCareerExplanation({ consent: true, data: syntheticReviewedCv });
  const matches = matchCvCareerSkills(syntheticReviewedCv.skills).matches.slice(0, 3);
  assert.deepEqual(prepared.matches.map(match => match.score), matches.map(match => match.score));
  assert.deepEqual(prepared.request.context.reviewedCv, { skills: syntheticReviewedCv.skills });
  assert.deepEqual(Object.keys(prepared.request.context.reviewedCv), ["skills"]);
  assert.equal("sampleId" in prepared.request.context, false);
  assert.equal("score" in prepared.request.context.matches[0], false);
  assert.equal(JSON.stringify(syntheticReviewedCv), before);
  assert.ok(prepared.resources.every(resource => [...learningResources, ...cvCertifications].some(record => record.id === resource.id && record.url === resource.url)));
  assert.ok(prepared.resources.some(resource => resource.id === "cert-python-institute-pcep"));
  const result = parseCvCareerExplanation(JSON.stringify(syntheticSections), prepared);
  assert.deepEqual(result.sections, syntheticSections, "validated AI analysis must not be replaced by fixed prose");
  assert.equal(Object.keys(result.sections).length, 6);
  assert.deepEqual(result.matches, prepared.matches);
  assert.ok(result.warnings.includes("Some information may be incomplete due to CV extraction limitations."));
});

it("rejects no consent, raw text, arbitrary fields, fabricated skills and oversized details", () => {
  for (const input of [
    { data: syntheticReviewedCv }, { consent: false, data: syntheticReviewedCv },
    { consent: true, data: { ...syntheticReviewedCv, rawText: "private CV text" } },
    { consent: true, data: syntheticReviewedCv, file: "bytes" },
    { consent: true, data: { ...syntheticReviewedCv, skills: ["invented skill"] } },
    { consent: true, data: { ...syntheticReviewedCv, skills: ["python", "python"] } },
    { consent: true, data: { ...syntheticReviewedCv, education: ["x".repeat(501)] } },
  ]) assert.throws(() => prepareCvCareerExplanation(input), CvCareerInputError);
});

it("rejects narrative/contact fields at the API boundary and rejects unsupported outputs", () => {
  assert.throws(() => prepareCvCareerExplanation({ consent: true, data: { ...syntheticReviewedCv, workExperience: ["Fictional reports"] } }), CvCareerInputError);
  const prepared = prepareCvCareerExplanation({ consent: true, data: syntheticReviewedCv });
  for (const sections of [
    { ...syntheticSections, score: "high" },
    { ...syntheticSections, skillGapAnalysis: "Hiring probability is 99%." },
    { ...syntheticSections, areasForGrowth: "Visit https://made-up.invalid" },
    { ...syntheticSections, skillAnalysis: "No supplied skill is mentioned." },
    { ...syntheticSections, strengths: "<think>private reasoning</think>" },
    { ...syntheticSections, skillGapAnalysis: "The candidate is proficient in English." },
    { ...syntheticSections, strengths: "The candidate is a proficient expert." },
    { ...syntheticSections, careerMatchAnalysis: "Hiring probability is 99%." },
    { ...syntheticSections, improvementSuggestions: "Enroll in an invented certification course." },
    { ...syntheticSections, skillAnalysis: "python. Meaning: programming. Importance: automation. Industries: finance." },
    { ...syntheticSections, areasForGrowth: "   " },
    { ...syntheticSections, areasForGrowth: syntheticSections.strengths },
    { ...syntheticSections, careerMatchAnalysis: "AI Engineer: python may help prepare data." },
    { ...syntheticSections, skillGapAnalysis: "Learn something useful." },
    { ...syntheticSections, skillGapAnalysis: "Explain a practice exercise." },
    { ...syntheticSections, improvementSuggestions: "Take the invented Superhero course." },
    { ...syntheticSections, strengths: "You lack communication." },
    { ...syntheticSections, strengths: "The candidate has a strong foundation." },
    { ...syntheticSections, careerMatchAnalysis: syntheticSections.careerMatchAnalysis.replace("could transfer", "is required") },
  ]) {
    if ("score" in sections || JSON.stringify(sections).includes("<think>")) {
      assert.throws(() => parseCvCareerExplanation(JSON.stringify(sections), prepared));
    } else {
      const result = parseCvCareerExplanation(JSON.stringify(sections), prepared);
      const changed = (Object.keys(syntheticSections) as Array<keyof typeof syntheticSections>)
        .find(key => sections[key] !== syntheticSections[key])!;
      assert.match(result.sections[changed], /AI analysis withheld/);
      assert.ok(result.warnings.some(warning => warning.startsWith("Partial AI analysis:")));
    }
  }
});

it("normalizes title labels without rewriting claims when Qwen puts career insights in one paragraph", () => {
  const prepared = prepareCvCareerExplanation({ consent: true, data: syntheticReviewedCv });
  const sections = { ...syntheticSections, careerMatchAnalysis: syntheticSections.careerMatchAnalysis.replace(/\n+/g, " ") };
  const result = parseCvCareerExplanation(JSON.stringify(sections), prepared);
  assert.equal(result.sections.careerMatchAnalysis, syntheticSections.careerMatchAnalysis);
  assert.ok(!result.warnings.some(warning => warning.startsWith("Partial AI analysis:")));
});

it("does not pass entirely invalid analysis or malformed structures as partial success", () => {
  const prepared = prepareCvCareerExplanation({ consent: true, data: syntheticReviewedCv });
  const invalid = Object.fromEntries(Object.keys(syntheticSections).map(key => [key, "Visit https://made-up.invalid"]));
  assert.throws(() => parseCvCareerExplanation(JSON.stringify(invalid), prepared));
  assert.throws(() => parseCvCareerExplanation(JSON.stringify({ skillAnalysis: "python" }), prepared));
  assert.throws(() => parseCvCareerExplanation("not JSON", prepared));
});

it("minimizes legacy language input and rejects language-only analysis", () => {
  const prepared = prepareCvCareerExplanation({ consent: true, data: syntheticReviewedCv });
  assert.doesNotMatch(JSON.stringify(prepared.request.context), /English|extractionLimited|workExperience/);
  assert.throws(() => prepareCvCareerExplanation({ consent: true, data: {
    skills: [], languages: ["English"], extractionLimited: false,
  } }), CvCareerInputError);
});

it("supports limited single-skill input without requiring definitions for every skill", () => {
  const prepared = prepareCvCareerExplanation({ consent: true, data: {
    skills: ["python"], languages: [], extractionLimited: false,
  } });
  assert.deepEqual(prepared.request.context.skillInsights.patternGroups, []);
  assert.match(prepared.request.context.skillInsights.evidenceLimit, /Limited input/);
  const gap = prepared.request.context.skillInsights.priorityGaps[0].skill;
  const sections = {
    ...syntheticSections,
    skillAnalysis: "The reviewed CV lists python only. Combinations cannot be assessed from a single skill; a local practice example could clarify how it is applied.",
    careerMatchAnalysis: prepared.matches.map(match => `${match.title}: python could support repeatable preparation; ${match.missingSkills[0]} is not evidenced. Pooled reference evidence cannot establish exact job requirements.`).join("\n\n"),
    skillGapAnalysis: `${gap} is the first suggested exploration priority based on the supplied reference coverage, not proof of a weakness.`,
    improvementSuggestions: `Explore ${gap} first, then combine it with python in a small hypothetical practice exercise and inspect its output locally.`,
  };
  assert.deepEqual(parseCvCareerExplanation(JSON.stringify(sections), prepared).sections, sections);
});
