import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'generated-artifacts/backend-submission');
const entries = [];
const runpodFiles = new Set(['lib/runpod.ts', 'lib/llmPrompts.ts']);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(name));
    else if (entry.isFile() && entry.name !== '.gitkeep') result.push(name);
  }
  return result.sort();
}

async function copy(source, destination) {
  const original = path.join(root, source);
  const target = path.join(output, destination);
  const bytes = await readFile(original);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(original, target);
  if (hash(await readFile(target)) !== hash(bytes)) throw new Error(`Copy differs: ${destination}`);
  entries.push({ original: source, submission: destination, bytes: bytes.length, sha256: hash(bytes) });
}

await mkdir(output, { recursive: true });
for (const category of ['docs', 'runpod', 'src', 'submission', 'tests']) {
  await mkdir(path.join(output, category), { recursive: true });
}

const backend = path.join(root, 'artifacts/api-server/src');
for (const file of await files(backend)) {
  const relative = path.relative(backend, file).split(path.sep).join('/');
  const category = relative.endsWith('.test.ts') || relative.startsWith('test-fixtures/')
    ? 'tests' : runpodFiles.has(relative) ? 'runpod' : 'src';
  await copy(`artifacts/api-server/src/${relative}`, `${category}/${relative}`);
}

for (const file of await files(path.join(root, 'docs'))) {
  const relative = path.relative(path.join(root, 'docs'), file).split(path.sep).join('/');
  await copy(`docs/${relative}`, `docs/${relative}`);
}

// Include the backend's local workspace dependencies, never installed packages or build outputs.
for (const name of ['api-zod', 'db', 'workforce-evidence']) {
  const base = `lib/${name}`;
  for (const file of await files(path.join(root, base, 'src'))) {
    const relative = path.relative(path.join(root, base), file).split(path.sep).join('/');
    await copy(`${base}/${relative}`, `src/shared/${name}/${relative}`);
  }
  await copy(`${base}/package.json`, `src/shared/${name}/package.json`);
}
for (const name of ['package.json', 'tsconfig.json', 'build.mjs']) {
  await copy(`artifacts/api-server/${name}`, name);
}
await copy('.gitignore', '.gitignore');

// Verify both the copied files and originals after the complete export.
for (const entry of entries) {
  if (hash(await readFile(path.join(root, entry.original))) !== entry.sha256
    || hash(await readFile(path.join(output, entry.submission))) !== entry.sha256) {
    throw new Error(`Source changed or copy differs: ${entry.original}`);
  }
}
await writeFile(path.join(output, 'submission/file-map.json'), `${JSON.stringify(entries, null, 2)}\n`);
await writeFile(path.join(output, 'submission/verification.json'), `${JSON.stringify({
  copiedFiles: entries.length,
  byteIdentical: true,
  liveBackendModified: false,
  algorithm: 'SHA-256',
}, null, 2)}\n`);
await writeFile(path.join(output, 'README.md'), `# FutureReady backend submission

This is an organized review copy, not a standalone runnable service.
Every copied file is byte-for-byte identical to its original. Only its location in this submission is different.
The running backend remains at \`artifacts/api-server\` in the original workspace.

## Folder guide
- \`docs/\`: existing project evidence and technical documentation.
- \`runpod/lib/\`: original RunPod client and prompt definitions.
- \`src/\`: server entry points, routes, services, other helpers, and datasets.
- \`src/shared/\`: original source and package manifests for local backend dependencies.
- \`tests/\`: original backend tests and test fixtures, grouped by their original subfolders.
- \`submission/file-map.json\`: original path, submission path, file size, and SHA-256 for every copied file.
- \`submission/verification.json\`: copy verification result.

## Important
Imports, package scripts, build paths, and configuration are intentionally unchanged.
Moving files between categories means the copies do not resolve the original relative imports by themselves.
Use the original workspace to run the service or tests:

\`\`\`sh
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run test
\`\`\`

The original package.json, tsconfig.json and build.mjs are included for reference.
This is TypeScript/Express: package.json declares dependencies; no Python requirements.txt was invented.
No .env files, secret values, frontend, node_modules, compiled builds or new license were included.
The live .replit configuration was not moved or replaced.

Regenerate from the original workspace with:
\`node scripts/prepare-backend-submission.mjs\`

Generated output is ignored by Git and deployment rules; the preparation script is retained for reproducibility.
`);
console.log(`Created ${path.relative(root, output)}: ${entries.length} copied files, all byte-identical.`);
