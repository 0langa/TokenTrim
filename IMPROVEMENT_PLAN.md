# TokenTrim Improvement Plan

> Generated from codebase audit on 2026-05-04. Covers core engine, CLI, web UI, distribution, and ecosystem.

---

## 1. Distribution & Packaging (High Impact, Low Effort)

| # | Improvement | Motivation |
|---|-------------|------------|
| 1.1 | **Publish to npm** — remove `"private": true`, set up scoped or public registry publish, add provenance | The CLI is fully functional but unusable via `npm install -g tokentrim` as advertised in README. |
| 1.2 | **GitHub Release automation** — add workflow that tags, builds, publishes to npm, and attaches standalone binaries (via `esbuild` or `pkg`) | Enables users without Node.js to use the CLI. |
| 1.3 | **Add `engines` and `exports` fields to `package.json`** | Explicit Node version support; allow `import { compress } from 'tokentrim'` from ESM/CJS consumers. |

---

## 2. Core Compression Engine (High Impact, Medium Effort)

### 2.1 Exact Tokenizers
- **Problem:** `openai-cl100k` and `openai-o200k` fall back to `approxGenericEstimate` with `exact: false`.
- **Fix:** Integrate `js-tiktoken` (WASM-free, ~1 MB) as an optional dependency. Keep `approx-generic` as the zero-dependency default, but provide *exact* counts when the package is available.
- **Impact:** Budget optimizer and metrics become accurate for OpenAI models.

### 2.2 Smarter Budget Optimizer
- **Problem:** `optimizeToBudget` brute-forces `light → normal → heavy → ultra` and stops at first match. It does not learn from input characteristics.
- **Fixes:**
  - **Heuristic short-circuit:** Estimate achievable savings from a quick scan (code density, markdown ratio, log repetition). Jump directly to the most likely mode.
  - **Binary search variant:** For very large inputs, try `normal` first; if still over budget, jump to `ultra`; if under, try `heavy`.
  - **Custom transform pruning:** In `custom` mode with target tokens, auto-disable the lowest-ROI transforms iteratively.

### 2.3 Streaming / Chunked Compression
- **Problem:** The entire input is processed in one synchronous pass. Large files (>10 MB logs) block the worker/main thread.
- **Fix:** Add `compressStream(chunks, options)` API that:
  1. Compresses chunks independently.
  2. Carries deduplication state across chunks (for log compression).
  3. Yields `{ chunkIndex, output, metrics }` progressively.
- **CLI impact:** `batch` and `repo` commands can process files in parallel with `Promise.all` or `worker_threads`.

### 2.4 Plugin Architecture for Custom Transforms
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

---

## 3. Safety & Semantic Validation (High Impact, Medium Effort)

| # | Improvement | Detail |
|---|-------------|--------|
| 3.1 | **Sentence-level semantic similarity** | Before/after comparison using a lightweight embeddings model (e.g., `fastText` or `transformers.js` in the browser) to ensure rewritten sentences preserve meaning. Reject transforms that drop cosine similarity below a threshold. |
| 3.2 | **AST-aware code protection** | For `repo-context`, parse JS/TS/Python with a lightweight parser. Protect function signatures, import statements, and exported names beyond regex-based `file-path` spans. |
| 3.3 | **Configurable safety rules** | Allow `.tokentrimrc.json` to add custom `protectPatterns` (regexes) and `requiredPhrases` (strings that must survive compression). |
| 3.4 | **Fuzz testing** | Generate random markdown/code/log inputs and assert that safety invariants never fail (no URL loss, no negation loss, etc.). |

---

## 4. CLI Enhancements (Medium Impact, Low Effort)

| # | Improvement | Detail |
|---|-------------|--------|
| 4.1 | **Watch mode** | `tokentrim compress file.md --watch --out file.trim.md` re-compresses on file change. |
| 4.2 | **Git integration** | `tokentrim diff --staged` compresses the git diff before sending to an LLM. `tokentrim repo` could accept `--since-ref HEAD~5` to only pack changed files. |
| 4.3 | **Diff output** | `--format diff` prints a unified diff (before/after) instead of the compressed text. Useful for CI review. |
| 4.4 | **Parallel batch processing** | Use `worker_threads` or `p-limit` in `batch --recursive` to saturate CPU cores. |
| 4.5 | **Progress bars** | For large `batch` / `repo` runs, show a `cli-progress` bar instead of per-file lines. |
| 4.6 | **Shell completions** | Generate `bash`/`zsh`/`fish` completions for commands and flags. |

---

## 5. Web UI Enhancements (Medium Impact, Medium Effort)

| # | Improvement | Detail |
|---|-------------|--------|
| 5.1 | **Side-by-side diff view** | Replace or augment the current tab-based diff with a split-pane Monaco/CodeMirror diff editor (synchronized scrolling, inline highlights). |
| 5.2 | **Syntax highlighting** | Highlight fenced code blocks in Output tab and diff view using `shiki` or `highlight.js`. |
| 5.3 | **Shareable URLs** | Serialize `mode`, `profile`, `input` (hashed or base64’d) into query params so users can share reproduction links. |
| 5.4 | **Compression history** | Store last N results in `localStorage` with timestamps; allow reverting to a previous run. |
| 5.5 | **Theme toggle** | Light/dark/system mode (Tailwind supports this easily). |
| 5.6 | **Drag-and-drop folder support** | Currently only `FileList` from `<input type="file">`; enable dropping a directory via the File System Access API (with fallback). |
| 5.7 | **Large file handling** | Warn when input >1 MB; offer to compress in worker chunks with a progress indicator. |

---

## 6. New Profiles & Transforms (Medium Impact, Low Effort)

| Profile / Transform | Use Case |
|---------------------|----------|
| **CSV / TSV profile** | Collapse repeated cells, normalize whitespace in data tables. |
| **JSONL / NDJSON profile** | Minify each line independently; deduplicate keys. |
| **XML / HTML profile** | Collapse attributes, remove comments, normalize entities. |
| **Scientific paper profile** | Preserve citations `[1]`, compress methodology boilerplate. |
| **Latex profile** | Preserve math mode `$...$`, compress text mode. |
| **Smart list transformer** | Convert `1. \n 2. \n 3.` into `1, 2, 3` when items are short. |
| **Variable-name shortening** | In `repo-context` with `ultra`, replace long local variable names with short ones (requires AST parsing + scope analysis). |

---

## 7. Testing & Quality (High Impact, Low Effort)

| # | Improvement | Detail |
|---|-------------|--------|
| 7.1 | **CLI integration tests** | Spawn the built `dist/cli.js` in temporary directories to test `init`, `compress`, `batch`, `repo`, and config merging end-to-end. |
| 7.2 | **Benchmark regression gate** | In CI, run benchmarks on fixtures and fail if savings % drops by >2 % or runtime increases by >20 % vs. baseline stored in repo. |
| 7.3 | **Coverage reporting** | Add `@vitest/coverage-v8` and enforce thresholds (e.g., 80 % for `src/compression`). |
| 7.4 | **Property-based tests** | Use `fast-check` to generate arbitrary strings and assert safety invariants hold for all inputs. |

---

## 8. Performance & Architecture (Medium Impact, Medium Effort)

| # | Improvement | Detail |
|---|-------------|--------|
| 8.1 | **WASM acceleration for tokenization** | If `js-tiktoken` or similar is adopted, token counting becomes exact and fast even for MB-scale inputs. |
| 8.2 | **Lazy transform evaluation** | If a transform saves 0 chars on the first 1,000 chars sampled, skip it for the rest of the file. |
| 8.3 | **Memory optimization** | `protectSpans` creates large placeholder maps. For files >1 MB, use a streaming span extractor that emits `{ start, end, type }` tuples without building intermediate strings. |
| 8.4 | **Bundle splitting** | The web app currently bundles all transforms into the main chunk. Split each transform into a dynamic import so the initial load is <50 KB. |

---

## 9. Ecosystem & Integrations (High Impact, High Effort)

| # | Integration | Value Proposition |
|---|-------------|-------------------|
| 9.1 | **VS Code extension** | Command palette: "TokenTrim: Compress selection/file". Shows inline diff. Uses the same `tokentrim` npm package under the hood. |
| 9.2 | **GitHub Action** | `uses: julius/tokentrim-action@v1` — compresses README or issue templates before passing to downstream LLM workflows. |
| 9.3 | **Pre-commit hook** | `tokentrim --check` fails if a tracked file exceeds a token budget (enforces context-window hygiene). |
| 9.4 | **API server** | A tiny `hono` or `express` server wrapping `compress()` so non-JS consumers can call it over HTTP. |

---

## 10. Documentation & Community (Low Effort, High Long-term Impact)

| # | Task | Detail |
|---|------|--------|
| 10.1 | **Architecture Decision Records (ADRs)** | Document why regex over ML, why worker-based UI, why approximate tokenizers by default. |
| 10.2 | **Contributing guide** | `CONTRIBUTING.md` with transform authoring tutorial, test patterns, and benchmark update process. |
| 10.3 | **API docs site** | Auto-generated from TSDoc comments (e.g., `typedoc`) deployed alongside the GitHub Pages app. |
| 10.4 | **Transform playground** | In the web app, allow users to type a regex + replacement and see live results on their input — lowers the barrier to community-contributed transforms. |

---

## Recommended Priority Order

**Phase 1 — Unlock Usage (1–2 weeks)**
1. Publish to npm (1.1)
2. Add `exports` / `engines` to `package.json` (1.3)
3. CLI integration tests (7.1)
4. Coverage reporting (7.3)

**Phase 2 — Core Quality (2–4 weeks)**
5. Exact tokenizer via optional `js-tiktoken` (2.1)
6. Smarter budget optimizer (2.2)
7. Configurable safety rules (3.3)
8. Fuzz testing (3.4)

**Phase 3 — Developer Experience (2–3 weeks)**
9. Side-by-side diff + syntax highlighting (5.1, 5.2)
10. Watch mode + git integration (4.1, 4.2)
11. Shareable URLs (5.3)
12. VS Code extension PoC (9.1)

**Phase 4 — Scale & Ecosystem (ongoing)**
13. Streaming / chunked compression (2.3)
14. Plugin architecture (2.4)
15. New profiles (CSV, JSONL, LaTeX) (6)
16. GitHub Action (9.2)

---

*End of plan.*
