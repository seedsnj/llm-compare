import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = resolve(root, "tests/fixtures");
const fixtureDates = (await readdir(fixtureRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const fixtureDate = fixtureDates.at(-1);
assert.ok(fixtureDate, "Expected at least one dated fixture directory.");

const fixtureDirectory = resolve(fixtureRoot, fixtureDate);
const readFixture = async (name) =>
  JSON.parse(await readFile(resolve(fixtureDirectory, name), "utf8"));

const manifest = await readFixture("manifest.json");
const models = await readFixture("models.json");
const capabilities = await readFixture("capabilities.json");
const benchmarks = await readFixture("benchmarks.json");

test("fixture metadata identifies a dated, reproducible snapshot", () => {
  assert.match(fixtureDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(manifest.fixtureDate, fixtureDate);
  assert.equal(manifest.createdAt.slice(0, 10), fixtureDate);
  assert.equal(manifest.files.length, 3);
});

test("fixture files match manifest hashes", async () => {
  for (const file of manifest.files) {
    const content = await readFile(resolve(fixtureDirectory, file.name));
    const hash = createHash("sha256").update(content).digest("hex");
    assert.equal(hash, file.sha256, `${file.name} hash changed`);
    assert.equal(content.byteLength, file.bytes, `${file.name} size changed`);
  }
});

test("fixture contains today's Copilot model inventory and prices", () => {
  assert.equal(models.models.length, 36);
  assert.equal(models.models.filter((model) => !model.deprecated).length, 27);
  assert.equal(models.models.filter((model) => model.deprecated).length, 9);

  const byId = new Map(models.models.map((model) => [model.id, model]));
  for (const modelId of [
    "gpt-5.5",
    "claude-sonnet-5",
    "claude-sonnet-5.5",
    "claude-opus-5.5",
  ]) {
    assert.ok(byId.has(modelId), `Missing expected model ${modelId}`);
  }

  for (const model of models.models.filter((entry) => !entry.deprecated)) {
    assert.equal(typeof model.input, "number", `${model.id} input price`);
    assert.equal(typeof model.output, "number", `${model.id} output price`);
    assert.equal(typeof model.cacheRead, "number", `${model.id} cache price`);
  }
});

test("capability fixture preserves evidence without fabricated scores", () => {
  assert.equal(Object.keys(capabilities.models).length, 32);
  assert.deepEqual(
    Object.keys(capabilities.aiIndex.availability).sort(),
    ["aaIntelligence", "liveCodeBench", "sciCode"],
  );

  const modelIds = new Set(models.models.map((model) => model.id));
  for (const [modelId, evidence] of Object.entries(capabilities.models)) {
    assert.ok(modelIds.has(modelId), `Unknown capability model ${modelId}`);
    for (const item of Object.values(evidence)) {
      assert.equal(typeof item.score, "number");
      assert.equal(typeof item.rank, "number");
      assert.ok(item.publishedAt);
      assert.ok(item.modelName);
    }
  }
});

test("benchmark fixture covers the expected current data sources", () => {
  const expectedCounts = {
    terminalBench4: 18,
    terminalBench2: 4,
    sweBenchVerified: 1,
    longCliBench: 1,
    clawMark: 1,
    emailBench: 1,
  };

  for (const [key, count] of Object.entries(expectedCounts)) {
    assert.equal(
      benchmarks.benchmarks[key].results.length,
      count,
      `${key} fixture count`,
    );
  }

  const modelIds = new Set(models.models.map((model) => model.id));
  for (const benchmark of Object.values(benchmarks.benchmarks)) {
    for (const result of benchmark.results) {
      assert.ok(modelIds.has(result.modelId), `Unknown benchmark model ${result.modelId}`);
      assert.ok(result.score >= 0 && result.score <= 100);
      assert.ok(result.harness);
    }
  }
});
