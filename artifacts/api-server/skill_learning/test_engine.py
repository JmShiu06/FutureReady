import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from pydantic import ValidationError

from .app import app
from .engine import RecommendationEngine, difficulty_for, priorities
from .models import Analysis
from .roadmap import RoadmapGenerator, sequence


def course(name, skill, level="Beginner", rating=4.5, kind="course"):
    return {
        "id": name, "title": name, "skills": [skill], "level": level, "rating": rating,
        "provider_key": "coursera", "kind": kind, "duration_value": None,
        "url": f"https://www.coursera.org/learn/{name}", "description": name,
    }


class FakeSearch:
    def __init__(self):
        rows = [
            course("docker-basic", "Docker"),
            course("docker-advanced", "Docker", "Advanced"),
            course("sql-intermediate", "SQL", "Intermediate"),
            course("python-advanced", "Python", "Advanced"),
            course("communication", "Communication"),
            course("kubernetes", "Kubernetes"),
        ]
        self.courses = {row["id"]: row for row in rows}

    def search(self, skill):
        return [(row, .85) for row in self.courses.values() if skill.casefold() in {s.casefold() for s in row["skills"]}]


class EngineTests(unittest.TestCase):
    def setUp(self):
        self.engine = RecommendationEngine(FakeSearch())
        self.analysis = Analysis(
            technical_skills=["Python", "SQL", "Docker"],
            soft_skills=["Communication"], missing_skills=["Docker"],
            skill_scores={"Python": 85, "SQL": 65, "Docker": 20, "Communication": 55},
        )

    def test_exact_difficulty_boundaries(self):
        for score, expected in [(0, "Beginner"), (59.9, "Beginner"), (60, "Intermediate"), (80, "Intermediate"), (80.1, "Advanced")]:
            self.assertEqual(difficulty_for(score), expected)

    def test_ranked_results_cover_technical_and_soft_skills_without_advanced_for_beginners(self):
        result = self.engine.recommend(self.analysis, 20)
        names = {row.course_name for row in result.recommended_courses}
        self.assertIn("docker-basic", names)
        self.assertNotIn("docker-advanced", names)
        self.assertIn("python-advanced", names)
        self.assertTrue(any(row.recommendation_type == "soft_skill" for row in result.recommended_courses))
        self.assertTrue(all(0 <= row.match_score <= 100 for row in result.recommended_courses))
        self.assertEqual(result.model_dump(), self.engine.recommend(self.analysis, 20).model_dump())

    def test_missing_unscored_skill_is_beginner_not_inferred_from_candidate_seniority(self):
        analysis = Analysis(missing_skills=["Docker"], candidate_level="Senior")
        self.assertEqual(priorities(analysis)[0].score, 0)
        self.assertEqual(self.engine.recommend(analysis, 20).recommended_courses[0].difficulty, "Beginner")

    def test_dependency_chain_precedes_score_order_and_months_include_estimates(self):
        analysis = Analysis(missing_skills=["Kubernetes", "Docker"], skill_scores={"Kubernetes": 0, "Docker": 40})
        self.assertEqual([row.name for row in sequence(priorities(analysis))], ["Docker", "Kubernetes"])
        result = RoadmapGenerator(self.engine).generate(analysis, 3, 5)
        self.assertEqual([row.month for row in result.roadmap], [1, 2])
        self.assertEqual(result.roadmap[1].prerequisites, ["docker"])
        self.assertIn("not a verified", result.roadmap[1].prerequisite_note)
        self.assertTrue(all(row.courses[0].difficulty == "Beginner" for row in result.roadmap))

    def test_unknown_gaps_and_empty_analysis_do_not_get_fabricated_courses(self):
        self.assertEqual(self.engine.recommend(Analysis(), 10).recommended_courses, [])
        result = self.engine.recommend(Analysis(missing_skills=["nonexistent-skill"]), 10)
        self.assertEqual(result.unmatched_skills, ["nonexistent-skill"])
        self.assertEqual(result.recommended_courses, [])

    def test_duplicate_urls_do_not_merge_incompatible_score_band_labels(self):
        search = FakeSearch()
        shared = course("shared-course", "Docker", "Beginner Intermediate")
        shared["skills"] = ["Docker", "SQL"]
        search.courses[shared["id"]] = shared
        result = RecommendationEngine(search).recommend(self.analysis, 20)
        shared_result = next(row for row in result.recommended_courses if row.course_name == "shared-course")
        self.assertEqual(shared_result.difficulty, "Beginner")
        self.assertEqual(shared_result.matched_skills, ["Docker"])

    def test_validation_rejects_invalid_scores_and_duplicate_normalized_score_keys(self):
        for value in [-1, 101, float("inf"), "80", True]:
            with self.assertRaises(ValidationError):
                Analysis(skill_scores={"Python": value})
        with self.assertRaises(ValidationError):
            Analysis(skill_scores={"Python": 20, " python ": 30})

    def test_api_consumes_analysis_and_never_echoes_user_id_or_extra_cv_text(self):
        with patch("skill_learning.app.engine", self.engine):
            client = TestClient(app)
            result = client.post("/api/recommend-courses", json={
                "user_id": "private-example", "analysis": {**self.analysis.model_dump(), "resume_text": "sensitive-content"},
            })
            self.assertEqual(result.status_code, 200)
            self.assertEqual(result.headers["cache-control"], "no-store")
            self.assertNotIn("private-example", result.text)
            self.assertNotIn("sensitive-content", result.text)
            self.assertIn("semantic_similarity", result.json()["recommended_courses"][0])

    def test_api_errors_and_initialization_are_explicit(self):
        client = TestClient(app)
        result = client.post("/api/recommend-courses", json={"analysis": {"skill_scores": {"Python": 101}}})
        self.assertEqual(result.status_code, 400)
        self.assertNotIn("Python", result.text)
        with patch("skill_learning.app.engine", None):
            unavailable = client.post("/api/recommend-courses", json={"analysis": {}})
            self.assertEqual(unavailable.status_code, 503)
            self.assertEqual(unavailable.headers["retry-after"], "15")

    def test_roadmap_api_returns_phase_month_duration_and_courses(self):
        with patch("skill_learning.app.engine", self.engine):
            result = TestClient(app).post("/api/learning-roadmap", json={"analysis": self.analysis.model_dump(), "hours_per_week": 5})
            self.assertEqual(result.status_code, 200)
            phase = result.json()["roadmap"][0]
            self.assertEqual(phase["phase"], 1)
            self.assertIn("month", phase)
            self.assertIn("estimated_hours", phase)
            self.assertGreater(len(phase["courses"]), 0)


if __name__ == "__main__":
    unittest.main()
