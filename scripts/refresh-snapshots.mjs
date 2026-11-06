import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDirectory = resolve(root, "src/data");

const MODELS_DEV_URL = "https://models.dev/api.json";
const AI_INDEX_BASE =
  "https://raw.githubusercontent.com/EvanZhouDev/ai-model-index/main/data/llm";
const LM_ARENA_DATASET = "lmarena-ai/leaderboard-dataset";
const LM_ARENA_ROWS_BASE = "https://datasets-server.huggingface.co/rows";

const lmConfigs = {
  text: "text",
  document: "document",
  webdev: "webdev",
  agent: "agent",
  bashReliability: "agent_bash_reliability",
  taskOutcome: "agent_task_outcome_explicit",
  steerability: "agent_steerability",
  toolHallucination: "agent_tool_hallucination",
  praiseComplaint: "agent_praise_complaint",
};

const aiMetrics = {
  aaIntelligence: "aa-intelligence",
  sciCode: "scicode",
  liveCodeBench: "livecodebench",
};

const vendorLabels = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  xai: "xAI",
  moonshotai: "Moonshot AI",
  microsoft: "Microsoft",
};

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}`);
  }
  return response.json();
}

function normalizeBaseName(value) {
  return value
    .replace(/\s*\(latest\)\s*$/i, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function variantRank(value) {
  if (!/\s*\([^)]*\)\s*$/.test(value)) return 0;
  if (/\(high\b/i.test(value)) return 1;
  if (/\(max\b/i.test(value)) return 2;
  if (/\(xhigh\b/i.test(value)) return 3;
  return 4;
}

function pickBestRow(rows, modelName) {
  const key = normalizeBaseName(modelName);
  return (
    rows
      .filter(
        (row) => normalizeBaseName(row.model_name ?? row.name ?? "") === key,
      )
      .sort((a, b) => {
        const aName = a.model_name ?? a.name ?? "";
        const bName = b.model_name ?? b.name ?? "";
        const variantDifference =
          variantRank(aName) - variantRank(bName);
        return variantDifference || a.rank - b.rank;
      })[0] ?? null
  );
}

function toLmEvidence(row, config, publishedAt, revision) {
  if (!row) return null;

  const isAgent = config !== "text" && config !== "document" && config !== "webdev";
  return {
    metric: isAgent ? "ips" : "rating",
    score: isAgent ? row.score : row.rating,
    rank: row.rank,
    modelName: row.model_name,
    lower: isAgent ? row.score_ci_lower : row.rating_lower,
    upper: isAgent ? row.score_ci_upper : row.rating_upper,
    sampleCount: isAgent ? row.observation_count : row.vote_count,
    sessionCount: row.session_count ?? null,
    publishedAt: row.leaderboard_publish_date ?? publishedAt,
    config,
    datasetRevision: revision,
  };
}

function toAiEvidence(row, metric, generatedAt) {
  if (!row) return null;
  return {
    metric: "index",
    score: row.score,
    rank: row.rank,
    modelName: row.name,
    profile: row.name.match(/\(([^)]*)\)/)?.[1] ?? "default",
    publishedAt: generatedAt,
    metricName: metric,
  };
}

function normalizeModel(model) {
  const canonicalId = model.canonical_model_id ?? "";
  const vendorKey = canonicalId.split("/")[0] || "unknown";

  return {
    id: model.id,
    name: model.name,
    vendorKey,
    vendor: vendorLabels[vendorKey] ?? vendorKey,
    status: model.status ?? "active",
    deprecated: model.status === "deprecated",
    input: model.cost?.input ?? null,
    output: model.cost?.output ?? null,
    cacheRead: model.cost?.cache_read ?? null,
    cacheWrite: model.cost?.cache_write ?? null,
    context: model.limit?.context ?? null,
    maxOutput: model.limit?.output ?? null,
    releaseDate: model.release_date ?? null,
    canonicalModelId: canonicalId || null,
  };
}

async function main() {
  const [modelsResponse, aiResponses, lmResponses, dataset] = await Promise.all([
    fetchJson(MODELS_DEV_URL),
    Promise.all(
      Object.entries(aiMetrics).map(async ([key, metric]) => [
        key,
        await fetchJson(`${AI_INDEX_BASE}/${metric}.json`),
      ]),
    ),
    Promise.all(
      Object.entries(lmConfigs).map(async ([key, config]) => {
        const url = `${LM_ARENA_ROWS_BASE}?dataset=${encodeURIComponent(
          LM_ARENA_DATASET,
        )}&config=${encodeURIComponent(config)}&split=latest&offset=0&length=100`;
        return [key, await fetchJson(url), url];
      }),
    ),
    fetchJson(`https://huggingface.co/api/datasets/${LM_ARENA_DATASET}`),
  ]);

  const provider = modelsResponse["github-copilot"];
  if (!provider?.models) {
    throw new Error("models.dev did not return github-copilot.models");
  }

  const capturedAt = new Date().toISOString();
  const models = Object.values(provider.models).map(normalizeModel);

  const pricingSnapshot = {
    capturedAt,
    source: {
      name: "models.dev",
      url: MODELS_DEV_URL,
      provider: "GitHub Copilot",
    },
    models,
  };

  const aiData = Object.fromEntries(aiResponses);
  const lmData = Object.fromEntries(
    lmResponses.map(([key, response, url]) => [
      key,
      {
        url,
        rows: response.rows.map((entry) => entry.row),
        publishedAt: response.rows[0]?.row?.leaderboard_publish_date ?? null,
      },
    ]),
  );

  const capabilities = {};
  for (const model of models) {
    const evidence = {};

    for (const [key, response] of Object.entries(aiData)) {
      const row = pickBestRow(
        response.models.map((entry) => ({
          name: entry.name,
          rank: entry.rank,
          score: entry.score,
        })),
        model.name,
      );
      const converted = toAiEvidence(row, response.metric, response.generated_at);
      if (converted) evidence[key] = converted;
    }

    for (const [key, response] of Object.entries(lmData)) {
      const row = pickBestRow(response.rows, model.name);
      const converted = toLmEvidence(
        row,
        lmConfigs[key],
        response.publishedAt,
        dataset.sha,
      );
      if (converted) evidence[key] = converted;
    }

    if (Object.keys(evidence).length > 0) {
      capabilities[model.id] = evidence;
    }
  }

  const capabilitySnapshot = {
    capturedAt,
    dataset: {
      id: LM_ARENA_DATASET,
      revision: dataset.sha,
      lastModified: dataset.lastModified,
      url: `https://huggingface.co/datasets/${LM_ARENA_DATASET}`,
    },
    aiIndex: {
      generatedAt: aiData.aaIntelligence.generated_at,
      source: aiData.aaIntelligence.source,
      repository:
        "https://github.com/EvanZhouDev/ai-model-index/tree/main/data/llm",
      availability: {
        aaIntelligence: aiData.aaIntelligence.models.length,
        sciCode: aiData.sciCode.models.length,
        liveCodeBench: aiData.liveCodeBench.models.length,
      },
    },
    lmArena: {
      configs: Object.fromEntries(
        Object.entries(lmData).map(([key, value]) => [
          key,
          {
            config: lmConfigs[key],
            url: value.url,
            publishedAt: value.publishedAt,
            rows: value.rows.length,
          },
        ]),
      ),
    },
    models: capabilities,
  };

  await mkdir(dataDirectory, { recursive: true });
  await Promise.all([
    writeFile(
      resolve(dataDirectory, "pricing-fallback.json"),
      `${JSON.stringify(pricingSnapshot, null, 2)}\n`,
    ),
    writeFile(
      resolve(dataDirectory, "capability-snapshot.json"),
      `${JSON.stringify(capabilitySnapshot, null, 2)}\n`,
    ),
  ]);

  console.log(
    `Wrote ${models.length} models and ${
      Object.keys(capabilities).length
    } capability profiles.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
