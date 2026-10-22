import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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

// This directory contains generated copies only; rebuild it so reserved folders stay empty.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const category of ['docs', 'runpod', 'src', 'submission', 'tests']) {
  await mkdir(path.join(output, category), { recursive: true });
}

const backend = path.join(root, 'artifacts/api-server/src');
for (const file of await files(backend)) {
  const relative = path.relative(backend, file).split(path.sep).join('/');
  if (relative.endsWith('.test.ts') || relative.startsWith('test-fixtures/')) continue;
  const destination = runpodFiles.has(relative) ? `runpod/${path.basename(relative)}` : `src/${relative}`;
  await copy(`artifacts/api-server/src/${relative}`, destination);
}

// Include the backend's local workspace dependencies, never installed packages or build outputs.
for (const name of ['api-zod', 'db', 'workforce-evidence']) {
  const base = `lib/${name}`;
  for (const file of await files(path.join(root, base, 'src'))) {
    const relative = path.relative(path.join(root, base), file).split(path.sep).join('/');
    if (relative.endsWith('.test.ts')) continue;
    await copy(`${base}/${relative}`, `src/shared/${name}/${relative}`);
  }
  await copy(`${base}/package.json`, `src/shared/${name}/package.json`);
}
for (const name of ['package.json', 'tsconfig.json', 'build.mjs']) {
  await copy(`artifacts/api-server/${name}`, name);
}
await copy('.gitignore', '.gitignore');
await writeFile(path.join(output, '.env.example'), `# Names only: no real secret values are copied.
PORT=
RUNPOD_LLM_BASE_URL=
RUNPOD_LLM_API_KEY=
RUNPOD_LLM_MODEL=
`);
await writeFile(path.join(output, '.replit'), '# Reserved for future submission run configuration. Live configuration is unchanged.\n');
await writeFile(path.join(output, 'LICENSE'), '');
await writeFile(path.join(output, 'requirements.txt'), '# Reserved for future Python dependencies. Current backend uses package.json (TypeScript/Node.js).\n');

// Verify both the copied files and originals after the complete export.
for (const entry of entries) {
  if (hash(await readFile(path.join(root, entry.original))) !== entry.sha256
    || hash(await readFile(path.join(output, entry.submission))) !== entry.sha256) {
    throw new Error(`Source changed or copy differs: ${entry.original}`);
  }
}
await writeFile(`${output}-file-map.json`, `${JSON.stringify(entries, null, 2)}\n`);
await writeFile(`${output}-verification.json`, `${JSON.stringify({
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
- \`runpod/\`: original RunPod client (runpod.ts) and prompt definitions (llmPrompts.ts).
- \`src/\`: server entry points, routes, services, other helpers, and datasets.
- \`src/shared/\`: original source and package manifests for local backend dependencies.
- \`docs/\`, \`tests/\`, \`submission/\`: intentionally empty folders reserved for future use.
- \`.env.example\`: blank configuration names only, never actual secret values.
- \`.gitignore\`: unchanged copy of the workspace ignore rules.
- \`.replit\`: placeholder, not the live run configuration.
- \`LICENSE\`: empty placeholder; no license is selected or granted by this copy.
- \`requirements.txt\`: reserved for future Python dependencies; current dependencies are in package.json.
- \`README.md\`: this folder guide.

The file map and SHA-256 verification report are saved beside this folder as
\`backend-submission-file-map.json\` and \`backend-submission-verification.json\`.

## Important
Imports, package scripts, build paths, and configuration are intentionally unchanged.
Moving files between categories means the copies do not resolve the original relative imports by themselves.
Use the original workspace to run the service or tests:

\`\`\`sh
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run test
\`\`\`

The original package.json, tsconfig.json and build.mjs are included for TypeScript reference.
No Python dependencies or license text were invented.
No real .env files, secret values, frontend, tests, existing documentation, node_modules or compiled builds were copied.
The live .replit configuration was not moved or replaced.

Regenerate from the original workspace with:
\`node scripts/prepare-backend-submission.mjs\`

Generated output is ignored by Git and deployment rules; the preparation script is retained for reproducibility.
Regenerating replaces this generated folder. Keep any future handwritten content elsewhere before regenerating.
`);
console.log(`Created ${path.relative(root, output)}: ${entries.length} copied files, all byte-identical.`);
