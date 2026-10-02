// Панель выделения: показывает файл с номерами строк, ловит перетаскивание мышью
// и при отпускании кнопки отдаёт выделенный текст в файл состояния.
//
// Запуск:  bun run src/doc-select-cli.ts <файл> [состояние]
// Мышь включается в режиме SGR (1006) — обычный режим не отдаёт номера строк и колонок.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { extractSelection, formatViewport, parseSgr, type Point, type Span } from "./doc-select-core.ts"
import { resolvePaths } from "./paths.ts"

const [file, stateArg] = process.argv.slice(2)
if (!file) {
  console.error("нужен путь к файлу")
  process.exit(2)
}
const state = stateArg || resolvePaths().state
if (!state) {
  console.error("не удалось определить путь к файлу состояния: задайте его аргументом или XDG_STATE_HOME")
  process.exit(2)
}

const lines = readFileSync(file, "utf8").split("\n")
const cols = process.stdout.columns || 80
const rows = Math.max(1, (process.stdout.rows || 24) - 1)

const numWidth = String(lines.length).length
const GUTTER = numWidth + 3

let top = 1
let anchor: Point | null = null
let cursor: Point | null = null
let dragging = false
let message = ""

function clampTop(value: number): number {
  return Math.min(Math.max(1, value), Math.max(1, lines.length - rows + 1))
}

function toLineCol(x: number, y: number): Point {
  return { line: clampTop(top) + y - 1, col: Math.max(1, x - GUTTER + 1) }
}

function render(): void {
  const span: Span | null = anchor && cursor ? { from: anchor, to: cursor } : null
  const body = formatViewport(lines, clampTop(top), rows, cols, span)
  const bar = ` ${anchor && cursor ? `${Math.min(anchor.line, cursor.line)}-${Math.max(anchor.line, cursor.line)}` : "—"}  ${lines.length} строк  q — выход, PgUp/PgDn — прокрутка `
  const clear = "\x1b[H\x1b[2J"
  process.stdout.write(clear + body.map((l, i) => `\x1b[${i + 1};1H` + l).join("") + `\x1b[${rows + 1};1H` + bar)
}

function publish(): void {
  if (!anchor || !cursor) return
  const sel = extractSelection(lines.join("\n"), anchor, cursor)
  try {
    mkdirSync(dirname(state), { recursive: true })
    writeFileSync(state, JSON.stringify({ file, ...sel, at: new Date().toISOString() }))
    message = "выделение сохранено"
  } catch (error) {
    message = `не сохранить: ${(error as Error).message}`
  }
}

function renderAll(): void {
  render()
  if (message) {
    process.stdout.write(`\x1b[${rows + 1};1H` + `\x1b[7m${message.slice(0, cols)}\x1b[27m`)
  }
}

render()

try {
  process.stdin.setRawMode?.(true)
} catch {}
process.stdin.resume()
// SGR-мышь: 1000 — обычные события кнопок, 1006 — координаты вместо байтовых смещений
process.stdout.write("\x1b[?1000h\x1b[?1006h")
process.stdout.write("\x1b[?25l")

let buffer = ""
for await (const chunk of process.stdin as AsyncIterable<Buffer>) {
  buffer += chunk.toString("utf8")

  for (;;) {
    if (buffer.startsWith("\x1b[<")) {
      const end = buffer.search(/[Mm]/)
      if (end === -1) break
      const event = parseSgr(buffer.slice(0, end + 1))
      buffer = buffer.slice(end + 1)
      if (!event || event.button & 64) continue // 64 — колесо, его пока игнорируем

      const point = toLineCol(event.x, event.y)
      if (event.action === "press") {
        anchor = point
        cursor = point
        dragging = true
      } else if (event.action === "drag" && dragging) {
        cursor = point
      } else if (event.action === "release" && dragging) {
        cursor = point
        dragging = false
        publish()
      }
      renderAll()
      continue
    }

    if (buffer.startsWith("\x1b[5~")) {
      top = clampTop(top + rows - 1)
      buffer = buffer.slice(3)
      renderAll()
      continue
    }
    if (buffer.startsWith("\x1b[6~")) {
      top = clampTop(top - (rows - 1))
      buffer = buffer.slice(3)
      renderAll()
      continue
    }
    if (buffer.startsWith("\x1b") && buffer.length >= 3) {
      const code = buffer[2]
      if (code === "B") top = clampTop(top + 1)
      if (code === "A") top = clampTop(top - 1)
      buffer = buffer.slice(3)
      renderAll()
      continue
    }
    if (buffer.length > 0) {
      const key = buffer[0]
      if (key === "q" || key === "\x03" || key === "\x1b") {
        process.stdout.write("\x1b[?1000l\x1b[?1006h\x1b[?25h\x1b[2J")
        try {
          process.stdin.setRawMode?.(false)
        } catch {}
        process.exit(0)
      }
      buffer = buffer.slice(1)
      renderAll()
      continue
    }
    break
  }
}