import { it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

it("the manual smoke command refuses to run without explicit paid-request authorization", () => {
  const script = fileURLToPath(new URL("../../scripts/glm-smoke.ts", import.meta.url));
  const result = spawnSync(process.execPath, ["--import", "tsx", script], {
    // No inherited credentials. Refusal must happen before accessing a provider.
    env: { PATH: process.env.PATH, NODE_ENV: "production" },
    encoding: "utf8",
    timeout: 10_000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stdout + result.stderr, /Not run.*paid GLM request/);
  assert.doesNotMatch(result.stdout + result.stderr, /GLM live smoke test failed|GLM live smoke test succeeded/);
});
