import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetAiResearchQueryKey, useGetAiResearch, useRefreshAiResearch } from '@workspace/api-client-react';
/** Shared query keeps the source identical across roles, roadmap and progress. */
export function useAiResearch() {
  const query = useGetAiResearch({ query: { queryKey: getGetAiResearchQueryKey(), refetchInterval: q => q.state.data?.refreshing ? 3500 : false, staleTime: 60000 } });
  const mutation = useRefreshAiResearch();
  const client = useQueryClient();
  const readDemo = () => { try { return window.localStorage.getItem('frw-ai-research-mode') === 'demo'; } catch { return false; } };
  const [demo, updateDemo] = useState(readDemo);
  useEffect(() => {
    const update = () => updateDemo(readDemo());
    window.addEventListener('frw-ai-research-mode', update); window.addEventListener('storage', update);
    return () => { window.removeEventListener('frw-ai-research-mode', update); window.removeEventListener('storage', update); };
  }, []);
  const setDemo = (next: boolean) => {
    updateDemo(next);
    try { window.localStorage.setItem('frw-ai-research-mode', next ? 'demo' : 'real'); window.dispatchEvent(new Event('frw-ai-research-mode')); }
    catch { /* The selected demo applies to this mounted view only; never replaces fetched counts. */ }
  };
  return {
    ...query, demo, setDemo,
    weights: demo ? { Programming: -10, 'Systems Evaluation': 10, 'Critical Thinking': 10, Monitoring: 10 } : query.data?.snapshot?.weights ?? {},
    refresh: () => mutation.mutate(undefined, { onSuccess: data => client.setQueryData(getGetAiResearchQueryKey(), data) }),
    busy: mutation.isPending || !!query.data?.refreshing,
    refreshError: mutation.isError,
  };
}
