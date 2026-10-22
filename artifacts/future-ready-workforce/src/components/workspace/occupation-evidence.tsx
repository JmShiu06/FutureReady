import { useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, ArrowRight, BookOpen, Info, ShieldCheck, UserRound, Workflow } from 'lucide-react';
import { useMatchOccupationEvidence } from '@workspace/api-client-react';
import type { OccupationEvidence, OccupationEvidenceResult } from '@workspace/api-client-react';
import { useWorkspace } from '@/domain/workspace-context';
import { EmptyBlock, ErrorBlock, LoadingBlock, SectionTitle } from '@/components/workspace/ui';
import { useState } from 'react';
import { MatchScore } from '@/components/shared/match-score';
import { SdgTags } from '@/components/shared/sdg-tags';
import { AiExplainButton } from '@/components/ai-drawer';
import { BuildRoadmapButton } from '@/components/build-roadmap-button';
import { officialPlanId, occupationSnapshot } from '@/domain/official-roadmap';

/**
 * Official occupation evidence (TalentCorp MyCOL + O*NET), shown alongside but
 * separate from the illustrative proficiency coverage of the sample roles.
 */
export function useOccupationEvidence() {
  const { profile } = useWorkspace();
  const skills = useMemo(() => profile.skills.map(s => s.name), [profile.skills]);
  const normalizedSkills = useMemo(
    () => [...new Set(skills.map(s => s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()).filter(Boolean))],
    [skills],
  );
  const mutation = useMatchOccupationEvidence({ request: { responseType: 'json' } });
  useEffect(() => {
    mutation.mutate({ data: { skills } });
  }, [skills, mutation.mutate]);

  const currentResult = mutation.data?.normalizedSkills.length === normalizedSkills.length
    && mutation.data.normalizedSkills.every((skill, index) => skill === normalizedSkills[index])
    ? mutation.data
    : undefined;

  return {
    ...mutation,
    data: currentResult,
    isPending: mutation.isPending || (!currentResult && !mutation.isError),
    retry: () => mutation.mutate({ data: { skills } }),
  };
}

type OccupationEvidenceQuery = ReturnType<typeof useOccupationEvidence>;
type MatchedOccupation = OccupationEvidenceResult['occupations'][number];

const relationLabel: Record<OccupationEvidence['mapping']['relation'], string> = {
  exact: 'Exact match', approximate: 'Approximate match', broader: 'O*NET occupation is broader', narrower: 'O*NET occupation is narrower',
};

function SourceFooter({ data }: { data: OccupationEvidenceResult }) {
  return <div className="disclaimer" style={{ marginTop: 14 }} data-testid="text-occupation-attribution"><Info size={14} /><span>
    {data.sources.onet.attribution}{' '}
    <a className="text-link" href={data.sources.onet.licenseUrl} target="_blank" rel="noreferrer">CC BY 4.0</a>{' · '}
    <a className="text-link" href={data.sources.onet.databaseUrl} target="_blank" rel="noreferrer">O*NET {data.sources.onet.release} database</a>{' · '}
    <a className="text-link" href={data.sources.mycol.reportUrl} target="_blank" rel="noreferrer">{data.sources.mycol.edition} report (TalentCorp)</a>
  </span></div>;
}

export function OfficialOccupationsPanel({ query }: { query: OccupationEvidenceQuery }) {
  const { profile } = useWorkspace();
  const eligible = query.data?.occupations.filter(o => o.recommendationStatus === 'eligible') ?? [];
  const excluded = query.data?.occupations.filter(o => o.recommendationStatus === 'excluded') ?? [];
  return <section className="panel panel-pad" style={{ marginTop: 18 }} data-testid="panel-official-occupations">
    <SectionTitle title="Malaysian critical occupations" note="OFFICIAL EVIDENCE · MYCOL 2024/2025 + O*NET 31.0"
      info="MyCOL status is TalentCorp's classification. O*NET is United States occupational reference data. Neither is a hiring probability or a measure of local demand." />
    <p className="muted" style={{ marginTop: 0 }}>
      Separate from the illustrative coverage above. Each occupation is on TalentCorp's MyCOL 2024/2025 list and mapped by review to an O*NET occupation.
      The count shows how many skills O*NET documents for that occupation appear by name in your profile. DOSM statistics in Market & AI impact are not used here.
    </p>
    <p className="muted small">SDG tags are separately reviewed thematic links, not official MyCOL classifications or measured impact. Expand a tag for UN targets, occupational duties, scope limits and citation dates. Other occupations remain unassessed.</p>
    {query.isPending && <LoadingBlock rows={2} />}
    {query.isError && <ErrorBlock message="Official occupation evidence could not be loaded. Check that the API server is running." onRetry={query.retry} />}
    {query.data && <>
      {profile.skills.length === 0 && <div className="state-box" style={{ marginBottom: 14 }}>Add skills to your profile to compare them with O*NET documented skills.</div>}
      <div className="grid-2">{eligible.map(o => <article key={o.id} className="role-card" data-testid={`card-occupation-${o.id}`}>
        <div className="spread"><strong>{o.mycol.title}</strong><span className="match-pill">{o.mycol.edition}</span></div>
        <span className="muted small">MASCO {o.mycol.masco4} → O*NET {o.onet.code} {o.onet.title} · {relationLabel[o.mapping.relation]}</span>
        <SdgTags roleId={o.id} compact />
        <MatchScore metric="onet" variant="bar" value={o.overlap!.score} matched={o.overlap!.matchedSkills.length} considered={o.overlap!.skillsConsidered} testId={`text-occupation-overlap-${o.id}`} />
        <div className="row">
          {o.overlap!.matchedSkills.map(s => <span key={s} className="chip">{s}</span>)}
          {o.overlap!.missingSkills.slice(0, 4).map(s => <span key={s} className="chip gap">{s}</span>)}
        </div>
        <p className="muted small" style={{ margin: 0 }} data-testid={`text-occupation-why-${o.id}`}>{o.explanation}</p>
        {o.mapping.status === 'verified' && o.documentedSkills.length > 0
          ? <BuildRoadmapButton roleId={officialPlanId(o.id)} occupation={occupationSnapshot(o, query.data!)} testId={`button-build-roadmap-${o.id}`} />
          : <span className="small muted">Roadmap unavailable: no reviewed documented skill requirements.</span>}
        <Link href={`/careers-and-jobs/roles/${o.id}`} className="text-link" data-testid={`link-occupation-${o.id}`}>Occupation evidence & sources <ArrowRight size={12} /></Link>
      </article>)}</div>
      {excluded.length > 0 && <div style={{ marginTop: 16 }} data-testid="list-occupations-excluded">
        <div className="section-kicker">Not used for recommendations</div>
        <div className="gap-list">{excluded.map(o => <div className="gap-row" key={o.id} data-testid={`row-occupation-excluded-${o.id}`}>
          <span><strong>{o.mycol.title}</strong><small>MASCO {o.mycol.masco4} → O*NET {o.onet.code} {o.onet.title}</small></span>
          <span className="small muted" style={{ maxWidth: 360, textAlign: 'right' }}>{o.exclusionReason}</span>
        </div>)}</div>
      </div>}
      <SourceFooter data={query.data} />
    </>}
  </section>;
}

function OccupationComparisonCard({ occupation, index }: { occupation: MatchedOccupation; index: number }) {
  const overlap = occupation.overlap;
  return <article className="role-card" data-testid={`card-compare-${index}`}>
    <div className="spread">
      <strong>{occupation.mycol.title}</strong>
      <span className="match-pill">{occupation.mycol.edition}</span>
    </div>
    <span className="muted small">
      MASCO {occupation.mycol.masco4} → O*NET {occupation.onet.code} {occupation.onet.title} · {relationLabel[occupation.mapping.relation]}
    </span>
    <SdgTags roleId={occupation.id} compact />
    {occupation.recommendationStatus === 'excluded' || !overlap
      ? <div className="state-box" style={{ marginTop: 12 }} data-testid={`text-compare-excluded-${index}`}>
        {occupation.exclusionReason ?? 'A skill comparison is not available for this occupation.'}
      </div>
      : <>
        <MatchScore metric="onet" variant="bar" className="ms-spaced" value={overlap.score} matched={overlap.matchedSkills.length} considered={overlap.skillsConsidered} />
        <div className="row" style={{ marginTop: 8 }}>
          {overlap.matchedSkills.map(skill => <span key={skill} className="chip">{skill}</span>)}
          {overlap.missingSkills.slice(0, 4).map(skill => <span key={skill} className="chip gap">{skill}</span>)}
          {overlap.missingSkills.length > 4 && <span className="muted small">+{overlap.missingSkills.length - 4} more unmatched skills</span>}
        </div>
        <p className="muted small" style={{ marginBottom: 0 }}>{occupation.explanation}</p>
      </>}
  </article>;
}

export function OccupationComparisonPanel({ query }: { query: OccupationEvidenceQuery }) {
  const [firstId, setFirstId] = useState('');
  const [secondId, setSecondId] = useState('');
  const occupations = query.data?.occupations ?? [];
  const first = occupations.find(occupation => occupation.id === firstId);
  const second = occupations.find(occupation => occupation.id === secondId);
  const options = occupations.map(occupation => ({
    ...occupation,
    label: `${occupation.mycol.title}${occupation.recommendationStatus === 'excluded' ? ' — no skill comparison' : ''}`,
  }));
  const emptyMessage = query.isError
    ? 'Official occupation data is unavailable. Retry from the Malaysian critical occupations panel.'
    : 'Choose a Malaysian critical occupation above to compare its documented skills.';

  return <section className="panel panel-pad" style={{ marginTop: 18 }} data-testid="panel-comparison">
    <SectionTitle
      title="Compare two careers"
      note="MYCOL · SIDE BY SIDE"
      info="Choose occupations from TalentCorp's MyCOL 2024/2025 list. The comparison shows profile overlap with reviewed O*NET skills, not a hiring probability or Malaysian vacancy count."
    />
    <div className="row" style={{ marginBottom: 14 }}>
      <select
        className="select-field"
        value={firstId}
        onChange={event => setFirstId(event.target.value)}
        aria-label="First Malaysian critical occupation"
        data-testid="select-compare-a"
        disabled={!query.data}
      >
        <option value="">Choose first occupation</option>
        {options.map(occupation => <option key={occupation.id} value={occupation.id}>{occupation.label}</option>)}
      </select>
      <select
        className="select-field"
        value={secondId}
        onChange={event => setSecondId(event.target.value)}
        aria-label="Second Malaysian critical occupation"
        data-testid="select-compare-b"
        disabled={!query.data}
      >
        <option value="">Choose second occupation</option>
        {options.map(occupation => <option key={occupation.id} value={occupation.id}>{occupation.label}</option>)}
      </select>
    </div>
    <div className="side-by-side">
      {first ? <OccupationComparisonCard occupation={first} index={0} />
        : <div className="state-box" data-testid="text-compare-empty-0">{emptyMessage}</div>}
      {second ? <OccupationComparisonCard occupation={second} index={1} />
        : <div className="state-box" data-testid="text-compare-empty-1">{emptyMessage}</div>}
    </div>
  </section>;
}

export function OccupationEvidenceDetail({ id }: { id: string }) {
  const query = useOccupationEvidence();
  if (query.isError) return <ErrorBlock message="Official occupation evidence could not be loaded." onRetry={query.retry} />;
  if (query.isPending || !query.data) return <LoadingBlock rows={4} />;
  const data = query.data;
  const o = data.occupations.find(x => x.id === id);
  if (!o) return <EmptyBlock title="That occupation is not in the reviewed MyCOL evidence."><Link href="/careers-and-jobs?tab=career-paths" className="btn btn-primary btn-small" data-testid="link-back-careers">Back to career paths</Link></EmptyBlock>;
  const { mycol, onet } = data.sources;
  return <>
    <div className="row" style={{ marginBottom: 14 }}><Link href="/careers-and-jobs?tab=career-paths" className="text-link" data-testid="link-back-careers"><ArrowLeft size={12} /> Career paths</Link></div>
    <div className="role-hero">
      <div className="eyebrow">{o.mycol.edition} critical occupation · MASCO {o.mycol.masco4}</div>
      <h1 data-testid="text-occupation-title">{o.mycol.title}</h1>
      <p className="muted" style={{ maxWidth: 690 }}>Classified as a critical occupation by TalentCorp in {o.mycol.edition}. This is a TalentCorp classification, not a hiring probability or a vacancy count.</p>
      <div className="role-meta"><span><BookOpen size={14} />O*NET {o.onet.code} · {o.onet.title}</span><span><ShieldCheck size={14} />{relationLabel[o.mapping.relation]} · {o.mapping.status === 'verified' ? 'reviewed mapping' : 'unverified mapping'}</span></div>
      <div className="row" style={{ marginTop: 16 }}>
        {o.recommendationStatus === 'eligible' && o.mapping.status === 'verified' && o.documentedSkills.length > 0
          ? <BuildRoadmapButton roleId={officialPlanId(o.id)} occupation={occupationSnapshot(o, data)} testId="button-build-occupation-roadmap" />
          : <span className="small muted" data-testid="text-roadmap-unavailable">Roadmap unavailable: no reviewed documented skill requirements.</span>}
        <Link href="/learning-roadmap" className="btn btn-primary btn-small" data-testid="link-occupation-roadmap"><Workflow size={12} /> Continue to my roadmap</Link>
        <Link href="/my-profile" className="btn btn-secondary btn-small" data-testid="link-occupation-profile"><UserRound size={12} /> Update my skills</Link>
        <AiExplainButton request={{ feature: 'career-explorer' }} label="Explain career match with AI" small />
      </div>
    </div>
    <div className="detail-layout">
      <div className="stack">
        <div className="panel panel-pad" data-testid="panel-occupation-skills">
          <SectionTitle title="Your skills against O*NET documented skills" note="MATCHED · NOT IN PROFILE" />
          {o.exclusionReason
            ? <div className="state-box" data-testid="text-occupation-excluded">{o.exclusionReason}</div>
            : <>
              <MatchScore metric="onet" variant="panel" value={o.overlap!.score} matched={o.overlap!.matchedSkills.length} considered={o.overlap!.skillsConsidered} testId="text-occupation-overlap" />
              <p className="small">{o.overlap!.matchedSkills.length} of {o.overlap!.skillsConsidered} documented skills appear in your profile by name.</p>
              <div className="gap-list">{o.documentedSkills.map(s => <div className="gap-row" key={s.elementId} data-testid={`row-onet-skill-${s.elementId}`}>
                <span><strong>{s.name}</strong><small>{s.domain} skill · Importance {s.importance.toFixed(2)} of 5 · Level {s.level.toFixed(2)} of 7{s.levelLowPrecision ? ' (low precision)' : ''}</small></span>
                <span className={`tag ${s.inProfile ? 'tag-ok' : 'tag-miss'}`}>{s.inProfile ? 'In your profile' : 'Not in profile'}</span>
              </div>)}</div>
            </>}
          <p className="muted small" style={{ marginTop: 12 }}>{data.selectionRule} O*NET Importance and Level ratings are shown on their original scales and are not converted into your 1–5 self-ratings.</p>
        </div>
        <div className="panel panel-pad" data-testid="panel-occupation-why">
          <SectionTitle title="Why this occupation appears" note="EXPLANATION" />
          <p className="muted">{o.explanation}</p>
          <dl className="evidence"><dt>Mapping rationale</dt><dd>{o.mapping.rationale}</dd><dt>Mapping limitations</dt><dd>{o.mapping.limitations}</dd><dt>Scoring</dt><dd>{data.scoring}</dd></dl>
          <p className="muted small">Browsing never changes your roadmap. Choose “Build my learning roadmap” to use this occupation’s documented skills. O*NET ratings are not converted into 1–5 proficiency targets.</p>
        </div>
      </div>
      <div className="stack">
        <div className="panel panel-pad" data-testid="panel-occupation-mycol">
          <SectionTitle title="MyCOL classification" note="TALENTCORP MALAYSIA" />
          <dl className="evidence">
            <dt>Edition</dt><dd>{mycol.title}</dd>
            <dt>Reference period</dt><dd>{mycol.referencePeriod} · publication date not stated in the report</dd>
            <dt>MASCO 2020 (4-digit)</dt><dd className="mono">{o.mycol.masco4} · Table 7, no. {o.mycol.table7Number}</dd>
            <dt>MASCO (6-digit)</dt><dd className="mono">{o.mycol.masco6.join(', ')}</dd>
            <dt>Included job titles only</dt><dd data-testid="text-mycol-job-titles">{o.mycol.includedJobTitles.join(', ')}</dd>
            <dt>Source</dt><dd><a className="text-link" href={mycol.reportUrl} target="_blank" rel="noreferrer">MyCOL 2024/2025 report</a>, profile p. {o.mycol.profilePage} · <a className="text-link" href={mycol.landingUrl} target="_blank" rel="noreferrer">TalentCorp MyCOL page</a></dd>
          </dl>
          <p className="muted small">{mycol.scopeNote}</p>
        </div>
        <div className="panel panel-pad" data-testid="panel-occupation-onet">
          <SectionTitle title="O*NET occupation" note={`O*NET ${onet.release} · ${onet.taxonomy}`} />
          <dl className="evidence">
            <dt>Occupation</dt><dd><a className="text-link" href={o.onet.url} target="_blank" rel="noreferrer" data-testid="link-onet-occupation">{o.onet.code} {o.onet.title}</a></dd>
            <dt>Description</dt><dd>{o.onet.description}</dd>
            <dt>Release</dt><dd>O*NET {onet.release} ({onet.releaseDate}) · <a className="text-link" href={onet.databaseUrl} target="_blank" rel="noreferrer">database</a></dd>
            <dt>Mapping review</dt><dd>{relationLabel[o.mapping.relation]} · {o.mapping.status} · reviewed {data.sources.mapping.reviewedAt}</dd>
          </dl>
          <p className="muted small">{onet.localDemandNote}</p>
        </div>
        <div className="panel panel-pad" data-testid="panel-occupation-sdg">
          <SectionTitle title="SDG relevance" note="APPLICATION REVIEW · NOT MEASURED IMPACT" />
          <SdgTags roleId={o.id} />
        </div>
      </div>
    </div>
    <SourceFooter data={data} />
  </>;
}
