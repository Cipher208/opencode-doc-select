# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Ported to the OpenCode v2 plugin API.** The export is now
  `Plugin.define({ id, setup })` with tools registered through
  `ctx.tool.transform(editor => editor.add(...))`; the V1 form was a function
  returning a hooks object, which v2 rejects with
  `Plugin must export a default definition with an id and an effect or setup
  function`.
- `peerDependencies` moved from `@opencode-ai/plugin` to `@opencode/plugin`
  (`>=2.2.7`).
- Tool argument schemas are plain JSON Schema instead of the zod `tool.schema`
  helper, and `execute` returns `{ content }` rather than a bare string.
- README documents both export shapes, the `plugins` (plural) config key, and
  the v2 restart requirement.

### Added

- Defensive returns for a missing `path` argument and a corrupt state file; both
  previously threw.

## [0.1.0] - 2026-10-02

- Published as `@cipher208/opencode-doc-select`. The package is scoped: npm's
  granular tokens can only be granted for scopes or existing packages, and a
  scoped name is protected from being claimed by someone else later.

### Added

- `doc_open` opens a file in a tmux pane with a line-number gutter.
- `doc_selection` returns the exact text the user dragged over, with file, line
  range and character count.
- SGR (1006) mouse tracking, so line and column are reported instead of byte
  offsets.
- Viewport rendering with page and line scrolling, and a status bar showing the
  current range and total line count.
- `resolvePaths` for XDG-based state and config location, with empty strings
  returned when neither `$HOME` nor the XDG variables are set, so callers report
  the problem instead of writing somewhere unexpected.
- Both plugin export shapes (`DocSelect` and `default`) as functions.
- 21 tests and a typecheck gate proven to fail on an injected error.

### Security

- Shell-quoting of every value interpolated into the tmux command. Paths are
  single-quoted via `shQuote`, so a filename containing shell metacharacters can
  no longer execute a second command. The previous behaviour was confirmed by an
  end-to-end test before the fix and refuted after it.
