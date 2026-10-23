import type { ProfileSkill, DemoProfile } from './types';
/** Only synthetic skills; never writes over a saved profile or uploaded CV. */
export const pathwaySamples = [
  { id: 'it-graduate', name: 'Aina', label: 'Aina - fresh IT graduate', description: 'Fictional sample · explore a first technical role.', skills: ['Reading Comprehension', 'Mathematics'], levels: [3, 3], experience: 0, interests: ['Software', 'Problem solving'], hours: 5, budget: 0, occupation: 'IT graduate' },
  { id: 'admin-to-data', name: 'Ravi', label: 'Ravi - admin clerk whose tasks are being automated', description: 'Fictional sample · routine document tasks are being assisted.', skills: ['Active Listening', 'Speaking', 'Writing'], levels: [3, 3, 3], experience: 4, interests: ['Data analysis', 'Office processes'], hours: 6, budget: 0, occupation: 'Admin clerk' },
  { id: 'retail-to-hr', name: 'Mei Ling', label: 'Mei Ling - retail supervisor switching to HR', description: 'Fictional sample · bring team experience into HR.', skills: ['Coordination', 'Service Orientation', 'Time Management'], levels: [3, 4, 3], experience: 6, interests: ['Human resources', 'Employee development'], hours: 7, budget: 100, occupation: 'Retail supervisor' },
  { id: 'factory-supervisor', name: 'Farid', label: 'Farid - factory supervisor upskilling', description: 'Fictional sample · develop systems and problem-solving skills.', skills: ['Coordination', 'Monitoring', 'Time Management'], levels: [4, 3, 3], experience: 8, interests: ['Process improvement', 'Team development'], hours: 4, budget: 50, occupation: 'Factory supervisor' },
];
export const sampleStartingSkills = (id: string): ProfileSkill[] => {
  const sample = pathwaySamples.find(s => s.id === id);
  return (sample?.skills ?? []).map((name, i) => ({ name, level: (sample?.levels[i] ?? 1) as ProfileSkill['level'], category: 'Fictional sample · not assessed' }));
};
export function fictionalProfile(current: DemoProfile, id: string): DemoProfile {
  const sample = pathwaySamples.find(s => s.id === id);
  if (!sample) throw new Error('Choose a fictional sample.');
  return { ...current, sampleId: id as DemoProfile['sampleId'], occupation: sample.occupation, experienceYears: sample.experience,
    interests: [...sample.interests], skills: sampleStartingSkills(id), learningHours: sample.hours, budgetMYR: sample.budget,
    education: id === 'it-graduate' ? 'Fictional IT degree' : 'Fictional vocational studies', qualification: '', studyField: '',
    location: 'Malaysia', workPreference: 'Any', goals: `Fictional demonstration: ${sample.label}.` };
}
export function sampleCvText(id: string) {
  const s = pathwaySamples.find(p => p.id === id);
  if (!s) throw new Error('Unknown sample');
  return `${s.name}\nFICTIONAL SAMPLE CV - demonstration only; not a real person\n\nProfile\n${s.occupation} with ${s.experience} years of fictional experience.\n\nSkills\n${sampleStartingSkills(id).map(skill => `- ${skill.name} (illustrative level ${skill.level}/5)`).join('\n')}\n\nExperience\n${s.description}\n\nInterests\n${s.interests.join(', ')}\n\nLearning preferences\n${s.hours} hours/week; budget MYR ${s.budget}.\nNo age, gender, contact details or real employment records.\n`;
}
