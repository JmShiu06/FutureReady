---
name: CV workflow boundaries
description: User-defined privacy and scope constraints for FutureReady CV work and separate canvas experiments.
---

The CV workflow belongs in the existing FutureReady website and retains its original warm orange-and-cream branding. FPS-style canvas frames are separate design references, not approval to replace the live website theme.

**Why:** Collaborative canvas experiments and requests for the original theme occurred alongside a repeated attachment explicitly targeting the existing warm-themed website.

**How to apply:** Keep canvas-only explorations separate unless the user explicitly asks to integrate one. Prioritize the current user's request rather than continuing an older collaborator's design experiment.

CV files and full extracted document text must remain transient and must not be persisted or sent to external services. Only CV-supported, explicitly labelled profile suggestions and skills may enter the device profile after user review and confirmation. When the CV has no match, leave the current field unchanged; never clear it or fill it with unrelated defaults or guesses. Extraction must not infer qualifications or proficiency.

**Why:** The user explicitly treats CVs as sensitive personal documents and requires a non-LLM, no-paid-service workflow.

**How to apply:** Preserve these boundaries when extending extraction, adding OCR, changing storage, or introducing analytics. Return only the minimum candidate field values needed for review, never raw CV text. If a field is absent or unchecked, do not write to it. The user later approved transient, reviewed structured CV details for RunPod career explanations after explicit consent; see frontend-product-boundaries.md for that exception.

The job-recommendation page uses the user's saved profile skills as input; it does not upload or re-read a CV. Show role matches and the specific saved skills that contribute to each recommendation, without presenting overlap as a hiring probability.

**Why:** The user clarified that CV information should flow from the profile and that this page should focus on recommended roles and how profile skills relate to them.

**How to apply:** Keep CV extraction and profile editing on the profile workflow. The recommendations view should stay focused on roles and skill evidence; use only skills already saved in the active profile.

New and reset profiles start with blank About You fields. On every app reload, clear saved About You fields across audiences while keeping skills and roadmap progress. Put examples in light-gray placeholders, never in saved profile data.

**Why:** The user later explicitly changed the saved-profile behavior and requested that About You details reset whenever the website is refreshed.

**How to apply:** Apply the refresh reset when loading the workspace, preserving skills, targets, and completion. Candidate profiles now start/reset with no seeded skills: the user requested actual CV-derived skills instead of fictional defaults. Do not erase manual or reviewed CV skills merely because they resemble an example.

The CV import review is one popup: open it automatically after extraction and keep detected skills, skill selection, warnings and self-assessed proficiency choices together. Do not show the review list inline on the profile page; leave a button to reopen it if dismissed.

**Why:** The user clarified that both detected-skill review and proficiency selection should happen in the popup immediately after upload.

**How to apply:** Keep upload results transient until the user confirms the selected skills and levels, then add them to the profile draft for the user to save.

Show proficiency as five chili icons, from 1 “New to it” through 5 “Can teach.” A CV tick means the skill name was detected in the document; it does not verify the user's proficiency.

**Why:** The user requested chili-based 1–5 skill ratings and a small CV tick while keeping proficiency self-assessed.

**How to apply:** Reuse this visual scale anywhere users set profile or CV-review proficiency, and label CV evidence as detection rather than validated expertise.

Non-keyword skill matching should stay local and transparent: use curated related-phrase mappings, label related matches separately from exact matches, and leave CV-derived suggestions subject to profile review. Do not infer proficiency or send full CV/profile text externally. Only explicitly consented, minimized structured CV details may use the approved RunPod explanation path.

**Why:** The user requested recognition of skills expressed with different wording while retaining the project's no-external-service CV privacy boundary.

**How to apply:** Expand related-skill mappings cautiously, expose the dataset term behind each related recommendation, and preserve user confirmation before CV-derived skills are saved.

Do not persist CV upload history just to drive recommendations. Use reviewed `cvDetected` profile skills to identify CV-derived skills, and describe their absence as “no CV-based skills saved,” not as proof that no file was uploaded.

**Why:** CV files are intentionally transient; the profile only retains skill evidence the user reviewed and applied.

**How to apply:** If a page needs to invite CV setup, show the profile link when no CV-derived skills are saved and keep the message accurate even if a past upload produced no saved skills.

CV upload and skill review belong on My profile, but the AI Career Explanation panel does not. Reviewed-data consent and the career sections belong on the AI Explanation page. Improvement Suggestions and Areas for Growth belong on Learning roadmap, not duplicated in the career explanation.

**Why:** The user explicitly requested removing AI Career Explanation from My profile and moving those two cards to Learning roadmap.

**How to apply:** Reuse the same transient, consented explanation across navigation without another AI call or persistent storage. Preserve existing roadmap milestones and profile skill review, and provide links between upload, explanation and learning guidance.
