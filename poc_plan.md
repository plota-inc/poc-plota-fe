# Plota PoC 구현 계획

> 전체 기술 스택과 설계 방향은 techstack.md 참고.
> 이 문서는 PoC 범위에 한정된 구현 목표, 기술 스택, 단계별 계획을 다룬다.

---

## 1. PoC 목표

사용자가 브라우저에서 글을 쓰고, 선택한 텍스트에 대해 **로컬 LLM이 초안을 생성**하여 에디터에 삽입하는 과정을 **PWA 앱**으로 시연한다.

### 핵심 유저 플로우

```
1. 사용자가 에디터에 글을 쓴다
2. 텍스트를 드래그하여 선택한다
3. 우측 패널에서 AI 초안 생성을 요청한다
4. 로컬 LLM(Llama-3.2)이 브라우저에서 초안을 생성한다 (스트리밍)
5. 생성된 초안을 확인하고 에디터에 삽입한다
```

### 시연 환경
- **Chrome 최신 버전** (WebGPU 지원 필수)
- PWA 설치 후 동작 확인

---

## 2. PoC 기술 스택

```
Next.js 16+ (App Router)         — 코어 프레임워크
├── Serwist                       — PWA (매니페스트 + 앱 셸 캐시)
├── TipTap (ProseMirror)          — 에디터 엔진
├── Transformers.js v4            — 로컬 LLM (WebGPU)
│   └── Comlink                   — Web Worker 통신
├── idb                           — 문서 로컬 저장 (IndexedDB)
├── Zustand                       — 모델/AI 상태 관리
└── Tailwind CSS + Shadcn/ui      — UI
```

### PoC에서 제외하는 항목

| 항목 | 제외 이유 | 도입 시점 |
|------|----------|----------|
| urql / GraphQL | 서버 연동 없이 로컬에서만 동작 | 백엔드 연동 시 |
| 인증 (JWT) | 서버 없으므로 로그인 불필요 | 백엔드 연동 시 |
| offlineExchange / Sync Queue | 서버 동기화 대상 없음 | 백엔드 연동 시 |
| WASM 폴백 | Chrome WebGPU로 시연 환경 한정 | 프로덕션 |
| 테스트 (Vitest, Playwright) | 시연 목적 PoC | 프로덕션 |
| Sentry | 모니터링 불필요 | 프로덕션 |
| 정교한 오프라인 전략 | PWA 기본 캐싱만으로 충분 | 프로덕션 |

---

## 3. 화면 구성

```
┌─────────────────────────────────────────────────────┐
│  헤더 (앱 타이틀 + 모델 상태 표시)                      │
├────────────────────────────┬────────────────────────┤
│                            │                        │
│                            │    AI 초안 패널          │
│       에디터 영역            │                        │
│       (TipTap)             │  - 선택된 텍스트 표시     │
│                            │  - AI 초안 생성 버튼     │
│                            │  - 스트리밍 결과 표시     │
│                            │  - "에디터에 삽입" 버튼   │
│                            │                        │
├────────────────────────────┴────────────────────────┤
│  하단: 모델 다운로드 진행률 바 (최초 1회)                │
└─────────────────────────────────────────────────────┘
```

- **에디터 영역**: TipTap 기반, A4 20장 분량 지원
- **AI 초안 패널**: 에디터 우측에 고정. 텍스트 선택 시 활성화
- **모델 다운로드 바**: 최초 접속 시 LLM 다운로드 진행률 표시. 완료 후 숨김

---

## 4. 아키텍처

```
[메인 스레드]
│
├── TipTap 에디터 ─── 텍스트 선택 감지
│                      ↓
├── AI 초안 패널 ───── 선택 텍스트 + 프롬프트 구성
│                      ↓
├── Comlink 프록시 ─── generate(prompt) 호출
│                      ↓
│              ┌───────────────────┐
│              │   Web Worker      │
│              │                   │
│              │  Transformers.js  │
│              │  ↕ WebGPU         │
│              │                   │
│              │  토큰 스트리밍     │
│              │  callback → UI    │
│              └───────────────────┘
│                      ↓
├── 스트리밍 결과 ──── 패널에 실시간 표시
│                      ↓
└── "삽입" 클릭 ────── TipTap 트랜잭션으로 에디터에 반영
```

### 데이터 저장 (PoC 범위)

```
[에디터 변경] → [IndexedDB에 자동 저장] → [새로고침해도 복원]
```

- 서버 동기화 없이 IndexedDB만 사용
- `idb` 라이브러리로 `documents` 스토어 하나만 관리
- AI 모델 캐싱은 Transformers.js가 내부적으로 처리 (별도 관리 불필요)

### 프로젝트 구조 (현재)

```
src/
├── app/
│   ├── globals.css            ← Tailwind v4 + Shadcn/ui 테마 변수
│   ├── layout.tsx             ← 루트 레이아웃 (PWA 메타데이터 포함)
│   ├── manifest.ts            ← PWA 매니페스트 (앱 이름, 아이콘, display)
│   ├── page.tsx               ← 메인 페이지 (에디터 + AI 패널 진입점)
│   └── sw.ts                  ← Service Worker (Serwist 프리캐시 + 런타임 캐시)
├── lib/
│   ├── db.ts                  ← IndexedDB CRUD (idb 래퍼, documents 스토어)
│   ├── llm-client.ts          ← Comlink 프록시 생성 (Worker ↔ 메인 스레드)
│   └── utils.ts               ← Shadcn 유틸 (cn 함수)
├── stores/
│   ├── ai-store.ts            ← AI 생성 상태 (selectedText, generatedText, status)
│   └── model-store.ts         ← 모델 상태 (downloading/ready/error, progress)
└── workers/
    └── llm.worker.ts          ← Web Worker: Transformers.js 모델 로드 + 추론
```

#### 파일별 역할

| 파일 | 역할 |
|------|------|
| `llm.worker.ts` | Worker에서 Transformers.js 파이프라인 초기화, `load()` / `generate()` 노출 |
| `llm-client.ts` | `Comlink.wrap()`으로 Worker를 프록시화, 메인 스레드에서 함수처럼 호출 |
| `model-store.ts` | Zustand. 모델 다운로드 진행률/상태를 UI에 반영 |
| `ai-store.ts` | Zustand. 선택 텍스트, 생성 결과, 생성 상태를 관리 |
| `db.ts` | `idb`로 IndexedDB `documents` 스토어 관리 (저장/조회/삭제) |
| `sw.ts` | Serwist Service Worker. 앱 셸 프리캐시 + 런타임 캐싱 |
| `manifest.ts` | Next.js Route Handler로 PWA 매니페스트 자동 생성 |

---

## 5. 단계별 구현 계획

### Phase 1: 프로젝트 셋업

- [ ] Next.js 16 프로젝트 생성 (App Router)
- [ ] Tailwind CSS + Shadcn/ui 설정
- [ ] 기본 레이아웃 구성 (에디터 영역 + 우측 패널)
- [ ] Serwist PWA 기본 설정 (매니페스트, 서비스 워커, 아이콘)

### Phase 2: 에디터 구현

- [ ] TipTap 에디터 설정 및 기본 확장 구성 (StarterKit)
- [ ] 텍스트 선택 감지 → 선택 영역 정보를 우측 패널에 전달
- [ ] IndexedDB 자동 저장 구현 (idb + debounce)
- [ ] 새로고침 시 문서 복원

### Phase 3: 로컬 LLM 연동

- [ ] Web Worker + Comlink 셋업
- [ ] Worker 내 Transformers.js 초기화 (WebGPU 디바이스 설정)
- [ ] 모델 다운로드 + 진행률 UI (progress_callback)
- [ ] 모델 로드 상태 관리 (Zustand: idle → downloading → ready → error)

### Phase 4: AI 초안 생성 플로우

- [ ] 선택 텍스트 기반 프롬프트 구성
- [ ] Comlink을 통한 generate 호출 + 토큰 스트리밍 콜백
- [ ] 우측 패널에 스트리밍 결과 실시간 표시
- [ ] "에디터에 삽입" 버튼 → TipTap 트랜잭션으로 선택 영역 교체/삽입
- [ ] 생성 중 취소 기능

### Phase 5: 마무리

- [ ] PWA 설치 테스트 (Chrome)
- [ ] 오프라인에서 에디터 + AI 추론 동작 확인
- [ ] 모델 캐싱 확인 (재접속 시 다운로드 없이 즉시 로드)
- [ ] UI 다듬기 (로딩 상태, 에러 처리, 빈 상태)

---

## 6. 주요 기술 포인트

### 모델 선택
- **1차: Llama-3.2-1B** (~1-2GB) — 가볍고 PoC에 충분한 품질
- 품질 부족 시 3B로 전환 가능하도록 모델명을 설정값으로 분리

### 프롬프트 설계 (초안)
```
당신은 한국어 글쓰기 보조 AI입니다.
아래 텍스트를 개선하여 다시 작성해주세요.
원문의 의도를 유지하되, 표현과 문체를 더 자연스럽게 다듬어주세요.

원문:
{selected_text}
```

### 토큰 스트리밍 구조
```typescript
// Worker (worker.ts)
async generate(prompt: string, onToken: (token: string) => void) {
  const pipeline = await this.getPipeline();
  const output = await pipeline(prompt, {
    max_new_tokens: 512,
    callback_function: (x) => {
      const token = tokenizer.decode(x.output_token_ids[0]);
      onToken(token);  // Comlink proxy() 콜백으로 메인 스레드에 전달
    }
  });
}
```

### IndexedDB 저장 구조
```typescript
// idb 스키마
interface PlotaDB {
  documents: {
    key: string;        // 문서 ID
    value: {
      id: string;
      title: string;
      content: JSON;    // TipTap JSON 문서
      updatedAt: number;
      createdAt: number;
    };
    indexes: {
      'by-modified': number;
    };
  };
}
```

---

## 7. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Transformers.js v4 프리뷰 불안정 | 모델 로딩/추론 실패 | v3로 롤백 가능하도록 import 경로만 변경하면 되는 구조로 설계 |
| 1B 모델 한국어 품질 부족 | 초안이 실용적이지 않을 수 있음 | 3B로 전환, 또는 프롬프트 튜닝으로 보완 |
| 모델 다운로드 시간 (1-2GB) | 첫 사용 경험 저하 | 진행률 바 필수, 다운로드 중 에디터는 정상 사용 가능하도록 |
| WebGPU 미지원 기기 | 데모 불가 | PoC 범위에서 Chrome 한정으로 명시 |
| TipTap + A4 20장 성능 | 에디터 렉 | 초기에 대량 텍스트 벤치마크 실시 |
