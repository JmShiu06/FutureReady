/** Existing reviewed SDG mappings, shared by the UI and server. Relevance is not measured impact. */
export interface SdgMapping {
  goal: number; roleId: string; skills: string[]; explanation: string;
  status: 'source-supported' | 'unverified';
  sourceTitle: string | null; sourceUrl: string | null; sourceDate: string | null;
  sourceObservation: string | null;
}

export { mycolSdgMappings } from './mycol-sdg';
export { learningResources, learningResourceCatalog } from './learning-resources';
export type { CatalogSkill, VerifiedLearningResource } from './learning-resources';
export type { MycolSdgMapping, SdgCitation } from './mycol-sdg';
export * from './planning';
export * from './occupational-learning';
export * from './sdg-use-cases';
export * from './ai-capabilities';

export const sdgMappings: SdgMapping[] = [
  {
    goal: 4, roleId: 'learning-partner', skills: ['Learning design', 'Facilitation'],
    explanation: 'Targets 4.3–4.4 call for equitable access to technical and vocational education and relevant skills for work. That supports thematic relevance for learning design and facilitation, not evidence of this sample role’s outcomes.',
    status: 'source-supported', sourceTitle: 'Transforming our world: the 2030 Agenda for Sustainable Development (A/RES/70/1)',
    sourceUrl: 'https://docs.un.org/en/A/RES/70/1', sourceDate: '2015-09-25',
    sourceObservation: 'Targets 4.3–4.4 address access to technical, vocational and tertiary education and relevant skills for employment.',
  },
  {
    goal: 8, roleId: 'workforce-analyst', skills: ['Workforce planning', 'Data storytelling'],
    explanation: 'This is an unverified example: the source defines decent-work goals but does not establish that workforce planning or this sample role advances them.',
    status: 'unverified', sourceTitle: null, sourceUrl: null, sourceDate: null, sourceObservation: null,
  },
  {
    goal: 10, roleId: 'service-designer', skills: ['Customer research', 'Service blueprinting'],
    explanation: 'Target 10.2 calls for social and economic inclusion. Inclusive service research is thematically relevant, but the source does not show that this sample role removes barriers or reduces inequality.',
    status: 'source-supported', sourceTitle: 'Transforming our world: the 2030 Agenda for Sustainable Development (A/RES/70/1)',
    sourceUrl: 'https://docs.un.org/en/A/RES/70/1', sourceDate: '2015-09-25',
    sourceObservation: 'Target 10.2 calls for promoting social, economic and political inclusion of all.',
  },
  {
    goal: 9, roleId: 'ai-operations', skills: ['AI literacy', 'Process improvement'],
    explanation: 'This is an unverified example: the source defines goals for infrastructure and innovation but does not establish a link to this sample operations role.',
    status: 'unverified', sourceTitle: null, sourceUrl: null, sourceDate: null, sourceObservation: null,
  },
];
