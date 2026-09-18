import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { convert } from "../src/index.js";

const SAMPLES_DIR = process.env.MPXJ_SAMPLES ?? "/tmp/mpxj/junit/data";

async function convertFixture(relativePath: string): Promise<string> {
  const input = join(SAMPLES_DIR, relativePath);
  if (!existsSync(input)) {
    assert.fail(`sample not found: ${input}`);
  }
  const dir = mkdtempSync(join(tmpdir(), "mpxj-"));
  const output = join(dir, relativePath.split("/").at(-1)!.replace(/\.mpp$/, ".xml"));
  const result = await convert(input, output);
  return readFileSync(result.outputPath, "utf8");
}

function assertCompleteMspdi(xml: string): void {
  assert.match(xml, /^<\?xml /);
  assert.match(xml, /<Project xmlns="http:\/\/schemas\.microsoft\.com\/project">/);
  assert.match(xml, /<\/Project>\s*$/);
}

function countElements(xml: string, name: string): number {
  return xml.match(new RegExp(`<${name}(?:>|\\s)`, "g"))?.length ?? 0;
}

const UUID = "[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}";

const cases = [
  ["DurationTest8.mpp", "MPP8 (Project 98)"],
  ["DurationTest9.mpp", "MPP9 (Project 2000/2002)"],
  ["mpp12assignmentcustom.mpp", "MPP12 (Project 2007)"],
  ["ResourceIdAndUniqueId-project2010-mpp14.mpp", "MPP14 (Project 2010)"],
  ["ResourceIdAndUniqueId-project2013-mpp14.mpp", "MPP14 (Project 2013)"],
] as const;

for (const [file, label] of cases) {
  test(`converts ${label}`, async () => {
    assertCompleteMspdi(await convertFixture(file));
  });
}

test("writes Project 2019 assignment timephased data", async () => {
  const xml = await convertFixture(
    "generated/assignment-assignments/assignment-assignments-project2019-mpp14.mpp",
  );
  assertCompleteMspdi(xml);
  assert.equal(countElements(xml, "TimephasedData"), 5);
});

test("writes segmented MPP14 timephased data", async () => {
  const xml = await convertFixture("mpp14timephasedsegments.mpp");
  assertCompleteMspdi(xml);
  assert.equal(countElements(xml, "TimephasedData"), 82);
});

test("serializes rich MPP14 task records", async () => {
  const xml = await convertFixture("mpp14task.mpp");
  assertCompleteMspdi(xml);
  assert.match(xml, /<Notes>Notes Example<\/Notes>/);
  assert.match(xml, new RegExp(`<FieldGUID>${UUID}</FieldGUID>`));
  assert.match(xml, new RegExp(`<GUID>${UUID}</GUID>`));
});

test("serializes rich MPP14 resource records", async () => {
  const xml = await convertFixture("mpp14resource.mpp");
  assertCompleteMspdi(xml);
  assert.match(xml, /<Notes>Resource Notes 1<\/Notes>/);
  assert.match(xml, new RegExp(`<FieldGUID>${UUID}</FieldGUID>`));
  assert.match(xml, new RegExp(`<GUID>${UUID}</GUID>`));
});
