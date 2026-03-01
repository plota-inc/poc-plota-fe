# Plota PoC — 에이전트 프로필 설계

> 벤치마킹: [Sudowrite](https://editor.sudowrite.com/)
> 텍스트 드래그 시 플로팅 툴바가 나타나고, 각 버튼(Rewrite / Describe / Expand)을 누르면 에이전트별 프롬프트가 조합되어 LLM에 전송된다.

---

## 1. 전체 구조

```
[사용자가 텍스트 드래그]
    ↓
[플로팅 툴바 표시]
    ├── Rewrite  → 서브옵션 7개
    ├── Describe → 서브옵션 5개
    └── Expand   → 단일 액션
    ↓
[에이전트 선택 + 서브옵션 선택]
    ↓
[messages 조합]
    { role: "system", content: agent.systemPrompt }
    { role: "user",   content: agent.sub[option].userPrompt + selectedText }
    ↓
[Ollama API 호출 → 스트리밍 응답 → 우측 패널에 표시]
```

---

## 2. 에이전트 목록

### 2-1. Rewrite (다시 쓰기)

선택한 텍스트를 다양한 방식으로 다시 작성한다.

| ID | 서브옵션 | 설명 |
|----|---------|------|
| `rewrite.rephrase` | Rephrase | 같은 의미를 다른 표현으로 바꾸기 |
| `rewrite.shorter` | Shorter | 더 간결하게 줄이기 |
| `rewrite.descriptive` | More descriptive | 더 묘사적으로 풍부하게 |
| `rewrite.show` | Show, not tell | 설명 → 장면/행동으로 전환 |
| `rewrite.conflict` | More inner conflict | 내면 갈등을 강화 |
| `rewrite.intense` | More intense | 긴장감/강도를 높이기 |
| `rewrite.custom` | Customize... | 사용자가 직접 지시 입력 |

**시스템 프롬프트 (공통):**

```
당신은 소설/글쓰기 전문 에디터입니다.
주어진 텍스트를 지시에 따라 다시 작성하세요.
- 원본의 핵심 의미와 맥락을 유지하세요.
- 한국어로 작성하세요.
- 다시 작성한 텍스트만 출력하세요. 설명이나 부연은 하지 마세요.
```

**서브옵션별 유저 프롬프트:**

| 서브옵션 | userPrompt |
|---------|------------|
| Rephrase | `다음 텍스트를 같은 의미를 유지하면서 다른 표현으로 바꿔주세요:\n\n` |
| Shorter | `다음 텍스트를 핵심 의미를 유지하면서 더 간결하게 줄여주세요:\n\n` |
| More descriptive | `다음 텍스트에 감각적 묘사와 디테일을 추가해서 더 풍부하게 다시 써주세요:\n\n` |
| Show, not tell | `다음 텍스트를 "말하지 말고 보여주기" 원칙에 따라 다시 써주세요. 감정이나 상태를 직접 서술하지 말고, 행동/표정/장면으로 드러내세요:\n\n` |
| More inner conflict | `다음 텍스트에 캐릭터의 내면 갈등, 망설임, 모순된 감정을 더 깊게 담아 다시 써주세요:\n\n` |
| More intense | `다음 텍스트의 긴장감과 감정적 강도를 높여서 다시 써주세요:\n\n` |
| Customize... | (사용자가 입력한 지시문) + `\n\n다음 텍스트를 위 지시에 따라 다시 써주세요:\n\n` |

---

### 2-2. Describe (묘사하기)

선택한 텍스트의 장면/대상을 특정 감각에 집중하여 묘사를 생성한다.

| ID | 서브옵션 | 설명 |
|----|---------|------|
| `describe.sight` | Sight | 시각적 묘사 |
| `describe.smell` | Smell | 후각적 묘사 |
| `describe.taste` | Taste | 미각적 묘사 |
| `describe.sound` | Sound | 청각적 묘사 |
| `describe.touch` | Touch | 촉각적 묘사 |

**시스템 프롬프트 (공통):**

```
당신은 감각적 묘사에 특화된 소설가입니다.
주어진 텍스트의 장면이나 대상에 대해 지정된 감각에 집중하여 생생한 묘사를 작성하세요.
- 한국어로 작성하세요.
- 묘사 텍스트만 출력하세요. 설명이나 부연은 하지 마세요.
- 원본의 분위기와 톤을 유지하세요.
```

**서브옵션별 유저 프롬프트:**

| 서브옵션 | userPrompt |
|---------|------------|
| Sight | `다음 텍스트의 장면에서 눈에 보이는 것들을 생생하게 묘사해주세요. 색채, 빛, 형태, 움직임에 집중하세요:\n\n` |
| Smell | `다음 텍스트의 장면에서 맡을 수 있는 냄새와 향기를 생생하게 묘사해주세요:\n\n` |
| Taste | `다음 텍스트의 장면에서 느낄 수 있는 맛과 풍미를 생생하게 묘사해주세요:\n\n` |
| Sound | `다음 텍스트의 장면에서 들리는 소리를 생생하게 묘사해주세요. 대화, 환경음, 분위기에 집중하세요:\n\n` |
| Touch | `다음 텍스트의 장면에서 피부로 느낄 수 있는 촉감, 온도, 질감을 생생하게 묘사해주세요:\n\n` |

---

### 2-3. Expand (확장하기)

선택한 텍스트를 기점으로 이야기를 확장한다. 서브옵션 없이 단일 액션.

| ID | 서브옵션 | 설명 |
|----|---------|------|
| `expand` | (없음) | 텍스트를 자연스럽게 이어서 확장 |

**시스템 프롬프트:**

```
당신은 소설 작가입니다.
주어진 텍스트를 자연스럽게 이어서 더 길고 풍부하게 확장하세요.
- 원본의 문체, 톤, 시점을 유지하세요.
- 한국어로 작성하세요.
- 확장된 텍스트만 출력하세요. 설명이나 부연은 하지 마세요.
```

**유저 프롬프트:**

```
다음 텍스트를 자연스럽게 이어서 확장해주세요. 장면, 감정, 디테일을 추가하여 더 풍부하게 만들어주세요:

```

---

## 3. 데이터 구조

```typescript
// src/lib/agents.ts

export interface AgentAction {
  id: string;
  label: string;
  userPrompt: string;
  customInput?: boolean;  // Customize처럼 사용자 입력이 필요한 경우
}

export interface Agent {
  id: string;
  name: string;
  icon: string;           // lucide 아이콘 이름
  systemPrompt: string;
  actions: AgentAction[];  // 비어있으면 단일 액션 (Expand처럼)
  defaultUserPrompt?: string; // actions가 없을 때 사용
}
```

---

## 4. UI 동작 흐름

```
1. 에디터에서 텍스트 드래그
    ↓
2. 플로팅 툴바 표시: [Rewrite] [Describe] [Expand]
    ↓
3-A. [Rewrite] 클릭
    → 우측 패널에 Rewrite 모드 진입
    → 드롭다운: Rephrase / Shorter / ... / Customize
    → 옵션 선택 후 [Generate] 클릭
    → 결과 스트리밍 표시
    ↓
3-B. [Describe] 클릭
    → 우측 패널에 Describe 모드 진입
    → 드롭다운: Sight / Smell / Taste / Sound / Touch
    → 옵션 선택 후 [Generate] 클릭
    → 결과 스트리밍 표시
    ↓
3-C. [Expand] 클릭
    → 바로 생성 시작 (서브옵션 없음)
    → 결과 스트리밍 표시
    ↓
4. 결과 확인 후 [Replace] 또는 [Insert Below] 선택
```

---

## 5. Ollama API 호출 예시

### Rewrite > Show, not tell

```json
{
  "model": "qwen2.5:7b",
  "messages": [
    {
      "role": "system",
      "content": "당신은 소설/글쓰기 전문 에디터입니다.\n주어진 텍스트를 지시에 따라 다시 작성하세요.\n- 원본의 핵심 의미와 맥락을 유지하세요.\n- 한국어로 작성하세요.\n- 다시 작성한 텍스트만 출력하세요. 설명이나 부연은 하지 마세요."
    },
    {
      "role": "user",
      "content": "다음 텍스트를 \"말하지 말고 보여주기\" 원칙에 따라 다시 써주세요. 감정이나 상태를 직접 서술하지 말고, 행동/표정/장면으로 드러내세요:\n\n가족들이 다 모인 칠순 잔칫날"
    }
  ],
  "stream": true
}
```

### Describe > Sound

```json
{
  "model": "qwen2.5:7b",
  "messages": [
    {
      "role": "system",
      "content": "당신은 감각적 묘사에 특화된 소설가입니다.\n주어진 텍스트의 장면이나 대상에 대해 지정된 감각에 집중하여 생생한 묘사를 작성하세요.\n- 한국어로 작성하세요.\n- 묘사 텍스트만 출력하세요. 설명이나 부연은 하지 마세요.\n- 원본의 분위기와 톤을 유지하세요."
    },
    {
      "role": "user",
      "content": "다음 텍스트의 장면에서 들리는 소리를 생생하게 묘사해주세요. 대화, 환경음, 분위기에 집중하세요:\n\n가족들이 다 모인 칠순 잔칫날"
    }
  ],
  "stream": true
}
```
