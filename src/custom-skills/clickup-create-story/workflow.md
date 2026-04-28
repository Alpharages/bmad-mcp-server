# Create ClickUp Story Workflow

**Goal:** Dev agent, invoked in story-creation mode (`CS` trigger), produces ClickUp tasks instead of story files, without modifying upstream BMAD source.

**Your Role:** You are ClickUp-authoritative. You do not write to `planning-artifacts/stories/`.

## Prerequisites

Before proceeding, the skill verifies that `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md` exist (required) and optionally loads `planning-artifacts/epics-and-stories.md` (strongly preferred — enables full BDD acceptance criteria and task breakdown). The skill aborts if either required file is missing.

Before checking project files, step 1 verifies that `CLICKUP_MCP_MODE=write` (so `createTask` is registered) and that the `CLICKUP_API_KEY` token authenticates against the ClickUp API; the skill aborts with an actionable error if either check fails.

See: [./steps/step-01-prereq-check.md](./steps/step-01-prereq-check.md)

## Pickers

### Epic picker

Presents the user with their ClickUp spaces and the tasks (epics) in the selected space's Backlog list so they can choose an epic interactively.

See: [./steps/step-02-epic-picker.md](./steps/step-02-epic-picker.md)

`{epic_id}` and `{epic_name}` are available to downstream steps after this step completes.

### Sprint-list picker

Discovers the sprint folder in the selected space, lists all non-archived sprint lists within it, presents the choices to the user with an active-sprint hint, and stores the selected list as `{sprint_list_id}` and `{sprint_list_name}`.

See: [./steps/step-03-sprint-list-picker.md](./steps/step-03-sprint-list-picker.md)

Step 3 MUST complete with a non-empty `{sprint_list_id}` before the workflow proceeds to step 4.

## Description Composer

Delegates to the `bmad-create-story` workflow in content-composition mode (skip file writes, return content). `bmad-create-story` performs exhaustive artifact analysis: BDD acceptance criteria, ordered task/subtask checklist, architecture guardrails, previous-story intelligence from git, and web research for latest tech. Epic context is pre-supplied from the ClickUp fetch so story discovery is skipped. When `bmad-create-story` improves upstream, this skill inherits those improvements automatically. Presents the composed description for review (Y/n/edit) and stores the confirmed text in `{task_description}`.

See: [./steps/step-04-description-composer.md](./steps/step-04-description-composer.md)

Step 4 MUST complete with a non-empty `{task_description}` before the workflow proceeds to step 5.

## Task Creation

Validates all required context from steps 01–04, calls `searchTasks` to check for duplicate task names in the target sprint list, presents a pre-creation summary for user confirmation, calls `createTask({ list_id: {sprint_list_id}, name: {story_title}, description: {task_description}, parent_task_id: {epic_id} })`, and stores the created task's `{created_task_id}` and `{created_task_url}`.

See: [./steps/step-05-create-task.md](./steps/step-05-create-task.md)

Step 5 is the terminal step of the skill. If `createTask` returns an error, the step surfaces it and stops — it does not retry silently.
