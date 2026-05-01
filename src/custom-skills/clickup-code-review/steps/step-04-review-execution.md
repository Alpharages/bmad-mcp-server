---
review_verdict: ''
review_summary: ''
review_findings: ''
---

# Step 4: Review Execution (via bmad-code-review)

## RULES

1. **Delegate to bmad-code-review.** Do NOT perform an ad-hoc review here. Invoke the `bmad-code-review` workflow via the `bmad` tool (`execute` operation, workflow name `bmad-code-review`). The review logic — adversarial layers, triage, findings — all lives there.
2. **Pre-supply context.** The ClickUp task description and planning artifacts loaded in steps 2–3 ARE the spec. Pass them so `bmad-code-review` does not need to ask the user for a spec file.
3. **Capture results.** After `bmad-code-review` completes, extract the verdict, summary, and findings from its output and store them in `{review_verdict}`, `{review_summary}`, and `{review_findings}` so steps 5–6 can post and transition.
4. **Verdict contract.** `{review_verdict}` MUST be either `approved` or `changes_requested` before leaving this step.

## INSTRUCTIONS

### 1. Prepare the handoff context

Before invoking `bmad-code-review`, assemble the pre-supplied context from what steps 1–3 already loaded:

- **Diff source:** branch `{branch_name}` vs `main` (already resolved in step 3 — do not re-run git commands).
- **Spec context:** the ClickUp task description (`{task_description}`) combined with the planning artifact contents (PRD and architecture, already in conversation context).
- **Review mode:** `full` (spec is available from the task description and planning artifacts).

### 2. Invoke bmad-code-review

Execute the `bmad-code-review` workflow via the `bmad` tool with the following pre-supplied inputs so its step-01 cascade resolves immediately without asking the user:

```
Diff source: branch {branch_name} vs main
Spec: ClickUp task "{task_name}" ({task_id}) — {task_url}

Task description:
{task_description}

Planning context (PRD + architecture) is already loaded in conversation context.

Review mode: full
```

`bmad-code-review` will:

- Run its parallel adversarial review layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor)
- Triage findings into blocking and non-blocking categories
- Present a structured review report

### 3. Capture the output

After `bmad-code-review` completes, extract:

- `{review_verdict}` — map to `approved` if the overall finding is "no blocking issues" / "approved" / "LGTM", or `changes_requested` if the output contains blocking findings.
- `{review_summary}` — the triage summary paragraph from the `bmad-code-review` output (step-04-present.md output).
- `{review_findings}` — the full structured findings list from the `bmad-code-review` output.

If `bmad-code-review` does not emit an explicit verdict, derive it from the triage output: if the blocking-findings section is empty or explicitly states "none", set `{review_verdict}` = `approved`; otherwise set `{review_verdict}` = `changes_requested`.

### 4. Confirm and continue

Emit the verdict summary block and continue to step 5.

### Verdict summary block — approved

```
✅ **Review verdict: APPROVED**

{review_summary}

Proceeding to post review comment and transition task status.
```

### Verdict summary block — changes requested

```
❌ **Review verdict: CHANGES REQUESTED**

{review_summary}

Proceeding to post review comment and transition task back to in-progress.
```
