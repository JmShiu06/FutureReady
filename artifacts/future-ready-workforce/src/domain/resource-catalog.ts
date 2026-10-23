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
  applicableRoleIds?: string[];
}
const openLearn = {
  provider: 'The Open University · OpenLearn', cost: 'Free' as const, costMYR: 0,
  verified_on: '2026-10-23', status: 'verified' as const,
  timeBasis: 'Provider-stated full-course study time; pace varies.',
  costCaveat: 'Free content at review. Account may be needed for progress. Device/internet costs excluded; no professional qualification promised.',
};
export const courseCatalog: CourseResource[] = [
  {
    id: 'saylor-esl001', title: 'ESL001: Elementary English as a Second Language', provider: 'Saylor University',
    url: 'https://learn.saylor.org/course/view.php?id=1279', sourceUrl: 'https://learn.saylor.org/mod/page/view.php?id=92274',
    cost: 'Free', costMYR: 0, hours: 18, level: 'Beginner', verified_on: '2026-10-23', status: 'verified',
    skills: ['Reading Comprehension'], sdgs: [4, 8],
    coverage: 'Provider explicitly teaches comprehension strategies for non-fiction and job-related texts at CEFR A2. Optional foundational English-context practice only, not proof of occupational comprehension or a language requirement for the role.',
    timeBasis: 'Provider syllabus and course page both state 18 hours for the full course.',
    costCaveat: 'Provider states all materials, enrolment and course certificate are free; account required for assessments. Not a professional qualification.',
  },
  {
    id: 'saylor-cs302', title: 'CS302: Software Engineering', provider: 'Saylor University',
    url: 'https://learn.saylor.org/course/cs302', sourceUrl: 'https://learn.saylor.org/mod/page/view.php?id=71746',
    cost: 'Free', costMYR: 0, hours: 36, level: 'Advanced', verified_on: '2026-10-23', status: 'verified',
    skills: ['Systems Evaluation', 'Quality Control Analysis', 'Operations Analysis', 'Technology Design'], sdgs: [4],
    applicableRoleIds: ['mycol-2511', 'mycol-2512', 'mycol-2521', 'mycol-2524', 'mycol-2531'],
    coverage: 'Reviewed software-specific syllabus covers requirements analysis/specifications, architecture/design, validation/verification, software testing and quality control. Partial software-context coverage only; NOT general HR, clinical or factory systems evaluation. Suggested prerequisites include CS101/102/107/201/202/301; check readiness before starting.',
    timeBasis: 'Provider syllabus and course introduction state 36 hours for the full course.',
    costCaveat: 'Free content and course certificate. Optional proctored college-credit exam costs extra and is excluded. This advanced course does not replace prerequisites.',
  },
  {
    id: 'saylor-bus301', title: 'BUS301: Human Resource Management', provider: 'Saylor University',
    url: 'https://learn.saylor.org/course/bus301', sourceUrl: 'https://learn.saylor.org/mod/page/view.php?id=69748',
    cost: 'Free', costMYR: 0, hours: 24, level: 'Intermediate', verified_on: '2026-10-23', status: 'verified',
    skills: ['Management of Personnel Resources', 'Instructing', 'Monitoring'], sdgs: [4, 8, 10],
    coverage: 'Reviewed syllabus covers recruitment, training/development, performance measurement and remuneration. Partial HR-context coverage; US legislation is not Malaysian employment-law advice.',
    timeBasis: 'Provider course introduction and syllabus state 24 hours for the full course.',
    costCaveat: 'Provider states materials, enrolment and course certificate are free. Account required for assessments; no HRD claimability asserted.',
  },
  {
    id: 'saylor-bus403', title: 'BUS403: Negotiations and Conflict Management', provider: 'Saylor University',
    url: 'https://learn.saylor.org/course/bus403', sourceUrl: 'https://learn.saylor.org/mod/page/view.php?id=99152',
    cost: 'Free', costMYR: 0, hours: 24, level: 'Intermediate', verified_on: '2026-10-23', status: 'verified',
    skills: ['Negotiation', 'Persuasion', 'Social Perceptiveness'], sdgs: [4, 8],
    coverage: 'Reviewed introduction explicitly covers interpersonal, perceptual and persuasive skills, negotiation, interests, bias and cross-cultural conflict. Partial relationship-context skill practice, not competence certification.',
    timeBasis: 'Provider course introduction states 24 hours for the full course.',
    costCaveat: 'Free materials and certificate; account needed for progress. No paid professional credential or HRD claimability promised.',
  },
  {
    id: 'saylor-bus208', title: 'BUS208: Principles of Management', provider: 'Saylor University',
    url: 'https://learn.saylor.org/course/bus208', sourceUrl: 'https://learn.saylor.org/mod/page/view.php?id=86571',
    cost: 'Free', costMYR: 0, hours: 70, level: 'Beginner', verified_on: '2026-10-23', status: 'verified',
    skills: ['Coordination', 'Management of Personnel Resources', 'Management of Financial Resources', 'Management of Material Resources'], sdgs: [4, 8],
    coverage: 'Introduction defines coordinating work and marshalling people, finances, facilities and equipment; outcomes cover cohesive teams and organisational structure. Introductory management-context coverage, not financial or operational certification.',
    timeBasis: 'Provider syllabus explicitly estimates 70 hours. No duration inferred from CEUs.',
    costCaveat: 'Free learning and course certificate. Optional proctored college-credit exam costs extra and is excluded.',
  },
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
/** Availability could not be verified (HTTP 405 at review); never selected as a free course. */
export const malaysianCatalogReference = {
  title: 'HRD Corp e-LATiH course catalogue', provider: 'HRD Corp · Malaysia',
  url: 'https://elatih.hrdcorp.gov.my/courses', status: 'Check availability',
  checked_on: '2026-10-23', note: 'Provider blocked automated verification (HTTP 405). Confirm course title, hours, price and any claimability directly; none is assumed.',
};
