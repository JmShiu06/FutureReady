import { mycolOccupations, mycolSource } from "../data/occupation-evidence/mycol-2024-2025";
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

    return [{
      code: group.code,
      label: group.label,
      employedThousands: group.employedThousands,
      matchedOccupationTitles: matchingRecords.map(occupation => occupation.title),
      matchedJobTitles,
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
