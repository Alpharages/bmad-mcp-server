# Create ClickUp Story Workflow

**Goal:** Dev agent, invoked in story-creation mode (`CS` trigger), produces ClickUp tasks instead of story files, without modifying upstream BMAD source. Supports both epic-parented tasks (default) and standalone top-level tasks via the no-epic path.

**Your Role:** You are ClickUp-authoritative. You do not write to `planning-artifacts/stories/`.

## Prerequisites

Before proceeding, the skill calls `bmad({ operation: 'resolve-doc-paths' })` to determine PRD, architecture, and epics paths via the 3-layer cascade (`.bmadmcp/config.toml [docs]` → BMAD `_bmad/config.toml` chain → `planning-artifacts/` default), then verifies the required files exist at the resolved paths. The skill aborts if either required file is missing, surfacing the cascade layer that produced the path and instructions for all three override layers.

Before checking project files, step 1 verifies that `CLICKUP_MCP_MODE=write` (so `createTask` is registered) and that the `CLICKUP_API_KEY` token authenticates against the ClickUp API; the skill aborts with an actionable error if either check fails.

See: [./steps/step-01-prereq-check.md](./steps/step-01-prereq-check.md)

## Pickers

### Epic picker

Presents the user with their ClickUp spaces and the tasks (epics) in the selected space's Backlog list so they can choose an epic interactively. When `[clickup_create_story].allow_no_epic` is `true` (the default), a `[0] No epic — create as standalone task` entry is prepended to the picker list. Selecting `[0]` sets `{epic_id}` = `''` (the no-epic sentinel) and `{epic_name}` = `''`. If the Backlog list is empty and `allow_no_epic` is `true`, the user is offered a Y/n prompt to continue as a standalone task rather than receiving a hard-stop error. Setting `[clickup_create_story].allow_no_epic = false` in `.bmadmcp/config.toml` hides the `[0]` entry and restores the original hard-stop when the Backlog list is empty.

See: [./steps/step-02-epic-picker.md](./steps/step-02-epic-picker.md)

`{epic_id}` and `{epic_name}` are available to downstream steps after this step completes. On the no-epic path both values are `''`.

### Sprint-list picker

Discovers the sprint folder in the selected space, lists all non-archived sprint lists within it, presents the choices to the user with an active-sprint hint, and stores the selected list as `{sprint_list_id}` and `{sprint_list_name}`.

See: [./steps/step-03-sprint-list-picker.md](./steps/step-03-sprint-list-picker.md)

Step 3 MUST complete with a non-empty `{sprint_list_id}` before the workflow proceeds to step 4.

## Description Composer

Delegates to the `bmad-create-story` workflow in content-composition mode (skip file writes, return content). `bmad-create-story` performs exhaustive artifact analysis: BDD acceptance criteria, ordered task/subtask checklist, architecture guardrails, previous-story intelligence from git, and web research for latest tech. When `{epic_id}` is non-empty (branch 3a), epic context is pre-supplied from the ClickUp fetch so story discovery is skipped. When `{epic_id}` is `''` (branch 3b — no-epic path), `getTaskById` is skipped, only sentinel placeholders (`Epic: (none — standalone task)`, `Epic description: (none)`) are passed to `bmad-create-story` in place of real epic content, and the composed description contains no "Epic:" or "Parent epic:" field. When `bmad-create-story` improves upstream, this skill inherits those improvements automatically. Presents the composed description for review (Y/n/edit) and stores the confirmed text in `{task_description}`.

See: [./steps/step-04-description-composer.md](./steps/step-04-description-composer.md)

Step 4 MUST complete with a non-empty `{task_description}` before the workflow proceeds to step 5.

## Task Creation

Validates all required context from steps 01–04, calls `searchTasks` to check for duplicate task names in the target sprint list, presents a pre-creation summary for user confirmation, then calls `createTask`. When `{epic_id}` is non-empty, the call includes `parent_task_id: {epic_id}`; when `{epic_id}` is `''` (no-epic path), `parent_task_id` is omitted entirely. The pre-creation summary shows `*(none — standalone task)*` (rendered as italic) as the parent-epic line when `{epic_id}` is empty, so the user can confirm intent before the API call. The created task's `{created_task_id}` and `{created_task_url}` are stored on success.

See: [./steps/step-05-create-task.md](./steps/step-05-create-task.md)

Step 5 is the terminal step of the skill. If `createTask` returns an error, the step surfaces it and stops — it does not retry silently.
