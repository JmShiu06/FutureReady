import { useEffect, useMemo, useRef, useState } from "react";
import { MatchScore } from "@/components/shared/match-score";
import { Link } from "wouter";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useMatchCvCareers, type CareerMatchResult } from "@workspace/api-client-react";
import { useWorkspace } from "@/domain/workspace-context";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/workspace/ui";
import { useI18n } from '@/i18n/i18n-context';

/** CV recommendations use uploaded career titles, with existing pooled skill evidence. */
export function MatchedRolesTab() {
  const { t } = useI18n();
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
        <p className="muted small" data-testid="text-recommendation-scope">
          {t('mr.scope')}
        </p>
      <Link href="/market-and-ai-impact?tab=ai-impact" className="btn btn-secondary btn-small" data-testid="link-ai-career-explanation">{t('sa.open')}</Link>
      </div>

      {result && <details className="panel panel-pad" style={{ marginBottom: 16 }} data-testid="details-cv-career-source">
        <summary>{t('mr.sources')}</summary>
        <p className="muted small">{result.scoring.note}</p>
        <p className="muted small">{t('mr.datasetNote', { name: result.source.datasetName })}</p>
      </details>}

      {!hasCvSkills && (
        <aside
          className="panel panel-pad"
          style={{ marginBottom: 16 }}
          aria-label={t('mr.promptAria')}
          data-testid="card-cv-profile-prompt"
        >
          <div className="spread" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>{t('mr.promptTitle')}</strong>
              <p className="muted small" style={{ margin: "4px 0 0" }}>
                {t('mr.promptBody')}
              </p>
            </div>
            <Link
              href="/my-profile"
              className="btn btn-primary"
              data-testid="button-go-to-profile-upload-cv"
            >
              {t('mr.goProfile')}
            </Link>
          </div>
        </aside>
      )}

      {profileSkills.length === 0 ? (
        <EmptyBlock title={t('mr.emptyTitle')}>
          {t('mr.emptyBody')}
        </EmptyBlock>
      ) : loading ? (
        <LoadingBlock rows={4} />
      ) : error ? (
        <ErrorBlock
          message={error}
          onRetry={() => setRetryKey((current) => current + 1)}
        />
      ) : recommendations.length === 0 ? (
        <EmptyBlock title={t('mr.noMatchTitle')}>
          <span>{t('mr.noMatchBody')}</span>
          <Link href="/my-profile" className="text-link" data-testid="link-review-profile-skills">
            {t('mr.reviewSkills')}
          </Link>
        </EmptyBlock>
      ) : (
        <section className="grid-2 recommendation-grid" aria-label={t('mr.listAria')} data-testid="list-job-recommendations">
          {recommendations.map((recommendation, index) => (
            <article
              className="panel panel-pad job-recommendation-card"
              key={recommendation.roleFamily}
              data-testid={`card-job-recommendation-${index}`}
            >
              <div className="spread" style={{ alignItems: "flex-start", gap: 12 }}>
                <div className="row" style={{ alignItems: "flex-start" }}>
                  <span className="rank" aria-label={t('mr.rank', { n: index + 1 })}>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="eyebrow">{t('mr.recommended')}</div>
                    <h2 style={{ margin: "4px 0 0", fontSize: 20 }} data-testid={`text-recommended-role-${index}`}>
                      {recommendation.roleFamily}
                    </h2>
                    {recommendation.skillRoleFamily && <p className="muted small" style={{ margin: "6px 0 0" }} data-testid={`text-skill-reference-${index}`}>{t('mr.skillRef', { name: recommendation.skillRoleFamily })}</p>}
                  </div>
                </div>
                <MatchScore metric="overlap" value={recommendation.score} matched={recommendation.matchedSkills.length} considered={recommendation.skillsConsidered} testId={`text-skill-overlap-${index}`} />
              </div>

              <p className="muted small" style={{ margin: "12px 0" }}>
                {t('mr.overlapLine', { matched: recommendation.matchedSkills.length, considered: recommendation.skillsConsidered })}
              </p>

              {recommendation.matchedSkills.length > 0 && (
                <details className="recommendation-skills" data-testid={`details-recommendation-skills-${index}`}>
                  <summary>
                    <span className="recommendation-skills-closed">{t('mr.show')}</span>
                    <span className="recommendation-skills-open">{t('mr.hide')}</span>
                    {' '}<span className="muted small">({recommendation.matchedSkills.length})</span>
                  </summary>
                  <section
                    className="matched-skills-card"
                    aria-label={t('mr.matchedFor', { role: recommendation.roleFamily })}
                    data-testid={`card-matched-skills-${index}`}
                  >
                    <div className="matched-skills-header">
                      <div>
                        <h3 className="matched-skills-title">{t('mr.matchedTitle')}</h3>
                        <p className="muted small" style={{ margin: "3px 0 0" }}>
                          {t('mr.matchedBody')}
                        </p>
                      </div>
                      <Link
                        href="/market-and-ai-impact?tab=ai-impact"
                        className="ai-skill-check-bar"
                        aria-label={t('mr.aiCheckAria', { role: recommendation.roleFamily })}
                        data-testid={`link-ai-skill-check-${index}`}
                      >
                        <Sparkles size={14} aria-hidden="true" />
                        <span>{t('mr.aiCheck')}</span>
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
                                {t('mr.related', { skill: mapping.datasetSkill })}
                              </div>
                            )}
                            <p className="muted small" style={{ margin: "4px 0 0" }}>
                              {mapping?.matchType === "related"
                                ? t('mr.relatedBody', { skill: mapping.datasetSkill })
                                : t('mr.exactBody')}
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
