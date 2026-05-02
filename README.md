# TokenTrim

TokenTrim compresses AI context locally using deterministic transforms, protected spans, and safety validation.

**Runs entirely in your browser or on your machine. No upload. No AI calls. No accounts. No telemetry.**

## Quick Start

1. Open the web app.
2. Choose what you're compressing — pick a preset: **Prompt / Agent**, **Logs**, **Repo Context**, **Markdown Docs**, **Chat History**, or **Generic**.
3. Paste text or upload files.
4. Review the Output, Diff, Safety, Transforms, and Report tabs.
5. Copy or download the compressed result.

## How It Works

TokenTrim applies a deterministic pipeline of text transforms:

1. **Protected spans** are extracted and locked — code blocks, URLs, file paths, numbers, env vars, JSON, YAML, tables, headings — and restored after all transforms.
2. **Transforms** run in profile-driven order at the selected compression strength. Each transform produces `charsSaved`, `replacements`, `durationMs`, and examples.
3. **Semantic safety validation** runs after each transform. If a transform causes negation loss, number loss, date loss, URL loss, or other semantic issues, it is **rejected and not applied** to the final output.
4. **Token budget** optimization: if a target is set, the pipeline runs repeatedly, escalating strength until the output fits.

## Current Architecture

- **Modes**: `light`, `normal`, `heavy`, `ultra`, `custom`
- **Profiles**: `general`, `agent-context`, `repo-context`, `logs`, `markdown-docs`, `chat-history`
- **Tokenizers**: `approx-generic`, `openai-cl100k`, `openai-o200k` — all **approximate** (counts shown with `~`)
- **Safety**: negations, requirements, numbers, dates, semver, URLs, paths, code identifiers
- **Result tabs**: Output · Diff · Safety · Transforms · Report

## Core API

```ts
import {
  compress,
  optimizeToBudget,
  estimateTokens,
  listModes,
  listProfiles,
  createCompressionReport,
} from 'tokentrim';

compress(text, { mode, profile, tokenizer, targetTokens, maxRisk, enabledTransforms });
optimizeToBudget(text, options);
estimateTokens(text, tokenizer);
createCompressionReport(result); // structured JSON export
```

## CLI

```bash
# Compress a file
tokentrim compress file.md --mode heavy --profile agent-context --out file.trim.md

# Target token budget
tokentrim compress file.md --target-tokens 8000 --out file.trim.md

# Batch compress a directory
tokentrim batch ./docs --recursive --out ./trimmed --profile markdown-docs

# Generate a local repo context pack
tokentrim repo ./ --out repo-context.trim.md
tokentrim repo ./src --mode heavy --out context.md

# Report only
tokentrim report file.md --mode normal --out report.json

# Read from stdin
cat file.md | tokentrim stdin --mode normal

# Create starter config
tokentrim init

# Discovery commands
tokentrim list-transforms
tokentrim list-transforms --format json
tokentrim list-profiles
tokentrim list-tokenizers
tokentrim list-modes
```

## CLI Flags

```
--mode              light|normal|heavy|ultra|custom
--profile           general|agent-context|repo-context|logs|markdown-docs|chat-history
--target-tokens <n> Stop when output is under this token count
--max-risk          safe|low|medium|high
--tokenizer         approx-generic|openai-cl100k|openai-o200k
--enabled-transforms id1,id2,...
--out <path>        Output file or directory
--report            Write .report.json alongside output
--recursive         Recurse into subdirectories (batch)
--dry-run           Simulate without writing files
--format json|text  Output format (list commands)
```

## Config File (`.tokentrimrc.json`)

Place in the directory where you run TokenTrim. CLI flags override config values.

```json
{
  "mode": "heavy",
  "profile": "agent-context",
  "tokenizer": "approx-generic",
  "maxRisk": "medium",
  "targetTokens": 12000,
  "enabledTransforms": ["markdown-cleanup", "section-salience"]
}
```

Supported filenames (checked in order): `.tokentrimrc`, `.tokentrimrc.json`, `tokentrim.config.json`

Create a starter config: `tokentrim init`

## Ignore File (`.tokentrimignore`)

Place in your project root. Patterns apply in `batch --recursive` and `repo` commands.

```
generated/
fixtures/
*.min.js
*.generated.ts
large-dataset.json
```

Default ignored: `node_modules`, `dist`, `build`, `.git`, `.github`, `coverage`, `.cache`, `.vite`, binary extensions, and lockfiles.

## Repo Context Pack

Generate an agent-ready Markdown context pack from a local directory:

```bash
tokentrim repo ./ --out repo-context.trim.md
tokentrim repo ./src --mode heavy --profile repo-context --out context.md
```

Output: summary metadata, file tree, and compressed source file contents. Respects `.tokentrimignore`. No network access.

## Browser Batch Export

Drop multiple files or use the file picker to process them together.

- **Download all** — concatenated text file
- **Summary JSON** — batch totals, settings, and per-file status
- Per-file **Output** and **Report** download buttons

## Safety Model

After each transform, TokenTrim validates for semantic integrity:

- Negations and requirement markers
- Numbers, dates, semver versions
- URLs and file paths
- Code identifiers (warning level)
- Protected span continuity

Unsafe transform outputs are **rejected and not applied**. Rejected transforms are recorded in the Safety and Transforms tabs and in the exported report JSON.

Some transforms declare scoped safety allowances (`allowedSafetyCategories`). For example, the log transform allows date/number loss because timestamp normalization is intentional.

## Approximate Token Counts

All tokenizers currently return **approximate** counts shown with `~`. Labels and the metrics bar use `~` to indicate estimates.

## Benchmarks

```bash
npm run build
npm run benchmark
npm run benchmark -- --format json
```

See `benchmarks/README.md` for fixture descriptions and output column reference.

## Development

```bash
npm install
npm run dev        # Vite dev server on port 5173
npm run build      # TypeScript + Vite + CLI bundle
npm run test       # Vitest
npm run lint       # ESLint
npm run typecheck  # tsc -b
npm run benchmark  # Benchmark runner (requires build)
```

## Local-First Guarantee

TokenTrim's default behavior is fully local:

- **Browser app**: all processing runs in your browser. No data leaves the page.
- **CLI**: all processing runs on your machine. No network calls are made.
- No accounts, no analytics, no telemetry.

## Roadmap

### Phase 4 (future, optional, external)

Phase 4 may add optional features that integrate external free services or local AI models. These are **not implemented** and will be clearly opt-in:

- **Jina Reader URL import** — paste a URL, fetch Markdown via the Jina Reader API
- **Public GitHub repo import** — import source files from a public GitHub URL
- **Hugging Face / Transformers.js semantic salience** — local embedding models running in the browser
- **WebLLM / local AI rewrite** — use local AI to rewrite or summarize sections before compression

The `dist/` directory is built by the GitHub Pages workflow. Do not commit it manually.
