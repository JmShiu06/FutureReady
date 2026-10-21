import { useState } from 'react';
import { CareerMatcher } from '@/components/career-matcher';
import { useWorkspace } from '@/domain/workspace-context';
import { PageHead } from '@/components/workspace/ui';

export default function DatasetMatchingPage() {
  const { profile } = useWorkspace();
  const [confirmed, setConfirmed] = useState<string[]>([]);
  return <>
    <PageHead eyebrow="Dataset matching · manual entry" title="Match skills against the career dataset." subtitle="CV upload is disabled here. Confirmed skills are used for this matching only and do not change your profile." />
    <div className="panel panel-pad">
      <CareerMatcher cvEnabled={false} savedSkills={profile.skills.map(s => s.name)} onConfirmSkills={setConfirmed} />
      {confirmed.length > 0 && <p className="muted small" data-testid="text-confirmed-count">{confirmed.length} skills confirmed for this session.</p>}
    </div>
  </>;
}
