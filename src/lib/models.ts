import type { CopilotModel, PricingSnapshot } from "../types";

const vendorLabels: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  xai: "xAI",
  moonshotai: "Moonshot AI",
  microsoft: "Microsoft",
};

interface RawModel {
  id?: unknown;
  name?: unknown;
  status?: unknown;
  cost?: {
    input?: unknown;
    output?: unknown;
    cache_read?: unknown;
    cache_write?: unknown;
  };
  limit?: {
    context?: unknown;
    output?: unknown;
  };
  release_date?: unknown;
  canonical_model_id?: unknown;
}

interface ModelsDevPayload {
  "github-copilot"?: {
    models?: Record<string, RawModel>;
  };
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function optionalString(value: unknown) {
  return typeof value === "string" ? value : null;
}

export function normalizeModelsDevPayload(
  payload: unknown,
  capturedAt = new Date().toISOString(),
): PricingSnapshot {
  const response = payload as ModelsDevPayload;
  const rawModels = response["github-copilot"]?.models;

  if (!rawModels || typeof rawModels !== "object") {
    throw new Error("响应中缺少 github-copilot.models。");
  }

  const models = Object.entries(rawModels).flatMap(
    ([fallbackId, raw]): CopilotModel[] => {
      const id = optionalString(raw.id) ?? fallbackId;
      const name = optionalString(raw.name);
      const canonicalModelId = optionalString(raw.canonical_model_id);

      if (!id || !name) return [];

      const vendorKey = canonicalModelId?.split("/")[0] ?? "unknown";
      return [
        {
          id,
          name,
          vendorKey,
          vendor: vendorLabels[vendorKey] ?? vendorKey,
          status: optionalString(raw.status) ?? "active",
          deprecated: raw.status === "deprecated",
          input: optionalNumber(raw.cost?.input),
          output: optionalNumber(raw.cost?.output),
          cacheRead: optionalNumber(raw.cost?.cache_read),
          cacheWrite: optionalNumber(raw.cost?.cache_write),
          context: optionalNumber(raw.limit?.context),
          maxOutput: optionalNumber(raw.limit?.output),
          releaseDate: optionalString(raw.release_date),
          canonicalModelId,
        },
      ];
    },
  );

  if (models.length < 15) {
    throw new Error(`模型数量异常：只解析到 ${models.length} 个。`);
  }

  return {
    capturedAt,
    source: {
      name: "models.dev",
      url: "https://models.dev/api.json",
      provider: "GitHub Copilot",
    },
    models,
  };
}

export function formatPrice(value: number | null) {
  if (value == null) return "—";
  return `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(value)}`;
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
