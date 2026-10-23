import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SkillAnalysisProvider, savedSkillNames, useSkillAnalysis } from './skill-analysis-session';
import { WorkspaceContext, type WorkspaceContextValue } from './workspace-store';

it('uses saved names from manual and imported skills without ratings or document metadata', () => {
  const skills = [
    { name: ' Python ', level: 5, category: 'Technical' },
    { name: 'SQL', level: 2, cvDetected: true },
    { name: 'python', level: 1 },
  ];
  assert.deepEqual(savedSkillNames(skills), ['python', 'sql']);
  assert.deepEqual(savedSkillNames([]), []);
});

it('renders saved skills without a CV provider and requires fresh explicit consent', () => {
  let observed: ReturnType<typeof useSkillAnalysis> | undefined;
  function Probe() { observed = useSkillAnalysis(); return null; }
  const workspace = {
    profile: { id: 'fictional-test', skills: [{ name: 'Python', level: 2 }, { name: 'SQL', level: 3 }] },
    state: { audience: 'adult' },
  } as WorkspaceContextValue;
  renderToStaticMarkup(createElement(WorkspaceContext.Provider, { value: workspace },
    createElement(SkillAnalysisProvider, null, createElement(Probe))));
  assert.ok(observed);
  assert.deepEqual(observed.names, ['python', 'sql']);
  assert.deepEqual(observed.selected, ['python', 'sql']);
  assert.equal(observed.consent, false);
  assert.equal(observed.explanation, null);
  assert.equal(observed.explainPhase, 'idle');
});
