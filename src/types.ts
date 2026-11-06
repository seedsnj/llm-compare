export interface CopilotModel {
  id: string;
  name: string;
  vendorKey: string;
  vendor: string;
  status: string;
  deprecated: boolean;
  input: number | null;
  output: number | null;
  cacheRead: number | null;
  cacheWrite: number | null;
  context: number | null;
  maxOutput: number | null;
  releaseDate: string | null;
  canonicalModelId: string | null;
}

export interface PricingSnapshot {
  capturedAt: string;
  source: {
    name: string;
    url: string;
    provider: string;
  };
  models: CopilotModel[];
}

export type EvidenceKey =
  | "aaIntelligence"
  | "sciCode"
  | "liveCodeBench"
  | "text"
  | "document"
  | "webdev"
  | "agent"
  | "bashReliability"
  | "taskOutcome"
  | "steerability"
  | "toolHallucination"
  | "praiseComplaint";

export interface Evidence {
  metric: "index" | "rating" | "ips";
  score: number;
  rank: number;
  modelName: string;
  lower?: number;
  upper?: number;
  sampleCount?: number | null;
  sessionCount?: number | null;
  publishedAt: string;
  profile?: string;
  metricName?: string;
  config?: string;
  datasetRevision?: string;
}

export interface CapabilitySnapshot {
  capturedAt: string;
  dataset: {
    id: string;
    revision: string;
    lastModified: string;
    url: string;
  };
  aiIndex: {
    generatedAt: string;
    source: {
      name: string;
      url: string;
    };
    repository: string;
    availability: Record<string, number>;
  };
  lmArena: {
    configs: Record<
      string,
      {
        config: string;
        url: string;
        publishedAt: string | null;
        rows: number;
      }
    >;
  };
  models: Record<string, Partial<Record<EvidenceKey, Evidence>>>;
}

export type TaskId =
  | "documentation"
  | "architecture"
  | "implementation"
  | "testing"
  | "collaboration";

export type Confidence = "中" | "中低" | "低" | "无可信数据";

export interface SourceReference {
  label: string;
  url: string;
  detail: string;
  used: boolean;
}

export interface TaskPrediction {
  id: TaskId;
  label: string;
  question: string;
  confidence: Confidence;
  summary: string;
  logic: string[];
  sources: SourceReference[];
}

export type BenchmarkKey =
  | "terminalBench4"
  | "terminalBench2"
  | "sweBenchVerified"
  | "longCliBench"
  | "clawMark"
  | "emailBench";

export type ProfileDimensionKey = "hard" | "medium" | "daily";
export type ProfileEvidenceKind = "direct" | "legacy" | "proxy";

export interface BenchmarkResult {
  modelId: string;
  score: number;
  sourceModelName: string;
  harness: string;
  reasoningEffort: string;
  modelReleaseDate?: string | null;
  publishedAt?: string | null;
}

export interface BenchmarkSource {
  label: string;
  version: string;
  url: string;
  kind: "direct" | "legacy";
  usedInProfile: boolean;
  note: string;
  results: BenchmarkResult[];
}

export interface BenchmarkSnapshot {
  capturedAt: string;
  benchmarks: Record<BenchmarkKey, BenchmarkSource>;
}

export type ProfileSourceKey =
  | BenchmarkKey
  | "lmArenaAgent"
  | "lmArenaWebdev"
  | "lmArenaDocument"
  | "lmArenaText";

export interface ProfileDimensionEvidence {
  sourceKey: ProfileSourceKey;
  sourceLabel: string;
  sourceUrl: string;
  sourceModelName: string;
  score: number;
  kind: "direct" | "legacy" | "proxy";
  harness?: string;
  reasoningEffort?: string;
  publishedAt?: string | null;
}

export interface ProfileDimension {
  key: ProfileDimensionKey;
  label: string;
  weight: number;
  score: number;
  evidence: ProfileDimensionEvidence;
}

export type ProfileConfidence = "中低" | "低" | "仅代理" | "数据不足";

export interface ProfileInsight {
  dimensions: Partial<Record<ProfileDimensionKey, ProfileDimension>>;
  score: number | null;
  coverage: number;
  directDimensionCount: number;
  confidence: ProfileConfidence;
  missingDimensions: ProfileDimensionKey[];
}
