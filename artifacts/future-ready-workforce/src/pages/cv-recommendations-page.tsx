import { CareerMatcher } from "@/components/career-matcher";
import { PageHead } from "@/components/workspace/ui";
import { useWorkspace } from "@/domain/workspace-context";

export default function CvRecommendationsPage() {
  const { profile } = useWorkspace();
  const savedSkills = profile.skills.map((skill) => skill.name);

  return (
    <>
      <PageHead
        eyebrow="CV analysis · role recommendations"
        title="Find roles that match your skills."
        subtitle="Upload your CV, review the skills we detect, and choose which ones to use for role recommendations."
      />
      <section className="panel panel-pad" style={{ marginBottom: 18 }} data-testid="panel-cv-analysis-method">
        <strong>How this engine works</strong>
        <p className="muted" style={{ margin: "8px 0 0" }}>
          The app extracts skill names and compares the skills you confirm with published role-skill
          lists. Recommendations show skill overlap only—not hiring chances, job eligibility, or a
          validated AI assessment. Your CV and extracted text are processed transiently and are not
          saved or sent to an external AI service.
        </p>
      </section>
      <CareerMatcher
        savedSkills={savedSkills}
        onConfirmSkills={() => undefined}
      />
    </>
  );
}
