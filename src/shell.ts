// Quoting for passing arguments through sh.
//
// tmux takes a command as a single string and runs it through sh, so an argument
// like `report; rm -rf ...` becomes two commands unless it is quoted. Every
// argument is wrapped in single quotes, and an embedded single quote is closed,
// escaped and reopened — the only form that cannot be broken out of.


export function shQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}