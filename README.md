# TokenTrim

Local-first context compression for prompts, docs, logs, code, and chat history.

Live app: [0langa.github.io/TokenTrim](https://0langa.github.io/TokenTrim/)

## What It Is

- Browser-first React app hosted on GitHub Pages only.
- No backend. No telemetry. No text upload.
- Two engines:
  - deterministic compression via transforms + safety validation
  - optional `LLM Compress` via in-browser WebLLM on WebGPU

## Main Product Paths

- `Compress`: default workspace for most users. Friendly profile/mode selection, history, export, share links.
- `LLM Compress`: local WebGPU inference with optional extra instruction.
- `Compare`: see `light` / `normal` / `heavy` / `ultra` side by side.
- `Reference`: built-in guide for modes, profiles, and safety.
- `Settings`: tokenizer, token budget, safety override, theme.

## Deployment Shape

- Static deployment target: GitHub Pages project site.
- Vite `base` is derived from `package.json.homepage`.
- `npm run build:pages` creates:
  - `dist/index.html`
  - `dist/404.html` for SPA fallback
  - `dist/.nojekyll` for Pages asset handling
- Push to `main` triggers `.github/workflows/deploy.yml`.

## Dev

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run build:pages
```

## Architecture Slice

| Path | Role |
|---|---|
| `src/App.tsx` | app shell state + lazy-loaded secondary views |
| `src/views/CompressView.tsx` | main deterministic workspace |
| `src/views/LlmCompressView.tsx` | local WebLLM workspace |
| `src/hooks/useCompression.ts` | deterministic worker bridge |
| `src/hooks/useParallelCompression.ts` | compare-mode worker fanout |
| `src/hooks/useWebLLM.ts` | local model load, request planning, chunk/merge, abort |
| `src/workers/compression.worker.ts` | deterministic off-main-thread compression |
| `src/workers/webllm.worker.ts` | WebLLM worker runtime |
| `src/compression/pipeline.ts` | deterministic compression pipeline |
| `src/compression/recommendations.ts` | profile/mode auto-suggestion heuristics |
| `src/lib/shareableUrl.ts` | compact URL state encode/decode |

Full map: [docs/CODEMAP.md](docs/CODEMAP.md)

## Runtime Rules

- Protected spans survive deterministic compression: code, URLs, file paths, versions, dates, identifiers.
- Medium/high-risk transforms pass semantic validation unless unsafe override is enabled.
- Worker replies are request-scoped; stale jobs must not overwrite newer input.
- WebLLM jobs abort only on explicit stop/unmount.
- GitHub Pages build must stay static-safe: correct base path, SPA fallback, no backend assumptions.

## Docs

- [docs/CODEMAP.md](docs/CODEMAP.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/NEXT-STEPS.md](docs/NEXT-STEPS.md)
- [CHANGELOG.md](CHANGELOG.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
