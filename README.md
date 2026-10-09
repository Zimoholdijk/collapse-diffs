# collapse-diffs

A Claude Code mod that hides the diff under successful Edit and Write tool rows. The row itself (`Update(src/auth.ts)`, `Write(src/new.ts)`) stays as it is.

Still shown as normal:

- a call that errored, with its error text
- a change held for review instead of written
- any result the mod doesn't recognise

Works in the terminal and in Claude Code for VS Code.

## Install

```
/plugin install collapse-diffs --marketplace Zimoholdijk/collapse-diffs
```

Answer `y` to add the marketplace, then pick a scope.

## Note

This mod uses Claude Code's early-access plugin API, which can change between releases. If diffs start showing again after an update, the API has likely moved.

## Develop

```
claude plugin validate .
claude plugin test .
```
