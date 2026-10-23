---
name: Learning recommendation boundaries
description: Retired Python learning engine and trust boundaries for retained learning resources.
---

The user explicitly approved removing the Python learning engine and its dependent features. Do not reintroduce that engine or its ML dependencies without a new request. Preserve unrelated CV/skill analysis and the independently reviewed learning-resource library; do not replace the removed engine with mocked recommendations.

**Why:** After repeated publish-time dependency failures, the user chose removal of the entire optional learning engine rather than another Linux/Torch configuration change. This supersedes the earlier request to implement the uploaded semantic-search specification.

**How to apply:** Keep removal scoped to the optional engine. Preserve existing database data and uploaded dataset references rather than treating feature removal as permission to delete stored data. Any future learning suggestions must remain separate from CV extraction and saved proficiency.

Manifest removal and a clean dependency audit do not prove that retired Python
packages are absent from an existing workspace.

**Why:** The dependency audit omitted an orphaned ChromaDB installation that was
still importable from the workspace's Python library directory after the engine
had been removed. The package-management removal callback reported success
without deleting that orphaned installation.

**How to apply:** For retired Python dependencies, check installed distribution
metadata and importability separately from the manifest audit. Keep cleanup
idempotent and reproducible after merging; do not delete unrelated packages or
dataset files. The workspace's uv-managed Python environment does not contain
pip; use uv's target-directory uninstall rather than relying on `python -m pip`.

Uploaded course references must remain distinct from the independently checked learning-resource library. A source rating, level, URL or certificate label is not proof of current availability or an awarded certification.

**Why:** The supplied archive is reference material, not a provider verification process; existing verified resources have a stronger trust claim.

**How to apply:** Label dataset limitations and planning assumptions. Do not replace verified resources with unverified catalog matches or save request analysis just because a caller supplies a user identifier.

## Official occupation roadmaps
Do not convert O*NET's 0–7 occupational Level ratings into learners' 1–5 self-ratings. Official occupation plans address documented skills absent by name, not validated proficiency gaps.

**Why:** These scales measure different things. The roadmap request explicitly preserves the established matching formulas and requires documented requirements rather than invented targets.

**How to apply:** Keep official name overlap separate from sample-role proficiency coverage, including dashboard and progress summaries. Preserve the evidence and starting-skills snapshot when a plan is resumed, even if newer occupation evidence becomes available.

A general O*NET skill such as Programming does not establish that a Python-specific course is a reviewed recommendation for that skill.

**Why:** The independently reviewed catalogue currently verifies narrow technical skill coverage, not broad occupational capability. Expanding coverage requires additional review, not a silent alias.

**How to apply:** Use direct reviewed skill coverage only. If none exists, show an unavailable resource with unknown cost and duration, rather than generating course details or substituting fictional sample courses.

## Pathway time estimates
Pack the personalised pathway's remaining known hours in order into weekly capacity: total weeks = ceil(remaining known hours / hours per week). Completed grouped courses are omitted only when all covered milestones are complete.

**Why:** The user explicitly replaced per-step week rounding with packed scheduling (74 hours at 11 hours/week must be 7 weeks). A missing verified duration still means a complete finish date cannot honestly be promised.

**How to apply:** Show ordered week ranges, keep full-course hours distinct from remaining hours, list unknown-duration steps separately and label known-only finish dates. Distinguish app-estimated portfolio practice from provider-stated course time.
