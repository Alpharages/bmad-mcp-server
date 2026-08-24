---
comment_id: ''
---

# Step 5: Review Comment Poster

## RULES

1. **Write-mode soft gate.** If `addComment` is not in the current tool list, emit the mode-unavailable warning and continue — skipping the comment does not block the skill.
2. **Exactly one comment.** Post exactly one review comment per session, on every verdict including `inconclusive`. Do not post incremental comments, and never post a second comment for the same run — not to correct, amend, or supplement the first.
3. **Non-blocking failures.** If `addComment` returns an error, emit the post-failed warning and continue. Do NOT retry the call: a retry risks a duplicate comment when the first call succeeded server-side.
4. **Report-only.** This step posts a ClickUp comment and nothing else. It MUST NOT modify repository files or BMAD artifacts.

## INSTRUCTIONS

1. **Check write mode.** Verify whether `addComment` is available in the current tool list. If absent, emit the mode-unavailable warning block and set `{comment_id}` = `''`. Skip to step 4.

2. **Compose the comment body** using the template below. Substitute all `{variables}` from upstream steps.

3. **Post the comment.** Call `addComment` with `task_id` = `{task_id}` and the composed body. If successful, store the returned comment ID as `{comment_id}`. If it fails, emit the post-failed warning block, set `{comment_id}` = `''`, and continue.

4. Emit the success or skipped confirmation and continue to step 6.

## Comment Template

```markdown
## 🔍 Code Review — {task_name}

**Verdict:** {APPROVED ✅ | CHANGES REQUESTED ❌ | INCONCLUSIVE ⚠️}
**Reviewed by:** AI Code Reviewer (bmad-clickup-code-review skill)
**Branch:** {branch_name}
**Changed files:** {changed_files}

---

### Summary

{review_summary}

---

### Findings

{render each entry of {review_findings} as:

- **[{action}] [{severity}] {title}** — {detail} `{location}`
  grouped by action in the order decision_needed, patch, defer;
  omit an empty group; render "None." when the whole set is empty}

---

### Verification Gaps

{verification_gaps, one per line; render "None — the change's claims are covered by its evidence." when empty}

---

_Review performed by `bmad-clickup-code-review` via BMAD MCP Server. Report-only: no files were modified._
```

Verdict line rendering, driven by `{review_verdict}`:

- `approved` → `✅ APPROVED`
- `changes_requested` → `❌ CHANGES REQUESTED`
- `inconclusive` → `⚠️ INCONCLUSIVE`

For `inconclusive`, insert this block immediately below the Verdict line, before the `---`:

```markdown
> ⚠️ **This review did not reach a conclusion.** {review_inconclusive_reason}
> The task status was deliberately left unchanged. Re-run the review once the
> missing evidence is available.
```

All other fields are substituted verbatim.

---

### Warning block — write mode unavailable

> ⚠️ **Review comment skipped — write mode not active**
>
> The `bmad-clickup-code-review` skill requires `CLICKUP_MCP_MODE=write` to post a review comment. The `addComment` tool is not available in the current tool list.
>
> **Impact:** The review findings will not be posted to ClickUp task `{task_id}` ({task_name}). The verdict (`{review_verdict}`) and findings are available in this conversation.
>
> **What to do (optional):** Set `CLICKUP_MCP_MODE=write` in the `bmad-mcp-server` env config (whichever name you gave it in your MCP client settings) and restart, then re-invoke the skill.

### Warning block — post failed

> ⚠️ **Review comment post failed — continuing**
>
> The `bmad-clickup-code-review` skill called `addComment` for task `{task_id}` but received an error.
>
> **Impact:** Review findings were not posted to ClickUp. The verdict (`{review_verdict}`) and findings are available in this conversation.
>
> **What to do (optional):** Verify that the API token has comment permissions on this task, then post the findings manually.

### Success confirmation

```
✅ Review comment posted to {task_url} (comment ID: {comment_id})

Proceeding to step 6 (status transition).
```
