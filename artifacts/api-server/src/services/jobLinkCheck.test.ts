import { it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyJobPage } from './jobLinkCheck';

it('distinguishes a real results page with captcha scripts from blocks, empty HTML and broken URLs', () => {
  assert.equal(classifyJobPage('LinkedIn', 200, '<ul class="jobs-search__results-list"></ul><script src="recaptcha.js"></script>'), 'PASS');
  assert.equal(classifyJobPage('LinkedIn', 200, '<title>Security verification</title>'), 'BLOCKED / UNVERIFIED');
  assert.equal(classifyJobPage('LinkedIn', 429, '<ul class="jobs-search__results-list"></ul>'), 'BLOCKED / UNVERIFIED');
  assert.equal(classifyJobPage('LinkedIn', 404, 'Not found'), 'BROKEN');
  assert.equal(classifyJobPage('LinkedIn', 200, '<div>Sign in</div>'), 'UNVERIFIED CONTENT');
  assert.equal(classifyJobPage('JobStreet Malaysia', 200, '<h1>Search jobs in Malaysia</h1>'), 'PASS');
});
