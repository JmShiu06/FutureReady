/**
 * Reviewed subset of the MyMahir Malaysia Critical Occupations List (MyCOL)
 * 2024/2025, transcribed from the official TalentCorp report.
 *
 * Codes and titles come from Table 7 (report pp. 85-87). The 6-digit codes and
 * included job titles come from each occupation's profile page. MyCOL lists 66
 * occupations; only those selected for O*NET mapping are recorded here.
 * Inclusion is a TalentCorp classification of a critical occupation, not a
 * hiring probability, vacancy count or demand forecast.
 */
export const mycolSource = {
  edition: "MyCOL 2024/2025",
  title: "MyMahir Malaysia Critical Occupations List (MyCOL) 2024/2025",
  publisher: "Talent Corporation Malaysia Berhad (TalentCorp)",
  landingUrl: "https://www.talentcorp.com.my/mycol/",
  reportUrl:
    "https://www.talentcorp.com.my/images/uploads/publication/204/MyMahir-Malaysia-Critical-Occupations-List-MyCOL20242025-1773385490.pdf",
  reportSha256: "bada182b399ee9944231102402f5f5ce3a23c8328d99abb22ead6e1f8ec20937",
  referencePeriod: "2024/2025",
  // The report does not state a publication date. The PDF was last modified
  // on the TalentCorp server on 2026-03-13; that is not treated as publication.
  publicationDate: null,
  classification: "MASCO 2020, 4-digit occupation level",
  listReference: "Table 7: 2024/2025 Final MyMahir Malaysia Critical Occupations List (report pp. 85-87)",
  totalOccupationsListed: 66,
  reviewedAt: "2026-10-21",
  scopeNote:
    "Where MyCOL names specific job titles, only those titles within the occupation are included in the MyCOL. Other job titles in the same MASCO occupation are not classified as critical by this list.",
} as const;

export interface MycolOccupation {
  masco4: string;
  title: string;
  table7Number: number;
  masco6: string[];
  includedJobTitles: string[];
  profilePage: number;
}

export const mycolOccupations: MycolOccupation[] = [
  {
    masco4: "1212",
    title: "Human Resource Managers",
    table7Number: 3,
    masco6: ["1212-01", "1212-02", "1212-03", "1212-05", "1212-08", "1212-13"],
    includedJobTitles: [
      "Chief Human Resources Officer",
      "Human Resource Manager",
      "Training Manager",
      "Occupational Safety and Health Manager",
      "Occupational Safety Manager",
      "Health, Safety, Environment and Quality Manager",
    ],
    profilePage: 112,
  },
  {
    masco4: "2221",
    title: "Nursing Professionals",
    table7Number: 26,
    masco6: ["2221-02", "2221-03", "2221-10", "2221-11", "2221-14"],
    includedJobTitles: ["Professional Nurse", "Clinical Nurse", "Nurse Instructor", "Nurse", "Operation Theatre Nurse"],
    profilePage: 204,
  },
  {
    masco4: "2413",
    title: "Financial Analysts",
    table7Number: 33,
    masco6: ["2413-01", "2413-06", "2413-11", "2413-14", "2413-15", "2413-18", "2413-27"],
    includedJobTitles: [
      "Financial Analyst",
      "Risk Management Officer",
      "Risk Analyst",
      "Risk Modeller",
      "Research Analyst",
      "Financial Reporting Analyst",
      "Accounting Analyst",
    ],
    profilePage: 232,
  },
  {
    masco4: "2431",
    title: "Advertising and Marketing Professionals",
    table7Number: 35,
    masco6: [
      "2431-05", "2431-10", "2431-11", "2431-19", "2431-20", "2431-21", "2431-22",
      "2431-30", "2431-32", "2431-34", "2431-35", "2431-36", "2431-50", "2431-57",
    ],
    includedJobTitles: [
      "Business Executive",
      "Marketing Communications Specialist",
      "Compliance Officer",
      "Sales Executive",
      "Marketing Executive",
      "Business Development Executive",
      "Sales Administrative Executive",
      "Sales Engineer",
      "Technical Sales Engineer",
      "Social Media Marketing Executive",
      "Digital Marketing Executive",
      "Marketing Officer",
      "Advertising-Promotion Executive",
      "Order Management Coordinator",
    ],
    profilePage: 240,
  },
  {
    masco4: "2511",
    title: "Computer Systems Analysts",
    table7Number: 36,
    masco6: ["2511-02", "2511-16", "2511-32", "2511-55"],
    includedJobTitles: [
      "Computer Systems Analyst",
      "Technical Specialist (.Net)",
      "Enterprise Systems Specialist (Information Technology)",
      "Information and Communication Technology (ICT) Specialist",
    ],
    profilePage: 244,
  },
  {
    masco4: "2512",
    title: "Software Developers",
    table7Number: 37,
    masco6: ["2512-01", "2512-04", "2512-19", "2512-23", "2512-39", "2512-47", "2512-49"],
    includedJobTitles: [
      "Software Developer",
      "Design Engineer",
      "Information Technology System Architect",
      "Software Engineer",
      "Linux Software Engineer",
      "System Developer",
      "Software Engineer (Python)",
    ],
    profilePage: 248,
  },
  {
    masco4: "2521",
    title: "Database Designers and Administrators",
    table7Number: 40,
    masco6: ["2521-02", "2521-03"],
    includedJobTitles: ["Database Analyst", "Database Administrator"],
    profilePage: 260,
  },
  {
    masco4: "2524",
    title: "Data Professionals",
    table7Number: 43,
    masco6: ["2524-01", "2524-03", "2524-16", "2524-24"],
    includedJobTitles: ["Data Scientist", "Data Analyst", "Business Data Analyst", "Data Governance Migration Specialist"],
    profilePage: 272,
  },
  {
    // Table 7 spells "Cyber Security"; the profile page heads it "Cybersecurity".
    masco4: "2531",
    title: "Cyber Security Professionals",
    table7Number: 44,
    masco6: ["2531-17", "2531-20", "2531-30"],
    includedJobTitles: ["Cybersecurity Specialist", "Information Security Officer", "Cybersecurity Analyst"],
    profilePage: 276,
  },
];
