# Benchmark Corpus Notes

TokenTrim expected token-savings ranges are calibrated against lightweight representative text blocks:

1. Prompt briefs with verbose instructions
2. README/setup docs with markdown structure
3. Engineering context and issue/spec snippets
4. Meeting notes with dates, owners, and constraints

Method:
- Run each profile on corpus examples
- Compare `estimatedTokensBefore` vs `estimatedTokensAfter`
- Use percentile banding to set displayed profile ranges

Current ranges are conservative estimates meant for guidance, not strict guarantees.
