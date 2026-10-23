import { useGetAiInfo, getGetAiInfoQueryKey } from '@workspace/api-client-react';

/** Shared, cached read of public model metadata. Read-only: never triggers generation or touches consent/outputs. */
export function useAiInfo() {
  return useGetAiInfo({ query: { queryKey: getGetAiInfoQueryKey(), staleTime: 60_000, retry: 1, refetchOnWindowFocus: false } });
}
