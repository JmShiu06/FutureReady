import type { SdgMapping } from './index';

export interface SdgCitation {
  kind: 'UN target' | 'Occupational duties' | 'MyCOL scope';
  title: string;
  url: string;
  /** Null means the cited page does not supply a publication date. */
  publishedAt: string | null;
  accessedAt: string;
  observation: string;
}

export interface MycolSdgMapping extends SdgMapping {
  status: 'source-supported';
  target: string;
  reviewedAt: string;
  scope: string;
  citations: SdgCitation[];
}

const reviewedAt = '2026-10-22';
const reportUrl = 'https://www.talentcorp.com.my/images/uploads/publication/204/MyMahir-Malaysia-Critical-Occupations-List-MyCOL20242025-1773385490.pdf';
const unTitle = 'Transforming our world: the 2030 Agenda for Sustainable Development (A/RES/70/1)';

/**
 * Application-authored relevance overlay, NOT official MyCOL/UN classifications.
 * Kept separate from sample-role mappings: the existing synthetic-only AI goal
 * endpoint cannot select a real occupation and must not silently explain one.
 * No skill requirements, rankings or source dataset records are changed here.
 */
export const mycolSdgMappings: MycolSdgMapping[] = [
  {
    roleId: 'mycol-2221', goal: 3, target: '3.8', skills: [],
    status: 'source-supported', reviewedAt,
    explanation: 'Target 3.8 includes access to quality essential health-care services. O*NET documents registered nurses providing health care, administering medicines and coordinating patient care plans. Those duties support thematic relevance to the health-service component of this target, not evidence that an individual nurse or occupation achieves universal coverage.',
    sourceTitle: unTitle, sourceUrl: 'https://docs.un.org/en/A/RES/70/1',
    sourceDate: '2015-09-25',
    sourceObservation: 'Target 3.8 calls for universal health coverage, including access to quality essential health-care services.',
    scope: 'Applies to clinical nursing duties within MyCOL Nursing Professionals (MASCO 2221), using the approximate O*NET Registered Nurses crosswalk. O*NET describes US work; Malaysian licensing and practice differ. Nurse Instructor duties are not assessed by this link. No claim about affordability, financial protection, Malaysian service coverage or patient outcomes is made.',
    citations: [
      {
        kind: 'UN target', title: 'UN DESA · Goal 3, target 3.8',
        url: 'https://sdgs.un.org/goals/goal3', publishedAt: null, accessedAt: reviewedAt,
        observation: 'Target 3.8: “Achieve universal health coverage, including financial risk protection, access to quality essential health-care services and access to safe, effective, quality and affordable essential medicines and vaccines for all”. Target adopted on 2015-09-25; the live page has no single publication date.',
      },
      {
        kind: 'Occupational duties', title: 'O*NET OnLine · 29-1141.00 Registered Nurses · Tasks',
        url: 'https://www.onetonline.org/link/summary/29-1141.00#Tasks', publishedAt: null, accessedAt: reviewedAt,
        observation: 'Tasks include “Administer medications to patients and monitor patients for reactions or side effects”, providing health care, first aid or immunizations, and coordinating with healthcare team members to assess, plan, implement or evaluate patient care plans.',
      },
      {
        kind: 'MyCOL scope', title: 'TalentCorp · MyCOL 2024/2025 · Nursing Professionals, report p. 204',
        url: reportUrl, publishedAt: null, accessedAt: '2026-10-21',
        observation: 'Existing reviewed MyCOL transcription: MASCO 2221 includes Professional Nurse, Clinical Nurse, Nurse Instructor, Nurse and Operation Theatre Nurse. The edition is 2024/2025; publication date is not stated.',
      },
    ],
  },
  {
    roleId: 'mycol-1212', goal: 8, target: '8.8', skills: [],
    status: 'source-supported', reviewedAt,
    explanation: 'Target 8.8 calls for protecting labour rights and safe working environments. O*NET documents HR managers negotiating bargaining agreements, interpreting labour contracts and advising on equal employment opportunity and sexual harassment policies. These labour-relations duties support thematic relevance to the labour-rights component, not proof of rights protection or safer workplaces.',
    sourceTitle: unTitle, sourceUrl: 'https://docs.un.org/en/A/RES/70/1',
    sourceDate: '2015-09-25',
    sourceObservation: 'Target 8.8 calls for protecting labour rights and promoting safe and secure working environments for all workers.',
    scope: 'Applies only to HR labour-relations duties in MyCOL Human Resource Managers (MASCO 1212), using the narrower O*NET Human Resources Managers crosswalk. It does not assess MyCOL Training Manager or occupational safety and health manager titles. US duty descriptions are not Malaysian legal advice. No measured compliance, safety or migrant-worker outcomes are asserted.',
    citations: [
      {
        kind: 'UN target', title: 'UN DESA · Goal 8, target 8.8',
        url: 'https://sdgs.un.org/goals/goal8', publishedAt: null, accessedAt: reviewedAt,
        observation: 'Target 8.8: “Protect labour rights and promote safe and secure working environments for all workers, including migrant workers, in particular women migrants, and those in precarious employment”. Target adopted on 2015-09-25; the live page has no single publication date.',
      },
      {
        kind: 'Occupational duties', title: 'O*NET OnLine · 11-3121.00 Human Resources Managers · Tasks',
        url: 'https://www.onetonline.org/link/summary/11-3121.00#Tasks', publishedAt: null, accessedAt: reviewedAt,
        observation: 'Tasks include “Negotiate bargaining agreements and help interpret labor contracts” and “Advise managers on organizational policy matters, such as equal employment opportunity and sexual harassment, and recommend needed changes”.',
      },
      {
        kind: 'MyCOL scope', title: 'TalentCorp · MyCOL 2024/2025 · Human Resource Managers, report p. 112',
        url: reportUrl, publishedAt: null, accessedAt: '2026-10-21',
        observation: 'Existing reviewed MyCOL transcription: MASCO 1212 includes HR leadership, Training Manager and occupational safety/health manager titles. Only the HR subset is covered by this SDG relevance mapping. Publication date is not stated.',
      },
    ],
  },
];
