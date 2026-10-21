import assert from "node:assert/strict";
import { describe, it } from "node:test";
import rawOnet from "../data/occupation-evidence/onet-31.0-skills.json";
import { occupationMappings } from "../data/occupation-evidence/masco-onet-mapping";
import { mycolOccupations, mycolSource } from "../data/occupation-evidence/mycol-2024-2025";
import {
  buildOccupationEvidence,
  getOccupationSources,
  IMPORTANCE_THRESHOLD,
  matchOccupations,
  occupationEvidence,
} from "./occupationEvidence";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const byMasco = (skills: string[], masco4: string) =>
  matchOccupations(skills).occupations.find((o) => o.mycol.masco4 === masco4)!;

describe("official occupation sources", () => {
  it("records the MyCOL 2024/2025 edition, report and checksum without inventing a publication date", () => {
    assert.equal(mycolSource.edition, "MyCOL 2024/2025");
    assert.ok(mycolSource.reportUrl.startsWith("https://www.talentcorp.com.my/"));
    assert.match(mycolSource.reportSha256, /^[0-9a-f]{64}$/);
    assert.equal(mycolSource.publicationDate, null);
    assert.equal(mycolSource.totalOccupationsListed, 66);
  });

  it("keeps the reviewed Table 7 codes and titles", () => {
    const table = Object.fromEntries(mycolOccupations.map((o) => [o.masco4, [o.table7Number, o.title]]));
    assert.deepEqual(table["2512"], [37, "Software Developers"]);
    assert.deepEqual(table["2524"], [43, "Data Professionals"]);
    assert.deepEqual(table["1212"], [3, "Human Resource Managers"]);
    for (const occupation of mycolOccupations) {
      assert.ok(occupation.masco6.every((code) => code.startsWith(`${occupation.masco4}-`)));
      assert.ok(occupation.includedJobTitles.length > 0);
    }
  });

  it("uses O*NET 31.0 with its original Importance (1-5) and Level (0-7) scales", () => {
    const { onet } = occupationEvidence;
    assert.equal(onet.release, "31.0");
    assert.deepEqual([onet.scales.importance.minimum, onet.scales.importance.maximum], [1, 5]);
    assert.deepEqual([onet.scales.level.minimum, onet.scales.level.maximum], [0, 7]);
    assert.ok(onet.files.every((file) => file.url.startsWith("https://www.onetcenter.org/dl_files/database/db_31_0_csv/")));
    const sources = getOccupationSources();
    assert.match(sources.onet.attribution, /O\*NET 31\.0 Database.*CC BY 4\.0/);
    assert.match(sources.onet.localDemandNote, /does not measure Malaysian demand/);
  });

  it("copies O*NET ratings unchanged (Software Developers, Programming)", () => {
    const programming = rawOnet.occupations["15-1252.00"].skills.find((s) => s.name === "Programming")!;
    assert.equal(programming.importance.value, 4);
    assert.equal(programming.level.value, 4.12);
    assert.equal(programming.level.recommendSuppress, true);
    const developer = byMasco(["Programming"], "2512");
    const documented = developer.documentedSkills.find((s) => s.name === "Programming")!;
    assert.equal(documented.importance, 4);
    assert.equal(documented.level, 4.12);
    assert.equal(documented.levelLowPrecision, true);
  });
});

describe("MASCO to O*NET mappings", () => {
  it("references existing MyCOL and O*NET occupations with matching official titles", () => {
    for (const mapping of occupationMappings) {
      const occupation = occupationEvidence.onet.occupations[mapping.onetSocCode];
      assert.ok(occupation, mapping.onetSocCode);
      assert.equal(occupation.title, mapping.onetTitle);
      assert.ok(mycolOccupations.some((o) => o.masco4 === mapping.masco4 && o.title === mapping.mycolTitle));
    }
  });

  it("never recommends unverified mappings or occupations without O*NET skill ratings", () => {
    const everything = matchOccupations(["Critical Thinking", "Active Listening", "Speaking", "Writing", "Reading Comprehension"]);
    const marketing = everything.occupations.find((o) => o.mycol.masco4 === "2431")!;
    assert.equal(marketing.mapping.status, "unverified");
    assert.equal(marketing.recommendationStatus, "excluded");
    assert.equal(marketing.recommended, false);
    assert.equal(marketing.overlap, null);
    assert.match(marketing.exclusionReason!, /unverified/);

    const finance = everything.occupations.find((o) => o.mycol.masco4 === "2413")!;
    assert.equal(finance.onet.skillRatingsAvailable, false);
    assert.equal(finance.recommended, false);
    assert.match(finance.exclusionReason!, /no skill ratings/);

    for (const occupation of everything.occupations.filter((o) => o.recommended)) {
      assert.equal(occupation.mapping.status, "verified");
    }
    const ranks = everything.occupations.map((o) => (o.recommended ? 0 : o.recommendationStatus === "eligible" ? 1 : 2));
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
  });
});

describe("documented skill overlap", () => {
  it("lists only skills at or above the importance threshold without exclusion flags", () => {
    const raw = rawOnet.occupations["15-2051.00"].skills;
    const documented = byMasco([], "2524").documentedSkills;
    assert.ok(documented.length > 0);
    for (const skill of documented) {
      const source = raw.find((s) => s.elementId === skill.elementId)!;
      assert.ok(source.importance.value >= IMPORTANCE_THRESHOLD);
      assert.equal(source.importance.recommendSuppress, false);
      assert.equal(source.level.notRelevant, false);
    }
    const expected = raw.filter((s) => s.importance.value >= IMPORTANCE_THRESHOLD && !s.importance.recommendSuppress && !s.level.notRelevant);
    assert.equal(documented.length, expected.length);
  });

  it("changes with the fictional profile's skills and uses the shared normalization", () => {
    assert.equal(matchOccupations([]).occupations.some((o) => o.recommended), false);

    const one = byMasco(["  critical   THINKING "], "2512");
    assert.equal(one.recommended, true);
    assert.deepEqual(one.overlap!.matchedSkills, ["Critical Thinking"]);

    const two = byMasco(["Critical thinking", "Programming"], "2512");
    assert.equal(two.overlap!.matchedSkills.length, 2);
    assert.ok(two.overlap!.score > one.overlap!.score);
    assert.equal(two.overlap!.skillsConsidered, two.documentedSkills.length);
    assert.equal(two.documentedSkills.filter((s) => s.inProfile).length, 2);
    assert.match(two.explanation, /2 of \d+ skills O\*NET documents/);

    // Profile skills that are not O*NET skill names do not match by guesswork.
    assert.equal(byMasco(["Python", "Excel"], "2512").recommended, false);
  });

  it("explains recommendations without percentages or employment claims", () => {
    for (const occupation of matchOccupations(["Critical thinking", "Coordination"]).occupations) {
      assert.doesNotMatch(occupation.explanation, /%|probability|forecast|guarantee/i);
    }
  });
});

describe("evidence validation", () => {
  const valid = () => ({ onet: clone(rawOnet), mycol: clone(mycolOccupations), mappings: clone(occupationMappings) });

  it("accepts the shipped data", () => {
    assert.doesNotThrow(() => buildOccupationEvidence(valid()));
  });

  it("rejects ratings outside the O*NET scales", () => {
    const input = valid();
    (input.onet as any).occupations["15-1252.00"].skills[0].level.value = 7.5;
    assert.throws(() => buildOccupationEvidence(input), /outside the 0-7 scale/);
  });

  it("rejects a different O*NET release or rescaled Importance", () => {
    const release = valid();
    (release.onet as any).release = "30.3";
    assert.throws(() => buildOccupationEvidence(release), /O\*NET evidence is invalid/);
    const scale = valid();
    (scale.onet as any).scales.importance.maximum = 7;
    assert.throws(() => buildOccupationEvidence(scale), /O\*NET evidence is invalid/);
  });

  it("rejects mappings to missing occupations, mismatched titles or duplicate rows", () => {
    const missing = valid();
    missing.mappings[0].onetSocCode = "99-9999.00";
    assert.throws(() => buildOccupationEvidence(missing), /not in the O\*NET data/);

    const title = valid();
    title.mappings[0].onetTitle = "Renamed occupation";
    assert.throws(() => buildOccupationEvidence(title), /O\*NET title does not match/);

    const duplicate = valid();
    duplicate.mappings.push(clone(duplicate.mappings[0]));
    assert.throws(() => buildOccupationEvidence(duplicate), /mapped more than once/);
  });

  it("rejects 6-digit MASCO codes outside their 4-digit occupation", () => {
    const input = valid();
    input.mycol[0].masco6 = ["9999-01"];
    assert.throws(() => buildOccupationEvidence(input), /does not belong/);
  });
});
