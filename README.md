# opencode-doc-select

Read back the text the user selected with the mouse, inside an OpenCode session.

The user asks the agent to open a file. Instead of the agent printing the file
back as text, it opens the file in a tmux pane with line numbers. The user drags
over the lines they care about, releases the mouse, and the agent reads exactly
that text with `doc_selection` — no copy-paste, no re-reading of the whole file.

```
agent: doc_open("src/server.ts")
  → pane %17, raw text with line numbers

user: drags with the mouse over lines 40–46, releases

agent: doc_selection()
  → {"file":"src/server.ts","startLine":40,"endLine":46,"chars":214,"text":"..."}
```

## Install

```bash
opencode plugin add opencode-doc-select
```

or add it to `plugin` in `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["opencode-doc-select"]
}
```

Restart OpenCode afterwards — plugins are loaded at startup.

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