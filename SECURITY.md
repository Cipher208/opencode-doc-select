# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | yes       |

## What this plugin touches

`doc_open` hands a command string to `tmux split-window`, which executes it
through a shell. Every interpolated value — the CLI path, the file path and the
state path — is therefore wrapped in single quotes by `shQuote` before being
concatenated, so a path containing `;`, `$`, a backtick or a newline cannot start
a second command.

That quoting was not there in the first published commit. It was added after an
end-to-end test confirmed the injection: a path of the form
`/tmp/probe; touch /tmp/pwned` created `/tmp/pwned`. The fix has its own tests in
`test/shell.test.ts`, and both directions were verified through tmux — the
injection no longer fires, and a legitimate path containing spaces still opens.

The selection state file is written under `${XDG_STATE_HOME:-~/.local/state}` and
contains only the selected text.

If you find a way to escape the quoting, that is a real vulnerability. Report it
as described below.

## Reporting a vulnerability

Use **Security → Report a vulnerability** in this repository. Include the version,
the steps to reproduce, and what you observed versus what you expected.

You will get an acknowledgement within a few days. Fixes ship as a patch release.
Please do not open a public issue for a vulnerability before it is addressed.
