# Plota PoC App — 데스크톱 앱 전환 계획

> 기존 PWA 브라우저 기반 PoC(`poc_plan.md`)에서 **Tauri + Ollama 데스크톱 앱**으로 전환하는 계획.
> 브라우저 한계를 극복하고 8B 이상의 고품질 모델을 활용하기 위한 방향 전환이다.

---

## 1. 전환 배경

### 브라우저 기반 PoC의 한계 (poc_problem.md 참고)

PWA + Transformers.js + WebGPU 조합으로 브라우저에서 로컬 LLM을 구동하려 했으나, 다음 3가지 근본적 한계에 부딪혔다:

| 문제 | 원인 | 영향 |
|------|------|------|
| V8 ArrayBuffer ~2GB 제한 | JavaScript 엔진의 단일 메모리 블록 상한 | 비양자화 3B+ 모델 로드 불가 |
| WebGPU 연산 호환성 부족 | 최신 모델의 일부 연산을 WebGPU가 지원하지 않음 | GPU↔CPU 혼용 시 외계어 출력 또는 크래시 |
| 양자화 파일 부재 | 모든 모델이 WebGPU용 ONNX 양자화 파일을 제공하지 않음 | 사용 가능한 모델이 극히 제한적 |

**결론:** 브라우저에서 안정적으로 돌릴 수 있는 최대 모델은 **Llama-3.2-1B (q4f16, ~600MB)** 이며, 이는 한국어 글쓰기 보조에 품질이 부족하다. PWA는 이 한계를 해결할 수 없다 — V8 메모리 제한은 브라우저 엔진 레벨이므로 PWA 설치 여부와 무관하다.

### 데스크톱 앱으로 전환하면 달라지는 것

| 항목 | 브라우저 (PWA) | 데스크톱 앱 (Tauri + Ollama) |
|------|---------------|---------------------------|
| 메모리 제한 | V8 ArrayBuffer ~2GB | **시스템 RAM 전체** (16-64GB+) |
| GPU 접근 | WebGPU (제한적, ~70% 연산 지원) | **Metal / CUDA / Vulkan (네이티브 100%)** |
| 모델 상한 | 1B (실질적) | **8B ~ 70B+** (RAM 따라) |
| 추론 속도 | 네이티브 대비 30-50% | **네이티브 100%** |
| 오프라인 지원 | Service Worker 캐싱 | **완전 로컬 파일시스템** |
| 모델 관리 | Cache API (불안정) | **Ollama 자동 관리** |

---

## 2. 목표

사용자가 **데스크톱 앱**에서 글을 쓰고, 선택한 텍스트에 대해 **로컬 LLM(8B)이 고품질 초안을 생성**하여 에디터에 삽입하는 과정을 시연한다.

### 핵심 유저 플로우 (변경 없음)

```
1. 사용자가 에디터에 글을 쓴다
2. 텍스트를 드래그하여 선택한다
3. 우측 패널에서 AI 초안 생성을 요청한다
4. 로컬 LLM(Llama-3.2-8B 등)이 PC에서 초안을 생성한다 (스트리밍)
5. 생성된 초안을 확인하고 에디터에 삽입한다
```

### 시연 환경
- **macOS / Windows / Linux** 데스크톱
- Ollama가 지원하는 GPU (Metal, CUDA, Vulkan) 또는 CPU 폴백

---

## 3. 기술 스택

```
Tauri v2                         — 데스크톱 앱 셸 (Rust 기반, ~10MB)
├── Next.js 16+ (Static Export)  — UI 프레임워크 (SSG로 빌드)
│   ├── TipTap (ProseMirror)     — 에디터 엔진
│   ├── Zustand                  — 클라이언트 상태 관리
│   └── Tailwind CSS + Shadcn/ui — UI
├── Ollama (Sidecar)             — 로컬 LLM 추론 엔진 (llama.cpp 기반)
│   └── REST API (localhost)     — 앱 ↔ Ollama 통신
└── SQLite / 파일시스템           — 문서 로컬 저장 (IndexedDB 대체)
```

### 기존 PWA 스택과의 비교

| 역할 | PWA (기존) | Desktop App (신규) | 변경 이유 |
|------|-----------|-------------------|----------|
| 앱 셸 | 브라우저 + Serwist PWA | **Tauri v2** | 네이티브 기능 접근 |
| UI 렌더링 | Next.js (SSR/CSR) | **Next.js (Static Export)** | Tauri WebView에 정적 파일 로드 |
| LLM 추론 | Transformers.js + WebGPU | **Ollama (llama.cpp)** | 메모리/GPU 제한 해제, 8B+ 모델 |
| LLM 통신 | Comlink (Web Worker) | **HTTP (localhost:11434)** | Ollama REST API |
| 데이터 저장 | IndexedDB (idb) | **SQLite / 파일시스템** | 네이티브 성능, 용량 무제한 |
| 에디터 | TipTap | **TipTap (그대로)** | 변경 없음 |
| 상태 관리 | Zustand | **Zustand (그대로)** | 변경 없음 |
| UI 프레임워크 | Tailwind + shadcn/ui | **Tailwind + shadcn/ui (그대로)** | 변경 없음 |

### 재사용 가능한 코드 (~70%)

| 파일/모듈 | 재사용 | 비고 |
|-----------|--------|------|
| `components/` (모든 UI 컴포넌트) | **100%** | TipTap, sidebar, header, dialog 등 |
| `stores/` (Zustand 스토어) | **90%** | ai-store.ts 그대로, model-store.ts 소폭 수정 |
| `app/globals.css` | **100%** | Tailwind 테마 |
| `lib/utils.ts` | **100%** | shadcn 유틸 |
| `workers/llm.worker.ts` | **재작성** | Ollama HTTP 클라이언트로 교체 |
| `lib/llm-client.ts` | **재작성** | Comlink → fetch 기반 |
| `lib/db.ts` | **재작성** | IndexedDB → SQLite 또는 Tauri fs API |
| `app/sw.ts`, `app/manifest.ts` | **제거** | PWA 관련, 더 이상 불필요 |

---

## 4. 아키텍처

```
┌─────────────────────────────────────────────────┐
│  Tauri App                                      │
│                                                 │
│  ┌──────────────────────────────────────┐       │
│  │  WebView (시스템 웹뷰)                │       │
│  │                                      │       │
│  │  Next.js Static Export               │       │
│  │  ├── TipTap 에디터                    │       │
│  │  ├── AI 초안 패널                     │       │
│  │  ├── Zustand 상태 관리                │       │
│  │  └── Tailwind + shadcn/ui            │       │
│  │           │                          │       │
│  │           │ fetch("localhost:11434")  │       │
│  └───────────┼──────────────────────────┘       │
│              │                                  │
│  ┌───────────▼──────────────────────────┐       │
│  │  Ollama Sidecar (자식 프로세스)        │       │
│  │                                      │       │
│  │  llama.cpp 추론 엔진                  │       │
│  │  ├── Metal (macOS)                   │       │
│  │  ├── CUDA (NVIDIA)                   │       │
│  │  └── CPU 폴백                        │       │
│  │                                      │       │
│  │  모델 파일: ~/.ollama/models/         │       │
│  │  (로컬 디스크, 용량 무제한)            │       │
│  └──────────────────────────────────────┘       │
│                                                 │
│  ┌──────────────────────────────────────┐       │
│  │  Tauri Rust Backend                  │       │
│  │  ├── 파일시스템 접근 (문서 저장)       │       │
│  │  ├── Ollama 프로세스 관리 (시작/종료)  │       │
│  │  └── 시스템 정보 (GPU, 메모리 등)     │       │
│  └──────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘

※ 모든 처리가 사용자 PC 내에서 완결. 인터넷 불필요 (모델 최초 다운로드 제외).
```

### 데이터 흐름

```
[에디터 변경] → [Tauri fs API로 로컬 파일에 저장] → [앱 재시작해도 복원]

[AI 생성 요청]
    ↓
[fetch("http://localhost:11434/api/chat")]
    ↓ (스트리밍 응답, ReadableStream)
[토큰 단위로 UI에 실시간 반영]
    ↓
[사용자가 "삽입" 클릭 → TipTap 트랜잭션으로 에디터에 반영]
```

---

## 5. 모델 선택

Ollama는 범용 로컬 LLM 런타임으로, 100+ 모델 패밀리를 지원한다.

### 추천 모델 (한국어 글쓰기 보조 기준)

| 모델 | 파라미터 | 용량 (q4) | 필요 RAM | 한국어 품질 | 추천도 |
|------|----------|----------|---------|-----------|--------|
| `llama3.2:1b` | 1B | ~1GB | 4GB | 보통 | PoC 테스트용 |
| `llama3.2:3b` | 3B | ~2GB | 6GB | 양호 | 경량 환경 |
| **`llama3.2:8b`** | 8B | ~4.5GB | 8GB | **좋음** | **기본 추천** |
| `qwen2.5:7b` | 7B | ~4GB | 8GB | **매우 좋음** | 한국어 특화 |
| `gemma2:9b` | 9B | ~5.4GB | 10GB | 좋음 | Google 모델 |
| `deepseek-r1:8b` | 8B | ~4.5GB | 8GB | 좋음 | 추론 특화 |

### 모델 전략
- **기본 모델**: `llama3.2:8b` 또는 `qwen2.5:7b` (한국어 성능 우수)
- 사용자가 설정에서 모델을 변경할 수 있도록 UI 제공
- Ollama의 `ollama list` / `ollama pull` 명령으로 모델 관리 자동화

---

## 6. LLM 연동 구조 (Ollama REST API)

### AS-IS: Transformers.js (Web Worker + Comlink)

```typescript
// llm.worker.ts — Web Worker에서 실행
const model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
  dtype: "q4f16", device: "webgpu",
});
const streamer = new TextStreamer(tokenizer, {
  callback_function: (text) => onToken(text),
});
await model.generate({ ...inputs, streamer });
```

### TO-BE: Ollama REST API (fetch + SSE 스트리밍)

```typescript
// lib/ollama-client.ts — 메인 스레드에서 직접 호출 (Worker 불필요)
const DEFAULT_MODEL = "llama3.2:8b";

export async function generate(
  prompt: string,
  systemInstruction: string,
  onToken: (token: string) => void,
  model: string = DEFAULT_MODEL,
) {
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt },
      ],
      stream: true,
    }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value, { stream: true }).split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      const json = JSON.parse(line);
      if (json.message?.content) {
        onToken(json.message.content);
      }
    }
  }
}

export async function listModels() {
  const res = await fetch("http://localhost:11434/api/tags");
  return res.json();
}

export async function pullModel(
  model: string,
  onProgress: (status: string, completed: number, total: number) => void,
) {
  const response = await fetch("http://localhost:11434/api/pull", {
    method: "POST",
    body: JSON.stringify({ name: model, stream: true }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value, { stream: true }).split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      const json = JSON.parse(line);
      onProgress(json.status, json.completed || 0, json.total || 0);
    }
  }
}
```

### 주요 차이점

| 항목 | Transformers.js (기존) | Ollama (신규) |
|------|----------------------|--------------|
| 실행 스레드 | Web Worker 필수 | **메인 스레드에서 가능** (추론이 별도 프로세스) |
| 통신 방식 | Comlink (postMessage) | **fetch + ReadableStream** |
| 스트리밍 | TextStreamer 콜백 | **NDJSON 스트리밍** |
| 모델 로딩 | 직접 로드 + 셰이더 컴파일 | **Ollama가 자동 처리** |
| GPU 관리 | WebGPU API | **Ollama가 자동 감지 (Metal/CUDA)** |

---

## 7. 프로젝트 구조 (예상)

```
plota-app/
├── src-tauri/                    ← Tauri Rust 백엔드
│   ├── src/
│   │   ├── main.rs               ← 앱 진입점, Ollama sidecar 관리
│   │   └── commands.rs           ← Tauri 커맨드 (fs 접근, 시스템 정보)
│   ├── Cargo.toml
│   └── tauri.conf.json           ← Tauri 설정 (창 크기, 권한 등)
├── src/                          ← 프론트엔드 (현재 코드 대부분 재사용)
│   ├── app/
│   │   ├── globals.css           ← 그대로
│   │   ├── layout.tsx            ← PWA 메타데이터 제거
│   │   └── page.tsx              ← 그대로
│   ├── components/
│   │   ├── editor/               ← 그대로
│   │   ├── layout/
│   │   │   ├── header.tsx        ← 그대로 (설정 다이얼로그 포함)
│   │   │   ├── sidebar-right.tsx ← 그대로 (로그 영역 포함)
│   │   │   └── settings-dialog.tsx ← 모델 선택 UI 추가
│   │   └── ui/                   ← 그대로
│   ├── lib/
│   │   ├── ollama-client.ts      ← 신규: Ollama REST API 클라이언트
│   │   ├── db.ts                 ← 재작성: Tauri fs API 기반
│   │   └── utils.ts              ← 그대로
│   └── stores/
│       ├── ai-store.ts           ← 그대로
│       └── model-store.ts        ← 소폭 수정 (Ollama 상태 반영)
├── next.config.ts                ← output: 'export' 추가
├── package.json
└── README.md
```

### 제거되는 파일
- `src/app/sw.ts` — Service Worker (PWA 전용)
- `src/app/manifest.ts` — PWA 매니페스트
- `src/workers/llm.worker.ts` — Web Worker (Ollama가 별도 프로세스로 대체)
- `src/lib/llm-client.ts` — Comlink 프록시 (fetch로 대체)

---

## 8. 단계별 구현 계획

### Phase 1: Tauri 셋업 + 기존 UI 이식

- [ ] Tauri v2 프로젝트 초기화 (`npm create tauri-app`)
- [ ] 기존 Next.js 프로젝트를 `output: 'export'`(정적 빌드)로 전환
- [ ] Serwist / PWA 관련 코드 제거
- [ ] Tauri WebView에서 기존 UI가 정상 렌더링되는지 확인
- [ ] TipTap 에디터 동작 확인

### Phase 2: Ollama 연동

- [ ] Ollama sidecar 설정 (Tauri가 앱 시작 시 Ollama 자동 실행)
- [ ] `lib/ollama-client.ts` 구현 (generate, listModels, pullModel)
- [ ] `sidebar-right.tsx`에서 Ollama API 호출로 교체
- [ ] 스트리밍 응답을 토큰 단위로 UI에 반영
- [ ] 모델 다운로드 진행률 UI 연동

### Phase 3: 데이터 저장 전환

- [ ] IndexedDB → Tauri fs API 또는 SQLite로 전환
- [ ] 문서 자동 저장 / 복원 구현
- [ ] 설정 저장 (선택된 모델, UI 환경설정 등)

### Phase 4: 설정 UI 확장

- [ ] 설정 다이얼로그에 모델 선택 기능 추가 (ollama list 연동)
- [ ] 모델 다운로드/삭제 관리 UI
- [ ] 시스템 정보 표시 (GPU 종류, 사용 가능 RAM)
- [ ] 기본 모델 변경 기능

### Phase 5: 마무리 + 패키징

- [ ] macOS / Windows / Linux 빌드 테스트
- [ ] Ollama 번들링 전략 결정 (앱에 포함 vs 별도 설치 안내)
- [ ] 앱 아이콘, 이름, 버전 설정
- [ ] 첫 실행 시 모델 다운로드 가이드 UI
- [ ] 오프라인 동작 확인 (모델 다운로드 후)

---

## 9. Ollama 배포 전략

### 옵션 A: Ollama 별도 설치 안내 (PoC 단계 추천)
- 사용자가 ollama.com에서 Ollama를 설치
- Plota 앱이 실행 시 Ollama 감지 → 없으면 설치 안내
- 구현 간단, PoC에 적합

### 옵션 B: Ollama를 Tauri Sidecar로 번들
- Tauri의 sidecar 기능으로 Ollama 바이너리를 앱에 포함
- 사용자가 별도 설치할 필요 없음
- 앱 크기 증가 (~100MB+), 하지만 UX 최상
- 프로덕션 단계에서 채택

---

## 10. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Ollama 미설치 상태 | 추론 불가 | 앱 시작 시 Ollama 감지, 설치 가이드 표시 |
| GPU 없는 환경 | 추론 속도 저하 | CPU 폴백 자동 적용 (Ollama 내장), 소형 모델(1B-3B) 권장 |
| 모델 다운로드 시간 | 8B 모델 ~4.5GB | 진행률 UI, 다운로드 중 에디터 사용 가능 |
| Tauri WebView 호환성 | 일부 CSS/JS 미지원 | macOS WKWebView, Windows WebView2 기준 테스트 |
| Next.js Static Export 제약 | SSR 기능 사용 불가 | 모든 페이지를 CSR로 전환 (현재도 대부분 CSR) |

---

## 11. 확장성 고려 (앱 전환 이후)

| 확장 기능 | Ollama 지원 여부 | 대안 |
|-----------|-----------------|------|
| 텍스트 생성 | **지원** (100+ 모델) | — |
| 이미지 이해 (Vision) | **지원** (LLaVA, Llama 3.2 Vision) | — |
| 이미지 생성 | 미지원 | ComfyUI sidecar 또는 Stable Diffusion.cpp |
| 음성 인식 (STT) | 미지원 | Whisper.cpp sidecar |
| 음성 합성 (TTS) | 미지원 | Piper TTS sidecar |
| 텍스트 임베딩 | **지원** (nomic-embed 등) | — |

Tauri의 sidecar 패턴은 여러 AI 엔진을 독립적으로 관리할 수 있어, 향후 멀티모달 확장에 유리하다.

---

## 12. 기술 스택 요약

```
Tauri v2 (Rust)                  — 데스크톱 앱 셸
├── Next.js 16+ (Static Export)  — UI 프레임워크
│   ├── TipTap (ProseMirror)     — 에디터 엔진
│   ├── Zustand                  — 상태 관리
│   └── Tailwind CSS + Shadcn/ui — UI
├── Ollama (Sidecar)             — 로컬 LLM 추론
│   └── llama.cpp                — 네이티브 GPU 추론 엔진
│       ├── Metal (macOS)
│       ├── CUDA (NVIDIA)
│       └── Vulkan (AMD/기타)
└── 파일시스템 / SQLite           — 로컬 데이터 저장
```
