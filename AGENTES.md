# AGENTES.md — TokenTrim Codebase Guide

TokenTrim v2.0.1. Vite + React + TypeScript web app + Node CLI. Lossless-first AI token compression. GitHub Pages deploy.

---

## Repository Layout

```
src/
  App.tsx                        # Root component — routes 3 views, holds global state
  main.tsx                       # Vite entry
  version.ts                     # TOKENTRIM_VERSION (injected at build via __TOKENTRIM_VERSION__)
  cli.ts                         # Node CLI entry point
  cli/
    config.ts                    # .tokentrimrc / tokentrim.config.json loader
    ignorePatterns.ts            # .tokentrimignore + .gitignore walker
  compression/
    index.ts                     # Public re-exports (compress, optimizeToBudget, etc.)
    pipeline.ts                  # compress() — main engine
    budgetOptimizer.ts           # optimizeToBudget() — escalates modes until token budget met
    modes.ts                     # MODES array + ALL_PROTECTED_SPANS + mapLegacyProfileToMode()
    profiles.ts                  # PROFILE_META + PROFILE_TRANSFORM_ORDER + mapLegacyProfileId()
    presets.ts                   # PRESETS — pre-canned {profile, mode, maxRisk} combos
    protectedSpans.ts            # protectSpans() / restoreSpans() — placeholder substitution
    transformRegistry.ts         # TRANSFORM_REGISTRY — all transforms + defaultTransformsForMode()
    reporting.ts                 # createCompressionReport() — export-ready report
    tokenizer.ts                 # thin wrapper → tokenizers/index.ts
    types.ts                     # ALL shared types (source of truth)
    safety/
      extractors.ts              # extractNegations/Numbers/Dates/Urls/Paths/Requirements/Semvers
      semanticValidator.ts       # validateSemanticSafety() — diff-based loss detection
    tokenizers/
      index.ts                   # estimateTokens(text, kind) dispatcher
      approxGeneric.ts           # ~4 chars/token heuristic
      openaiCompatible.ts        # cl100k / o200k (tiktoken WASM)
    transforms/
      types.ts                   # TokenTrimTransform, TransformContext, TransformResult
      shared.ts                  # shared regex helpers
      fillerRemoval.ts
      articleRemoval.ts
      proseRewrite.ts
      abbreviationTransform.ts
      operatorTransform.ts
      numericTransform.ts
      structuredDataTransform.ts
      deduplicationTransform.ts
      sectionSalienceTransform.ts
      logCompressionTransform.ts
      markdownCompressionTransform.ts
  workers/
    compression.worker.ts        # Web Worker: receives CompressionRequest, posts CompressionResult
  hooks/
    useCompression.ts            # Debounced Worker bridge (300 ms), returns {result, processing, run}
    useCustomTransforms.ts       # Custom-mode transform toggle state
    useTheme.ts                  # dark/light preference
  components/
    layout/
      AppShell.tsx               # Sidebar + TopBar wrapper
      Sidebar.tsx
      TopBar.tsx                 # AppView type lives here
    workspace/
      InputPanel.tsx
      ControlsPanel.tsx
    controls/
      ModeDescription.tsx
      ProfileSelect.tsx
      RiskSelect.tsx
    CopyButton.tsx
    DiffView.tsx
    IntensitySelector.tsx
    MetricsBar.tsx
    PresetSelector.tsx
    ReportPanel.tsx
    ResultTabs.tsx
    SafetyReviewPanel.tsx
    TransformStatsPanel.tsx
  views/
    CompressView.tsx             # Main workspace view
    SettingsView.tsx             # Tokenizer, target tokens, unsafe-transforms toggle
    ReferenceView.tsx            # Mode/profile/transform reference docs
  data/
    samples.ts                   # Sample input texts
  lib/
    wordDiff.ts                  # Word-level diff utility (used by DiffView)
```

---

## Core Data Flow

```
User types text
  → useCompression.run() [debounce 300 ms]
    → compression.worker.ts [Web Worker]
      → compress(text, options)            # pipeline.ts
        → normalizeStructural()
        → protectSpans()                   # replace code/urls/etc with ␟TT_SPAN_*␟ placeholders
        → for each transformId:
            transform.apply(text, ctx)
            validateSemanticSafety()       # reject if negation/number/url/etc lost
        → cleanupWhitespaceSafe()
        → restoreSpans()                   # put originals back
        → estimateTokens() x2
        → return CompressionResult
  → setResult(result) → UI re-renders
```

---

## Key Types (`src/compression/types.ts`)

| Type | Purpose |
|------|---------|
| `CompressionMode` | `'light' \| 'normal' \| 'heavy' \| 'ultra' \| 'custom'` |
| `CompressionProfile` | `'general' \| 'agent-context' \| 'repo-context' \| 'logs' \| 'markdown-docs' \| 'chat-history'` |
| `RiskLevel` | `'safe' \| 'low' \| 'medium' \| 'high'` |
| `TokenizerKind` | `'approx-generic' \| 'openai-cl100k' \| 'openai-o200k'` |
| `CompressionOptions` | Input to `compress()`: mode, profile, tokenizer, targetTokens, maxRisk, etc. |
| `CompressionResult` | `compress()` output: text, metrics, report, warnings, safetyIssues, rejectedTransforms |
| `TokenTrimTransform` | Shape each transform implements (`id`, `risk`, `defaultModes`, `apply`) |
| `TransformContext` | Passed to every `apply()`: mode, profile, tokenizer, targetTokens, maxRisk |
| `SafetyIssue` | Loss detected by semanticValidator: severity + category |
| `ProtectedSpan` | `{type, placeholder, content}` — one substituted span |

---

## Compression Modes

| Mode | Expected savings | Risk |
|------|-----------------|------|
| `light` | 8–18% | safe |
| `normal` | 18–32% | low |
| `heavy` | 30–45% | medium |
| `ultra` | 35–55% | high |
| `custom` | 0–55% | high — user-selected transforms |

---

## Transform Registry

All transforms in `TRANSFORM_REGISTRY` (`transformRegistry.ts`). Each has `defaultModes[]` (default inclusion) and optional `profileOnly: true` (runs only with matching profile).

| ID | Risk | Profile-only |
|----|------|-------------|
| `markdown-cleanup` | safe | no |
| `structured-data` | safe | no |
| `filler-removal` | medium | no |
| `numeric` | low | no |
| `prose-rewrite:common` | medium | no |
| `article-removal` | medium | no |
| `abbreviation` | low | no |
| `operator` | high | no |
| `caveman-compaction` | high | no |
| `deduplication` | medium | no |
| `section-salience` | medium | yes (`agent-context`, `repo-context`, `chat-history`, `markdown-docs`) |
| `log-compression` | low | yes (`logs`) |

Add transform: implement `TokenTrimTransform`, import in `transformRegistry.ts`, push to `TRANSFORM_REGISTRY`.

---

## Protected Spans

`protectSpans()` replaces sensitive content with `␟TT_SPAN_<seed>_<n>␟` placeholders before transforms run. `restoreSpans()` restores originals after. Span types: `fenced-code`, `inline-code`, `url`, `file-path`, `cli-command`, `env-var`, `api-placeholder`, `number-unit`, `json-block`, `yaml-toml`, `markdown-table`, `markdown-heading`, `email`, `quoted-string`.

Transforms must NOT touch placeholder tokens — they look like `␟TT_SPAN_*␟`.

---

## Safety Validator

After each transform, `validateSemanticSafety(before, after, spans, spans)` checks for lost: negations, requirement markers, numbers, dates, semvers, urls, file paths, code identifiers. Returns `SafetyIssue[]`. `severity: 'error'` rejects transform unless `allowUnsafeTransforms: true`.

Transform can declare `allowedSafetyCategories` to suppress known-safe losses.

---

## Budget Optimizer

`optimizeToBudget(input, options)` in `budgetOptimizer.ts` escalates through `['light','normal','heavy','ultra']` until `estimatedTokensAfter <= targetTokens`. Returns best result even if budget missed.

---

## Profiles vs Modes

- **Mode** = intensity. Determines default transforms.
- **Profile** = content type hint. Overrides transform order, enables profile-only transforms.
- Both set: `chooseTransforms()` in `pipeline.ts` uses `PROFILE_TRANSFORM_ORDER[profile]`, filtered to transforms enabled by mode.

---

## CLI Entry Point

`src/cli.ts` — Node.js CLI. Reads stdin or files, calls `compress()` / `optimizeToBudget()`, writes stdout. Supports `--mode`, `--profile`, `--tokenizer`, `--target-tokens`, `--max-risk`, `--transforms`, `--report`, `--recursive`, `--dry-run`, `--format json|text`.

Config from `.tokentrimrc` / `tokentrim.config.json`. Ignore patterns from `.tokentrimignore`.

---

## Tokenizers

- `approx-generic`: heuristic, ~4 chars/token, no WASM, always available.
- `openai-cl100k` / `openai-o200k`: tiktoken WASM, exact counts, lazy-loaded.

`estimateTokens(text, kind)` is the single public entry point.

---

## App State (`App.tsx`)

Global state in `App.tsx`, passed as props:
- `view`: `'compress' | 'settings' | 'reference'`
- `theme`: dark/light
- `tokenizer`: `TokenizerKind`
- `targetTokens`: string (empty = no budget)
- `allowUnsafeTransforms`: boolean

`CompressView` always mounted (hidden via `h-full` / `hidden` CSS) to preserve state.

---

## Test Files

Co-located `*.test.ts`. Run with `npm test` (Vitest). Key coverage:
- `pipeline.test.ts` — end-to-end compress() scenarios
- `budgetOptimizer.test.ts` — budget escalation
- `protectedSpans.test.ts` — placeholder round-trips
- `semanticValidator.test.ts` — loss detection
- `transforms/*.test.ts` — per-transform unit tests
- `cli.test.ts` — CLI argument parsing
- `releaseConsistency.test.ts` — version/package.json sync check

---

## Build & Dev

```bash
npm run dev        # Vite dev server
npm run build      # TypeScript check + Vite build → dist/
npm test           # Vitest
npm run lint       # ESLint
```

Build output in `dist/`. GitHub Pages deploy from `dist/`.
