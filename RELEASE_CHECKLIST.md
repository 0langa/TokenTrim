# v1.3.0 Release Checklist

## Validation Gates
- [ ] `npm run build`
- [ ] `npm run test`
- [ ] `npm run lint`

## Safety Verification
- [ ] Protected spans remain unchanged in representative samples
- [ ] Semantic safety issues are detected and surfaced
- [ ] Unsafe transforms are rejected and recorded in result metadata
- [ ] Markdown paragraphs/lists/code fences are preserved

## Feature Verification
- [ ] Mode + profile + tokenizer controls work in UI
- [ ] Target token budget signals reached/not reached
- [ ] CLI `compress`, `batch`, `report`, and `stdin` commands work
- [ ] Batch recursive output writing works with `--out`
- [ ] JSON report export includes transforms, safety issues, rejected transforms, and tokenizer metadata

## Release Prep
- [ ] README/API examples reflect current CLI/options
- [ ] CHANGELOG updated
- [ ] Tag release (`v1.3.0`)
- [ ] Confirm deployment workflow success
