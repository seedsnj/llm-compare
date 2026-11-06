import type {
  CapabilitySnapshot,
  Confidence,
  Evidence,
  EvidenceKey,
  SourceReference,
  TaskId,
  TaskPrediction,
} from "../types";

const rowUrl = (config: string) =>
  `https://datasets-server.huggingface.co/rows?dataset=lmarena-ai%2Fleaderboard-dataset&config=${config}&split=latest&offset=0&length=100`;

export const sourceInfo: Record<
  EvidenceKey,
  { label: string; shortLabel: string; url: string }
> = {
  aaIntelligence: {
    label: "Artificial Analysis Intelligence（经 ai-model-index）",
    shortLabel: "AA Intelligence",
    url: "https://raw.githubusercontent.com/EvanZhouDev/ai-model-index/main/data/llm/aa-intelligence.json",
  },
  sciCode: {
    label: "SciCode（经 ai-model-index）",
    shortLabel: "SciCode",
    url: "https://raw.githubusercontent.com/EvanZhouDev/ai-model-index/main/data/llm/scicode.json",
  },
  liveCodeBench: {
    label: "LiveCodeBench（经 ai-model-index）",
    shortLabel: "LiveCodeBench",
    url: "https://raw.githubusercontent.com/EvanZhouDev/ai-model-index/main/data/llm/livecodebench.json",
  },
  text: {
    label: "LMArena 文本综合偏好",
    shortLabel: "LMArena 文本",
    url: rowUrl("text"),
  },
  document: {
    label: "LMArena Document",
    shortLabel: "LMArena 文档",
    url: rowUrl("document"),
  },
  webdev: {
    label: "LMArena Webdev（Code Arena）",
    shortLabel: "LMArena Webdev",
    url: rowUrl("webdev"),
  },
  agent: {
    label: "LMArena Agent Arena 综合",
    shortLabel: "LMArena Agent",
    url: rowUrl("agent"),
  },
  bashReliability: {
    label: "LMArena Agent Bash Reliability",
    shortLabel: "Bash 可靠性",
    url: rowUrl("agent_bash_reliability"),
  },
  taskOutcome: {
    label: "LMArena Agent Confirmed Success",
    shortLabel: "确认完成",
    url: rowUrl("agent_task_outcome_explicit"),
  },
  steerability: {
    label: "LMArena Agent Steerability",
    shortLabel: "可操控性",
    url: rowUrl("agent_steerability"),
  },
  toolHallucination: {
    label: "LMArena Agent Tool Hallucination",
    shortLabel: "工具幻觉",
    url: rowUrl("agent_tool_hallucination"),
  },
  praiseComplaint: {
    label: "LMArena Agent Praise/Complaint",
    shortLabel: "表扬/投诉",
    url: rowUrl("agent_praise_complaint"),
  },
};

const taskDefinitions: Array<{
  id: TaskId;
  label: string;
  question: string;
}> = [
  {
    id: "documentation",
    label: "理解、整理开发文档",
    question: "能否帮助阅读、归并和整理开发文档？",
  },
  {
    id: "architecture",
    label: "架构发现与定义",
    question: "能否辅助发现边界、依赖和设计权衡？",
  },
  {
    id: "implementation",
    label: "规范定义和实现",
    question: "能否根据约束完成规范澄清与实现？",
  },
  {
    id: "testing",
    label: "测试与命令行驱动开发",
    question: "能否可靠执行命令、根据结果修正并推进任务？",
  },
  {
    id: "collaboration",
    label: "日常协作情商",
    question: "能否理解团队合作、竞争和拆台等基本动态？",
  },
];

function formatNumber(value: number, digits = 1) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: digits,
  }).format(value);
}

function formatScore(evidence: Evidence) {
  if (evidence.metric === "rating") {
    return formatNumber(evidence.score, 1);
  }

  if (evidence.metricName === "scicode" || evidence.metricName === "livecodebench") {
    return `${formatNumber(evidence.score * 100, 1)}%`;
  }

  if (evidence.metric === "ips") {
    return `${evidence.score >= 0 ? "+" : ""}${formatNumber(evidence.score, 3)}`;
  }

  return formatNumber(evidence.score, 1);
}

export function evidenceDetail(evidence: Evidence) {
  const samples =
    evidence.sampleCount == null
      ? ""
      : ` · ${
          evidence.metric === "ips" ? "观测" : "票数"
        } ${formatNumber(evidence.sampleCount, 0)}`;
  const interval =
    evidence.lower == null || evidence.upper == null
      ? ""
      : ` · 95% 区间 ${formatScore({
          ...evidence,
          score: evidence.lower,
        })}–${formatScore({ ...evidence, score: evidence.upper })}`;

  return `第 ${evidence.rank} 名 · ${formatScore(evidence)}${interval}${samples} · ${
    evidence.modelName
  }`;
}

function sourceRefs(
  keys: EvidenceKey[],
  evidence: Partial<Record<EvidenceKey, Evidence>>,
) {
  return keys.flatMap((key) => {
    const value = evidence[key];
    if (!value) return [];

    return [
      {
        label: sourceInfo[key].label,
        url: sourceInfo[key].url,
        detail: evidenceDetail(value),
        used: true,
      } satisfies SourceReference,
    ];
  });
}

function hasAny(
  keys: EvidenceKey[],
  evidence: Partial<Record<EvidenceKey, Evidence>>,
) {
  return keys.some((key) => evidence[key]);
}

function noData(
  id: TaskId,
  logic: string[],
  sources: SourceReference[] = [],
): TaskPrediction {
  const definition = taskDefinitions.find((task) => task.id === id);
  if (!definition) {
    throw new Error(`Unknown task: ${id}`);
  }

  return {
    ...definition,
    confidence: "无可信数据",
    summary: "无可信数据",
    logic,
    sources,
  };
}

export function buildPredictions(
  modelName: string,
  evidence: Partial<Record<EvidenceKey, Evidence>>,
): TaskPrediction[] {
  const documentEvidence = evidence.document;
  const intelligenceEvidence = evidence.aaIntelligence;
  const webdevEvidence = evidence.webdev;
  const taskOutcomeEvidence = evidence.taskOutcome;
  const steerabilityEvidence = evidence.steerability;
  const bashEvidence = evidence.bashReliability;
  const toolHallucinationEvidence = evidence.toolHallucination;
  const sciCodeEvidence = evidence.sciCode;
  const liveCodeBenchEvidence = evidence.liveCodeBench;

  const documentation: TaskPrediction = documentEvidence
    ? {
        ...taskDefinitions[0],
        confidence:
          (documentEvidence.sampleCount ?? 0) >= 5000 ? "中低" : "低",
        summary: `${modelName} 在文档任务人类偏好中排第 ${
          documentEvidence.rank
        } 名；可作为文档整理候选，但不能延伸到全部开发文档语义。`,
        logic: [
          "LMArena Document 记录匿名用户对文档任务结果的偏好，能提供文档写作与整理的邻近证据。",
          "该榜单不是专门的代码库文档理解基准，也不验证引用准确性、API 一致性和复杂依赖阅读。",
          ...(intelligenceEvidence
            ? ["AA Intelligence 只作为综合推理的弱补充，不单独提高置信度。"]
            : []),
        ],
        sources: sourceRefs(
          ["document", "aaIntelligence"],
          evidence,
        ),
      }
    : intelligenceEvidence
      ? {
          ...taskDefinitions[0],
          confidence: "低",
          summary: `${modelName} 没有文档专项数据；只能依据综合推理给出弱预测。`,
          logic: [
            "AA Intelligence 测量综合推理，不是文档理解、摘要或技术写作专项。",
            "仅用综合指数推断文档任务会产生较大不确定性。",
          ],
          sources: sourceRefs(["aaIntelligence"], evidence),
        }
      : noData("documentation", [
          "当前能力快照中没有该模型的文档任务记录。",
          "缺少专项数据时不以模型名称、价格或通用偏好补值。",
        ]);

  const architectureKeys: EvidenceKey[] = [
    "webdev",
    "steerability",
    "taskOutcome",
    "aaIntelligence",
  ];
  const architecture: TaskPrediction = hasAny(architectureKeys, evidence)
    ? {
        ...taskDefinitions[1],
        confidence: "低",
        summary: `${modelName} 有少量复杂任务代理信号，但没有架构专项证据；只能视为架构工作的弱候选。`,
        logic: [
          "候选源没有直接测量系统边界、依赖设计、技术权衡或 ADR 质量的架构基准。",
          ...(webdevEvidence
            ? ["Webdev 衡量 Web 实现偏好，可弱代理工程上下文中的结构能力。"]
            : []),
          ...(steerabilityEvidence
            ? ["Steerability 衡量用户纠正成本，可弱代理方案受约束调整的顺畅度。"]
            : []),
          ...(taskOutcomeEvidence
            ? ["Confirmed Success 只说明用户明确确认任务完成，不说明架构方案本身最优。"]
            : []),
          ...(intelligenceEvidence
            ? ["AA Intelligence 只提供综合推理代理。"]
            : []),
        ],
        sources: sourceRefs(architectureKeys, evidence),
      }
    : noData("architecture", [
        "当前能力快照没有该模型的架构任务代理数据。",
        "不使用价格、发布代际或其他模型的结果代替。",
      ]);

  const implementationKeys: EvidenceKey[] = [
    "webdev",
    "taskOutcome",
    "steerability",
    "sciCode",
    "aaIntelligence",
  ];
  const implementation: TaskPrediction = hasAny(implementationKeys, evidence)
    ? {
        ...taskDefinitions[2],
        confidence:
          webdevEvidence && (taskOutcomeEvidence || steerabilityEvidence)
            ? "中低"
            : "低",
        summary: `${modelName} 有实现侧证据${
          webdevEvidence ? `（Webdev 第 ${webdevEvidence.rank} 名）` : ""
        }；适合作为实现候选，但规范定义仍缺少专测。`,
        logic: [
          ...(webdevEvidence
            ? ["Webdev 是 Code Arena 的实现结果偏好，直接覆盖网页实现侧。"]
            : []),
          ...(taskOutcomeEvidence
            ? ["Confirmed Success 提供用户明确确认完成的端到端信号。"]
            : []),
          ...(steerabilityEvidence
            ? ["Steerability 反映用户纠正方案所需的额外成本。"]
            : []),
          ...(sciCodeEvidence
            ? ["SciCode 只作为程序求解能力的弱代理。"]
            : []),
          ...(intelligenceEvidence
            ? ["AA Intelligence 只作为约束理解和推理的弱代理。"]
            : []),
          "没有来源直接评价需求完整性、验收标准或规范一致性。",
        ],
        sources: sourceRefs(implementationKeys, evidence),
      }
    : noData("implementation", [
        "当前能力快照没有该模型的实现、任务完成或程序求解证据。",
      ]);

  const testingKeys: EvidenceKey[] = [
    "bashReliability",
    "taskOutcome",
    "toolHallucination",
    "sciCode",
    "liveCodeBench",
    "aaIntelligence",
  ];
  const testing: TaskPrediction = hasAny(testingKeys, evidence)
    ? {
        ...taskDefinitions[3],
        confidence: bashEvidence
          ? taskOutcomeEvidence
            ? "中低"
            : "低"
          : "低",
        summary: bashEvidence
          ? `${modelName} 有直接的 Bash 调用可靠性数据（第 ${bashEvidence.rank} 名），可作为命令行任务候选。`
          : `${modelName} 只有测试或程序求解的弱代理，没有直接 Bash 证据。`,
        logic: [
          ...(bashEvidence
            ? [
                "Bash Reliability 直接统计非豁免 Bash 调用中由模型导致的失败。",
              ]
            : []),
          ...(taskOutcomeEvidence
            ? ["Confirmed Success 提供任务是否被用户明确确认完成的信号。"]
            : []),
          ...(toolHallucinationEvidence
            ? ["Tool Hallucination 衡量是否调用不存在的工具，反映执行可靠性。"]
            : []),
          ...(sciCodeEvidence || liveCodeBenchEvidence
            ? ["SciCode / LiveCodeBench 只测量程序求解，不代表测试设计或 CI 操作。"]
            : []),
          ...(intelligenceEvidence
            ? ["AA Intelligence 只作为调试推理的通用代理。"]
            : []),
          "现有来源不直接评价测试覆盖、断言质量、故障定位或 CI 配置，因此不构成完整测试能力结论。",
        ],
        sources: sourceRefs(testingKeys, evidence),
      }
    : noData("testing", [
        "当前能力快照没有该模型的 Bash、确认完成或程序求解证据。",
      ]);

  const collaboration = noData(
    "collaboration",
    [
      "AI Index、SciCode、LiveCodeBench 和 LMArena 均没有团队合作、竞争或拆台的专项测量。",
      "LMArena Praise/Complaint 只记录单次任务后的明确用户表扬或投诉，不测量团队角色、利益冲突或识别并化解拆台行为，因此不纳入预测。",
    ],
    [
      {
        label: sourceInfo.praiseComplaint.label,
        url: sourceInfo.praiseComplaint.url,
        detail: "已核查；仅作为用户反馈邻近信号，不支撑团队协作情商。",
        used: false,
      },
    ],
  );

  return [
    documentation,
    architecture,
    implementation,
    testing,
    collaboration,
  ];
}

export function getModelPredictions(
  modelName: string,
  modelId: string,
  snapshot: CapabilitySnapshot,
) {
  return buildPredictions(modelName, snapshot.models[modelId] ?? {});
}

export function confidenceFromPredictions(predictions: TaskPrediction[]) {
  return Object.fromEntries(
    predictions.map((prediction) => [prediction.id, prediction.confidence]),
  ) as Record<TaskId, Confidence>;
}

export const tasks = taskDefinitions;
