---
task_name: ''
task_status: ''
task_url: ''
epic_task_id: ''
epic_name: ''
---

# Step 2: Task Fetch

> **Inherited context:** `{task_id}` is declared in `step-01-task-id-parser.md`'s frontmatter and is available to all downstream steps — it is not re-declared here. The five frontmatter keys above (`task_name`, `task_status`, `task_url`, `epic_task_id`, `epic_name`) are the new variables this step populates.

## RULES

1. **Read-only:** This step calls `getTaskById` at most twice (once for the task, once for the parent epic). No ClickUp writes are made in this step.
2. **Must-complete-task:** If the task `getTaskById` call fails (API error or ID rejected by the tool schema), emit the standard task-not-found error block (see INSTRUCTIONS step 2) and **stop** — do not proceed to step 3.
3. **Best-effort-epic:** If `parent_task_id` is absent from the task metadata, or if the second `getTaskById` call fails, emit the epic-context-unavailable warning block (see INSTRUCTIONS step 3), set `{epic_task_id}` and `{epic_name}` to empty strings, and **continue** — the skill proceeds with task context only.
4. **Contract:** `{task_name}`, `{task_status}`, and `{task_url}` MUST be non-empty strings by the time this step completes. `{epic_task_id}` and `{epic_name}` are populated when available, empty strings otherwise.

## INSTRUCTIONS

1. Call `getTaskById` with `{task_id}` (the normalised bare ID from step 1).
2. From the response metadata block, extract and store: `{task_name}` ← `name` field, `{task_status}` ← `status` field, `{task_url}` ← `task_url` field. If the call failed (API error block returned), emit the task-not-found error block and stop.
   2b. Note: the `getTaskById` response also includes the task description (rendered markdown) and all task comments in conversation context — no additional extraction is needed. Downstream steps (planning-artifact reader, implementation loop) may reference this content directly from the response.
3. Check whether `parent_task_id` appears in the metadata block. If absent, emit the epic-context-unavailable warning, leave `{epic_task_id}` and `{epic_name}` as empty strings, and skip to instruction step 6.
4. Call `getTaskById` with the value of `parent_task_id` to fetch the parent epic.
5. From the epic response metadata block, extract and store: `{epic_task_id}` ← `task_id` field, `{epic_name}` ← `name` field. If the call failed, emit the epic-context-unavailable warning, leave `{epic_task_id}` and `{epic_name}` as empty strings, and continue to step 6.
6. Emit the success summary block and continue to step 3.

### Standard error block — task not found

```
❌ **Task fetch failed — ClickUp API error**

The `clickup-dev-implement` skill called `getTaskById` with task ID `{task_id}` but received an error response.

**Possible causes:**
- The task ID does not exist in ClickUp (verify the ID or URL).
- The `CLICKUP_API_KEY` token does not have permission to access this task.
- The task belongs to a different workspace than `CLICKUP_TEAM_ID`.

**What to do:** Verify the task ID is correct and your ClickUp token has access to it, then re-invoke the Dev agent with a valid task reference.
```

### Standard warning block — epic context unavailable

```
⚠️ **Epic context unavailable — continuing with task context only**

The task `{task_id}` ({task_name}) does not have a parent task ID in ClickUp, or the parent-epic fetch failed.

**Why this is non-fatal:** Parent-epic context is supplemental. The task description, comments, status, and planning artifacts loaded in step 3 are sufficient for implementation.

**Impact:** Step 3 (planning-artifact reader) will not receive epic-level context from ClickUp. Ensure the task description is self-contained.
```

### Standard success block — task fetch complete

```
✅ **Task fetch complete**

- **Task:** {task_name} (`{task_id}`) — status: {task_status}
- **URL:** {task_url}
- **Epic:** {epic_name} (`{epic_task_id}`) [or "No parent epic" if epic_task_id is empty]

Proceeding to step 3 (planning-artifact reader).
```
