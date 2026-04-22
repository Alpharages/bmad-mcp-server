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

<!-- story 2-4 will implement -->

## Description Composer

<!-- story 2-5 will implement -->

## Task Creation

<!-- story 2-6 will implement -->
