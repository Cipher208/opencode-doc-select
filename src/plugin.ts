// OpenCode plugin: opens a file in a tmux pane and hands back exactly what the
// user selected with the mouse.
//
// Tools:
//   doc_open(path)  - open a pane on a file
//   doc_selection() - what is selected right now
//
// ---------------------------------------------------------------------------
// V1 -> V2 mapping (opencode v2.x)
// ---------------------------------------------------------------------------
// - `export const DocSelect = async () => ({ tool: { ... } })` plus the V1
//   `tool()` helper
//       -> `Plugin.define({ id, setup })` plus
//          `ctx.tool.transform(editor => editor.add({ ... }))`.
//   V1 demanded a *function* export ("Plugin export is not a function" and the
//   plugin was dropped silently). V2 demands the definition object returned by
//   `Plugin.define`. A V1-shaped file still loads without a "Plugin export is
//   not a function" line, but the loader rejects it with "Plugin must export a
//   default definition with an id and an effect or setup function" and
//   `opencode plugin list` shows `ID = -`.
// - `tool.schema.string().describe("File to open")` (zod)
//       -> plain JSON Schema on `input`, with `required` and
//          `additionalProperties: false`. Same argument name, same description.
// - `execute(args)` returning a bare JSON string
//       -> `execute(input)` returning `{ content }`.
// - `directory` / `project` / `client` / `options`: this plugin never used them,
//   so there is nothing to remap.
// - No `event`, `dispose`, permission, session, shell or compaction hooks in V1,
//   so no `ctx.event.subscribe` and no cleanup function is needed; `setup`
//   returns nothing.
// - `import.meta.url` (CLI location) and `resolvePaths()` are host-independent
//   and unchanged, as are the tmux command, the `bun run` invocation, the state
//   file path and the JSON shapes of both tools.
// - `@opencode-ai/plugin` (V1 package) -> `@opencode/plugin` (V2 package, which
//   opencode serves from its own installation at runtime; the devDependency is
//   only there for `tsc --noEmit`).
//
// Diagnostics are appended to /tmp/doc-select-v2.log: setup, every tool
// invocation and every error. An empty log proves nothing — see README.
//
// Deliberate refinements over V1, both on paths that used to throw:
// - a missing `path` argument returns a JSON error instead of a TypeError;
// - an unreadable/corrupt state file returns a JSON error instead of a
//   SyntaxError escaping out of the tool call.

import { Plugin } from "@opencode/plugin"
import { appendFileSync, existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { resolvePaths } from "./paths.ts"
import { shQuote } from "./shell.ts"

const LOG_FILE = "/tmp/doc-select-v2.log"

function log(message: string): void {
  try {
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${message}\n`)
  } catch {}
}

function fail(error: string): { content: string } {
  return { content: JSON.stringify({ success: false, error }) }
}

// The CLI sits next to the plugin in the same src/ directory, so the path is built
// from import.meta rather than from somebody's home directory.
const CLI = join(dirname(fileURLToPath(import.meta.url)), "doc-select-cli.ts")

export const DocSelect = Plugin.define({
  id: "doc-select",
  async setup(ctx) {
    log(`setup start: CLI=${CLI}`)

    await ctx.tool.transform((editor) => {
      editor.add({
        name: "doc_open",
        description:
          "Open a file in a tmux pane for reading. The user selects text with the mouse and the selection can then be read with doc_selection.",
        input: {
          type: "object",
          properties: {
            path: { type: "string", description: "File to open" },
          },
          required: ["path"],
          additionalProperties: false,
        },
        async execute(input) {
          try {
            const arg = (input as { path?: unknown } | undefined)?.path
            if (typeof arg !== "string" || !arg) {
              log("doc_open: missing path argument")
              return fail("нужен путь к файлу")
            }

            const target = resolve(arg)
            if (!existsSync(target)) {
              log(`doc_open: no file ${target}`)
              return fail(`нет файла: ${target}`)
            }
            if (!process.env.TMUX) {
              log("doc_open: TMUX is not set")
              return fail("нужен tmux")
            }
            if (!existsSync(CLI)) {
              log(`doc_open: CLI not found ${CLI}`)
              return fail(`не найден CLI: ${CLI}`)
            }

            const state = resolvePaths().state
            if (!state) {
              log("doc_open: state path unresolved")
              return fail(
                "не удалось определить путь к состоянию: задайте XDG_STATE_HOME или HOME",
              )
            }

            // Exactly two positional arguments: the file path and the state file path.
            // A third argument would be read as the state path and the selection would be
            // written to the wrong file - which already happened once.
            //
            // All three values are quoted: tmux runs the string through sh, and a path
            // containing a semicolon would otherwise become a second command. Confirmed
            // end to end before the quoting was added.
            const command = `bun run ${shQuote(CLI)} ${shQuote(target)} ${shQuote(state)}`
            const pane = spawnSync(
              "tmux",
              ["split-window", "-h", "-p", "60", "-P", "-F", "#{pane_id}", command],
              { encoding: "utf8" },
            )
            if (pane.status !== 0) {
              const error = pane.stderr?.trim() || "tmux не ответил"
              log(`doc_open: tmux failed status=${pane.status} error=${error}`)
              return fail(error)
            }
            const paneId = pane.stdout.trim()
            log(`doc_open: ok path=${target} pane=${paneId} state=${state}`)
            return { content: JSON.stringify({ success: true, pane: paneId, path: target }) }
          } catch (e) {
            log(`doc_open threw: ${String(e)}`)
            return fail(String(e))
          }
        },
      })

      editor.add({
        name: "doc_selection",
        description:
          "Read the text the user selected by dragging in the doc-select pane. Returns file, line range and the text itself.",
        input: { type: "object", properties: {}, required: [], additionalProperties: false },
        async execute() {
          try {
            const state = resolvePaths().state
            if (!state || !existsSync(state)) {
              log("doc_selection: no state file yet")
              return fail("выделений ещё не было")
            }
            const data = JSON.parse(readFileSync(state, "utf8")) as {
              file: string
              startLine: number
              endLine: number
              text: string
              at: string
            }
            log(
              `doc_selection: ok file=${data.file} lines=${data.startLine}-${data.endLine} chars=${data.text.length}`,
            )
            return {
              content: JSON.stringify({ success: true, ...data, chars: data.text.length }),
            }
          } catch (e) {
            log(`doc_selection threw: ${String(e)}`)
            return fail(String(e))
          }
        },
      })
    })

    log("setup complete: doc_open + doc_selection registered via tool.transform")
  },
})

export default DocSelect
