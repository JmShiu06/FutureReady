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
const profileInputs = {
  occupation: '[data-testid="input-occupation"]',
  experience: '[data-testid="input-experience"]',
  education: '[data-testid="input-education"]',
  interests: '[data-testid="input-interests"]',
  location: '[data-testid="input-location"]',
  workPreference: '[data-testid="select-work-preference"]',
  learningHours: '[data-testid="input-learning-hours"]',
  budget: '[data-testid="input-budget"]',
  goals: '[data-testid="input-goals"]',
};

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
      const response = await fetch(baseUrl);
      if (response.ok) {
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

async function startProfilePage(response) {
  const page = await browser.newPage();
  await page.route('**/api/career/cv-skills', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(response),
  }));
  await page.goto(`${baseUrl}/profile`);
  await page.getByTestId('input-occupation').waitFor();
  await page.getByTestId('input-profile-cv').setInputFiles({
    name: 'synthetic-profile-test.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Synthetic CV fixture used only by this browser test.'),
  });
  await page.getByTestId('dialog-cv-review').waitFor({ state: 'visible' });
  return page;
}

async function readAboutYou(page) {
  return Object.fromEntries(await Promise.all(
    Object.entries(profileInputs).map(async ([key, selector]) => [
      key,
      await page.locator(selector).inputValue(),
    ]),
  ));
}

async function setSkillLevel(page, index, value) {
  const range = page.getByTestId(`cv-skill-level-${index}-range`);
  await range.focus();
  const initial = Number(await range.inputValue());
  const direction = value > initial ? 'ArrowRight' : 'ArrowLeft';
  for (let current = initial; current !== value; current += value > initial ? 1 : -1) {
    await range.press(direction);
  }
  assert.equal(await range.inputValue(), String(value));
}

async function setProfileSkillLevel(page, index, value) {
  const range = page.getByTestId(`select-skill-level-${index}-range`);
  await range.focus();
  const initial = Number(await range.inputValue());
  const direction = value > initial ? 'ArrowRight' : 'ArrowLeft';
  for (let current = initial; current !== value; current += value > initial ? 1 : -1) {
    await range.press(direction);
  }
  assert.equal(await range.inputValue(), String(value));
}

async function saveAndWaitForStorage(page, expectedOccupation) {
  await page.getByTestId('button-save-profile').click();
  await page.waitForFunction(
    ({ occupation }) => {
      const raw = localStorage.getItem('frw-demo-workspace-v1');
      if (!raw) return false;
      try {
        return JSON.parse(raw).profiles.adult.occupation === occupation;
      } catch {
        return false;
      }
    },
    { occupation: expectedOccupation },
  );
}

test('applies only checked CV profile fields and saves/reloads them with confirmed skills', async () => {
  const page = await startProfilePage({
    skills: ['Python'],
    profileSuggestions: {
      occupation: 'CV role selected',
      experienceYears: 7,
      education: 'CV education unchecked',
    },
    warnings: [],
  });
  try {
    const before = await readAboutYou(page);
    const newSkillIndex = await page.locator('[data-testid^="row-skill-"]').count();
    await page.getByRole('checkbox', { name: 'Apply Education from CV' }).uncheck();
    await setSkillLevel(page, 0, 4);
    await page.getByTestId('button-apply-cv-skills').click();

    assert.equal(await page.locator(profileInputs.occupation).inputValue(), 'CV role selected');
    assert.equal(await page.locator(profileInputs.experience).inputValue(), '7');
    const afterApply = await readAboutYou(page);
    assert.equal(afterApply.education, before.education, 'Unchecked education must stay unchanged.');
    for (const key of ['interests', 'location', 'workPreference', 'learningHours', 'budget', 'goals']) {
      assert.equal(afterApply[key], before[key], `${key} must stay unchanged when it was not selected.`);
    }
    assert.equal(await page.getByTestId(`input-skill-name-${newSkillIndex}`).inputValue(), 'Python');
    assert.equal(await page.getByTestId(`select-skill-level-${newSkillIndex}-range`).inputValue(), '4');

    await saveAndWaitForStorage(page, 'CV role selected');
    await page.reload();
    await page.getByTestId('input-occupation').waitFor();
    assert.equal(await page.locator(profileInputs.occupation).inputValue(), 'CV role selected');
    assert.equal(await page.locator(profileInputs.experience).inputValue(), '7');
    assert.equal(await page.locator(profileInputs.education).inputValue(), before.education);
    assert.equal(await page.getByTestId(`input-skill-name-${newSkillIndex}`).inputValue(), 'Python');
    assert.equal(await page.getByTestId(`select-skill-level-${newSkillIndex}-range`).inputValue(), '4');
  } finally {
    await page.close();
  }
});

test('Fill About You only leaves the selected skill available for later review', async () => {
  const page = await startProfilePage({
    skills: ['Excel'],
    profileSuggestions: { occupation: 'About-only role', education: 'About-only education' },
    warnings: [],
  });
  try {
    await page.getByTestId('button-apply-cv-profile-only').click();
    await page.getByTestId('dialog-cv-review').waitFor({ state: 'hidden' });
    assert.equal(await page.locator(profileInputs.occupation).inputValue(), 'About-only role');
    assert.equal(await page.locator(profileInputs.education).inputValue(), 'About-only education');
    await page.getByTestId('button-open-cv-review').click();
    await page.getByTestId('dialog-cv-review').waitFor({ state: 'visible' });
    const pendingSkill = page.getByRole('checkbox', { name: 'Add Excel to profile' });
    assert.equal(await pendingSkill.isChecked(), true);
    assert.equal(await page.getByTestId('cv-skill-level-0').innerText(), 'Slide to choose level');
    assert.equal(await page.getByTestId('button-apply-cv-skills').isDisabled(), true);
  } finally {
    await page.close();
  }
});

test('a CV with no profile suggestions can add a skill without changing About You and survives reload', async () => {
  const page = await startProfilePage({
    skills: ['Python'],
    profileSuggestions: {},
    warnings: [],
  });
  try {
    const before = await readAboutYou(page);
    const newSkillIndex = await page.locator('[data-testid^="row-skill-"]').count();
    assert.match(await page.getByTestId('dialog-cv-review').innerText(), /No clearly labelled About You details were found/);
    await setProfileSkillLevel(page, 0, 3);
    await page.getByTestId('button-apply-cv-skills').click();
    const afterApply = await readAboutYou(page);
    assert.deepEqual(afterApply, before);
    assert.equal(await page.getByTestId(`input-skill-name-${newSkillIndex}`).inputValue(), 'Python');

    await saveAndWaitForStorage(page, before.occupation);
    await page.reload();
    await page.getByTestId('input-occupation').waitFor();
    assert.deepEqual(await readAboutYou(page), before);
    assert.equal(await page.getByTestId(`input-skill-name-${newSkillIndex}`).inputValue(), 'Python');
    assert.equal(await page.getByTestId(`select-skill-level-${newSkillIndex}-range`).inputValue(), '3');
  } finally {
    await page.close();
  }
});
