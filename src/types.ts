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
