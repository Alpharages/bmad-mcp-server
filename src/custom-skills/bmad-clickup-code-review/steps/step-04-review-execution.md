---
review_verdict: ''
review_summary: ''
review_findings: ''
review_inconclusive_reason: ''
verification_gaps: ''
lore_enabled: ''
lore_project_slug: ''
lore_findings_captured: '0'
---

# Step 4: Review Execution (via bmad-code-review, report-only)

## RULES

1. **Delegate to bmad-code-review.** Do NOT perform an ad-hoc review here. Invoke the `bmad-code-review` workflow via the `bmad` tool (`execute` operation, workflow name `bmad-code-review`). The review logic — adversarial layers, per-finding verification, severity assignment, triage routing — all lives there.
2. **Report-only, no exceptions.** This workflow reviews; it never changes anything. Run `bmad-code-review`'s gather / review / triage stages ONLY. Do NOT run its present-and-act stage (`step-04-present.md`) or any stage that writes. Specifically, this step and every step of this skill MUST NOT: apply a patch, edit source or tests, stage or commit files, stash, create or switch branches, or write to any BMAD artifact — including `{spec_file}`, the review-findings section of a story file, `deferred-work.md`, and `sprint-status.yaml`. If `bmad-code-review` asks how to handle `patch` findings, answer that this is a report-only review and take no action.
3. **Pre-supply context.** The ClickUp task description and planning artifacts loaded in steps 2–3 ARE the spec. Pass them so `bmad-code-review` does not need to ask the user for a spec file. Pass no `spec_file` path — with no spec file set, upstream has nothing to write findings into.
4. **BMAD 6.11 finding actions.** `bmad-code-review` triages each surviving entry into exactly one of `decision_needed`, `patch`, or `defer`, and separately records findings it **dismissed** (verification refuted the claim, or could not substantiate it). Every entry carries a severity of `high`, `medium`, or `low`, assigned by upstream triage from the verified consequence. Consume those actions and severities as-is; do not translate them into a blocking / non-blocking binary and do not re-derive severity here.
5. **Capture results.** Build the structured finding set in instruction 3 BEFORE rendering any ClickUp comment. Steps 5–6 render and transition from `{review_verdict}`, `{review_summary}`, `{review_findings}` and `{verification_gaps}` only.
6. **Verdict contract.** `{review_verdict}` MUST be exactly one of `approved`, `changes_requested`, or `inconclusive` before leaving this step. There is no default and no fallback to `approved`.
7. **Absence of evidence is never approval.** A missing section, an empty output, an unparseable output, or a reviewer that failed is `inconclusive` — never `approved`.

## INSTRUCTIONS

### 1. Prepare the handoff context

Before invoking `bmad-code-review`, assemble the pre-supplied context from what steps 1–3 already loaded:

- **Diff source:** branch `{branch_name}` vs `main` (already resolved in step 3 — do not re-run git commands).
- **Spec context:** the ClickUp task description (`{task_description}`) combined with the planning artifact contents (PRD and architecture, already in conversation context).
- **Review mode:** `full` when the task description carries acceptance criteria and at least one planning artifact loaded (`{diff_loaded}` = `true`); `no-spec` when the diff loaded but no acceptance criteria or planning context is available.

### 2. Invoke bmad-code-review

Execute the `bmad-code-review` workflow via the `bmad` tool with the following pre-supplied inputs so its step-01 cascade resolves immediately without asking the user:

```
Diff source: branch {branch_name} vs main
Spec: ClickUp task "{task_name}" ({task_id}) — {task_url}
Spec file: (none — report-only review; do not write findings to any file)

Task description:
{task_description}

Planning context (PRD + architecture) is already loaded in conversation context.

Review mode: {full | no-spec}
Report-only: yes. Run the gather, review and triage stages and return the triaged
findings. Do NOT run the present-and-act stage. Do NOT apply patches, edit files,
stage, commit, or write to sprint-status.yaml, deferred-work.md, or any story file.
```

`bmad-code-review` will:

- Run its parallel adversarial review layers (including Blind Hunter, Edge Case Hunter, and the verification-gap layer)
- Verify each finding's claimed consequence at the location it names, assign severity from that verified consequence, and keep or dismiss it
- Group survivors by shared root cause and route each entry to `decision_needed`, `patch`, or `defer`
- Report any layers that failed (`{failed_layers}`)

### 3. Build the structured finding set

Parse the triage output into an internal finding set **before** composing anything for ClickUp. For each entry record:

| Field      | Source                                                                             |
| ---------- | ---------------------------------------------------------------------------------- |
| `title`    | the entry's one-line summary                                                       |
| `detail`   | the entry's full description, carrying every grouped member's verified consequence |
| `action`   | `decision_needed`, `patch`, or `defer`                                             |
| `severity` | `high`, `medium`, or `low`, as assigned by upstream triage                         |
| `location` | file and line reference, when the entry names one                                  |
| `source`   | the contributing review layer(s)                                                   |

Record separately:

- `{verification_gaps}` — the verification-gap layer's findings: claims the change makes that its tests or evidence do not actually verify. Keep these distinct from triaged code findings; they qualify the confidence of the review.
- **Dismissed findings** — each with the reason that disposed of its claim, from the `Dismissed` appendix. These are review evidence, not defects.
- **Accepted deferrals** — `defer` entries the user has explicitly accepted in this or a prior review of the same task (a prior `bmad-clickup-code-review` comment on the task recording the acceptance).
- `{failed_layers}` — any review layer that failed to complete.

Set `{review_summary}` to the triage summary (`<D> decision_needed, <P> patch, <W> defer, <R> dismissed`, plus the verification-gap count and any failed layers).
Set `{review_findings}` to the structured finding set above.

### 4. Determine the verdict

Evaluate these rows **in order** and stop at the first match. `{review_verdict}` is the matched row's verdict.

| #   | Evidence                                                                                                                                                                                                                                 | Verdict               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1   | Reviewer execution failed — `bmad-code-review` could not be invoked, halted, returned nothing, or returned output that cannot be parsed into the finding set                                                                             | `inconclusive`        |
| 2   | Evidence unavailable — `{diff_loaded}` is `false`, no commits or changed files were resolved in step 3, the specification context is empty (no task description AND no planning artifact), or every review layer is in `{failed_layers}` | `inconclusive`        |
| 3   | At least one unresolved `patch` finding with severity `high` or `medium`                                                                                                                                                                 | `changes_requested`   |
| 4   | At least one unresolved `decision_needed` finding with severity `high` or `medium`                                                                                                                                                       | `changes_requested`   |
| 5   | Only `low`-severity findings remain, and/or every remaining `high`/`medium` entry is an explicitly accepted deferral                                                                                                                     | `approved` with notes |
| 6   | No findings remain and verification passed (no unaddressed `{verification_gaps}`, `{failed_layers}` empty)                                                                                                                               | `approved`            |

Notes on applying the matrix:

- "Unresolved" means the entry is still routed to `decision_needed` or `patch` and has not been explicitly accepted as a deferral. `defer` entries are pre-existing issues, not blockers for this change.
- Row 5 is `approved` **with notes**: the remaining findings and any verification gaps MUST still appear in the review comment.
- If findings remain but `{failed_layers}` is non-empty, still apply rows 3–5 on what was found, and record the incomplete coverage in `{review_summary}` so the comment says the review may be partial.
- If zero findings remain AND `{failed_layers}` is non-empty, row 6 does not apply — a clean result from a partially failed review is not verified. Fall through to `inconclusive` and set `{review_inconclusive_reason}` to the failed layers.
- **There is no rule that approves because an expected section was absent.** An output that does not contain a blocking-findings section, a verdict line, or any recognizable triage result matches row 1, not row 6.

When the verdict is `inconclusive`, set `{review_inconclusive_reason}` to a one-line, specific statement of what was unavailable (e.g. `no diff could be resolved for branch feat/foo vs main`, `bmad-code-review halted during the review stage`, `2 of 3 review layers failed`).

### 5. Capture findings to Lore (optional)

This step is gated on Lore being configured for the project under review.

1. **Detect Lore configuration.** Attempt to read `lore.yaml` from the project root via the Read tool.
   - If the file is missing, malformed, or lacks `project.slug`: set `{lore_enabled}` = `'false'`, `{lore_findings_captured}` = `'0'`, and skip the rest of this section silently. Continue to instruction 6.
   - If `project.slug` is set: set `{lore_enabled}` = `'true'`, `{lore_project_slug}` = the slug value.

2. **Skip if nothing to capture.** If `{review_findings}` is empty, skip silently. If `{review_verdict}` = `inconclusive`, skip silently — an inconclusive review has not established that any finding is real.

3. **Capture each finding.** For each finding in `{review_findings}`, call `capture_review_finding` on the `lore-memory-{lore_project_slug}` MCP server with:
   - `external_task_id`: `{task_id}`
   - `external_tracker_type`: `clickup`
   - `external_task_ref`: `{task_url}`
   - `severity`: map the BMAD 6.11 action + severity pair to Lore's `critical` / `high` / `medium` / `low`:
     - `patch` or `decision_needed` at severity `high` -> `critical`
     - `patch` or `decision_needed` at severity `medium` -> `high`
     - `defer` at severity `high` or `medium` -> `medium`
     - anything at severity `low` -> `low`
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

4. **Surface to user.** If `{lore_findings_captured}` > 0, append a single line to the verdict summary block (instruction 6):
   ```
   Captured {lore_findings_captured} finding(s) to Lore for cross-project propagation.
   ```

### 6. Confirm and continue

Emit the verdict summary block matching `{review_verdict}` and continue to step 5.

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

### Verdict summary block — inconclusive

```
⚠️ **Review verdict: INCONCLUSIVE**

Reason: {review_inconclusive_reason}

{review_summary}

The review could not reach a conclusion, so the task status will NOT be changed.
Proceeding to post the inconclusive review comment only.
```
