# TokenTrim

TokenTrim is a local-first text compression tool for AI context packing.

It runs entirely client-side in the browser (or locally via CLI), has no telemetry, and no AI calls.

## Guarantees

TokenTrim now separates **reversible** and **lossy** profiles explicitly.

- Reversible profiles: validated roundtrip baseline.
- Lossy profiles: one-way semantic compression; never labeled lossless.

Validation kinds:
- `exact-roundtrip`
- `normalized-roundtrip`
- `semantic-baseline`
- `lossy-no-roundtrip`
- `none`

Normalized roundtrip means structural normalization only (line endings, trailing whitespace, repeated blank lines, spacing cleanup).

## Profiles

| Profile | Reversible | Guarantee | Risk | Notes |
|---|---:|---|---|---|
| `lossless-light` | yes | normalized-roundtrip | safe | structural cleanup only |
| `lossless-dict` | yes | normalized-roundtrip | low | dictionary tokens + legend |
| `lossy-prose` | no | semantic-lossy | medium | filler/article/prose rewrite |
| `lossy-agent` | no | semantic-lossy | high | abbreviations + operators |
| `docs-readme` | no | semantic-lossy | low | conservative docs rewriting |
| `codebase-context` | no | semantic-lossy | medium | code-aware abbreviation |
| `meeting-notes` | no | semantic-lossy | medium | filler cleanup |
| `research-notes` | no | semantic-lossy | low | conservative research notes |
| `spec` | no | semantic-lossy | low | very conservative |
| `chat-history` | no | semantic-lossy | medium | remove pleasantries |

## Protected Spans

Transforms do not run inside protected spans. Current engine protects:
- fenced code
- inline code
- URLs
- file paths
- CLI commands
- env vars
- API-like placeholders
- numbers + units
- JSON blocks
- YAML/TOML-like config
- markdown tables
- markdown headings
- emails
- quoted strings

## Browser usage

- Compress tab: choose profile, paste text, review metrics/report.
- Decode/Restore tab: paste compressed text + legend JSON.
- File upload:
  - single file loads editor
  - multi-file shows batch metrics table

## Decode/Restore

Decode/Restore only works for reversible modes with valid legends.
Lossy profiles are one-way by design.

## CLI

```bash
tokentrim compress file.md --profile lossy-agent
tokentrim compress file.md --profile lossless-dict --out file.trim.md --legend file.legend.json
tokentrim decompress file.trim.md --legend file.legend.json
tokentrim batch ./docs --profile docs-readme
```

## Library API

```ts
import { compress, decompress, estimateTokens, listProfiles } from './src/compression';
```

## Token estimates

Token counts are estimates unless using an exact tokenizer. Current default is `approx-generic`.

## Development

```bash
npm install
npm run dev
npm run build
npm run test
```

## Safety limitations

- Lossy modes may alter meaning.
- Reversible modes fail closed on validation failure and return original input.
- Malformed legends fail restore.

## Roadmap

- Add optional exact GPT-compatible tokenizer package.
- Expand profile-level custom rule editor.
- Add downloadable batch artifacts and zip export.
- Add virtualized large diff panel.
