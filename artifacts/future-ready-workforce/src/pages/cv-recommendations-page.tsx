import { useEffect, useMemo, useRef, useState } from "react";
import { MatchScore } from "@/components/shared/match-score";
import { Link } from "wouter";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useMatchCvCareers, type CareerMatchResult } from "@workspace/api-client-react";
import { useWorkspace } from "@/domain/workspace-context";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/workspace/ui";
import { CandidateNameLabel } from "@/components/candidate-name-label";

/** CV recommendations use uploaded career titles, with existing pooled skill evidence. */
export function MatchedRolesTab() {
  const { profile } = useWorkspace();
  const hasCvSkills = profile.skills.some(
    (skill) => skill.cvDetected || skill.category === "CV detected",
  );
  const matchCareers = useMatchCvCareers();
  const [result, setResult] = useState<CareerMatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const requestVersion = useRef(0);

  const profileSkills = useMemo(
    () => [...new Set(profile.skills.map((skill) => skill.name.trim()).filter(Boolean))],
    [profile.skills],
  );
  const skillsKey = JSON.stringify(profileSkills);

  useEffect(() => {
    const version = ++requestVersion.current;
    let active = true;

    if (profileSkills.length === 0) {
      setResult(null);
      setError("");
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    setError("");
    matchCareers.mutateAsync({ data: { skills: profileSkills } })
      .then((response) => {
        if (active && requestVersion.current === version) setResult(response);
      })
      .catch((reason: unknown) => {
        if (!active || requestVersion.current !== version) return;
        setError(reason instanceof Error ? reason.message : "Could not create recommendations from your profile.");
        setResult(null);
      })
      .finally(() => {
        if (active && requestVersion.current === version) setLoading(false);
      });

    return () => { active = false; };
  }, [skillsKey, profileSkills, retryKey, matchCareers.mutateAsync]);

  const recommendations = result?.matches.slice(0, 5) ?? [];
  const skillMappings = result?.skillMappings ?? [];

  return (
    <>
      <div className="tab-intro">
        <CandidateNameLabel testId="text-candidate-job-matching" />
        <p className="muted small" data-testid="text-recommendation-scope">
          Career names from your uploaded AI Job Market Dataset, ranked by <b>exact / related skill overlap</b> with the skills saved in your profile.
        Related matches are labeled. These are role recommendations, not live vacancies or a hiring probability.
        </p>
        <Link href="/market-and-ai-impact?tab=ai-impact" className="btn btn-secondary btn-small" data-testid="link-ai-career-explanation">Open AI Career Explanation</Link>
      </div>

      {result && <details className="panel panel-pad" style={{ marginBottom: 16 }} data-testid="details-cv-career-source">
        <summary>Career names and score sources</summary>
        <p className="muted small">{result.scoring.note}</p>
        <p className="muted small">Skill reference dataset: {result.source.datasetName}. Its citation and licence apply to the skill evidence, not to the uploaded career-name file.</p>
      </details>}

      {!hasCvSkills && (
        <aside
          className="panel panel-pad"
          style={{ marginBottom: 16 }}
          aria-label="Add CV skills to your profile"
          data-testid="card-cv-profile-prompt"
        >
          <div className="spread" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>No CV-based skills are saved to this profile yet.</strong>
              <p className="muted small" style={{ margin: "4px 0 0" }}>
                Upload your CV or update your skills from your profile. You can review suggestions before saving them.
              </p>
            </div>
            <Link
              href="/my-profile"
              className="btn btn-primary"
              data-testid="button-go-to-profile-upload-cv"
            >
              Go to My profile
            </Link>
          </div>
        </aside>
      )}

      {profileSkills.length === 0 ? (
        <EmptyBlock title="Add skills to your profile to get recommendations.">
          Upload a CV or add skills from your profile, then return here to see matching roles.
        </EmptyBlock>
      ) : loading ? (
        <LoadingBlock rows={4} />
      ) : error ? (
        <ErrorBlock
          message={error}
          onRetry={() => setRetryKey((current) => current + 1)}
        />
      ) : recommendations.length === 0 ? (
        <EmptyBlock title="No exact role match found for your saved skills.">
          <span>The current role dataset does not list any of your profile skills. Review your profile or use a skill label that appears in the dataset.</span>
          <Link href="/my-profile" className="text-link" data-testid="link-review-profile-skills">
            Review profile skills
          </Link>
        </EmptyBlock>
      ) : (
        <section className="grid-2 recommendation-grid" aria-label="Recommended job roles" data-testid="list-job-recommendations">
          {recommendations.map((recommendation, index) => (
            <article
              className="panel panel-pad job-recommendation-card"
              key={recommendation.roleFamily}
              data-testid={`card-job-recommendation-${index}`}
            >
              <div className="spread" style={{ alignItems: "flex-start", gap: 12 }}>
                <div className="row" style={{ alignItems: "flex-start" }}>
                  <span className="rank" aria-label={`Rank ${index + 1}`}>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="eyebrow">Recommended role</div>
                    <h2 style={{ margin: "4px 0 0", fontSize: 20 }} data-testid={`text-recommended-role-${index}`}>
                      {recommendation.roleFamily}
                    </h2>
                    {recommendation.skillRoleFamily && <p className="muted small" style={{ margin: "6px 0 0" }} data-testid={`text-skill-reference-${index}`}>Skill reference: {recommendation.skillRoleFamily}</p>}
                  </div>
                </div>
                <MatchScore metric="overlap" value={recommendation.score} matched={recommendation.matchedSkills.length} considered={recommendation.skillsConsidered} testId={`text-skill-overlap-${index}`} />
              </div>

              <p className="muted small" style={{ margin: "12px 0" }}>
                {recommendation.matchedSkills.length} of {recommendation.skillsConsidered} skills listed for this role
                also appear in your profile.
              </p>

              {recommendation.matchedSkills.length > 0 && (
                <details className="recommendation-skills" data-testid={`details-recommendation-skills-${index}`}>
                  <summary>
                    <span className="recommendation-skills-closed">Show matched skills</span>
                    <span className="recommendation-skills-open">Hide matched skills</span>
                    {' '}<span className="muted small">({recommendation.matchedSkills.length})</span>
                  </summary>
                  <section
                    className="matched-skills-card"
                    aria-label={`Matched skills for ${recommendation.roleFamily}`}
                    data-testid={`card-matched-skills-${index}`}
                  >
                    <div className="matched-skills-header">
                      <div>
                        <h3 className="matched-skills-title">Matched skills</h3>
                        <p className="muted small" style={{ margin: "3px 0 0" }}>
                          Skills from your profile that contributed to this match.
                        </p>
                      </div>
                      <Link
                        href="/market-and-ai-impact?tab=ai-impact"
                        className="ai-skill-check-bar"
                        aria-label={`Open AI Skill Check for ${recommendation.roleFamily}`}
                        data-testid={`link-ai-skill-check-${index}`}
                      >
                        <Sparkles size={14} aria-hidden="true" />
                        <span>AI Skill Check</span>
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                    <div className="matched-skill-list">
                      {recommendation.matchedSkills.map((skill) => {
                        const mapping = skillMappings.find((item) => item.datasetSkill === skill);
                        return (
                          <div
                            className="matched-skill-item"
                            key={skill}
                            data-testid={`skill-reason-${index}-${skill.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                          >
                            <strong>{mapping?.profileSkill ?? skill}</strong>
                            {mapping?.matchType === "related" && (
                              <div className="muted small" style={{ marginTop: 4 }}>
                                Related dataset skill: {mapping.datasetSkill}
                              </div>
                            )}
                            <p className="muted small" style={{ margin: "4px 0 0" }}>
                              {mapping?.matchType === "related"
                                ? `The engine linked this profile wording to “${mapping.datasetSkill}”, a skill listed for this role.`
                                : "This profile skill is also listed for this role in the dataset."}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </details>
              )}
            </article>
          ))}
        </section>
      )}
    </>
  );
}
