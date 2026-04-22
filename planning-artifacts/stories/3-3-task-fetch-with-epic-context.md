# Story 3.3: Implement task fetch including parent-epic context

Status: review

Epic: [EPIC-3: Dev agent implementation mode → ClickUp (non-destructive)](../epics/EPIC-3-dev-agent-clickup.md)

> Fills the `## Fetch` skeleton left by story 3.1. Adds one step file and updates one section in `workflow.md`. No TypeScript lands; no writes to ClickUp. The fetch logic is a pure `getTaskById` call sequence — reads only.
>
> **Depends on story 3.2 completing first.** The step-context variable `{task_id}` populated by `step-01-task-id-parser.md` is the input to this step. Do not start implementation until story 3.2 is merged.

## Story

As the **bmad-mcp-server platform maintainer**,
I want `src/custom-skills/clickup-dev-implement/workflow.md` to fetch the ClickUp task identified by `{task_id}` and its parent epic (if present) using `getTaskById`,
so that downstream steps (3.4 planning-artifact reader, 3.5 progress-comment poster, 3.6 status-transition helper, and the core implementation loop) have the task name, current status, URL, and parent-epic context available in step-context variables — without any writes to ClickUp.

## Acceptance Criteria

1. `src/custom-skills/clickup-dev-implement/steps/step-02-task-fetch.md` exists and is the canonical source of the fetch logic. It MUST:
   - Have YAML frontmatter with exactly these runtime-population keys (all empty strings, in this order):
     ```yaml
     task_name: ''
     task_status: ''
     task_url: ''
     epic_task_id: ''
     epic_name: ''
     ```
   - Include a `# Step 2: Task Fetch` H1 title.
   - Include a `## RULES` section with all four rules:
     - (a) **Read-only:** This step calls `getTaskById` at most twice (once for the task, once for the parent epic). No ClickUp writes are made in this step.
     - (b) **Must-complete-task:** If the task `getTaskById` call fails (API error or ID rejected by the tool schema), emit the standard task-not-found error block (see AC #3) and **stop** — do not proceed to step 3.
     - (c) **Best-effort-epic:** If `parent_task_id` is absent from the task metadata, or if the second `getTaskById` call fails, emit the epic-context-unavailable warning block (see AC #4), set `{epic_task_id}` and `{epic_name}` to empty strings, and **continue** — the skill proceeds with task context only.
     - (d) **Contract:** `{task_name}`, `{task_status}`, and `{task_url}` MUST be non-empty strings by the time this step completes. `{epic_task_id}` and `{epic_name}` are populated when available, empty strings otherwise.
   - Include an `## INSTRUCTIONS` section with numbered steps:
     1. Call `getTaskById` with `{task_id}` (the normalised bare ID from step 1).
     2. From the response metadata block, extract and store: `{task_name}` ← `name` field, `{task_status}` ← `status` field, `{task_url}` ← `task_url` field. If the call failed (API error block returned), emit the task-not-found error block and stop.
        2b. Note: the `getTaskById` response also includes the task description (rendered markdown) and all task comments in conversation context — no additional extraction is needed. Downstream steps (planning-artifact reader, implementation loop) may reference this content directly from the response.
     3. Check whether `parent_task_id` appears in the metadata block. If absent, emit the epic-context-unavailable warning, leave `{epic_task_id}` and `{epic_name}` as empty strings, and skip to instruction step 6.
     4. Call `getTaskById` with the value of `parent_task_id` to fetch the parent epic.
     5. From the epic response metadata block, extract and store: `{epic_task_id}` ← `task_id` field, `{epic_name}` ← `name` field. If the call failed, emit the epic-context-unavailable warning, leave `{epic_task_id}` and `{epic_name}` as empty strings, and continue to step 6.
     6. Emit the success summary block (see AC #5) and continue to step 3.

2. `src/custom-skills/clickup-dev-implement/workflow.md` — the `## Fetch` section is updated to replace the `<!-- story 3-3 will implement: task fetch + parent-epic context via `getTaskById` -->` breadcrumb with:
   - A one-line description of what the fetch step does (calls `getTaskById` for the task and its parent epic, extracts task name, status, URL, and epic context).
   - `See: [./steps/step-02-task-fetch.md](./steps/step-02-task-fetch.md)`
   - An inline statement: "`{task_name}`, `{task_status}`, `{task_url}`, `{epic_task_id}`, and `{epic_name}` are available to all downstream steps after this step completes. `{epic_task_id}` and `{epic_name}` are empty strings if the task has no parent epic or the parent fetch failed."

   No other sections in `workflow.md` change. Breadcrumbs for stories 3.4–3.8 MUST remain intact.

3. The standard task-not-found error block (referenced in AC #1 rules (b) and instruction step (2)) MUST be quoted verbatim in the step file:

   ```
   ❌ **Task fetch failed — ClickUp API error**

   The `clickup-dev-implement` skill called `getTaskById` with task ID `{task_id}` but received an error response.

   **Possible causes:**
   - The task ID does not exist in ClickUp (verify the ID or URL).
   - The `CLICKUP_API_KEY` token does not have permission to access this task.
   - The task belongs to a different workspace than `CLICKUP_TEAM_ID`.

   **What to do:** Verify the task ID is correct and your ClickUp token has access to it, then re-invoke the Dev agent with a valid task reference.
   ```

4. The epic-context-unavailable warning block (referenced in AC #1 rule (c) and instruction step (3)) MUST be quoted verbatim in the step file:

   ```
   ⚠️ **Epic context unavailable — continuing with task context only**

   The task `{task_id}` ({task_name}) does not have a parent task ID in ClickUp, or the parent-epic fetch failed.

   **Why this is non-fatal:** Parent-epic context is supplemental. The task description, comments, status, and planning artifacts loaded in step 3 are sufficient for implementation.

   **Impact:** Step 3 (planning-artifact reader) will not receive epic-level context from ClickUp. Ensure the task description is self-contained.
   ```

5. The success summary block emitted at the end of successful step execution MUST be quoted verbatim in the step file:

   ```
   ✅ **Task fetch complete**

   - **Task:** {task_name} (`{task_id}`) — status: {task_status}
   - **URL:** {task_url}
   - **Epic:** {epic_name} (`{epic_task_id}`) [or "No parent epic" if epic_task_id is empty]

   Proceeding to step 3 (planning-artifact reader).
   ```

6. `src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md` is byte-unchanged. This step reads `{task_id}` from step 1's context; it MUST NOT modify step 1's file. `git diff -- src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md` MUST be empty.

7. No files under `BMAD-METHOD/` are created, modified, or deleted. `git diff --stat -- BMAD-METHOD/` MUST be empty.

8. No files under `src/tools/clickup/` are created, modified, or deleted. `git diff --stat -- src/tools/clickup/` MUST be empty.

9. No TypeScript source files are added or modified. `git diff --stat -- 'src/**/*.ts'` MUST be empty. This story ships markdown only.

10. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with no new failures vs. the merge commit of story 3.2 (current test baseline: **234 passing**, 0 failing). Since no `.ts` lands, the expected test-count delta is zero.

11. The vendor-tree exclusions added in story 1.1 remain byte-unchanged: `.gitignore` rule `!src/tools/clickup/**`, `tsconfig.json#exclude`, `eslint.config.mjs` `ignores`, `.eslintignore`, `.prettierignore`, and `tests/unit/dependency-audit.test.ts` `VENDORED_PATHS`.

12. The existing `src/custom-skills/clickup-create-story/` skill tree is byte-unchanged. `git diff --stat -- src/custom-skills/clickup-create-story/` MUST be empty.

13. `_bmad/custom/bmad-agent-dev.toml` is byte-unchanged. DS trigger wiring is deferred to story 3.9. `git diff -- _bmad/custom/bmad-agent-dev.toml` MUST be empty.

## Out of Scope (explicitly deferred to later stories)

- Planning-artifact reader (loads `planning-artifacts/PRD.md`, `architecture.md`, optional `tech-spec.md`) → **story 3.4**.
- Progress-comment poster (append-only `addComment` with markdown-formatted milestone updates) → **story 3.5**.
- Status-transition helper (validates target status against list's allowed statuses; transitions in progress → in review → done) → **story 3.6**.
- Non-blocking-assumption comment pattern (posts assumption block as ClickUp comment) → **story 3.7**.
- Dev-facing clarification prompt (asks the dev, never the PM, when blocked) → **story 3.8**.
- `_bmad/custom/bmad-agent-dev.toml` DS-trigger wiring → **story 3.9**.
- Fetching task _subtasks_ — the implementation skill acts on the story task itself, not its subtasks. The `include_subtasks=true` parameter in the underlying API call returns subtask IDs in the metadata, but this step does not recursively fetch them.
- Validating that `parent_task_id` corresponds to an "epic" in ClickUp terms — ClickUp has no built-in "epic" task type; epics are conventional tasks in the Backlog list. This step treats any `parent_task_id` as the epic task and fetches it without type validation.

## Tasks / Subtasks

- [ ] **Task 1 — Create `steps/step-02-task-fetch.md` (AC: #1, #3, #4, #5)**
  - [ ] Create the file with YAML frontmatter (five keys: `task_name`, `task_status`, `task_url`, `epic_task_id`, `epic_name` — all empty strings, in that order), `# Step 2: Task Fetch` H1, `## RULES`, and `## INSTRUCTIONS` sections exactly as specified in AC #1.
  - [ ] Verify `{task_id}` is NOT in the frontmatter — it is inherited from step 1's context, not re-declared here.
  - [ ] Include the verbatim task-not-found error block from AC #3 in the INSTRUCTIONS.
  - [ ] Include the verbatim epic-context-unavailable warning block from AC #4 in the INSTRUCTIONS.
  - [ ] Include the verbatim success summary block from AC #5 at the end of INSTRUCTIONS.
  - [ ] Verify the `## RULES` section includes all four rules: read-only, must-complete-task, best-effort-epic, and contract.

- [ ] **Task 2 — Update `workflow.md` Fetch section (AC: #2)**
  - [ ] Open `src/custom-skills/clickup-dev-implement/workflow.md`.
  - [ ] Replace the single-line HTML-comment breadcrumb under `## Fetch` with the three-item replacement specified in AC #2 (description sentence, `See:` link, variable-availability statement).
  - [ ] Confirm no other sections in `workflow.md` are touched (breadcrumbs for stories 3.4–3.8 MUST remain unchanged).

- [ ] **Task 3 — Verify regression-free (AC: #6–#13)**
  - [ ] `git diff -- src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md` → empty.
  - [ ] `git diff --stat -- BMAD-METHOD/` → empty.
  - [ ] `git diff --stat -- src/tools/clickup/` → empty.
  - [ ] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [ ] `git diff --stat -- src/custom-skills/clickup-create-story/` → empty.
  - [ ] `git diff -- _bmad/custom/bmad-agent-dev.toml` → empty.
  - [ ] `git diff -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty.
  - [ ] `npm run build` → clean.
  - [ ] `npm run lint` → 0 errors. No new findings from `src/custom-skills/`.
  - [ ] `npm run format` → no diff in `src/custom-skills/clickup-dev-implement/`. Run before staging to accept any prettier reformat.
  - [ ] `npm test` → **234 passing**, 0 failing.

- [ ] **Task 4 — Commit (AC: all)**
  - [ ] Stage in this order: `src/custom-skills/clickup-dev-implement/workflow.md`, `src/custom-skills/clickup-dev-implement/steps/step-02-task-fetch.md`.
  - [ ] Commit message: `feat(custom-skills): implement task-fetch step in clickup-dev-implement`
  - [ ] Body:

    ```
    Add step-02-task-fetch.md to fetch the ClickUp task and its parent epic
    (if present) via getTaskById. Populates task_name, task_status, task_url,
    epic_task_id, and epic_name in step context for downstream steps (3.4+).

    Epic fetch is best-effort: absent parent_task_id or API failure emits a
    warning block and continues — implementation proceeds with task context only.

    Out of scope (deferred): planning-artifact reader (3.4), progress-comment
    poster (3.5), status-transition helper (3.6), assumption pattern (3.7),
    dev-clarification prompt (3.8), bmad-agent-dev.toml DS-trigger wiring (3.9).

    Refs: EPIC-3, story 3-3-task-fetch-with-epic-context.
    ```

## Dev Notes

### Why `getTaskById` is called twice

In the EPIC-3 model, a "story" is a ClickUp subtask of an "epic" task. The `getTaskById` response includes `parent_task_id` in its metadata block when the task has a parent (`src/tools/clickup/src/tools/task-tools.ts:351–353`):

```ts
if (typeof task.parent === 'string') {
  metadataLines.push(`parent_task_id: ${task.parent}`);
}
```

To fetch the epic's name and description, a second `getTaskById` call is made with `parent_task_id`. There is no separate "get parent task" tool in the vendored ClickUp MCP; re-calling `getTaskById` IS the epic fetch.

### `parent_task_id` is conditional, not always present

The `parent_task_id` line only appears in the metadata block when `task.parent` is a string. For root-level tasks (tasks that are not subtasks), `task.parent` is `null` or absent, and `parent_task_id` does not appear in the metadata. The step must check for its presence and treat absence as the "task is not a subtask" case — non-fatal.

### `getTaskById` ID validation constraint

The vendored tool schema validates the `id` parameter as `z.string().min(6).max(9)` — only 6–9 alphanumeric chars accepted. Step 1's parser validates non-empty alphanumeric but does not enforce length. In practice ClickUp IDs are always in the 6–9 range; a failure here is rare and is handled by the task-not-found error block. The `parent_task_id` from a live task's metadata is always a valid ClickUp ID; a failure there falls into the best-effort-epic path.

### `CLICKUP_MCP_MODE` requirements for this step

`getTaskById` is registered in all three modes (`read-minimal`, `read`, `write`), as shown in `src/tools/clickup-adapter.ts:174–204`. This step requires no special mode — it works in any mode where the MCP server is running. The `write` mode constraint enters at story 3.5 (progress-comment poster) and 3.6 (status-transition helper).

### Why epic context is best-effort, not mandatory

PRD §FR #5 frames the fetch as "fetches description + comments + status + parent epic context". EPIC-3 §Outcomes describes the parent epic as "additional context". A developer may invoke the skill on a standalone ClickUp task (not a subtask of anything), in which case `parent_task_id` is absent and the skill must still proceed. Making epic fetch non-fatal preserves this standalone-task use case.

### Step-context variable contract for downstream steps

After step 2 completes successfully, downstream steps can rely on:

- `{task_name}` — non-empty string (e.g. `"Implement task fetch"`)
- `{task_status}` — non-empty string (e.g. `"in progress"`)
- `{task_url}` — non-empty URL string (e.g. `"https://app.clickup.com/t/86abc123"`)
- `{epic_task_id}` — bare task ID string, or empty string if no parent
- `{epic_name}` — string, or empty string if no parent

Steps 3–8 must handle empty `{epic_task_id}` and `{epic_name}` gracefully. The story-3.4 author will document how the planning-artifact reader behaves when these are absent.

`epic_description_markdown` is intentionally not a frontmatter variable — the full epic `getTaskById` response (including its description) is in conversation context and downstream steps may read it directly. Storing large markdown content in a frontmatter variable is impractical and redundant.

### Step file naming convention for EPIC-3 (reminder from story 3.1)

| Step file                             | Created by story | Execution order |
| ------------------------------------- | ---------------- | --------------- |
| `step-01-task-id-parser.md`           | 3.2              | 1               |
| **`step-02-task-fetch.md`**           | **3.3 (this)**   | **2**           |
| `step-03-planning-artifact-reader.md` | 3.4              | 3               |
| `step-04-progress-comment-poster.md`  | 3.5              | 4               |
| `step-05-status-transition.md`        | 3.6              | 5               |
| `step-06-assumptions.md`              | 3.7              | 6               |
| `step-07-dev-clarification.md`        | 3.8              | 7               |

Story 3.4 MUST add `step-03-planning-artifact-reader.md`.

### Tooling interaction

- **tsc**: `src/custom-skills/` contains only markdown. No new exclude entry needed.
- **ESLint**: flat config targets `**/*.{ts,tsx,js,mjs,cjs}`. Markdown is out of scope by default. No change.
- **Prettier**: Will format the new `.md` files. Run `npm run format` before staging to avoid lint-staged rewrites on commit.
- **Vitest**: Scans `tests/**/*.{test,spec}.ts`. Nothing under `src/custom-skills/` is picked up.
- **Dep-audit test**: Scans `src/**/*.ts`. No `.ts` in this story — no new dep-audit findings.

### References

- [EPIC-3 §Stories bullet 3](../epics/EPIC-3-dev-agent-clickup.md) — "Implement task fetch including parent-epic context".
- [EPIC-3 §Outcomes](../epics/EPIC-3-dev-agent-clickup.md) — "Fetches task description, comments, status, and parent epic (for additional context)."
- [Story 3.1 §Acceptance Criteria #3](./3-1-scaffold-clickup-dev-implement-skill.md) — `## Fetch` section created with the breadcrumb this story replaces.
- [Story 3.1 §Dev Notes: Step file naming convention](./3-1-scaffold-clickup-dev-implement-skill.md) — `step-02-task-fetch.md` is step 2.
- [Story 3.2](./3-2-task-id-parser.md) — `step-01-task-id-parser.md` provides `{task_id}` to this step.
- `src/tools/clickup/src/tools/task-tools.ts:351–353` — `parent_task_id` conditional in `generateTaskMetadata`.
- `src/tools/clickup-adapter.ts:174–204` — `getTaskById` registration across all three modes.
- [PRD §Functional requirements #5](../PRD.md) — "Dev agent accepts a ClickUp task ID, fetches description + comments + status + parent epic context…"

## Dev Agent Record

### Agent Model Used

(to be filled by implementing agent)

### Debug Log References

(to be filled by implementing agent)

### Completion Notes List

(to be filled by implementing agent)

### File List

**New**

- `src/custom-skills/clickup-dev-implement/steps/step-02-task-fetch.md` — step file with fetch rules, instructions, and verbatim error/warning/success blocks (AC #1, #3, #4, #5)

**Modified**

- `src/custom-skills/clickup-dev-implement/workflow.md` — `## Fetch` section updated (AC #2)

**Deleted**

- (none expected)

### Review Findings

(to be filled during code review)

## Change Log

| Date       | Change                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------- |
| 2026-04-22 | Story drafted from EPIC-3 bullet 3 via `bmad-create-story` workflow. Status → ready-for-dev. |
