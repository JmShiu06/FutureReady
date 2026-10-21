const q1Release =
  "https://www.dosm.gov.my/portal-main/release-content/big-data-analytics-job-market-insights-q12026";
const q2Release =
  "https://www.dosm.gov.my/portal-main/release-content/big-data-analytics-job-market-insights-q22026";
const q1Workbook =
  "https://www.dosm.gov.my/portal-main/release-document-log?release_document_id=19819";
const q2Workbook =
  "https://www.dosm.gov.my/portal-main/release-document-log?release_document_id=20742";

export const dosmJobMarketInsights2026 = {
  datasetId: "dosm-jmi-major-groups-2026",
  sourceName: "Department of Statistics Malaysia — Big Data Analytics: Job Market Insights",
  sourceUrl: q2Release,
  termsUrl:
    "https://www.dosm.gov.my/assets/img/article/Terms-of-Use-Government-Open-Data-1-Appendix-B.pdf",
  attribution: "Data source: Department of Statistics Malaysia.",
  reuseNote:
    "Reused under the Malaysian Government Open Data Terms of Use 1.0. Source attribution and a link to these terms are provided.",
  coverage: "Malaysia",
  measure: "Online job offerings advertised",
  classification: "Major Group Occupation; source workbook labels are retained verbatim.",
  methodology:
    "Counts from Table 2 of the DOSM Job Market Insights data workbooks. The reports describe online offerings advertised through major private recruitment platforms.",
  caveats: [
    "Online job offerings are not a count of all vacancies, employed people, or future labour demand.",
    "The reports do not measure skill requirements; these counts are not converted into skill-demand scores.",
    "The Unclassified row is excluded because Q2 has dashes rather than comparable observations; missing values are not treated as zero.",
  ],
  reviewedAt: "2026-10-21",
  totalByQuarter: [
    {
      quarter: "2026-Q1",
      jobOfferings: 626861,
      publicationDate: "2026-06-25",
      reportUrl: q1Release,
      dataUrl: q1Workbook,
    },
    {
      quarter: "2026-Q2",
      jobOfferings: 555509,
      publicationDate: "2026-08-18",
      reportUrl: q2Release,
      dataUrl: q2Workbook,
    },
  ],
  occupationGroups: [
    { id: "major-group-managers", label: "Managers", q1: 99447, q2: 87950 },
    { id: "major-group-professionals", label: "Professionals", q1: 315768, q2: 285907 },
    {
      id: "major-group-technicians-and-associate-professionals",
      label: "Technicians and associate professionals",
      q1: 93987,
      q2: 86512,
    },
    {
      id: "major-group-clerical-support-workers",
      label: "Clerical support workers",
      q1: 48784,
      q2: 40408,
    },
    {
      id: "major-group-service-and-sales-workers",
      label: "Service and sales workers",
      q1: 42094,
      q2: 32511,
    },
    {
      id: "major-group-skilled-agricultural-forestry-livestock-fishery-workers",
      label: "Skilled agricultural, forestry, livestock and fishery workers",
      q1: 239,
      q2: 101,
    },
    {
      id: "major-group-craft-and-related-trades-workers",
      label: "Craft and related trades workers",
      q1: 6094,
      q2: 4558,
    },
    {
      id: "major-group-plant-and-machine-operators-and-assemblers",
      label: "Plant and machine operators and assemblers",
      q1: 16378,
      q2: 12916,
    },
    {
      id: "major-group-elementary-occupations",
      label: "Elementary Occupations",
      q1: 4070,
      q2: 4646,
    },
  ],
} as const;

export function validateDosmJobMarketInsightsSnapshot() {
  const groups = dosmJobMarketInsights2026.occupationGroups;
  const ids = new Set<string>();
  const labels = new Set<string>();

  for (const group of groups) {
    if (!/^[a-z0-9-]+$/.test(group.id) || ids.has(group.id)) {
      throw new Error("The reviewed DOSM snapshot contains an invalid or duplicate group identifier.");
    }
    const normalizedLabel = group.label.trim().toLocaleLowerCase();
    if (!normalizedLabel || labels.has(normalizedLabel)) {
      throw new Error("The reviewed DOSM snapshot contains an empty or duplicate occupation label.");
    }
    if (!Number.isSafeInteger(group.q1) || group.q1 < 0 || !Number.isSafeInteger(group.q2) || group.q2 < 0) {
      throw new Error("The reviewed DOSM snapshot contains an invalid job-offering count.");
    }
    ids.add(group.id);
    labels.add(normalizedLabel);
  }

  for (const quarter of dosmJobMarketInsights2026.totalByQuarter) {
    const total = quarter.quarter === "2026-Q1"
      ? groups.reduce((sum, group) => sum + group.q1, 0)
      : groups.reduce((sum, group) => sum + group.q2, 0);
    if (total !== quarter.jobOfferings) {
      throw new Error(`Occupation-group counts do not reconcile to the DOSM ${quarter.quarter} total.`);
    }
  }

  return {
    ...dosmJobMarketInsights2026,
    occupationGroups: groups.map(group => ({
      id: group.id,
      label: group.label,
      observations: [
        {
          quarter: "2026-Q1" as const,
          jobOfferings: group.q1,
          publicationDate: "2026-06-25",
          reportUrl: q1Release,
          dataUrl: q1Workbook,
        },
        {
          quarter: "2026-Q2" as const,
          jobOfferings: group.q2,
          publicationDate: "2026-08-18",
          reportUrl: q2Release,
          dataUrl: q2Workbook,
        },
      ],
    })),
  };
}
