import { useEffect, useMemo, useState } from 'react';
import { Info, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { audienceLabels, demoRoles } from '@/domain/demo-data';
import { audiences } from '@/domain/storage';
import { methodology, simulateProfile } from '@/domain/services';
import type { Audience, CareerAssessment, ProfileSkill, Proficiency } from '@/domain/types';
import { Bar, GapStatus, PageHead, SectionTitle, levelLabel, slug } from '@/components/workspace/ui';

function Column({ title, a }: { title: string; a: CareerAssessment }) {
  return <div className="role-card" data-testid={`card-twin-${slug(title)}`}><strong>{title}</strong><div className="big-num">{a.readiness}%</div><Bar value={a.readiness} label={`${title} ${a.readiness}%`} />
    <div className="stack">{[...a.present, ...a.missing].map(g => <div key={g.name} className="spread small"><span>{g.name}</span><GapStatus gap={g} /></div>)}</div>
    <span className="small">{a.gaps.length} gap{a.gaps.length === 1 ? '' : 's'} remaining</span></div>;
}

export default function TwinPage() {
  const { state } = useWorkspace();
  const [source, setSource] = useState<Audience>(state.audience);
  const [roleId, setRoleId] = useState(state.targets[state.audience]);
  const base = state.profiles[source];
  const [hypo, setHypo] = useState<ProfileSkill[]>(base.skills);
  useEffect(() => { setHypo(state.profiles[source].skills); setRoleId(state.targets[source]); }, [source]); // eslint-disable-line react-hooks/exhaustive-deps
  const role = demoRoles.find(r => r.id === roleId) ?? demoRoles[0];
  const sim = useMemo(() => simulateProfile(base, hypo, role.id), [base, hypo, role.id]);
  const missing = role.requiredSkills.filter(r => !hypo.some(h => h.name.toLowerCase() === r.name.toLowerCase()));
  const setLevel = (name: string, level: number) => setHypo(h => h.map(s => s.name === name ? { ...s, level: level as Proficiency } : s));
  return <>
    <PageHead eyebrow="Digital twin · what-if only" title="Try a future version of your skills." subtitle="Changes here are hypothetical and are never saved to your profile."
      action={<button className="btn btn-secondary" onClick={() => setHypo(base.skills)} data-testid="button-reset-simulation"><RotateCcw size={14} /> Reset simulation</button>} />
    <div className="panel panel-pad" style={{ marginBottom: 18 }}>
      <div className="form-grid">
        <div className="field"><label htmlFor="twin-source">Profile to simulate</label><select id="twin-source" className="fr-select" value={source} onChange={e => setSource(e.target.value as Audience)} data-testid="select-twin-profile">{audiences.map(a => <option key={a} value={a}>{audienceLabels[a]} — {state.profiles[a].occupation}</option>)}</select></div>
        <div className="field"><label htmlFor="twin-role">Target role</label><select id="twin-role" className="fr-select" value={role.id} onChange={e => setRoleId(e.target.value)} data-testid="select-twin-role">{demoRoles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</select></div>
      </div>
    </div>
    <div className="dashboard-grid">
      <div className="panel panel-pad">
        <SectionTitle title="Hypothetical skills" note="EDIT FREELY" />
        {hypo.map(s => <div key={s.name} className="skill-edit twin-skill-edit">
          <span className="small"><b>{s.name}</b></span>
          <select className="fr-select" value={s.level} onChange={e => setLevel(s.name, Number(e.target.value))} aria-label={`Hypothetical level for ${s.name}`} data-testid={`select-hypo-${slug(s.name)}`}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} · {levelLabel(n)}</option>)}</select>
          <button className="icon-button" onClick={() => setHypo(h => h.filter(x => x.name !== s.name))} aria-label={`Remove ${s.name} from simulation`} data-testid={`button-hypo-remove-${slug(s.name)}`}><Trash2 size={13} /></button>
        </div>)}
        {missing.length > 0 && <div className="row" style={{ marginTop: 12 }}><span className="small">Add missing:</span>{missing.map(m => <button key={m.name} className="btn btn-secondary btn-small" onClick={() => setHypo(h => [...h, { name: m.name, level: m.level, category: 'Hypothetical' }])} data-testid={`button-hypo-add-${slug(m.name)}`}><Plus size={11} /> {m.name}</button>)}</div>}
      </div>
      <div className="panel panel-pad">
        <SectionTitle title="Change" note="AFTER MINUS BEFORE" />
        <div className="big-num" data-testid="text-readiness-change"><span className={sim.readinessChange > 0 ? 'delta-up' : ''}>{sim.readinessChange > 0 ? '+' : ''}{sim.readinessChange}</span> pts</div>
        <p className="muted">Gaps: {sim.before.gaps.length} before, {sim.after.gaps.length} after.</p>
        <div className="disclaimer"><Info size={14} /><span>{methodology} Illustrative only.</span></div>
      </div>
    </div>
    <div className="side-by-side"><Column title="Before" a={sim.before} /><Column title="After" a={sim.after} /></div>
  </>;
}
