import { useEffect } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, Clock3, MapPin, Wifi } from 'lucide-react';
import { getGetJobQueryKey, useCalculateJobMatchScores, useGetJob } from '@workspace/api-client-react';
import { AiExplanationPanel } from '@/components/ai-explanation-panel';

type Props = { profileSkills: string[] };

function formatSalary(min: number | null, max: number | null) {
  const cash = (value: number) => `RM ${value.toLocaleString('en-MY')}`;
  if (min == null && max == null) return 'Salary not listed';
  if (min != null && max != null) return `${cash(min)} – ${cash(max)}`;
  return min != null ? `From ${cash(min)}` : `Up to ${cash(max as number)}`;
}

export function JobDetailsPage({ profileSkills }: Props) {
  const params = useParams<{ id: string }>();
  const id = params.id ?? '';
  const query = useGetJob(id, { query: { queryKey: getGetJobQueryKey(id), enabled: Boolean(id), staleTime: 30_000 } });
  const matchMutation = useCalculateJobMatchScores();
  const job = query.data;

  useEffect(() => {
    if (job && profileSkills.length) {
      matchMutation.mutate({ data: { candidateSkills: profileSkills, jobIds: [job.id] } });
    }
    // Query result identity can change on refetch; id and profile skill names define the requested match.
  }, [job?.id, profileSkills.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const match = matchMutation.data?.scores.find(score => score.jobId === id);
  const normalize = (skill: string) => skill.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  const normalizedSkills = new Set(profileSkills.map(normalize));
  const matchedSkills = match?.matchedSkills ?? (job?.requiredSkills.filter(skill => normalizedSkills.has(normalize(skill))) ?? []);
  const missingSkills = match?.missingSkills ?? (job?.requiredSkills.filter(skill => !normalizedSkills.has(normalize(skill))) ?? []);
  const posted = job ? new Date(job.datePosted) : null;
  const postedText = posted && !Number.isNaN(posted.getTime()) ? posted.toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date not listed';

  if (query.isLoading) return <div className="jobs-page" data-testid="page-job-details"><div className="jobs-details-skeleton panel"><i /><i /><i /><i /><i /></div></div>;
  if (query.isError || !job) return <div className="jobs-page" data-testid="page-job-details">
    <Link href="/jobs" className="jobs-back-link" data-testid="link-back-job-search"><ArrowLeft size={15} /> Back to job search</Link>
    <div className="jobs-state panel jobs-error" role="alert" data-testid="status-job-detail-error"><span className="jobs-state-icon">!</span><h3>{query.isError ? 'This listing could not be loaded.' : 'This sample listing is not available.'}</h3><p>Try returning to the search results and opening another role.</p><button className="btn btn-primary" onClick={() => query.refetch()} data-testid="button-retry-job-detail">Try again</button></div>
  </div>;

  return <div className="jobs-page" data-testid="page-job-details">
    <div className="job-detail-topline"><Link href="/jobs" className="jobs-back-link" data-testid="link-back-job-search"><ArrowLeft size={15} /> Back to job search</Link><span className="jobs-demo-flag">SAMPLE LISTING · DEMO DATA</span></div>
    <section className="job-detail-hero">
      <div className="job-detail-company-mark">{job.company.slice(0, 1).toUpperCase()}</div>
      <div className="job-detail-heading">
        <div className="eyebrow">Sample role / Opportunity details</div>
        <h1 data-testid="text-job-detail-title">{job.title}</h1>
        <p>{job.company}</p>
        <div className="job-detail-meta">
          <span><MapPin size={14} />{job.location}</span>
          {job.remote && <span><Wifi size={14} />Remote</span>}
          <span><BriefcaseBusiness size={14} />{job.employmentType.replace('-', ' ')}</span>
          <span><Clock3 size={14} />Posted {postedText}</span>
        </div>
      </div>
      <div className="job-detail-salary">{formatSalary(job.salaryMin, job.salaryMax)}<small>Sample range, if provided</small></div>
    </section>

    <AiExplanationPanel feature="job-fit" jobId={job.id} />
    <div className="job-detail-columns">
      <div className="job-detail-content">
        <section className="panel panel-pad" data-testid="section-job-description"><div className="section-head"><div><h2>About this role</h2><div className="section-kicker">SAMPLE LISTING DESCRIPTION</div></div></div><div className="job-description-text">{job.description.split(/\n+/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></section>
        <section className="panel panel-pad" data-testid="section-company-information"><div className="section-head"><div><h2>About {job.company}</h2><div className="section-kicker">COMPANY INFORMATION</div></div></div><p className="job-company-info">{job.companyInfo || 'No company information is included in this sample listing.'}</p></section>
      </div>
      <aside className="job-detail-aside">
        <section className="panel panel-pad job-skills-panel">
          <div className="section-head"><div><h2>Skills for this role</h2><div className="section-kicker">REQUIRED SKILL OVERLAP</div></div></div>
          {profileSkills.length ? <>
            {match && <div className="detail-match-summary" data-testid="text-detail-match-score"><strong>{match.score}%</strong><span>exact skill overlap<br />{match.matchedSkills.length} of {match.skillsConsidered} considered</span></div>}
            <div className="jobs-skill-label">In your profile</div>
            <div className="jobs-skill-list">{matchedSkills.map(skill => <span className="skill-status matched" key={skill} data-testid={`skill-matched-${skill.toLowerCase().replaceAll(' ', '-')}`}>{skill}<b>Matched</b></span>)}
              {!matchedSkills.length && <div className="skill-empty">No exact matches in your profile yet.</div>}</div>
            <div className="jobs-skill-label">Skills to explore</div>
            <div className="jobs-skill-list">{missingSkills.map(skill => <span className="skill-status missing" key={skill} data-testid={`skill-missing-${skill.toLowerCase().replaceAll(' ', '-')}`}>{skill}<b>Not in profile</b></span>)}
              {!missingSkills.length && <div className="skill-empty">All listed requirements appear in your profile.</div>}</div>
            <p className="job-profile-disclaimer">These are the skills saved in your profile on this device, including any CV skills you explicitly confirmed. Exact overlap is not a hiring prediction.</p>
          </> : <>
            <div className="skill-empty">Add skills to your profile to see which requirements overlap.</div>
            <div className="jobs-skill-label">Required skills</div><div className="jobs-skill-list">{job.requiredSkills.map(skill => <span className="skill-status neutral" key={skill} data-testid={`skill-required-${skill.toLowerCase().replaceAll(' ', '-')}`}>{skill}</span>)}</div>
          </>}
        </section>
        <section className="panel panel-pad job-apply-panel">
          <div className="section-kicker">APPLICATION</div>
          {job.externalUrl
            ? <a className="btn btn-primary job-apply-detail" href={job.externalUrl} target="_blank" rel="noopener noreferrer" data-testid="link-job-apply">Open application <ArrowUpRight size={14} /></a>
            : <button className="btn btn-secondary job-apply-detail" disabled title="No application link in demo data" data-testid="button-job-apply-disabled">No application link in demo data</button>}
          <p>Only listings with a supplied external application link can be opened. This sample does not include a link.</p>
        </section>
      </aside>
    </div>
    <div className="jobs-footnote"><span className="jobs-footnote-mark">i</span><span>Sample listing only. Role details, salary and availability are illustrative and have not been verified.</span></div>
  </div>;
}

export default JobDetailsPage;
