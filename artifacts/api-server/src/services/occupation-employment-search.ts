import { mycolOccupations, mycolSource } from "../data/occupation-evidence/mycol-2024-2025";
import { matchOccupations } from "../lib/occupationEvidence";
import {
  dosmOccupationEmployment2024,
  validateDosmOccupationEmployment2024,
} from "../data/dosm-occupation-employment-2024";

function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en-MY").trim().replace(/\s+/g, " ");
}

function matchesQuery(value: string, tokens: string[]): boolean {
  const normalized = normalizeSearchText(value);
  return tokens.every(token => normalized.includes(token));
}

export function searchDosmOccupationEmployment(query: string) {
  validateDosmOccupationEmployment2024();

  const normalizedQuery = normalizeSearchText(query);
  const tokens = normalizedQuery ? normalizedQuery.split(" ") : [];
  const mycolRecordsByGroup = new Map<string, typeof mycolOccupations>();
  const reviewedOccupations = matchOccupations([]).occupations.filter(o => o.recommendationStatus === "eligible");

  for (const occupation of mycolOccupations) {
    const groupCode = occupation.masco4[0];
    const records = mycolRecordsByGroup.get(groupCode) ?? [];
    records.push(occupation);
    mycolRecordsByGroup.set(groupCode, records);
  }

  const occupationGroups = dosmOccupationEmployment2024.occupationGroups.flatMap(group => {
    const records = mycolRecordsByGroup.get(group.code) ?? [];
    const groupMatches = tokens.length > 0 && matchesQuery(group.label, tokens);
    const matchingRecords = tokens.length === 0 || groupMatches
      ? records
      : records.filter(occupation =>
        matchesQuery(occupation.title, tokens) ||
        occupation.includedJobTitles.some(title => matchesQuery(title, tokens)),
      );
    const matchedJobTitles = tokens.length === 0 || groupMatches
      ? []
      : [...new Set(records.flatMap(occupation =>
        occupation.includedJobTitles.filter(title => matchesQuery(title, tokens)),
      ))];

    if (tokens.length > 0 && !groupMatches && matchingRecords.length === 0) return [];

    const reviewedGroup = reviewedOccupations.filter(o => o.mycol.masco4.startsWith(group.code));
    const frequencies = new Map<string, number>();
    for (const occupation of reviewedGroup) {
      for (const name of new Set(occupation.documentedSkills.map(skill => skill.name))) {
        frequencies.set(name, (frequencies.get(name) ?? 0) + 1);
      }
    }
    const generalSkills = [...frequencies].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(([name]) => name);
    return [{
      code: group.code,
      label: group.label,
      employedThousands: group.employedThousands,
      matchedOccupationTitles: matchingRecords.map(occupation => occupation.title),
      matchedJobTitles,
      generalSkills,
      skillSourceUrls: [...new Set(reviewedGroup.map(o => o.onet.url))],
      skillsCoverage: reviewedGroup.length
        ? `Common documented skills across ${reviewedGroup.length} reviewed MyCOL occupations mapped to this major group using O*NET 31.0. Ranked by occurrence; not a requirement for every job, a complete group survey, or DOSM skill data.`
        : "No reviewed group-level skill evidence is available in the current MyCOL/O*NET subset.",
    }];
  });

  return {
    query: normalizedQuery,
    occupationSource: {
      referenceYear: dosmOccupationEmployment2024.referenceYear,
      classification: dosmOccupationEmployment2024.classification,
      unit: dosmOccupationEmployment2024.unit,
      totalEmployedThousands: dosmOccupationEmployment2024.totalEmployedThousands,
      sourceName: dosmOccupationEmployment2024.sourceName,
      table: dosmOccupationEmployment2024.table,
      sourceUrl: dosmOccupationEmployment2024.sourceUrl,
    },
    titleSearchSource: {
      title: mycolSource.title,
      edition: mycolSource.edition,
      publisher: mycolSource.publisher,
      url: mycolSource.reportUrl,
      recordsInSearchIndex: mycolOccupations.length,
      totalOccupationsListed: mycolSource.totalOccupationsListed,
      scopeNote:
        "Job-title matching uses the existing reviewed MyCOL subset in this project, not a complete DOSM/MASCO title index. DOSM employment counts are for the broader MASCO major group.",
    },
    occupationGroups,
  };
}
