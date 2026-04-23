# Story 3.6: Implement status-transition helper

Status: done

Epic: [EPIC-3: Dev agent implementation mode → ClickUp (non-destructive)](../epics/EPIC-3-dev-agent-clickup.md)

> Fills the `## Status Transitions` skeleton left by story 3.1. Adds one step file and updates one section in `workflow.md`. No TypeScript lands. The helper validates the target status ("in review") against the list's allowed statuses via `getListInfo`, then calls `updateTask` to transition the task. The transition is **non-blocking** — if write mode is unavailable or the call fails, the skill continues without halting.
>
> **Depends on story 3.5 completing first.** Step 5 is invoked after the M2 progress comment (Template B says "Next: Status transition to In Review (step 5)"). Context variables (`{task_id}`, `{task_status}`, `{list_id}`) from steps 1–2 must be in the conversation context before step 5 runs. Do not start implementation until story 3.5 is merged.

## Story

As the **bmad-mcp-server platform maintainer**,
I want `src/custom-skills/clickup-dev-implement/workflow.md` to transition the ClickUp task status from `in progress` to `in review` after implementation is complete, by calling `getListInfo` to discover valid statuses and then `updateTask` to apply the transition,
so that ClickUp reflects the real state of the work and the team knows the story is ready for review without anyone manually updating the ticket.

## Acceptance Criteria

1. `src/custom-skills/clickup-dev-implement/steps/step-05-status-transition.md` exists and is the canonical source of the status-transition logic. It MUST:
   - Have YAML frontmatter with exactly these runtime-population keys (all empty strings, in this order):
     ```yaml
     list_id: ''
     list_statuses: ''
     transition_target: ''
     ```
   - Include a `# Step 5: Status Transition Helper` H1 title.
   - Include a `## RULES` section with all four rules:
     - (a) **Write-mode soft gate:** If `updateTask` is not in the current tool list (`CLICKUP_MCP_MODE` is not `write`), emit the mode-unavailable warning block (see AC #3), and **continue** — status transitions are supplemental; their absence does not block the skill from completing.
     - (b) **Validate before transitioning:** Always call `getListInfo` first to retrieve the list's allowed statuses. Store the result in `{list_statuses}`. Never call `updateTask` with a status name that does not appear in `{list_statuses}` — if no valid match is found, emit the status-mismatch warning block (see AC #4) and **continue**.
     - (c) **Non-blocking failures:** If the `updateTask` call returns an error, emit the transition-failed warning block (see AC #5) and **continue** — the skill does not halt on a status-transition failure.
     - (d) **Single transition per session:** Step 5 is invoked exactly once per session — after the M2 milestone (implementation complete). It is not re-invoked during the same session. `{transition_target}` is set to the matched status name and `{list_id}` is set from the step 2 task-fetch response.

2. `src/custom-skills/clickup-dev-implement/workflow.md` — the `## Status Transitions` section is updated to replace the `<!-- story 3-6 will implement: validates target status, transitions in progress → in review → done -->` breadcrumb with:
   - A one-line description of what the status-transition helper does (invoked after M2; calls `getListInfo` to validate the target status, then calls `updateTask` to transition the task to "in review"; non-blocking if write mode is unavailable or `updateTask` fails).
   - `See: [./steps/step-05-status-transition.md](./steps/step-05-status-transition.md)`
   - An inline statement: "`{list_id}`, `{list_statuses}`, and `{transition_target}` are available to downstream steps after this step completes. `{transition_target}` is `''` (empty) if write mode was unavailable or no valid status match was found."

   No other sections in `workflow.md` change. The `## Input`, `## Fetch`, `## Planning Artifacts`, `## Progress Comments` sections (from stories 3.2–3.5) and breadcrumbs for stories 3.7–3.8 MUST remain intact.

3. The mode-unavailable warning block (referenced in AC #1 rule (a) and instruction step (1)) MUST be quoted verbatim in the step file:

   ```
   ⚠️ **Status transition skipped — write mode not active**

   The `clickup-dev-implement` skill requires `CLICKUP_MCP_MODE=write` to transition task status. The `updateTask` tool is not available in the current tool list.

   **Impact:** Task `{task_id}` ({task_name}) will remain in its current status (`{task_status}`). The skill has completed implementation; please manually transition the task to "in review" in ClickUp.

   **What to do (optional):** Set `CLICKUP_MCP_MODE=write` and restart the MCP server to enable automatic status transitions in future sessions.
   ```

4. The status-mismatch warning block (referenced in AC #1 rule (b) and instruction step (4)) MUST be quoted verbatim in the step file:

   ```
   ⚠️ **Status transition skipped — no "in review" status found in list**

   The `clickup-dev-implement` skill called `getListInfo` for list `{list_id}` but could not find a status matching "in review" (case-insensitive) in the list's allowed statuses.

   **Available statuses:** {list_statuses}

   **Impact:** Task `{task_id}` ({task_name}) will remain in its current status (`{task_status}`). Please manually transition the task to the appropriate review status in ClickUp.

   **What to do (optional):** Ensure the sprint list contains an "in review" (or equivalent) status, then re-run the transition manually.
   ```

5. The transition-failed warning block (referenced in AC #1 rule (c) and instruction step (6)) MUST be quoted verbatim in the step file:

   ```
   ⚠️ **Status transition failed — continuing without updating task status**

   The `clickup-dev-implement` skill called `updateTask` for task `{task_id}` with status `{transition_target}` but received an error.

   **Impact:** Task `{task_id}` ({task_name}) remains in its current status (`{task_status}`). Implementation is complete; please manually transition the task to "in review" in ClickUp.

   **What to do (optional):** Verify that `CLICKUP_API_KEY` has permission to update this task, then manually set the status to `{transition_target}` in ClickUp if needed.
   ```

6. The `## INSTRUCTIONS` section MUST contain exactly these numbered steps:
   1. **Check write mode.** Verify whether `updateTask` is available in the current tool list. If absent, emit the mode-unavailable warning block, leave `{transition_target}` as `''`, and skip steps 2–6. Continue to the next workflow step.
   2. **Extract list ID.** Read the task-fetch metadata from step 2 that is already in conversation context. Locate the `list:` line (format: `list: Name (ID)`) and extract the ID from inside the parentheses. Store it as `{list_id}`. Example: `list: Sprint 1 (86abc123)` → `{list_id}` = `86abc123`.
   3. **Fetch allowed statuses.** Call `getListInfo` with `list_id` = `{list_id}`. From the response, extract the `Valid status names` line and store the comma-separated list as `{list_statuses}`.
   4. **Validate target status.** Search `{list_statuses}` for a case-insensitive match to "in review". If no match is found, emit the status-mismatch warning block, leave `{transition_target}` as `''`, and skip steps 5–6. Continue to the next workflow step.
   5. **Set transition target.** Store the exact matched status name (preserving the casing returned by `getListInfo`) as `{transition_target}`.
   6. **Transition the task.** Call `updateTask` with `task_id` = `{task_id}` and `status` = `{transition_target}`. If `updateTask` returns successfully, emit the success block and continue to the next workflow step. If `updateTask` returns an error, emit the transition-failed warning block and continue to the next workflow step — do not halt.

7. The success block (referenced in AC #6 instruction step (7)) MUST be quoted verbatim in the step file:

   ```
   ✅ **Status transition complete**

   - **Task:** {task_name} (`{task_id}`)
   - **Previous status:** {task_status}
   - **New status:** {transition_target}
   - **URL:** {task_url}

   Task is now in review. Implementation session complete.
   ```

8. `src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md`, `step-02-task-fetch.md`, `step-03-planning-artifact-reader.md`, and `step-04-progress-comment-poster.md` are byte-unchanged. `git diff -- src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md src/custom-skills/clickup-dev-implement/steps/step-02-task-fetch.md src/custom-skills/clickup-dev-implement/steps/step-03-planning-artifact-reader.md src/custom-skills/clickup-dev-implement/steps/step-04-progress-comment-poster.md` MUST be empty.

9. No files under `BMAD-METHOD/` are created, modified, or deleted. `git diff --stat -- BMAD-METHOD/` MUST be empty.

10. No files under `src/tools/clickup/` are created, modified, or deleted. `git diff --stat -- src/tools/clickup/` MUST be empty.

11. No TypeScript source files are added or modified. `git diff --stat -- 'src/**/*.ts'` MUST be empty. This story ships markdown only.

12. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with no new failures vs. the merge commit of story 3.5 (current test baseline: **234 passing**, 0 failing). Since no `.ts` lands, the expected test-count delta is zero.

13. The vendor-tree exclusions added in story 1.1 remain byte-unchanged: `.gitignore` rule `!src/tools/clickup/**`, `tsconfig.json#exclude`, `eslint.config.mjs` `ignores`, `.eslintignore`, `.prettierignore`, and `tests/unit/dependency-audit.test.ts` `VENDORED_PATHS`.

14. The existing `src/custom-skills/clickup-create-story/` skill tree is byte-unchanged. `git diff --stat -- src/custom-skills/clickup-create-story/` MUST be empty.

15. `_bmad/custom/bmad-agent-dev.toml` is byte-unchanged. DS trigger wiring is deferred to story 3.9. `git diff -- _bmad/custom/bmad-agent-dev.toml` MUST be empty.

## Out of Scope (explicitly deferred to later stories)

- Transitioning to `done` after code review — that belongs to the `bmad-code-review` workflow or a future story.
- Non-blocking assumption comment pattern → **story 3.7**.
- Dev-facing clarification prompt → **story 3.8**.
- `_bmad/custom/bmad-agent-dev.toml` DS-trigger wiring → **story 3.9**.
- Fuzzy-matching status names beyond case-insensitive "in review" — if the list uses a non-standard review status name, the warning block guides the dev to fix it manually.
- Polling or retrying the `updateTask` call — one attempt, non-blocking on failure.

## Tasks / Subtasks

- [ ] **Task 1 — Create `steps/step-05-status-transition.md` (AC: #1, #3, #4, #5, #6, #7)**
  - [ ] Create the file with YAML frontmatter (`list_id: ''`, `list_statuses: ''`, `transition_target: ''` — in that order), `# Step 5: Status Transition Helper` H1, `## RULES`, and `## INSTRUCTIONS` sections exactly as specified in AC #1, #6.
  - [ ] Verify the `## RULES` section includes all four rules: write-mode soft gate, validate-before-transitioning, non-blocking failures, single-transition-per-session.
  - [ ] Include the verbatim mode-unavailable warning block from AC #3.
  - [ ] Include the verbatim status-mismatch warning block from AC #4.
  - [ ] Include the verbatim transition-failed warning block from AC #5.
  - [ ] Include the verbatim success block from AC #7.
  - [ ] Include the `## INSTRUCTIONS` numbered steps exactly as specified in AC #6 (6 steps).

- [ ] **Task 2 — Update `workflow.md` Status Transitions section (AC: #2)**
  - [ ] Open `src/custom-skills/clickup-dev-implement/workflow.md`.
  - [ ] Replace the single-line HTML-comment breadcrumb under `## Status Transitions` with the three-item replacement specified in AC #2 (description sentence, `See:` link, variable-availability statement).
  - [ ] Confirm no other sections in `workflow.md` are touched (breadcrumbs for stories 3.7–3.8 MUST remain unchanged).

- [ ] **Task 3 — Verify regression-free (AC: #8–#15)**
  - [ ] `git diff -- src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md step-02-task-fetch.md step-03-planning-artifact-reader.md step-04-progress-comment-poster.md` → empty.
  - [ ] `git diff --stat -- BMAD-METHOD/` → empty.
  - [ ] `git diff --stat -- src/tools/clickup/` → empty.
  - [ ] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [ ] `git diff --stat -- src/custom-skills/clickup-create-story/` → empty.
  - [ ] `git diff -- _bmad/custom/bmad-agent-dev.toml` → empty.
  - [ ] `git diff -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty.
  - [ ] `npm run build` → clean.
  - [ ] `npm run lint` → 0 errors.
  - [ ] `npm run format` → no diff in `src/custom-skills/clickup-dev-implement/`. Run before staging to accept any prettier reformat.
  - [ ] `npm test` → no new failures vs. current baseline (234 passing).

- [ ] **Task 4 — Commit (AC: all)**
  - [ ] Stage in this order: `src/custom-skills/clickup-dev-implement/workflow.md`, `src/custom-skills/clickup-dev-implement/steps/step-05-status-transition.md`.
  - [ ] Commit message: `feat(custom-skills): implement status-transition helper step in clickup-dev-implement`
  - [ ] Body:

    ```
    Add step-05-status-transition.md defining the status-transition helper
    that validates the target status ("in review") against the list's allowed
    statuses via getListInfo, then calls updateTask to transition the task.
    Invoked exactly once per session after the M2 milestone (implementation
    complete). Updates workflow.md ## Status Transitions section with step
    reference and variable contract (list_id, list_statuses, transition_target).

    updateTask requires CLICKUP_MCP_MODE=write. Step 5 uses a soft gate: if
    updateTask is unavailable, a warning is emitted and the transition is
    skipped without halting the skill. updateTask failures and status-name
    mismatches are similarly non-blocking.

    Out of scope (deferred): non-blocking assumption pattern (3.7),
    dev-clarification prompt (3.8), bmad-agent-dev.toml wiring (3.9).

    Refs: EPIC-3, story 3-6-status-transition-helper.
    ```

## Dev Notes

### Why `getListInfo` before `updateTask`

`updateTask` silently rejects invalid status names (the ClickUp API returns an error rather than a list of valid alternatives). Without pre-validation, a mismatch produces a generic failure with no hint about what the valid statuses are. Calling `getListInfo` first lets the step emit a useful warning that includes the available options, making the failure immediately actionable for the dev.

### Why the target is "in review" not "review"

EPIC-3 and PRD §Success criteria describe the transition as "in progress → in review → done". The ClickUp default status set uses "in review" (two words). The step uses case-insensitive matching to handle lists where the status is spelled "In Review" or "IN REVIEW". If the list uses a non-standard name (e.g. just "review"), the mismatch warning lists the available options so the dev can identify the correct name.

### Extracting `list_id` from conversation context

`getTaskById` (step 2) returns a metadata block that includes the line `list: Name (ID)`. The step extracts the ID (alphanumeric, inside the parentheses) without making another API call. This avoids a redundant `getTaskById` call and keeps the step lightweight. The step file should include an example extraction note, e.g.:

> "The step 2 metadata block contains a line like `list: Sprint 1 (86abc123)`. Extract the value inside the parentheses — `86abc123` — and store it as `{list_id}`."

### `updateTask` status parameter constraints

`updateTask` (registered in `src/tools/clickup/src/tools/task-write-tools.ts`) accepts:

- `task_id`: **6–9 character alphanumeric string** (Zod schema: `z.string().min(6).max(9)`). Same constraint as `addComment` — if the ID falls outside 6–9 characters, the call fails and rule (c)'s non-blocking path handles it.
- `status`: string — must exactly match a valid status name from the list (as returned by `getListInfo`'s "Valid status names" line). The match is case-sensitive at the API level; the step finds the correct casing via `getListInfo` before calling `updateTask`.

Only `task_id` and `status` are set by this step. All other `updateTask` parameters (`name`, `append_description`, `priority`, etc.) are omitted.

### Soft gate vs. hard gate

Consistent with step 4's philosophy: status transitions are a supplemental ClickUp side-channel. The primary output of the skill is code changes. If the transition fails, the code is already committed and the PR exists — the dev can manually update the ClickUp status with no risk of lost work. A hard gate here would leave the dev stranded after a complete implementation just because of a ClickUp permission issue.

### `getListInfo` is read-only

`getListInfo` is registered in `src/tools/clickup/src/tools/list-tools.ts` and is available in all `CLICKUP_MCP_MODE` values (`read-minimal`, `read`, `write`). However, since we gate the entire step on write-mode availability (rule (a)), `getListInfo` is only called when write mode is active and `updateTask` is available.

### Step file naming convention for EPIC-3 (reminder)

| Step file                             | Created by story | Execution order |
| ------------------------------------- | ---------------- | --------------- |
| `step-01-task-id-parser.md`           | 3.2              | 1               |
| `step-02-task-fetch.md`               | 3.3              | 2               |
| `step-03-planning-artifact-reader.md` | 3.4              | 3               |
| `step-04-progress-comment-poster.md`  | 3.5              | 4 (M1, M2, M3+) |
| **`step-05-status-transition.md`**    | **3.6 (this)**   | **5 (post-M2)** |
| `step-06-assumptions.md`              | 3.7              | 6               |
| `step-07-dev-clarification.md`        | 3.8              | 7               |

Story 3.7 MUST add `step-06-assumptions.md`.

### Tooling interaction

- **tsc**: `src/custom-skills/` contains only markdown. No new exclude entry needed.
- **ESLint**: flat config targets `**/*.{ts,tsx,js,mjs,cjs}`. Markdown is out of scope by default. No change.
- **Prettier**: Will format the new `.md` file. Run `npm run format` before staging to avoid lint-staged rewrites on commit.
- **Vitest**: Scans `tests/**/*.{test,spec}.ts`. Nothing under `src/custom-skills/` is picked up.
- **Dep-audit test**: Scans `src/**/*.ts`. No `.ts` in this story — no new dep-audit findings.

### CLICKUP_MCP_MODE requirements for this step

`updateTask` is registered in `src/tools/clickup/src/tools/task-write-tools.ts` and exposed only when `CLICKUP_MCP_MODE=write`. In `read-minimal` or `read` mode, `updateTask` is absent from the tool list. Step 5 must check tool availability at invocation time (rule (a)) before attempting any API call.

### References

- [EPIC-3 §Stories bullet 6](../epics/EPIC-3-dev-agent-clickup.md) — "Implement status-transition helper (validates target status against list's allowed statuses)".
- [EPIC-3 §Outcomes](../epics/EPIC-3-dev-agent-clickup.md) — "Posts progress/decision comments at milestones; transitions status (in progress → in review → done)."
- [PRD §FR #5](../PRD.md) — "Dev agent accepts a ClickUp task ID, fetches description + comments + status + parent epic context, reads repo `planning-artifacts/*`, implements code, posts progress comments, and transitions status."
- [PRD §FR #6](../PRD.md) — "Humans own ticket _description_; agents write only via _comments_ and _status_." (Mandates `updateTask` status field, not description.)
- [PRD §Success criteria](../PRD.md) — "status set to In Review" as the terminal state of a dev-agent implementation session.
- [Story 3.1 §Acceptance Criteria #4](./3-1-scaffold-clickup-dev-implement-skill.md) — `## Status Transitions` section created with the breadcrumb this story replaces.
- [Story 3.5 §Dev Notes: Step file naming convention](./3-5-progress-comment-poster.md) — confirms `step-05-status-transition.md` as the filename for this story.
- [Story 3.5 §Acceptance Criteria #6 Template B](./3-5-progress-comment-poster.md) — "Next: Status transition to In Review (step 5)" — the M2 comment that triggers this step.
- [`src/tools/clickup/src/tools/task-write-tools.ts`](../../src/tools/clickup/src/tools/task-write-tools.ts) — `updateTask` registration, schema, and status parameter.
- [`src/tools/clickup/src/tools/list-tools.ts`](../../src/tools/clickup/src/tools/list-tools.ts) — `getListInfo` registration, response format including "Valid status names" line.

## Dev Agent Record

### Agent Model Used

(to be filled by implementing agent)

### Debug Log References

(to be filled by implementing agent)

### Completion Notes List

(to be filled by implementing agent)

### File List

**New**

- `src/custom-skills/clickup-dev-implement/steps/step-05-status-transition.md` — step file with rules, instructions, and all warning/success blocks (AC #1, #3–#7)

**Modified**

- `src/custom-skills/clickup-dev-implement/workflow.md` — `## Status Transitions` section updated (AC #2)

**Deleted**

- (none expected)

### Review Findings

(to be filled during code review)

## Change Log

| Date       | Change                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------- |
| 2026-04-23 | Story drafted from EPIC-3 bullet 6 via `bmad-create-story` workflow. Status → ready-for-dev. |
