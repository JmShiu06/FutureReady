export const occupationalLearningResources = [
  {
    id: 'openlearn-decisions', title: 'Making decisions',
    provider: 'The Open University · OpenLearn', skills: ['Judgment and Decision Making'],
    url: 'https://www.open.edu/openlearn/money-business/leadership-management/making-decisions/content-section-0',
    coverageUrl: 'https://www.open.edu/openlearn/money-business/leadership-management/making-decisions/content-section-1.1',
    coverage: 'Published outcomes address decision processes, effective decisions, alternative perspectives and risk perception. Partial skill development, not professional competence.',
    hours: 4, timeBasis: 'Provider-stated full-course study time',
    costCaveat: 'Free course content at review. Account/optional participation record, device and internet conditions may vary; not a professional qualification.',
    prerequisites: ['Provider level: advanced. App recommendation: use a fictional workplace decision; no formal entry requirement stated.'], reviewedAt: '2026-10-23',
  },
  {
    id: 'openlearn-teams', title: 'Working in groups and teams',
    provider: 'The Open University · OpenLearn', skills: ['Coordination', 'Management of Personnel Resources'],
    url: 'https://www.open.edu/openlearn/money-business/leadership-management/working-groups-and-teams/content-section-0',
    coverageUrl: 'https://www.open.edu/openlearn/money-business/leadership-management/working-groups-and-teams/content-section---learningoutcomes',
    coverage: 'Team roles, development, management support and team performance provide partial practice for coordination and personnel management. This mapping is a reviewed app interpretation of published outcomes, not complete skill certification.',
    hours: 8, timeBasis: 'Provider-stated full-course study time',
    costCaveat: 'Free course content at review. Optional account/participation records do not confer a professional qualification. Internet/device costs excluded.',
    prerequisites: ['Provider level: advanced. Familiarity with a team context recommended by the app; use fictional team members.'], reviewedAt: '2026-10-23',
  },
  {
    id: 'openlearn-workplace-communication', title: 'Effective communication in the workplace',
    provider: 'The Open University · OpenLearn', skills: ['Active Listening'],
    url: 'https://www.open.edu/openlearn/money-business/effective-communication-the-workplace',
    coverageUrl: 'https://www.open.edu/openlearn/mod/oucontent/view.php?id=87005&section=2',
    coverage: 'Week 2 explicitly teaches active listening. The full course is introductory communication study, not verification of occupational proficiency.',
    hours: 24, timeBasis: 'Provider-stated full-course study time',
    costCaveat: 'Free course content; account may be needed for progress/participation record. Internet/device costs are not included. Participation is not a professional qualification.',
    prerequisites: ['Provider level: introductory; no formal prerequisite stated.'], reviewedAt: '2026-10-23',
  },
  {
    id: 'openlearn-managing-people', title: 'Managing and managing people',
    provider: 'The Open University · OpenLearn', skills: ['Time Management'],
    url: 'https://www.open.edu/openlearn/money-business/leadership-management/managing-and-managing-people/content-section-0',
    coverageUrl: 'https://www.open.edu/openlearn/money-business/leadership-management/managing-and-managing-people/content-section-0',
    coverage: 'Published learning outcomes explicitly include time pressures and time management. This is partial skill coverage, not a complete HR management qualification.',
    hours: 8, timeBasis: 'Provider-stated full-course study time',
    costCaveat: 'Free course content; account may be needed for a participation record. Internet/device costs are excluded; no professional credential is promised.',
    prerequisites: ['Provider level: advanced; familiarity with a managerial context is recommended by this app. No formal entry prerequisite stated.'], reviewedAt: '2026-10-23',
  },
] as const;

/** Authored exercises, not invented courses. All cases must remain fictional. */
const exercises: Record<string, [number, string]> = {
  'Reading Comprehension': [1.5, 'Read the cited occupational duties and UN target. Write a 200-word plain-language summary, separating stated facts from your interpretation.'],
  'Writing': [2, 'Draft a one-page fictional policy briefing: purpose, affected people, safeguards, escalation route and three limitations. Revise it for clarity.'],
  'Speaking': [1.5, 'Prepare and rehearse a three-minute explanation of your fictional case. Record questions a stakeholder might ask and answer them without unsupported claims.'],
  'Mathematics': [2, 'Create a fictional 12-row table. Calculate totals, percentages and one comparison; independently recompute them and explain denominator choices.'],
  'Critical Thinking': [2, 'Compare two possible actions in a fictional case. List evidence, assumptions, counterarguments and one reason you would change your decision.'],
  'Active Learning': [1.5, 'Study the cited role/skill description, identify two knowledge gaps, investigate an official reference and write a before/after reflection.'],
  'Learning Strategies': [2, 'Design a 20-minute fictional training activity with one measurable objective, demonstration, practice and feedback rubric.'],
  'Monitoring': [2, 'Design three process indicators for the fictional case. Specify how to check them, what could be misleading and when a human should intervene.'],
  'Social Perceptiveness': [1.5, 'Write two stakeholder perspectives on the fictional case. Distinguish observed statements from assumptions; draft five non-leading questions.'],
  'Coordination': [2, 'Create a responsibility and hand-off table for four fictional team members. Resolve one conflicting deadline and document the agreement.'],
  'Persuasion': [1.5, 'Write two evidence-based proposals for different fictional stakeholders, with trade-offs, an objection and an ethical limit.'],
  'Negotiation': [2, 'Create a fictional labour-relations negotiation brief: interests of both parties, non-negotiable rights, options and an escalation route. Do not treat this as legal advice.'],
  'Instructing': [2, 'Create a five-step how-to guide and an understanding check for the fictional case. Test it yourself and correct an ambiguous instruction.'],
  'Service Orientation': [1.5, 'Map a fictional service user’s needs and barriers. Propose one accessible improvement and a feedback question without claiming measured impact.'],
  'Complex Problem Solving': [3, 'Map a fictional problem’s causes and constraints. Compare three remedies, define a safe small test and state how failure would be recognised.'],
  'Judgment and Decision Making': [2, 'Build a decision matrix for three fictional options, including cost, rights, risks and uncertainty. Explain and challenge your weights.'],
  'Systems Analysis': [3, 'Draw the fictional process inputs, outputs and dependencies. Identify one bottleneck and how a proposed change could affect other stakeholders.'],
  'Systems Evaluation': [2, 'Define acceptance checks for the fictional process, run a tabletop failure case and write a corrective-action note.'],
  'Management of Financial Resources': [2, 'Allocate a fictional MYR 1,000 training budget. Document assumptions, opportunity costs, access needs and a simple expenditure log.'],
  'Management of Personnel Resources': [2, 'Create a fictional team development plan with fair allocation, learning support and a grievance/escalation route. Do not rank real people.'],
};
export function practiceForSkill(skill: string) {
  const technical: Record<string, [number, string]> = {
    python: [3, 'Using invented aggregate records only, write a small Python script that validates missing values and counts categories. Include a failing-input test, reproducible output and a limitations note; do not use personal data.'],
    sql: [2, 'Create a fictional three-table dataset and SQL queries for joins, counts and missing values. Verify row counts manually and document how duplicate records would bias a public statistical report.'],
    programming: [3, 'Build a small fictional input-validation function with normal, malformed and boundary tests. Keep a change log, explain its failure modes and review how unnoticed errors could undermine an accountable public service.'],
    mathematics: [2, 'Calculate rates for a fictional aggregate table with clear denominators. Compare weighted and unweighted summaries, show rounding effects and document why these are not official statistics.'],
    science: [2, 'Design a fictional evidence appraisal with a testable question, comparison, confounders and safety limits. Distinguish an observation from a causal claim; no clinical decisions or medical advice.'],
    troubleshooting: [2, 'Diagnose a deliberately broken fictional service using an error log, two competing hypotheses and reversible tests. Record the verified cause, safe recovery and prevention checks.'],
    'quality control analysis': [2, 'Define acceptance limits for a fictional dataset or service, sample test cases and record false positives/negatives. Write a corrective-action plan and explicitly state what was not tested.'],
  };
  const key = Object.keys(exercises).find(k => k.toLowerCase() === skill.toLowerCase());
  const [hours, activity] = technical[skill.toLowerCase()] ?? exercises[key ?? ''] ?? [2, `Read the cited O*NET definition of ${skill}. Create a small fictional role-specific example, document your method and output, then check it against three explicit criteria. List what this exercise cannot demonstrate.`];
  return { hours, activity, timeBasis: 'App-estimated practice time; not a provider duration', reviewedAt: '2026-10-23' };
}
