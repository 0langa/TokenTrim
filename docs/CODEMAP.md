# CODEMAP

## Stack

- Vite
- React 19
- TypeScript
- Web Workers
- Tailwind v4
- Vitest
- WebLLM via `@mlc-ai/web-llm`
- GitHub Pages static deployment

## Product Shape

- Browser-first text compression tool.
- Primary value path: paste text -> choose compression strategy -> inspect/export result.
- Secondary path: CLI/package export for batch and library use.
- Hosted as a static GitHub Pages project site. No backend path exists.

## Request Flows

### Deterministic Compress

1. `src/views/CompressView.tsx`
2. `src/hooks/useCompression.ts`
3. `src/workers/compression.worker.ts`
4. `src/compression/pipeline.ts`
5. transforms + safety validator + reporting
6. result back to UI

Key behavior:

- debounced worker execution
- tokenizer-aware metrics
- history/export/share
- large-file acknowledgment gate
- stale worker responses ignored by request ID

### Compare

1. `src/views/CompareView.tsx`
2. `src/hooks/useParallelCompression.ts`
3. four worker requests with shared request ID
4. mode-specific output cards

Key risk:

- stale replies from older compare runs; now guarded by request ID

### LLM Compress

1. `src/views/LlmCompressView.tsx`
2. `src/hooks/useWebLLM.ts`
3. `src/workers/webllm.worker.ts`
4. WebLLM worker engine

Hook responsibilities:

- load/replace model worker
- expose progress/error/loaded model
- estimate prompt/input budget
- chunk long input to fit context window
- run per-chunk compression
- optionally merge chunk output
- abort safely
- ignore stale or aborted runs

## Core Directories

### `src/views`

- top-level screens
- thin orchestration + layout
- non-default views lazy-loaded from `src/App.tsx` to reduce first-load cost on Pages

### `src/components`

- reusable UI
- workspace panels
- layout shell
- report/diff/safety display

### `src/hooks`

- UI stateful logic
- worker bridges
- theme/history/custom transform persistence

### `src/compression`

- deterministic compression engine
- profiles/modes/recommendation helpers
- transforms
- token estimators
- safety validator
- report generation

### `src/lib`

- shareable URL state
- word diff

### `src/workers`

- async off-main-thread execution
- deterministic worker
- WebLLM engine worker

## Hot Files

Highest leverage files for future work:

| Path | Why |
|---|---|
| `src/hooks/useWebLLM.ts` | LLM load/generate/abort correctness |
| `src/views/LlmCompressView.tsx` | user-facing LLM control flow |
| `src/hooks/useCompression.ts` | main workspace responsiveness |
| `src/hooks/useParallelCompression.ts` | compare-mode concurrency/staleness |
| `src/compression/pipeline.ts` | main deterministic behavior |
| `src/compression/transformRegistry.ts` | transform activation rules |
| `src/compression/safety/semanticValidator.ts` | semantic integrity gate |
| `src/lib/shareableUrl.ts` | reproducible browser state |

## Persistence

- `localStorage`
  - theme
  - last input
  - last mode
  - custom transforms
  - saved history
- browser URL
  - mode/profile/risk/tokenizer/token budget
  - optional short input state
- browser cache/storage
  - WebLLM model artifacts

## Deployment Files

- `package.json`
  - source of version and Pages homepage URL
- `vite.config.ts`
  - derives static `base` from homepage
- `scripts/build-pages.mjs`
  - emits `404.html` and `.nojekyll`
- `.github/workflows/deploy.yml`
  - verify + deploy pipeline

## Invariants

- protected spans survive deterministic compression
- safety validator gates medium/high-risk transforms unless override enabled
- worker replies are request-scoped
- UI must not show output for cleared/newer input from older worker runs
- WebLLM abort must only happen on user stop/unmount, not normal rerender
- selected LLM model mismatch must be visible and explicit
- docs/tests/version metadata stay aligned

## Current Gaps

- no browser-level automated test for WebGPU path
- `useCompressionHistory` still stores full text payloads in `localStorage`, even though quota handling is better
- LLM path still depends on browser WebGPU quality/device memory
- docs/test matrix still light on UI interaction coverage
