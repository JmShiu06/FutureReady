import type { JobListing } from '../services/job_provider';
import { mycolSdgMappings, sdgMappings, roleSdgUseCases } from '@workspace/workforce-evidence';
import { occupationEvidence, matchOccupations } from '../lib/occupationEvidence';

const occupationReferences = matchOccupations([]).occupations;
// O*NET 31.0 supplies no ratings for Financial Analysts in this snapshot.
// These are fictional employer requirements in the existing O*NET vocabulary,
// NOT an imputation of absent occupational ratings or a new evidence source.
const financialSampleSkills = ['Mathematics', 'Critical Thinking', 'Reading Comprehension', 'Judgment and Decision Making', 'Writing', 'Active Listening'];

const sectors = ['clean energy', 'health', 'smart agriculture', 'responsible AI'] as const;
const locations = [
  ['Kuala Lumpur', 'Kuala Lumpur'], ['Selangor', 'Shah Alam'], ['Johor', 'Johor Bahru'],
  ['Penang', 'George Town'], ['Sabah', 'Kota Kinabalu'], ['Sarawak', 'Kuching'],
] as const;
const titles: Record<string, string[]> = {
  '1212': ['Employee Relations Manager', 'Fair Workplace Policy Manager', 'People Policy Manager'],
  '2221': ['Community Nurse', 'Clinical Nurse', 'Care Coordination Nurse'],
  '2413': ['Clean Energy Financial Analyst', 'Health Services Financial Analyst', 'Agriculture Investment Analyst'],
  '2431': ['Clean Energy Marketing Specialist', 'Health Campaign Specialist', 'Agriculture Marketing Specialist'],
  '2511': ['Agriculture Systems Analyst', 'Clinical Systems Analyst', 'Clean Energy Systems Analyst'],
  '2512': ['Responsible AI Software Developer', 'Health Software Developer', 'Agriculture Software Developer'],
  '2521': ['Clean Energy Database Administrator', 'Health Database Designer', 'Agriculture Database Administrator'],
  '2524': ['Data Analyst', 'Health Data Analyst', 'Smart Agriculture Data Analyst'],
  '2531': ['Cyber Security Analyst', 'Health Cyber Security Specialist', 'Energy Cyber Security Specialist'],
};
// Existing synthetic role scenarios, not additions to the reviewed crosswalk.
const scenarios = [
  { role: 'service-designer', code: '2431', title: 'Service Design Associate' },
  { role: 'workforce-analyst', code: '2524', title: 'Workforce Insights Analyst' },
  { role: 'learning-partner', code: '1212', title: 'Learning Experience Partner' },
  { role: 'ai-operations', code: '2511', title: 'Responsible AI Operations Coordinator' },
];

function makeListing(code: string, title: string, index: number, scenarioRole?: string): JobListing {
  const occupation = occupationEvidence.mycol.find(o => o.masco4 === code)!;
  const mapping = occupationEvidence.mappings.find(m => m.masco4 === code)!;
  if (!occupation || !mapping) throw new Error(`No existing occupation mapping record for ${code}`);
  const documented = occupationReferences.find(o => o.mycol.masco4 === code)!.documentedSkills;
  const requiredSkills = code === '2413' ? financialSampleSkills : documented.slice(0, 6).map(s => s.name);
  if (requiredSkills.length < 3) throw new Error(`Insufficient documented skills for sample occupation ${code}`);
  const [state, city] = locations[index % locations.length];
  const sdgRoleId = scenarioRole ?? `mycol-${code}`;
  const mappings = [...mycolSdgMappings, ...sdgMappings].filter(m => m.roleId === sdgRoleId);
  const useCase = roleSdgUseCases[sdgRoleId];
  const sdgTags = [...new Set(mappings.length ? mappings.map(m => m.goal) : useCase ? [useCase.goal] : [])];
  const workMode = code === '2221' ? 'on-site' : (['on-site', 'hybrid', 'remote'] as const)[index % 3];
  const sector = code === '2221' ? 'health' : sectors[index % sectors.length];
  const id = title === 'Data Analyst' ? 'demo-data-analyst' : `sample-${scenarioRole ?? code}-${index}`;
  const mappingScope = scenarioRole
    ? `Illustrative scenario grouped with ${occupation.title} for exploration, not an official MASCO classification of this sample title. The group's existing ${mapping.relation} MASCO–O*NET crosswalk is reused; no new crosswalk is asserted. ${mapping.limitations}`
    : `Existing manually reviewed ${mapping.relation} MASCO–O*NET crosswalk, not an official equivalence. ${mapping.limitations}`;
  const skillsNote = code === '2413'
    ? 'No O*NET occupational skill ratings are available for Financial Analysts in the existing snapshot. These six fictional employer requirements use O*NET skill names only; they are not verified occupational requirements, imputed ratings, or part of occupation ranking.'
    : 'Sample requirements are selected from the existing O*NET occupation reference; they are not verified requirements of a real Malaysian employer.';
  const mappingNote = `${mapping.status === 'unverified' ? 'Unverified crosswalk: this existing association is ambiguous and excluded from occupation recommendations. Listed sample skills describe only this fictional exercise, not a validated occupation match. ' : ''}${mappingScope} ${skillsNote}`;
  const sdgContext = mappings.map(m => m.explanation).join(' ') || (useCase
    ? `Hypothetical SDG ${useCase.goal}, target ${useCase.target} use case: ${useCase.context}. Duty: ${useCase.duty} Limitation: ${useCase.limitation}`
    : '');
  return {
    id, title, company: `${['Meranti', 'Cahaya', 'Rimba', 'Bayu', 'Kenari', 'Saujana'][index % 6]} ${sector} Studio (fictional)`,
    location: `${city}, ${state}, Malaysia`, state, city,
    occupationId: `mycol-${code}`, occupationName: occupation.title,
    mascoCode: code, onetCode: mapping.onetSocCode, onetTitle: mapping.onetTitle,
    mappingNote, mappingStatus: mapping.status, workMode, remote: workMode === 'remote', level: (['entry', 'mid', 'senior'] as const)[index % 3],
    salaryMin: null, salaryMax: null, employmentType: 'full-time',
    shortDescription: `Fictional ${sector} project using ${requiredSkills.slice(0, 2).join(' and ')}.`,
    description: `Sample listing (fictional). Explore ${title.toLowerCase()} work in a fictional ${sector} project. ${skillsNote}\n${sdgContext ? `Existing reviewed SDG scenario: ${sdgContext}\n` : ''}${mappingNote}\nNo real vacancy, employer, application destination or salary is supplied.`,
    requiredSkills, externalUrl: null, datePosted: '2026-10-23',
    companyInfo: 'Fictional Malaysian organisation created only for learning and career exploration; this is not a vacancy or a real employer.',
    demo: true, sdgRoleId, sdgTags,
  };
}

/** 27 MyCOL examples plus 12 examples covering the four existing synthetic roles. */
export const sampleJobs: JobListing[] = [
  ...occupationEvidence.mycol.flatMap((occupation, group) =>
    (titles[occupation.masco4] ?? []).map((title, i) => makeListing(occupation.masco4, title, group * 3 + i))),
  ...scenarios.flatMap((scenario, group) =>
    [scenario.title, `${scenario.title} — Community Services`, `${scenario.title} — Sustainable Operations`]
      .map((title, i) => makeListing(scenario.code, title, 27 + group * 3 + i, scenario.role))),
];
