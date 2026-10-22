import { it } from "node:test";
import assert from "node:assert/strict";
import { prepareCvCareerExplanation, parseCvCareerExplanation, CvCareerInputError } from "./cvCareerExplanation";
import { matchCvCareerSkills } from "./cvCareerCatalogue";
import { learningResources } from "../data/learningResources";
import { cvCertifications } from "../data/cvCertifications";

export const syntheticReviewedCv = {
  skills: ["python", "sql"], education: ["Diploma in computing"],
  workExperience: ["Created reporting scripts"], certifications: [], projects: ["Inventory dashboard"],
  languages: ["English"], extractionLimited: true,
};
export const syntheticSections = {
  candidateSummary: "The reviewed CV reports computing education and reporting scripts.",
  skillAnalysis: "python. Meaning: programming language. Importance: automates work. Industries: technology and finance.\n\nsql. Meaning: database query language. Importance: retrieves data. Industries: banking and retail.",
  careerMatchAnalysis: "The supplied roles have some skill overlap, not evidence of hiring suitability.",
  skillGapAnalysis: "The listed missing skills are not evidenced in the CV; they are not proven weaknesses.",
  improvementSuggestions: "Practise the identified gaps through projects and the linked courses. No verified certification pathways were supplied.",
  strengths: "Reported scripting and the inventory project offer relevant examples.",
  areasForGrowth: "Add concrete work examples where supported. Certification details are unavailable.",
};

it("uses only reviewed facts, unchanged match scores and catalogue resources", () => {
  const before = JSON.stringify(syntheticReviewedCv);
  const prepared = prepareCvCareerExplanation({ consent: true, data: syntheticReviewedCv });
  const matches = matchCvCareerSkills(syntheticReviewedCv.skills).matches.slice(0, 3);
  assert.deepEqual(prepared.matches.map(match => match.score), matches.map(match => match.score));
  assert.deepEqual(prepared.request.context.reviewedCv, syntheticReviewedCv);
  assert.equal("sampleId" in prepared.request.context, false);
  assert.equal("score" in prepared.request.context.matches[0], false);
  assert.equal(JSON.stringify(syntheticReviewedCv), before);
  assert.ok(prepared.resources.every(resource => [...learningResources, ...cvCertifications].some(record => record.id === resource.id && record.url === resource.url)));
  assert.ok(prepared.resources.some(resource => resource.id === "cert-python-institute-pcep"));
  const result = parseCvCareerExplanation(JSON.stringify(syntheticSections), prepared);
  assert.equal(Object.keys(result.sections).length, 7);
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

it("redacts contact details again at the API boundary and rejects unsupported outputs", () => {
  const prepared = prepareCvCareerExplanation({ consent: true, data: { ...syntheticReviewedCv, workExperience: ["Automated reports; email manager@example.test"] } });
  assert.doesNotMatch(JSON.stringify(prepared.request.context), /manager@example/);
  for (const sections of [
    { ...syntheticSections, score: "high" },
    { ...syntheticSections, skillGapAnalysis: "Hiring probability is 99%." },
    { ...syntheticSections, areasForGrowth: "Visit https://made-up.invalid" },
    { ...syntheticSections, skillAnalysis: "Only python was explained." },
    { ...syntheticSections, strengths: "<think>private reasoning</think>" },
    { ...syntheticSections, skillGapAnalysis: "The candidate is proficient in English." },
  ]) assert.throws(() => parseCvCareerExplanation(JSON.stringify(sections), prepared));
  const factual = parseCvCareerExplanation(JSON.stringify({ ...syntheticSections,
    candidateSummary: "The candidate is fluent in English.",
    careerMatchAnalysis: "Backend: these roles require python and sql. Hiring probability is 99%.",
    strengths: "The candidate is a proficient expert.",
    improvementSuggestions: "Enroll in an invented certification course.",
  }), prepared);
  assert.doesNotMatch(factual.sections.candidateSummary, /fluent/);
  assert.doesNotMatch(factual.sections.careerMatchAnalysis, /Backend|99%|roles require/);
  for (const match of prepared.matches) assert.ok(factual.sections.careerMatchAnalysis.includes(match.title));
  assert.doesNotMatch(factual.sections.strengths, /proficient expert/);
  assert.doesNotMatch(factual.sections.improvementSuggestions, /invented certification/);
});
