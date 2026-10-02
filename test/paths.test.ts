import { expect, test } from "bun:test"
import { resolvePaths } from "../src/paths.ts"

// Пути не должны быть зашиты в чью-то домашнюю директорию: пакет ставится на чужую
// машину, где $HOME другой, а XDG-переменные могут быть заданы нестандартно.
test("state path follows XDG_STATE_HOME when it is set", () => {
  const p = resolvePaths({ HOME: "/home/user", XDG_STATE_HOME: "/custom/state" })
  expect(p.state).toBe("/custom/state/opencode/doc-select.json")
})

test("state path falls back to ~/.local/state when XDG_STATE_HOME is absent", () => {
  const p = resolvePaths({ HOME: "/home/user" })
  expect(p.state).toBe("/home/user/.local/state/opencode/doc-select.json")
})

test("an explicit state override wins over both", () => {
  const p = resolvePaths({ HOME: "/home/user", XDG_STATE_HOME: "/custom/state" }, "/tmp/sel.json")
  expect(p.state).toBe("/tmp/sel.json")
})

test("config root follows XDG_CONFIG_HOME so the plugin works off a relocated config dir", () => {
  const p = resolvePaths({ HOME: "/home/user", XDG_CONFIG_HOME: "/cfg" })
  expect(p.configRoot).toBe("/cfg/opencode")
})

test("with neither HOME nor XDG set the paths are empty strings, not a guess", () => {
  const p = resolvePaths({})
  expect(p.state).toBe("")
  expect(p.configRoot).toBe("")
})

test("trailing slashes on XDG roots do not produce doubled separators", () => {
  const p = resolvePaths({ HOME: "/home/user", XDG_STATE_HOME: "/custom/state/", XDG_CONFIG_HOME: "/cfg/" })
  expect(p.state).toBe("/custom/state/opencode/doc-select.json")
  expect(p.configRoot).toBe("/cfg/opencode")
})