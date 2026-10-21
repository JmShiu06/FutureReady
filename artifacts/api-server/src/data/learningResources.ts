export type CatalogSkill = "python" | "sql" | "aws";

export interface VerifiedLearningResource {
  id: string;
  title: string;
  provider: string;
  url: string;
  skills: readonly CatalogSkill[];
  duration_minutes: number;
  duration_label: string;
  prerequisites: readonly string[];
  recommended_prerequisites: readonly string[];
  cost: "Free";
  cost_source_url: string;
}

/**
 * A deliberately small catalog: only resources with provider-published,
 * reviewable duration, prerequisites, and cost are included.
 */
export const learningResources: readonly VerifiedLearningResource[] = [
  {
    id: "cisco-python-essentials-1",
    title: "Python Essentials 1",
    provider: "Cisco Networking Academy",
    url: "https://www.netacad.com/courses/python-essentials-1?courseLang=en-US",
    skills: ["python"],
    duration_minutes: 30 * 60,
    duration_label: "30 hours",
    prerequisites: [],
    recommended_prerequisites: [],
    cost: "Free",
    cost_source_url: "https://www.netacad.com/learning-collections/python?courseLang=en-US",
  },
  {
    id: "microsoft-introduction-to-transact-sql",
    title: "Introduction to Transact-SQL",
    provider: "Microsoft Learn",
    url: "https://learn.microsoft.com/en-us/training/modules/introduction-to-transact-sql/",
    skills: ["sql"],
    duration_minutes: 61,
    duration_label: "1 hour 1 minute",
    prerequisites: [],
    recommended_prerequisites: [
      "Experience working with tables of data, such as in a spreadsheet, is helpful.",
    ],
    cost: "Free",
    cost_source_url: "https://learn.microsoft.com/en-us/training/support/faq",
  },
  {
    id: "aws-cloud-practitioner-essentials",
    title: "AWS Cloud Practitioner Essentials",
    provider: "AWS Skill Builder",
    url: "https://skillbuilder.aws/learn/94T2BEN85A/aws-cloud-practitioner-essentials/8D79F3AVR7",
    skills: ["aws"],
    duration_minutes: 12 * 60 + 45,
    duration_label: "12 hours 45 minutes",
    prerequisites: [],
    recommended_prerequisites: [
      "General IT business knowledge and general IT technical knowledge.",
    ],
    cost: "Free",
    cost_source_url: "https://skillbuilder.aws/learn/94T2BEN85A/aws-cloud-practitioner-essentials/8D79F3AVR7",
  },
];

export const learningResourceCatalog = {
  reviewed_at: "2026-10-21",
  sources: [
    {
      provider: "Cisco Networking Academy",
      url: "https://www.netacad.com/courses/python-essentials-1?courseLang=en-US",
    },
    {
      provider: "Cisco Networking Academy",
      url: "https://www.netacad.com/learning-collections/python?courseLang=en-US",
    },
    {
      provider: "Microsoft Learn",
      url: "https://learn.microsoft.com/en-us/training/modules/introduction-to-transact-sql/",
    },
    {
      provider: "Microsoft Learn",
      url: "https://learn.microsoft.com/en-us/training/support/faq",
    },
    {
      provider: "AWS Skill Builder",
      url: "https://skillbuilder.aws/learn/94T2BEN85A/aws-cloud-practitioner-essentials/8D79F3AVR7",
    },
  ],
} as const;
