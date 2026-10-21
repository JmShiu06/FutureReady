import { useLocation } from 'wouter';
import { Workflow } from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { planKey } from '@/domain/learning';

/** The only control that makes a role the learning-roadmap target. Exploring a role never calls it. */
export function BuildRoadmapButton({ roleId, testId, size = 'btn-small' }: { roleId: string; testId: string; size?: string }) {
  const { state, startRoadmap } = useWorkspace();
  const [, navigate] = useLocation();
  const built = !!state.baselines[planKey(state.audience, roleId)];
  const isTarget = state.targets[state.audience] === roleId && built;
  const go = () => { if (!isTarget) startRoadmap(roleId); navigate('/profile?section=roadmap'); };
  return <button className={`btn ${isTarget ? 'btn-secondary' : 'btn-primary'} ${size}`} onClick={go} data-testid={testId}>
    <Workflow size={12} /> {isTarget ? 'Open my roadmap' : built ? 'Resume my learning roadmap' : 'Build my learning roadmap'}</button>;
}
