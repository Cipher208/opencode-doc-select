// State file and config root locations.
//
// Nothing is hardcoded: the package installs on a machine with a different $HOME
// and possibly non-standard XDG variables. If neither is set, empty strings come
// back so the caller can report it instead of silently writing to a directory
// that may not exist.

export interface PathEnv {
  HOME?: string
  XDG_STATE_HOME?: string
  XDG_CONFIG_HOME?: string
  [key: string]: string | undefined
}

export interface ResolvedPaths {
  /** File the pane writes the latest selection to. */
  state: string
  /** The opencode config root. */
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