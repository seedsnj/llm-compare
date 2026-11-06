import {
  evidenceDetail,
  getModelPredictions,
  sourceInfo,
  tasks,
} from "../lib/predictions";
import { formatPrice } from "../lib/models";
import type {
  CapabilitySnapshot,
  Confidence,
  CopilotModel,
  Evidence,
  EvidenceKey,
} from "../types";

function confidenceClass(confidence: Confidence) {
  if (confidence === "无可信数据") return "none";
  if (confidence === "中") return "medium";
  if (confidence === "中低") return "guarded";
  return "low";
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span className={`confidence confidence-${confidenceClass(confidence)}`}>
      {confidence}
    </span>
  );
}

interface CapabilityComparisonProps {
  models: CopilotModel[];
  snapshot: CapabilitySnapshot;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function CapabilityComparison({
  models,
  snapshot,
  selectedId,
  onSelect,
}: CapabilityComparisonProps) {
  if (models.length === 0) {
    return (
      <section className="panel empty-panel">
        <h2>能力对比</h2>
        <p>Pin 最多 3 个模型后，这里会按五种任务并排展示可信度。</p>
      </section>
    );
  }

  const predictionsByModel = new Map(
    models.map((model) => [
      model.id,
      getModelPredictions(model.name, model.id, snapshot),
    ]),
  );

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Pinned comparison</p>
          <h2>能力对比</h2>
        </div>
        <span className="muted">点击单元格查看推断依据</span>
      </div>

      <div className="table-frame">
        <table className="capability-table">
          <thead>
            <tr>
              <th scope="col">任务</th>
              {models.map((model) => (
                <th key={model.id} scope="col">
                  <button
                    type="button"
                    className={`comparison-model${
                      selectedId === model.id ? " selected" : ""
                    }`}
                    onClick={() => onSelect(model.id)}
                  >
                    <span>{model.name}</span>
                    <small>{model.vendor}</small>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <th scope="row">{task.label}</th>
                {models.map((model) => {
                  const prediction = predictionsByModel
                    .get(model.id)
                    ?.find((item) => item.id === task.id);
                  const confidence = prediction?.confidence ?? "无可信数据";
                  return (
                    <td key={model.id}>
                      <button
                        type="button"
                        className="confidence-cell"
                        title={prediction?.summary}
                        onClick={() => onSelect(model.id)}
                      >
                        <ConfidenceBadge confidence={confidence} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="legend">
        “中低 / 低”表示基于邻近任务代理数据推断；“无可信数据”表示来源没有足够证据。
        置信度不跨榜单相加。
      </p>
    </section>
  );
}

interface PredictionDetailsProps {
  model: CopilotModel;
  snapshot: CapabilitySnapshot;
}

export function PredictionDetails({
  model,
  snapshot,
}: PredictionDetailsProps) {
  const predictions = getModelPredictions(model.name, model.id, snapshot);
  const evidence = snapshot.models[model.id] ?? {};

  return (
    <section className="prediction-section">
      <div className="section-heading detail-heading">
        <div>
          <p className="eyebrow">Task forecast</p>
          <h2>{model.name} 的日常开发预测</h2>
          <p className="subheading">
            {model.vendor} · 输入 {formatPrice(model.input)}/1M · 输出{" "}
            {formatPrice(model.output)}/1M
          </p>
        </div>
        <span className="snapshot-date">
          能力快照 {new Date(snapshot.capturedAt).toLocaleDateString("zh-CN")}
        </span>
      </div>

      <div className="prediction-grid">
        {predictions.map((prediction) => (
          <article
            className={`prediction-card prediction-${confidenceClass(
              prediction.confidence,
            )}`}
            key={prediction.id}
          >
            <div className="prediction-title">
              <div>
                <h3>{prediction.label}</h3>
                <p>{prediction.question}</p>
              </div>
              <ConfidenceBadge confidence={prediction.confidence} />
            </div>

            <p className="prediction-summary">{prediction.summary}</p>

            <div className="prediction-block">
              <h4>推断逻辑</h4>
              <ul>
                {prediction.logic.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="prediction-block">
              <h4>依据数据源</h4>
              {prediction.sources.length > 0 ? (
                <ul className="source-list">
                  {prediction.sources.map((source) => (
                    <li key={`${source.label}-${source.detail}`}>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.label}
                      </a>
                      <span className="source-detail">{source.detail}</span>
                      {!source.used && (
                        <span className="rejected-label">已核查，未采用</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="source-detail">无适用数据源</p>
              )}
            </div>
          </article>
        ))}
      </div>

      <EvidenceCoverage evidence={evidence} />
    </section>
  );
}

function EvidenceCoverage({
  evidence,
}: {
  evidence: Partial<Record<EvidenceKey, Evidence>>;
}) {
  const entries = Object.entries(evidence) as Array<[EvidenceKey, Evidence]>;

  return (
    <details className="evidence-drawer">
      <summary>查看全部原始能力匹配（{entries.length} 项）</summary>
      {entries.length === 0 ? (
        <p className="muted">该模型在候选能力源中没有精确匹配记录。</p>
      ) : (
        <div className="evidence-list">
          {entries.map(([key, item]) => (
            <div key={key} className="evidence-item">
              <a href={sourceInfo[key].url} target="_blank" rel="noreferrer">
                {sourceInfo[key].label}
              </a>
              <span>{evidenceDetail(item)}</span>
              <small>{item.publishedAt.slice(0, 10)}</small>
            </div>
          ))}
        </div>
      )}
    </details>
  );
}
