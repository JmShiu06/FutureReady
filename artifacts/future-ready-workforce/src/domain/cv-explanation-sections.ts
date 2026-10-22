export type CvExplanationView = 'career' | 'learning';

export function cvExplanationSectionInView(key: string, view: CvExplanationView): boolean {
  const learningSection = key === 'improvementSuggestions' || key === 'areasForGrowth';
  return view === 'learning' ? learningSection : !learningSection;
}
