import assert from "node:assert/strict";
import { test } from "node:test";
import {
  difficultyFor,
  generateLearningRoadmap,
  getCourseCatalog,
  recommendCourses,
  type SkillAnalysis,
} from "./skillLearningRecommendation";

test("difficulty bands follow the requested 0–100 score thresholds", () => {
  assert.equal(difficultyFor(0), "Beginner");
  assert.equal(difficultyFor(59), "Beginner");
  assert.equal(difficultyFor(60), "Intermediate");
  assert.equal(difficultyFor(80), "Intermediate");
  assert.equal(difficultyFor(81), "Advanced");
  assert.equal(difficultyFor(100), "Advanced");
});

test("recommendations use the supplied catalog skill tags and keep data uncertainty visible", () => {
  const analysis: SkillAnalysis = {
    technical_skills: ["Python", "SQL"],
    soft_skills: ["Communication"],
    missing_skills: ["Docker"],
    skill_scores: { Python: 85, SQL: 65, Docker: 20, Communication: 55 },
    career_path: "Data Analyst",
  };
  const result = recommendCourses(analysis, 20);
  assert.equal(result.dataset.record_count, 13783);
  assert.ok(result.recommended_courses.length > 0);
  assert.ok(result.recommended_courses.length <= 20);
  assert.ok(result.recommended_courses.every((course) => /^https:\/\//i.test(course.course_url)));
  assert.ok(result.recommended_courses.every((course) => course.match_score >= 0 && course.match_score <= 100));
  assert.ok(result.recommended_courses.some((course) => course.matched_skills.includes("Docker")));
  assert.ok(result.recommended_courses.some((course) => course.recommendation_type === "soft_skill"));
  assert.ok(result.limitations.some((item) => item.includes("not been independently verified")));
  assert.ok(result.limitations.some((item) => item.includes("sentence-transformer") || item.includes("prerequisite")));
});

test("roadmap orders weakest skills first and clearly labels estimated monthly sequencing", () => {
  const analysis: SkillAnalysis = {
    technical_skills: ["Python", "SQL"],
    missing_skills: ["Python", "SQL"],
    skill_scores: { Python: 20, SQL: 70 },
  };
  const result = generateLearningRoadmap(analysis, 2);
  assert.deepEqual(result.roadmap.map((phase) => phase.focus), ["Python", "SQL"]);
  assert.deepEqual(result.roadmap.map((phase) => phase.month), [1, 2]);
  assert.ok(result.roadmap.every((phase) => phase.courses.length <= 2));
  assert.ok(result.roadmap.every((phase) => phase.duration_estimate.includes("one month")));
});

test("the bundled dataset is read-only, bounded, and contains actual Coursera and edX records", () => {
  const catalog = getCourseCatalog();
  assert.equal(catalog.length, 13783);
  assert.ok(catalog.some((course) => course.provider_key === "coursera"));
  assert.ok(catalog.some((course) => course.provider_key === "edx"));
  assert.ok(catalog.every((course) => course.title && course.url && course.skills.length > 0));
  const empty = recommendCourses({});
  assert.deepEqual(empty.recommended_courses, []);
});
