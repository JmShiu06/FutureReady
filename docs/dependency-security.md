# Dependency vulnerability remediation

The dependency audit reports **zero findings** after the following changes.
The workspace still installs with `pnpm install --frozen-lockfile`.

| Previously flagged package | Resolution | Listed findings addressed |
| --- | --- | ---: |
| ChromaDB 1.5.9 | Removed the unused installation left by the retired learning engine; added idempotent post-merge cleanup for existing workspaces. No datasets or other Python dependencies are deleted. | 8 |
| Vite 7.3.6 | Updated the shared catalog and lockfile to 7.3.7. | 5 |
| brace-expansion 5.0.9 | Refreshed the existing Orval/TypeDoc dependency tree to 5.0.12. | 3 |
| markdown-it 14.3.1 | Refreshed the existing Orval/TypeDoc dependency tree to 14.3.3. | 3 |
| source-map-js 1.2.1 | Updated to 1.2.2, including a scoped override for Tailwind's dependency tree. | 1 |
| braces 3.0.3 | No patched release was available. Replaced the mockup preview's fast-glob dependency with tinyglobby, removing braces and micromatch from the lockfile. | 1 |
| sprintf-js 1.0.3 | No patched release was available. Scoped Mammoth's argparse dependency to 2.0.1, which supports its legacy CLI API without depending on sprintf-js. | 1 |
| fast-uri 3.1.7 | Refreshed Orval's dependency tree to 3.1.9. | 1 |
| postcss-selector-parser 6.0.10 | Typography's latest release still pins the affected version. Scoped its parser dependency to patched 7.1.7. | 1 |
| **Total** | | **24** |

## Compatibility choices

- Orval remains at the previously used **8.30.0**, now explicitly pinned.
  The newer 8.43 release failed Zod code generation on this workspace's actual
  Node 20 runtime because it uses `Map.groupBy`. Both React Query and Zod
  generation with the existing configuration were verified using 8.30.0 and
  patched transitive dependencies, writing only to a temporary directory.
  Do not lift this pin without checking the runtime and both generator targets.
- The shared tsx version is aligned with Vite's resolved optional peer version.
  Different tsx peer versions created separate Vite type identities and
  incompatible plugin types during TypeScript checking.
- ChromaDB is not an active project dependency. Removing it does not restore
  or replace the retired learning engine. The cleanup script is run by the
  existing post-merge hook because an untracked workspace installation does
  not disappear when a dependency manifest is removed. It uses uv with the
  installed distribution's target directory, so it does not require pip in
  the workspace Python environment.

## Verification

- Dependency audit: no critical, high, moderate, low, or informational findings.
- Frozen lockfile installation, full workspace typecheck and production build pass.
- Mockup discovery tests pass, including nested files, private-file exclusion,
  stable generated imports, additions/removals and an absent mockups directory.
- Mammoth's `--help` command and API DOCX extraction tests pass.
- Python dataset-preparation tests pass; ChromaDB is no longer importable.
- Cleanup integration tests use real uv with isolated distribution metadata:
  removal without pip, preservation of unrelated packages, repeat runs and
  already-clean environments pass. A no-op uninstaller fails the metadata check.
- All three managed services start; API health and the app preview load.
- The API test suite passes 90 of 91 tests. The existing failure in
  `src/routes/analysis.test.ts`, “uses the existing matcher for role-specific
  gaps, including zero-overlap roles”, expects no courses while the unchanged
  analysis code returns the existing verified “AWS Cloud Practitioner Essentials”
  resource. This unrelated expectation and product behavior were not changed.
