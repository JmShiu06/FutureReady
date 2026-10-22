/**
 * Latest occupation-group employment estimates in DOSM's December 2025
 * Labour Force Survey report, Table D. The source reports counts in thousands.
 */
export const dosmOccupationEmployment2024 = {
  referenceYear: 2024,
  classification: "MASCO 2020",
  unit: "Thousands of people",
  totalEmployedThousands: 16_369.4,
  sourceName: "Department of Statistics Malaysia — Labour Force Survey, December 2025",
  table: "Table D: Employed persons by occupation, Malaysia, 1982–2024",
  sourceUrl: "https://storage.dosm.gov.my/labour/lfs_month_2025-12_en.pdf",
  occupationGroups: [
    { code: "1", label: "Managers", employedThousands: 808.9 },
    { code: "2", label: "Professionals", employedThousands: 2_175.3 },
    { code: "3", label: "Technicians and associate professionals", employedThousands: 1_959.6 },
    { code: "4", label: "Clerical support workers", employedThousands: 1_605.9 },
    { code: "5", label: "Service and sales workers", employedThousands: 3_790.7 },
    { code: "6", label: "Skilled agricultural, forestry, livestock and fishery workers", employedThousands: 678.4 },
    { code: "7", label: "Craft and related trades workers", employedThousands: 1_446.7 },
    { code: "8", label: "Plant and machine operators and assemblers", employedThousands: 1_734.8 },
    { code: "9", label: "Elementary occupations", employedThousands: 2_169.1 },
  ],
} as const;

export function validateDosmOccupationEmployment2024(): void {
  const groups = dosmOccupationEmployment2024.occupationGroups;
  const codes = new Set<string>();
  const labels = new Set<string>();

  for (const group of groups) {
    if (!/^[1-9]$/.test(group.code) || codes.has(group.code)) {
      throw new Error("The DOSM occupation snapshot contains an invalid or duplicate MASCO group code.");
    }
    const normalizedLabel = group.label.trim().toLocaleLowerCase();
    if (!normalizedLabel || labels.has(normalizedLabel)) {
      throw new Error("The DOSM occupation snapshot contains an empty or duplicate group label.");
    }
    if (!Number.isFinite(group.employedThousands) || group.employedThousands < 0) {
      throw new Error("The DOSM occupation snapshot contains an invalid employed-person count.");
    }
    codes.add(group.code);
    labels.add(normalizedLabel);
  }

  const total = groups.reduce((sum, group) => sum + group.employedThousands, 0);
  if (Math.round(total * 10) !== Math.round(dosmOccupationEmployment2024.totalEmployedThousands * 10)) {
    throw new Error("DOSM occupation-group counts do not reconcile to the reported total.");
  }
}
