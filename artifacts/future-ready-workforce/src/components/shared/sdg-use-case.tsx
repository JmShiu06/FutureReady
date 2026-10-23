import { roleSdgUseCases, SDG_USE_CASE_REVIEWED } from '@workspace/workforce-evidence';
import { useI18n } from '@/i18n/i18n-context';

export function SdgUseCase({ roleId, skill }: { roleId: string; skill?: string }) {
  const { t } = useI18n();
  const item = roleSdgUseCases[roleId];
  if (!item) return <p className="muted small">{t('sdg.noUseCase')}</p>;
  return <details className="card-more" data-testid={`sdg-use-case-${roleId}${skill ? `-${skill}` : ''}`}>
    <summary>{t(skill ? 'sdg.skillUse' : 'sdg.roleUse', { target: item.target })}</summary>
    <p className="small muted">{t('detail.sourceLanguage')}</p>
    <p className="small">{skill ? t('sdg.practise', { skill, context: item.context }) : t('sdg.application', { context: item.context })} {t('sdg.exampleNote')}</p>
    <p className="small"><b>{t('sdg.documentedDuty')}:</b> {item.duty}</p>
    <p className="small muted">{item.limitation} {t('sdg.noGuarantee')}</p>
    <p className="small"><a className="text-link" href={`https://sdgs.un.org/goals/goal${item.goal}#targets_and_indicators`} target="_blank" rel="noreferrer" data-testid={`link-usecase-un-${roleId}-${skill ?? 'role'}`}>{t('sdg.unTarget', { n: item.target })}</a>
      {' · '}<a className="text-link" href={`https://www.onetonline.org/link/summary/${item.onetCode}#Tasks`} target="_blank" rel="noreferrer" data-testid={`link-usecase-duty-${roleId}-${skill ?? 'role'}`}>{t('sdg.onetDuties')}</a>
      {' · '}{t('learn.reviewed', { date: SDG_USE_CASE_REVIEWED })}. {t('sdg.datesNote')}</p>
  </details>;
}
