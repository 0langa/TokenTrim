# TokenTrim — Status & Roadmap
_Portfolio audit: 2026-07-11. State refreshed: 2026-09-19._

## What this is
Local-first context compression for prompts, docs, logs, code, and chat history. A React 19 +
TypeScript + Vite app deployed to GitHub Pages (live at 0langa.github.io/TokenTrim) with two
engines: a deterministic transform pipeline with safety validation
(`src/compression/pipeline.ts`, off-main-thread via `src/workers/compression.worker.ts`) and
optional in-browser WebLLM compression on WebGPU (`src/hooks/useWebLLM.ts`,
`src/workers/webllm.worker.ts`). The build also produces a library and CLI (`dist/cli.js`,
`bin: tokentrim`) via `scripts/build-lib.mjs` / `build-cli.mjs`.

## Current state
Released v2.1.0 (2026-05-04) and deployed: `.github/workflows/deploy.yml` gates every push to
`main` on lint, typecheck, lib/CLI builds, tests, and a benchmark regression check
(`scripts/check-regression.mjs`) before publishing to Pages. Test suite is small but high-quality
(6 files in `tests/`, including property-based and fuzz tests via fast-check). Docs are in good
shape: `docs/CODEMAP.md`, `docs/DEPLOYMENT.md`, `CHANGELOG.md`, and an existing engineering
backlog at `docs/NEXT-STEPS.md` (which this file supersedes at the planning level).

Loose ends observed:
- `v2.1.0` is tagged. The earlier v2.0.0 and v2.0.1 releases have no tags.
- `package.json` is fully prepared for npm (bin, exports, `publishConfig` with provenance) but
  there is no publish workflow and no evidence of an npm release; the package story is unfinished.
- `CHANGELOG.md` documents only 2.1.0; earlier releases (2.0.0, 2.0.1) are not recorded.
- UI-level behavior (worker races, URL restore, view switching) is untested; all current tests
  target the compression core and CLI.

## Definition of "finished"
A "2.x complete" release: tagged releases, the npm package either published (with a release
workflow) or the CLI/lib packaging deliberately removed, the reliability items from
`docs/NEXT-STEPS.md` short-term list shipped (LLM chunk progress UI, history storage cap, WebLLM
failure messaging, copy/export in LLM view), and browser-level smoke tests so the Pages deploy
gate covers what users actually touch.

## Roadmap

### Phase 1 — Now (next 1-2 weeks)
- Backfill 2.0.0/2.0.1 entries in `CHANGELOG.md` and decide whether historical tags add value.
  Keep tag-per-release discipline going forward.
- Decide the npm question: either add a tag-triggered `release.yml` that runs the existing verify
  steps and `npm publish --provenance`, or strip `bin`/`publishConfig` and position TokenTrim as
  web-only. The half-configured state is the worst option.
- Add copy/export actions to `src/views/LlmCompressView.tsx` (parity with the deterministic view).

### Phase 2 — Next (2-6 weeks)
- Chunked LLM compression status UI: surface chunk count, active chunk, and merge pass from
  `src/hooks/useWebLLM.ts` request planning into the LLM view.
- Cap or offload large history payloads instead of storing full outputs in `localStorage`
  (history handling around `src/views/CompressView.tsx`); define an eviction policy.
- Explicit user-facing errors when WebLLM model download/cache fails (network, quota, WebGPU
  unsupported) instead of generic failure states.
- Browser integration tests (Playwright or vitest browser mode) for the risks listed in
  `docs/NEXT-STEPS.md`: worker-state races, Pages deep-link refresh (`404.html` SPA fallback),
  model switching, URL state restore via `src/lib/shareableUrl.ts`.

### Phase 3 — Later (optional/stretch)
- ONNX/WebAssembly fallback so LLM Compress works on non-WebGPU browsers.
- Cancelable deterministic worker jobs (today only stale responses are suppressed).
- Plugin-style transform packs / user-defined transform bundles on top of
  `src/compression/transforms/`.
- Benchmark coverage for worker latency and memory (not just compression ratios in
  `benchmarks/baseline.json`), plus visual regression checks for key views.

## Effort to "finished"
M (1-4 weeks) part-time solo — the app is live, gated, and healthy; finishing is mostly release
mechanics (tags, npm decision) plus a bounded set of known UX/reliability items.
