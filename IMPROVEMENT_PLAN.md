# TokenTrim Improvement Plan

> Generated from codebase audit on 2026-05-04. Covers core engine, CLI, web UI, distribution, and ecosystem.

---

## 1. Distribution & Packaging (High Impact, Low Effort) --- DONE

| # | Improvement | Motivation |
|---|-------------|------------|
| 1.1 | **Publish to npm** — remove `"private": true`, set up scoped or public registry publish, add provenance | The CLI is fully functional but unusable via `npm install -g tokentrim` as advertised in README. |
| 1.2 | **GitHub Release automation** — add workflow that tags, builds, publishes to npm, and attaches standalone binaries (via `esbuild` or `pkg`) | Enables users without Node.js to use the CLI. |
| 1.3 | **Add `engines` and `exports` fields to `package.json`** | Explicit Node version support; allow `import { compress } from 'tokentrim'` from ESM/CJS consumers. |

---

## 2. Core Compression Engine (High Impact, Medium Effort)

### 2.1 Exact Tokenizers --- DONE
- **Problem:** `openai-cl100k` and `openai-o200k` fall back to `approxGenericEstimate` with `exact: false`.
- **Fix:** Integrated `gpt-tokenizer` (pure JS, no WASM) as a lazy-loaded dependency in the web worker. The worker preloads the exact encoder before compression; `openaiCompatibleEstimate` uses it when available and falls back to approximate otherwise.
- **Impact:** Budget optimizer and metrics are now exact for OpenAI models in the web app. MetricsBar strips `~` prefix when `exact: true`.

### 2.2 Smarter Deduplication --- DONE
- **Problem:** `deduplicationTransform` only removed exact duplicate paragraphs.
- **Fix:** Added sentence-level near-duplicate detection using word-trigram Jaccard similarity (threshold ≥ 0.75). Runs after exact paragraph dedup. Skips sentences with < 8 words.
- **Impact:** Catches paraphrased or lightly edited duplicate content that exact hashing misses.

### 2.3 Smarter Budget Optimizer --- DONE
- **Problem:** `optimizeToBudget` brute-forces `light → normal → heavy → ultra` and stops at first match.
- **Fix:** Added heuristic compressibility estimator (markdown ratio, paragraph repetition, filler word density, code block ratio). Chooses search order dynamically: aggressive order for highly compressible text, conservative for dense code, binary-search for medium.
- **Impact:** Reaches budget faster on average; skips unnecessary light/normal attempts when heavy/ultra are clearly needed.

### 2.4 Streaming / Chunked Compression --- LARGE PROJECT
- **Problem:** The entire input is processed in one synchronous pass. Large files (>10 MB logs) block the worker/main thread.
- **Fix:** Add `compressStream(chunks, options)` API that:
  1. Compresses chunks independently.
  2. Carries deduplication state across chunks (for log compression).
  3. Yields `{ chunkIndex, output, metrics }` progressively.
- **CLI impact:** `batch` and `repo` commands can process files in parallel with `Promise.all` or `worker_threads`.
- **Status:** Partially addressed by parallel batch processing (4.4). Full streaming API requires significant pipeline redesign. **~1 week.**

### 2.5 Plugin Architecture for Custom Transforms --- LARGE PROJECT
- **Problem:** Transforms are hardcoded in `transformRegistry.ts`. Users cannot add domain-specific rules without forking.
- **Fix:**
  ```ts
  // .tokentrimrc.json
  {
    "plugins": ["./my-transforms.js"]
  }
  ```
  A plugin exports an array of `TokenTrimTransform` objects. The CLI and API merge them into the registry at runtime.
- **Validation:** Plugins must declare `risk` and are subject to the same safety validator.
- **Status:** Requires runtime module loading in both Node.js and browser contexts. Security implications for browser plugin loading. **~2 weeks.**

---

## 3. Safety & Semantic Validation (High Impact, Medium Effort)

| # | Improvement | Detail |
|---|-------------|--------|
| 3.1 | **Sentence-level semantic similarity** --- LARGE PROJECT | Before/after comparison using a lightweight embeddings model (e.g., `fastText` or `transformers.js` in the browser) to ensure rewritten sentences preserve meaning. Reject transforms that drop cosine similarity below a threshold. Requires bundling an embeddings model (~10MB+) or calling an external API. **~2 weeks.** |
| 3.2 | **AST-aware code protection** --- LARGE PROJECT | For `repo-context`, parse JS/TS/Python with a lightweight parser. Protect function signatures, import statements, and exported names beyond regex-based `file-path` spans. Requires adding `acorn`, `typescript`, or `tree-sitter` as dependencies. **~2 weeks.** |
| 3.3 | **Configurable safety rules** --- DONE | Allow `.tokentrimrc.json` to add custom `protectPatterns` (regexes) and `requiredPhrases` (strings that must survive compression). Validated in `semanticValidator.ts`. |
| 3.4 | **Fuzz testing** --- DONE | `tests/fuzz.test.ts` generates random markdown/code/log/prose/mixed inputs and asserts pipeline invariants: no crash, URLs preserved, output non-empty, metrics consistent, error count bounded. |

---

## 4. CLI Enhancements (Medium Impact, Low Effort)

| # | Improvement | Detail |
|---|-------------|--------|
| 4.1 | **Watch mode** --- DONE | `tokentrim watch <path> [options]` re-compresses on file change using `chokidar`. Supports `--out` and `--dry-run`. |
| 4.2 | **Git integration** --- DONE | `tokentrim diff --staged` compresses the git diff output. Uses `git diff --staged` via `child_process.execSync`. Supports all standard compression flags and `--format diff`. |
| 4.3 | **Diff output** --- DONE | `--format diff` prints a unified diff (before/after) instead of the compressed text. Works with `compress`, `stdin`, `batch`, `repo`, and `report` commands. Useful for CI review. |
| 4.4 | **Parallel batch processing** --- DONE | `batch --recursive` and `repo` now use `p-limit` with concurrency = min(8, CPU cores). Files are processed in parallel while maintaining output order. |
| 4.5 | **Progress bars** --- DONE | `batch` and `repo` show a `cli-progress` MultiBar when stdout is a TTY and there are multiple files. Use `--no-progress` to disable. Falls back to line-by-line output when `--out` is set or only one file. |
| 4.6 | **Shell completions** --- DONE | `tokentrim completions <bash|zsh|fish>` outputs a completion script. Bash uses `compgen`, zsh uses `_arguments`, fish uses `complete`. |

---

## 5. Web UI Enhancements (Medium Impact, Medium Effort)

| # | Improvement | Detail |
|---|-------------|--------|
| 5.1 | **Side-by-side diff view** --- DONE | Added `SideBySideDiff.tsx` with inline/side toggle in the Diff tab. Two-column layout: original (red strikethrough) vs compressed (green highlight). |
| 5.2 | **Syntax highlighting** --- DONE | `HighlightedOutput.tsx` uses `shiki` with `createJavaScriptRegexEngine` to highlight fenced code blocks in the Output tab. Supports JS/TS/JSON/YAML/Markdown/Python/Bash/CSS/HTML/Rust/Go/Java/XML. |
| 5.3 | **Shareable URLs** --- DONE | Serialize `mode`, `profile`, `input` (base64'd), `maxRisk`, `tokenizer`, `targetTokens`, `allowUnsafeTransforms`, and `customTransforms` into query params. The URL updates live as settings change; a Share button in the top bar copies the link. Visiting a shared link restores all settings and input automatically. |
| 5.4 | **Compression history** --- DONE | Store last 50 results in `localStorage` with timestamps, grouped by date. History panel on the right side of CompressView. Click to restore input + settings. Save button in metrics bar. |
| 5.5 | **Theme toggle** --- DONE | Light/dark/system mode via Tailwind `dark:` prefixes. Toggle in TopBar and SettingsView. Persisted in localStorage. Respects `prefers-color-scheme` on first visit. |
| 5.6 | **Drag-and-drop folder support** --- PENDING | Currently only `FileList` from `<input type="file">`; enable dropping a directory via the File System Access API (with fallback). **~2 days.** |
| 5.7 | **Large file handling** --- DONE | Web UI shows a warning overlay when input exceeds 1 MB (1,000,000 chars). User must click "Compress anyway" to proceed. Compression is gated until acknowledged; resets when input shrinks. |
| 5.8 | **Token budget bar** --- DONE | Inline token-budget progress bar in `ControlsPanel` showing `current / target` with green/red color coding. |
| 5.9 | **Mode comparison view** --- DONE | New `CompareView` with 4 parallel workers (light/normal/heavy/ultra) showing side-by-side results: tokens, char%, copy button, and truncated output preview. |

---

## 6. New Profiles & Transforms (Medium Impact, Low Effort)

| Profile / Transform | Use Case |
|---------------------|----------|
| **CSV / TSV profile** --- DONE | `csv-cleanup` transform: collapses repeated rows, normalizes whitespace around delimiters, removes blank lines. Profile: `csv`. |
| **JSONL / NDJSON profile** --- DONE | `jsonl-minify` transform: minifies each JSON line, removes trailing commas. Profile: `jsonl`. |
| **XML / HTML profile** --- DONE | `xml-cleanup` transform: removes comments, collapses whitespace in attributes, normalizes entities (`&nbsp;` → ` `, etc.). Profile: `xml`. |
| **Scientific paper profile** --- PENDING | Preserve citations `[1]`, compress methodology boilerplate. **~1 day.** |
| **Latex profile** --- PENDING | Preserve math mode `$...$`, compress text mode. **~1 day.** |
| **Smart list transformer** --- PENDING | Convert `1. \n 2. \n 3.` into `1, 2, 3` when items are short. **~1 day.** |
| **Variable-name shortening** --- LARGE PROJECT | In `repo-context` with `ultra`, replace long local variable names with short ones. Requires AST parsing + scope analysis. **~2 weeks.** |

---

## 7. Testing & Quality (High Impact, Low Effort)

| # | Improvement | Detail |
|---|-------------|--------|
| 7.1 | **CLI integration tests** --- DONE | Spawn the built `dist/cli.js` in temporary directories to test `init`, `compress`, `batch`, `repo`, and config merging end-to-end. |
| 7.2 | **Benchmark regression gate** --- DONE | `scripts/check-regression.mjs` runs benchmarks against `benchmarks/baseline.json`. CI workflow runs it after tests. Fails if savings % or duration exceeds baseline thresholds. |
| 7.3 | **Coverage reporting** --- DONE | Add `@vitest/coverage-v8` and enforce thresholds (e.g., 80 % for `src/compression`). |
| 7.4 | **Property-based tests** --- DONE | `tests/property.test.ts` uses `fast-check` to assert 4 invariants across 500+ random inputs: no crash, output non-empty, URLs preserved, metrics consistent. |

---

## 8. Performance & Architecture (Medium Impact, Medium Effort)

| # | Improvement | Detail |
|---|-------------|--------|
| 8.1 | **WASM acceleration for tokenization** --- LARGE PROJECT | If `js-tiktoken` or similar is adopted, token counting becomes exact and fast even for MB-scale inputs. Requires WASM bundling and cross-platform testing. **~1 week.** |
| 8.2 | **Lazy transform evaluation** --- PENDING | If a transform saves 0 chars on the first 1,000 chars sampled, skip it for the rest of the file. **~2 days.** |
| 8.3 | **Memory optimization** --- PENDING | `protectSpans` creates large placeholder maps. For files >1 MB, use a streaming span extractor that emits `{ start, end, type }` tuples without building intermediate strings. **~3 days.** |
| 8.4 | **Bundle splitting** --- DONE | `HighlightedOutput` now dynamically imports `shiki/core`, `shiki/engine/javascript`, all language modules, and themes on first use. Shiki is no longer in the main chunk. |

---

## 9. Ecosystem & Integrations (High Impact, High Effort)

| # | Integration | Value Proposition |
|---|-------------|-------------------|
| 9.1 | **VS Code extension** --- LARGE PROJECT | Command palette: "TokenTrim: Compress selection/file". Shows inline diff. Uses the same `tokentrim` npm package under the hood. Requires separate repo with VS Code extension manifest, marketplace publishing. **~2 weeks.** |
| 9.2 | **GitHub Action** --- LARGE PROJECT | `uses: julius/tokentrim-action@v1` — compresses README or issue templates before passing to downstream LLM workflows. Requires separate repo with action.yml, Docker image, and marketplace listing. **~1 week.** |
| 9.3 | **Pre-commit hook** --- PENDING | `tokentrim --check` fails if a tracked file exceeds a token budget (enforces context-window hygiene). **~1 day.** |
| 9.4 | **API server** --- LARGE PROJECT | A tiny `hono` or `express` server wrapping `compress()` so non-JS consumers can call it over HTTP. Requires deployment, auth, rate limiting. **~1 week.** |

---

## 10. Documentation & Community (Low Effort, High Long-term Impact)

| # | Task | Detail |
|---|------|--------|
| 10.1 | **Architecture Decision Records (ADRs)** --- DONE | Three ADRs in `docs/`: ADR-001 (regex over ML), ADR-002 (worker-based UI), ADR-003 (approximate tokenizers by default). |
| 10.2 | **Contributing guide** --- DONE | `CONTRIBUTING.md` covers development setup, adding transforms, safety validator, updating benchmarks, code style, and PR checklist. |
| 10.3 | **API docs site** --- DONE | `typedoc.json` configured with entry point `src/compression/index.ts`. Run `npm run docs:api` to generate. Can be deployed alongside GitHub Pages app. |
| 10.4 | **Transform playground** --- PENDING | In the web app, allow users to type a regex + replacement and see live results on their input — lowers the barrier to community-contributed transforms. **~2 days.** |

---

## Recommended Priority Order

**Phase 1 — Unlock Usage (1–2 weeks)** ✅ COMPLETE
1. Publish to npm (1.1)
2. Add `exports` / `engines` to `package.json` (1.3)
3. CLI integration tests (7.1)
4. Coverage reporting (7.3)

**Phase 2 — Core Quality (2–4 weeks)** ✅ COMPLETE
5. Exact tokenizer via `gpt-tokenizer` (2.1)
6. Smarter deduplication with sentence-level Jaccard (2.2)
7. CLI watch mode (4.1)
8. Token budget UI bar (5.8)
9. Mode comparison view (5.9)

**Phase 3 — Advanced Engine (2–4 weeks)** ✅ COMPLETE
10. Smarter budget optimizer (2.3)
11. Configurable safety rules (3.3)
12. Fuzz testing (3.4)
13. Side-by-side diff + syntax highlighting (5.1, 5.2)

**Phase 4 — Scale & Ecosystem (ongoing)** ✅ MOSTLY COMPLETE
14. ✅ Streaming / chunked compression (2.3) — parallel batch processing done; full streaming API pending
15. ✅ Plugin architecture (2.4) — design ready; implementation pending
16. ✅ New profiles (CSV, JSONL, XML) (6) — implemented
17. ✅ GitHub Action (9.2) — design ready; separate repo required
18. ✅ Bundle split shiki into dynamic import (8.4) — implemented

**Remaining large projects** (require dedicated time/resources):
- VS Code extension (9.1) ~2 weeks
- GitHub Action marketplace publish (9.2) ~1 week  
- API server (9.4) ~1 week
- Sentence-level semantic similarity (3.1) ~2 weeks
- AST-aware code protection (3.2) ~2 weeks
- WASM tokenization (8.1) ~1 week
- Variable-name shortening (6) ~2 weeks

---

*End of plan.*
