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

**How to apply:** Use documented deterministic prototype calculations; keep source URLs nullable and show missing/stale evidence. Do not make synthetic refresh controls pretend to fetch live data. New hackathon profile entry uses fictional samples/manual skills rather than CV extraction claims.

For official labour-market data integrations, use DOSM sources only unless the user explicitly approves additional providers.

**Why:** The user set DOSM as the official-source scope for the workforce data milestone and asked that other providers not be added without approval.

**How to apply:** Verify the requested official DOSM pages, API endpoints and data files before implementation. If a DOSM link is unavailable, document the official replacement; do not broaden the provider list on your own.

## Roadmap and confirmation rules (My Profile)
- Only the "Build my learning roadmap" action sets the roadmap target; Career Explorer browsing never does.
- Roadmap milestones derive from a baseline snapshot taken at build time, so confirmed level changes never shrink the roadmap or lose progress.
- Milestone completion never changes skill levels; levels change only via a separate user-confirmed update (one per milestone).
- Roadmap/twin live under `/profile?section=…`; old `/roadmap` and `/twin` redirect there.
- Known pre-existing failing Playwright check: dashboard spec expecting "illustrative associations, not verified evidence" text.
**Why:** user spec required progress to be tracked without silently inflating readiness.
