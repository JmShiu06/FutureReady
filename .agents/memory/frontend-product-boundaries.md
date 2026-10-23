---
name: Frontend product and evidence boundaries
description: FutureReady's Aiversecity scope, audience separation and trust requirements for demonstration features.
---

The visible "Viewing as" audience selector offers working adults and graduates/career switchers only. Legacy HR and University/TVET profiles and progress remain in local storage for compatibility, but are not selectable.

**Why:** The user explicitly asked to remove HR/L&D managers and TVET career centres from the "Viewing as" selector.

**How to apply:** Keep the selector limited to working adults and graduates/career switchers. When loading saved HR or education selection, show Working Adults while retaining all legacy audience profiles and progress. Preserve the React/TypeScript, Vite and Wouter stack. Do not change the Express backend, schemas or deployment configuration for frontend-only requests.

The user now requests soft brown and cream across the FutureReady site. This supersedes the earlier light-blue accent palette; retain the existing layout, typography, glass navigation and raccoon animations. FPS canvas references remain separate.

**Why:** The user explicitly changed the site colors to soft brown and cream, not the page designs or behavior. Earlier FPS references were for independent canvas mockups.

**How to apply:** Use cream surfaces, soft taupe and cocoa accents with legible dark brown text. Keep meaningful status colors and official SDG colors distinct. Do not carry separate canvas mockup styling into the app without approval.

Readiness, observed market evidence and scenario assumptions are different concepts. Synthetic profiles, employment examples and cohort records must be clearly labelled. Unverified courses and role/skill-to-SDG relationships must not be presented as verified evidence.

**Why:** The user explicitly prohibits fake live signals, random match scores, fabricated sources, unvalidated forecasts and individual hiring decisions from aggregate planning views.

**How to apply:** Use documented deterministic prototype calculations; keep source URLs nullable and show missing/stale evidence. Do not make synthetic refresh controls pretend to fetch live data. Candidate skills come from reviewed CV extraction or manual entry; never silently seed fictional skills.

Do not offer fictional sample profiles or sample CV downloads in the user interface. LinkedIn import/recruitment integration remains outside this demo's scope.

**Why:** On 2026-10-23 the user explicitly asked to delete the fictional samples, superseding the earlier demo-profile requirement. This does not remove the separate privacy and consent protections on existing CV features.

**How to apply:** Route new roadmap users to Careers & jobs and their own saved skills. Preserve already-saved profiles, historical roadmap snapshots and completion records; removing sample entry points is not permission to erase user data. Offline fixtures may remain for regression coverage.

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
Candidate-facing Skill analysis uses selected skill names saved in the active My profile, including manually added skills, without requiring a CV upload. RunPod sharing needs explicit preview-and-consent. Never send the CV file, full extracted text, languages, education, work history, certifications, projects, names/contact fields, proficiency ratings or other profile data. Explanations stay transient; existing synthetic-only demonstration endpoints retain their narrower boundaries.

**Why:** The user superseded the earlier CV-linked analysis by explicitly choosing saved profile skills, including manually added skills. This approves selected skill names, not a general permission to transmit saved personal profiles.

**How to apply:** Require explicit consent and bounded allowlisted skill names. Invalidate explanation and consent when saved skill names or the active profile change; a CV upload alone must not control analysis. Keep scores and verified learning links server-owned. Missing selected-skill evidence is not proof of missing ability. Preserve algorithms, datasets, team features and Replit configuration.

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

## Raccoon team artwork
Use the first hand-drawn raccoon face from the supplied sticker sheet as the official brand icon. Other stickers are subtle decorations, not navigation icons or reasons to add sections.

**Why:** The user explicitly chose the supplied artwork for the team's identity and asked to preserve the existing website, features, navigation labels and hand-drawn appearance.

**How to apply:** Keep functional icons simple outlines. Use individual transparent assets rather than the full sheet, with small responsive placements that never overlap text or controls. Preserve the warm cream-and-brown palette.

For loading feedback, use the user's uploaded star-hugging raccoon illustration unchanged, with its actual five paw prints lighting up separately from left to right. Do not replace it with a redrawn mascot.

**Why:** The user explicitly supplied the hand-drawn artwork as a brand asset and requested individual paw lights, rather than whole-image brightness changes.

**How to apply:** Use it only during genuine asynchronous waits, never add display delays, keep button indicators compact, and disable animation for reduced motion. Retain texture and outlines if removing the paper background would damage them.

Normalize the extracted paw masks independently without changing the raccoon artwork: the first paw in the source is much darker than the other four.

**Why:** A uniform opacity conversion makes the later paw lights nearly invisible even when their active colour is dark. The relevant difference is in mask opacity, not the chosen CSS colour.

**How to apply:** Preserve each hand-drawn silhouette and antialiased edge, remove paper from the mask, and verify inactive as well as active prints remain visible.

## Consolidated workspace boundaries
Do not reintroduce separate duplicate CV-analysis, job-recommendation, SDG-explorer or AI-panel workspaces when extending the app. Keep CV upload and analysis on My profile, career workflows together, SDG relevance on career cards, and explanations in one shared drawer. The Dashboard is a summary with onward links, not a second copy of detailed tools.

**Why:** The user explicitly requested five primary destinations to reduce repetition and navigation complexity while preserving existing capabilities.

**How to apply:** Keep the demo disclaimer in the shared top banner rather than repeating it on every card or page; retain source-specific evidence caveats and CV privacy instructions. A single audience selector controls the shared workspace. Learning roadmap has its own primary destination, while Digital Twin progress remains profile-related. Route reorganizations must preserve old links and saved profile/roadmap state; API changes require explicit approval, and CV privacy boundaries remain in force.
