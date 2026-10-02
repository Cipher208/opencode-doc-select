# Contributing

Thanks for looking. Small, focused pull requests are easier to review than large
ones.

## Development

```bash
bun install
bun test
bun run typecheck
```

Both gates must pass. There is no `|| echo "skipped"` anywhere in this repository
and there should never be one — a check that cannot fail is worse than no check.

## Two contracts that are easy to get wrong

**A plugin's export must be a function that returns the hooks object.**

```ts
export const DocSelect = async () => ({ tool: { doc_open, doc_selection } })
export default DocSelect
```

Exporting a bare object produces `Plugin export is not a function`, and the
plugin is dropped silently. If tools you added never appear, that is the first
thing to check — grep the log for `failed to load plugin`.

**Tests must import the real module.** An earlier version of a sibling project
had a suite that re-declared the hook's functions as copies; the hook could be
deleted entirely and every test would still pass. If you write a helper for a
test, it belongs in the source module or nowhere.

## Style

- Comments in English.
- No path hardcoded to a developer's home directory; use `resolvePaths`.
- Keep the pure logic in `src/doc-select-core.ts` free of I/O so it stays testable.

## Pull requests

1. Branch from `master`.
2. Make sure `bun test` and `bun run typecheck` pass locally.
3. Describe what was verified, not just what changed. A statement about how
   something behaves needs the measurement that supports it.

## Releasing

Releases are published to npm by GitHub Actions through OIDC — there is no npm
token anywhere in this repository or in repository secrets. npm hands the
workflow a short-lived credential derived from the workflow's identity.

For a maintainer publishing a release:

```bash
# 1. bump the version and add a CHANGELOG entry, commit
# 2. tag and push
git tag v0.1.0 && git push origin master --tags
# 3. create the release from the tag — the workflow runs on release: published
```

The workflow refuses to publish when the tag disagrees with `package.json`, and
runs the tests and the typecheck first.
