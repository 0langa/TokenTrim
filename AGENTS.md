# TokenTrim — Agent Context

TokenTrim is a TypeScript monorepo that compresses AI context locally using deterministic text transforms, protected spans, and semantic safety validation. It ships as a React web app, a Node.js CLI, and an npm library. No external AI services, no upload, no telemetry.

---

## Technology Stack

- **Runtime:** Node.js >=18.0.0
- **Language:** TypeScript ~6.0.2 (strict, ES2023, ESM only)
- **Frontend:** React 19.2.5, Vite 8.0.10, Tailwind CSS 4.2.4
- **Bundler (lib/cli):** esbuild 0.27.0
- **Test:** Vitest 3.2.4 with `@vitest/coverage-v8`
- **Lint:** ESLint 10 with `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

---

## Project Structure

```
src/
  compression/          # Core library (used by web, cli, and npm package)
    index.ts            # Public API exports
    pipeline.ts         # Main compress() orchestration
    budgetOptimizer.ts  # optimizeToBudget() escalates strength until budget is met
    modes.ts            # Mode definitions (light, normal, heavy, ultra, custom)
    profiles.ts         # Profile definitions and transform ordering
    transformRegistry.ts# Registry of all transforms
    protectedSpans.ts   # Extract/restore protected spans
    reporting.ts        # createCompressionReport()
    tokenizer.ts        # Token estimation façade
    tokenizers/         # approx-generic, openai-cl100k, openai-o200k
    transforms/         # Individual transform implementations
    safety/             # Semantic validators and extractors
  components/           # React UI components
    controls/           # ModeDescription, ProfileSelect, RiskSelect
    layout/             # AppShell, Sidebar, TopBar
    workspace/          # ControlsPanel, InputPanel
  views/                # Top-level page views
    CompressView.tsx
    CompareView.tsx
    SettingsView.tsx
    ReferenceView.tsx
  hooks/                # React hooks
    useCompression.ts   # Manages compression web worker
    useParallelCompression.ts
    useCustomTransforms.ts
    useTheme.ts
  workers/
    compression.worker.ts # Web worker entry for browser compression
  cli/
    config.ts           # .tokentrimrc* config loading and validation
    ignorePatterns.ts   # .tokentrimignore gitignore-style matching
  cli.ts                # CLI entry point (esbuild → dist/cli.js)
  lib/
    wordDiff.ts         # Word-level diff utility for UI
  data/
    samples.ts          # Built-in sample texts
  version.ts            # Runtime version detection (build-time define fallback)
  global.d.ts           # Declares __TOKENTRIM_VERSION__
tests/                  # Integration tests (CLI, profiles, protected spans)
benchmarks/             # Benchmark fixtures and runner
scripts/
  build-lib.mjs         # esbuild dist/index.js (npm package)
  build-cli.mjs         # esbuild dist/cli.js + dist/pipeline.js
  benchmark.mjs         # Benchmark runner (requires build)
```

---

## Build Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on `http://localhost:5173` |
| `npm run typecheck` | `tsc -b` (project references) |
| `npm run build` | Full production build: typecheck + Vite + lib + CLI |
| `npm run build:lib` | esbuild `src/compression/index.ts` → `dist/index.js` |
| `npm run build:cli` | esbuild `src/cli.ts` → `dist/cli.js` + `dist/pipeline.js` |
| `npm run build:types` | Emit `.d.ts` for the library (`tsconfig.lib.json`) |
| `npm run build:pages` | `npm run build` + copy `dist/index.html` → `dist/404.html` (GitHub Pages) |
| `npm run lint` | ESLint across the repo |
| `npm run preview` | Vite preview of last build |
| `npm run test` | Vitest run once |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Vitest with coverage report |
| `npm run benchmark` | Run benchmarks against `dist/pipeline.js` |

---

## Code Style Guidelines

- **ESM only.** No CommonJS.
- `verbatimModuleSyntax: true` — always use `import type` for type-only imports.
- `noUnusedLocals` and `noUnusedParameters` are enabled; unused variables will fail typecheck.
- `erasableSyntaxOnly: true` — no `enum`, namespaces, or parameter properties.
- Single quotes for strings.
- Functional React components; hooks in `src/hooks/`.
- Transforms live in `src/compression/transforms/` and export a single `apply` function.
- Add new transforms to `src/compression/transformRegistry.ts` and assign `defaultModes`, `risk`, and optional `profiles`.

---

## Testing Strategy

- **Unit tests:** Co-located next to source files as `*.test.ts`.
- **Integration tests:** In `tests/` directory (CLI integration, profile contracts, protected spans).
- The CLI integration suite tests both the built `dist/cli.js` binary (subprocess) and the imported `runCli` function directly.
- To run CLI integration against the built binary, build first: `npm run build:cli`.
- Vitest config is implicit (no `vitest.config.ts`); it uses Vite’s config.

---

## Compression Architecture

1. **Normalize structural whitespace** (`pipeline.ts`).
2. **Protect spans** — extract code blocks, URLs, paths, numbers, JSON/YAML, tables, headings, emails, quoted strings. Replace with placeholders.
3. **Run transforms sequentially** based on mode/profile. Each transform receives the current text and a `TransformContext`.
4. **Validate semantic safety** after each transform. If the transform introduces a safety error (e.g., negation loss, number loss, URL loss) it is rejected unless `allowUnsafeTransforms` is set.
5. **Restore protected spans** and return metrics, reports, warnings, and safety issues.

### Modes
- `light` — safe structural cleanup (~5–15% savings)
- `normal` — balanced (~15–30%)
- `heavy` — aggressive (~30–50%)
- `ultra` — maximum compaction, reduced readability (~40–65%)
- `custom` — manual transform selection via `enabledTransforms`

### Profiles
`general`, `agent-context`, `repo-context`, `logs`, `markdown-docs`, `chat-history`. Profiles control transform ordering and may enable profile-only transforms (e.g., `section-salience`, `log-compression`).

### Risk Levels
`safe` < `low` < `medium` < `high`. `maxRisk` option filters which transforms are allowed.

---

## CLI Conventions

- Entry: `src/cli.ts` → `dist/cli.js` (Node ESM).
- Commands: `compress`, `batch`, `report`, `stdin`, `repo`/`context`, `watch`, `init`, `list-transforms`, `list-profiles`, `list-tokenizers`, `list-modes`.
- Config files (loaded from cwd): `.tokentrimrc`, `.tokentrimrc.json`, `tokentrim.config.json`.
- Ignore file: `.tokentrimignore` (gitignore-style patterns for `batch --recursive` and `repo`).
- CLI flags override config values.
- Exit codes: `0` success, `1` error, `2` compression succeeded but with errors (`result.error` truthy).

---

## Deployment

- **GitHub Pages:** `.github/workflows/deploy.yml` triggers on `push` to `main`. It lints, typechecks, builds lib/cli, runs tests, builds pages, and deploys `dist/`.
- **Netlify:** `netlify.toml` is present with SPA fallback rules.
- Vite `base` is set to `/TokenTrim/` for GitHub Pages path compatibility.

---

## Security & Safety

- All compression happens locally. No network requests for compression.
- Exact OpenAI tokenizers (`openai-cl100k`, `openai-o200k`) are loaded lazily from `gpt-tokenizer` inside the web worker or Node process.
- Semantic safety validators guard against data loss: negations, requirements, numbers, dates, semvers, URLs, paths, code identifiers, and protected spans.
- `allowUnsafeTransforms` bypasses safety rejection; use only when the user explicitly opts in.

---

## Key Files for Agents

| Task | File(s) |
|---|---|
| Add a transform | `src/compression/transforms/<name>.ts` → register in `src/compression/transformRegistry.ts` |
| Change mode behavior | `src/compression/modes.ts` |
| Change profile ordering | `src/compression/profiles.ts` |
| Add CLI command | `src/cli.ts` |
| Add CLI config field | `src/cli/config.ts` + `src/compression/types.ts` |
| Change tokenizer behavior | `src/compression/tokenizers/` |
| Change safety rules | `src/compression/safety/semanticValidator.ts` and `src/compression/safety/extractors.ts` |
| Change public API | `src/compression/index.ts` |

---

## Versioning

Version is defined in `package.json`. At build time `__TOKENTRIM_VERSION__` is injected by Vite and esbuild. `src/version.ts` falls back to a hardcoded string if the define is missing.
