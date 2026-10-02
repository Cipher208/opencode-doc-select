import { expect, test } from "bun:test"
import { extractSelection } from "../src/doc-select-core.ts"

const DOC = ["первая строка", "вторая строка", "третья строка", "четвёртая"].join("\n")

test("берёт часть строки", () => {
  // «вторая строка»: с(8)т(9)р(10)о(11)к(12)а(13)
  expect(extractSelection(DOC, { line: 2, col: 8 }, { line: 2, col: 13 })).toEqual({
    startLine: 2,
    endLine: 2,
    text: "строка",
  })
})

test("берёт диапазон через несколько строк вместе с переносами", () => {
  const s = extractSelection(DOC, { line: 1, col: 8 }, { line: 3, col: 6 })
  expect(s.startLine).toBe(1)
  expect(s.endLine).toBe(3)
  expect(s.text).toBe("строка\nвторая строка\nтретья")
})

test("нормализует выделение снизу вверх", () => {
  const down = extractSelection(DOC, { line: 1, col: 8 }, { line: 3, col: 6 })
  const up = extractSelection(DOC, { line: 3, col: 6 }, { line: 1, col: 8 })
  expect(up).toEqual(down)
})

test("клик без перетаскивания даёт один символ", () => {
  expect(extractSelection(DOC, { line: 1, col: 1 }, { line: 1, col: 1 }).text).toBe("п")
})

test("выделение до конца строки", () => {
  expect(extractSelection(DOC, { line: 3, col: 1 }, { line: 3, col: 999 }).text).toBe("третья строка")
})

test("строка за пределами файла прижимается к последней", () => {
  const s = extractSelection(DOC, { line: 4, col: 1 }, { line: 99, col: 999 })
  expect(s.startLine).toBe(4)
  expect(s.endLine).toBe(4)
  expect(s.text).toBe("четвёртая")
})