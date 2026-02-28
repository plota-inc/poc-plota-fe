# Plota PoC — Tauri 데스크톱 앱 전환 완료 요약

> PWA + Transformers.js 기반 브라우저 앱 → Tauri v2 + Ollama 데스크톱 앱으로 전환.

---

## 1. 전환 내용 요약

### 삭제된 항목

| 파일/모듈 | 이유 |
|-----------|------|
| `src/app/sw.ts` | Serwist Service Worker (PWA 전용) |
| `src/app/manifest.ts` | PWA Manifest |
| `src/workers/llm.worker.ts` | Transformers.js Web Worker (Ollama로 대체) |
| `src/lib/llm-client.ts` | Comlink 프록시 (fetch로 대체) |
| `@serwist/next`, `serwist`, `@serwist/cli` | PWA 패키지 |
| `@huggingface/transformers`, `comlink` | 브라우저 LLM 패키지 |
| `idb` | IndexedDB 래퍼 (Tauri fs API로 대체) |

### 신규 생성

| 파일/모듈 | 역할 |
|-----------|------|
| `src-tauri/` | Tauri v2 Rust 백엔드 전체 |
| `src/lib/ollama-client.ts` | Ollama REST API 클라이언트 (generate, listModels, checkHealth, abort) |

### 수정된 항목

| 파일 | 변경 내용 |
|------|-----------|
| `next.config.ts` | Serwist 제거, `output: "export"` 정적 빌드 |
| `src/app/layout.tsx` | PWA 메타데이터 제거, 데스크톱 앱 설명으로 변경 |
| `src/lib/db.ts` | IndexedDB → Tauri fs API (JSON 파일), 브라우저 폴백(localStorage) 포함 |
| `src/stores/model-store.ts` | Ollama 상태 관리 (selectedModel, availableModels, ollamaConnected) |
| `src/components/layout/sidebar-right.tsx` | Comlink → Ollama fetch, 연결 상태 UI, 생성 중단 기능 |
| `src/components/layout/header.tsx` | Ollama 연결 상태 표시 (Local Mode) |
| `src/components/layout/settings-dialog.tsx` | Ollama 모델 목록/선택 UI, 모델 캐시 → Ollama 관리 |
| `components.json` | `rsc: false` (Static Export용) |
| `package.json` | 패키지 정리, tauri 스크립트 추가 |
| `.gitignore` | Serwist → Tauri 빌드 산출물 |

### 변경 없음 (UI 100% 유지)

| 파일 | 비고 |
|------|------|
| `src/components/ui/*` | 모든 shadcn/ui 컴포넌트 |
| `src/components/editor/tiptap-editor.tsx` | TipTap 에디터 (에러 메시지만 미세 수정) |
| `src/components/layout/editor-area.tsx` | 에디터 레이아웃 |
| `src/components/layout/sidebar-left.tsx` | 좌측 문서 목록 |
| `src/app/page.tsx` | 메인 페이지 구조 |
| `src/app/globals.css` | 스타일 |
| `src/stores/ai-store.ts` | AI 생성 상태 관리 |
| `src/lib/utils.ts` | shadcn 유틸 |

---

## 2. 기술 스택

```
Tauri v2 (Rust)                   — 데스크톱 앱 셸
├── Next.js 16+ (Static Export)   — UI 프레임워크
│   ├── TipTap (ProseMirror)      — 에디터 엔진
│   ├── Zustand                   — 상태 관리
│   └── Tailwind CSS + Shadcn/ui  — UI
├── Ollama (별도 설치)             — 로컬 LLM 추론 엔진
│   └── REST API (localhost:11434)
└── Tauri fs API                  — 문서 로컬 저장 (JSON 파일)
```

---

## 3. 개발 명령어

```bash
# UI 개발 (브라우저, Ollama 연동 가능)
npm run dev

# Tauri 데스크톱 앱 개발
npm run tauri:dev

# 프로덕션 빌드
npm run tauri:build
```

---

## 4. 사전 요구사항

- **Rust**: `rustup` 으로 설치 (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- **Ollama**: [ollama.com](https://ollama.com)에서 설치 후 실행
- **모델 다운로드**: `ollama pull llama3.2:8b` (또는 원하는 모델)

---

## 5. 아키텍처 특징

- **Ollama 자동 감지**: 앱 시작 시 10초 주기로 `localhost:11434` health check
- **미연결 시 안내**: Ollama 미실행 시 설치 안내 UI 표시, 생성 버튼 비활성화
- **생성 중단**: AbortController로 스트리밍 생성 즉시 중단 가능
- **브라우저 폴백**: `npm run dev`로 Tauri 없이도 UI 개발 가능 (db.ts가 localStorage 폴백)
- **모델 선택**: 설정 다이얼로그에서 Ollama에 설치된 모델 목록 조회 및 선택

---

## 6. 데이터 흐름

```
[에디터 변경] → [Tauri fs API → $APPDATA/plota/documents/{id}.json] → [앱 재시작해도 복원]

[AI 생성 요청]
    ↓
[fetch("http://localhost:11434/api/chat")]  ← Ollama REST API
    ↓ (스트리밍 응답, NDJSON)
[토큰 단위로 UI에 실시간 반영]
    ↓
[사용자가 "Replace" 클릭 → TipTap 트랜잭션으로 에디터에 반영]
```
