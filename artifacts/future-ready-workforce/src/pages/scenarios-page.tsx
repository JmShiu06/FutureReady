import { useState } from 'react';
import { Info } from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { demoRoles, scenarios } from '@/domain/demo-data';
import { PageHead, SectionTitle } from '@/components/workspace/ui';

export default function ScenariosPage() {
  const { profile, targetRoleId } = useWorkspace();
  const [roleId, setRoleId] = useState(targetRoleId);
  const has = (s: string) => profile.skills.find(p => p.name.toLowerCase() === s.toLowerCase());
  const allSkills = Array.from(new Set(scenarios.flatMap(s => s.prioritySkills)));
  return <>
    <PageHead eyebrow="AI adoption scenarios · workshop assumptions" title="Two futures, side by side." subtitle="No forecasts, probabilities or charts of the future. Just stated assumptions to discuss." />
    <div className="panel panel-pad" style={{ marginBottom: 18 }}>
      <div className="field" style={{ maxWidth: 360 }}><label htmlFor="sc-role">Role for impact notes</label><select id="sc-role" className="fr-select" value={roleId} onChange={e => setRoleId(e.target.value)} data-testid="select-scenario-role">{demoRoles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</select></div>
    </div>
    <div className="side-by-side" style={{ marginBottom: 18 }}>{scenarios.map(s => <div key={s.id} className="panel panel-pad" data-testid={`card-scenario-${s.id}`}>
      <SectionTitle title={s.label} note="SCENARIO" />
      <h3 style={{ marginBottom: 6 }}>Assumptions</h3><ul className="muted">{s.assumptions.map(a => <li key={a}>{a}</li>)}</ul>
      <h3 style={{ marginBottom: 6 }}>Role impact</h3><p className="muted" data-testid={`text-impact-${s.id}`}>{s.roleImpacts.find(r => r.roleId === roleId)?.explanation ?? 'No impact note for this role.'}</p>
      <h3 style={{ marginBottom: 6 }}>Priority skills</h3><div className="row" style={{ marginBottom: 12 }}>{s.prioritySkills.map(k => <span key={k} className="chip">{k}</span>)}</div>
      <div className="evidence"><dl><dt>Provenance</dt><dd>{s.provenance}</dd><dt>Uncertainty</dt><dd>{s.uncertainty}</dd><dt>Observed evidence</dt><dd data-testid={`text-observed-${s.id}`}>{s.observedEvidence ? s.observedEvidence.sourceName : 'None — no observed evidence supports this scenario'}</dd></dl></div>
    </div>)}</div>
    <div className="panel panel-pad">
      <SectionTitle title="Skill priority comparison" note="AGAINST YOUR ACTIVE PROFILE" />
      <div className="table-wrap"><table><thead><tr><th>Skill</th>{scenarios.map(s => <th key={s.id}>{s.label}</th>)}<th>Your level</th></tr></thead>
        <tbody>{allSkills.map(k => <tr key={k}><td>{k}</td>{scenarios.map(s => { const i = s.prioritySkills.indexOf(k); return <td key={s.id}>{i >= 0 ? `Priority #${i + 1}` : '—'}</td>; })}<td className="mono">{has(k)?.level ?? 'Not in profile'}</td></tr>)}</tbody></table></div>
      <div className="disclaimer"><Info size={14} /><span>Priority order is hand-authored. It does not measure demand or job loss.</span></div>
    </div>
  </>;
}
