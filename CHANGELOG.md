# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-02

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
