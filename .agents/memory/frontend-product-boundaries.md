---
name: Frontend product and evidence boundaries
description: FutureReady's Aiversecity scope, audience separation and trust requirements for demonstration features.
---

FutureReady Workforce targets the Aiversecity Future-Ready Workforce domain: working adults, graduates/career switchers, HR/L&D managers and University/TVET career centres.

**Why:** The user explicitly identified these four audiences and requires a hackathon frontend before later backend, dataset, AI and database milestones.

**How to apply:** Keep audience demo profiles and learning progress isolated. Preserve the React/TypeScript, Vite and Wouter stack. Do not change the Express backend, schemas or deployment configuration for frontend-only requests.

The user explicitly approved a light, macOS-inspired site-wide direction with white and gray surfaces, subtle glass navigation and soft electric-blue accents. This supersedes the previous warm palette for the FutureReady app; FPS canvas references remain separate.

**Why:** The latest visual request directly defines the current application style, while earlier FPS references were for independent canvas mockups.

**How to apply:** Use the light blue direction for FutureReady app-wide visual work unless the user changes it. Do not carry separate canvas mockup styling into the app without approval.

Readiness, observed market evidence and scenario assumptions are different concepts. Synthetic profiles, employment examples and cohort records must be clearly labelled. Unverified courses and role/skill-to-SDG relationships must not be presented as verified evidence.

**Why:** The user explicitly prohibits fake live signals, random match scores, fabricated sources, unvalidated forecasts and individual hiring decisions from aggregate planning views.

**How to apply:** Use documented deterministic prototype calculations; keep source URLs nullable and show missing/stale evidence. Do not make synthetic refresh controls pretend to fetch live data. Candidate skills come from reviewed CV extraction or manual entry; do not seed fictional skills.

For official labour-market data integrations, use DOSM sources only unless the user explicitly approves additional providers.

**Why:** The user set DOSM as the official-source scope for the workforce data milestone and asked that other providers not be added without approval.

**How to apply:** Verify the requested official DOSM pages, API endpoints and data files before implementation. If a DOSM link is unavailable, document the official replacement; do not broaden the provider list on your own.

## AI task-exposure self-check
AI exposure must be assessed at the task level from user-selected work characteristics, not inferred from a skill name alone. Keep the result qualitative and clearly distinguish it from an AI prediction or a validated exposure dataset. Do not persist task-check answers into profile data without an explicit request.

**Why:** The app has no validated per-skill AI exposure source, and a skill label alone cannot establish whether a person's work can be automated.

**How to apply:** Describe possible task automation or assistance only from the user's own task details. A sourced exposure model or saved assessment history requires separate evidence and explicit scope.

## User-supplied career-name reference
Use the user-supplied AI Job Market Dataset as a reference for career names.

**Why:** The user supplied it specifically saying, “this is the dataset for career name,” then approved its use for CV career recommendations and AI explanation only.

**How to apply:** Limit these names to CV recommendations and AI Career Explanation; keep general career browsing, DOSM and team features unchanged. Do not treat its salary, openings or skill flags as verified labour evidence or skill requirements. Use declared existing skill-reference families without changing the overlap algorithm; pooled AI/data-science evidence must not be presented as distinct title-specific requirements.

## Runpod AI skill explanations
Candidate-facing AI Career Explanation must use the uploaded CV, not fictional profiles. The user explicitly approved sending reviewed structured skills, education, work experience, certifications, projects and languages to RunPod after a preview-and-confirm step for each upload. Never send the CV file, full extracted document text, name/contact fields, proficiency ratings or unrelated saved profile data. Details and explanations stay transient. The earlier single-skill explanation remains a narrower permitted path; non-candidate demonstration endpoints may still use labelled synthetic context.

**Why:** The user superseded the earlier synthetic-only and single-skill limits by approving reviewed structured CV details for the seven-section career explanation, with names/contact fields and raw files/text excluded.

**How to apply:** Require explicit consent, bounded allowlisted structured fields and canonical detected skills. Invalidate the previous explanation and consent on new uploads or edits. Keep matching scores and provider-verified learning links server-owned; distinguish missing CV evidence from a lack of ability. Preserve algorithms, official datasets, team features and Replit configuration.

A model can interpret a CV-detected skill label as proof of proficiency even when told not to. Treat generated CV explanations as untrusted on this point, not just the input.

**Why:** Live Qwen responses inferred English fluency from a language label, called certification exams courses, and treated pooled skill references as mandatory title-specific requirements despite prompt prohibitions.

**How to apply:** Render personal fact summaries, career alignments, strength evidence and course/certification classifications from reviewed data and reference records, not model assertions. Label that distinction in the UI. Validate remaining AI prose; neither a detected skill nor a pooled reference verifies proficiency or an exact job title's requirements.

AI profile suggestions are the only approved addition workflow: users must explicitly confirm each skill, self-rate its proficiency and then separately save the profile. An AI suggestion cannot overwrite an existing skill or its level.

**Why:** The expanded integration request requires human confirmation and prohibits automatic profile changes, even though suggestions originate from fictional background examples.

**How to apply:** Keep generated suggestions constrained to existing dataset skills and treat confirmed additions as an unsaved draft until the existing Save profile action.

Authoritative figures, dates and citations belong in server-rendered evidence/context panels. Give the model qualitative projections (matched/missing skills, observed trend directions and scenario assumptions), not raw scores to restate.

**Why:** Live Qwen responses repeated numerical scores and source identifiers despite instructions to avoid figures. Instructions alone are insufficient to keep generated prose separate from authoritative calculations.

**How to apply:** Retain output validation; do not relax it merely to make responses pass. Keep all numerical computations deterministic, and present source-supported thematic SDG relevance separately from measured impact or official occupational classification.

An opt-in fictional explanation beside a deterministic feature does not make its actual calculations or private learner data LLM-powered.

**Why:** The prompt-improvement request explicitly requires an honest inventory of connected inference paths, including distinguishing actual learning progress from hypothetical examples.

**How to apply:** Describe exactly what context reaches the shared service. Prompt improvements alone do not authorize sending real CVs, saved learning histories or profile data; report those inference flows as unconnected until explicitly approved and implemented.

## Roadmap and confirmation rules (My Profile)
- Only the "Build my learning roadmap" action sets the roadmap target; Career Explorer browsing never does.
- Roadmap milestones derive from a baseline snapshot taken at build time, so confirmed level changes never shrink the roadmap or lose progress.
- Milestone completion never changes skill levels; levels change only via a separate user-confirmed update (one per milestone).
**Why:** user spec required progress to be tracked without silently inflating readiness.

## Consolidated workspace boundaries
Do not reintroduce separate duplicate CV-analysis, job-recommendation, SDG-explorer or AI-panel workspaces when extending the app. Keep CV upload and analysis on My profile, career workflows together, SDG relevance on career cards, and explanations in one shared drawer. The Dashboard is a summary with onward links, not a second copy of detailed tools.

**Why:** The user explicitly requested five primary destinations to reduce repetition and navigation complexity while preserving existing capabilities.

**How to apply:** Keep the demo disclaimer in the shared top banner rather than repeating it on every card or page; retain source-specific evidence caveats and CV privacy instructions. A single audience selector controls the shared workspace. Learning roadmap has its own primary destination, while Digital Twin progress remains profile-related. Route reorganizations must preserve old links and saved profile/roadmap state; API changes require explicit approval, and CV privacy boundaries remain in force.
