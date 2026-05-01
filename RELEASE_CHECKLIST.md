# v1.0.0 Release Checklist

## Quality gates
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] Manual browser smoke: paste -> compress -> review report -> copy/export -> decode/restore
- [ ] Manual batch smoke: multi-file load and per-file output/legend export

## Safety checks
- [ ] Reversible profiles show normalized-roundtrip validation
- [ ] Lossy profiles never claim reversibility
- [ ] Advanced lossy profile (`lossy-agent`) shows explicit one-way warning before copy
- [ ] Protected spans remain unchanged in representative samples

## Release prep
- [ ] Update README profile table if profile behavior changed
- [ ] Update CHANGELOG.md
- [ ] Tag release (`v1.0.0`)
- [ ] Confirm GitHub Pages deploy success
