# Create ClickUp Epic Workflow

**Goal:** Create a root-level ClickUp task (epic) in the Backlog list of the active space, with a description composed from PRD, architecture, and the local `planning-artifacts/epics-and-stories.md` content. Does not write any local files.

**Your Role:** You are ClickUp-authoritative. You do not write to `planning-artifacts/` or create any local YAML. ClickUp is the single source of truth.

## Prerequisites

Before proceeding, the skill verifies that `planning-artifacts/PRD.md`, `planning-artifacts/architecture.md`, and `planning-artifacts/epics-and-stories.md` exist in the target project's working directory. All three files must be present. The skill aborts with an error if any are missing.

Before checking project files, step 1 verifies that `CLICKUP_MCP_MODE=write` (so `createTask` is registered) and that the `CLICKUP_API_KEY` token authenticates against the ClickUp API; the skill aborts with an actionable error if either check fails.

See: [./steps/step-01-prereq-check.md](./steps/step-01-prereq-check.md)

## Backlog List Picker

Presents the user with their ClickUp spaces, finds the Backlog list in the selected space, and stores it as `{backlog_list_id}` and `{space_name}`.

See: [./steps/step-02-backlog-list-picker.md](./steps/step-02-backlog-list-picker.md)

`{space_id}`, `{space_name}`, and `{backlog_list_id}` are available to downstream steps after this step completes.

## Local Epic Picker

Reads `planning-artifacts/epics-and-stories.md`, parses the list of epics, and presents them to the user so they can select which epic to create in ClickUp.

See: [./steps/step-03-local-epic-picker.md](./steps/step-03-local-epic-picker.md)

`{epic_number}`, `{epic_title}`, and `{epic_raw_content}` are available to downstream steps after this step completes.

Step 3 MUST complete with non-empty `{epic_title}` before the workflow proceeds to step 4.

## Description Composer

Synthesizes PRD + architecture + local epic content into a structured Markdown description, presents it for user review (Y/n/edit), and stores the confirmed text in `{epic_description}` for the task-creation step.

See: [./steps/step-04-description-composer.md](./steps/step-04-description-composer.md)

Step 4 MUST complete with a non-empty `{epic_description}` before the workflow proceeds to step 5.

## Task Creation

Validates all required context from steps 01–04, calls `searchTasks` to check for a duplicate epic name in the Backlog list, presents a pre-creation summary for user confirmation, calls `createTask({ list_id: {backlog_list_id}, name: {epic_title}, description: {epic_description} })` with no `parent_task_id` (epics are root-level), and stores the created task's `{created_task_id}` and `{created_task_url}`.

See: [./steps/step-05-create-task.md](./steps/step-05-create-task.md)

Step 5 is the terminal step of the skill. If `createTask` returns an error, the step surfaces it and stops — it does not retry silently.
