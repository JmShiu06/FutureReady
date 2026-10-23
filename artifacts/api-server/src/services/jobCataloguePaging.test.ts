import { it } from 'node:test';
import assert from 'node:assert/strict';
import { DemoJobProvider } from './job_provider';
import { sampleJobs } from '../data/sampleJobs';

const catalogue = Array.from({ length: 105 }, (_, index) => ({
  ...sampleJobs[0], id: `fictional-${String(index).padStart(3, '0')}`,
  datePosted: '2026-01-01', requiredSkills: index === 104 ? ['Critical Thinking'] : ['Critical Thinking', 'Reading Comprehension'],
}));

it('provider traverses >50 fictional listings with deterministic ties and unchanged exact-normalized scores', async () => {
  // Reverse input to ensure ties do not just inherit array insertion order.
  const provider = new DemoJobProvider([...catalogue].reverse());
  for (const sort of ['recent', 'relevance'] as const) {
    const seen: string[] = [];
    for (let page = 1; page <= 3; page++) {
      const result = await provider.listJobs({ page, limit: 50, sort, q: 'Critical Thinking' });
      assert.equal(result.total, 105);
      assert.equal(result.totalPages, 3);
      seen.push(...result.jobs.map(job => job.id));
    }
    assert.deepEqual(seen, catalogue.map(job => job.id));
    assert.equal(new Set(seen).size, 105);
  }
  const scores = [];
  for (let start = 0; start < catalogue.length; start += 50) {
    scores.push(...await provider.matchJobs(['  ＣＲＩＴＩＣＡＬ   THINKING  '], catalogue.slice(start, start + 50).map(job => job.id)));
  }
  assert.equal(scores.length, 105);
  assert.equal(scores.find(score => score.jobId === 'fictional-000')!.score, 50);
  assert.equal(scores.find(score => score.jobId === 'fictional-104')!.score, 100);
});
