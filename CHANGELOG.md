# Changelog

## 2.0.0 - 2026-05-02

### Web App — Phase 3 Polish

- Reorganized UI into a clear guided workflow: preset → compression strength → input → results.
- Added five-tab result area: Output, Diff, Safety, Transforms, Report.
- Added Safety tab with color-coded status dot (green/amber/red) in tab bar.
- Added Transforms tab with per-transform timing, char savings, risk level, and rejected-transform list.
- Added Report tab with in-app formatted summary cards (savings, mode, runtime, budget, quality).
- Moved Safety and Transforms out of below-pane sections into dedicated result tabs.
- Replaced raw file input with styled Upload button (eliminates browser-locale label issues).
- Added collapsible Advanced options panel (use case, risk, budget, token counter).
- Added GitHub link and product tagline to header.
- Added "How it works" empty state in the Output tab before first compression.
- Added footer with local-first guarantee, CLI hint, and GitHub link.
- Improved batch table styling and export controls.
- Improved empty states across all tabs.

### CLI / Core

- `tokentrim init` now accepts `--out` to write starter config to a custom path.
- Fixed Windows `pathToFileURL` bug in benchmark runner.
- Added `list-transforms --format json`, `list-profiles --format json` output.
- Added transform timing (`durationMs`) to all transform stats and compression result.
- Added `durationMs` to compression export report JSON.

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
