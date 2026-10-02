// OpenCode plugin: opens a file in a tmux pane and hands back exactly what the
// user selected with the mouse.
//
// Tools:
//   doc_open(path)  - open a pane on a file
//   doc_selection() - what is selected right now
//
// The export must be a function returning the hooks object: exporting a bare object
// yields "Plugin export is not a function" and the plugin is dropped silently, with
// a single log line left to find.

import { tool } from "@opencode-ai/plugin"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { resolvePaths } from "./paths.ts"
import { shQuote } from "./shell.ts"

// The CLI sits next to the plugin in the same src/ directory, so the path is built
// from import.meta rather than from somebody's home directory.
const CLI = join(dirname(fileURLToPath(import.meta.url)), "doc-select-cli.ts")

export const DocSelect = async () => {
  const docOpen = tool({
    description:
      "Open a file in a tmux pane for reading. The user selects text with the mouse and the selection can then be read with doc_selection.",
    args: {
      path: tool.schema.string().describe("File to open"),
    },
    async execute(args: { path: string }) {
      const target = resolve(args.path)
      if (!existsSync(target)) return JSON.stringify({ success: false, error: `нет файла: ${target}` })
      if (!process.env.TMUX) return JSON.stringify({ success: false, error: "нужен tmux" })
      if (!existsSync(CLI)) return JSON.stringify({ success: false, error: `не найден CLI: ${CLI}` })

      const state = resolvePaths().state
      if (!state) {
        return JSON.stringify({ success: false, error: "не удалось определить путь к состоянию: задайте XDG_STATE_HOME или HOME" })
      }

      // Exactly two positional arguments: the file path and the state file path.
      // A third argument would be read as the state path and the selection would be
      // written to the wrong file - which already happened once.
      //
      // All three values are quoted: tmux runs the string through sh, and a path
      // containing a semicolon would otherwise become a second command. Confirmed
      // end to end before the quoting was added.
      const command = `bun run ${shQuote(CLI)} ${shQuote(target)} ${shQuote(state)}`
      const pane = spawnSync("tmux", ["split-window", "-h", "-p", "60", "-P", "-F", "#{pane_id}", command], {
        encoding: "utf8",
      })
      if (pane.status !== 0) return JSON.stringify({ success: false, error: pane.stderr?.trim() || "tmux не ответил" })
      return JSON.stringify({ success: true, pane: pane.stdout.trim(), path: target })
    },
  })

  const docSelection = tool({
    description:
      "Read the text the user selected by dragging in the doc-select pane. Returns file, line range and the text itself.",
    args: {},
    async execute() {
      const state = resolvePaths().state
      if (!state || !existsSync(state)) {
        return JSON.stringify({ success: false, error: "выделений ещё не было" })
      }
      const data = JSON.parse(readFileSync(state, "utf8")) as {
        file: string
        startLine: number
        endLine: number
        text: string
        at: string
      }
      return JSON.stringify({ success: true, ...data, chars: data.text.length })
    },
  })

  return { tool: { doc_open: docOpen, doc_selection: docSelection } }
}

export default DocSelect