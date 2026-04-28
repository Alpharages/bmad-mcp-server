# Story 2.6: Create ClickUp task (subtask of epic in selected sprint list)

Status: done

Epic: [EPIC-2: Dev agent story-creation mode → ClickUp (non-destructive)](../epics/EPIC-2-dev-story-creation-clickup.md)

> Fills the `## Task Creation` skeleton left by story 2.1. Adds one step file (`step-05-create-task.md`) and updates one section of `workflow.md`. This is the first — and only — write step in the `clickup-create-story` skill: it checks for duplicate tasks in the target sprint list, presents a pre-creation confirmation summary, then calls `createTask` with the parameters collected by steps 01–04 (`{sprint_list_id}`, `{story_title}`, `{task_description}`, `{epic_id}`), and stores `{created_task_id}` and `{created_task_url}` from the response.
>
> **Depends on stories 2.1 through 2.5 completing first.** The `{sprint_list_id}`, `{sprint_list_name}`, `{epic_id}`, `{epic_name}`, `{story_title}`, and `{task_description}` variables needed by this step are populated by steps 01–04. The step file slot `step-05-create-task.md` must land after `step-04-description-composer.md` to preserve execution order. Do not start implementation until story 2.5 is merged.

## Story

As the **bmad-mcp-server platform maintainer**,
I want `src/custom-skills/clickup-create-story/workflow.md` to include a working task-creation step — backed by `steps/step-05-create-task.md` — that validates all required context, checks for duplicate tasks in the target sprint list, presents a pre-creation summary, calls `createTask({ list_id: {sprint_list_id}, name: {story_title}, description: {task_description}, parent_task_id: {epic_id} })`, and confirms the created task's ID and URL,
so that the `clickup-create-story` skill completes end-to-end story creation in ClickUp — matching PRD §Functional requirements #2 ("creates ClickUp tasks with rich, PRD+architecture-derived descriptions") and §Non-functional requirements ("does not create duplicate stories") — without manual ClickUp interaction from the user.

## Acceptance Criteria

1. `src/custom-skills/clickup-create-story/steps/step-05-create-task.md` exists and is the canonical source of the task-creation logic. It MUST:
   - Have YAML frontmatter with exactly two runtime-population keys:
     ```yaml
     created_task_id: ''
     created_task_url: ''
     ```
     Both empty strings; set during execution from the `createTask` response. Downstream steps (story 2.7 wiring, story 2.8 regression check) may read `{created_task_id}` and `{created_task_url}` by name; exact key spelling matters.
   - Include a `# Step 5: Task Creation` H1 title.
   - Include a `## RULES` section with:
     (a) a mode requirement rule — `CLICKUP_MCP_MODE` MUST be `write`; `createTask` is only registered in `write` mode. If the mode is `read-minimal` or `read`, emit the mode error block (AC #3) and stop immediately.
     (b) a one-shot write rule — `createTask` is called exactly once per skill execution. The step MUST NOT retry on a successful response and MUST NOT call `createTask` a second time for any reason (not on re-presentation, not on network retry).
     (c) a duplicate-check rule — before calling `createTask`, the step MUST call `searchTasks({ terms: ["{story_title}"], list_ids: ["{sprint_list_id}"] })` and scan the results for a task whose name matches `{story_title}` exactly (case-insensitive). If a match is found, emit the duplicate warning (AC #4) and require the user to type the literal character `y` (lower-case) to proceed; any other input (including Enter alone) aborts.
     (d) a blocking-on-error rule — if `createTask` returns an error response (i.e., the response text contains `Error creating task:` or the `task_id:` line is absent), emit the standard creation-error block (AC #5), surface the raw error text, and stop. MUST NOT silently proceed or produce a partial success message.
   - Include an `## INSTRUCTIONS` section with numbered steps that:
     1. Verify that `{sprint_list_id}`, `{sprint_list_name}`, `{epic_id}`, `{epic_name}`, `{story_title}`, and `{task_description}` are all non-empty. If any are missing, emit the standard missing-context error block (see AC #3) and stop.
     2. Present the pre-creation summary (see AC #2 template):
        ```
        📋 **Task creation summary**
        - Title: **{story_title}**
        - List: **{sprint_list_name}** (`{sprint_list_id}`)
        - Parent epic: **{epic_name}** (`{epic_id}`)
        - Description: composed ✓
        ```
     3. Call `searchTasks` with `terms: ["{story_title}"]` and `list_ids: ["{sprint_list_id}"]`. Scan the returned tasks for a name that matches `{story_title}` case-insensitively. If a match is found, emit the duplicate warning (AC #4), capturing the existing task's ID and URL from the search result. Wait for user input: if the user types `y`, continue to step 4; otherwise emit `❌ Task creation cancelled — duplicate detected.` and stop.
     4. Ask: `Confirm creating this ClickUp task? [Y/n]` Default answer is Y (proceed if user presses Enter). If the user types `n`, emit `❌ Task creation cancelled by user.` and stop.
     5. Call `createTask` with exactly these parameters and no others:
        - `list_id: "{sprint_list_id}"`
        - `name: "{story_title}"`
        - `description: "{task_description}"`
        - `parent_task_id: "{epic_id}"`

        Do NOT pass `status`, `priority`, `assignees`, `due_date`, `start_date`, `time_estimate`, or `tags` — let ClickUp apply list defaults so the team lead can configure them in the UI after creation.

     6. Parse the `createTask` response text:
        - Extract the value after `task_id:` as `{created_task_id}`.
        - Extract the value after `url:` as `{created_task_url}`.
        - If `task_id:` is absent or the response begins with `Error creating task:`, emit the standard creation-error block (AC #5) with the raw response text and stop.
     7. Set `{created_task_id}` and `{created_task_url}` from the parsed values.
     8. Emit the success confirmation (see AC #6 template) and end the workflow.

2. The pre-creation summary (AC #1 step 2) MUST follow this exact template (rendered when the step begins):

   ```
   📋 **Task creation summary**
   - Title: **{story_title}**
   - List: **{sprint_list_name}** (`{sprint_list_id}`)
   - Parent epic: **{epic_name}** (`{epic_id}`)
   - Description: composed ✓
   ```

3. The standard error blocks referenced in AC #1 MUST follow these exact templates (quoted verbatim in the step file):

   **Mode error block** (AC #1 rule a):

   ```
   ❌ **Task creation failed — write mode required**

   The `clickup-create-story` skill requires `CLICKUP_MCP_MODE=write` to create tasks. The current mode does not register `createTask`.

   **Why:** `createTask` is only registered in `write` mode. Steps 2 and 3 also require at least `read` mode for `searchSpaces`. The minimum mode for the full skill is `write`.

   **What to do:** Set `CLICKUP_MCP_MODE=write` in your environment and restart the MCP server, then re-invoke the skill from step 1.
   ```

   **Missing-context error block** (AC #1 step 1):

   ```
   ❌ **Task creation failed — missing upstream context**

   The `clickup-create-story` skill requires the following variables to be set before the task can be created:

   - `{sprint_list_id}` — {MISSING or present}  (set by step 3: sprint-list picker)
   - `{sprint_list_name}` — {MISSING or present}  (set by step 3: sprint-list picker)
   - `{epic_id}` — {MISSING or present}  (set by step 2: epic picker)
   - `{epic_name}` — {MISSING or present}  (set by step 2: epic picker)
   - `{story_title}` — {MISSING or present}  (set by step 4: description composer)
   - `{task_description}` — {MISSING or present}  (set by step 4: description composer)

   **Why:** All six variables are required parameters for `createTask`. Without them, the task cannot be created or will be created with incomplete data.

   **What to do:** Re-run from step 1 to ensure all prerequisite steps have completed successfully, then return to this step.
   ```

   The step file MUST quote both blocks verbatim (not paraphrase) so reviewers can verify the exact wording. Replace `{MISSING or present}` with the actual runtime status of each variable.

4. The duplicate warning block (AC #1 step 3) MUST follow this exact template (verbatim in the step file):

   ```
   ⚠️ **Duplicate task detected**

   A task named "{story_title}" already exists in **{sprint_list_name}** (`{sprint_list_id}`).
   Existing task: `{existing_task_id}` — {existing_task_url}

   **Creating a second task with the same name may cause confusion.**

   Type `y` to create a duplicate anyway, or press Enter to abort. [y/N]
   ```

   Replace `{existing_task_id}` and `{existing_task_url}` with the actual values from the `searchTasks` result at runtime.

5. The standard creation-error block (AC #1 rule d and step 6) MUST follow this exact template (verbatim in the step file):

   ```
   ❌ **Task creation failed — ClickUp API error**

   `createTask` returned an error response. Raw error:

   {raw_error_text}

   **Why:** The ClickUp API rejected the request. Common causes: invalid `list_id`, invalid `parent_task_id`, insufficient token permissions, or a transient network error.

   **What to do:** Review the error above. If the list or epic IDs are incorrect, re-run steps 2–3 to re-select them. If the error indicates a permission issue, check that your `CLICKUP_API_KEY` token has create-task permission on the target list (story 2.9 will add explicit gating). To retry, re-invoke step 5 after resolving the underlying issue.
   ```

   Replace `{raw_error_text}` with the full text of the `createTask` response.

6. The success confirmation (AC #1 step 8) MUST follow this exact template (verbatim in the step file):

   ```
   ✅ **ClickUp story created successfully!**
   - Task: **{story_title}**
   - Task ID: `{created_task_id}`
   - URL: {created_task_url}
   - Parent epic: **{epic_name}** (`{epic_id}`)
   - Sprint list: **{sprint_list_name}**

   Open the task in ClickUp: {created_task_url}
   ```

7. `src/custom-skills/clickup-create-story/workflow.md` — the `## Task Creation` section is updated to replace the `<!-- story 2.6 will implement -->` breadcrumb with:
   - A one-line description of what step 5 does (validate context → check for duplicates via `searchTasks` → confirm with user → call `createTask` → store `{created_task_id}` and `{created_task_url}`).
   - A `See: [./steps/step-05-create-task.md](./steps/step-05-create-task.md)` pointer.
   - An inline rule: "Step 5 is the terminal step of the skill. If `createTask` returns an error, the step surfaces it and stops — it does not retry silently."
     No other sections in `workflow.md` change.

8. No files under `BMAD-METHOD/` are created, modified, or deleted. `git diff --stat -- BMAD-METHOD/` MUST be empty.
9. No files under `src/tools/clickup/` are created, modified, or deleted. `git diff --stat -- src/tools/clickup/` MUST be empty.
10. No TypeScript source files are added or modified. `git diff --stat -- 'src/**/*.ts'` MUST be empty. This story ships markdown only.
11. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with no new failures vs. the merge commit of story 2.5 (baseline shifts as EPIC-2 stories land). Since no `.ts` lands, the expected deltas are zero in all four.
12. The vendor-tree exclusions from story 1.1 remain byte-unchanged: `.gitignore`, `tsconfig.json#exclude`, `eslint.config.mjs` `ignores`, `.eslintignore`, `.prettierignore`, and `tests/unit/dependency-audit.test.ts` `VENDORED_PATHS`.

## Out of Scope (explicitly deferred to later stories)

- `customize.toml` override routing Dev agent's `CS` trigger to `clickup-create-story` → **story 2.7**.
- Regression check that upstream `bmad-create-story` still works in isolation → **story 2.8**.
- Token-permission gating (explicit check that `CLICKUP_API_KEY` has create-task permission before attempting creation) → **story 2.9**.
- Setting `status`, `priority`, `assignees`, `due_date`, `start_date`, or `tags` at creation time — these are left to ClickUp list defaults so the team lead can configure them in the UI.
- Post-creation description updates (the created task's description is final; subsequent edits are the team lead's responsibility per PRD §FR #6).
- Subtask creation under the newly created story — the story itself is already a subtask of the epic; nested subtask creation is not in scope.
- Fuzzy or partial-name duplicate detection — only exact case-insensitive name matches trigger the warning; near-duplicate detection belongs to a future story.
- Retry logic on transient network errors — the step surfaces the error and stops; the user may re-invoke step 5 manually after resolving the issue.

## Tasks / Subtasks

- [ ] **Task 1 — Create `steps/step-05-create-task.md` (AC: #1–#6)**
  - [ ] Create the file with YAML frontmatter (two keys: `created_task_id`, `created_task_url`), H1 title, `## RULES`, and `## INSTRUCTIONS` sections exactly as specified in AC #1.
  - [ ] Include the verbatim mode error block (AC #3 first block) in the `## RULES` section under rule (a).
  - [ ] Include the verbatim missing-context error block (AC #3 second block) inside the `## INSTRUCTIONS` at step 1, with the six variable rows and `{MISSING or present}` as runtime-resolvable placeholders.
  - [ ] Include the verbatim duplicate warning (AC #4) inside the `## INSTRUCTIONS` at step 3, with `{existing_task_id}` and `{existing_task_url}` as runtime-resolvable placeholders.
  - [ ] Include the verbatim creation-error block (AC #5) inside the `## INSTRUCTIONS` at step 6, with `{raw_error_text}` as a runtime-resolvable placeholder.
  - [ ] Include the verbatim success confirmation (AC #6) inside the `## INSTRUCTIONS` at step 8.
  - [ ] Verify frontmatter key names match downstream contracts: `created_task_id` → step-05 output consumed by story 2.7 wiring check; `created_task_url` → presented to user. Exact spelling matters.
  - [ ] Confirm that neither `{created_task_id}` nor `{created_task_url}` are declared as frontmatter keys in any earlier step file — they are produced exclusively by step-05.

- [ ] **Task 2 — Update `workflow.md` Task Creation section (AC: #7)**
  - [ ] Open `src/custom-skills/clickup-create-story/workflow.md`.
  - [ ] Under `## Task Creation`, replace the single-line `<!-- story 2.6 will implement ... -->` comment with:
    - One descriptive sentence covering the full step: validates context → calls `searchTasks` for duplicate check → user confirms → `createTask({ list_id, name, description, parent_task_id })` → stores `{created_task_id}` and `{created_task_url}`.
    - `See: [./steps/step-05-create-task.md](./steps/step-05-create-task.md)`
    - Inline rule: "Step 5 is the terminal step of the skill. If `createTask` returns an error, the step surfaces it and stops — it does not retry silently."
  - [ ] Confirm no other sections in `workflow.md` are modified. `diff` MUST show only the `## Task Creation` section changed.

- [ ] **Task 3 — Verify regression-free (AC: #8–#12)**
  - [ ] `git diff --stat -- BMAD-METHOD/` → empty.
  - [ ] `git diff --stat -- src/tools/clickup/` → empty.
  - [ ] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [ ] `git diff -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty (story 1.1 vendor-tree exclusions MUST be byte-unchanged).
  - [ ] `npm run build` → clean.
  - [ ] `npm run lint` → 0 errors. Pre-existing `no-console` warnings in `tests/support/litellm-helper.mjs` unchanged. No new lint findings from `src/custom-skills/`.
  - [ ] `npm run format` → no diff in `src/custom-skills/`. Re-run before commit to accept any prettier reformat of the new markdown.
  - [ ] `npm test` → passing count unchanged from story 2.5 merge baseline. Since no `.ts` lands, the test count must not change.

- [ ] **Task 4 — Commit (AC: all)**
  - [ ] Stage in this order: `src/custom-skills/clickup-create-story/workflow.md`, `src/custom-skills/clickup-create-story/steps/step-05-create-task.md`.
  - [ ] Commit message: `feat(custom-skills): implement task creation step in clickup-create-story`
  - [ ] Body:

    ```
    Add step-05-create-task.md to the clickup-create-story skill. The step
    validates all context collected by steps 01–04, calls searchTasks to
    detect duplicate task names in the target sprint list, presents a
    pre-creation summary, calls createTask({ list_id: {sprint_list_id},
    name: {story_title}, description: {task_description}, parent_task_id:
    {epic_id} }), and confirms the created task's ID and URL.

    Updates workflow.md § Task Creation to replace the 2.6 breadcrumb
    with the step pointer and terminal-step rule.

    No status, priority, or assignee defaults are set at creation time —
    ClickUp list defaults apply so the team lead can configure these in
    the UI after creation.

    Out of scope (deferred): customize.toml wiring (2.7), upstream
    regression check (2.8), token-permission gating (2.9).

    Refs: EPIC-2, story 2-6-create-clickup-task.
    ```

## Dev Notes

### What `step-05` is responsible for — and what it is not

`step-05-create-task.md` is a workflow instruction file consumed by the BMAD Dev agent at runtime. It is not executable code; the LLM reads its `## INSTRUCTIONS` and follows them literally. That means:

- "Call `createTask` with `list_id: "{sprint_list_id}"`" causes the LLM to invoke the `createTask` MCP tool.
- "Parse the response: extract `task_id:` from the response text" means the LLM scans the plain-text response for the `task_id: <value>` line (see response format below).
- `{created_task_id}` and `{created_task_url}` frontmatter variables are runtime-populated by the LLM from the parsed response. They persist in the BMAD step-context for any downstream steps.
- The error blocks in AC #3–#5 are exact wording the agent must emit verbatim. Story 2.8's regression check can assert the exact error strings.

### Variables consumed from previous steps / provided to downstream

| Key                  | Direction    | Source / Consumer                                                             |
| -------------------- | ------------ | ----------------------------------------------------------------------------- |
| `{sprint_list_id}`   | **consumed** | Set by step-03 (sprint-list picker, story 2.4) — `createTask` `list_id`       |
| `{sprint_list_name}` | **consumed** | Set by step-03 (sprint-list picker, story 2.4) — confirmation display         |
| `{epic_id}`          | **consumed** | Set by step-02 (epic picker, story 2.3) — `createTask` `parent_task_id`       |
| `{epic_name}`        | **consumed** | Set by step-02 (epic picker, story 2.3) — confirmation display                |
| `{story_title}`      | **consumed** | Set by step-04 (description composer, story 2.5) — `createTask` `name`        |
| `{task_description}` | **consumed** | Set by step-04 (description composer, story 2.5) — `createTask` `description` |
| `{created_task_id}`  | **produced** | Parsed from `createTask` response; available to downstream steps              |
| `{created_task_url}` | **produced** | Parsed from `createTask` response; presented to user and available downstream |

### `createTask` tool usage and response format

`createTask` is registered only in `write` mode (see `src/tools/clickup-adapter.ts` — `registerTaskWriteTools` is called in the `write` mode branch only). The call:

```
createTask({
  list_id: "{sprint_list_id}",
  name: "{story_title}",
  description: "{task_description}",
  parent_task_id: "{epic_id}"
})
```

The response is produced by `formatTaskResponse` in `src/tools/clickup/src/tools/task-write-tools.ts` (line 646). For a successful creation, the text response contains (one per line):

```
Task created successfully!
task_id: <id>
name: <name>
url: <url>
status: <status>
assignees: <list or 'None'>
list_id: <list_id>
```

Step-05 MUST extract `task_id:` and `url:` from this text. Both are always present on success. The absence of `task_id:` reliably indicates an error response (which begins with `Error creating task: ...`).

### `searchTasks` tool usage for duplicate detection

`searchTasks` is registered in all three `CLICKUP_MCP_MODE` values. The call:

```
searchTasks({
  terms: ["{story_title}"],
  list_ids: ["{sprint_list_id}"]
})
```

`terms` is an array with OR logic; passing a single term with the exact story title gives the tightest possible filter. `list_ids` scopes results to the target sprint list. The step then performs an exact case-insensitive name comparison — `searchTasks` does full-text matching which may return partial matches, so the comparison step is necessary.

If `searchTasks` returns `No tasks available or index could not be built.`, the step treats this as "no duplicate found" and proceeds. A failed duplicate check MUST NOT block task creation.

### `createTask` parameter notes

- `list_id` is **immutable after creation** — the ClickUp API does not support moving tasks between lists (confirmed from the `createTask` tool description: "ClickUp API does not support moving tasks between lists after creation - this must be done manually in the ClickUp interface"). Ensure `{sprint_list_id}` is correct before calling.
- `description` maps to `markdown_description` in the ClickUp API request body (line 376 of `task-write-tools.ts`). This mapping is internal to the tool; the step file passes `description` and the tool handles the rest.
- `parent_task_id` maps to `parent` in the ClickUp API request body (line 521). In ClickUp, a subtask still belongs to its list (`{sprint_list_id}`); the parent relationship is a separate graph edge. The task will appear both in the sprint list and as a subtask of the epic.
- No optional parameters are passed. ClickUp list defaults govern status, priority, and assignees. This is intentional: the team lead owns those fields (PRD §FR #6).

### Idempotency and the one-shot write rule

The `createTask` call is **not idempotent** — calling it twice creates two tasks. The one-shot write rule (AC #1 rule b) is therefore critical. The duplicate-check step (AC #1 step 3) provides a UX-level guard against accidental re-creation. The step file MUST NOT loop back to the `createTask` call on any path after a successful creation.

### PRD §Non-functional requirements: no duplicate stories

PRD §NFR states: "Dev agent (story-creation mode) does not create duplicate stories." Story 2.6's duplicate check (AC #1 step 3 + rule c) addresses this requirement at the UX layer: the agent detects existing tasks with the same name and warns before proceeding. Story 2.9 addresses it at the permission layer (token gating). Together they implement the full NFR.

### Step file error-block quoting (nesting concern)

The error blocks in AC #3–#5 are quoted verbatim in the step file inside `## INSTRUCTIONS` numbered steps. These blocks contain markdown (bold, code spans). When embedding them in the step file, use a single-backtick fenced block or a blockquote with the `>` prefix to avoid nesting triple-backtick blocks inside triple-backtick blocks.

**Recommended representation in step-05:** Introduce each block with a plain-text heading like "Emit the following verbatim:", then present the block using blockquote (`>`) format. The agent reading the step file will strip the `>` markers and emit the block contents. This avoids triple-backtick nesting while preserving the exact text.

### Workflow.md state at time of story 2.6

When story 2.6 is implemented, `workflow.md` will have been updated by stories 2.2, 2.3, 2.4, and 2.5. The `## Task Creation` section will contain only the `<!-- story 2.6 will implement -->` comment — that is the only section this story modifies. Confirm with `diff` before committing.

### Step file naming convention

| Step file                         | Created by story | Execution order |
| --------------------------------- | ---------------- | --------------- |
| `step-01-prereq-check.md`         | 2.2              | 1               |
| `step-02-epic-picker.md`          | 2.3              | 2               |
| `step-03-sprint-list-picker.md`   | 2.4              | 3               |
| `step-04-description-composer.md` | 2.5              | 4               |
| `step-05-create-task.md`          | **2.6**          | 5 (terminal)    |

### Tooling interaction

- **tsc / ESLint / Vitest**: No `.ts` files — no impact.
- **Prettier**: Will format the new `.md` file. Run `npm run format` before staging to avoid lint-staged rewrites on commit.

### References

- [PRD §Functional requirements #2](../PRD.md) — "creates ClickUp tasks with rich, PRD+architecture-derived descriptions."
- [PRD §Functional requirements #6](../PRD.md) — "Humans own ticket _description_; agents write only via _comments_ and _status_." — story 2.6 writes the description **once, at creation time** (not an update). No conflict.
- [PRD §Non-functional requirements](../PRD.md) — "Dev agent (story-creation mode) does not create duplicate stories." — addressed by the duplicate check in step 3.
- [Story 2.1 §AC #3](./2-1-scaffold-clickup-create-story-skill.md) — `## Task Creation` section created with `<!-- story 2.6 will implement -->` breadcrumb. This story replaces that breadcrumb.
- [Story 2.3 §Dev Notes: downstream variables](./2-3-epic-picker.md) — `{epic_id}` confirmed as step-02 output (bare task ID, 6–9 chars); `createTask` `parent_task_id` value.
- [Story 2.4 §Dev Notes: variables provided](./2-4-sprint-list-picker.md) — `{sprint_list_id}` and `{sprint_list_name}` confirmed as step-03 outputs; `createTask` `list_id` value.
- [Story 2.5 §Dev Notes: createTask parameter mapping](./2-5-description-composer.md) — `{story_title}` → `name`, `{task_description}` → `description`. Key names confirmed from `task-write-tools.ts` line 348–356.
- Tool surface: `src/tools/clickup/src/tools/task-write-tools.ts` — `createTask` registered in `write` mode; response format from `formatTaskResponse` at line 646.
- Tool surface: `src/tools/clickup/src/tools/search-tools.ts` — `searchTasks` registered in all modes; `terms` (array, OR logic), `list_ids` (array) parameters.
- Mode dispatch: `src/tools/clickup-adapter.ts` — `createTask` registered only in `write` mode branch.

## Dev Agent Record

### Agent Model Used

<!-- populated by dev agent on implementation -->

### Debug Log References

<!-- populated by dev agent on implementation -->

### Completion Notes List

<!-- populated by dev agent on implementation -->

### File List

**New**

- `src/custom-skills/clickup-create-story/steps/step-05-create-task.md` — step file with task-creation logic, duplicate-check, pre-creation confirmation, and all error/success templates (AC #1–#6)

**Modified**

- `src/custom-skills/clickup-create-story/workflow.md` — `## Task Creation` section updated (AC #7)

**Deleted**

- (none)

## Change Log

| Date       | Change                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------- |
| 2026-04-22 | Story drafted from EPIC-2 bullet 7 via `bmad-create-story` workflow. Status → ready-for-dev. |
