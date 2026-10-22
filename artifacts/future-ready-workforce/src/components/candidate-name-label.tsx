import { useCvSession } from '@/domain/cv-session';

export function CandidateNameLabel({ testId }: { testId: string }) {
  const { phase, candidateName } = useCvSession();
  if (phase !== 'ready') return null;

  return (
    <p className="candidate-name-context" data-testid={testId}>
      <span>Candidate:</span> <strong>{candidateName || 'Unknown'}</strong>
    </p>
  );
}
