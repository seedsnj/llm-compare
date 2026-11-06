import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDate =
  process.env.FIXTURE_DATE ?? new Date().toISOString().slice(0, 10);
const outputDirectory = resolve(root, "tests/fixtures", fixtureDate);

const sourceFiles = {
  models: "src/data/pricing-fallback.json",
  capabilities: "src/data/capability-snapshot.json",
  benchmarks: "src/data/benchmark-snapshot.json",
};

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(root, relativePath), "utf8"));
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function main() {
  const [models, capabilities, benchmarks] = await Promise.all([
    readJson(sourceFiles.models),
    readJson(sourceFiles.capabilities),
    readJson(sourceFiles.benchmarks),
  ]);

  const fixtureFiles = {
    "models.json": serialize(models),
    "capabilities.json": serialize(capabilities),
    "benchmarks.json": serialize(benchmarks),
  };

  const activeModels = models.models.filter((model) => !model.deprecated);
  const manifest = {
    fixtureDate,
    createdAt: new Date().toISOString(),
    files: Object.entries(fixtureFiles).map(([name, content]) => ({
      name,
      bytes: Buffer.byteLength(content),
      sha256: sha256(content),
      source: sourceFiles[name === "models.json" ? "models" : name === "capabilities.json" ? "capabilities" : "benchmarks"],
    })),
    counts: {
      models: models.models.length,
      activeModels: activeModels.length,
      deprecatedModels: models.models.length - activeModels.length,
      capabilityProfiles: Object.keys(capabilities.models).length,
      benchmarks: Object.keys(benchmarks.benchmarks).length,
      benchmarkResults: Object.values(benchmarks.benchmarks).reduce(
        (total, benchmark) => total + benchmark.results.length,
        0,
      ),
    },
    capturedAt: {
      models: models.capturedAt,
      capabilities: capabilities.capturedAt,
      benchmarks: benchmarks.capturedAt,
    },
    sources: {
      models: models.source,
      lmArenaRevision: capabilities.dataset.revision,
      lmArenaDataset: capabilities.dataset.url,
      aiModelIndex: capabilities.aiIndex.repository,
    },
  };

  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(
    Object.entries(fixtureFiles).map(([name, content]) =>
      writeFile(resolve(outputDirectory, name), content),
    ),
  );
  await writeFile(
    resolve(outputDirectory, "manifest.json"),
    serialize(manifest),
  );

  console.log(
    `Wrote fixture ${fixtureDate}: ${activeModels.length} active models, ` +
      `${Object.keys(capabilities.models).length} capability profiles.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
