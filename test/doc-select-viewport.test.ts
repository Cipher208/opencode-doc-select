import { expect, test } from "bun:test"
import { formatViewport } from "../src/doc-select-core.ts"

const LINES = ["первая", "вторая", "третья", "четвёртая"]
const REV = (s: string) => `\x1b[7m${s}\x1b[27m`

test("нумерует строки от заданной сверху", () => {
  expect(formatViewport(LINES, 1, 4, 40, null)).toEqual([
    "1 | первая",
    "2 | вторая",
    "3 | третья",
    "4 | четвёртая",
  ])
})

test("рисует ровно столько строк, сколько помещается в окно", () => {
  expect(formatViewport(LINES, 1, 2, 40, null)).toHaveLength(2)
})

test("прокрутка начинается с нужной строки", () => {
  expect(formatViewport(LINES, 3, 2, 40, null)).toEqual(["3 | третья", "4 | четвёртая"])
})

test("номера выровнены по ширине самого большого номера", () => {
  const many = Array.from({ length: 10 }, (_, i) => `строка${i + 1}`)
  const out = formatViewport(many, 8, 3, 40, null)
  expect(out[0]).toBe(" 8 | строка8")
  expect(out[2]).toBe("10 | строка10")
})

test("подсвечивает выделенный кусок одним непрерывным диапазоном", () => {
  const out = formatViewport(LINES, 1, 4, 40, { from: { line: 2, col: 1 }, to: { line: 2, col: 3 } })
  expect(out[1]).toBe(`2 | ${REV("вто")}рая`)
})

test("строка без выделения не трогается", () => {
  const out = formatViewport(LINES, 1, 4, 40, { from: { line: 2, col: 1 }, to: { line: 2, col: 3 } })
  expect(out[0]).toBe("1 | первая")
})

test("длинная строка обрезается ровно до ширины окна вместе с номером", () => {
  const out = formatViewport(["x".repeat(50)], 1, 1, 10, null)
  expect(out[0]).toBe("1 | xxxxxx")
  expect(out[0].length).toBe(10)
})

test("выделение, начатое выше экрана, подсвечивает видимую часть", () => {
  const out = formatViewport(LINES, 2, 2, 40, { from: { line: 1, col: 1 }, to: { line: 2, col: 3 } })
  expect(out[0]).toBe(`2 | ${REV("вто")}рая`)
})

test("выделение, кончившееся ниже экрана, подсвечивает до края", () => {
  const out = formatViewport(LINES, 1, 4, 40, { from: { line: 2, col: 3 }, to: { line: 9, col: 2 } })
  expect(out[1]).toBe(`2 | вт${REV("орая")}`)
})