import math

from .engine import LIMITATIONS, METHODOLOGY, priorities
from .models import Analysis, Phase, RoadmapResponse, normalized

# Explicit, reviewable sequencing assumptions. Apply only when both skills are targets.
# These are NOT course-provider prerequisites or assertions that the learner lacks these skills.
PLANNING_DEPENDENCIES = {
    "kubernetes": ["docker"],
    "docker": ["linux"],
    "deep learning": ["machine learning"],
    "machine learning": ["python", "statistics"],
    "fastapi": ["python"],
    "data visualization": ["data analysis"],
}


def sequence(targets):
    by_name = {normalized(target.name): target for target in targets}
    result, visited, visiting = [], set(), set()

    def visit(key):
        if key in visited:
            return
        if key in visiting:
            raise ValueError("Planning dependency cycle detected.")
        visiting.add(key)
        for dependency in PLANNING_DEPENDENCIES.get(key, []):
            if dependency in by_name:
                visit(dependency)
        visiting.remove(key)
        visited.add(key)
        result.append(by_name[key])

    for target in targets:
        visit(normalized(target.name))
    return result


class RoadmapGenerator:
    def __init__(self, engine):
        self.engine = engine

    def generate(self, analysis: Analysis, courses_per_skill: int, hours_per_week: int) -> RoadmapResponse:
        phases, month, used = [], 1, set()
        for index, target in enumerate(sequence(priorities(analysis))):
            matches = [course for course in self.engine.for_target(target) if course.course_url not in used][:courses_per_skill]
            hours = matches[0].estimated_hours if matches else 0
            if matches:
                used.add(matches[0].course_url)
            months = max(1, math.ceil(hours / (4 * hours_per_week)))
            phases.append(Phase(
                phase=index + 1, month=month, end_month=month + months - 1, focus=target.name,
                skills=[target.name], courses=matches,
                prerequisites=PLANNING_DEPENDENCIES.get(normalized(target.name), []),
                prerequisite_note="Suggested skill sequence, not a verified course prerequisite. Listed prerequisites may already be known; only target skills are scheduled.",
                estimated_hours=hours,
                duration_estimate=(
                    f"{months} month planning block at {hours_per_week} hours/week; choose the first course OR an alternative, not all listed courses."
                    if matches else "No eligible course found; duration cannot be estimated. Review this gap manually."
                ),
            ))
            month += months
        return RoadmapResponse(
            roadmap=phases, estimated_months=month - 1,
            methodology=METHODOLOGY + " Lower scores first, with explicit prerequisite assumptions taking precedence. Four planning weeks per month.",
            limitations=LIMITATIONS, dataset=self.engine.dataset,
        )
