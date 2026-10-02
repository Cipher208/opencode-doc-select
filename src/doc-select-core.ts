// Чистая логика плагина выделения. Без терминала и без файловой системы —
// всё, что можно проверить тестом, живёт здесь.

export interface MouseEvent {
  /** битовая маска кнопки из SGR-протокола: 0 — левая, 32 — перетаскивание */
  button: number
  /** координаты терминала, как их шлёт SGR: с единицы */
  x: number
  y: number
  action: "press" | "release" | "drag"
}

// SGR (1006): ESC [ < button ; x ; y M|m
const SGR = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/

const MOTION_BIT = 32

export function parseSgr(chunk: string): MouseEvent | null {
  const m = SGR.exec(chunk)
  if (!m) return null
  const button = Number(m[1])
  const isRelease = m[4] === "m"
  const action = isRelease ? "release" : button & MOTION_BIT ? "drag" : "press"
  return { button, x: Number(m[2]), y: Number(m[3]), action }
}

export interface Point {
  /** номер строки с единицы */
  line: number
  /** колонка в строке с единицы */
  col: number
}

export interface Selection {
  startLine: number
  endLine: number
  text: string
}

export function extractSelection(content: string, a: Point, b: Point): Selection {
  const start = cmp(a, b) <= 0 ? a : b
  const end = cmp(a, b) <= 0 ? b : a

  const lines = content.split("\n")
  const first = clamp(start.line, 1, lines.length)
  const last = clamp(end.line, 1, lines.length)

  // колонки с единицы и включительны: отрезок [col-1, col)
  const from = clamp(start.col, 1, lines[first - 1].length + 1) - 1
  const to = clamp(end.col, 1, lines[last - 1].length + 1)

  if (first === last) return { startLine: first, endLine: last, text: lines[first - 1].slice(from, to) }

  const parts: string[] = [lines[first - 1].slice(from)]
  for (let i = first; i < last - 1; i++) parts.push(lines[i])
  parts.push(lines[last - 1].slice(0, to))
  return { startLine: first, endLine: last, text: parts.join("\n") }
}

function cmp(a: Point, b: Point): number {
  return a.line - b.line || a.col - b.col
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value))
}

const REVERSE_ON = "\x1b[7m"
const REVERSE_OFF = "\x1b[27m"

export interface Span {
  from: Point
  to: Point
}

/**
 * Собирает видимые строки панели: номер, разделитель, текст с подсветкой выделения.
 * Строки обрезаются по ширине окна, выделение переживает границы экрана.
 */
export function formatViewport(
  lines: string[],
  topLine: number,
  rows: number,
  width: number,
  sel: Span | null,
): string[] {
  const height = Math.max(0, rows)
  const lastNum = topLine + height - 1
  const numWidth = String(Math.max(1, lastNum)).length
  const textWidth = Math.max(1, width - numWidth - 3)

  let start: Point | null = null
  let end: Point | null = null
  if (sel) {
    const [a, b] = cmp(sel.from, sel.to) <= 0 ? [sel.from, sel.to] : [sel.to, sel.from]
    start = a
    end = b
  }

  const out: string[] = []
  for (let i = 0; i < height; i++) {
    const num = topLine + i
    const text = lines[num - 1] ?? ""
    const body = start && end ? highlight(text, num, start, end) : text
    out.push(`${String(num).padStart(numWidth)} | ${body.slice(0, textWidth)}`)
  }
  return out
}

function highlight(text: string, line: number, start: Point, end: Point): string {
  if (line < start.line || line > end.line) return text
  const from = clamp(line === start.line ? start.col : 1, 1, text.length + 1) - 1
  const to = clamp(line === end.line ? end.col : text.length + 1, 1, text.length + 1)
  if (to <= from) return text
  return text.slice(0, from) + REVERSE_ON + text.slice(from, to) + REVERSE_OFF + text.slice(to)
}

function cmpPoints(a: Point, b: Point): number {
  return cmp(a, b)
}