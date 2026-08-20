---
qa_verdict: ''
qa_inconclusive_reason: ''
qa_summary: ''
comment_id: ''
---

# Step 6: QA Report Poster

> **Inherited context:** `{ai_qa_verdict}`, `{ai_qa_findings}`, `{test_suite_result}`, `{human_qa_verdict}`, `{human_qa_findings}`, `{base_url}`, `{browser_tool}`, `{task_id}`, `{task_name}`, `{task_url}` are available.

## RULES

1. **Write-mode soft gate.** If `addComment` is not in the current tool list, emit the mode-unavailable warning, render the full report to the user instead, set `{comment_id}` = `''`, and continue (the verdict is still computed for step 7).
2. **One comment per session.** `addComment` is called exactly once. Append-only — never edit or delete existing comments.
3. **Honest coverage.** The report MUST state what actually ran and what was skipped/blocked and why. A skipped pass is never silently presented as a pass.

## INSTRUCTIONS

### 1. Aggregate the overall verdict

Evaluate in row order and stop at the first match.

| #   | `{ai_qa_verdict}`                              | `{human_qa_verdict}`              | `{qa_verdict}` |
| --- | ---------------------------------------------- | --------------------------------- | -------------- |
| 1   | `fail`                                         | —                                 | `failed`       |
| 2   | —                                              | `fail`                            | `failed`       |
| 3   | `pass`                                         | `pass`, `skipped`, `inconclusive` | `passed`       |
| 4   | `skipped`, `inconclusive`                      | `pass`                            | `passed`       |
| 5   | otherwise (no pass and no fail on either side) |                                   | `inconclusive` |

In words: **failed** if either pass found a failure; **passed** if at least one pass actually verified something clean and neither failed; **inconclusive** whenever nothing was verified — because a pass was skipped, because the browser or test infrastructure could not run, or because every scenario came back `BLOCKED`. Store as `{qa_verdict}`.

**Infrastructure failure is never a pass.** Row 5 is the catch-all precisely so a run that verified nothing cannot fall through to `passed`. When `{qa_verdict}` = `inconclusive`, set `{qa_inconclusive_reason}` to a one-line statement of what was unavailable (e.g. `test suite could not run: missing dependencies; no browser MCP connected`), drawn from `{test_suite_result}`, `{ai_qa_findings}` and `{human_qa_findings}`.

### 2. Compose the report

Build one markdown comment. Keep it scannable — verdict and failures first, detail below:

```
## 🧾 QA Report — {qa_verdict_emoji} {qa_verdict_UPPER}

**Task:** {task_name} (`{task_id}`)
**Verdict:** {passed ✅ | failed ❌ | inconclusive ⚠️}
**Passes run:** code-access {pass/fail/skipped} · visual {pass/fail/skipped}

### ❌ Failures _(omit this section entirely if there are none)_
For each failure, a numbered entry:
- **[code | visual] {scenario name}** — what was expected, what happened, and how to reproduce. For visual failures, reference the screenshot. Black-box failures cite no code; code failures cite `file:line` or the failing test name.

### 🧪 Code-Access QA
- Test suite: {test_suite_result}
- Scenarios: {P} pass / {F} fail / {B} blocked
- {per-scenario one-liners with evidence; note any BLOCKED caveats}
_(If the code pass was skipped, state "Skipped — {reason}".)_

### 🖥️ Visual QA
- Environment: {browser_tool} @ {base_url}  _(or "Skipped — {reason}")_
- Scenarios: {P} pass / {F} fail / {B} blocked
- {per-scenario one-liners with screenshot references and observed-vs-expected}

### Coverage notes
- What was not verified and why (skipped passes, blocked scenarios, missing planning artifacts, env limits).

---
🤖 QA by `bmad-clickup-qa`
```

Store the rendered report as `{qa_summary}`.

### 3. Post the comment

Call `addComment` with `task_id` = `{task_id}` and the rendered report. Parse the response for the new comment ID and store it as `{comment_id}`. If the call fails, emit the post-failed warning (non-blocking), render the report to the user, leave `{comment_id}` = `''`, and continue.

### 4. Confirm

```
✅ **QA report posted** — verdict: {qa_verdict}
- Comment: `{comment_id}` on [{task_name}]({task_url}) _(or "write mode unavailable — report shown above")_

Proceeding to step 7 (status transition).
```

### Warning block — write mode unavailable

> ⚠️ **QA report not posted — write mode not active**
>
> The `bmad-clickup-qa` skill requires `CLICKUP_MCP_MODE=write` (so `addComment` is registered) to post the QA report to ClickUp. The full report is shown above for you to copy in manually.

### Warning block — post failed

> ⚠️ **QA report post failed — continuing**
>
> `addComment` for task `{task_id}` returned an error. The full report is shown above. Status transition will still proceed based on the computed verdict.

## NEXT

Proceed to [step-07-status-transition.md](./step-07-status-transition.md).
