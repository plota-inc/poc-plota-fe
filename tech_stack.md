# Plota PoC 기술 스택 정리

> spec.md 기반 기술 검토 결과를 정리한 문서입니다.
> 각 기술의 선정 이유, 주의점, 대안, 추가 제안을 포함합니다.

---

## 1. 코어 프레임워크: Next.js 16+ (App Router)

### 선정 이유
- SSR로 초기 로딩 최적화, Server Actions로 NestJS 백엔드와 안전한 통신
- AI 연산은 브라우저, 유저 데이터/보안은 서버 — 하이브리드 구조에 적합

### 주의점
- **SSR과 오프라인 퍼스트의 충돌**: 오프라인 상태에서는 SSR이 동작하지 않음. 초기 진입 시에만 SSR을 활용하고, 이후에는 CSR + IndexedDB로 전환하는 **App Shell 모델**을 채택해야 함
- Next.js 16은 **Turbopack이 기본 번들러**. 기존 webpack 기반 플러그인(next-pwa 등) 호환성 확인 필요

---

## 2. PWA / 오프라인: Serwist

### 선정 이유
- 기존 `next-pwa`는 webpack 의존적이라 Next.js 16(Turbopack 기본)과 충돌
- **Serwist**(`@serwist/next`)는 Turbopack과 완벽 호환, 현재 Next.js PWA 생태계의 표준

### 패키지
```
npm install @serwist/next serwist
npm install -D @serwist/cli
```

### 오프라인 전략 (구글독스 오프라인 모드 참고)

오프라인 지원 수준을 환경별로 구분한다:

| 환경 | 오프라인 지원 수준 | 설명 |
|------|-------------------|------|
| **PWA (설치형)** | 완전 오프라인 | 읽기 + 쓰기 + AI 추론 모두 가능 |
| **웹 브라우저** | 데이터 보존 | 편집 중 오프라인 → 작업 유실 방지, 온라인 복귀 시 동기화 |

#### 데이터 흐름

```
[에디터 변경]
    ↓ (즉시, 오프라인에서도 동작)
[IndexedDB에 로컬 저장]          ← 1차 저장소 (source of truth)
    ↓ (온라인일 때)
[GraphQL mutation → 서버 동기화]  ← urql offlineExchange가 큐잉/재전송
```

- 문서의 1차 저장소는 **항상 IndexedDB**. GraphQL 응답 캐시에 의존하지 않음
- 오프라인에서도 에디터가 정상 동작하고, 서버 동기화는 온라인 복귀 시 자동 처리
- urql의 `offlineExchange`가 실패한 mutation을 큐에 쌓았다가 순서대로 재전송

### 캐싱 전략
| 대상 | 전략 |
|------|------|
| 앱 셸 (정적 UI) | Precache + Stale-While-Revalidate |
| AI 모델 파일 | Cache-First (IndexedDB에 별도 관리) |
| API 응답 (JSON) | Stale-While-Revalidate |
| 이미지 등 미디어 | Cache-First + 만료 정책 |
| 인증 엔드포인트 | Network-Only |

### 주의점
- PWA 설치 유도 UI를 설계할 것 (완전 오프라인은 PWA에서만 지원됨을 안내)
- 오프라인 상태 표시 UI 필수 (현재 오프라인임을 사용자에게 명확히 안내)
- Service Worker 업데이트 시 안전한 핸들링 필요 (skipWaiting 전략 등)

---

## 3. 에디터 엔진: TipTap (ProseMirror 기반)

### 선정 이유
- ProseMirror의 강력한 문서 모델을 React와 자연스럽게 통합
- Extension 시스템으로 AI 기능을 모듈화하기 용이
- Sudowrite도 ProseMirror 기반

### AI 통합 방법
- **Selection API + Decoration API**: 드래그 선택 영역을 감지하고 하이라이트 표시
- **NodeView / BubbleMenu 확장**: Sudowrite 스타일의 사이드 패널 UI 구현
- **AI 응답 스트리밍**: TipTap의 트랜잭션 시스템을 활용해 토큰 단위로 에디터에 삽입

### 주의점
- TipTap은 공식 AI 확장(Content AI)을 제공하지만, TipTap Cloud 기반이므로 로컬 LLM과 통합하려면 **커스텀 LLM resolver**를 직접 구현해야 함
- A4 20장 분량의 문서를 다룰 때 ProseMirror의 문서 크기에 따른 성능 저하 여부를 초기에 벤치마크할 것

---

## 4. 로컬 AI 엔진: Transformers.js v4

### 선정 이유 (v3 → v4 업그레이드 권장)
- 2026년 2월 v4 프리뷰 출시 (`npm i @huggingface/transformers@next`)
- C++로 재작성된 WebGPU 런타임 (ONNX Runtime 팀 협업)
- BERT 임베딩 기준 최대 4배 속도 향상
- 8B+ 대형 모델 지원, 완전한 오프라인 지원
- 빌드 시간 2초 → 200ms (esbuild 기반)

### WebLLM을 대안으로 채택하지 않는 이유
WebLLM은 LLM 텍스트 추론에 특화된 프레임워크로, 네이티브 대비 80% 성능을 달성하는 장점이 있다. 하지만 Plota는 PoC 이후 **이미지 생성, 나레이션 음성 생성** 등으로 확장할 계획이 있으므로:
- WebLLM은 LLM(텍스트 생성) 전용이라 이미지/음성 모델을 돌릴 수 없음
- Transformers.js는 **텍스트, 이미지, 오디오, 비전 등 다양한 모달리티**를 단일 라이브러리로 지원 (Stable Diffusion, Whisper, CLIP 등)
- 하나의 런타임으로 모든 AI 파이프라인을 통합 관리할 수 있어 아키텍처가 단순해짐
- 모델 캐싱(IndexedDB), Worker 통신 패턴 등을 한 번만 구축하면 모든 모달리티에 재사용 가능

### 모델 선택
| 모델 | 크기 | 용도 | 비고 |
|------|------|------|------|
| Llama-3.2-3B | ~3-4GB | 텍스트 생성 (고품질) | 메모리 부담 큼, 저사양 기기에서 어려움 |
| Llama-3.2-1B | ~1-2GB | 텍스트 생성 (초안) | 가벼움, PoC에 충분한 품질 |

- PoC 단계에서는 **1B 모델로 시작**하여 메모리 부담을 줄이고, 품질이 부족할 경우 3B로 전환하는 전략 권장
- 모델 선택을 사용자에게 맡기는 UI(설정 화면)를 만들어두면 유연성 확보 가능

### 주의점
- **WebGPU 미지원 브라우저 폴백**: 2026년 기준 WebGPU 지원률 약 70%. Firefox, Safari는 피처 플래그 필요. WASM 폴백을 반드시 구현할 것
- **모델 다운로드 UX**: 1-4GB 모델 다운로드는 사용자 경험에 큰 영향. 진행률 표시, 다운로드 재개(resume), 다운로드 중 다른 기능 사용 가능 여부 등을 설계해야 함
- v4는 아직 프리뷰 단계. 안정성 이슈 발생 시 v3로 롤백 가능하도록 추상화 레이어를 둘 것

---

## 5. 멀티스레딩 통신: Comlink

### 선정 이유
- Web Worker와의 postMessage 통신을 일반 함수 호출처럼 추상화 (1.1kB)
- 개발 난이도 대폭 감소, 코드 가독성 향상

### 주의점
- **Structured Clone 오버헤드**: `postMessage`는 데이터를 deep copy함. 대용량 데이터 전송 시 메인 스레드가 일시 정지될 수 있음
- **해결책 1 — 스트리밍**: LLM 출력을 토큰 단위로 전달하면 한 번에 복사되는 데이터 크기를 최소화
- **해결책 2 — Transferable Objects**: 모델 가중치나 대용량 바이너리 데이터는 `ArrayBuffer`로 변환 후 transfer (제로 카피, 단 원본 스레드에서 접근 불가)

### 아키텍처 패턴
```
[메인 스레드 (UI)]
    ↕ Comlink (RPC)
[Web Worker]
    ↕ Transformers.js
[WebGPU / WASM]
```
- Worker에서 Transformers.js 파이프라인을 초기화하고, 메인 스레드에서는 Comlink 프록시를 통해 함수처럼 호출
- 토큰 스트리밍은 Comlink의 `proxy()` + `callback` 패턴으로 구현

---

## 6. IndexedDB 데이터 설계

### 스토어 구조
| 스토어 | 용도 | 주요 인덱스 |
|--------|------|-------------|
| `documents` | 사용자 문서 저장 (source of truth) | by-modified, by-created |
| `modelCache` | AI 모델 파일 캐싱 | by-model-name, by-version |
| `settings` | 앱 설정, 사용자 선호도 | - |

> **Sync Queue는 별도 구현하지 않음**: urql의 `offlineExchange`가 GraphQL mutation 큐잉/재전송을 자동으로 처리하므로, 별도 syncQueue 스토어를 만들 필요 없음. 문서의 로컬 저장(IndexedDB)과 서버 동기화(urql)를 분리하여 책임을 명확히 한다.

### 권장 라이브러리
- **idb**: IndexedDB를 Promise 기반으로 래핑. 직접 IDBRequest를 다루는 것보다 DX가 월등히 좋음

### 저장 흐름
1. 에디터 변경 발생 → IndexedDB `documents` 스토어에 즉시 저장 (optimistic write)
2. 동시에 GraphQL mutation 호출 → 온라인이면 즉시 서버 반영
3. 오프라인이면 urql `offlineExchange`가 mutation을 자동 큐잉
4. 온라인 복귀 시 큐잉된 mutation을 순서대로 재전송
5. 서버 응답과 로컬 데이터 간 충돌 시 문서 단위로 격리 처리

---

## 7. 추가 권장 기술 스택

### 상태 관리: Zustand
- 가볍고 (1.1kB), 보일러플레이트 최소
- `persist` 미들웨어로 IndexedDB와 자연스럽게 연동 가능
- PWA/오프라인 아키텍처와 궁합이 좋음

### GraphQL 클라이언트 / 서버 상태: urql
- GraphQL 백엔드와의 통신에 최적화된 경량 클라이언트 (~8kB 코어)
- **Exchange 시스템**: 미들웨어를 조립하는 구조로, 필요한 기능만 번들에 포함
- **offlineExchange (Graphcache)**: 오프라인 시 mutation 자동 큐잉 → 온라인 복귀 시 재전송. 별도 Sync Queue 구현 불필요
- **정규화 캐시**: 타입+ID 기반으로 응답을 정규화 저장하여, 하나의 엔티티 수정 시 관련 쿼리가 자동 업데이트
- **authExchange**: 토큰 갱신 로직을 exchange로 깔끔하게 처리
- **TanStack Query 대신 urql을 선택한 이유**: TanStack Query는 REST 범용이라 GraphQL에서 쓰려면 래핑이 필요하고, 정규화 캐시가 없으며, 오프라인 mutation 큐잉을 직접 구현해야 함. Apollo Client는 기능은 풍부하나 번들 크기(~33kB)가 PWA에 부담

### 인증: Refresh Token + Access Token (주 1회 로그인)
- **Refresh Token**: 7일 만료, HttpOnly 쿠키에 저장
- **Access Token**: 짧은 만료 (15분~1시간), 메모리 또는 클로저에 보관
- urql의 **authExchange**로 토큰 만료 감지 → 자동 갱신 → 실패 시 재로그인 유도
- **PWA 오프라인 상태에서 토큰이 만료된 경우**: 로컬 작업(에디터 + AI 추론)은 계속 가능. 온라인 복귀 시 Refresh Token으로 자동 갱신 시도 → 7일 초과 시 재로그인 요청
- Server Actions를 통한 토큰 갱신 시 NestJS 백엔드와 안전하게 통신

### UI 프레임워크: Tailwind CSS + Shadcn/ui
- 빠른 프로토타이핑에 적합
- Shadcn/ui는 복사-붙여넣기 방식이라 번들 크기에 불필요한 부담 없음
- 에디터 UI 커스터마이징에 유연

### 테스트
| 도구 | 용도 |
|------|------|
| Vitest | 단위/통합 테스트 (Vite 기반, Jest 호환) |
| Playwright | E2E 테스트, PWA/오프라인 시나리오 검증 |
| MSW (Mock Service Worker) | API 모킹, 오프라인 시뮬레이션 |

### 모니터링 (선택)
- Sentry: 에러 추적 (오프라인 에러 버퍼링 후 전송 가능)

---

## 8. 확장성 고려 (PoC 이후)

현재 PoC는 텍스트 생성에 집중하지만, 이후 아래 기능으로 확장될 예정:

| 확장 기능 | Transformers.js 지원 모델 (예시) | 비고 |
|-----------|----------------------------------|------|
| 이미지 생성 | Stable Diffusion (WebGPU) | 브라우저에서 구동 가능, 단 VRAM 요구량 높음 |
| 나레이션 음성 생성 | SpeechT5, Bark | TTS 파이프라인 지원 |
| 음성 인식 (STT) | Whisper | 이미 Transformers.js에서 안정적으로 지원 |
| 텍스트 임베딩 / 검색 | BGE, GTE 등 | 문서 내 시맨틱 검색에 활용 가능 |

### 확장을 위한 PoC 단계 설계 원칙
1. **AI 파이프라인 추상화**: 모달리티별 파이프라인을 통일된 인터페이스로 감싸서, 새 모달리티 추가 시 Worker/Comlink 통신 코드를 재작성하지 않도록 설계
2. **모델 매니저 패턴**: 모델 다운로드, 캐싱, 로딩, 언로딩을 중앙에서 관리하는 매니저를 PoC부터 구축
3. **메모리 관리**: 브라우저 메모리 한계상 여러 모델을 동시에 올리기 어려움. 모달리티 전환 시 이전 모델을 언로드하는 전략 필요

---

## 9. 기술 스택 요약

```
Next.js 16+ (App Router)         — 코어 프레임워크
├── Serwist                       — PWA / Service Worker
├── TipTap (ProseMirror)          — 에디터 엔진
├── Transformers.js v4            — 로컬 AI 엔진 (WebGPU)
│   └── Comlink                   — Web Worker 통신
├── urql + Graphcache             — GraphQL 클라이언트 / 오프라인 동기화
│   ├── offlineExchange           — 오프라인 mutation 큐잉/재전송
│   └── authExchange              — 인증 토큰 자동 갱신
├── idb                           — IndexedDB 래퍼 (문서 로컬 저장)
├── Zustand                       — 클라이언트 상태 관리
├── Tailwind CSS + Shadcn/ui      — UI
└── Vitest + Playwright + MSW     — 테스트
```
