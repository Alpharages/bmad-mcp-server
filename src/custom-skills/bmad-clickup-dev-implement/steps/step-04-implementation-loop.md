---
implementation_complete: 'false'
files_changed: ''
pr_url: ''
review_continuation: 'false'
lore_link_executed: ''
---

# Step 4: Implementation Loop (via bmad-build)

## RULES

1. **Delegate to bmad-build.** Do NOT implement an ad-hoc execution loop here. Invoke the `bmad-build` workflow via the `bmad` tool (`execute` operation, workflow name `bmad-build`). `bmad-build` is the single BMAD 6.11 implementation entry point: every implementation path converges on it. Clarify-and-route, spec generation, the implement loop, adversarial review, and presentation all live there and stay in sync with upstream automatically.
2. **Never call `bmad-dev-story`.** It is a BMAD v6 compatibility shim, not a BMAD 6.11 implementation path. It is not supported by this skill.
3. **Pre-supply the ClickUp task as the intent.** The ClickUp task description (already in conversation context from step 2) IS the work item. Hand it to `bmad-build` as an explicit intent so its step-01 intent check resolves on the first branch ("Explicit argument") and it never scans `{{.implementation_artifacts}}` or halts to ask the user which spec to resume.
4. **Let bmad-build own its spec.** `bmad-build` creates and maintains its own implementation spec under `{{.implementation_artifacts}}`. That is internal BMAD 6.11 bookkeeping, not a user-facing artifact, and it is required for the implement and review steps to function. Do not suppress it, and do not ask the user to create it by hand.
5. **Suppress deprecated story/sprint file writes.** `sprint-status.yaml` and BMAD story files are the v6 agile-in-the-repo model. ClickUp is the delivery/status system of record for this skill. Instruct `bmad-build` to leave `story_key` unset so its `sync-sprint-status` sub-step returns immediately, and never to write or update a BMAD story file for this task.
6. **Capture results.** After `bmad-build` completes, extract `{files_changed}` and `{pr_url}` from its output so steps 5–6 can post the M2 comment and transition status.
7. **Outer workflow owns ClickUp.** ClickUp comment posting (step 5) and status transition (step 6) stay in this skill. `bmad-build` must not post to ClickUp or transition the task.
8. **Sync contract.** This step has no embedded implementation logic. When `bmad-build` improves upstream, this skill inherits those improvements automatically.

## INSTRUCTIONS

### 1. Assemble the build intent

Assemble the handoff context from what steps 1–3 already loaded. This block is the explicit intent argument for `bmad-build`:

```
Work item: ClickUp task {task_id} — {task_name}
Task URL: {task_url}
Parent epic: {epic_name} ({epic_task_id})     ← omit this line entirely when {epic_task_id} is empty

--- WORK ITEM CONTENT (from ClickUp task description) ---
{full task description from step 2 getTaskById response — includes User Story, Acceptance Criteria, Tasks/Subtasks, Dev Notes, Architecture Guardrails, Previous Story Context}
--- END WORK ITEM CONTENT ---

--- REVIEW CONTINUATION (from ClickUp task comments) ---
{when {review_continuation} = 'true': the requested changes from the most recent
 "CHANGES REQUESTED" review comment posted by bmad-clickup-code-review, verbatim,
 newest first. Otherwise: (none — first implementation pass)}
--- END REVIEW CONTINUATION ---

Resolved planning paths (from {resolve_doc_paths_result}, step 3's doc-path cascade):
- PRD: <data.prd.path> [<data.prd.layer>] ({prd_loaded})
- Architecture: <data.architecture.path> [<data.architecture.layer>] ({architecture_loaded})
- Epics: <data.epics.path> [<data.epics.layer>]
Planning context (PRD + architecture) is already loaded in conversation context.
Project context (project-context.md): {loaded or not found}
```

Set `{review_continuation}` = `'true'` when step 2's `getTaskById` response contains a prior `bmad-clickup-code-review` comment whose verdict was `CHANGES REQUESTED`; otherwise `'false'`. When it is `'true'`, the requested changes MUST appear in the REVIEW CONTINUATION block above — a review-continuation build that does not carry the prior requested changes into `bmad-build` is a defect.

### 2. Invoke bmad-build with overrides

Execute the `bmad-build` workflow via the `bmad` tool, passing the intent block from instruction 1 plus these overrides:

**Routing:**

- The intent block IS the explicit argument for `bmad-build` step-01's intent check. It is an intent description, not a spec file with `status` frontmatter, so `bmad-build` proceeds to its INSTRUCTIONS and plans from it. Do not let it scan for and offer to resume unrelated active specs.
- Treat the work item as a planned story or issue entry. Use the freeform path unless the ClickUp task and its parent epic clearly identify a BMAD epic/story number that exists in the resolved epics artifact.

**Suppress (ClickUp is the record):**

- **Story-key resolution / sprint sync** — leave `story_key` unset. With `story_key` unset, `sync-sprint-status` returns to its caller without writing. Do not create `sprint-status.yaml` if it is absent.
- **BMAD story files** — do not write or update a story file under `{{.implementation_artifacts}}` for this task. The ClickUp task description is the story.
- **ClickUp side-effects** — do not post ClickUp comments and do not transition ClickUp status. Steps 5–6 of this skill own both.
- **Auto-push** — unchanged from upstream: never auto-push.

**Run in full (unchanged from upstream):**

- Spec generation for this work item (`bmad-build`'s own implementation spec — see RULE 4).
- The implement loop, including test authoring and validation runs.
- Adversarial review and its verification-gap analysis.
- Presentation, including the suggested review order.

### 3. Capture results

After `bmad-build` completes:

- `{files_changed}` ← the file list from its completion output (all new/modified/deleted files, relative paths)
- `{pr_url}` ← the PR URL if a PR was opened during implementation; `''` otherwise
- `{implementation_complete}` ← `'true'` if the build completed its review and presentation; `'false'` if it halted

If `bmad-build` cannot be executed at all (workflow not found, or its render command fails and it HALTs), do NOT fall back to an ad-hoc implementation loop and do NOT fall back to `bmad-dev-story`. Set `{implementation_complete}` = `'false'`, surface the failure to the user, and stop.

### 4. Continue

If `{implementation_complete}` = `'true'`: proceed to step 5 (M2 progress comment) and step 6 (status transition).

If `{implementation_complete}` = `'false'`: surface the HALT reason from `bmad-build` to the user and stop — do not post M2 or transition status.

### 5. Link consulted lessons to task (Lore — optional)

This step is gated on `{lore_enabled}` from step 3.

- **If `{lore_enabled}` != `'true'`**, skip silently and return. Do NOT emit anything.
- **If `{lore_consulted_lesson_ids}` is empty**, skip silently and set `{lore_link_executed}` = `'skipped'`.
- **Otherwise**, call `link_lessons_to_task` on the `lore-memory-{lore_project_slug}` MCP server:
  - `external_task_id`: `{task_id}`
  - `consulted`: array parsed from `{lore_consulted_lesson_ids}`
  - `applied`: subset of `consulted` that genuinely influenced the implementation (the Dev agent decides; default to `[]` if unsure)

  Non-blocking. If the call fails, set `{lore_link_executed}` = `'false'` and continue. Do NOT halt; this is bookkeeping, not a DoD gate.
