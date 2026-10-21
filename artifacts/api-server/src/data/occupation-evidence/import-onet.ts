/**
 * Regenerates onet-31.0-skills.json from the official O*NET 31.0 CSV files.
 *
 *   pnpm --filter @workspace/api-server run import:onet            # download
 *   pnpm --filter @workspace/api-server run import:onet -- <dir>   # local copies
 *
 * Only the occupations referenced by masco-onet-mapping.ts are written. Values
 * are copied unchanged on their original O*NET scales; nothing is rescaled.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { occupationMappings } from "./masco-onet-mapping";

const RELEASE = "31.0";
const BASE_URL = `https://www.onetcenter.org/dl_files/database/db_31_0_csv/`;
const FILES = {
  occupations: "occupation_data.csv",
  essentialSkills: "essential_skills.csv",
  transferableSkills: "transferable_skills.csv",
  scales: "scales_reference.csv",
  contentModel: "content_model_reference.csv",
} as const;

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.length > 1 || r[0]);
  return body.map((r) => {
    if (r.length !== header.length) throw new Error(`Unexpected column count in row: ${r.join(",")}`);
    return Object.fromEntries(header.map((h, i) => [h, r[i]]));
  });
}

async function load(name: string, localDir?: string) {
  const text = localDir
    ? await readFile(join(localDir, name), "utf8")
    : await (async () => {
        const response = await fetch(BASE_URL + name);
        if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
        return response.text();
      })();
  return { rows: parseCsv(text), file: { name, url: BASE_URL + name, sha256: createHash("sha256").update(text).digest("hex") } };
}

const rating = (row: Record<string, string>) => ({
  value: Number(row["Data Value"]),
  n: row["N"] === "" ? null : Number(row["N"]),
  standardError: row["Standard Error"] === "" ? null : Number(row["Standard Error"]),
  lowerCiBound: row["Lower CI Bound"] === "" ? null : Number(row["Lower CI Bound"]),
  upperCiBound: row["Upper CI Bound"] === "" ? null : Number(row["Upper CI Bound"]),
  recommendSuppress: row["Recommend Suppress"] === "Y",
  notRelevant: row["Not Relevant"] === "Y",
  date: row["Date"],
  domainSource: row["Domain Source"],
});

async function main() {
  const localDir = process.argv[2];
  const [occupations, essential, transferable, scales, contentModel] = await Promise.all(
    Object.values(FILES).map((name) => load(name, localDir)),
  );
  const codes = new Set(occupationMappings.map((m) => m.onetSocCode));
  const descriptions = new Map(contentModel.rows.map((r) => [r["Element ID"], r["Description"]]));

  const result: Record<string, unknown> = {};
  for (const code of [...codes].sort()) {
    const occupation = occupations.rows.find((r) => r["O*NET-SOC Code"] === code);
    if (!occupation) throw new Error(`${code} is not in O*NET ${RELEASE} occupation data`);
    const skills = new Map<string, Record<string, unknown>>();
    for (const [domain, source] of [["Essential", essential], ["Transferable", transferable]] as const) {
      for (const row of source.rows.filter((r) => r["O*NET-SOC Code"] === code)) {
        const id = row["Element ID"];
        const skill = skills.get(id) ?? {
          elementId: id,
          name: row["Element Name"],
          domain,
          description: descriptions.get(id) ?? null,
        };
        if (row["Scale ID"] === "IM") skill.importance = rating(row);
        else if (row["Scale ID"] === "LV") skill.level = rating(row);
        else throw new Error(`Unexpected scale ${row["Scale ID"]} for ${code} ${id}`);
        skills.set(id, skill);
      }
    }
    result[code] = {
      title: occupation["Title"],
      description: occupation["Description"],
      skills: [...skills.values()].sort((a, b) => String(a.elementId).localeCompare(String(b.elementId))),
    };
  }

  const scale = (id: string) => {
    const row = scales.rows.find((r) => r["Scale ID"] === id);
    if (!row) throw new Error(`Scale ${id} missing`);
    return { id, name: row["Scale Name"], minimum: Number(row["Minimum"]), maximum: Number(row["Maximum"]) };
  };

  const output = {
    release: RELEASE,
    releaseDate: "August 2026",
    taxonomy: "O*NET-SOC 2019",
    files: [occupations, essential, transferable, scales, contentModel].map((f) => f.file),
    scales: { importance: scale("IM"), level: scale("LV") },
    occupations: result,
  };
  const target = join(dirname(fileURLToPath(import.meta.url)), `onet-${RELEASE}-skills.json`);
  await writeFile(target, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${Object.keys(result).length} occupations to ${target}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
