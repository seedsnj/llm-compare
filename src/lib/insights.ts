import type {
  BenchmarkKey,
  BenchmarkSnapshot,
  CapabilitySnapshot,
  CopilotModel,
  Evidence,
  EvidenceKey,
  ProfileDimensionEvidence,
  ProfileDimension,
  ProfileDimensionKey,
  ProfileInsight,
  ProfileSourceKey,
} from "../types";

export const REFERENCE_INPUT_TOKENS = 100_000;
export const REFERENCE_OUTPUT_TOKENS = 12_000;

export type CapabilityMetricKey =
  | "aaIntelligence"
  | "text"
  | "webdev"
  | "agent"
  | "document";

export type CostTier = "低成本" | "中成本" | "高成本" | "极高成本";
export type ValueTier = "值选" | "高效" | "一般" | "偏低";

export interface CapabilityInsight {
  evidence: Evidence;
  barPercent: number;
}

export interface ModelInsight {
  referenceCost: number;
  referenceCredits: number;
  inputBarPercent: number;
  outputBarPercent: number;
  cacheBarPercent: number;
  costBarPercent: number;
  costTier: CostTier;
  metrics: Record<CapabilityMetricKey, CapabilityInsight | null>;
  profile: ProfileInsight;
  valueIndex: number | null;
  valueBarPercent: number | null;
  valueTier: ValueTier | null;
  isTopValue: boolean;
}

export interface InsightsResult {
  byModelId: Record<string, ModelInsight>;
  topValueIds: string[];
  metricRanges: Record<
    CapabilityMetricKey,
    { min: number; max: number; count: number }
  >;
  medianProfileCost: number | null;
}

const capabilityMetrics: CapabilityMetricKey[] = [
  "aaIntelligence",
  "text",
  "webdev",
  "agent",
  "document",
];

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function linearPercent(value: number, min: number, max: number) {
  if (max === min) return 100;
  return clamp(((value - min) / (max - min)) * 100);
}

function logPercent(value: number, min: number, max: number) {
  if (value <= 0 || max <= min) return 100;
  return clamp(
    (Math.log1p(value / min) / Math.log1p(max / min)) * 100,
  );
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function referenceCost(model: CopilotModel) {
  if (model.input == null || model.output == null) return null;
  return (
    (model.input * REFERENCE_INPUT_TOKENS) / 1_000_000 +
    (model.output * REFERENCE_OUTPUT_TOKENS) / 1_000_000
  );
}

function metricEvidence(modelId: string, key: EvidenceKey, snapshot: CapabilitySnapshot) {
  return snapshot.models[modelId]?.[key] ?? null;
}

const profileDimensionMeta: Array<{
  key: ProfileDimensionKey;
  label: string;
  weight: number;
}> = [
  { key: "hard", label: "高难度", weight: 0.2 },
  { key: "medium", label: "通用开发", weight: 0.6 },
  { key: "daily", label: "日常信息", weight: 0.2 },
];

const proxySources: Record<
  "lmArenaAgent" | "lmArenaWebdev" | "lmArenaDocument" | "lmArenaText",
  { label: string; url: string }
> = {
  lmArenaAgent: {
    label: "LMArena Agent（代理）",
    url: "https://datasets-server.huggingface.co/rows?dataset=lmarena-ai%2Fleaderboard-dataset&config=agent&split=latest&offset=0&length=100",
  },
  lmArenaWebdev: {
    label: "LMArena Webdev（代理）",
    url: "https://datasets-server.huggingface.co/rows?dataset=lmarena-ai%2Fleaderboard-dataset&config=webdev&split=latest&offset=0&length=100",
  },
  lmArenaDocument: {
    label: "LMArena Document（代理）",
    url: "https://datasets-server.huggingface.co/rows?dataset=lmarena-ai%2Fleaderboard-dataset&config=document&split=latest&offset=0&length=100",
  },
  lmArenaText: {
    label: "LMArena Text（代理）",
    url: "https://datasets-server.huggingface.co/rows?dataset=lmarena-ai%2Fleaderboard-dataset&config=text&split=latest&offset=0&length=100",
  },
};

function benchmarkEvidence(
  modelId: string,
  benchmarkKey: BenchmarkKey,
  benchmarks: BenchmarkSnapshot,
): ProfileDimensionEvidence | null {
  const benchmark = benchmarks.benchmarks[benchmarkKey];
  if (!benchmark?.usedInProfile) return null;
  const result = benchmark.results.find((item) => item.modelId === modelId);
  if (!result) return null;

  return {
    sourceKey: benchmarkKey,
    sourceLabel: benchmark.label,
    sourceUrl: benchmark.url,
    sourceModelName: result.sourceModelName,
    score: clamp(result.score),
    kind: benchmark.kind === "legacy" ? "legacy" : "direct",
    harness: result.harness,
    reasoningEffort: result.reasoningEffort,
    publishedAt: result.publishedAt ?? result.modelReleaseDate ?? null,
  };
}

function proxyEvidence(
  capability: CapabilityInsight | null,
  sourceKey: keyof typeof proxySources,
): ProfileDimensionEvidence | null {
  if (!capability) return null;
  const source = proxySources[sourceKey];
  return {
    sourceKey,
    sourceLabel: source.label,
    sourceUrl: source.url,
    sourceModelName: capability.evidence.modelName,
    score: capability.barPercent,
    kind: "proxy",
    publishedAt: capability.evidence.publishedAt,
  };
}

function createProfile(
  modelId: string,
  metrics: Record<CapabilityMetricKey, CapabilityInsight | null>,
  benchmarks: BenchmarkSnapshot,
): ProfileInsight {
  const hard =
    benchmarkEvidence(modelId, "terminalBench4", benchmarks) ??
    benchmarkEvidence(modelId, "terminalBench2", benchmarks) ??
    proxyEvidence(metrics.agent, "lmArenaAgent");
  const medium =
    benchmarkEvidence(modelId, "sweBenchVerified", benchmarks) ??
    proxyEvidence(metrics.webdev, "lmArenaWebdev");
  const daily =
    benchmarkEvidence(modelId, "clawMark", benchmarks) ??
    proxyEvidence(metrics.document, "lmArenaDocument") ??
    proxyEvidence(metrics.text, "lmArenaText");

  const dimensions: Partial<Record<ProfileDimensionKey, ProfileDimension>> = {};
  const evidenceByDimension = { hard, medium, daily };
  for (const definition of profileDimensionMeta) {
    const evidence = evidenceByDimension[definition.key];
    if (!evidence) continue;
    dimensions[definition.key] = {
      ...definition,
      score: evidence.score,
      evidence,
    };
  }

  const observedDimensions = Object.values(dimensions) as ProfileDimension[];
  const observedWeight = observedDimensions.reduce(
    (total, dimension) => total + dimension.weight,
    0,
  );
  const coverage = observedWeight * 100;
  const score =
    observedDimensions.length >= 2 && coverage >= 79.999
      ? observedDimensions.reduce(
          (total, dimension) =>
            total + dimension.weight * dimension.score,
          0,
        ) / observedWeight
      : null;
  const directDimensionCount = observedDimensions.filter(
    (dimension) =>
      dimension.evidence.kind === "direct" ||
      dimension.evidence.kind === "legacy",
  ).length;
  const missingDimensions = profileDimensionMeta
    .filter((definition) => !dimensions[definition.key])
    .map((definition) => definition.key);

  return {
    dimensions,
    score: score == null ? null : clamp(score),
    coverage,
    directDimensionCount,
    confidence:
      score == null
        ? "数据不足"
        : coverage < 99.999
          ? "低"
          : directDimensionCount >= 2
            ? "中低"
            : directDimensionCount === 1
              ? "低"
              : "仅代理",
    missingDimensions,
  };
}

export function buildModelInsights(
  models: CopilotModel[],
  snapshot: CapabilitySnapshot,
  benchmarks: BenchmarkSnapshot,
): InsightsResult {
  const activeModels = models.filter((model) => !model.deprecated);
  const pricedActiveModels = activeModels.filter(
    (model) => model.input != null && model.output != null,
  );
  const inputValues = pricedActiveModels.map((model) => model.input as number);
  const outputValues = pricedActiveModels.map((model) => model.output as number);
  const cacheValues = activeModels
    .map((model) => model.cacheRead)
    .filter((value): value is number => value != null);
  const referenceCosts = pricedActiveModels
    .map(referenceCost)
    .filter((value): value is number => value != null);

  const inputRange = {
    min: Math.min(...inputValues),
    max: Math.max(...inputValues),
  };
  const outputRange = {
    min: Math.min(...outputValues),
    max: Math.max(...outputValues),
  };
  const cacheRange = {
    min: Math.min(...cacheValues),
    max: Math.max(...cacheValues),
  };
  const costRange = {
    min: Math.min(...referenceCosts),
    max: Math.max(...referenceCosts),
  };

  const sortedCosts = [...referenceCosts].sort((a, b) => a - b);
  const costThreshold = (quantile: number) =>
    sortedCosts[Math.floor((sortedCosts.length - 1) * quantile)];

  const costTiers = {
    q25: costThreshold(0.25),
    q50: costThreshold(0.5),
    q75: costThreshold(0.75),
  };

  const metricRanges = {} as InsightsResult["metricRanges"];
  for (const key of capabilityMetrics) {
    const values = activeModels
      .map((model) => metricEvidence(model.id, key, snapshot)?.score)
      .filter((value): value is number => value != null);
    metricRanges[key] = {
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  const baseInsights = Object.fromEntries(
    models.map((model) => {
      const cost = referenceCost(model);
      const metrics = Object.fromEntries(
        capabilityMetrics.map((key) => {
          const evidence = metricEvidence(model.id, key, snapshot);
          if (!evidence) return [key, null];
          const range = metricRanges[key];
          return [
            key,
            {
              evidence,
              barPercent: linearPercent(
                evidence.score,
                range.min,
                range.max,
              ),
            },
          ];
        }),
      ) as Record<CapabilityMetricKey, CapabilityInsight | null>;
      const profile = createProfile(model.id, metrics, benchmarks);

      let costTier: CostTier = "中成本";
      if (cost != null) {
        if (cost <= costTiers.q25) costTier = "低成本";
        else if (cost <= costTiers.q50) costTier = "中成本";
        else if (cost <= costTiers.q75) costTier = "高成本";
        else costTier = "极高成本";
      }

      return [
        model.id,
        {
          referenceCost: cost ?? 0,
          referenceCredits: cost == null ? 0 : cost * 100,
          inputBarPercent:
            model.input == null
              ? 0
              : logPercent(model.input, inputRange.min, inputRange.max),
          outputBarPercent:
            model.output == null
              ? 0
              : logPercent(model.output, outputRange.min, outputRange.max),
          cacheBarPercent:
            model.cacheRead == null
              ? 0
              : logPercent(model.cacheRead, cacheRange.min, cacheRange.max),
          costBarPercent:
            cost == null ? 0 : logPercent(cost, costRange.min, costRange.max),
          costTier,
          metrics,
          profile,
          valueIndex: null,
          valueBarPercent: null,
          valueTier: null,
          isTopValue: false,
        } satisfies ModelInsight,
      ];
    }),
  ) as Record<string, ModelInsight>;

  const activeValueCandidates = activeModels.flatMap((model) => {
    const insight = baseInsights[model.id];
    if (
      !insight ||
      insight.referenceCost <= 0 ||
      insight.profile.score == null ||
      insight.profile.coverage < 99.999 ||
      insight.profile.directDimensionCount < 1
    ) {
      return [];
    }
    return [
      {
        id: model.id,
        cost: insight.referenceCost,
        profileScore: insight.profile.score,
      },
    ];
  });

  const medianProfileCost = median(
    activeValueCandidates.map((item) => item.cost),
  );
  if (medianProfileCost == null || medianProfileCost <= 0) {
    return {
      byModelId: baseInsights,
      topValueIds: [],
      metricRanges,
      medianProfileCost: null,
    };
  }

  const valueCandidates = Object.entries(baseInsights).flatMap(
    ([id, insight]) => {
      if (
        insight.profile.score == null ||
        insight.profile.coverage < 99.999 ||
        insight.profile.directDimensionCount < 1 ||
        insight.referenceCost <= 0
      ) {
        return [];
      }
      return [
        {
          id,
          value:
            insight.profile.score /
            (1 + insight.referenceCost / medianProfileCost),
        },
      ];
    },
  );

  const maxValue = Math.max(
    0,
    ...valueCandidates.map((item) => item.value),
  );
  for (const candidate of valueCandidates) {
    const insight = baseInsights[candidate.id];
    insight.valueIndex = candidate.value;
    insight.valueBarPercent = linearPercent(candidate.value, 0, maxValue);
    insight.valueTier =
      insight.valueBarPercent >= 55
        ? "高效"
        : insight.valueBarPercent >= 25
          ? "一般"
          : "偏低";
  }

  const topValueIds = valueCandidates
    .filter((candidate) => !models.find((model) => model.id === candidate.id)?.deprecated)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((candidate) => candidate.id);

  for (const id of topValueIds) {
    baseInsights[id].isTopValue = true;
    baseInsights[id].valueTier = "值选";
  }

  return {
    byModelId: baseInsights,
    topValueIds,
    metricRanges,
    medianProfileCost,
  };
}
