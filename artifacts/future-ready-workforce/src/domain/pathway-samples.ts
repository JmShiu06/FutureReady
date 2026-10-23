import type { ProfileSkill } from './types';
/** Only synthetic skills; never writes over a saved profile or uploaded CV. */
export const pathwaySamples = [
  { id: 'it-graduate', label: 'Fresh IT graduate', description: 'Practise moving from study into a technical role.', skills: ['Reading Comprehension', 'Mathematics'] },
  { id: 'admin-to-data', label: 'Admin worker switching to data', description: 'Build on communication skills and explore analysis.', skills: ['Active Listening', 'Speaking', 'Writing'] },
  { id: 'factory-supervisor', label: 'Factory supervisor upskilling', description: 'Develop systems and problem-solving skills.', skills: ['Coordination', 'Monitoring', 'Time Management'] },
];
export const sampleStartingSkills = (id: string): ProfileSkill[] =>
  (pathwaySamples.find(s => s.id === id)?.skills ?? []).map(name => ({ name, level: 1, category: 'Synthetic starting skill · not assessed' }));
