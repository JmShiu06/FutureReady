import test from 'node:test';
import assert from 'node:assert/strict';
import { matchOccupations } from '../../../api-server/src/lib/occupationEvidence';
import { courseCatalog } from './resource-catalog';
import { pathwaySamples, sampleStartingSkills } from './pathway-samples';
test('every sample/eligible role has at most three unresourced gaps; technical courses do not leak into HR or nursing', () => {
  const roles = matchOccupations([]).occupations.filter(r => r.recommendationStatus === 'eligible');
  assert.ok(new Set(courseCatalog.map(r => r.provider)).size >= 3);
  for (const role of roles) {
    const catalog = courseCatalog.filter(r => !r.applicableRoleIds || r.applicableRoleIds.includes(role.id));
    const covered = new Set(catalog.flatMap(r => r.skills));
    for (const sample of pathwaySamples) {
      const starting = new Set(sampleStartingSkills(sample.id).map(s => s.name));
      const missing = role.documentedSkills.filter(s => !starting.has(s.name) && !covered.has(s.name));
      assert.ok(missing.length <= 3, `${sample.label} → ${role.mycol.title}: ${missing.map(s => s.name).join(', ')}`);
    }
    if (['mycol-1212', 'mycol-2221'].includes(role.id)) assert.ok(!catalog.some(r => r.id === 'saylor-cs302'));
  }
});
