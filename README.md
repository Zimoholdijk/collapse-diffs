# collapse-diffs

A Claude Code mod that hides the diff under successful Edit and Write tool rows. The row itself (`Update(src/auth.ts)`, `Write(src/new.ts)`) stays as it is.

Still shown as normal:

- a call that errored, with its error text
- a change held for review instead of written
- any result the mod doesn't recognise

Works in the terminal and in Claude Code for VS Code.

## Install

```
/plugin marketplace add Zimoholdijk/plugins
/plugin install collapse-diffs@zimoholdijk
```

It's listed in [Zimoholdijk/plugins](https://github.com/Zimoholdijk/plugins), the catalog of my plugins.

## Note

This mod uses Claude Code's early-access plugin API, which can change between releases. If diffs start showing again after an update, the API has likely moved.

## Develop

Load your checkout instead of the installed copy, so edits show after `/reload-plugins`: add the folder to `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json` (or start a session with `claude --plugin-dir <folder>`).

```
claude plugin validate .
claude plugin test .
```
