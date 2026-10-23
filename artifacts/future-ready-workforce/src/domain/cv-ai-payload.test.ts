import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCvAiPayload } from './cv-ai-payload';

test('skill analysis shares CV skills only, even when languages were detected', () => {
  assert.deepEqual(buildCvAiPayload({
    skills: [{ text: 'Python', include: true }, { text: 'SQL', include: false }],
    languages: [{ text: 'English', include: true }],
    extractionLimited: false,
  }), { skills: ['python'], languages: [], extractionLimited: false });
});
test('CV skill analysis works without languages and does not substitute languages for skills', () => {
  assert.deepEqual(buildCvAiPayload({ skills: [{ text: 'SQL', include: true }], languages: [], extractionLimited: true }).skills, ['sql']);
  assert.deepEqual(buildCvAiPayload({ skills: [], languages: [{ text: 'English', include: true }], extractionLimited: false }).skills, []);
});
