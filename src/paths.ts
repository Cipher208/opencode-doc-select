// Пути к состоянию и корню конфигурации.
//
// Ничего не зашито: пакет ставится на машину с другим $HOME и, возможно, с
// нестандартными XDG-переменными. Если ни $HOME, ни XDG не заданы — возвращаем
// пустые строки, чтобы вызывающий код сказал об этом прямо, а не молча писал
// в несуществующий каталог.

export interface PathEnv {
  HOME?: string
  XDG_STATE_HOME?: string
  XDG_CONFIG_HOME?: string
  [key: string]: string | undefined
}

export interface ResolvedPaths {
  /** Файл, куда панель пишет последнее выделение. */
  state: string
  /** Корень конфигурации opencode. */
  configRoot: string
}

function trimTrailingSlash(value: string): string {
  return value.length > 1 && value.endsWith("/") ? value.slice(0, -1) : value
}

function join(...parts: string[]): string {
  return trimTrailingSlash(parts.filter(Boolean).join("/"))
}

export function resolvePaths(env: PathEnv = process.env, stateOverride?: string): ResolvedPaths {
  const home = trimTrailingSlash(env.HOME ?? "")
  const stateHome = trimTrailingSlash(env.XDG_STATE_HOME ?? "")
  const configHome = trimTrailingSlash(env.XDG_CONFIG_HOME ?? "")

  if (!home && !stateHome && !configHome) return { state: "", configRoot: "" }

  const stateRoot = stateHome || (home ? join(home, ".local/state") : "")
  const configRoot = configHome
    ? join(configHome, "opencode")
    : home
      ? join(home, ".config", "opencode")
      : ""

  return {
    state: stateOverride ?? (stateRoot ? join(stateRoot, "opencode", "doc-select.json") : ""),
    configRoot,
  }
}