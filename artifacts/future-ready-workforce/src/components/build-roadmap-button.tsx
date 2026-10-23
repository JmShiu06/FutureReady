import { useLocation } from 'wouter';
import { Workflow } from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { planKey } from '@/domain/learning';
import type { OfficialRoadmapOccupation } from '@/domain/types';
import { useI18n } from '@/i18n/i18n-context';

/** The only control that makes a role the learning-roadmap target. Exploring a role never calls it. */
export function BuildRoadmapButton({ roleId, testId, size = 'btn-small', occupation }: { roleId: string; testId: string; size?: string; occupation?: OfficialRoadmapOccupation }) {
  const { state, startRoadmap } = useWorkspace();
  const [, navigate] = useLocation();
  const built = !!state.baselines[planKey(state.audience, roleId)];
  const isTarget = state.targets[state.audience] === roleId && built;
  const { t } = useI18n();
  const go = () => { if (!isTarget) startRoadmap(roleId, occupation); navigate('/learning-roadmap'); };
  return <button className={`btn ${isTarget ? 'btn-secondary' : 'btn-primary'} ${size}`} onClick={go} data-testid={testId}>
    <Workflow size={12} /> {isTarget ? t('cp.openRoadmap') : built ? t('cp.resumeRoadmap') : t('cp.buildRoadmap')}</button>;
}
