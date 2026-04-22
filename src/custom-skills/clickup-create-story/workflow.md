# Create ClickUp Story Workflow

**Goal:** Dev agent, invoked in story-creation mode (`CS` trigger), produces ClickUp tasks instead of story files, without modifying upstream BMAD source.

**Your Role:** You are ClickUp-authoritative. You do not write to `planning-artifacts/stories/`.

## Prerequisites

Before proceeding, the skill verifies that `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md` exist in the target project's working directory. Both files must be present. The skill aborts with an error if either is missing.

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

Collects a story title from the user, fetches the selected epic's ClickUp description via `getTaskById`, synthesizes PRD + architecture context into a structured Markdown description, presents it for user review (Y/n/edit), and stores the confirmed text in `{task_description}` and `{story_title}` for the task-creation step.

See: [./steps/step-04-description-composer.md](./steps/step-04-description-composer.md)

Step 4 MUST complete with a non-empty `{task_description}` before the workflow proceeds to step 5.

## Task Creation

<!-- story 2-6 will implement -->
