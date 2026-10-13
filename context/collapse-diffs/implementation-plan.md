# collapse-diffs: Implementation Plan

**Feature:** collapse-diffs (no ticket; personal mod) · **Status:** Draft · **Depends on:** none
**Branch:** none (dev-mods folder is not a git repo)
**PRD:** `context/collapse-diffs/collapse-diffsPRD.md`

---

## Context

The first draft placed `+N -M` counts on the row. The user dropped counts (they use VS Code and only want diffs gone), which removed the need for label lengths, the cwd, and path cutting. This plan replaces that draft.

---

## Verified Facts

Checked against this build's types: `plugin-authoring/types/claude-code.d.ts` (Claude Code 2.1.295).

| Claim | Checked by | Result |
|-------|-----------|--------|
| The diff is drawn by the `ToolResult` render site, separate from the row | d.ts:9944-9951 | "The result block drawn under a standalone tool row"; the row is `ToolUse`. |
| `ToolResult` is raised on every surface, vscode included | d.ts:9950 | "Raised on every surface." |
| `ToolResult` props | d.ts:9951-9982 | `tool_use_id`, `tool`, `output`, `isErrored`, `onScreen`. On error the engine draws the error text, not `output`. |
| "Held for review" flag | d.ts:20547, 21447 | `staged: true` on both Edit and Write results; the file is unchanged. |
| Edit and Write results both carry `structuredPatch` | d.ts:20526, 21426 | Used as the shape check. |

---

## Architecture Decisions

### AD-1: One hook per tool, hiding only the result block

The mod registers a `ui.render` hook on `{ component: 'ToolResult', props: { tool } }` for `Edit` and for `Write` (the same function both times). It returns an empty Box when the call succeeded, the output is an object with a `structuredPatch` array, and `staged` is not true. Otherwise it returns `next(e)`, so errors, held-for-review changes and unexpected shapes draw as the engine does. The `ToolUse` row is not hooked, so labels stay exactly as they are.

### AD-2: No `$` calls at all

The hook only reads `e` and draws with `$.ui.resolve(e)`. Nothing is stored, so no `$.state` contract file.

---

## Schema Changes

None.

---

## File Changes

All paths under `~/.claude/dev-mods/dfb20227-eb42-4c34-9ed2-98c53368c35a/collapse-diffs/`.

| File | Action | Phase |
|------|--------|-------|
| `.claude-plugin/plugin.json` | Create (name, version 0.1.0, one-line description) | 1 |
| `hooks/hooks.json` | Create (one module: `./register.tsx`) | 1 |
| `hooks/register.tsx` | Create (the ToolResult hook for Edit and Write, AD-1) | 1 |
| `hooks/collapse-diffs.test.ts` | Create (render tests below) | 1 |

No changes needed to: any other mod, user settings.

---

## Testing Strategy

- **Render tests (`$.ui.mount`, component `ToolResult`, run on both `terminal` and `vscode`):** successful Edit draws nothing; successful Write draws nothing; errored Edit draws the engine's result; staged Edit draws the engine's result; an output that isn't an object draws the engine's result.
- **Checks:** `claude plugin validate`, `claude plugin test`, and `tsc -p` once the engine has written the mod's types.
- **Deliberately not tested automatically:** how VS Code paints an empty block (the kit checks the tree, never a surface's paint). Checked by eye.

---

## Phased Implementation

### Phase 1: Hide the diff

**Goal:** successful Edit and Write rows show no diff underneath, in the terminal and in VS Code.

Create the manifest, hooks list, hook module (AD-1) and test file.

**Testable:** (a) Manual: hot reloading is on, so ask Claude to edit a file → only `Update(path)` shows, no diff; deny an edit at the dialog → the error still shows; repeat in VS Code. (b) Automated: the five render cases on both surfaces pass; validate and `tsc -p` are clean.

---

## Verification (end-to-end)

1. Successful Edit → row only, no diff. (automated + manual)
2. Edit with empty `old_string` (`Create(path)`) → row only. (automated)
3. Successful Write → row only. (automated + manual)
4. Edit denied or failed → error text shows. (automated + manual)
5. Edit held for review → engine's normal result shows. (automated)
6. Same in VS Code. (automated for the tree, manual for the paint)
7. Other tools (Bash, Read) → unchanged. (manual)
