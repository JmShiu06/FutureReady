import type { AggregateRecord, Audience, CareerRole, DemoProfile, Evidence, Scenario, SdgGoal, SdgMapping, SkillMarketRecord } from './types';

export const audienceLabels: Record<Audience, string> = {
  adult: 'Working Adults', graduate: 'Graduates & Career Switchers',
  hr: 'HR & L&D Managers', education: 'University & TVET Career Centres',
};
export const syntheticEvidence: Evidence = {
  kind: 'synthetic', sourceName: 'FutureReady fictional demonstration records', sourceUrl: null,
  observationStart: '2026-01-01', observationEnd: '2026-09-30', lastUpdated: '2026-09-30',
  notes: 'Hand-authored examples, not observed labour-market evidence. No external dataset or live feed is connected.',
};
export const demoRoles: CareerRole[] = [
  { id: 'service-designer', title: 'Service design associate', category: 'Design & customer experience', industry: 'Services',
    description: 'Understand customer needs and help teams improve accessible, practical services.',
    requiredSkills: [{ name: 'Customer research', level: 3, priority: 'High' }, { name: 'Service blueprinting', level: 3, priority: 'High' }, { name: 'Data storytelling', level: 3, priority: 'Medium' }, { name: 'Facilitation', level: 3, priority: 'Medium' }],
    taskExposure: 'In this hypothetical role, AI may assist with research summaries. Interview ethics, interpretation and co-design still require human judgement.',
    demandLabel: 'Illustrative interest: steady', evidence: syntheticEvidence },
  { id: 'workforce-analyst', title: 'Workforce insights analyst', category: 'Data & workforce planning', industry: 'Business operations',
    description: 'Translate workforce and skills information into responsible planning decisions.',
    requiredSkills: [{ name: 'Excel', level: 3, priority: 'High' }, { name: 'Data storytelling', level: 4, priority: 'High' }, { name: 'Workforce planning', level: 3, priority: 'High' }, { name: 'Critical thinking', level: 3, priority: 'Medium' }],
    taskExposure: 'Routine data preparation could be assisted by AI. Validating evidence, protecting privacy and interpreting context remain human responsibilities.',
    demandLabel: 'Illustrative interest: growing', evidence: syntheticEvidence },
  { id: 'learning-partner', title: 'Learning experience partner', category: 'Education & people development', industry: 'Education',
    description: 'Build inclusive learning journeys and help people practise new capabilities.',
    requiredSkills: [{ name: 'Learning design', level: 3, priority: 'High' }, { name: 'Facilitation', level: 3, priority: 'High' }, { name: 'Project coordination', level: 3, priority: 'Medium' }, { name: 'Digital fluency', level: 3, priority: 'Medium' }],
    taskExposure: 'AI may draft learning materials; accessibility, learner feedback and instructional decisions need human review.',
    demandLabel: 'Illustrative interest: steady', evidence: syntheticEvidence },
  { id: 'ai-operations', title: 'Responsible AI operations coordinator', category: 'Technology & operations', industry: 'Business operations',
    description: 'Coordinate responsible use of AI tools and improve everyday operational workflows.',
    requiredSkills: [{ name: 'AI literacy', level: 3, priority: 'High' }, { name: 'Process improvement', level: 3, priority: 'High' }, { name: 'Critical thinking', level: 4, priority: 'High' }, { name: 'Project coordination', level: 3, priority: 'Medium' }],
    taskExposure: 'This sample role focuses on human oversight, exception handling and process accountability rather than a prediction of automation risk.',
    demandLabel: 'Illustrative interest: emerging', evidence: syntheticEvidence },
];
export const skillCatalogue = Array.from(new Set(demoRoles.flatMap(r => r.requiredSkills.map(s => s.name)))).sort();
export function sampleProfile(audience: Audience, variant: 'default' | 'data' = 'default'): DemoProfile {
  const graduate = audience === 'graduate' || audience === 'education';
  return {
    id: `fictional-${audience}`, audience,
    occupation: graduate ? 'Business information systems student' : 'Operations coordinator',
    experienceYears: graduate ? 0 : 4, education: graduate ? 'Fictional TVET programme' : 'Fictional continuing education programme',
    qualification: graduate ? 'Diploma' : 'Certificate', studyField: 'Business information systems',
    interests: ['Services', 'Business operations'], location: 'Malaysia', workPreference: 'Hybrid',
    learningHours: 5, budgetMYR: 200, goals: 'Explore an adjacent career and build practical skills.',
    skills: variant === 'data'
      ? [{ name: 'Excel', level: 4, category: 'Digital' }, { name: 'Data storytelling', level: 3, category: 'Digital' }, { name: 'Critical thinking', level: 3, category: 'Transferable' }]
      : [{ name: 'Project coordination', level: 4, category: 'Transferable' }, { name: 'Customer research', level: 3, category: 'People' }, { name: 'Data storytelling', level: 2, category: 'Digital' }, { name: 'Process improvement', level: 4, category: 'Transferable' }],
  };
}
export function blankProfile(audience: Audience): DemoProfile {
  return {
    ...sampleProfile(audience),
    occupation: '',
    experienceYears: null,
    education: '',
    qualification: '',
    studyField: '',
    interests: [],
    location: '',
    workPreference: '',
    learningHours: null,
    budgetMYR: null,
    goals: '',
  };
}
const marketSkills = [
  ['research', 'Customer research', 'People', 'Services', [31, 35, 34, 38]],
  ['data', 'Data storytelling', 'Digital', 'Business operations', [25, 30, 36, 40]],
  ['ai', 'AI literacy', 'Digital', 'Business operations', [12, 18, 23, 29]],
  ['learning', 'Learning design', 'People', 'Education', [21, 22, 24, 25]],
  ['process', 'Process improvement', 'Transferable', 'Services', [40, 39, 42, 44]],
] as const;
export const marketRecords: SkillMarketRecord[] = marketSkills.flatMap(([id, skill, category, industry, values]) =>
  ['Malaysia', 'Regional example'].map((region, ri) => ({
    id: `${id}-${ri}`, skill, category, industry, region,
    roleIds: demoRoles.filter(r => r.requiredSkills.some(s => s.name === skill)).map(r => r.id),
    demandLabel: 'Synthetic posting count', evidence: syntheticEvidence,
    observations: ['2026-01-01', '2026-04-01', '2026-07-01', '2026-09-30'].map((date, i) => ({ date, value: values[i] + ri * 3 })),
  })),
);
export const scenarios: Scenario[] = [
  { id: 'moderate', label: 'Moderate AI adoption', assumptions: ['Assistive tools adopted team by team.', 'Human review remains mandatory.', 'Existing workflows change gradually.'],
    prioritySkills: ['AI literacy', 'Data storytelling', 'Facilitation'], provenance: 'Manually authored workshop assumptions; no forecasting model.',
    uncertainty: 'Adoption, regulation and job design vary. No employment-loss or demand forecast is provided.', observedEvidence: null,
    roleImpacts: demoRoles.map(r => ({ roleId: r.id, explanation: `Assistive drafting and summarisation may support ${r.title.toLowerCase()} tasks; domain judgement remains central.` })) },
  { id: 'fast', label: 'Fast AI adoption', assumptions: ['Assistive tools spread across several functions at once.', 'Teams invest in oversight and change support.', 'Workflow redesign proceeds faster than in the moderate scenario.'],
    prioritySkills: ['AI literacy', 'Critical thinking', 'Process improvement', 'Workforce planning'], provenance: 'Manually authored workshop assumptions; no forecasting model.',
    uncertainty: 'This is not a likely-outcome estimate. There are no validated effect sizes or probabilities.', observedEvidence: null,
    roleImpacts: demoRoles.map(r => ({ roleId: r.id, explanation: `${r.title} teams may spend more time validating AI output, handling exceptions and redesigning processes.` })) },
];
export const aggregateRecords: AggregateRecord[] = Array.from({ length: 12 }, (_, i) => ({
  id: `synthetic-record-${i + 1}`, group: ['Operations', 'Customer experience', 'Learning & development'][i % 3],
  programme: ['Business information systems', 'Service management', 'Digital operations'][i % 3],
  targetRoleId: demoRoles[i % demoRoles.length].id,
  skills: sampleProfile('adult', i % 2 ? 'data' : 'default').skills.map((s, j) => ({ ...s, level: Math.min(5, Math.max(1, s.level + (i + j) % 3 - 1)) as 1 | 2 | 3 | 4 | 5 })),
}));
const goalNames = ['No Poverty', 'Zero Hunger', 'Good Health and Well-being', 'Quality Education', 'Gender Equality', 'Clean Water and Sanitation', 'Affordable and Clean Energy', 'Decent Work and Economic Growth', 'Industry, Innovation and Infrastructure', 'Reduced Inequalities', 'Sustainable Cities and Communities', 'Responsible Consumption and Production', 'Climate Action', 'Life Below Water', 'Life on Land', 'Peace, Justice and Strong Institutions', 'Partnerships for the Goals'];
export const sdgGoals: SdgGoal[] = goalNames.map((name, i) => ({ number: i + 1, name }));
export const sdgMappings: SdgMapping[] = [
  { goal: 4, roleId: 'learning-partner', skills: ['Learning design', 'Facilitation'], explanation: 'Accessible learning design could support inclusive education when deployed with learner access and outcome safeguards.', verified: false, citationName: null, citationUrl: null },
  { goal: 8, roleId: 'workforce-analyst', skills: ['Workforce planning', 'Data storytelling'], explanation: 'Responsible skills planning could support decent-work initiatives. Actual contribution depends on implementation and outcomes.', verified: false, citationName: null, citationUrl: null },
  { goal: 10, roleId: 'service-designer', skills: ['Customer research', 'Service blueprinting'], explanation: 'Inclusive service research could help identify access barriers; this example has no measured impact evidence.', verified: false, citationName: null, citationUrl: null },
  { goal: 9, roleId: 'ai-operations', skills: ['AI literacy', 'Process improvement'], explanation: 'Responsible process innovation could contribute to resilient systems, but the mapping has not been validated.', verified: false, citationName: null, citationUrl: null },
];
