import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearch } from 'wouter';
import { ArrowLeft, BriefcaseBusiness, Layers, MapPin } from 'lucide-react';
import { getGetJobQueryKey, useCalculateJobMatchScores, useGetJob } from '@workspace/api-client-react';
import type { JobMatchScore } from '@workspace/api-client-react';
import { fictionalListingLabel } from '@workspace/workforce-evidence';
import { MatchScore } from '@/components/shared/match-score';
import { SdgTags } from '@/components/shared/sdg-tags';
import { ExternalJobLinks, SampleListingBadge } from '@/components/shared/external-job-links';
import { listingReturnHref } from '@/domain/job-listing-filters';
import '@/components/job-listings.css';

type Props = { profileSkills: string[] };
const modeLabel: Record<string, string> = { 'on-site': 'On-site', hybrid: 'Hybrid', remote: 'Remote' };
const levelLabel: Record<string, string> = { entry: 'Entry level', mid: 'Mid level', senior: 'Senior level' };

export function JobDetailsPage({ profileSkills }: Props) {
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
    <Link href={backHref} className="jobs-back-link" data-testid="link-back-job-search"><ArrowLeft size={15} /> Back to listings</Link>
    <div className="jobs-state panel jobs-error" role="alert" data-testid="status-job-detail-error"><span className="jobs-state-icon">!</span><h3>{query.isError ? 'This listing could not be loaded.' : 'This sample listing is not available.'}</h3><p>Try returning to the listings and opening another one.</p><button className="btn btn-primary" onClick={() => query.refetch()} data-testid="button-retry-job-detail">Try again</button></div>
  </div>;

  return <div className="jobs-page" data-testid="page-job-details">
    <div className="job-detail-topline"><Link href={backHref} className="jobs-back-link" data-testid="link-back-job-search"><ArrowLeft size={15} /> Back to listings</Link></div>
    <section className="job-detail-hero">
      <div className="job-detail-company-mark">{job.company.slice(0, 1).toUpperCase()}</div>
      <div className="job-detail-heading">
        <SampleListingBadge testId="badge-fictional-detail" />
        <h1 data-testid="text-job-detail-title">{job.title}</h1>
        <p>{job.company}</p>
        <div className="job-detail-meta">
          <span><MapPin size={14} />{job.location}</span>
          <span><BriefcaseBusiness size={14} />{modeLabel[job.workMode]} · {job.employmentType.replace('-', ' ')}</span>
          <span><Layers size={14} />{levelLabel[job.level]}</span>
        </div>
      </div>
    </section>

    <div className="job-detail-columns">
      <div className="job-detail-content">
        <section className="panel panel-pad" data-testid="section-job-description"><div className="section-head"><div><h2>About this sample listing</h2><div className="section-kicker">FICTIONAL DESCRIPTION</div></div></div><div className="job-description-text">{job.description.split(/\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</div></section>
        <section className="panel panel-pad" data-testid="section-job-occupation">
          <div className="section-head"><div><h2>Occupation mapping</h2><div className="section-kicker">MASCO → O*NET</div></div></div>
          <dl className="jl-evidence">
            <dt>Occupation</dt><dd><Link href={`/careers-and-jobs/roles/${encodeURIComponent(job.occupationId)}`} className="text-link" data-testid="link-job-occupation">{job.occupationName}</Link></dd>
            <dt>MASCO</dt><dd className="mono">{job.mascoCode}</dd>
            <dt>O*NET</dt><dd><a className="text-link" href={`https://www.onetonline.org/link/summary/${encodeURIComponent(job.onetCode)}`} target="_blank" rel="noopener noreferrer" data-testid="link-job-onet">{job.onetCode} {job.onetTitle}</a></dd>
            <dt>Mapping note</dt><dd data-testid="text-job-mapping-note">{job.mappingNote}</dd>
            <dt>Level / mode</dt><dd>{levelLabel[job.level]} · {modeLabel[job.workMode]}</dd>
          </dl>
        </section>
        <section className="panel panel-pad" data-testid="section-company-information"><div className="section-head"><div><h2>About {job.company}</h2><div className="section-kicker">FICTIONAL EMPLOYER</div></div></div><p className="job-company-info">{job.companyInfo || 'No employer information is included in this sample listing.'}</p></section>
        <section className="panel panel-pad" data-testid="section-job-sdg"><div className="section-head"><div><h2>SDG relevance</h2><div className="section-kicker">EXISTING REVIEWED MAPPING · NOT IMPACT</div></div></div>
          {job.sdgTags.length ? <SdgTags roleId={job.sdgRoleId} /> : <p className="muted small" data-testid="text-job-sdg-none">No reviewed SDG mapping for this occupation. No contribution or impact is implied.</p>}
        </section>
      </div>
      <aside className="job-detail-aside">
        <section className="panel panel-pad job-skills-panel">
          <div className="section-head"><div><h2>Skills for this listing</h2><div className="section-kicker">O*NET DOCUMENTED SKILLS</div></div></div>
          {profileSkills.length ? <>
            {match && <MatchScore metric="exact" value={match.score} matched={match.matchedSkills.length} considered={match.skillsConsidered} variant="panel" testId="text-detail-match-score" />}
            <div className="jobs-skill-label">In your profile</div>
            <div className="jobs-skill-list">{matchedSkills.map(s => <span className="skill-status matched" key={s} data-testid={`skill-matched-${s.toLowerCase().replaceAll(' ', '-')}`}>{s}<b>Matched</b></span>)}
              {!matchedSkills.length && <div className="skill-empty">No exact matches in your profile yet.</div>}</div>
            <div className="jobs-skill-label">Skills to explore</div>
            <div className="jobs-skill-list">{missingSkills.map(s => <span className="skill-status missing" key={s} data-testid={`skill-missing-${s.toLowerCase().replaceAll(' ', '-')}`}>{s}<b>Not in profile</b></span>)}
              {!missingSkills.length && <div className="skill-empty">All listed skills appear in your profile.</div>}</div>
            <p className="job-profile-disclaimer">Skills saved in your profile on this device. Exact overlap is not a hiring prediction.</p>
          </> : <>
            <div className="skill-empty">Add skills to your profile to see which skills overlap.</div>
            <div className="jobs-skill-label">Listed skills</div><div className="jobs-skill-list">{job.requiredSkills.map(s => <span className="skill-status neutral" key={s} data-testid={`skill-required-${s.toLowerCase().replaceAll(' ', '-')}`}>{s}</span>)}</div>
          </>}
        </section>
        <section className="panel panel-pad" data-testid="section-real-jobs">
          <div className="section-kicker">REAL VACANCIES ELSEWHERE</div>
          <p className="small muted">This listing is fictional and cannot be applied for. Search real vacancies for the occupation instead.</p>
          <ExternalJobLinks occupationTitle={job.occupationName} testIdSuffix="detail" />
        </section>
      </aside>
    </div>
    <div className="jobs-footnote"><span className="jobs-footnote-mark">i</span><span>{fictionalListingLabel}. Employer, role details and availability are illustrative; no salary is shown because none comes from a published source.</span></div>
  </div>;
}

export default JobDetailsPage;
