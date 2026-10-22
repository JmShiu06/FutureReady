import { useState } from 'react';
import { Info } from 'lucide-react';
import { Link } from 'wouter';
import { useWorkspace } from '@/domain/workspace-context';
import { PageHead, slug } from '@/components/workspace/ui';

type TaskTrait = 'repeatable' | 'digital' | 'judgement' | 'people' | 'physical';

const taskTraits: { id: TaskTrait; label: string }[] = [
  { id: 'repeatable', label: 'It involves repeated or rule-based steps.' },
  { id: 'digital', label: 'It is mostly done with text, data, or digital tools.' },
  { id: 'judgement', label: 'It needs nuanced judgment, exceptions, or accountability.' },
  { id: 'people', label: 'It depends on relationships, care, negotiation, or communication.' },
  { id: 'physical', label: 'It involves physical or on-site work.' },
];

function assessTasks(selected: TaskTrait[]) {
  if (!selected.length) {
    return {
      label: 'Not assessed',
      tone: 'pending',
      explanation: 'Select the task characteristics that fit how you use this skill.',
    };
  }

  const repeatableDigital = selected.includes('repeatable') && selected.includes('digital');
  const needsHumanInput = selected.some(trait => ['judgement', 'people', 'physical'].includes(trait));

  if (repeatableDigital && !needsHumanInput) {
    return {
      label: 'More automatable task steps',
      tone: 'higher',
      explanation: 'AI may handle a larger share of the repeatable digital steps you described. People still need to check errors, exceptions, and accountability.',
    };
  }
  if (repeatableDigital || selected.includes('repeatable') || selected.includes('digital')) {
    return {
      label: 'AI may assist with parts',
      tone: 'assist',
      explanation: 'AI may speed up repeatable or digital parts of the work. The judgment, people-facing, or physical parts you selected still need human input.',
    };
  }
  return {
    label: 'More human-led work',
    tone: 'human',
    explanation: 'The task characteristics you selected rely more on human judgment, relationships, or physical context. AI could still help with related preparation or documentation.',
  };
}

export default function ScenariosPage() {
  const { profile } = useWorkspace();
  const [traitsBySkill, setTraitsBySkill] = useState<Record<string, TaskTrait[]>>({});

  const toggleTrait = (skillKey: string, trait: TaskTrait) => {
    setTraitsBySkill(current => {
      const selected = current[skillKey] ?? [];
      return {
        ...current,
        [skillKey]: selected.includes(trait)
          ? selected.filter(item => item !== trait)
          : [...selected, trait],
      };
    });
  };

  return <>
    <PageHead
      eyebrow="AI skill check · task-level reflection"
      title="Could AI easily replace your skills?"
      subtitle="Review the tasks behind your saved skills. AI may automate parts of work or assist a person; this is a qualitative self-check, not a forecast."
    />

    <aside className="panel panel-pad ai-exposure-intro" data-testid="panel-ai-exposure-boundary">
      <Info size={17} aria-hidden="true" />
      <div>
        <strong>Assess the tasks, not the person.</strong>
        <p className="muted">
          A skill is not replaced as a whole. Your result is based only on the task characteristics you select here;
          this page does not use an AI model or a validated exposure dataset. Your selections are not saved to your profile.
        </p>
      </div>
    </aside>

    {profile.skills.length === 0 ? (
      <div className="state-box" data-testid="state-no-ai-skills">
        <strong>Add skills before reviewing their task exposure.</strong>
        <p className="muted">Your saved profile skills will appear here for a task-by-task self-check.</p>
        <Link href="/profile" className="btn btn-primary" data-testid="link-ai-check-profile">Go to My profile</Link>
      </div>
    ) : (
      <section className="ai-skill-list" aria-label="AI task exposure self-check" data-testid="list-ai-skill-checks">
        {profile.skills.map((skill, index) => {
          const skillKey = skill.name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
          const selected = traitsBySkill[skillKey] ?? [];
          const assessment = assessTasks(selected);
          const fieldsetId = `ai-task-${index}-${slug(skill.name) || 'skill'}`;

          return (
            <article className="panel ai-skill-card" key={skillKey} data-testid={`card-ai-skill-${index}`}>
              <div className="ai-skill-card-head">
                <div>
                  <h2>{skill.name}</h2>
                  <span className="muted small">Profile level {skill.level} of 5</span>
                </div>
                <span className={`ai-exposure-badge ${assessment.tone}`} data-testid={`text-ai-exposure-${index}`}>
                  {assessment.label}
                </span>
              </div>

              <p className="ai-exposure-explanation" data-testid={`text-ai-explanation-${index}`}>
                {assessment.explanation}
              </p>

              <details className="ai-skill-details">
                <summary>Review tasks for this skill</summary>
                <fieldset id={fieldsetId} className="ai-task-traits">
                  <legend>Which descriptions fit how you use {skill.name}?</legend>
                  {taskTraits.map(trait => {
                    const inputId = `${fieldsetId}-${trait.id}`;
                    return (
                      <label className="ai-task-trait" htmlFor={inputId} key={trait.id}>
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={selected.includes(trait.id)}
                          onChange={() => toggleTrait(skillKey, trait.id)}
                          data-testid={`checkbox-ai-trait-${index}-${trait.id}`}
                        />
                        <span>{trait.label}</span>
                      </label>
                    );
                  })}
                </fieldset>
              </details>
            </article>
          );
        })}
      </section>
    )}

    <p className="ai-exposure-footnote" data-testid="text-ai-exposure-method">
      Results describe potential task support from your answers, not whether a job will disappear or a person will be replaced.
    </p>
  </>;
}
