from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

Difficulty = Literal["Beginner", "Intermediate", "Advanced", "Unknown"]
Category = Literal["technical", "soft_skill", "certification", "career_development"]
Score = Annotated[float, Field(strict=True, ge=0, le=100, allow_inf_nan=False)]


def normalized(value: str) -> str:
    import re
    import unicodedata
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", value).strip().casefold())


class Analysis(BaseModel):
    # Existing analysis engines can send extra fields without being rebuilt.
    model_config = ConfigDict(extra="ignore")
    technical_skills: list[str] = Field(default_factory=list, max_length=100)
    soft_skills: list[str] = Field(default_factory=list, max_length=100)
    missing_skills: list[str] = Field(default_factory=list, max_length=100)
    skill_scores: dict[str, Score] = Field(default_factory=dict, max_length=200)
    candidate_level: str | None = Field(default=None, max_length=80)
    career_path: str | None = Field(default=None, max_length=160)

    @field_validator("technical_skills", "soft_skills", "missing_skills")
    @classmethod
    def validate_skills(cls, values: list[str]) -> list[str]:
        result = {}
        for value in values:
            if not value.strip() or len(value) > 100:
                raise ValueError("Skill names must contain 1–100 characters.")
            result.setdefault(normalized(value), value.strip())
        return list(result.values())

    @field_validator("skill_scores")
    @classmethod
    def validate_scores(cls, values: dict[str, float]) -> dict[str, float]:
        import math
        for name, score in values.items():
            if not name.strip() or len(name) > 100 or not math.isfinite(score) or not 0 <= score <= 100:
                raise ValueError("Skill scores require names of 1–100 characters and finite scores from 0 to 100.")
        if len({normalized(key) for key in values}) != len(values):
            raise ValueError("Skill scores contain duplicate normalized skill names.")
        return values


class RecommendationInput(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [{
        "user_id": "123",
        "analysis": {
            "technical_skills": ["Python", "SQL"],
            "missing_skills": ["Docker", "AWS"],
            "skill_scores": {"Python": 85, "SQL": 65, "Docker": 20, "AWS": 10},
        },
    }]})
    analysis: Analysis
    user_id: str | None = Field(default=None, max_length=120, description="Accepted for compatibility; not stored or logged.")
    limit: int = Field(default=20, ge=1, le=50)


class RoadmapInput(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [{
        "analysis": {"missing_skills": ["Docker", "AWS", "Kubernetes"], "skill_scores": {"Docker": 20, "AWS": 10, "Kubernetes": 0}},
        "courses_per_skill": 3, "hours_per_week": 5,
    }]})
    analysis: Analysis
    user_id: str | None = Field(default=None, max_length=120)
    courses_per_skill: int = Field(default=3, ge=1, le=5)
    hours_per_week: int = Field(default=5, ge=1, le=40)


class RecommendedCourse(BaseModel):
    course_name: str
    platform: str
    course_type: str
    difficulty: Difficulty
    skills_covered: list[str]
    recommendation_type: Category
    matched_skills: list[str]
    match_score: float = Field(ge=0, le=100)
    semantic_similarity: float = Field(ge=0, le=1)
    rating: float | None
    duration_value: float | None
    duration_note: str
    estimated_hours: float
    duration_source: str
    course_url: str


class DatasetMetadata(BaseModel):
    name: str = "User-supplied combined Coursera and edX course dataset"
    record_count: int
    providers: list[str] = ["Coursera", "edX"]
    provenance: str = "13,793 combined_dataset.json rows; 10 rows without skill tags excluded. Descriptions trimmed to 1,800 characters."
    verification: str = "Dataset references, not independently verified course availability, pricing, ratings, prerequisites or certification."


class RecommendationsResponse(BaseModel):
    recommended_courses: list[RecommendedCourse]
    unmatched_skills: list[str]
    methodology: str
    limitations: list[str]
    dataset: DatasetMetadata


class Phase(BaseModel):
    phase: int
    month: int
    end_month: int
    focus: str
    skills: list[str]
    courses: list[RecommendedCourse]
    prerequisites: list[str]
    prerequisite_note: str
    estimated_hours: float
    duration_estimate: str


class RoadmapResponse(BaseModel):
    roadmap: list[Phase]
    estimated_months: int
    methodology: str
    limitations: list[str]
    dataset: DatasetMetadata
