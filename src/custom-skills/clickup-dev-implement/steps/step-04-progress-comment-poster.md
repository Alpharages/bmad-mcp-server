---
comment_count: ''
last_comment_id: ''
---

# Step 4: Progress Comment Poster

## RULES

- **(a) Append-only:** Comments are never edited or deleted. Each invocation posts a new, independent comment. The `updateTask` tool MUST NOT be used in this step.
- **(b) Markdown-formatted:** All comment text is passed as a markdown string to the `comment` parameter of `addComment`. The `addComment` tool converts markdown to ClickUp blocks internally — do not pre-render to HTML or ClickUp doc format.
- **(c) Write-mode soft gate:** If `addComment` is not in the current tool list (`CLICKUP_MCP_MODE` is not `write`), emit the mode-unavailable warning block (see INSTRUCTIONS step 1), set `{comment_count}` = `'0'`, skip all comment-posting for this session, and **continue** — progress comments are supplemental; their absence does not block implementation.
- **(d) Non-blocking failures:** If an `addComment` call returns an error, emit the comment-failed warning block (see INSTRUCTIONS step 6) and **continue** — implementation does not halt on a comment failure.
- **(e) Variable contract:** `{comment_count}` is incremented by 1 after each successful `addComment` call. `{last_comment_id}` is set to the `comment_id` returned by the most recent successful call. Both values persist across all invocations of this step within a session.

> **Note on `task_id` length:** `addComment` accepts a `task_id` of 6–9 alphanumeric characters (Zod schema: `z.string().min(6).max(9)`). If a task ID falls outside this range, the schema rejects it and `addComment` returns an error — rule (d)'s non-blocking path handles this.

## WHEN TO POST

| #   | Milestone                                                                             | Template                             |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------ |
| M1  | Immediately after steps 1–3 complete, before any code is written                      | Template A — Implementation Start    |
| M2  | After all implementation changes are committed and ready for review                   | Template B — Implementation Complete |
| M3+ | At significant decision points or blockers during implementation (agent's discretion) | Template C — Discretionary           |

## COMMENT TEMPLATES

### Template A — Implementation Start (M1)

```
## 🚀 Implementation Started

**Task:** {task_name} (`{task_id}`)

**Context loaded:**
- PRD: `planning-artifacts/PRD.md` — loaded
- Architecture: `planning-artifacts/architecture.md` — loaded
- Tech spec: `planning-artifacts/tech-spec.md` — {tech_spec_loaded == 'true' ? 'loaded' : 'not found, skipped'}
- Epic: {epic_name} (`{epic_task_id}`) ← omit this line entirely if {epic_task_id} is empty

Starting implementation now.
```

> **Template A substitution notes:**
>
> - For the tech-spec line: write `loaded` if `{tech_spec_loaded}` is `'true'`; write `not found, skipped` if `{tech_spec_loaded}` is `'false'`.
> - For the epic line: omit it entirely if `{epic_task_id}` is an empty string.

### Template B — Implementation Complete (M2)

```
## ✅ Implementation Complete

**Summary:** {brief description of what was implemented}

**Pull Request:** {pr_url}

**Files changed:**
- {list of created/modified/deleted files with one-line description each}

**Next:** Status transition to In Review (step 5).
```

> **Template B substitution notes:**
>
> - For the Pull Request line: render `**Pull Request:** {pr_url}` only if `{pr_url}` is non-empty. If `{pr_url}` is empty (no PR was opened in this session — e.g. direct commit to main, doc-only change, or PR creation deferred), omit the entire `**Pull Request:** ...` line including its surrounding blank lines so the comment reads cleanly.

### Template C — Discretionary (M3+)

```
## 💡 {comment_topic}

{body — context, decision, assumption, or progress update relevant to the implementation}
```

## INSTRUCTIONS

1. **Check write mode.** Verify whether `addComment` is available in the current tool list. If absent, emit the mode-unavailable warning block below, set `{comment_count}` = `'0'`, and skip all comment-posting for this session. Continue to the next workflow step without posting.

   > ⚠️ **Progress comments skipped — write mode not active**
   >
   > The `clickup-dev-implement` skill requires `CLICKUP_MCP_MODE=write` to post progress comments. The `addComment` tool is not available in the current tool list.
   >
   > **Impact:** No progress comments will be posted to ClickUp task `{task_id}` during this session. Implementation will continue without ClickUp comment updates.
   >
   > **What to do (optional):** Set `CLICKUP_MCP_MODE=write` and restart the MCP server to enable progress comment posting in future sessions.

2. **Identify the milestone.** Determine which milestone (M1, M2, or M3+) applies to the current invocation.

3. **Compose the comment.** Select the template that matches the milestone (A, B, or C). Substitute all `{...}` placeholders using step-context variables: `{task_id}` from step 1; `{task_name}`, `{task_url}`, `{epic_task_id}`, `{epic_name}` from step 2 (omit the epic line in Template A if `{epic_task_id}` is empty); `{prd_loaded}`, `{architecture_loaded}`, `{tech_spec_loaded}` from step 3. For Template B, summarise the implementation changes and set `{pr_url}` to the PR URL produced by `gh pr create`'s stdout (or to the empty string if no PR was opened in this session — direct commit to main, doc-only change, or PR creation deferred); the Pull Request line is omitted entirely when `{pr_url}` is empty per the Template B substitution notes. For Template C, describe the decision or event.

4. **Post the comment.** Call `addComment` with `task_id` = `{task_id}` and `comment` = the composed markdown string from step 3.

5. **Handle success.** If `addComment` returns successfully: increment `{comment_count}` by 1, set `{last_comment_id}` to the `comment_id` from the response, and confirm `✅ Progress comment posted (comment_id: {last_comment_id})`. Continue to the next workflow step.

6. **Handle failure.** If `addComment` returns an error: emit the comment-failed warning block below, do NOT increment `{comment_count}` or update `{last_comment_id}`, and continue — do not halt implementation.

   > ⚠️ **Progress comment failed — continuing without posting**
   >
   > The `clickup-dev-implement` skill called `addComment` for task `{task_id}` but received an error.
   >
   > **Impact:** This milestone will not be recorded in ClickUp. Implementation continues unaffected.
   >
   > **What to do (optional):** Verify that `CLICKUP_API_KEY` has permission to comment on this task, then manually post the missed comment in ClickUp if needed.

> **Refinement source:** `template-b-no-pr-field` (story 5-7).
