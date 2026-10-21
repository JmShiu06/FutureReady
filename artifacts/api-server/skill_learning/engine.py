from dataclasses import dataclass

from .models import Analysis, DatasetMetadata, RecommendedCourse, RecommendationsResponse, normalized

METHODOLOGY = (
    "Sentence-transformers/all-MiniLM-L6-v2 compares requested skills with course titles, skill tags and "
    "descriptions using normalized embeddings and Chroma cosine search. Ranking = 70% skill relevance "
    "(semantic similarity with an exact-tag boost), 15% difficulty fit, 10% supplied rating, 5% learning "
    "priority. Scores are ranking aids, not probabilities. Missing skills without scores start at beginner."
)
LIMITATIONS = [
    "The existing CV analysis engine is consumed, not rebuilt. User analysis, query embeddings and user_id are not persisted.",
    "Only the supplied Coursera/edX catalog is used; no Udemy or resume-screening records were supplied in this archive.",
    "Course links, prices, ratings, availability and certificate awards are not independently verified.",
    "There are no separate learning-outcome fields; source descriptions and skill tags are embedded instead.",
    "Prerequisites are transparent planning assumptions, not verified provider prerequisites.",
    "Coursera duration units are unspecified. Where hours cannot be established, planning estimates are labelled.",
    "Multilingual course content is present, but this English-focused embedding model may rank non-English content less accurately.",
    "Recommendation categories use analysis labels first, then a small reviewed set of skill-name hints; uncategorized targets are grouped as career development.",
]
TECHNICAL_HINTS = {
    "python", "sql", "docker", "aws", "amazon web services", "kubernetes", "linux",
    "fastapi", "machine learning", "deep learning", "data analysis", "data visualization",
    "statistics", "cloud computing", "javascript", "java", "git", "excel",
}
SOFT_HINTS = {
    "communication", "leadership", "teamwork", "problem solving", "problem-solving",
    "critical thinking", "time management", "collaboration", "adaptability",
}


@dataclass(frozen=True)
class Target:
    name: str
    score: float
    category: str
    missing: bool


def difficulty_for(score: float) -> str:
    return "Beginner" if score < 60 else "Intermediate" if score <= 80 else "Advanced"


def priorities(analysis: Analysis) -> list[Target]:
    scores = {normalized(key): value for key, value in analysis.skill_scores.items()}
    soft = {normalized(key) for key in analysis.soft_skills}
    technical = {normalized(key) for key in analysis.technical_skills}
    missing = {normalized(key) for key in analysis.missing_skills}
    targets = {}
    for name in [*analysis.missing_skills, *analysis.skill_scores]:
        key = normalized(name)
        category = (
            "soft_skill" if key in soft else "technical" if key in technical
            else "soft_skill" if key in SOFT_HINTS else "technical" if key in TECHNICAL_HINTS
            else "career_development"
        )
        targets.setdefault(key, Target(name, scores.get(key, 0), category, key in missing))
    return sorted(targets.values(), key=lambda item: (item.score, not item.missing, normalized(item.name)))


def levels(row: dict) -> list[str]:
    source = row["level"].casefold()
    return [level for level in ["Beginner", "Intermediate", "Advanced"] if level.casefold() in source]


def estimated_hours(row: dict, difficulty: str) -> tuple[float, str]:
    # The supplied preprocessing explicitly calculates edX duration as weeks × hours/week.
    if row["provider_key"] == "edx" and row.get("duration_value"):
        return float(row["duration_value"]), "Dataset edX estimate: weeks × average weekly effort; not independently verified."
    if row["kind"] == "project":
        return 2, "Planning assumption: 2 hours for a guided project, not a provider guarantee."
    if row["kind"] == "program":
        return 80, "Planning assumption: 80 hours for a program; confirm the provider workload."
    return {"Beginner": 12, "Intermediate": 24, "Advanced": 40}.get(difficulty, 24), "Planning assumption by difficulty; source duration units are unspecified."


class RecommendationEngine:
    def __init__(self, search):
        self.search = search
        self.dataset = DatasetMetadata(record_count=len(search.courses))

    def for_target(self, target: Target) -> list[RecommendedCourse]:
        expected = difficulty_for(target.score)
        result = []
        for row, similarity in self.search.search(target.name):
            available = levels(row)
            # Enforce the requested score band; unknown labels never authorize an advanced course.
            if expected not in available:
                continue
            level = expected
            exact = normalized(target.name) in {normalized(skill) for skill in row["skills"]}
            if similarity < 0.30 and not exact:
                continue
            relevance = min(1, similarity + (0.20 if exact else 0))
            rating = row.get("rating")
            fit = 1 if level == expected else .5
            score = round(70 * relevance + 15 * fit + (10 * rating / 5 if rating is not None else 5) + 5 * (100 - target.score) / 100, 2)
            hours, duration_source = estimated_hours(row, level)
            category = target.category
            if row["kind"] == "program" and "/certificates/" in row["url"]:
                category = "certification"
            result.append(RecommendedCourse(
                course_name=row["title"], platform={"coursera": "Coursera", "edx": "edX"}[row["provider_key"]],
                course_type=row["kind"], difficulty=level, skills_covered=row["skills"],
                recommendation_type=category, matched_skills=[target.name],
                match_score=min(100, score), semantic_similarity=round(similarity, 4),
                rating=rating, duration_value=row.get("duration_value"),
                duration_note="Raw dataset duration value; units are not uniformly specified.",
                estimated_hours=hours, duration_source=duration_source, course_url=row["url"],
            ))
        return sorted(result, key=lambda row: (-row.match_score, row.course_name, row.course_url))

    def recommend(self, analysis: Analysis, limit: int) -> RecommendationsResponse:
        targets = priorities(analysis)
        if analysis.career_path and analysis.career_path.strip():
            targets.append(Target(analysis.career_path.strip(), 0, "career_development", False))
        by_url = {}
        unmatched = []
        for target in targets:
            matches = self.for_target(target)
            if not matches:
                unmatched.append(target.name)
            # Round-robin coverage keeps one popular technical skill from hiding all soft skills.
            for rank, course in enumerate(matches[:limit]):
                existing = by_url.get(course.course_url)
                if existing:
                    if existing[1].difficulty == course.difficulty:
                        existing[1].matched_skills = sorted(set(existing[1].matched_skills + course.matched_skills))
                    continue
                by_url[course.course_url] = (rank, course)
        ordered = sorted(by_url.values(), key=lambda pair: (pair[0], -pair[1].match_score, pair[1].course_url))
        return RecommendationsResponse(
            recommended_courses=[course for _, course in ordered[:limit]], unmatched_skills=unmatched,
            methodology=METHODOLOGY + " Results are interleaved across target skills for coverage, then ranked within each round.",
            limitations=LIMITATIONS, dataset=self.dataset,
        )
