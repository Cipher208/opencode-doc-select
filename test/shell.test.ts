import { expect, test } from "bun:test"
import { shQuote } from "../src/shell.ts"

// tmux takes a command as one string and runs it through sh, so every argument
// must be protected from shell parsing. A path like `report; rm -rf ...` must not
// turn into two commands.

test("a plain path is wrapped in single quotes", () => {
  expect(shQuote("/home/user/notes.md")).toBe("'/home/user/notes.md'")
})

test("a semicolon stays inside the quoted argument instead of starting a command", () => {
  expect(shQuote("/tmp/a; touch /tmp/pwned")).toBe("'/tmp/a; touch /tmp/pwned'")
})

test("an embedded single quote is escaped so the quoting cannot be broken out of", () => {
  expect(shQuote("it's.md")).toBe("'it'\\''s.md'")
})

test("spaces and dollar signs cannot escape", () => {
  expect(shQuote("/tmp/a b $HOME `id`")).toBe("'/tmp/a b $HOME `id`'")
})

test("an empty argument yields empty quotes rather than nothing", () => {
  expect(shQuote("")).toBe("''")
})

test("a newline cannot split the command in two", () => {
  expect(shQuote("a\ntouch /tmp/pwned")).toBe("'a\ntouch /tmp/pwned'")
})