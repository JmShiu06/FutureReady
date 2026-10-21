import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { after, before, test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.CV_PROFILE_TEST_PORT || 4179);
const baseUrl = `http://127.0.0.1:${port}`;
const browserPath = process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium';
let devServer;
let browser;

before(async () => {
  assert.ok(existsSync(browserPath), `Chromium executable not found at ${browserPath}. Set CHROMIUM_PATH to its location.`);
  devServer = spawn(process.execPath, [
    'node_modules/vite/bin/vite.js',
    '--config', 'vite.config.ts',
    '--host', '127.0.0.1',
    '--strictPort',
  ], {
    cwd: appDir,
    env: { ...process.env, PORT: String(port), BASE_PATH: '/' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverOutput = '';
  devServer.stdout.on('data', chunk => { serverOutput += chunk; });
  devServer.stderr.on('data', chunk => { serverOutput += chunk; });

  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (devServer.exitCode !== null) break;
    try {
      if ((await fetch(baseUrl)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(200);
  }
  assert.ok(ready, `Vite did not start at ${baseUrl}.\n${serverOutput}`);
  browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
});

after(async () => {
  await browser?.close();
  if (devServer && devServer.exitCode === null) {
    devServer.kill('SIGTERM');
    await Promise.race([
      new Promise(resolve => devServer.once('exit', resolve)),
      delay(5000),
    ]);
    if (devServer.exitCode === null) devServer.kill('SIGKILL');
  }
});

test('CV review adds skills only and leaves About You details untouched', async () => {
  const page = await browser.newPage();
  const skillName = 'CV-reviewed skill';
  await page.route('**/api/career/cv-skills', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      skills: [skillName],
      warnings: [],
      profileSuggestions: { occupation: 'Must not be displayed or applied', education: 'Private field' },
    }),
  }));

  try {
    await page.goto(`${baseUrl}/profile`);
    await page.getByTestId('button-save-profile').waitFor();
    const skillRowIndex = await page.locator('[data-testid^="row-skill-"]').count();
    assert.equal(await page.getByTestId('input-occupation').count(), 0);

    await page.getByTestId('input-profile-cv').setInputFiles({
      name: 'synthetic-profile-test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Synthetic CV fixture used only by this browser test.'),
    });
    const review = page.getByTestId('dialog-cv-review');
    await review.waitFor({ state: 'visible' });
    await review.getByText(skillName).waitFor();
    assert.doesNotMatch(await review.innerText(), /About You|Must not be displayed|Private field/i);

    const level = page.getByTestId('cv-skill-level-0-range');
    await level.focus();
    await level.press('Home');
    await page.getByTestId('button-apply-cv-skills').click();
    await page.getByTestId('button-save-profile').click();
    await page.waitForFunction(name => {
      const raw = localStorage.getItem('frw-demo-workspace-v1');
      if (!raw) return false;
      const workspace = JSON.parse(raw);
      return workspace.profiles?.adult?.skills?.some(skill => skill.name === name && skill.cvDetected);
    }, skillName);

    const profile = await page.evaluate(() => {
      const workspace = JSON.parse(localStorage.getItem('frw-demo-workspace-v1'));
      return workspace.profiles.adult;
    });
    assert.equal(profile.occupation, '');
    assert.equal(profile.education, '');
    assert.deepEqual(profile.skills.find(skill => skill.name === skillName), {
      name: skillName,
      level: 1,
      category: 'CV detected',
      cvDetected: true,
    });

    await page.reload();
    assert.equal(await page.getByTestId('input-occupation').count(), 0);
    assert.equal(await page.getByTestId(`input-skill-name-${skillRowIndex}`).inputValue(), skillName);
  } finally {
    await page.close();
  }
});
