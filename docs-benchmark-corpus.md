# Benchmark Corpus Notes (Current)

TokenTrim uses representative corpora to monitor mode/profile token-savings behavior and safety regressions.

Corpus categories:
1. prompt/instruction briefs
2. markdown docs + README sections
3. chat history blocks
4. repository context snippets
5. application logs

Measurement method:
- run `compress()` across modes/profiles
- compare `estimatedTokensBefore` vs `estimatedTokensAfter`
- inspect safety issues and rejected transforms for false positives/negatives

Important:
- tokenizer estimates may be approximate (`exact: false`) depending on selected tokenizer adapter availability.
- benchmark comparisons are relative performance/safety indicators, not contractual guarantees.
