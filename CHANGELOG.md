# Changelog

## 1.3.0 - 2026-05-02

- Added executable transform registry and registry-driven pipeline execution.
- Added profile system (`general`, `agent-context`, `repo-context`, `logs`, `markdown-docs`, `chat-history`) with profile-first transform ordering.
- Added tokenizer adapter layer and standardized token estimate metadata (`tokenizer`, `tokens`, `exact`).
- Added token budget optimizer (`optimizeToBudget`) with budget reached/not-reached result metadata.
- Added deterministic semantic safety validator with transform rejection and issue reporting.
- Added structured compression report export (`createCompressionReport`) for JSON workflows.
- Added new deterministic transforms:
  - section salience compression
  - log compression
  - markdown cleanup compression
- Upgraded CLI with `stdin`, `report`, recursive batch support, target token, tokenizer, profile, max risk, enabled transforms, dry-run, and report writing flags.
- Upgraded UI with tokenizer/profile/target/max-risk controls and safety/budget/rejection indicators.
- Fixed whitespace cleanup to preserve markdown structure by using horizontal-whitespace-only compaction.

## 1.0.0-rc.1 - 2026-05-02

- Initial mode-reset release to one-way Light/Normal/Heavy/Ultra(+custom) compression model.
