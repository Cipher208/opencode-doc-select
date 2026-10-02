import { expect, test } from "bun:test"
import { extractSelection } from "../src/doc-select-core.ts"

const DOC = ["первая строка", "вторая строка", "третья строка", "четвёртая"].join("\n")

test("takes a span within a single line", () => {
  // second line: letters occupy columns 8 through 13
  expect(extractSelection(DOC, { line: 2, col: 8 }, { line: 2, col: 13 })).toEqual({
    startLine: 2,
    endLine: 2,
    text: "строка",
  })
})

test("takes a range across several lines, keeping the newlines", () => {
  const s = extractSelection(DOC, { line: 1, col: 8 }, { line: 3, col: 6 })
  expect(s.startLine).toBe(1)
  expect(s.endLine).toBe(3)
  expect(s.text).toBe("строка\nвторая строка\nтретья")
})

test("normalizes a selection made bottom-up", () => {
  const down = extractSelection(DOC, { line: 1, col: 8 }, { line: 3, col: 6 })
  const up = extractSelection(DOC, { line: 3, col: 6 }, { line: 1, col: 8 })
  expect(up).toEqual(down)
})

test("a click without dragging yields one character", () => {
  expect(extractSelection(DOC, { line: 1, col: 1 }, { line: 1, col: 1 }).text).toBe("п")
})

test("selection reaching the end of the line", () => {
  expect(extractSelection(DOC, { line: 3, col: 1 }, { line: 3, col: 999 }).text).toBe("третья строка")
})

test("a line beyond the file is clamped to the last one", () => {
  const s = extractSelection(DOC, { line: 4, col: 1 }, { line: 99, col: 999 })
  expect(s.startLine).toBe(4)
  expect(s.endLine).toBe(4)
  expect(s.text).toBe("четвёртая")
})