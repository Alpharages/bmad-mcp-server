---
comment_id: ''
---

# Step 5: Review Comment Poster

## RULES

1. **Write-mode soft gate.** If `addComment` is not in the current tool list, emit the mode-unavailable warning and continue — skipping the comment does not block the skill.
2. **Single comment.** Post exactly one review comment per session. Do not post incremental comments.
3. **Non-blocking failures.** If `addComment` returns an error, emit the post-failed warning and continue.

## INSTRUCTIONS

1. **Check write mode.** Verify whether `addComment` is available in the current tool list. If absent, emit the mode-unavailable warning block and set `{comment_id}` = `''`. Skip to step 4.

2. **Compose the comment body** using the template below. Substitute all `{variables}` from upstream steps.

3. **Post the comment.** Call `addComment` with `task_id` = `{task_id}` and the composed body. If successful, store the returned comment ID as `{comment_id}`. If it fails, emit the post-failed warning block, set `{comment_id}` = `''`, and continue.

4. Emit the success or skipped confirmation and continue to step 6.

## Comment Template

```markdown
## 🔍 Code Review — {task_name}

**Verdict:** {APPROVED ✅ | CHANGES REQUESTED ❌}
**Reviewed by:** AI Code Reviewer (clickup-code-review skill)
**Branch:** {branch_name}
**Changed files:** {changed_files}

---

### Summary

{review_summary}

---

### Findings

{review_findings}

---

*Review performed by `clickup-code-review` via BMAD MCP Server.*
```

> Use `✅ APPROVED` or `❌ CHANGES REQUESTED` based on `{review_verdict}`. All other fields substituted verbatim.

---

### Warning block — write mode unavailable

> ⚠️ **Review comment skipped — write mode not active**
>
> The `clickup-code-review` skill requires `CLICKUP_MCP_MODE=write` to post a review comment. The `addComment` tool is not available in the current tool list.
>
> **Impact:** The review findings will not be posted to ClickUp task `{task_id}` ({task_name}). The verdict (`{review_verdict}`) and findings are available in this conversation.
>
> **What to do (optional):** Set `CLICKUP_MCP_MODE=write` in the `bmad-mcp-server` env config (whichever name you gave it in your MCP client settings) and restart, then re-invoke the skill.

### Warning block — post failed

> ⚠️ **Review comment post failed — continuing**
>
> The `clickup-code-review` skill called `addComment` for task `{task_id}` but received an error.
>
> **Impact:** Review findings were not posted to ClickUp. The verdict (`{review_verdict}`) and findings are available in this conversation.
>
> **What to do (optional):** Verify that the API token has comment permissions on this task, then post the findings manually.

### Success confirmation

```
✅ Review comment posted to {task_url} (comment ID: {comment_id})

Proceeding to step 6 (status transition).
```
