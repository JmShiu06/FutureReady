/**
 * Reviewed crosswalk between selected MyCOL 2024/2025 occupations (MASCO 2020)
 * and O*NET-SOC 2019 occupations in the O*NET 31.0 database.
 *
 * No official MASCO-to-O*NET crosswalk was used; each row is a manual review
 * of the official titles and of the job titles MyCOL includes.
 * `relation` describes the O*NET occupation relative to the MyCOL scope:
 * - exact: the occupations correspond one to one.
 * - approximate: substantially the same work, but the scopes differ.
 * - broader: the O*NET occupation covers more than the MyCOL scope.
 * - narrower: the O*NET occupation covers only part of the MyCOL scope.
 * Only `verified` rows may support recommendations. `unverified` rows are kept
 * for transparency and are never presented as authoritative.
 */
export type MappingRelation = "exact" | "approximate" | "broader" | "narrower";

export interface OccupationMapping {
  masco4: string;
  mycolTitle: string;
  onetSocCode: string;
  onetTitle: string;
  relation: MappingRelation;
  status: "verified" | "unverified";
  rationale: string;
  limitations: string;
}

export const mappingReview = {
  reviewedAt: "2026-10-21",
  method:
    "Manual comparison of MASCO 2020 occupation titles, MyCOL-included job titles and O*NET-SOC occupation titles and descriptions. No official MASCO-to-O*NET-SOC crosswalk was used.",
} as const;

export const occupationMappings: OccupationMapping[] = [
  {
    masco4: "1212",
    mycolTitle: "Human Resource Managers",
    onetSocCode: "11-3121.00",
    onetTitle: "Human Resources Managers",
    relation: "narrower",
    status: "verified",
    rationale: "Both describe managers who plan and direct an organisation's human resource activities.",
    limitations:
      "MyCOL also includes Training Manager and occupational safety and health manager titles, which this O*NET occupation does not cover.",
  },
  {
    masco4: "2221",
    mycolTitle: "Nursing Professionals",
    onetSocCode: "29-1141.00",
    onetTitle: "Registered Nurses",
    relation: "approximate",
    status: "verified",
    rationale: "The MyCOL titles (professional, clinical and operation theatre nurses) describe registered nursing work.",
    limitations:
      "Nursing education, licensing and scope of practice differ between Malaysia and the United States. Nurse Instructor is closer to a teaching role.",
  },
  {
    masco4: "2413",
    mycolTitle: "Financial Analysts",
    onetSocCode: "13-2051.00",
    onetTitle: "Financial and Investment Analysts",
    relation: "approximate",
    status: "verified",
    rationale: "Both cover analysts who assess financial data and investment performance.",
    limitations:
      "MyCOL also includes risk management and accounting analyst titles. O*NET 31.0 publishes no skill ratings for this occupation, so it cannot support a skill-based recommendation.",
  },
  {
    masco4: "2431",
    mycolTitle: "Advertising and Marketing Professionals",
    onetSocCode: "13-1161.00",
    onetTitle: "Market Research Analysts and Marketing Specialists",
    relation: "approximate",
    status: "unverified",
    rationale: "Several MyCOL titles are marketing roles that this O*NET occupation covers.",
    limitations:
      "The MyCOL titles also include sales, business development, compliance and order management roles that fall under several different O*NET occupations. No single O*NET occupation represents this MyCOL entry reliably.",
  },
  {
    masco4: "2511",
    mycolTitle: "Computer Systems Analysts",
    onetSocCode: "15-1211.00",
    onetTitle: "Computer Systems Analysts",
    relation: "approximate",
    status: "verified",
    rationale: "The occupation titles match and both describe analysing and improving computer systems for organisations.",
    limitations:
      "MyCOL limits inclusion to four job titles, including Technical Specialist (.Net), which may overlap with software development work in O*NET.",
  },
  {
    masco4: "2512",
    mycolTitle: "Software Developers",
    onetSocCode: "15-1252.00",
    onetTitle: "Software Developers",
    relation: "approximate",
    status: "verified",
    rationale: "The occupation titles match and most included titles (software developer, software engineer, system developer) are software development roles.",
    limitations:
      "Information Technology System Architect and Design Engineer may fall under other O*NET occupations.",
  },
  {
    masco4: "2521",
    mycolTitle: "Database Designers and Administrators",
    onetSocCode: "15-1242.00",
    onetTitle: "Database Administrators",
    relation: "narrower",
    status: "verified",
    rationale: "Database Administrator is one of the two job titles MyCOL includes.",
    limitations: "The included Database Analyst title and database design work are not fully covered by this O*NET occupation.",
  },
  {
    masco4: "2524",
    mycolTitle: "Data Professionals",
    onetSocCode: "15-2051.00",
    onetTitle: "Data Scientists",
    relation: "narrower",
    status: "verified",
    rationale: "Data Scientist is one of the job titles MyCOL includes.",
    limitations:
      "Data Analyst, Business Data Analyst and Data Governance Migration Specialist are also included in MyCOL and may correspond to other O*NET occupations.",
  },
  {
    masco4: "2531",
    mycolTitle: "Cyber Security Professionals",
    onetSocCode: "15-1212.00",
    onetTitle: "Information Security Analysts",
    relation: "approximate",
    status: "verified",
    rationale: "The included cybersecurity analyst, specialist and information security officer titles describe information security analysis work.",
    limitations: "Senior information security officer responsibilities may extend into management occupations.",
  },
];
