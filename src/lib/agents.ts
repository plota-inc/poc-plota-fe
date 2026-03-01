import type { ActiveMode, RewriteOption, DescribeOption } from "@/stores/ai-store";

export interface AgentAction {
  id: string;
  label: string;
  userPrompt: string;
  customInput?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
  actions: AgentAction[];
  defaultUserPrompt?: string;
}

export const REWRITE_AGENT: Agent = {
  id: "rewrite",
  name: "Rewrite",
  systemPrompt: [
    "당신은 소설/글쓰기 전문 에디터입니다.",
    "주어진 텍스트를 지시에 따라 다시 작성하세요.",
    "- 원본의 핵심 의미와 맥락을 유지하세요.",
    "- 반드시 한국어로만 작성하세요. 중국어, 영어, 일본어 등 다른 언어를 절대 사용하지 마세요.",
    "- 다시 작성한 텍스트만 출력하세요. 설명, 부연, 주석, 구분선(---) 등 메타 텍스트를 출력하지 마세요.",
  ].join("\n"),
  actions: [
    {
      id: "rephrase",
      label: "다른 표현으로 (Rephrase)",
      userPrompt: "다음 텍스트를 같은 의미를 유지하면서 다른 표현으로 바꿔주세요:\n\n",
    },
    {
      id: "shorter",
      label: "간결하게 (Shorter)",
      userPrompt: "다음 텍스트를 핵심 의미를 유지하면서 더 간결하게 줄여주세요:\n\n",
    },
    {
      id: "more_descriptive",
      label: "풍부하게 (More descriptive)",
      userPrompt: "다음 텍스트에 감각적 묘사와 디테일을 추가해서 더 풍부하게 다시 써주세요:\n\n",
    },
    {
      id: "show_not_tell",
      label: '보여주기 (Show, not tell)',
      userPrompt:
        '다음 텍스트를 "말하지 말고 보여주기" 원칙에 따라 다시 써주세요. 감정이나 상태를 직접 서술하지 말고, 행동/표정/장면으로 드러내세요:\n\n',
    },
    {
      id: "more_inner_conflict",
      label: "내면 갈등 추가 (More inner conflict)",
      userPrompt:
        "다음 텍스트에 캐릭터의 내면 갈등, 망설임, 모순된 감정을 더 깊게 담아 다시 써주세요:\n\n",
    },
    {
      id: "more_intense",
      label: "긴장감 높이기 (More intense)",
      userPrompt: "다음 텍스트의 긴장감과 감정적 강도를 높여서 다시 써주세요:\n\n",
    },
    {
      id: "customize",
      label: "직접 지시안 작성 (Customize...)",
      userPrompt: "",
      customInput: true,
    },
  ],
};

export const DESCRIBE_AGENT: Agent = {
  id: "describe",
  name: "Describe",
  systemPrompt: [
    "당신은 감각적 묘사에 특화된 소설가입니다.",
    "주어진 텍스트의 장면이나 대상에 대해 지정된 감각에 집중하여 생생한 묘사를 작성하세요.",
    "- 반드시 한국어로만 작성하세요. 중국어, 영어, 일본어 등 다른 언어를 절대 사용하지 마세요.",
    "- 묘사 텍스트만 출력하세요. 설명, 부연, 주석, 구분선(---) 등 메타 텍스트를 출력하지 마세요.",
    "- 원본의 분위기와 톤을 유지하세요.",
  ].join("\n"),
  actions: [
    {
      id: "sight",
      label: "시각 (Sight)",
      userPrompt:
        "다음 텍스트의 장면에서 눈에 보이는 것들을 생생하게 묘사해주세요. 색채, 빛, 형태, 움직임에 집중하세요:\n\n",
    },
    {
      id: "smell",
      label: "후각 (Smell)",
      userPrompt: "다음 텍스트의 장면에서 맡을 수 있는 냄새와 향기를 생생하게 묘사해주세요:\n\n",
    },
    {
      id: "taste",
      label: "미각 (Taste)",
      userPrompt: "다음 텍스트의 장면에서 느낄 수 있는 맛과 풍미를 생생하게 묘사해주세요:\n\n",
    },
    {
      id: "sound",
      label: "청각 (Sound)",
      userPrompt:
        "다음 텍스트의 장면에서 들리는 소리를 생생하게 묘사해주세요. 대화, 환경음, 분위기에 집중하세요:\n\n",
    },
    {
      id: "touch",
      label: "촉각 (Touch)",
      userPrompt:
        "다음 텍스트의 장면에서 피부로 느낄 수 있는 촉감, 온도, 질감을 생생하게 묘사해주세요:\n\n",
    },
  ],
};

export const EXPAND_AGENT: Agent = {
  id: "expand",
  name: "Expand",
  systemPrompt: [
    "당신은 소설 작가입니다.",
    "사용자가 [앞의 내용], [확장할 텍스트], [뒤의 내용]을 제공합니다.",
    "[확장할 텍스트]가 묘사하는 바로 그 순간/장면에 대해서만 상세한 내용을 작성하세요.",
    "",
    "핵심 규칙:",
    "- 선택된 텍스트의 순간에만 집중하세요. 그 장면의 감각, 분위기, 공간, 인물 묘사를 풍부하게 하세요.",
    "- [뒤의 내용]에 이미 존재하는 사건, 대사, 전개를 절대 미리 쓰지 마세요.",
    "- 확장은 [뒤의 내용]이 자연스럽게 이어질 수 있는 지점에서 멈추세요.",
    "- [앞의 내용]과 [뒤의 내용]은 맥락 파악용입니다. 그 내용을 그대로 반복하거나 출력하지 마세요.",
    "- 원본의 문체, 톤, 시점, 시제를 유지하세요.",
    "- 반드시 한국어로만 작성하세요. 중국어, 영어, 일본어 등 다른 언어를 절대 사용하지 마세요.",
    "- 확장된 텍스트만 출력하세요. 설명, 부연, 주석, 구분선(---) 등 메타 텍스트를 출력하지 마세요.",
  ].join("\n"),
  actions: [],
  defaultUserPrompt: "",
};

const AGENTS: Record<string, Agent> = {
  rewrite: REWRITE_AGENT,
  describe: DESCRIBE_AGENT,
  expand: EXPAND_AGENT,
};

export function buildMessages(
  activeMode: ActiveMode,
  selectedText: string,
  rewriteOption?: RewriteOption,
  describeOption?: DescribeOption,
  customInstruction?: string,
  contextBefore?: string,
  contextAfter?: string,
): { systemPrompt: string; userPrompt: string } {
  const agent = AGENTS[activeMode];
  if (!agent) {
    return {
      systemPrompt: "",
      userPrompt: selectedText,
    };
  }

  const { systemPrompt, actions, defaultUserPrompt } = agent;

  if (actions.length === 0) {
    if (activeMode === "expand") {
      const parts: string[] = [];
      if (contextBefore) parts.push(`[앞의 내용]\n${contextBefore}`);
      parts.push(`[확장할 텍스트]\n${selectedText}`);
      if (contextAfter) parts.push(`[뒤의 내용]\n${contextAfter}`);
      return { systemPrompt, userPrompt: parts.join("\n\n") };
    }
    return {
      systemPrompt,
      userPrompt: (defaultUserPrompt ?? "") + selectedText,
    };
  }

  const optionId = activeMode === "rewrite" ? rewriteOption : describeOption;
  const action = actions.find((a) => a.id === optionId);

  if (!action) {
    return {
      systemPrompt,
      userPrompt: selectedText,
    };
  }

  if (action.customInput && customInstruction) {
    return {
      systemPrompt,
      userPrompt: `${customInstruction}\n\n다음 텍스트를 위 지시에 따라 다시 써주세요:\n\n${selectedText}`,
    };
  }

  return {
    systemPrompt,
    userPrompt: action.userPrompt + selectedText,
  };
}
