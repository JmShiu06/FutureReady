---
name: CV workflow boundaries
description: User-defined privacy and scope constraints for FutureReady CV work and separate canvas experiments.
---

The CV workflow belongs in the existing FutureReady website and retains its original warm orange-and-cream branding. FPS-style canvas frames are separate design references, not approval to replace the live website theme.

**Why:** Collaborative canvas experiments and requests for the original theme occurred alongside a repeated attachment explicitly targeting the existing warm-themed website.

**How to apply:** Keep canvas-only explorations separate unless the user explicitly asks to integrate one. Prioritize the current user's request rather than continuing an older collaborator's design experiment.

CV files and full extracted document text must remain transient and must not be persisted or sent to external services. Explicitly labelled profile suggestions and skills may enter the device profile only after user review and confirmation. Extraction must not infer qualifications or proficiency.

**Why:** The user explicitly treats CVs as sensitive personal documents and requires a non-LLM, no-paid-service workflow.

**How to apply:** Preserve these boundaries when extending extraction, adding OCR, changing storage, or introducing analytics. Return only the minimum candidate field values needed for review, never raw CV text.

The CV import review is one popup: open it automatically after extraction and keep detected skills, skill selection, warnings and self-assessed proficiency choices together. Do not show the review list inline on the profile page; leave a button to reopen it if dismissed.

**Why:** The user clarified that both detected-skill review and proficiency selection should happen in the popup immediately after upload.

**How to apply:** Keep upload results transient until the user confirms the selected skills and levels, then add them to the profile draft for the user to save.

Show proficiency as five chili icons, from 1 “New to it” through 5 “Can teach.” A CV tick means the skill name was detected in the document; it does not verify the user's proficiency.

**Why:** The user requested chili-based 1–5 skill ratings and a small CV tick while keeping proficiency self-assessed.

**How to apply:** Reuse this visual scale anywhere users set profile or CV-review proficiency, and label CV evidence as detection rather than validated expertise.
