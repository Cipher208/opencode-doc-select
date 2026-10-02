import { expect, test } from "bun:test"
import { formatViewport } from "../src/doc-select-core.ts"

const LINES = ["первая", "вторая", "третья", "четвёртая"]
const REV = (s: string) => `\x1b[7m${s}\x1b[27m`

test("numbers lines starting from the given top line", () => {
  expect(formatViewport(LINES, 1, 4, 40, null)).toEqual([
    "1 | первая",
    "2 | вторая",
    "3 | третья",
    "4 | четвёртая",
  ])
})

test("renders exactly as many lines as fit in the window", () => {
  expect(formatViewport(LINES, 1, 2, 40, null)).toHaveLength(2)
})

test("scrolling starts at the requested line", () => {
  expect(formatViewport(LINES, 3, 2, 40, null)).toEqual(["3 | третья", "4 | четвёртая"])
})

test("numbers are aligned to the width of the largest one", () => {
  const many = Array.from({ length: 10 }, (_, i) => `строка${i + 1}`)
  const out = formatViewport(many, 8, 3, 40, null)
  expect(out[0]).toBe(" 8 | строка8")
  expect(out[2]).toBe("10 | строка10")
})

test("highlights the selected piece as one continuous range", () => {
  const out = formatViewport(LINES, 1, 4, 40, { from: { line: 2, col: 1 }, to: { line: 2, col: 3 } })
  expect(out[1]).toBe(`2 | ${REV("вто")}рая`)
})

test("a line outside the selection is left untouched", () => {
  const out = formatViewport(LINES, 1, 4, 40, { from: { line: 2, col: 1 }, to: { line: 2, col: 3 } })
  expect(out[0]).toBe("1 | первая")
})

test("a long line is clipped to the window width including the gutter", () => {
  const out = formatViewport(["x".repeat(50)], 1, 1, 10, null)
  expect(out[0]).toBe("1 | xxxxxx")
  expect(out[0].length).toBe(10)
})

test("a selection starting above the viewport highlights the visible part", () => {
  const out = formatViewport(LINES, 2, 2, 40, { from: { line: 1, col: 1 }, to: { line: 2, col: 3 } })
  expect(out[0]).toBe(`2 | ${REV("вто")}рая`)
})

test("a selection ending below the viewport is highlighted to the edge", () => {
  const out = formatViewport(LINES, 1, 4, 40, { from: { line: 2, col: 3 }, to: { line: 9, col: 2 } })
  expect(out[1]).toBe(`2 | вт${REV("орая")}`)
})