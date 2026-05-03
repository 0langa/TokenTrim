# TokenTrim Benchmarks

Requires `npm run build` first.

```bash
npm run benchmark
npm run benchmark -- --format json
```

## Fixtures

| File | Profile |
|---|---|
| `agent-context.md` | agent-context |
| `markdown-doc.md` | markdown-docs |
| `build-log.txt` | logs |
| `chat-history.md` | chat-history |
| `repo-context.md` | repo-context |

## Output columns

`fixture` · `mode` · `profile` · `chars in/out` · `tokens in/out` · `char%` · `tok%` · `ms` · `issues` · `rejected`

Token counts are approximate. `issues` and `rejected` indicate safety activity, not failures.
