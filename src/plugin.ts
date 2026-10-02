// Плагин opencode: открывает файл в панели tmux и отдаёт то, что пользователь
// выделил мышью.
//
// Инструменты:
//   doc_open(path)  — открыть панель на файле
//   doc_selection() — что сейчас выделено
//
// Экспорт обязан быть функцией, возвращающей объект хуков: экспорт объектом даёт
// «Plugin export is not a function», и плагин молча выбрасывается без следа в логах,
// кроме одной строки, которую надо уметь найти.

import { tool } from "@opencode-ai/plugin"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { resolvePaths } from "./paths.ts"

// CLI лежит рядом с плагином в том же каталоге src/, поэтому путь строится от
// import.meta, а не от чужой домашней директории.
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

      // Ровно два позиционных аргумента: путь к файлу и путь к файлу состояния.
      // Третий аргумент оболочка прочитала бы как путь к состоянию и записала бы
      // выделение не туда — такое уже случалось.
      const pane = spawnSync(
        "tmux",
        ["split-window", "-h", "-p", "60", "-P", "-F", "#{pane_id}", `bun run ${CLI} ${target} ${state}`],
        { encoding: "utf8" },
      )
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