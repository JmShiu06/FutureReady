/** Curated public courses. Coverage is an app-reviewed learning aid, not a proficiency equivalence.
 * SDG tags describe learning intentions (4.4, 8.5, 9.5), not provider endorsement or measured impact.
 * Only provider-stated course hours are recorded. Optional exam/credential and device costs excluded.
 */
export interface CourseResource {
  id: string; title: string; provider: string; url: string;
  cost: 'Free' | 'Free audit' | 'HRD Corp-claimable' | `Low-cost MYR ${number}`;
  costMYR: number | null; hours: number | null;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  skills: string[]; sdgs: number[]; verified_on: string;
  status: 'verified' | 'check-availability';
  coverage: string; sourceUrl: string; timeBasis: string; costCaveat: string;
}
const openLearn = {
  provider: 'The Open University · OpenLearn', cost: 'Free' as const, costMYR: 0,
  verified_on: '2026-10-23', status: 'verified' as const,
  timeBasis: 'Provider-stated full-course study time; pace varies.',
  costCaveat: 'Free content at review. Account may be needed for progress. Device/internet costs excluded; no professional qualification promised.',
};
export const courseCatalog: CourseResource[] = [
  {
    ...openLearn, id: 'ol-communication', title: 'Effective communication in the workplace',
    url: 'https://www.open.edu/openlearn/money-business/effective-communication-the-workplace',
    sourceUrl: 'https://www.open.edu/openlearn/mod/oucontent/view.php?id=87012&section=2',
    hours: 24, level: 'Beginner', skills: ['Active Listening', 'Speaking', 'Writing'], sdgs: [4, 8],
    coverage: 'Course description covers verbal and written communication; Week 2 teaches active listening. Partial introductory coverage of these O*NET skills, not full occupational competence.',
  },
  {
    ...openLearn, id: 'ol-critical-thinking', title: 'Making creativity and innovation happen',
    url: 'https://www.open.edu/openlearn/money-business/making-creativity-and-innovation-happen/content-section-overview',
    sourceUrl: 'https://www.open.edu/openlearn/money-business/making-creativity-and-innovation-happen/content-section-5.2',
    hours: 10, level: 'Intermediate', skills: ['Critical Thinking', 'Complex Problem Solving'], sdgs: [4, 8, 9],
    coverage: 'Section 5 compares tame and wicked problems and creative and critical thinking. Introductory practice within a wider innovation course; not complete problem-solving mastery.',
  },
  {
    ...openLearn, id: 'ol-systems', title: 'Systems thinking and practice',
    url: 'https://www.open.edu/openlearn/digital-computing/systems-thinking-and-practice/content-section-0',
    sourceUrl: 'https://www.open.edu/openlearn/digital-computing/systems-thinking-and-practice/content-section-0?intro=1',
    hours: 8, level: 'Intermediate', skills: ['Systems Analysis'], sdgs: [4, 8, 9],
    coverage: 'Learning outcomes explicitly address analysing and improving situations using systems concepts, boundaries and feedback. Partial coverage of Systems Analysis only; not Systems Evaluation certification.',
  },
  {
    ...openLearn, id: 'ol-arithmetic', title: 'Numbers, units and arithmetic',
    url: 'https://www.open.edu/openlearn/science-maths-technology/mathematics-statistics/numbers-units-and-arithmetic/content-section-0',
    sourceUrl: 'https://www.open.edu/openlearn/science-maths-technology/mathematics-statistics/numbers-units-and-arithmetic/content-section-5.1',
    hours: 5, level: 'Beginner', skills: ['Mathematics'], sdgs: [4, 8],
    coverage: 'Learning outcomes cover whole numbers, decimals, fractions and units. Foundational arithmetic only, not all mathematics required by an occupation.',
  },
  {
    ...openLearn, id: 'ol-time-management', title: 'Managing and managing people',
    url: 'https://www.open.edu/openlearn/money-business/leadership-management/managing-and-managing-people/content-section-0',
    sourceUrl: 'https://www.open.edu/openlearn/money-business/leadership-management/managing-and-managing-people/content-section-1',
    hours: 8, level: 'Advanced', skills: ['Time Management'], sdgs: [4, 8],
    coverage: 'Published outcomes explicitly include time pressures and time management. Partial coverage; app recommends familiarity with a managerial context.',
  },
  {
    ...openLearn, id: 'ol-learning-how-to-learn', title: 'Learning how to learn',
    url: 'https://www.open.edu/openlearn/education-development/learning-how-learn/content-section-0',
    sourceUrl: 'https://www.open.edu/openlearn/education-development/learning-how-learn/content-section-9.1',
    hours: 6, level: 'Beginner', skills: ['Active Learning', 'Learning Strategies'], sdgs: [4, 8],
    coverage: 'Outcomes apply learning ideas to existing study and reflective learning. Preparation, exploration, implementation and review connect new learning with future study and assessment. Partial study-context coverage of Active Learning and Learning Strategies, not full workplace competence.',
  },
  {
    ...openLearn, id: 'ol-monitoring', title: "Understanding management: I'm managing thank you!",
    url: 'https://www.open.edu/openlearn/money-business/leadership-management/understanding-management-im-managing-thank-you/content-section-0',
    sourceUrl: 'https://www.open.edu/openlearn/money-business/leadership-management/understanding-management-im-managing-thank-you/content-section-4',
    hours: 5, level: 'Beginner', skills: ['Monitoring'], sdgs: [4, 8],
    coverage: 'Section 4 logs and evaluates personal work against criteria, identifies changes and reviews their effectiveness. Partial self-performance coverage of Monitoring, not monitoring other people or organisational systems.',
  },
  {
    ...openLearn, id: 'ol-decision-making', title: 'Making decisions',
    url: 'https://www.open.edu/openlearn/money-business/leadership-management/making-decisions/content-section-0',
    sourceUrl: 'https://www.open.edu/openlearn/money-business/leadership-management/making-decisions/content-section-2.2',
    hours: 4, level: 'Advanced', skills: ['Judgment and Decision Making'], sdgs: [4, 8],
    coverage: 'Activity 2 examines financial and opportunity costs, benefits and likely outcomes of options; outcomes include more effective decisions and understanding risk. Partial coverage of Judgment and Decision Making, not validated occupational judgement.',
  },
  {
    id: 'cisco-python-essentials-1', title: 'Python Essentials 1',
    provider: 'Cisco Networking Academy · OpenEDG Python Institute',
    url: 'https://www.netacad.com/courses/python-essentials-1?courseLang=en-US',
    sourceUrl: 'https://skillsforall.com/course/python-essentials-1?courseLang=en-US',
    cost: 'Free', costMYR: 0, hours: 30, level: 'Beginner',
    skills: ['Programming'], sdgs: [4, 8, 9], verified_on: '2026-10-23', status: 'verified',
    coverage: 'Reviewed outcomes explicitly include designing, developing, debugging and refactoring simple Python programs. This is bounded Python-based coverage of Programming, not proof that a role requires Python.',
    timeBasis: 'Provider states 30 hours for the full course.',
    costCaveat: 'Free self-paced course at review. Account required; optional PCEP exam is separate and not included. Device/internet costs excluded.',
  },
];
