# opencode-doc-select

> Your agent re-reads whole files because you cannot hand it a fragment.
> Drag across the lines you mean in a tmux pane, release, and the agent gets
> exactly those lines — no copy-paste, no re-reading, no guessing.

[![CI](https://github.com/Cipher208/opencode-doc-select/actions/workflows/ci.yml/badge.svg)](https://github.com/Cipher208/opencode-doc-select/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue.svg)](tsconfig.json)

```
agent: doc_open("src/server.ts")
  → pane, raw text with line numbers

user: drags over lines 40–46, releases

agent: doc_selection()
  → {"file":"src/server.ts","startLine":40,"endLine":46,"chars":214,"text":"..."}
```

## Quick Start

Copy the five files from `src/` into `~/.config/opencode/plugins/` (see
[Install](#install)), then add one line to `~/.config/opencode/opencode.json`:

```json
{ "plugin": ["opencode-doc-select"] }
```

Restart OpenCode, ask the agent to open a file, drag over what you mean, release.
Requires `tmux` and `bun` on `PATH`.

## Features

- **Exact fragments.** Line range and text, not the file. Character count included.
- **Line numbers in the pane**, so a selection reads as a citation.
- **Shell-safe paths.** A filename containing `;`, `$` or a backtick is quoted
  before it reaches tmux — see [SECURITY.md](SECURITY.md).
- **No hardcoded paths.** State follows `XDG_STATE_HOME`, with a `$HOME` fallback.
- **Two export shapes**, because neighbouring plugins differ and "the other one
  works" is not evidence.

## Writing a plugin like this

Two contracts that are not in the OpenCode documentation, both learned the hard way:

- A plugin's export must be a **function** returning the hooks object. A bare object
  fails with `Plugin export is not a function` and the plugin is dropped silently.
- An **empty log proves nothing**. A hook gated on a size threshold logs nothing when
  output is small, so "loaded fine", "never loaded" and "loaded but never triggered"
  look identical.

## Install

**Not yet on npm.** Until it is, install from the repository:

```bash
git clone https://github.com/Cipher208/opencode-doc-select
cp opencode-doc-select/src/plugin.ts ~/.config/opencode/plugins/doc-select.ts
cp opencode-doc-select/src/doc-select-cli.ts opencode-doc-select/src/doc-select-core.ts \
   opencode-doc-select/src/paths.ts opencode-doc-select/src/shell.ts \
   ~/.config/opencode/plugins/
```

The plugin locates its CLI relative to its own file, so all five files must sit
in the same directory.

### Manual install

Copy `src/plugin.ts` into `~/.config/opencode/plugins/doc-select.ts` and keep
`src/doc-select-cli.ts` and `src/doc-select-core.ts` next to it. The plugin finds
the CLI relative to its own location, so no path configuration is needed.

## Requirements

- `tmux` on `PATH`, and the agent process running inside it (`$TMUX` set)
- `bun` on `PATH` — OpenCode already runs on it, and the pane script is launched
  with `bun run`

## Tools

| Tool | Arguments | Returns |
|---|---|---|
| `doc_open` | `path` | `pane` id and resolved path, or an error |
| `doc_selection` | — | `file`, `startLine`, `endLine`, `text`, `chars`, `at` |

`doc_selection` returns `{"success": false, "error": "выделений ещё не было"}`
until the user has actually selected something.

## In the pane

| Key | Action |
|---|---|
| drag | select |
| `PgUp` / `PgDn` | page scroll |
| arrows | line scroll |
| `q`, `Esc`, `Ctrl-C` | quit |

The selection is highlighted in reverse video. The status bar shows the current
line range and the total line count.

## Paths

State lives in `${XDG_STATE_HOME:-~/.local/state}/opencode/doc-select.json`.
Nothing is hardcoded to a specific home directory. If neither `$HOME` nor the XDG
variables are set, `doc_open` fails with an explicit error instead of writing
somewhere unexpected.

## Writing a plugin like this: two contracts that are not in the docs

**1. A plugin's export must be a function that returns the hooks object.**

```ts
export const DocSelect = async () => ({ tool: { doc_open, doc_selection } })
export default DocSelect
```

Exporting a bare object fails with `Plugin export is not a function`, and the
plugin is **silently dropped** — every tool it was supposed to provide just never
appears. The only trace is one line in `~/.local/share/opencode/log/opencode.log`:

```
level=ERROR message="failed to load plugin" path=file://... error="Plugin export is not a function"
```

Note that neighbouring plugins in the same directory may use different export
shapes, so "the other one works" is not evidence that yours will.

**2. An empty log does not mean the plugin is fine.**

A hook that only fires above a size threshold produces no log entry when the
output is small. "No log" can mean "loaded fine" or "never loaded" or "loaded but
never triggered". Check for the export-shape error line explicitly, and test with
an input that actually crosses the threshold.

## Limitations

- Mouse events only. No keyboard selection.
- The mouse wheel is parsed and ignored; there is no wheel scrolling yet.
- ANSI-styled source is shown raw, so escape sequences appear as literal text.
- The selection is whatever the pane rendered; text below the visible window is
  not selectable until scrolled to.
- `doc_selection` returns the last selection only. There is no history.

## Development

```bash
bun install
bun test        # 21 tests: SGR parsing, selection extraction, viewport, path resolution
bun run typecheck
```

Tests import the real modules. An earlier version of a sibling hook project had
tests that re-declared the hook's functions as copies — the hook could be deleted
entirely and the suite stayed green. Do not do that.

## License

MIT