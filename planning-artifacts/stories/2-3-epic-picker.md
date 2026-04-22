# Story 2.3: Implement epic picker (space discovery + Backlog task selection)

Status: done

Epic: [EPIC-2: Dev agent story-creation mode → ClickUp (non-destructive)](../epics/EPIC-2-dev-story-creation-clickup.md)

> Fills the `### Epic picker` skeleton left by story 2.1. Adds one step file and updates one subsection in `workflow.md`. No TypeScript lands; no destructive ClickUp calls are made. Space selection uses the project-local `pickSpace` tool (story 1.4, all modes); Backlog list discovery uses `searchSpaces` (requires `CLICKUP_MCP_MODE=read` or `write`); epic enumeration uses `searchTasks` (all modes).
>
> **Depends on stories 2.1 AND 2.2 completing first.** The file this story modifies (`workflow.md`) is created by story 2.1, and the step numbering (`step-02-…`) assumes story 2.2's `step-01-prereq-check.md` already exists. Do not start implementation until both story 2.1 and story 2.2 are merged.

## Story

As the **bmad-mcp-server platform maintainer**,
I want `src/custom-skills/clickup-create-story/workflow.md` to present the user with their ClickUp spaces and the tasks (epics) in the selected space's Backlog list so they can choose an epic interactively,
so that subsequent steps (2.5 description composer, 2.6 task creation) know exactly which epic to compose from and which parent task ID to pass as `parent_task_id` — without requiring the user to know or paste raw ClickUp IDs.

## Acceptance Criteria

1. `src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md` exists and is the canonical source of the picker logic. It MUST:
   - Have YAML frontmatter with exactly five runtime-population keys (all empty strings; set during execution):
     ```yaml
     space_id: ''
     space_name: ''
     backlog_list_id: ''
     epic_id: ''
     epic_name: ''
     ```
   - Include a `# Step 2: Epic Picker` H1 title.
   - Include a `## RULES` section with: (a) a mode requirement rule (`CLICKUP_MCP_MODE` must be `read` or `write` — `searchSpaces` is not registered in `read-minimal` mode; since `createTask` in story 2.6 requires `write`, the entire skill requires `write` mode — see `src/tools/clickup-adapter.ts` lines 167–188); (b) a near-read-only rule (this step calls only `pickSpace`, `getCurrentSpace`, `searchSpaces`, and `searchTasks` — no writes to ClickUp); (c) an early-exit rule (stop the skill run if the user cannot identify a space or no Backlog list exists in the chosen space); (d) a no-fabrication rule (never invent or assume an epic ID — always display the list and wait for explicit selection).
   - Include an `## INSTRUCTIONS` section with numbered steps per AC #2.

2. The `## INSTRUCTIONS` section MUST perform these steps in order:
   1. Call `getCurrentSpace` (no arguments) to check if a space is already selected for this MCP session. If a space is returned, confirm with the user: "Current space: **{space_name}** (`{space_id}`). Use this space? [Y/n]". If confirmed, set `{space_id}` and `{space_name}` from the response and skip to step 5. If declined, call `clearCurrentSpace` and continue to step 2.
   2. Call `pickSpace` with no arguments to list all available spaces.
   3. Ask: "Which space are you working in? Enter the space name or ID."
   4. Call `pickSpace` with `query: "<user input>"` to select the space. If one match, the session is updated automatically — extract `{space_id}` and `{space_name}` from the confirmation response. If multiple matches, present them and ask the user to narrow the query or provide the exact space ID.
   5. Call `searchSpaces` with `terms: ["{space_name}"]` to retrieve the detailed folder/list tree for the selected space (single-space search guarantees the ≤5 threshold for detailed mode).
   6. Scan the tree for a list whose name matches `Backlog` (case-insensitive). If found, set `{backlog_list_id}` automatically (do not ask the user). If NOT found, present all lists visible in the tree and ask: "I couldn't find a list named 'Backlog'. Enter the name or number of the list that holds your epics."
   7. Call `searchTasks` with `list_ids: ["{backlog_list_id}"]` and no search terms to retrieve all tasks in the Backlog list.
   8. If zero tasks are returned, emit the standard empty-backlog error block (see AC #4) and stop.
   9. Present the tasks as a numbered pick-list: `[N] Task name (ID: <task_id>) — status: <status>`.
   10. Ask: "Which epic should this story be created under? Enter the number."
   11. Parse the user's response to set `{epic_id}` (the task ID) and `{epic_name}` (the task name). Confirm: "Selected epic: **{epic_name}** (`{epic_id}`). Continuing to sprint-list picker…"

3. `src/custom-skills/clickup-create-story/workflow.md` — the `### Epic picker` subsection is updated to replace the `<!-- story 2.3 will implement -->` breadcrumb with:
   - One descriptive sentence: what the epic picker does (space discovery → Backlog list → epic selection).
   - `See: [./steps/step-02-epic-picker.md](./steps/step-02-epic-picker.md)`
   - An inline summary of the context stored: "`{epic_id}` and `{epic_name}` are available to downstream steps after this step completes."
   - **No other sections in `workflow.md` change.** The `### Sprint-list picker` breadcrumb for story 2.4 and all other sections MUST remain byte-unchanged.

4. The standard empty-backlog error block (referenced in AC #2 step 7) MUST follow this exact template:

   ```
   ❌ **Epic picker failed — Backlog list is empty**

   The `clickup-create-story` skill found the Backlog list (`{backlog_list_id}`) in space **{space_name}** but it contains no tasks.

   **Why:** Epics are created by the team lead as tasks in the Backlog list before the Dev agent can create stories under them.

   **What to do:** Ask your team lead to create at least one epic task in the Backlog list for space **{space_name}**, then re-invoke the Dev agent in story-creation mode.
   ```

   The step file MUST quote this block verbatim (not paraphrase) so reviewers can verify the exact wording.

5. No files under `BMAD-METHOD/` are created, modified, or deleted. `git diff --stat -- BMAD-METHOD/` MUST be empty.
6. No files under `src/tools/clickup/` are created, modified, or deleted. `git diff --stat -- src/tools/clickup/` MUST be empty.
7. No TypeScript source files are added or modified. `git diff --stat -- 'src/**/*.ts'` MUST be empty. This story ships markdown only.
8. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with no new failures vs. the merge commit of story 2.2. Since no `.ts` lands, the expected deltas are zero in all four.
9. The vendor-tree exclusions from story 1.1 remain byte-unchanged: `.gitignore`, `tsconfig.json#exclude`, `eslint.config.mjs` `ignores`, `.eslintignore`, `.prettierignore`, and `tests/unit/dependency-audit.test.ts` `VENDORED_PATHS`.

## Out of Scope (explicitly deferred to later stories)

- Sprint-list picker (list sprint folder lists, flag active by date range) → **story 2.4**.
- Description composer (PRD + architecture + epic context → ClickUp task description body) → **story 2.5**.
- ClickUp task creation call via vendored `register*Tools` → **story 2.6**.
- `customize.toml` override routing the Dev agent's `CS` trigger → **story 2.7**.
- Regression check that upstream `bmad-create-story` still works in isolation → **story 2.8**.
- Token-permission gating → **story 2.9**.
- Filtering Backlog tasks by status (e.g. showing only "Open" epics). PRD makes no restriction; all tasks in the Backlog list are candidate epics. Story 2.5 or 2.9 may introduce status filtering if needed.
- Handling the case where `searchSpaces` with a single space name still returns a summary (would require >5 spaces with the same name — effectively impossible). The detailed tree is guaranteed when ≤5 spaces match the query; a single-space search always satisfies this.

## Tasks / Subtasks

- [x] **Task 1 — Create `steps/step-02-epic-picker.md` (AC: #1, #2, #4)**
  - [x] Create the file with YAML frontmatter (five keys: `space_id`, `space_name`, `backlog_list_id`, `epic_id`, `epic_name`), H1 title, `## RULES`, and `## INSTRUCTIONS` sections exactly as specified in AC #1–#2.
  - [x] Include the verbatim empty-backlog error block template from AC #4 inside the INSTRUCTIONS (step 7), showing the exact message with `{backlog_list_id}` and `{space_name}` placeholders.
  - [x] Verify the frontmatter key names match downstream contracts: `epic_id` → story 2.6 `parent_task_id` on `createTask`; `epic_name` → story 2.5 description composer context; `space_id` + `space_name` → story 2.4 step-03 sprint-list picker. Spelling must be exact — downstream step files will reference these by name.
  - [x] Confirm `pickSpace` / `getCurrentSpace` are the tools used for space selection (story 1.4 deliverable, `src/tools/clickup-space-picker.ts`), NOT `searchSpaces` alone.

- [x] **Task 2 — Update `workflow.md` Epic picker subsection (AC: #3)**
  - [x] Open `src/custom-skills/clickup-create-story/workflow.md`.
  - [x] Replace the single-line `<!-- story 2.3 will implement: list tasks in the Backlog list, present to user, parse selection. -->` comment under `### Epic picker` with:
    - One descriptive sentence covering space discovery, Backlog list identification, and epic selection.
    - `See: [./steps/step-02-epic-picker.md](./steps/step-02-epic-picker.md)`
    - Context summary: "`{epic_id}` and `{epic_name}` are available to downstream steps after this step completes."
  - [x] Confirm the `### Sprint-list picker` subsection beneath is byte-unchanged (breadcrumb still reads `<!-- story 2.4 will implement: list sprint folder lists, flag the active sprint by date range, present, parse. -->`).

- [x] **Task 3 — Verify regression-free (AC: #5–#9)**
  - [x] `git diff --stat -- BMAD-METHOD/` → empty.
  - [x] `git diff --stat -- src/tools/clickup/` → empty.
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty.
  - [x] `npm run build` → clean.
  - [x] `npm run lint` → 0 errors. Pre-existing `no-console` warnings in `tests/support/litellm-helper.mjs` unchanged. No new lint findings from `src/custom-skills/`.
  - [x] `npm run format` → no diff in `src/custom-skills/`. Accept any prettier reformat of the new markdown (re-run before commit).
  - [x] `npm test` → passing count unchanged from story 2.2 baseline. Since no `.ts` lands, the count must not change.

- [x] **Task 4 — Commit (AC: all)**
  - [x] Stage: `src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md`, `src/custom-skills/clickup-create-story/workflow.md`.
  - [x] Commit message: `feat(custom-skills): implement epic picker step in clickup-create-story`
  - [x] Body:

    ```
    Add step-02-epic-picker.md to guide the Dev agent through space discovery
    and Backlog task selection, storing {epic_id} and {epic_name} for downstream
    steps (description composer 2.5, task creation 2.6).

    Uses pickSpace/getCurrentSpace (all modes) for space selection and
    searchSpaces (write/read mode) + searchTasks for Backlog discovery and epic
    enumeration. Backlogs with no tasks emit a structured error block matching
    the style established in story 2.2. Requires CLICKUP_MCP_MODE=write (aligned
    with createTask requirement in story 2.6).

    Out of scope (deferred): sprint-list picker (2.4), description composer (2.5),
    ClickUp task creation (2.6), customize.toml wiring (2.7), upstream regression
    check (2.8), token-permission gating (2.9).

    Refs: EPIC-2, story 2-3-epic-picker.
    ```

## Dev Notes

### Tool surface available at runtime

Four tools are used (mode availability noted for each — see `src/tools/clickup-adapter.ts` lines 167–229 for the full dispatch table):

- **`pickSpace`** (`src/tools/clickup-space-picker.ts`): Available in **all modes** (read-minimal, read, write). Call with no args to list all non-archived spaces; call with `query` for fuzzy match; call with `spaceId` for exact selection. On a single match, automatically sets the session-scoped space (persists until `clearCurrentSpace` or session end). Returns `"Selected space: {name} (id: {id})"` on success.
- **`getCurrentSpace`** (`src/tools/clickup-space-picker.ts`): Available in **all modes**. Returns the session-scoped space previously set by `pickSpace`, or "No space is currently selected." Check this first to avoid re-prompting the user within the same session.
- **`clearCurrentSpace`** (`src/tools/clickup-space-picker.ts`): Available in **all modes**. Clears the session-scoped space. Call only if the user declines to reuse the current space.
- **`searchSpaces`** (`src/tools/clickup/src/tools/space-tools.ts`): Available in **`read` and `write` modes only — NOT in `read-minimal`**. Call with `terms: [space_name]` after `pickSpace` to get the detailed folder/list tree for Backlog discovery. Single-space search always returns the detailed tree (≤5 match threshold is always met).
- **`searchTasks`** (`src/tools/clickup/src/tools/search-tools.ts`): Available in **all modes**. Call with `list_ids: [backlog_list_id]` and no `terms` to enumerate all tasks (epics) in the Backlog list.

**Mode constraint:** `searchSpaces` requires `CLICKUP_MCP_MODE=read` or `write`. Since `createTask` (story 2.6) requires `write`, the practical minimum for the full skill is `write` mode. The step file's `## RULES` must state this.

No `createTask`, `updateTask`, or `addComment` calls happen in this step.

### Identifying the Backlog list

The PRD §ClickUp layout says: "**Backlog list** per space → humans create **epics** here as tasks." The canonical name is `Backlog`. The step instruction uses case-insensitive matching (`backlog`, `BACKLOG`, `Backlog` all match) to handle case variants. If the space tree contains multiple lists named `Backlog` (unlikely but possible in multi-folder spaces), the step should present both and ask the user to pick. This is an edge case; document it in the INSTRUCTIONS with a brief note.

### Why `space_id` is stored in frontmatter

Story 2.4 (sprint-list picker) also needs to navigate the same space to find the sprint folder. Storing `space_id` here avoids re-asking the user which space they're in. Story 2.4's step file can read `{space_id}` directly from the shared step context.

### `pickSpace` + `searchSpaces` two-call design

The space-selection flow uses two different tools for two distinct purposes:

1. **`pickSpace`** — session-scoped interactive selection. Available in all modes. Does not return list trees. Output: `space_id` + `space_name`.
2. **`searchSpaces`** — list tree discovery for Backlog identification. Only available in `read`/`write` mode. Called with `terms: [space_name]` _after_ space is confirmed, so only one space matches → detailed tree guaranteed.

The two-call design means the step never calls `searchSpaces` with no arguments (which could return summaries-only for workspaces with >5 spaces). The space name from `pickSpace` is always used as a search term, ensuring the single-space detailed mode regardless of total workspace size.

### Naming convention for step files

Per story 2.2 dev notes: `step-NN-slug.md`, sequential by execution order. Story 2.2 added `step-01-prereq-check.md`. This story adds `step-02-epic-picker.md`. Story 2.4 will add `step-03-sprint-list-picker.md`. The numbering MUST stay sequential to match the execution order documented in `workflow.md`.

### What downstream steps receive

After step-02 completes without error:

| Key                 | Value                         | First consumer                                  |
| ------------------- | ----------------------------- | ----------------------------------------------- |
| `{space_id}`        | ClickUp space ID string       | step-03 (2.4)                                   |
| `{space_name}`      | Human-readable space name     | step-03 (2.4)                                   |
| `{backlog_list_id}` | Backlog list ID string        | step-05 (2.6) ← duplicate-check before creating |
| `{epic_id}`         | Task ID of selected epic      | step-05 (2.6) → `parent_task_id`                |
| `{epic_name}`       | Display name of selected epic | step-04 (2.5) → description composer context    |

### Tooling interaction

Same as stories 2.1 and 2.2 — no `.ts` files, no tsc/ESLint/Vitest impact. Prettier will format the new `.md` files; run `npm run format` before staging.

### References

- [PRD §ClickUp layout](../PRD.md) — "Backlog list per space → humans create epics here as tasks."
- [PRD §Functional requirements #3](../PRD.md) — "interactive pickers (not raw IDs) to let the user choose epic, sprint list, and space."
- [PRD §Functional requirements #4](../PRD.md) — "Stories are created as subtasks of the epic task (`parent = epic ID`)."
- [Story 2.1 §AC #3](./2-1-scaffold-clickup-create-story-skill.md) — `### Epic picker` breadcrumb created: `<!-- story 2.3 will implement: list tasks in the Backlog list, present to user, parse selection. -->`. This story replaces it.
- [Story 2.2 §Dev Notes: step-file naming convention](./2-2-prereq-file-check.md) — "Story 2.3 will add `step-02-epic-picker.md`."
- [Story 2.6](../sprint-status.yaml) — `createTask` call uses `parent_task_id = {epic_id}` (confirmed via `src/tools/clickup/src/tools/task-write-tools.ts` `buildTaskRequestBody` — field name is `parent_task_id` in schema, maps to `parent` in request body, line ~521).
- Tool surface: `src/tools/clickup-space-picker.ts` (`pickSpace`, `getCurrentSpace`, `clearCurrentSpace` — all modes, story 1.4), `src/tools/clickup/src/tools/space-tools.ts` (`searchSpaces` — read/write only), `src/tools/clickup/src/tools/search-tools.ts` (`searchTasks` — all modes).
- Mode dispatch: `src/tools/clickup-adapter.ts` lines 167–229 — confirm `searchSpaces` absent from `read-minimal` block; `pickSpace` registered after the mode block (line 226–229, all modes).
- [EPIC-2 §Stories bullet 4](../epics/EPIC-2-dev-story-creation-clickup.md) — "Implement epic picker: list tasks in Backlog list, present, parse selection."
- [Story 1.4 §space-picker](../sprint-status.yaml) — `pickSpace`/`getCurrentSpace`/`clearCurrentSpace` are the delivered artifact of story 1-4-space-picker (EPIC-1 done). This story USES them but MUST NOT modify `src/tools/clickup-space-picker.ts`.

## Dev Agent Record

### Agent Model Used

Kimi Code CLI

### Debug Log References

- No debug issues encountered during implementation.

### Completion Notes List

- Created `step-02-epic-picker.md` with exact YAML frontmatter keys, RULES section (mode requirement, near-read-only, early-exit, no-fabrication), and INSTRUCTIONS section with all 11 steps per AC #2.
- Included verbatim empty-backlog error block from AC #4 inside INSTRUCTIONS step 8.
- Updated `workflow.md` `### Epic picker` subsection with descriptive sentence, step file link, and context summary per AC #3.
- Verified `### Sprint-list picker` subsection and all other `workflow.md` sections remain byte-unchanged.
- All regression checks passed (AC #5–#9): no changes to BMAD-METHOD/, src/tools/clickup/, src/**/*.ts, or vendor-tree exclusion files. Build, lint, format, and test all clean (232 tests passing).

### File List

**New**

- `src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md` — step file with space discovery, Backlog list identification, epic selection, and empty-backlog error block (AC #1–#2, #4)

**Modified**

- `src/custom-skills/clickup-create-story/workflow.md` — `### Epic picker` subsection updated (AC #3)

**Deleted**

- (none)

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-04-22 | Story drafted from EPIC-2 bullet 4 via `bmad-create-story` workflow. Status → ready-for-dev.                                                                                                                                                                                               |
| 2026-04-22 | Validation pass: fixed tool selection (use `pickSpace`/`getCurrentSpace` not `searchSpaces` for space selection); added `CLICKUP_MCP_MODE` constraint; corrected dependency to "stories 2.1 AND 2.2"; updated AC #2 instruction flow, Dev Notes tool surface, commit body, and References. |
| 2026-04-22 | Implemented: created `step-02-epic-picker.md`, updated `workflow.md`, all ACs satisfied, all regression checks passed. Status → review. |
