---
name: Python CPU package sources
description: Environment-specific dependency resolver behavior seen when adding sentence transformers.
---

Replit's Python package installer can generate CPU PyTorch index overrides for unrelated ML packages, including sentence-transformers. The CPU wheel index does not necessarily host those packages.

**Why:** Replit build-time resolution can fail to honor an implicit PyPI fallback even when the lockfile records a compatible release from PyPI. This is an index-routing problem, not necessarily a missing library.

**How to apply:** If a publish log says no compatible release exists despite the locked version being available on PyPI, declare PyPI as uv's explicit default index. Keep the CPU wheel index explicit and scoped to `torch`; verify with `uv lock` and `uv sync --frozen --dry-run`. Preserve the managed Python environment rather than creating a separate virtual environment.
