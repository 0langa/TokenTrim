# TokenTrim

TokenTrim is a local-first context compression toolkit for AI workflows.

## Current Architecture

- Modes: `light`, `normal`, `heavy`, `ultra`, `custom`
- Profiles: `general`, `agent-context`, `repo-context`, `logs`, `markdown-docs`, `chat-history`
- Tokenizers:
  - `approx-generic` (always available)
  - `openai-cl100k` / `openai-o200k` adapter kinds with deterministic fallback when exact tokenizer is unavailable
- Features:
  - executable transform registry
  - semantic safety validation with per-transform rejection
  - target token budget optimization
  - structured JSON reporting
  - browser + CLI support

## Core API

```ts
compress(text, { mode, profile, tokenizer, targetTokens, maxRisk, enabledTransforms })
optimizeToBudget(text, options)
estimateTokens(text, tokenizer)
listModes()
listProfiles()
createCompressionReport(result)
```

## CLI examples

```bash
tokentrim compress file.md --mode heavy --profile agent-context --target-tokens 8000 --out file.trim.md
tokentrim batch ./docs --recursive --out ./trimmed --profile markdown-docs --report yes
tokentrim report file.md --mode normal --out report.json
tokentrim stdin --mode normal
```

Supported CLI flags:
- `--mode light|normal|heavy|ultra|custom`
- `--profile general|agent-context|repo-context|logs|markdown-docs|chat-history`
- `--target-tokens <n>`
- `--max-risk safe|low|medium|high`
- `--tokenizer approx-generic|openai-cl100k|openai-o200k`
- `--enabled-transforms id1,id2,...`
- `--out <path>`
- `--report <path or any truthy value in batch mode>`
- `--recursive`
- `--dry-run`

## Safety model

After each transform, TokenTrim validates semantic integrity for:
- negations and requirement markers
- numbers, dates, semver
- URLs and file paths
- code identifiers (warning level)
- protected span continuity

Unsafe transform outputs are rejected and recorded.

## Development

```bash
npm install
npm run build
npm run test
npm run lint
```
