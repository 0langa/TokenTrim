# Benchmark Corpus

Five categories: prompt/instruction briefs, markdown docs, chat history, repo context, application logs.

Measurement: run `compress()` across modes/profiles, compare `estimatedTokensBefore` vs `estimatedTokensAfter`, inspect safety issues and rejected transforms for regressions.

Token counts may be approximate (`exact: false`). Results are relative indicators, not guarantees.
