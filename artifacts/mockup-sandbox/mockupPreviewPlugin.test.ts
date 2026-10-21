import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import type { Plugin, ResolvedConfig } from "vite";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

// Invoke Vite hooks without starting an HTTP server.
function hook<T extends (...args: any[]) => any>(value: T | { handler: T }): T {
  return typeof value === "function" ? value : value.handler;
}

test("discovers nested TSX previews, excludes private helpers and keeps stable imports", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mockup-discovery-"));
  try {
    for (const file of [
      "Zed.tsx", "nested/Alpha.tsx", "_Private.tsx",
      "_helpers/Nested.tsx", "nested/_Hidden.tsx", "notes.txt",
    ]) {
      const target = path.join(root, "src/components/mockups", file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, "");
    }
    const plugin: Plugin = mockupPreviewPlugin();
    await hook(plugin.configResolved!)({ root } as ResolvedConfig);
    await hook(plugin.buildStart!).call({} as never, {} as never);
    const generated = path.join(root, "src/.generated/mockup-components.ts");
    const source = await readFile(generated, "utf8");
    assert.ok(source.includes('"./components/mockups/Zed.tsx"'));
    assert.ok(source.includes('import("../components/mockups/nested/Alpha.tsx")'));
    assert.ok(!source.includes("_Private"));
    assert.ok(!source.includes("_helpers"));
    assert.ok(!source.includes("_Hidden"));
    assert.ok(!source.includes("notes.txt"));
    assert.ok(source.indexOf("Zed.tsx") < source.indexOf("Alpha.tsx"));

    await hook(plugin.buildStart!).call({} as never, {} as never);
    assert.equal(await readFile(generated, "utf8"), source);
    await rm(path.join(root, "src/components/mockups/Zed.tsx"));
    await writeFile(path.join(root, "src/components/mockups/New.tsx"), "");
    await hook(plugin.buildStart!).call({} as never, {} as never);
    const updated = await readFile(generated, "utf8");
    assert.ok(!updated.includes("Zed.tsx"));
    assert.ok(updated.includes("New.tsx"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an absent mockups directory generates an empty module map", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mockup-empty-"));
  try {
    const plugin = mockupPreviewPlugin();
    await hook(plugin.configResolved!)({ root } as ResolvedConfig);
    await hook(plugin.buildStart!).call({} as never, {} as never);
    const source = await readFile(path.join(root, "src/.generated/mockup-components.ts"), "utf8");
    assert.match(source, /export const modules: ModuleMap = \{\n\n\};/);
    assert.ok(!source.includes("import("));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
