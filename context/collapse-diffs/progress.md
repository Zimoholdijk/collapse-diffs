# collapse-diffs: Progress

## Phase 1: Hide the diff (done 2026-10-09)

Built `.claude-plugin/plugin.json`, `hooks/hooks.json`, `hooks/register.tsx`, `hooks/collapse-diffs.test.ts`.

- `claude plugin validate`: passed, one warning (no `author` in plugin.json). Fixed later: `author` added before publishing; validate is now clean.
- `claude plugin test`: 10/10 pass (5 cases × terminal, vscode).
- `tsc`: clean on `register.tsx`, run from a scratch tsconfig against the skill's types because the engine had not yet written `.claude-plugin/types/` (it does so when the mod first loads).

## Deviations

- The test kit has no engine renderer beneath plugins, so each test registers a stub `ToolResult` hook that draws a marker text; "engine's result shown" means that marker is found.
- Manual checks (live terminal, VS Code) not yet done: still pending as of 2026-10-13. To confirm: no blank line left under the row, the "Updated … with N additions" summary line is gone too (accepted), VS Code draws nothing in its place.
- Moved from the session's dev-mods folder to `~/.claude/mods/collapse-diffs` and made a git repo, public at Zimoholdijk/collapse-diffs (2026-10-09). The plan's paths and "not a git repo" line describe the original location.
- Added for publishing, outside the plan's File Changes table: `author` in plugin.json, README.md, LICENSE (MIT), .gitignore, the engine-generated tsconfig.json, and this context/ folder. Listed in the Zimoholdijk/plugins catalog as `collapse-diffs@zimoholdijk`; its own marketplace.json was added then removed in favour of the catalog. Version 0.1.1 marks that switch.

## Code review (2026-10-13)

Full code review, 6 lenses, no Critical or High findings. Applied:

- Tests grew from 10 to 24: Create edit, Write over an existing file, null and patch-less outputs, a non-list patch, and other tools (Read, Bash) left untouched. Hidden cases now also assert an empty Box was drawn. Test helpers typed with the kit's `Engine` and `On` instead of `any`; test file renamed to `.tsx` for the JSX stub.
- Dropped the unused `async` on the hook.
- README: says it works on every surface (it has no surface check, so the desktop app too) and recommends `git diff` since the transcript no longer shows edit contents (user decision).
- tsconfig.json committed, with a README note that the types appear after the first load.

## Trade-off Decisions

- Verbose / ctrl+o view: rows inside an expanded tool group draw their output inline and bypass the ToolResult hook. Edit and Write are not grouped by the engine, so this is left alone unless a diff is actually seen there (user decision, 2026-10-13).

## Bash edits (2026-10-14)

Bash commands that change files carry a per-file diff (`bashEditDiff`) that the engine draws under the Bash row; Edit/Write hiding never touched it. Workflows that edit through Bash (sed, heredocs, generator scripts, as honey-for-devs encourages) still showed diffs. Aligned with akilin's better-tool-rows:

- Bash `ToolUse` row: handed the output without the diff, with one line per changed file beneath it (`Updated src/a.ts +1 -1`, `Created`, `Deleted`), paths relative to the session root. Covers rows inside an expanded group, which draw output inline.
- Bash `ToolResult`: handed the output without the diff; draws nothing when the changed files were all the command produced. Files past the engine's 200-file cap stay as an emptied diff so the engine still counts them.
- Edit/Write unchanged (hidden, no counts).
- Version 0.2.0. Tests 24 → 31; validate and tsc clean; loads in a live 2.1.299 session (`events: ui.render`). Visual check in a terminal/VS Code still pending.

Diagnosis while here: installed hooks modules load only once Claude Code's server-side rollout switch (`tengu_plugin_hooks_modules`) reads on; until then the plugin shows as enabled but its module is not loaded (debug log: `hooks module ... not loaded: ... rollout switch`).
