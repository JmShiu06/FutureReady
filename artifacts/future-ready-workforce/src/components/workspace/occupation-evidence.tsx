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
import { roleSupportsGoal } from '@workspace/workforce-evidence';
import { ExternalJobLinks } from '@/components/shared/external-job-links';
import '@/components/job-listings.css';
import { BuildRoadmapButton } from '@/components/build-roadmap-button';
import { officialPlanId, occupationSnapshot } from '@/domain/official-roadmap';
import { useI18n } from '@/i18n/i18n-context';

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
  const { t, ui } = useI18n();
  return <div className="disclaimer" style={{ marginTop: 14 }} data-testid="text-occupation-attribution"><Info size={14} /><span>
    {t('detail.sourceLanguage')}{' '}
    {data.sources.onet.attribution}{' '}
    <a className="text-link" href={data.sources.onet.licenseUrl} target="_blank" rel="noreferrer">CC BY 4.0</a>{' · '}
    <a className="text-link" href={data.sources.onet.databaseUrl} target="_blank" rel="noreferrer">O*NET {data.sources.onet.release} {t('detail.database')}</a>{' · '}
    <a className="text-link" href={data.sources.mycol.reportUrl} target="_blank" rel="noreferrer">{t('detail.report', { edition: data.sources.mycol.edition })} (TalentCorp)</a>
  </span></div>;
}

export function OfficialOccupationsPanel({ query, sdgGoal }: { query: OccupationEvidenceQuery; sdgGoal?: number }) {
  const { ui } = useI18n();
  const { profile } = useWorkspace();
  const eligible = query.data?.occupations.filter(o => o.recommendationStatus === 'eligible' && (!sdgGoal || roleSupportsGoal(o.id, sdgGoal))) ?? [];
  const excluded = query.data?.occupations.filter(o => o.recommendationStatus === 'excluded') ?? [];
  return <section className="panel panel-pad" style={{ marginTop: 18 }} data-testid="panel-official-occupations">
    <SectionTitle title="Malaysian critical occupations" note="OFFICIAL EVIDENCE · MYCOL 2024/2025 + O*NET 31.0"
      info="MyCOL status is TalentCorp's classification. O*NET is United States occupational reference data. Neither is a hiring probability or a measure of local demand." />
    <p className="muted" style={{ marginTop: 0 }}>
      {ui('Separate from the illustrative coverage above. Each occupation is on TalentCorp’s MyCOL 2024/2025 list and mapped by review to an O*NET occupation.')}
      The count shows how many skills O*NET documents for that occupation appear by name in your profile. DOSM statistics in Market & AI impact are not used here.
    </p>
    <p className="muted small">{ui('SDG tags are separately reviewed thematic links, not official MyCOL classifications or measured impact. Expand a tag for UN targets, occupational duties, scope limits and citation dates. Other occupations remain unassessed.')}</p>
    {query.isPending && <LoadingBlock rows={2} />}
    {query.isError && <ErrorBlock message="Official occupation evidence could not be loaded. Check that the API server is running." onRetry={query.retry} />}
    {query.data && <>
      {profile.skills.length === 0 && <div className="state-box" style={{ marginBottom: 14 }}>{ui('Add skills to your profile to compare them with O*NET documented skills.')}</div>}
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
          : <span className="small muted">{ui('Roadmap unavailable: no reviewed documented skill requirements.')}</span>}
        <Link href={`/careers-and-jobs/roles/${o.id}`} className="text-link" data-testid={`link-occupation-${o.id}`}>{ui('Occupation evidence & sources')} <ArrowRight size={12} /></Link>
      </article>)}</div>
      {excluded.length > 0 && <div style={{ marginTop: 16 }} data-testid="list-occupations-excluded">
        <div className="section-kicker">{ui('Not used for recommendations')}</div>
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
  const { ui } = useI18n();
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
  const { ui } = useI18n();
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
  const { t, ui } = useI18n();
  const query = useOccupationEvidence();
  if (query.isError) return <ErrorBlock message={t('detail.officialError')} onRetry={query.retry} />;
  if (query.isPending || !query.data) return <LoadingBlock rows={4} />;
  const data = query.data;
  const o = data.occupations.find(x => x.id === id);
  if (!o) return <EmptyBlock title={t('detail.noOccupation')}><Link href="/careers-and-jobs?tab=career-paths" className="btn btn-primary btn-small" data-testid="link-back-careers">{t('detail.backCareers')}</Link></EmptyBlock>;
  const { mycol, onet } = data.sources;
  return <>
    <div className="row" style={{ marginBottom: 14 }}><Link href="/careers-and-jobs?tab=career-paths" className="text-link" data-testid="link-back-careers"><ArrowLeft size={12} /> {t('detail.careers')}</Link></div>
    <p className="small muted" data-testid="text-source-language">{t('detail.sourceLanguage')}</p>
    <div className="role-hero">
      <div className="eyebrow">{t('detail.critical', { edition: o.mycol.edition, code: o.mycol.masco4 })}</div>
      <h1 data-testid="text-occupation-title">{o.mycol.title}</h1>
      <p className="muted" style={{ maxWidth: 690 }}>{t('detail.classificationNote', { edition: o.mycol.edition })}</p>
      <div className="role-meta"><span><BookOpen size={14} />O*NET {o.onet.code} · {o.onet.title}</span><span><ShieldCheck size={14} />{t(`detail.relation.${o.mapping.relation}`)} · {t(o.mapping.status === 'verified' ? 'detail.reviewedMapping' : 'detail.unverifiedMapping')}</span></div>
      <div className="row" style={{ marginTop: 16 }}>
        {o.recommendationStatus === 'eligible' && o.mapping.status === 'verified' && o.documentedSkills.length > 0
          ? <BuildRoadmapButton roleId={officialPlanId(o.id)} occupation={occupationSnapshot(o, data)} testId="button-build-occupation-roadmap" />
          : <span className="small muted" data-testid="text-roadmap-unavailable">{t('detail.noRoadmap')}</span>}
        <Link href="/learning-roadmap" className="btn btn-primary btn-small" data-testid="link-occupation-roadmap"><Workflow size={12} /> {t('detail.continueRoadmap')}</Link>
        <Link href="/my-profile" className="btn btn-secondary btn-small" data-testid="link-occupation-profile"><UserRound size={12} /> {t('detail.updateSkills')}</Link>
        <Link href="/market-and-ai-impact?tab=ai-impact" className="btn btn-secondary btn-small" data-testid="link-ai-career-explanation-occupation">{t('detail.analysis')}</Link>
      </div>
      <ExternalJobLinks occupationTitle={o.mycol.title} testIdSuffix={`occupation-${o.id}`} />
    </div>
    <div className="detail-layout">
      <div className="stack">
        <div className="panel panel-pad" data-testid="panel-occupation-skills">
          <SectionTitle title={t('detail.skillsOnet')} note={t('detail.matchLegend')} />
          {o.exclusionReason
            ? <div className="state-box" data-testid="text-occupation-excluded">{o.exclusionReason}</div>
            : <>
              <MatchScore metric="onet" variant="panel" value={o.overlap!.score} matched={o.overlap!.matchedSkills.length} considered={o.overlap!.skillsConsidered} testId="text-occupation-overlap" />
              <p className="small">{t('detail.overlap', { matched: o.overlap!.matchedSkills.length, total: o.overlap!.skillsConsidered })}</p>
              <div className="gap-list">{o.documentedSkills.map(s => <div className="gap-row" key={s.elementId} data-testid={`row-onet-skill-${s.elementId}`}>
                <span><strong>{s.name}</strong><small>{t('detail.skillRating', { domain: s.domain, importance: s.importance.toFixed(2), level: s.level.toFixed(2) })}{s.levelLowPrecision ? ` ${t('detail.lowPrecision')}` : ''}</small></span>
                <span className={`tag ${s.inProfile ? 'tag-ok' : 'tag-miss'}`}>{t(s.inProfile ? 'detail.inProfile' : 'detail.notInProfile')}</span>
              </div>)}</div>
            </>}
          <p className="muted small" style={{ marginTop: 12 }}>{data.selectionRule} {t('detail.scaleNote')}</p>
        </div>
        <div className="panel panel-pad" data-testid="panel-occupation-why">
          <SectionTitle title={t('detail.whyOccupation')} note={t('detail.explanation')} />
          <p className="muted">{o.explanation}</p>
          <dl className="evidence"><dt>{t('detail.rationale')}</dt><dd>{o.mapping.rationale}</dd><dt>{t('detail.mappingLimits')}</dt><dd>{o.mapping.limitations}</dd><dt>{t('detail.scoring')}</dt><dd>{data.scoring}</dd></dl>
          <p className="muted small">{t('detail.browseNote')}</p>
        </div>
      </div>
      <div className="stack">
        <div className="panel panel-pad" data-testid="panel-occupation-mycol">
          <SectionTitle title={t('detail.mycol')} note="TALENTCORP MALAYSIA" />
          <dl className="evidence">
            <dt>{t('detail.edition')}</dt><dd>{mycol.title}</dd>
            <dt>{t('detail.period')}</dt><dd>{mycol.referencePeriod} · {t('detail.noPublicationDate')}</dd>
            <dt>{t('detail.masco4')}</dt><dd className="mono">{o.mycol.masco4} · {t('detail.table', { n: o.mycol.table7Number })}</dd>
            <dt>{t('detail.masco6')}</dt><dd className="mono">{o.mycol.masco6.join(', ')}</dd>
            <dt>{t('detail.includedTitles')}</dt><dd data-testid="text-mycol-job-titles">{o.mycol.includedJobTitles.join(', ')}</dd>
            <dt>{t('learn.source')}</dt><dd><a className="text-link" href={mycol.reportUrl} target="_blank" rel="noreferrer">{t('detail.report', { edition: o.mycol.edition })}</a>, {t('detail.profilePage', { n: o.mycol.profilePage })} · <a className="text-link" href={mycol.landingUrl} target="_blank" rel="noreferrer">{t('detail.mycolPage')}</a></dd>
          </dl>
          <p className="muted small">{mycol.scopeNote}</p>
        </div>
        <div className="panel panel-pad" data-testid="panel-occupation-onet">
          <SectionTitle title={t('detail.onetOccupation')} note={`O*NET ${onet.release} · ${onet.taxonomy}`} />
          <dl className="evidence">
            <dt>{t('detail.occupation')}</dt><dd><a className="text-link" href={o.onet.url} target="_blank" rel="noreferrer" data-testid="link-onet-occupation">{o.onet.code} {o.onet.title}</a></dd>
            <dt>{t('detail.description')}</dt><dd>{o.onet.description}</dd>
            <dt>{t('detail.release')}</dt><dd>O*NET {onet.release} ({onet.releaseDate}) · <a className="text-link" href={onet.databaseUrl} target="_blank" rel="noreferrer">{t('detail.database')}</a></dd>
            <dt>{t('detail.mappingReview')}</dt><dd>{t(`detail.relation.${o.mapping.relation}`)} · {t(o.mapping.status === 'verified' ? 'detail.reviewedMapping' : 'detail.unverifiedMapping')} · {t('learn.reviewed', { date: data.sources.mapping.reviewedAt })}</dd>
          </dl>
          <p className="muted small">{onet.localDemandNote}</p>
        </div>
        <div className="panel panel-pad" data-testid="panel-occupation-sdg">
          <SectionTitle title={t('detail.sdg')} note={t('detail.sdgNote')} />
          <SdgTags roleId={o.id} />
        </div>
      </div>
    </div>
    <SourceFooter data={data} />
  </>;
}
