---
review_verdict: ''
review_summary: ''
review_findings: ''
lore_enabled: ''
lore_project_slug: ''
lore_findings_captured: '0'
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

### 3b. Capture findings to Lore (optional)

This step is gated on Lore being configured for the project under review.

1. **Detect Lore configuration.** Attempt to read `lore.yaml` from the project root via the Read tool.
   - If the file is missing, malformed, or lacks `project.slug`: set `{lore_enabled}` = `'false'`, `{lore_findings_captured}` = `'0'`, and skip the rest of this section silently. Continue to step 4.
   - If `project.slug` is set: set `{lore_enabled}` = `'true'`, `{lore_project_slug}` = the slug value.

2. **Skip if nothing to capture.** If `{review_verdict}` = `approved` AND `{review_findings}` is empty, skip silently.

3. **Capture each finding.** For each finding in `{review_findings}`, call `capture_review_finding` on the `lore-memory-{lore_project_slug}` MCP server with:
   - `external_task_id`: `{task_id}`
   - `external_tracker_type`: `clickup`
   - `external_task_ref`: `{task_url}`
   - `severity`: map BMAD's blocking/non-blocking to Lore's `critical`/`high`/`medium`/`low`:
     - blocking + AC-violation -> `critical`
     - blocking + correctness/security -> `high`
     - non-blocking + maintainability -> `medium`
     - non-blocking + style/nit -> `low`
   - `finding.title`: the finding's short label
   - `finding.problem`: the "what's wrong" prose from the finding
   - `finding.root_cause`: the "why this happened" prose, if `bmad-code-review` provided it
   - `finding.fix`: the proposed fix prose
   - `finding.prevention_rule`: a one-sentence generalised rule the Dev agent should remember next time
   - `finding.stack_tags`: the `repos[].stack` array from the same `lore.yaml` (already read in step 1)
   - `finding.category`: e.g. `correctness`, `security`, `performance`, `maintainability`, `style`
   - `finding.code_pointer`: `{ file, line_start, line_end }` if the finding cites a specific location; omit otherwise
   - `reviewer`: `bmad-code-review`
   - `workflow`: `bmad-clickup-code-review`

   Non-blocking. Each call's failure is independent — keep going on the others. Increment `{lore_findings_captured}` only on success.

4. **Surface to user.** If `{lore_findings_captured}` > 0, append a single line to the verdict summary block (in step 4):
   ```
   Captured {lore_findings_captured} finding(s) to Lore for cross-project propagation.
   ```

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
