import { it } from 'node:test';
import assert from 'node:assert/strict';
import { cvExplanationSectionInView } from './cv-explanation-sections';

it('moves the two learning cards out of career explanations without duplicating or dropping sections', () => {
  const sections = ['skillAnalysis', 'careerMatchAnalysis', 'skillGapAnalysis', 'improvementSuggestions', 'strengths', 'areasForGrowth'];
  const learning = sections.filter(key => cvExplanationSectionInView(key, 'learning'));
  const career = sections.filter(key => cvExplanationSectionInView(key, 'career'));
  assert.deepEqual(learning, ['improvementSuggestions', 'areasForGrowth']);
  assert.deepEqual(career, ['skillAnalysis', 'careerMatchAnalysis', 'skillGapAnalysis', 'strengths']);
  assert.equal(cvExplanationSectionInView('candidateSummary', 'career'), false);
  assert.equal(cvExplanationSectionInView('candidateSummary', 'learning'), false);
  assert.equal(new Set([...learning, ...career]).size, sections.length);
  assert.ok(learning.every(key => !career.includes(key)));
});
