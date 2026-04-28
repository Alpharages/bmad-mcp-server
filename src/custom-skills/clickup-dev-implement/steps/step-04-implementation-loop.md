---
implementation_complete: 'false'
files_changed: ''
pr_url: ''
review_continuation: 'false'
---

# Step 4: Implementation Loop (via bmad-dev-story)

## RULES

1. **Delegate to bmad-dev-story.** Do NOT implement an ad-hoc execution loop here. Invoke the `bmad-dev-story` workflow via the `bmad` tool (`execute` operation, workflow name `bmad-dev-story`). All TDD logic, DoD validation, red-green-refactor cycle, and completion communication live there and stay in sync with upstream automatically.
2. **Pre-supply the story content.** The ClickUp task description (already in conversation context from step 2) IS the story file. Pass it so `bmad-dev-story` step 1 resolves immediately without searching for a local story file.
3. **Skip file-system side-effects.** Instruct `bmad-dev-story` to skip: local story file writes, `sprint-status.yaml` updates. ClickUp is the record — steps 5–6 of this skill handle comment posting and status transition.
4. **Capture results.** After `bmad-dev-story` completes, extract `{files_changed}` and `{pr_url}` from its output so steps 5–6 can post the M2 comment and transition status.
5. **Sync contract.** This step has no embedded implementation logic. When `bmad-dev-story` improves upstream, this skill inherits those improvements automatically.

## INSTRUCTIONS

### 1. Pre-supply story content

Assemble the handoff context from what steps 1–3 already loaded:

```
Story title: {task_name}
Story ID: {task_id}
Story URL: {task_url}
Epic: {epic_name} ({epic_task_id})

--- STORY CONTENT (from ClickUp task description) ---
{full task description from step 2 getTaskById response — includes User Story, Acceptance Criteria, Tasks/Subtasks, Dev Notes, Architecture Guardrails, Previous Story Context}
--- END STORY CONTENT ---

Planning context (PRD + architecture) is already loaded in conversation context.
Project context (project-context.md): {loaded or not found}
```

### 2. Invoke bmad-dev-story with overrides

Execute the `bmad-dev-story` workflow via the `bmad` tool with the following overrides so upstream steps resolve without local file access:

**Skip (ClickUp handles these):**
- Step 1 story discovery — story content is pre-supplied above; treat it as the loaded story file. Set `story_key` = `{task_id}`, `story_path` = virtual (in-memory).
- Step 4 sprint-status update — skip entirely; ClickUp task status is managed by step 6 of this skill.
- Step 9 local story file status update — skip the `sprint-status.yaml` write; the ClickUp status transition in step 6 is the equivalent.

**Run in full (unchanged from upstream):**
- Step 2: Load project context
- Step 3: Detect review continuation — use ClickUp task comments from step 2's `getTaskById` response to detect "CHANGES REQUESTED" from a prior `clickup-code-review` run
- Step 5: Implement task following red-green-refactor cycle
- Step 6: Author comprehensive tests
- Step 7: Run validations and tests
- Step 8: Validate and mark task complete (DoD checklist)
- Step 10: Completion communication

### 3. Capture results

After `bmad-dev-story` completes:

- `{files_changed}` ← the File List from its completion output (all new/modified/deleted files, relative paths)
- `{pr_url}` ← the PR URL if a PR was opened during implementation; `''` otherwise
- `{implementation_complete}` ← `'true'` if DoD passed; `'false'` if halted

### 4. Continue

If `{implementation_complete}` = `'true'`: proceed to step 5 (M2 progress comment) and step 6 (status transition).

If `{implementation_complete}` = `'false'`: surface the HALT reason from `bmad-dev-story` to the user and stop — do not post M2 or transition status.
