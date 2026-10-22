import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useMatchCareers, type CareerMatchResult } from "@workspace/api-client-react";
import { useWorkspace } from "@/domain/workspace-context";
import { EmptyBlock, ErrorBlock, LoadingBlock, PageHead } from "@/components/workspace/ui";

export default function CvRecommendationsPage() {
  const { profile } = useWorkspace();
  const hasCvSkills = profile.skills.some(
    (skill) => skill.cvDetected || skill.category === "CV detected",
  );
  const matchCareers = useMatchCareers();
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
      <PageHead
        eyebrow="Job recommendations · saved profile"
        title="Your job recommendations"
        subtitle="Recommendations use the skills saved in your profile. Each role shows the exact or related skill matches that contributed."
      />
      <p className="muted small" style={{ margin: "-8px 0 18px" }} data-testid="text-recommendation-scope">
        Related matches are labeled. These are role recommendations, not live vacancies or a hiring probability.
      </p>

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
              href="/profile"
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
          <Link href="/profile" className="text-link" data-testid="link-review-profile-skills">
            Review profile skills
          </Link>
        </EmptyBlock>
      ) : (
        <section className="stack" aria-label="Recommended job roles" data-testid="list-job-recommendations">
          {recommendations.map((recommendation, index) => (
            <article
              className="panel panel-pad"
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
                  </div>
                </div>
                <span className="match-pill" data-testid={`text-skill-overlap-${index}`}>
                  {recommendation.score}% skill overlap
                </span>
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
                  <div className="stack" aria-label={`How your skills relate to ${recommendation.roleFamily}`}>
                    {recommendation.matchedSkills.map((skill) => {
                      const mapping = skillMappings.find((item) => item.datasetSkill === skill);
                      return (
                        <div
                          className="panel"
                          key={skill}
                          style={{ padding: "11px 13px", background: "var(--surface, #fff)" }}
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
                </details>
              )}
            </article>
          ))}
        </section>
      )}
    </>
  );
}
