# MyCOL SDG relevance review

Reviewed 2026-10-22. This is an application-authored evidence overlay, not a change to the official MyCOL or O*NET datasets, a UN-endorsed crosswalk, or an impact assessment.

## Method and sources

Require a specific UN target and documented duties, plus a reviewed MyCOL-to-O*NET scope relationship. A shared occupation or skill label is not enough. Retain target adoption, source access and application-review dates separately; do not treat an edition or HTTP modification date as a publication date.

- [UN General Assembly, A/RES/70/1](https://docs.un.org/en/A/RES/70/1), adopted 2015-09-25, defines the targets.
- [UN DESA Goal 3](https://sdgs.un.org/goals/goal3) and [Goal 8](https://sdgs.un.org/goals/goal8), retrieved 2026-10-22, confirm targets 3.8 and 8.8 verbatim. The live pages have no single publication date. Their progress figures are **not** used in these mappings.
- [O*NET Registered Nurses, Tasks](https://www.onetonline.org/link/summary/29-1141.00#Tasks) and [Human Resources Managers, Tasks](https://www.onetonline.org/link/summary/11-3121.00#Tasks), retrieved 2026-10-22. Live duty references, not claims about a particular Malaysian employer or person; no publication date is inferred.
- MyCOL identity, included titles and report page references reuse the existing 2026-10-21 reviewed transcription and manual crosswalk, documented in [the occupation evidence review](occupation-evidence-milestone-2.md). This SDG review does not claim a fresh retrieval of that report. The card citations identify that earlier review date.

## Accepted links

| MyCOL scope | UN target | Duty basis | Limits |
| --- | --- | --- | --- |
| MASCO 2221 Nursing Professionals; clinical duties only | 3.8, quality essential health-care services | O*NET 29-1141.00 documents administering medicines and monitoring reactions, providing health care and immunizations, and coordinating patient care plans. | Approximate crosswalk; US nursing reference, not Malaysian licensing advice. Does not cover Nurse Instructor teaching duties or demonstrate financial protection, affordability, service access or health outcomes. |
| MASCO 1212 Human Resource Managers; HR labour-relations duties only | 8.8, protection of labour rights | O*NET 11-3121.00 documents bargaining agreements, interpreting labour contracts, and advice on equal employment opportunity and sexual harassment policies. | Narrower crosswalk; excludes Training Manager and occupational safety/health manager titles. US duties are not Malaysian legal advice. No compliance, safety or migrant-worker outcome measurements. |

The mapping rationale is a manual interpretation of these two sources together. Neither UN target pages nor O*NET claims that these MyCOL occupations achieve an SDG. Skills arrays are intentionally empty: occupational duties must not be converted into newly invented skill requirements.

## Not mapped

These seven other occupations retain **SDG relevance not assessed**. This is absence of a reviewed supporting mapping, not evidence of no relevance.

| MASCO | Occupation | Why no tag was added |
| --- | --- | --- |
| 2413 | Financial Analysts | Investment/risk analysis alone does not establish expanded access to financial services (8.10) or sustainable financing. |
| 2431 | Advertising and Marketing Professionals | Broad marketing work does not establish sustainable-consumption education (12.8); the existing occupation crosswalk is also unverified. |
| 2511 | Computer Systems Analysts | Generic systems work does not establish a specific inclusive-access, sustainable-infrastructure or resource-efficiency purpose. |
| 2512 | Software Developers | Software development alone does not demonstrate scientific research/industrial R&D (9.5) or a sustainable-use context. |
| 2521 | Database Designers and Administrators | Data administration does not by itself establish SDG statistical capacity or equitable data access (17.18). |
| 2524 | Data Professionals | Analysis alone does not establish national statistical capacity-building (17.18) or improved SDG outcomes. |
| 2531 | Cyber Security Professionals | Generic information security is insufficient to equate an occupation with a particular peace, justice or sustainable-infrastructure target. |

No weak link is promoted to “unverified example” just to fill a card. Existing fictional sample-role mappings and their source-supported/unverified statuses remain unchanged.

## Product and safety boundaries

- Tags expand through native keyboard-accessible `details`/`summary` controls to show target, rationale, all citations, source dates, review dates and scope caveats.
- List cards, comparison cards and occupation details reuse the same tags.
- No separate SDG explorer, impact score, readiness/ranking change or API schema change.
- MyCOL evidence is separate from the existing fictional-role SDG AI context. A goal-only AI request cannot identify which real occupation/subset is being explained; no AI button is offered for these mappings rather than silently widening that contract.
- No CV, profile, storage, inference request or dataset import behavior changes.
