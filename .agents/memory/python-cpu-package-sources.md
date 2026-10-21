---
name: Python CPU package sources
description: Environment-specific dependency resolver behavior seen when adding sentence transformers.
---

Replit's publish-time Python resolver can expose different candidate versions from a locally cached lock. Keep CPU PyTorch indexes explicit and scoped to packages they actually host, but do not assume an explicit PyPI default alone repairs publication.

Retain the Linux CPU-only Torch mapping for this CPU inference service. Removing it selects the default PyPI Linux distribution and pulls in a large CUDA/Triton dependency set without changing the application's CPU execution.

**Why:** Explicit PyPI configuration and multiple compatible version-range changes all installed locally, but subsequent publish builds rejected each newly requested range. The reported version intervals alone did not establish that specific release families were missing. Local installation success was insufficient evidence that the publish blocker was repaired.

**How to apply:** Inspect the newest publish log and verify package sources and environment overrides. Check the latest minor's metadata rather than inferring a whole major's requirements from its first release. Verify compatible changes with a normal lock regeneration, real sync, and the pinned model's embedding smoke test. If successive requested ranges are each excluded only during publishing despite valid local installs, stop changing pins without new evidence; report the installer discrepancy and seek platform investigation. Preserve the managed Python environment rather than creating another virtual environment.
