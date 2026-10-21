import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import app from "../app";

let server: Server;
let base: string;

before(async () => {
  await new Promise<void>(resolve => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/signals`;
});
after(() => { server.close(); });

describe("signals routes", () => {
  it("returns Qarera frequencies with attribution and limits", async () => {
    const response = await fetch(`${base}/skill-frequencies`);
    assert.equal(response.status, 200);
    const json = await response.json() as any;
    assert.ok(json.roles.length > 0);
    assert.ok(json.roles[0].skills.length <= 10);
    assert.ok(json.source.citation.length > 0);
    assert.ok(json.limitations.length > 0);
  });
});
