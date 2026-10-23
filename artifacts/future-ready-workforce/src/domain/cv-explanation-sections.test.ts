import { it } from 'node:test';
import assert from 'node:assert/strict';
import { cvExplanationSectionInView } from './cv-explanation-sections';

it('shares existing next-step guidance with skill analysis without dropping learning sections', () => {
  const sections = ['skillAnalysis', 'careerMatchAnalysis', 'skillGapAnalysis', 'improvementSuggestions', 'strengths', 'areasForGrowth'];
  const learning = sections.filter(key => cvExplanationSectionInView(key, 'learning'));
  const career = sections.filter(key => cvExplanationSectionInView(key, 'career'));
  assert.deepEqual(learning, ['improvementSuggestions', 'areasForGrowth']);
  assert.deepEqual(career, ['skillAnalysis', 'careerMatchAnalysis', 'skillGapAnalysis', 'improvementSuggestions', 'strengths']);
  assert.equal(cvExplanationSectionInView('candidateSummary', 'career'), false);
  assert.equal(cvExplanationSectionInView('candidateSummary', 'learning'), false);
  assert.equal(new Set([...learning, ...career]).size, sections.length);
  assert.deepEqual(learning.filter(key => career.includes(key)), ['improvementSuggestions']);
});
