import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearch } from 'wouter';
import { ArrowLeft, BriefcaseBusiness, Layers, MapPin } from 'lucide-react';
import { getGetJobQueryKey, useCalculateJobMatchScores, useGetJob } from '@workspace/api-client-react';
import type { JobMatchScore } from '@workspace/api-client-react';
import { MatchScore } from '@/components/shared/match-score';
import { SdgTags } from '@/components/shared/sdg-tags';
import { ExternalJobLinks, SampleListingBadge } from '@/components/shared/external-job-links';
import { listingReturnHref } from '@/domain/job-listing-filters';
import '@/components/job-listings.css';
import { useI18n } from '@/i18n/i18n-context';

type Props = { profileSkills: string[] };

export function JobDetailsPage({ profileSkills }: Props) {
  const { t } = useI18n();
  const backHref = listingReturnHref(useSearch());
  const params = useParams<{ id: string }>();
  const id = params.id ?? '';
  const query = useGetJob(id, { query: { queryKey: getGetJobQueryKey(id), enabled: Boolean(id), staleTime: 30_000 } });
  const matchMutation = useCalculateJobMatchScores();
  const mutateAsyncRef = useRef(matchMutation.mutateAsync);
  mutateAsyncRef.current = matchMutation.mutateAsync;
  const requestRef = useRef(0);
  const [storedMatch, setMatch] = useState<{ key: string; score: JobMatchScore | undefined }>();
  const job = query.data;
  const scoreKey = JSON.stringify([job?.id, profileSkills]);
  const match = storedMatch?.key === scoreKey ? storedMatch.score : undefined;

  useEffect(() => {
    const token = ++requestRef.current;
    setMatch(undefined);
    if (!job || !profileSkills.length) return;
    mutateAsyncRef.current({ data: { candidateSkills: profileSkills.slice(0, 50), jobIds: [job.id] } })
      .then(res => { if (token === requestRef.current) setMatch({ key: scoreKey, score: res.scores.find(s => s.jobId === job.id) }); })
      .catch(() => undefined);
    return () => { requestRef.current++; };
  }, [scoreKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const normalize = (skill: string) => skill.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  const normalizedSkills = new Set(profileSkills.map(normalize));
  const matchedSkills = match?.matchedSkills ?? (job?.requiredSkills.filter(s => normalizedSkills.has(normalize(s))) ?? []);
  const missingSkills = match?.missingSkills ?? (job?.requiredSkills.filter(s => !normalizedSkills.has(normalize(s))) ?? []);

  if (query.isLoading) return <div className="jobs-page" data-testid="page-job-details"><div className="jobs-details-skeleton panel"><i /><i /><i /><i /><i /></div></div>;
  if (query.isError || !job) return <div className="jobs-page" data-testid="page-job-details">
    <Link href={backHref} className="jobs-back-link" data-testid="link-back-job-search"><ArrowLeft size={15} /> {t('detail.backListings')}</Link>
    <div className="jobs-state panel jobs-error" role="alert" data-testid="status-job-detail-error"><span className="jobs-state-icon">!</span><h3>{t(query.isError ? 'detail.loadError' : 'detail.noListing')}</h3><p>{t('detail.tryAnother')}</p><button className="btn btn-primary" onClick={() => query.refetch()} data-testid="button-retry-job-detail">{t('common.tryAgain')}</button></div>
  </div>;

  return <div className="jobs-page" data-testid="page-job-details">
    <div className="job-detail-topline"><Link href={backHref} className="jobs-back-link" data-testid="link-back-job-search"><ArrowLeft size={15} /> {t('detail.backListings')}</Link></div>
    <p className="small muted" data-testid="text-source-language">{t('detail.sourceLanguage')}</p>
    <section className="job-detail-hero">
      <div className="job-detail-company-mark">{job.company.slice(0, 1).toUpperCase()}</div>
      <div className="job-detail-heading">
        <SampleListingBadge testId="badge-fictional-detail" />
        <h1 data-testid="text-job-detail-title">{job.title}</h1>
        <p>{job.company}</p>
        <div className="job-detail-meta">
          <span><MapPin size={14} />{job.location}</span>
          <span><BriefcaseBusiness size={14} />{t(`search.mode.${job.workMode}`)} · {t(`detail.employment.${job.employmentType}`)}</span>
          <span><Layers size={14} />{t(`search.level.${job.level}`)}</span>
        </div>
      </div>
    </section>

    <div className="job-detail-columns">
      <div className="job-detail-content">
        <section className="panel panel-pad" data-testid="section-job-description"><div className="section-head"><div><h2>{t('detail.aboutListing')}</h2><div className="section-kicker">{t('detail.fictionalDescription')}</div></div></div><div className="job-description-text">{job.description.split(/\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</div></section>
        <section className="panel panel-pad" data-testid="section-job-occupation">
          <div className="section-head"><div><h2>{t('detail.mapping')}</h2><div className="section-kicker">MASCO → O*NET</div></div></div>
          <dl className="jl-evidence">
            <dt>{t('detail.occupation')}</dt><dd><Link href={`/careers-and-jobs/roles/${encodeURIComponent(job.occupationId)}`} className="text-link" data-testid="link-job-occupation">{job.occupationName}</Link></dd>
            <dt>MASCO</dt><dd className="mono">{job.mascoCode}</dd>
            <dt>O*NET</dt><dd><a className="text-link" href={`https://www.onetonline.org/link/summary/${encodeURIComponent(job.onetCode)}`} target="_blank" rel="noopener noreferrer" data-testid="link-job-onet">{job.onetCode} {job.onetTitle}</a></dd>
            <dt>{t('detail.mappingNote')}</dt><dd data-testid="text-job-mapping-note">{job.mappingNote}</dd>
            <dt>{t('detail.levelMode')}</dt><dd>{t(`search.level.${job.level}`)} · {t(`search.mode.${job.workMode}`)}</dd>
          </dl>
        </section>
        <section className="panel panel-pad" data-testid="section-company-information"><div className="section-head"><div><h2>{t('detail.aboutCompany', { name: job.company })}</h2><div className="section-kicker">{t('detail.fictionalEmployer')}</div></div></div><p className="job-company-info">{job.companyInfo || t('detail.noCompany')}</p></section>
        <section className="panel panel-pad" data-testid="section-job-sdg"><div className="section-head"><div><h2>{t('detail.sdg')}</h2><div className="section-kicker">{t('detail.sdgNote')}</div></div></div>
          {job.sdgTags.length ? <SdgTags roleId={job.sdgRoleId} /> : <p className="muted small" data-testid="text-job-sdg-none">{t('detail.noSdg')}</p>}
        </section>
      </div>
      <aside className="job-detail-aside">
        <section className="panel panel-pad job-skills-panel">
          <div className="section-head"><div><h2>{t('detail.listingSkills')}</h2><div className="section-kicker">{t('detail.documented')}</div></div></div>
          {profileSkills.length ? <>
            {match && <MatchScore metric="exact" value={match.score} matched={match.matchedSkills.length} considered={match.skillsConsidered} variant="panel" testId="text-detail-match-score" />}
            <div className="jobs-skill-label">{t('detail.inProfile')}</div>
            <div className="jobs-skill-list">{matchedSkills.map(s => <span className="skill-status matched" key={s} data-testid={`skill-matched-${s.toLowerCase().replaceAll(' ', '-')}`}>{s}<b>{t('detail.matched')}</b></span>)}
              {!matchedSkills.length && <div className="skill-empty">{t('detail.noMatches')}</div>}</div>
            <div className="jobs-skill-label">{t('detail.explore')}</div>
            <div className="jobs-skill-list">{missingSkills.map(s => <span className="skill-status missing" key={s} data-testid={`skill-missing-${s.toLowerCase().replaceAll(' ', '-')}`}>{s}<b>{t('detail.notInProfile')}</b></span>)}
              {!missingSkills.length && <div className="skill-empty">{t('detail.allSkills')}</div>}</div>
            <p className="job-profile-disclaimer">{t('detail.profileNote')}</p>
          </> : <>
            <div className="skill-empty">{t('detail.addSkills')}</div>
            <div className="jobs-skill-label">{t('detail.listed')}</div><div className="jobs-skill-list">{job.requiredSkills.map(s => <span className="skill-status neutral" key={s} data-testid={`skill-required-${s.toLowerCase().replaceAll(' ', '-')}`}>{s}</span>)}</div>
          </>}
        </section>
        <section className="panel panel-pad" data-testid="section-real-jobs">
          <div className="section-kicker">{t('detail.realJobs')}</div>
          <p className="small muted">{t('detail.fictionalNote')}</p>
          <ExternalJobLinks occupationTitle={job.occupationName} testIdSuffix="detail" />
        </section>
      </aside>
    </div>
    <div className="jobs-footnote"><span className="jobs-footnote-mark">i</span><span>{t('detail.listingFootnote')}</span></div>
  </div>;
}

export default JobDetailsPage;
