import { roleSdgUseCases, SDG_USE_CASE_REVIEWED } from '@workspace/workforce-evidence';

export function SdgUseCase({ roleId, skill }: { roleId: string; skill?: string }) {
  const item = roleSdgUseCases[roleId];
  if (!item) return <p className="muted small">No reviewed SDG use case is available; no impact is inferred.</p>;
  return <details className="card-more" data-testid={`sdg-use-case-${roleId}${skill ? `-${skill}` : ''}`}>
    <summary>SDG {item.target} · conditional {skill ? 'skill application' : 'role use case'}</summary>
    <p className="small">{skill ? `Practise ${skill} in ` : 'Possible application: '}{item.context}. This is an app-authored example, not evidence that this role, skill or course achieves the target.</p>
    <p className="small"><b>Documented duty:</b> {item.duty}</p>
    <p className="small muted">{item.limitation} No guaranteed contribution, measured impact or official UN/MyCOL classification.</p>
    <p className="small"><a className="text-link" href={`https://sdgs.un.org/goals/goal${item.goal}#targets_and_indicators`} target="_blank" rel="noreferrer" data-testid={`link-usecase-un-${roleId}-${skill ?? 'role'}`}>UN target {item.target}</a>
      {' · '}<a className="text-link" href={`https://www.onetonline.org/link/summary/${item.onetCode}#Tasks`} target="_blank" rel="noreferrer" data-testid={`link-usecase-duty-${roleId}-${skill ?? 'role'}`}>O*NET duties</a>
      {' · '}Reviewed {SDG_USE_CASE_REVIEWED}. UN targets adopted 2015-09-25; live duty-page publication date not stated.</p>
  </details>;
}
