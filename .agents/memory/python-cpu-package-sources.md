---
name: Python CPU package sources
description: Environment-specific dependency resolver behavior seen when adding sentence transformers.
---

Replit's Python package installer can generate CPU PyTorch index overrides for unrelated ML packages, including sentence-transformers. The CPU wheel index does not necessarily host those packages.

**Why:** Repeated installation attempts regenerated these overrides and reported that sentence-transformers had no available releases, although the package was available on PyPI. This was an index-routing problem, not a missing library.

**How to apply:** When this resolver error appears, inspect generated package-source mappings before changing libraries or abandoning the requested stack. Limit the explicit CPU index to packages it actually hosts; resolve ordinary packages from PyPI. Preserve the managed Python environment rather than creating a separate virtual environment.
