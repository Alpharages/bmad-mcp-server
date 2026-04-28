# Story 2.4: Implement sprint-list picker (list sprint folder, present, parse)

Status: done

Epic: [EPIC-2: Dev agent story-creation mode → ClickUp (non-destructive)](../epics/EPIC-2-dev-story-creation-clickup.md)

> Fills the `### Sprint-list picker` skeleton in `workflow.md` left by story 2.1. Adds one step file (`step-03-sprint-list-picker.md`) and updates one section of `workflow.md`. No TypeScript lands; no ClickUp write calls are made. The picker is read-only: it lists folders and lists in the space, presents the choices to the user (with a hint about active-sprint identification), and stores the selected list ID in `{sprint_list_id}` for downstream use by story 2.6 (task creation).
>
> **Depends on story 2.3 completing first.** The `{space_id}` and `{space_name}` variables needed by this step are populated by step-02 (epic picker). The step file slot `step-03-sprint-list-picker.md` must land after `step-02-epic-picker.md` to preserve execution order. Do not start implementation until story 2.3 is merged.

## Story

As the **bmad-mcp-server platform maintainer**,
I want `src/custom-skills/clickup-create-story/workflow.md` to include a working sprint-list picker step — backed by `steps/step-03-sprint-list-picker.md` — that lists all non-archived sprint lists in the selected space's sprint folder, presents the choices to the user with a hint about identifying the active sprint, and parses the selection into `{sprint_list_id}`,
so that the story-creation skill always targets the correct ClickUp sprint list and subsequent steps (2.5 description composer, 2.6 task creation) can assume a valid `{sprint_list_id}` without defensive fallbacks — matching PRD §Functional requirements #3 ("interactive pickers, not raw IDs").

## Acceptance Criteria

1. `src/custom-skills/clickup-create-story/steps/step-03-sprint-list-picker.md` exists and is the canonical source of the sprint-list picker logic. It MUST:
   - Have YAML frontmatter with exactly three runtime-population keys:
     ```yaml
     sprint_folder_id: ''
     sprint_list_id: ''
     sprint_list_name: ''
     ```
     All empty strings; set during execution when the folder is identified and the user selects a list. The `sprint_folder_id` key enables re-use (if the user corrects their folder choice, only this value changes before re-querying). Story 2.6 reads `{sprint_list_id}` and `{sprint_list_name}` by name; the exact key strings matter.
   - Include a `# Step 3: Sprint-List Picker` H1 title.
   - Include a `## RULES` section with:
     (a) a mode requirement rule — this step calls `searchSpaces` which is **not registered** in `read-minimal` mode; `CLICKUP_MCP_MODE` MUST be `read` or `write` (since `createTask` in story 2.6 requires `write`, the practical minimum for the full skill is `write` mode);
     (b) a read-only rule — this step calls `searchSpaces` and `getListInfo` for discovery only; it MUST NOT call `createTask`, `updateTask`, or any other write tool;
     (c) a blocking rule — the step MUST NOT continue to step 4 if `{sprint_list_id}` is empty at the end of this step.
   - Include an `## INSTRUCTIONS` section with numbered steps that:
     1. Read `{space_id}` and `{space_name}` from the step-02 context (set by the epic picker); if absent or empty, emit the standard missing-space error block (see AC #3) and stop.
     2. Call `searchSpaces` with `terms: ["{space_name}"]` to retrieve the detailed folder/list tree for the selected space. A single-space search always returns detailed mode (≤5 threshold is always met when searching by exact name).
     3. Scan the returned folders for the sprint folder: prefer a folder whose name contains "sprint" (case-insensitive). If no such folder exists, present the full folder list to the user as a numbered list and ask them to identify the sprint folder by entering its number **or** its raw folder ID. If the user enters a number, resolve it to the corresponding folder. If the space has no folders at all, emit the standard no-sprint-folder error block (see AC #3) and stop.
     4. Store the identified folder's ID in `{sprint_folder_id}`.
     5. From the folder tree data already returned by `searchSpaces`, collect all lists within `{sprint_folder_id}`. Filter out any lists where `archived: true`. If the folder returns no non-archived lists, inform the user and stop.
     6. Present a numbered list of non-archived sprint lists with the format:
        ```
        [N] <list_name> (list_id: <id>)
        ```
        Precede the list with the hint: "If your sprint lists have ClickUp date ranges configured, the active sprint is the one whose start date is before today and end date is after today."
        Follow the list with: "Enter the number of the sprint list that should receive the new story."
     7. Parse the user's numeric response: validate it is a number between 1 and N; if invalid, re-present the list and ask again.
     8. Set `{sprint_list_id}` to the selected list's ID and `{sprint_list_name}` to its name.
     9. Confirm the selection: emit `✅ Sprint list selected: <sprint_list_name> (list_id: <sprint_list_id>)` and continue to step 4.

2. `src/custom-skills/clickup-create-story/workflow.md` — the `### Sprint-list picker` subsection is updated to replace the `<!-- story 2.4 will implement -->` breadcrumb with:
   - A one-line description of what the sprint-list picker does (discover sprint folder, list non-archived sprint lists, prompt user to select, store `{sprint_list_id}`).
   - A `See: [./steps/step-03-sprint-list-picker.md](./steps/step-03-sprint-list-picker.md)` pointer.
   - An inline rule: "Step 3 MUST complete with a non-empty `{sprint_list_id}` before the workflow proceeds." No other sections in `workflow.md` change; the breadcrumbs for stories 2.5 and 2.6 MUST remain unchanged.

3. The two standard error blocks (referenced in AC #1 INSTRUCTIONS steps 1 and 3) MUST follow these exact templates so downstream stories can assume a consistent error surface:

   **Missing `{space_id}` / `{space_name}` error:**

   ```
   ❌ **Sprint-list picker failed — space not selected**

   The `clickup-create-story` skill requires a space to be chosen before the sprint-list picker runs.

   **Why:** The sprint folder is discovered within the selected space. Without a space, there is no folder to query.

   **What to do:** Re-run step 2 (epic picker) to select a space and epic, then return to this step.
   ```

   **No sprint folder found error:**

   ```
   ❌ **Sprint-list picker failed — no sprint folder found**

   No folder containing "sprint" (case-insensitive) was found in space **{space_name}** (`{space_id}`).

   **Why:** The `clickup-create-story` skill expects sprint lists to live inside a ClickUp Sprint folder in the selected space. If your workspace uses a different naming convention, identify the correct folder from the list above and retry.

   **What to do:** Either rename your sprint folder to include the word "sprint", or enter the folder ID manually when prompted above, then re-invoke this step.
   ```

   The step file MUST quote both blocks verbatim (not paraphrase) so reviewers can verify the exact wording.

4. No files under `BMAD-METHOD/` are created, modified, or deleted. `git diff --stat -- BMAD-METHOD/` MUST be empty.
5. No files under `src/tools/clickup/` are created, modified, or deleted. `git diff --stat -- src/tools/clickup/` MUST be empty.
6. No TypeScript source files are added or modified. `git diff --stat -- 'src/**/*.ts'` MUST be empty. This story ships markdown only.
7. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with no new failures vs. the merge commit of story 2.3 (baseline shifts as EPIC-2 stories land). Since no `.ts` lands, the expected deltas are zero in all four.
8. The vendor-tree exclusions from story 1.1 remain byte-unchanged: `.gitignore`, `tsconfig.json#exclude`, `eslint.config.mjs` `ignores`, `.eslintignore`, `.prettierignore`, and `tests/unit/dependency-audit.test.ts` `VENDORED_PATHS`.

## Out of Scope (explicitly deferred to later stories)

- Description composer (PRD + architecture + epic context → ClickUp task description body) → **story 2.5**.
- ClickUp task creation call → **story 2.6**.
- `customize.toml` override routing Dev agent's `CS` trigger to `clickup-create-story` → **story 2.7**.
- Regression check that upstream `bmad-create-story` still works in isolation → **story 2.8**.
- Token-permission gating → **story 2.9**.
- **Date-aware active-sprint flagging**: the current vendored `getListInfo` tool does not expose `start_date`/`due_date` in its text output (see Dev Notes §"Why date detection is not implemented"). A future story can add automatic active-sprint flagging by introducing a new non-vendored MCP tool that fetches folder lists with date metadata, or by extending `getListInfo`. Do not attempt in this story — doing so would require vendored-tree edits, which are forbidden.
- Discovering or validating the sprint folder's ClickUp "type" field — the name-based heuristic (contains "sprint") is sufficient. Type-field inspection is brittle across ClickUp API versions and adds complexity without a clear user benefit here.
- Pagination of sprint lists: if a sprint folder has more lists than ClickUp returns in a single response, only the first page is shown. Teams with very large sprint histories should archive completed sprints.
- Automatic active-sprint selection without prompting the user — even if the user verbally confirms "the active sprint is Sprint 7", the step must still validate against the numbered list and store via the picker flow. Silent auto-selection risks mis-routing stories at sprint boundaries.
- Caching the sprint folder ID between sessions — the skill re-discovers the sprint folder each invocation. A per-project config cache (`customize.toml` `sprint_folder_id = "..."`) can be added once the picker has stabilized.
- Handling spaces with no folders (only flat lists) — the step's no-sprint-folder error block covers this. Flat-list sprint workflows are not supported in this story.

## Tasks / Subtasks

- [ ] **Task 1 — Create `steps/step-03-sprint-list-picker.md` (AC: #1, #3)**
  - [ ] Create the file with YAML frontmatter, H1 title, `## RULES`, and `## INSTRUCTIONS` sections exactly as specified in AC #1.
  - [ ] Include both verbatim error blocks from AC #3 inside the INSTRUCTIONS, quoted inline where referenced (step 1 for the missing-space error, step 3 for the no-sprint-folder error).
  - [ ] Verify the frontmatter keys match the downstream contract: `sprint_folder_id`, `sprint_list_id`, `sprint_list_name` (story 2.6 reads these by name; exact spelling matters).
  - [ ] Verify step numbering: this file's H1 says "Step 3" (not "Step 4") because it is the third instruction file in execution order.
  - [ ] Verify the `## RULES` section includes the `CLICKUP_MCP_MODE` constraint (mode must be `read` or `write`) matching the pattern set in story 2.3's step-02.

- [ ] **Task 2 — Update `workflow.md` Sprint-list picker section (AC: #2)**
  - [ ] Open `src/custom-skills/clickup-create-story/workflow.md`.
  - [ ] Under `### Sprint-list picker`, replace the single-line `<!-- story 2.4 will implement ... -->` comment with:
    - One descriptive sentence: what the sprint-list picker discovers, what it presents, and what it stores.
    - `See: [./steps/step-03-sprint-list-picker.md](./steps/step-03-sprint-list-picker.md)`
    - Inline rule: "Step 3 MUST complete with a non-empty `{sprint_list_id}` before the workflow proceeds to step 4."
  - [ ] Confirm no other sections in `workflow.md` are touched — the breadcrumbs for stories 2.5 and 2.6 MUST remain unchanged.

- [ ] **Task 3 — Verify regression-free (AC: #4–#8)**
  - [ ] `git diff --stat -- BMAD-METHOD/` → empty.
  - [ ] `git diff --stat -- src/tools/clickup/` → empty.
  - [ ] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [ ] `git diff -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty (story 1.1 vendor-tree exclusions MUST be byte-unchanged).
  - [ ] `npm run build` → clean.
  - [ ] `npm run lint` → 0 errors. Pre-existing `no-console` warnings in `tests/support/litellm-helper.mjs` unchanged. No new lint findings from `src/custom-skills/`.
  - [ ] `npm run format` → no diff in `src/custom-skills/`. Re-run before commit to accept any prettier reformat of the new markdown.
  - [ ] `npm test` → passing count unchanged from story 2.3 merge baseline. Since no `.ts` lands, the test count must not change.

- [ ] **Task 4 — Commit (AC: all)**
  - [ ] Stage in this order: `src/custom-skills/clickup-create-story/workflow.md`, `src/custom-skills/clickup-create-story/steps/step-03-sprint-list-picker.md`.
  - [ ] Commit message: `feat(custom-skills): implement sprint-list picker in clickup-create-story`
  - [ ] Body:

    ```
    Add step-03-sprint-list-picker.md to the clickup-create-story skill. The step
    discovers the sprint folder in the selected space (name-heuristic: contains
    "sprint", case-insensitive), lists non-archived sprint lists from the folder
    tree returned by searchSpaces, presents a numbered picker with an active-sprint
    hint, and stores the selection as {sprint_list_id} and {sprint_list_name} for
    downstream steps.

    Updates workflow.md § Sprint-list picker to replace the 2.4 breadcrumb with
    the step pointer and blocking rule.

    Note: automatic date-range active-sprint flagging is not implemented because
    the vendored getListInfo tool does not expose start_date/due_date in its output.
    The step uses user-driven selection with a hint instead. A future story can add
    date-aware flagging via a new non-vendored tool without touching the vendored tree.

    Out of scope (deferred): description composer (2.5), task creation (2.6),
    customize.toml wiring (2.7), upstream regression check (2.8),
    token-permission gating (2.9).

    Refs: EPIC-2, story 2-4-sprint-list-picker.
    ```

## Dev Notes

### What `step-03` is responsible for — and what it is not

`step-03-sprint-list-picker.md` is a workflow instruction file consumed by the BMAD Dev agent at runtime. It is not executable code; the LLM reads its `## INSTRUCTIONS` and follows them literally using whatever MCP tools are available (`searchSpaces`, `getListInfo`). That means:

- "Call `searchSpaces` with `terms: ["{space_name}"]`" causes the LLM to invoke the `searchSpaces` MCP tool and parse the tree-formatted response.
- "Filter archived lists" means the LLM reads the `archived: true/false` field from list entries in the tree response.
- The `{sprint_folder_id}`, `{sprint_list_id}`, `{sprint_list_name}` frontmatter variables are runtime-populated by the LLM. They persist in the BMAD step-context for downstream steps (story 2.6 reads `{sprint_list_id}` without re-querying).
- The error blocks in AC #3 are exact wording the agent must emit verbatim. Story 2.8's regression check can assert the exact error string.

### Variables consumed from step-02 / provided to downstream steps

| Key                  | Direction    | Source / Consumer                                                            |
| -------------------- | ------------ | ---------------------------------------------------------------------------- |
| `{space_id}`         | **consumed** | Set by step-02 (epic picker, story 2.3)                                      |
| `{space_name}`       | **consumed** | Set by step-02 (epic picker, story 2.3) — used as `searchSpaces` search term |
| `{sprint_folder_id}` | **produced** | Set during this step; may be used by a future config-cache story             |
| `{sprint_list_id}`   | **produced** | Consumed by step-05 (story 2.6) as the target list for `createTask`          |
| `{sprint_list_name}` | **produced** | Consumed by step-04 (story 2.5) for description composer context             |

### Why date detection is not implemented

ClickUp list objects in the API contain `start_date` and `due_date` fields (Unix milliseconds). However, the vendored `getListInfo` tool (`src/tools/clickup/src/tools/list-tools.ts:51-105`) formats the API response as text and outputs only: `list_id`, `list_url`, `name`, `folder`, `space`, `archived`, `task_count`, description, statuses, and space tags. `start_date` and `due_date` are **never included in the output**. The `searchSpaces` folder tree (`formatSpaceTree` in `src/tools/clickup/src/shared/utils.ts:239-315`) likewise outputs only name, list_id, task_count, and archived for each list.

A dev agent following step-03 instructions literally would call `getListInfo` and receive a text response with no date fields — making the flag logic impossible to apply.

Adding date output to `getListInfo` or `searchSpaces` would require editing the vendored tree, which is forbidden per story 1.1 AC #2. The correct fix is a future story that adds a new non-vendored list-detail MCP tool exposing date fields, wired through `src/tools/clickup-adapter.ts` alongside the space-picker tools from story 1.4.

Step-03 therefore relies on user-driven selection with a hint: _"If your sprint lists have ClickUp date ranges configured, the active sprint is the one whose start date is before today and end date is after today."_ This is a one-interaction cost that avoids a silent wrong choice.

### Sprint-folder discovery heuristic

ClickUp does not expose a "this folder is a Sprints folder" discriminator in the `/api/v2/space/{id}/folder` API response (as of Q1 2026). The name-based heuristic (contains "sprint", case-insensitive) covers common conventions:

- "Sprints" (ClickUp default when enabling native Sprints)
- "Sprint Board", "All Sprints", "Active Sprints" (common team variants)
- "Sprint 2026", "Q2 Sprints" (date-prefixed variants)

Edge case — no folder named with "sprint": the step presents all folders to the user and accepts either a numbered selection or a raw folder ID as manual entry. The explicit fallback is important — do NOT auto-pick the first folder.

If a future ClickUp API version exposes a `type: "sprint_folder"` discriminator, a later story can refine the heuristic without touching the step file's error contract.

### `searchSpaces` call: use `{space_name}` as the search term

The `searchSpaces` tool signature is `{ terms: string[], archived?: boolean }` — it does not accept a `space_id` parameter directly. The correct call for step-03 is `searchSpaces({ terms: ["{space_name}"] })`, mirroring story 2.3's pattern. Using the space name from step-02 guarantees a single match → detailed tree mode (≤5 threshold is always satisfied for a name-exact search).

The tree response includes folders with their contained lists (name, list_id, task_count, archived). This is all the data step-03 needs for discovery and presentation.

### Mode constraint: `CLICKUP_MCP_MODE=read` or `write`

`searchSpaces` is registered only in `read` and `write` modes (see `src/tools/clickup-adapter.ts` — `registerSpaceTools` is called in `read` and `write` branches, not `read-minimal`). Since story 2.6 also requires `write` mode for `createTask`, the full `clickup-create-story` skill requires `CLICKUP_MCP_MODE=write`. The `## RULES` section of step-03 must state this, consistent with story 2.3's step-02.

### ClickUp API tools used by this step

| Tool                                         | Mode availability | Purpose in step-03                                                                      |
| -------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| `searchSpaces`                               | `read`, `write`   | Retrieve space folder tree; discover sprint folder and its list entries                 |
| `getListInfo`                                | `read`, `write`   | **Not used for dates** (see above); may be used for supplemental list details if needed |
| `createTask`, `updateTask`, `updateListInfo` | —                 | **Forbidden** — write tools, not used in this step                                      |

### Step file naming convention

| Step file                         | Created by story | Execution order |
| --------------------------------- | ---------------- | --------------- |
| `step-01-prereq-check.md`         | 2.2              | 1               |
| `step-02-epic-picker.md`          | 2.3              | 2               |
| `step-03-sprint-list-picker.md`   | **2.4**          | 3               |
| `step-04-description-composer.md` | 2.5              | 4               |
| `step-05-create-task.md`          | 2.6              | 5               |

### Workflow.md breadcrumb contract

At the time story 2.4 is implemented, `workflow.md` will have been updated by stories 2.2 and 2.3. Breadcrumbs for stories 2.5 and 2.6 MUST remain unchanged. Before committing, confirm that `diff` shows only the `### Sprint-list picker` section modified.

### Tooling interaction

- **tsc / ESLint / Vitest**: No `.ts` files — no impact.
- **Prettier**: Will format the new `.md` file. Run `npm run format` before staging.

### References

- [PRD §Functional requirements #3](../PRD.md) — "Dev agent (story-creation mode) uses interactive pickers (not raw IDs) to let the user choose epic, sprint list, and space."
- [PRD §ClickUp layout](../PRD.md) — "Sprint folder → ClickUp's native Sprints feature, lists per sprint. Stories → subtasks of an epic (parent = epic task), living in the active Sprint list."
- [Story 2.1 §AC #3](./2-1-scaffold-clickup-create-story-skill.md) — `### Sprint-list picker` subsection created with `<!-- story 2.4 will implement -->` breadcrumb.
- [Story 2.2 §Dev Notes: Step file structure](./2-2-prereq-file-check.md) — pattern for YAML frontmatter keys, `## RULES`, `## INSTRUCTIONS` sections, and verbatim error blocks.
- [Story 2.3 §AC #1 frontmatter / §Dev Notes "Variables provided"](./2-3-epic-picker.md) — confirms `{space_id}` and `{space_name}` variable names; documents `{space_name}` as the correct `searchSpaces` search term; establishes `CLICKUP_MCP_MODE` constraint pattern for step RULES.
- [Story 1.4 §Out of Scope](./1-4-space-picker.md) — "Sprint-list and backlog-list pickers belong in EPIC-2 stories 2-3 (epic-picker) and 2-4 (sprint-list-picker)". This story is where that deferred scope lands.
- [EPIC-2 §Stories bullet 5](../epics/EPIC-2-dev-story-creation-clickup.md) — "Implement sprint-list picker: list sprint lists in sprint folder, flag active by date range, present, parse."
- Upstream reference for step file shape: `~/.bmad/cache/git/github.com-Alpharages-BMAD-METHOD-main/src/bmm-skills/4-implementation/bmad-code-review/steps/step-01-gather-context.md`
- Vendored `src/tools/clickup/src/tools/space-tools.ts` — `searchSpaces` implementation (folder tree with lists). Read-only; do not modify.
- Vendored `src/tools/clickup/src/tools/list-tools.ts` — `getListInfo` implementation. Confirm its text output does NOT include `start_date`/`due_date` before implementation (lines 51-105 as of story-creation time).
- Vendored `src/tools/clickup/src/shared/utils.ts:239-315` — `formatSpaceTree` — the function that produces the text returned by `searchSpaces`; confirms date fields are absent from the list entries in the tree response.

## Dev Agent Record

### Agent Model Used

<!-- populated by dev agent on implementation -->

### Debug Log References

<!-- populated by dev agent on implementation -->

### Completion Notes List

<!-- populated by dev agent on implementation -->

### File List

**New**

- `src/custom-skills/clickup-create-story/steps/step-03-sprint-list-picker.md` — step file with sprint-list picker logic and error block templates (AC #1, #3)

**Modified**

- `src/custom-skills/clickup-create-story/workflow.md` — `### Sprint-list picker` section updated (AC #2)

**Deleted**

- (none)

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-22 | Story drafted from EPIC-2 bullet 5 via `bmad-create-story` workflow. Status → ready-for-dev.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-04-22 | Validation pass: fixed `searchSpaces` call signature (use `terms: ["{space_name}"]`); removed impossible date-range detection (vendored `getListInfo` does not expose `start_date`/`due_date`); added `CLICKUP_MCP_MODE` constraint to RULES; updated story 2.3 reference to actual file; updated no-sprint-folder error block to include `{space_name}`; added variables consumed/provided table; added explicit manual folder-ID entry fallback in INSTRUCTIONS step 3; added deferred date-aware flagging to Out of Scope; revised commit body and Dev Notes accordingly. |
