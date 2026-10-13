# collapse-diffs: PRD

**Status:** Approved (2026-10-09; rescoped by the user from the original pasted spec: no line counts, diffs hidden only)

## What

A Claude Code mod named `collapse-diffs` that hides the diff under Edit and Write tool rows. The row itself (`Update(src/auth.ts)`, `Create(...)`, `Write(...)`) is unchanged. Nothing else changes.

Used mainly in VS Code, so it must work on the `vscode` surface as well as the terminal.

## Constraints

- Built with the plugin-authoring skill, in the dev-mods folder it names.
- Uses only `$.ui.*`. No network, fs, process, model, store or env calls.
- No third-party plugin used as a reference; only the skill's docs and the engine's type definitions.

## Behaviour

- A successful Edit or Write: the result block draws nothing.
- Still shown normally: a call that errored (its error text), a change held for review instead of written, and any output without the expected shape.

## Acceptance

- A `*.test.ts` covers: a successful edit hidden, a successful write hidden, an errored edit shown, a held-for-review edit shown, on both the terminal and vscode surfaces.
- `claude plugin validate` and `claude plugin test` pass on the folder.

## Dropped from the original spec (user decision, 2026-10-09)

Line counts on the row, their colors, and path cutting for long rows.
