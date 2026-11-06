import { formatPrice } from "../lib/models";
import type { InsightsResult, ModelInsight } from "../lib/insights";
import type {
  CopilotModel,
  ProfileDimension,
  ProfileDimensionKey,
  ProfileSourceKey,
} from "../types";

export type SortKey =
  | "name"
  | "vendor"
  | "input"
  | "output"
  | "cacheRead"
  | "referenceCost"
  | ProfileDimensionKey
  | "profile"
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
  kind?: "price" | "profile" | "value";
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
    key: "hard",
    label: "高难 20%",
    hint: "先取 Terminal-Bench 4.0；缺失时回退 Terminal-Bench 2.0 或 LMArena Agent。实色为直接基准，斜纹为代理。",
    kind: "profile",
  },
  {
    key: "medium",
    label: "通用 60%",
    hint: "先取 SWE-bench Verified；缺失时回退 LMArena Webdev。直接基准与代理使用不同纹理。",
    kind: "profile",
  },
  {
    key: "daily",
    label: "日常 20%",
    hint: "先取 ClawMark；缺失时回退 LMArena Document，再回退 Text。EmailBench 因构念不匹配不进入 Profile。",
    kind: "profile",
  },
  {
    key: "profile",
    label: "Profile",
    hint: "按 20/60/20 加权。至少两个维度且覆盖达到 80% 才计算；缺失维度不补零。",
    kind: "profile",
  },
  {
    key: "value",
    label: "综合性价比",
    hint: "仅完整 Profile 且至少一个直接基准的模型参与；性价比 = Profile ÷ (1 + 成本 / 中位成本)。",
    kind: "value",
  },
];

const sourceShortLabels: Record<ProfileSourceKey, string> = {
  terminalBench4: "TB4",
  terminalBench2: "TB2",
  sweBenchVerified: "SWE",
  longCliBench: "LongCLI",
  clawMark: "Claw",
  emailBench: "Email",
  lmArenaAgent: "Agent≈",
  lmArenaWebdev: "Webdev≈",
  lmArenaDocument: "Doc≈",
  lmArenaText: "Text≈",
};

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

function profileEvidenceTooltip(dimension: ProfileDimension) {
  const { evidence } = dimension;
  const provenance =
    evidence.kind === "proxy"
      ? "代理"
      : evidence.kind === "legacy"
        ? "历史直接基准"
        : "直接基准";
  const details = [
    evidence.sourceLabel,
    `${dimension.score.toFixed(1)} / 100`,
    provenance,
    evidence.sourceModelName,
    evidence.harness ? `Agent: ${evidence.harness}` : "",
    evidence.reasoningEffort
      ? `Effort: ${evidence.reasoningEffort}`
      : "",
    evidence.publishedAt ?? "",
  ].filter(Boolean);
  return details.join(" · ");
}

function ProfileDimensionCell({
  dimension,
}: {
  dimension: ProfileDimension | undefined;
}) {
  if (!dimension) {
    return (
      <div
        className="profile-dim-no-data"
        title="该维度没有可精确匹配的直接基准，也没有允许的代理数据。"
      >
        <span>无数据</span>
      </div>
    );
  }

  return (
    <div
      className={`profile-dim kind-${dimension.evidence.kind}`}
      title={profileEvidenceTooltip(dimension)}
    >
      <div className="profile-dim-heading">
        <strong>{dimension.score.toFixed(1)}</strong>
        <span>{sourceShortLabels[dimension.evidence.sourceKey]}</span>
      </div>
      <span className="profile-dim-track" aria-hidden="true">
        <span
          className="profile-dim-fill"
          style={{ width: `${Math.max(dimension.score, 1)}%` }}
        />
      </span>
    </div>
  );
}

function ProfileCell({ insight }: { insight: ModelInsight | undefined }) {
  if (!insight || insight.profile.score == null) {
    return (
      <div
        className="profile-no-data"
        title="至少需要两个维度且总覆盖达到 80%，才计算可信 Profile。"
      >
        <span>无可信 Profile</span>
        <small>覆盖 {insight?.profile.coverage ?? 0}%</small>
      </div>
    );
  }

  const { profile } = insight;
  const profileScore = profile.score;
  if (profileScore == null) return null;
  return (
    <div
      className="profile-value"
      title={`加权 Profile ${profileScore.toFixed(1)}；覆盖 ${profile.coverage}%；${profile.directDimensionCount} 个直接基准维度`}
    >
      <div className="profile-heading">
        <strong>{profileScore.toFixed(1)}</strong>
        <span className={`profile-confidence confidence-${profile.confidence}`}>
          {profile.confidence}
        </span>
      </div>
      <span className="profile-segments" aria-hidden="true">
        {(["hard", "medium", "daily"] as ProfileDimensionKey[]).map((key) => {
          const weight = key === "hard" ? 20 : key === "medium" ? 60 : 20;
          const dimension = profile.dimensions[key];
          return (
            <span
              key={key}
              className={`profile-segment segment-${key}`}
              style={{ width: `${weight}%` }}
            >
              {dimension && (
                <span
                  className="profile-segment-fill"
                  style={{ height: `${dimension.score}%` }}
                />
              )}
            </span>
          );
        })}
      </span>
      <small>
        {profile.coverage}% 覆盖 · {profile.directDimensionCount} 个直接指标
      </small>
    </div>
  );
}

function ValueCell({ insight }: { insight: ModelInsight | undefined }) {
  if (
    !insight ||
    insight.valueIndex == null ||
    insight.valueBarPercent == null
  ) {
    const profile = insight?.profile;
    const reason =
      !profile || profile.score == null
        ? "无可信 Profile"
        : profile.coverage < 100
          ? "Profile 不完整"
          : profile.directDimensionCount === 0
            ? "仅代理数据"
            : "无法计算";
    return (
      <div
        className="value-no-data"
        title="性价比只对覆盖完整的 Profile 且至少包含一个直接基准的模型计算。"
      >
        <span>无法评估</span>
        <small>{reason}</small>
      </div>
    );
  }

  return (
    <div
      className={`value-cell${insight.isTopValue ? " value-top" : ""}`}
      title="性价比 = 加权 Profile ÷ (1 + 参考成本 / 合格模型成本中位数)"
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

                <td className="column-price">
                  <PriceBar
                    value={formatPrice(model.input)}
                    percent={insight?.inputBarPercent ?? 0}
                  />
                </td>
                <td className="column-price">
                  <PriceBar
                    value={formatPrice(model.output)}
                    percent={insight?.outputBarPercent ?? 0}
                  />
                </td>

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

                <td className="column-profile">
                  <ProfileDimensionCell dimension={insight?.profile.dimensions.hard} />
                </td>
                <td className="column-profile">
                  <ProfileDimensionCell
                    dimension={insight?.profile.dimensions.medium}
                  />
                </td>
                <td className="column-profile">
                  <ProfileDimensionCell dimension={insight?.profile.dimensions.daily} />
                </td>
                <td className="column-profile-summary">
                  <ProfileCell insight={insight} />
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
