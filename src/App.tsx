import { useEffect, useMemo, useState } from "react";
import capabilityJson from "./data/capability-snapshot.json";
import pricingJson from "./data/pricing-fallback.json";
import {
  CapabilityComparison,
  PredictionDetails,
} from "./components/CapabilityPanel";
import {
  PricingTable,
  type SortDirection,
  type SortKey,
} from "./components/PricingTable";
import { buildModelInsights, type InsightsResult } from "./lib/insights";
import { formatDate, normalizeModelsDevPayload } from "./lib/models";
import type {
  CapabilitySnapshot,
  CopilotModel,
  PricingSnapshot,
} from "./types";

const PIN_STORAGE_KEY = "copilot-model-pins-v1";
const PRICING_STORAGE_KEY = "copilot-pricing-snapshot-v1";
const MODELS_DEV_URL = "https://models.dev/api.json";

const fallbackSnapshot = pricingJson as PricingSnapshot;
const capabilitySnapshot = capabilityJson as CapabilitySnapshot;

function readCachedPricing() {
  try {
    const raw = localStorage.getItem(PRICING_STORAGE_KEY);
    if (!raw) return null;

    const value = JSON.parse(raw) as PricingSnapshot;
    if (!Array.isArray(value.models) || value.models.length < 15) return null;
    return value;
  } catch {
    return null;
  }
}

function readPins() {
  try {
    const value = JSON.parse(localStorage.getItem(PIN_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is string => typeof item === "string")
      .slice(0, 3);
  } catch {
    return [];
  }
}

function compareModels(
  a: CopilotModel,
  b: CopilotModel,
  sortKey: SortKey,
  direction: SortDirection,
  insights: InsightsResult,
) {
  if (sortKey === "name" || sortKey === "vendor") {
    const comparison = a[sortKey].localeCompare(b[sortKey], "zh-CN", {
      sensitivity: "base",
    });
    return direction === "asc" ? comparison : -comparison;
  }

  const getValue = (model: CopilotModel) => {
    if (sortKey === "input" || sortKey === "output" || sortKey === "cacheRead") {
      return model[sortKey];
    }
    const insight = insights.byModelId[model.id];
    if (sortKey === "referenceCost") return insight?.referenceCost ?? null;
    if (sortKey === "value") return insight?.valueIndex ?? null;
    return insight?.metrics[sortKey]?.evidence.score ?? null;
  };

  const aValue = getValue(a);
  const bValue = getValue(b);
  if (aValue == null && bValue == null) return 0;
  if (aValue == null) return 1;
  if (bValue == null) return -1;
  const comparison = aValue - bValue;
  return direction === "asc" ? comparison : -comparison;
}

export default function App() {
  const initialSnapshot = useMemo(
    () => readCachedPricing() ?? fallbackSnapshot,
    [],
  );
  const [pricingSnapshot, setPricingSnapshot] = useState(initialSnapshot);
  const [pricingOrigin, setPricingOrigin] = useState(
    initialSnapshot === fallbackSnapshot ? "内置快照" : "本地缓存",
  );
  const [query, setQuery] = useState("");
  const [showCachedRead, setShowCachedRead] = useState(false);
  const [includeRetired, setIncludeRetired] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>(readPins);
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedId, setSelectedId] = useState<string | null>(
    () =>
      initialSnapshot.models.find((model) => !model.deprecated)?.id ??
      initialSnapshot.models[0]?.id ??
      null,
  );
  const [updateState, setUpdateState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [updateMessage, setUpdateMessage] = useState("");

  const availableModels = useMemo(
    () =>
      pricingSnapshot.models.filter(
        (model) => includeRetired || !model.deprecated,
      ),
    [includeRetired, pricingSnapshot.models],
  );
  const modelInsights = useMemo(
    () => buildModelInsights(pricingSnapshot.models, capabilitySnapshot),
    [pricingSnapshot.models],
  );

  const visibleModels = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
    const filtered = availableModels.filter((model) => {
      if (!normalizedQuery) return true;
      return `${model.name} ${model.vendor}`
        .toLocaleLowerCase("zh-CN")
        .includes(normalizedQuery);
    });

    return filtered.sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id);
      const bPinned = pinnedIds.includes(b.id);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      return compareModels(a, b, sortKey, sortDirection, modelInsights);
    });
  }, [
    availableModels,
    modelInsights,
    pinnedIds,
    query,
    sortDirection,
    sortKey,
  ]);

  const pinnedModels = useMemo(
    () =>
      pinnedIds
        .map((id) => availableModels.find((model) => model.id === id))
        .filter((model): model is CopilotModel => Boolean(model)),
    [availableModels, pinnedIds],
  );

  const selectedModel =
    pricingSnapshot.models.find((model) => model.id === selectedId) ?? null;
  const activeCount = pricingSnapshot.models.filter(
    (model) => !model.deprecated,
  ).length;
  const retiredCount = pricingSnapshot.models.length - activeCount;

  useEffect(() => {
    if (
      !selectedId ||
      !pricingSnapshot.models.some((model) => model.id === selectedId)
    ) {
      const first =
        pricingSnapshot.models.find((model) => !model.deprecated) ??
        pricingSnapshot.models[0];
      setSelectedId(first?.id ?? null);
    }
  }, [pricingSnapshot.models, selectedId]);

  useEffect(() => {
    try {
      localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinnedIds));
    } catch {
      // Persistence is best-effort when storage is unavailable.
    }
  }, [pinnedIds]);

  function handleSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(
      nextKey === "name" || nextKey === "vendor" ? "asc" : "desc",
    );
  }

  function handleTogglePin(id: string) {
    setPinnedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });
  }

  async function handleRefreshPricing() {
    setUpdateState("loading");
    setUpdateMessage("正在从 models.dev 获取最新价格…");

    try {
      const response = await fetch(MODELS_DEV_URL, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`models.dev 返回 HTTP ${response.status}`);
      }

      const nextSnapshot = normalizeModelsDevPayload(await response.json());
      setPricingSnapshot(nextSnapshot);
      setPricingOrigin("在线更新");
      setUpdateState("success");
      setUpdateMessage(
        `价格已更新：${formatDate(nextSnapshot.capturedAt)}。能力数据仍使用固定快照。`,
      );

      try {
        localStorage.setItem(
          PRICING_STORAGE_KEY,
          JSON.stringify(nextSnapshot),
        );
      } catch {
        setUpdateMessage(
          "价格已更新，但浏览器存储空间不足，刷新页面后将回到内置快照。",
        );
      }
    } catch (error) {
      setUpdateState("error");
      setUpdateMessage(
        `更新失败，继续使用${pricingOrigin}。${
          error instanceof Error ? error.message : "未知错误"
        }`,
      );
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">GitHub Copilot · AI Credits</p>
          <h1>按任务看懂模型价格与能力</h1>
          <p className="intro">
            只比较用量计费口径。1 credit = $0.01；价格单位为美元 / 100 万
            tokens。能力预测只使用可精确匹配的 LMArena 与
            Artificial Analysis 数据，不用猜测填补空白。
          </p>
        </div>
        <div className="summary-strip" aria-label="数据摘要">
          <div>
            <strong>{activeCount}</strong>
            <span>当前可用</span>
          </div>
          <div>
            <strong>{retiredCount}</strong>
            <span>已退役</span>
          </div>
          <div>
            <strong>{pinnedIds.length}/3</strong>
            <span>已 Pin</span>
          </div>
        </div>
      </header>

      <section className="control-panel" aria-label="筛选与更新">
        <div className="search-field">
          <label htmlFor="model-search">筛选模型或供应商</label>
          <input
            id="model-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例如：Claude、GPT、OpenAI"
            autoComplete="off"
          />
        </div>

        <label className="toggle">
          <input
            type="checkbox"
            checked={showCachedRead}
            onChange={(event) => setShowCachedRead(event.target.checked)}
          />
          <span>显示缓存输入价</span>
        </label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={includeRetired}
            onChange={(event) => setIncludeRetired(event.target.checked)}
          />
          <span>包含已退役模型</span>
        </label>

        <button
          type="button"
          className="refresh-button"
          onClick={handleRefreshPricing}
          disabled={updateState === "loading"}
        >
          {updateState === "loading" ? "更新中…" : "更新价格"}
        </button>
      </section>

      <div className="data-status" role="status">
        <span>
          定价：{pricingOrigin} · {formatDate(pricingSnapshot.capturedAt)}
        </span>
        <a href={MODELS_DEV_URL} target="_blank" rel="noreferrer">
          models.dev 原始 JSON ↗
        </a>
        {updateMessage && (
          <span className={`update-message ${updateState}`}>{updateMessage}</span>
        )}
      </div>

      <section className="panel pricing-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Pricing table</p>
            <h2>模型、成本与能力</h2>
          </div>
          <p className="table-hint">
            {visibleModels.length} 个结果 · 默认按开发性价比排序 · Pin
            始终置顶
          </p>
        </div>

        <PricingTable
          models={visibleModels}
          insights={modelInsights}
          pinnedIds={pinnedIds}
          selectedId={selectedId}
          showCachedRead={showCachedRead}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          onSelect={setSelectedId}
          onTogglePin={handleTogglePin}
        />

        <div className="visual-legend">
          <span title="按 100,000 input + 12,000 output tokens 估算，不含缓存折扣">
            参考成本 = 100k 输入 + 12k 输出，1 credit = $0.01
          </span>
          <span>价格条为对数刻度；能力条只在同一指标内比较</span>
          <span>无数据不会被当作 0 分</span>
        </div>

        {!includeRetired && (
          <p className="retired-note">
            GPT-5.5 已于 2026-10-19 退役，当前列表隐藏；打开“包含已退役模型”可查看其历史价格与能力记录。
          </p>
        )}
      </section>

      <CapabilityComparison
        models={pinnedModels}
        snapshot={capabilitySnapshot}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {selectedModel ? (
        <PredictionDetails
          model={selectedModel}
          snapshot={capabilitySnapshot}
        />
      ) : (
        <section className="panel empty-panel">
          <h2>选择一个模型</h2>
          <p>从价格表中选择模型即可查看五类任务预测。</p>
        </section>
      )}

      <footer className="app-footer">
        <p>
          能力快照：LMArena 数据 revision{" "}
          <code>{capabilitySnapshot.dataset.revision.slice(0, 12)}</code>，
          Artificial Analysis 数据生成于{" "}
          {formatDate(capabilitySnapshot.aiIndex.generatedAt)}。
        </p>
        <div>
          <a
            href={capabilitySnapshot.dataset.url}
            target="_blank"
            rel="noreferrer"
          >
            LMArena 数据集 ↗
          </a>
          <a
            href={capabilitySnapshot.aiIndex.repository}
            target="_blank"
            rel="noreferrer"
          >
            ai-model-index ↗
          </a>
        </div>
        <p>
          预测是能力代理，不是厂商承诺。缺失、低样本或非专项数据不会被补成能力分数。
        </p>
      </footer>
    </main>
  );
}

