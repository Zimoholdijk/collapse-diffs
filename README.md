# collapse-diffs

A Claude Code mod that hides the diff under successful Edit and Write tool rows. The row itself (`Update(src/auth.ts)`, `Write(src/new.ts)`) stays as it is.

Bash commands that change files (`sed -i`, a heredoc, a script that writes files) get the same treatment: the diff under the row is replaced by one line per file with its line counts, and the command's own output still shows.

```
● Bash(sed -i 's/a/b/' src/auth.ts && node gen.js)
  ⎿  Updated src/auth.ts +1 -1
  ⎿  Created gen/out.ts +40
```

Still shown as normal:

- a call that errored, with its error text
- a change held for review instead of written
- any result the mod doesn't recognise

Works on every Claude Code surface: the terminal, VS Code and the desktop app.

Because the diff is hidden, the transcript no longer shows what an edit changed. Review changes with `git diff`, especially when edits are auto-accepted.

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
npx tsc -p .
```

`tsconfig.json` extends the types Claude Code writes to `.claude-plugin/types/` when it first loads the mod, so load it once before running `tsc`.
