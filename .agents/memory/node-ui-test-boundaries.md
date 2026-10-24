---
name: Node UI test boundaries
description: Avoid treating missing Vite browser behavior in Node UI tests as an application regression.
---

Keep browser runtime behavior intact when repairing Node-only UI tests. Supply the necessary transforms and providers, and deliberately select the locale/onboarding state the test intends to render.

**Why:** Raw Node does not inherit Vite's stylesheet handling or JSX transforms. Rendering the translation provider without a saved locale also renders first-visit onboarding, whose assets expect Vite's browser environment; that is a fixture/environment mismatch, not evidence that the normal browser UI is broken.

**How to apply:** Separate loader/transform failures from assertions about actual behavior. Use deterministic locale state for ordinary translated component tests; test onboarding separately in its appropriate environment.
