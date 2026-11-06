import { formatPrice } from "../lib/models";
import type {
  CapabilityInsight,
  CapabilityMetricKey,
  InsightsResult,
  ModelInsight,
} from "../lib/insights";
import { evidenceDetail, sourceInfo } from "../lib/predictions";
import type { CopilotModel, Evidence } from "../types";

export type SortKey =
  | "name"
  | "vendor"
  | "input"
  | "output"
  | "cacheRead"
  | "referenceCost"
  | CapabilityMetricKey
  | "value";
export type SortDirection = "asc" | "desc";

interface PricingTableProps {
  models: CopilotModel[];
  insights: InsightsResult;
  pinnedIds: string[];
  selectedId: string | null;
  showCachedRead: boolean;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  onSelect: (id: string) => void;
  onTogglePin: (id: string) => void;
}

const columns: Array<{
  key: SortKey;
  label: string;
  hint?: string;
  cachedOnly?: boolean;
  kind?: "price" | "metric" | "value";
}> = [
  { key: "name", label: "模型 / 供应商" },
  {
    key: "input",
    label: "输入 $/1M",
    hint: "原始单价是权威值；价格条按当前有效模型范围使用对数刻度展示数量级。",
    kind: "price",
  },
  {
    key: "output",
    label: "输出 $/1M",
    hint: "原始单价是权威值；价格条按当前有效模型范围使用对数刻度展示数量级。",
    kind: "price",
  },
  {
    key: "cacheRead",
    label: "缓存输入 $/1M",
    hint: "仅展示缓存命中的输入价格，默认关闭。",
    cachedOnly: true,
    kind: "price",
  },
  {
    key: "referenceCost",
    label: "参考成本",
    hint: "按 100,000 input + 12,000 output tokens 估算；不含缓存折扣。括号内为 AI Credits。",
    kind: "price",
  },
  {
    key: "aaIntelligence",
    label: "AA 智能",
    hint: "AA Intelligence 不是百分制。数字为原始指数；条长按当前快照中相同指标的匹配模型做相对归一化。",
    kind: "metric",
  },
  {
    key: "text",
    label: "LMArena 文本",
    hint: "LMArena 文本为 Bradley–Terry 分数，不是百分制；条长按当前快照匹配范围归一化。",
    kind: "metric",
  },
  {
    key: "webdev",
    label: "Webdev",
    hint: "LMArena Webdev Code Arena 分数；条长按当前快照匹配范围归一化。",
    kind: "metric",
  },
  {
    key: "agent",
    label: "Agent",
    hint: "LMArena Agent Arena IPS 分数，可为负；条长按当前快照匹配范围归一化。",
    kind: "metric",
  },
  {
    key: "value",
    label: "开发性价比",
    hint: "基于 Webdev 相对能力与参考成本计算，仅评估有 Webdev 数据的模型。无数据不参与排名。",
    kind: "value",
  },
];

function SortMark({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  if (!active) return <span className="sort-mark">↕</span>;
  return (
    <span className="sort-mark active" aria-hidden="true">
      {direction === "asc" ? "↑" : "↓"}
    </span>
  );
}

function PriceBar({
  value,
  percent,
  label,
}: {
  value: string;
  percent: number;
  label?: string;
}) {
  const tone = percent >= 67 ? "high" : percent >= 34 ? "mid" : "low";
  return (
    <div className={`micro-value price-${tone}`}>
      <span className="micro-number">{value}</span>
      {label && <span className="micro-label">{label}</span>}
      <span className="micro-track" aria-hidden="true">
        <span
          className="micro-fill"
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
      </span>
    </div>
  );
}

function formatMetric(evidence: Evidence, key: CapabilityMetricKey) {
  if (key === "agent") {
    return `${evidence.score >= 0 ? "+" : ""}${evidence.score.toFixed(3)}`;
  }
  return evidence.score.toFixed(1);
}

function CapabilityCell({
  capability,
  metricKey,
  rangeCount,
}: {
  capability: CapabilityInsight | null;
  metricKey: CapabilityMetricKey;
  rangeCount: number;
}) {
  if (!capability) {
    return (
      <div
        className="metric-no-data"
        title="该模型没有可精确匹配的当前能力记录，因此不显示分数或零值。"
      >
        <span>无数据</span>
        <small>未精确匹配</small>
      </div>
    );
  }

  const { evidence, barPercent } = capability;
  const tooltip = `${sourceInfo[metricKey].label} · ${evidenceDetail(
    evidence,
  )}。条长按当前快照 ${rangeCount} 个匹配模型归一化。`;

  return (
    <div className="metric-value" title={tooltip}>
      <div className="metric-value-top">
        <strong>{formatMetric(evidence, metricKey)}</strong>
        <span>#{evidence.rank}</span>
      </div>
      <span className="ability-track" aria-hidden="true">
        <span
          className={`ability-fill ability-${metricKey}`}
          style={{ width: `${Math.max(barPercent, 1)}%` }}
        />
      </span>
    </div>
  );
}

function ValueCell({ insight }: { insight: ModelInsight | undefined }) {
  if (
    !insight ||
    insight.valueIndex == null ||
    insight.valueBarPercent == null
  ) {
    return (
      <div
        className="value-no-data"
        title="开发性价比只使用可精确匹配的 LMArena Webdev 数据；无数据模型不参与排名。"
      >
        <span>无法评估</span>
        <small>缺少 Webdev</small>
      </div>
    );
  }

  return (
    <div
      className={`value-cell${insight.isTopValue ? " value-top" : ""}`}
      title="性价比 = Webdev 相对能力 ÷ (1 + 参考成本 / 有效模型参考成本中位数)"
    >
      <div className="value-heading">
        <strong>{insight.valueIndex.toFixed(1)}</strong>
        <span className={`value-tier tier-${insight.valueTier}`}>
          {insight.valueTier}
        </span>
      </div>
      <span className="value-track" aria-hidden="true">
        <span
          className="value-fill"
          style={{ width: `${Math.max(insight.valueBarPercent, 1)}%` }}
        />
      </span>
    </div>
  );
}

export function PricingTable({
  models,
  insights,
  pinnedIds,
  selectedId,
  showCachedRead,
  sortKey,
  sortDirection,
  onSort,
  onSelect,
  onTogglePin,
}: PricingTableProps) {
  const visibleColumns = columns.filter(
    (column) => !column.cachedOnly || showCachedRead,
  );

  return (
    <div className="table-frame">
      <table className="pricing-table">
        <thead>
          <tr>
            <th className="pin-column" scope="col">
              Pin
            </th>
            {visibleColumns.map((column) => {
              const active = sortKey === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={`column-${column.kind ?? "text"}${
                    column.key === "name" ? " model-column" : ""
                  }`}
                  aria-sort={
                    active
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    className="sort-button"
                    type="button"
                    onClick={() => onSort(column.key)}
                    aria-label={`${column.label}，点击排序`}
                  >
                    <span>{column.label}</span>
                    {column.hint && (
                      <span
                        className="info-mark"
                        title={column.hint}
                        aria-label={column.hint}
                      >
                        ?
                      </span>
                    )}
                    <SortMark active={active} direction={sortDirection} />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {models.map((model) => {
            const isPinned = pinnedIds.includes(model.id);
            const isSelected = selectedId === model.id;
            const insight = insights.byModelId[model.id];
            const prices = [
              {
                value: model.input,
                percent: insight?.inputBarPercent,
              },
              {
                value: model.output,
                percent: insight?.outputBarPercent,
              },
            ];

            return (
              <tr
                key={model.id}
                className={[
                  isPinned ? "is-pinned" : "",
                  isSelected ? "is-selected" : "",
                  insight?.isTopValue ? "is-top-value" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onSelect(model.id)}
              >
                <td className="pin-column">
                  <button
                    type="button"
                    className={`pin-button${isPinned ? " active" : ""}`}
                    aria-label={`${isPinned ? "取消 Pin" : "Pin"} ${model.name}`}
                    aria-pressed={isPinned}
                    disabled={!isPinned && pinnedIds.length >= 3}
                    title={
                      !isPinned && pinnedIds.length >= 3
                        ? "最多 Pin 3 个模型"
                        : isPinned
                          ? "取消 Pin"
                          : "固定到顶部"
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      onTogglePin(model.id);
                    }}
                  >
                    {isPinned ? "★" : "☆"}
                  </button>
                </td>

                <td className="model-column">
                  <div className="model-identity">
                    <button
                      type="button"
                      className="model-link"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(model.id);
                      }}
                    >
                      <span>{model.name}</span>
                    </button>
                    <div className="model-meta">
                      <span>{model.vendor}</span>
                      {model.deprecated && (
                        <span className="status-badge">已退役</span>
                      )}
                      {isPinned && <span className="pin-label">PIN</span>}
                    </div>
                  </div>
                </td>

                {prices.map((price, index) => (
                  <td
                    key={index === 0 ? "input" : "output"}
                    className="column-price"
                  >
                    <PriceBar
                      value={formatPrice(price.value)}
                      percent={price.percent ?? 0}
                    />
                  </td>
                ))}

                {showCachedRead && (
                  <td className="column-price">
                    <PriceBar
                      value={formatPrice(model.cacheRead)}
                      percent={insight?.cacheBarPercent ?? 0}
                    />
                  </td>
                )}

                <td className="column-cost">
                  <PriceBar
                    value={`${formatPrice(insight?.referenceCost ?? null)} · ${
                      insight ? insight.referenceCredits.toFixed(1) : "—"
                    } cr`}
                    percent={insight?.costBarPercent ?? 0}
                    label={insight?.costTier}
                  />
                </td>

                <td className="column-metric">
                  <CapabilityCell
                    capability={insight?.metrics.aaIntelligence ?? null}
                    metricKey="aaIntelligence"
                    rangeCount={insights.metricRanges.aaIntelligence.count}
                  />
                </td>
                <td className="column-metric">
                  <CapabilityCell
                    capability={insight?.metrics.text ?? null}
                    metricKey="text"
                    rangeCount={insights.metricRanges.text.count}
                  />
                </td>
                <td className="column-metric">
                  <CapabilityCell
                    capability={insight?.metrics.webdev ?? null}
                    metricKey="webdev"
                    rangeCount={insights.metricRanges.webdev.count}
                  />
                </td>
                <td className="column-metric">
                  <CapabilityCell
                    capability={insight?.metrics.agent ?? null}
                    metricKey="agent"
                    rangeCount={insights.metricRanges.agent.count}
                  />
                </td>
                <td className="column-value">
                  <ValueCell insight={insight} />
                </td>
              </tr>
            );
          })}
          {models.length === 0 && (
            <tr>
              <td className="empty-row" colSpan={visibleColumns.length + 1}>
                没有符合当前筛选条件的模型。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
