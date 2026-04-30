# Story 7.2: Scaffold `clickup-create-bug` skill

Status: done

Epic: [EPIC-7: Bug-shaped stories in ClickUp](../epics/EPIC-7-bug-shaped-stories.md)

> **Scaffold story.** Story 7-1 resolved the shape decision: **Option A — new sibling skill**
> at `src/custom-skills/clickup-create-bug/`. This story creates the skeleton structure
> that all downstream EPIC-7 stories will fill in. No implementation logic is written here —
> every step file is a clearly-labelled stub that names the story that will implement it.
>
> The scaffold must be correct enough that the Dev-agent `CB` trigger routes to it
> immediately and the skill can be invoked (even though it will abort with "not yet
> implemented" stubs until 7-3 through 7-7 land).

## Story

As a **skill author** implementing EPIC-7,
I want a correctly-shaped `clickup-create-bug/` directory with skeleton files and a `CB`
Dev-agent trigger wired in `_bmad/custom/bmad-agent-dev.toml`,
so that downstream stories (7-3 through 7-10) each have a well-defined file to fill in
without any directory restructuring or trigger-wiring rework.

## Acceptance Criteria

### Directory and file structure created

1. **`src/custom-skills/clickup-create-bug/` MUST exist** after this story lands.

2. **`SKILL.md` MUST exist** at `src/custom-skills/clickup-create-bug/SKILL.md` with valid
   YAML front-matter (`name`, `description`) and the single instruction
   `Follow the instructions in ./workflow.md.`

3. **`workflow.md` MUST exist** at `src/custom-skills/clickup-create-bug/workflow.md`
   containing a human-readable step-orchestration overview (not stubs) that describes the
   five steps, their goals, and which downstream story implements each step.

4. **Five stub step files MUST exist** under
   `src/custom-skills/clickup-create-bug/steps/`:
   - `step-01-prereq-check.md`
   - `step-02-list-picker.md`
   - `step-03-epic-picker.md`
   - `step-04-description-composer.md`
   - `step-05-create-task.md`

5. **Each stub MUST contain** a YAML front-matter block (all variables empty) matching the
   variables the step will set when implemented, a heading, a `## STATUS` section marking
   it `🚧 Not yet implemented — story <N>`, and a `## NEXT` line pointing to the next step
   file or stating "terminal step".

### Dev-agent trigger wired

6. **`_bmad/custom/bmad-agent-dev.toml` MUST gain a `CB` entry** of the form:

   ```toml
   [[agent.menu]]
   code = "CB"
   description = "Create a ClickUp bug ticket from a free-form bug report"
   skill = "clickup-create-bug"
   ```

   The existing `CS` and `DS` entries MUST remain unchanged.

### No implementation code

7. **No TypeScript files are created or modified.** `git diff --stat -- src/` on `.ts` files
   MUST be empty.

8. **No test files are created or modified.** `git diff --stat -- tests/` MUST be empty.

9. **The only files changed are:**
   - `src/custom-skills/clickup-create-bug/SKILL.md` (new)
   - `src/custom-skills/clickup-create-bug/workflow.md` (new)
   - `src/custom-skills/clickup-create-bug/steps/step-01-prereq-check.md` (new)
   - `src/custom-skills/clickup-create-bug/steps/step-02-list-picker.md` (new)
   - `src/custom-skills/clickup-create-bug/steps/step-03-epic-picker.md` (new)
   - `src/custom-skills/clickup-create-bug/steps/step-04-description-composer.md` (new)
   - `src/custom-skills/clickup-create-bug/steps/step-05-create-task.md` (new)
   - `_bmad/custom/bmad-agent-dev.toml` (modified — add `CB` entry)
   - `planning-artifacts/stories/7-2-scaffold-bug-skill.md` (this file)
   - `planning-artifacts/sprint-status.yaml` (status update)

### sprint-status.yaml updated

10. **`7-2-scaffold-bug-skill` MUST transition from `backlog` → `ready-for-dev`** when
    this story file is created, and **→ `done`** when the story is completed.

### Commit

11. **Commit message MUST follow Conventional Commits:**
    ```
    feat(custom-skills): scaffold clickup-create-bug skill (story 7-2)
    ```
    Body MUST list the new files and reference story 7.2.

## Out of Scope

- Implementing any step logic (prereq check, list picker, description composer, create task
  — those are stories 7-3 through 7-7).
- Tags, priority, severity inference (story 7-6).
- Optional epic parent wiring (story 7-7, depends on EPIC-8).
- Tests and fixtures (story 7-9).
- Documentation updates (story 7-10).
- Any changes to `clickup-create-story`, `clickup-create-epic`, or
  `clickup-dev-implement` files.

## Tasks / Subtasks

- [x] **Task 1 — Create skill directory and SKILL.md** (AC: #1, #2)
  - [x] Create `src/custom-skills/clickup-create-bug/SKILL.md` with front-matter and
        workflow delegation line.

- [x] **Task 2 — Create workflow.md** (AC: #3)
  - [x] Create `src/custom-skills/clickup-create-bug/workflow.md` with step-orchestration
        overview describing all five steps and their implementing stories.

- [x] **Task 3 — Create stub step files** (AC: #4, #5)
  - [x] `steps/step-01-prereq-check.md` — stub → story 7-3
  - [x] `steps/step-02-list-picker.md` — stub → story 7-5
  - [x] `steps/step-03-epic-picker.md` — stub → story 7-7 (EPIC-8 dependency)
  - [x] `steps/step-04-description-composer.md` — stub → story 7-4
  - [x] `steps/step-05-create-task.md` — stub → stories 7-6 + 7-7

- [x] **Task 4 — Wire CB trigger** (AC: #6)
  - [x] Add `[[agent.menu]]` `CB` entry to `_bmad/custom/bmad-agent-dev.toml`.

- [x] **Task 5 — Update sprint-status.yaml** (AC: #10)
  - [x] Set `7-2-scaffold-bug-skill: done`.

- [x] **Task 6 — Commit** (AC: #11)
  - [x] Stage all new/modified files.
  - [x] Commit with Conventional Commits header + body per AC #11.

## Dev Notes

### Sibling skill precedent

`clickup-create-story` and `clickup-create-epic` are the two established sibling skills.
`clickup-create-bug` follows the same directory/file convention:

```
src/custom-skills/clickup-create-bug/
├── SKILL.md
├── workflow.md
└── steps/
    ├── step-01-prereq-check.md
    ├── step-02-list-picker.md
    ├── step-03-epic-picker.md
    ├── step-04-description-composer.md
    └── step-05-create-task.md
```

Compare to `clickup-create-story/`:

```
src/custom-skills/clickup-create-story/
├── SKILL.md
├── workflow.md
└── steps/
    ├── step-01-prereq-check.md   → prereq (PRD+arch required)
    ├── step-02-epic-picker.md    → epic picker (required)
    ├── step-03-sprint-list-picker.md → sprint picker
    ├── step-04-description-composer.md → delegates to bmad-create-story
    └── step-05-create-task.md    → createTask
```

Bug skill divergences from story skill:
- **step-01**: PRD + architecture are **optional** (warn but continue) — implemented in 7-3.
- **step-02**: Picks the _target list_ (dedicated bug list OR sprint list, governed by
  `.bmadmcp/config.toml` `[clickup_create_bug].target_list_id`) — implemented in 7-5.
- **step-03**: Optional epic parent picker (skippable; full implementation in 7-7 after
  EPIC-8 lands). Stub must allow the step to be skipped.
- **step-04**: Bug-shaped description composer — parses user's free-form bug report into
  the template (Summary / Steps to reproduce / Expected / Actual / Impact / Suspected area /
  Environment / Related links). No `bmad-create-story` delegation — implemented in 7-4.
- **step-05**: `createTask` with `bug` tag and priority inferred from severity —
  implemented in 7-6 (tags/priority) and 7-7 (optional parent).

### SKILL.md front-matter

```yaml
---
name: clickup-create-bug
description: 'Creates a ClickUp bug ticket from a free-form bug report, with a
  bug-shaped description (repro / expected / actual / impact / suspected area).
  PRD and architecture are optional. Use when the user says "create a bug",
  "report a bug", or "log bug [description]".'
---
```

### workflow.md high-level overview

The workflow.md should NOT contain stubs — it should be a real orchestration document that
describes the full intended flow (what each step will do once implemented) and references
each step file. This gives later story authors the full picture without reading the epic.

Sections:
1. **Goal** — one paragraph (see EPIC-7 `## Goal`)
2. **Prerequisites** — ClickUp permission gate + soft artifact load (step 1)
3. **Target-list picker** — pick bug list or sprint list (step 2)
4. **[Optional] Epic picker** — skippable; EPIC-8 dependency (step 3)
5. **Description composer** — parse free-form report → template (step 4)
6. **Task creation** — duplicate check + createTask with bug defaults (step 5)

### Step stub format

Each stub must include YAML front-matter, a heading, a `## STATUS` block, and a `## NEXT`
line. Example for step-01:

```markdown
---
prd_content: ''
architecture_content: ''
epics_content: ''
---

# Step 1: Prereq Check

## STATUS

🚧 **Not yet implemented — story 7-3**

This step will: verify `CLICKUP_MCP_MODE=write` and ClickUp token authentication
(identical to `clickup-create-story` step 1), then soft-load PRD + architecture via
`bmad({ operation: 'resolve-doc-paths' })` — warning if either file is missing but
**not aborting** (bugs do not require planning artifacts).

See: [EPIC-7 story 7-3](../../../../../planning-artifacts/epics/EPIC-7-bug-shaped-stories.md)

## NEXT

Proceed to [step-02-list-picker.md](./step-02-list-picker.md).
```

### `_bmad/custom/bmad-agent-dev.toml` edit

Append the following block after the existing `DS` entry:

```toml
[[agent.menu]]
code = "CB"
description = "Create a ClickUp bug ticket from a free-form bug report"
skill = "clickup-create-bug"
```

### Config table reserved for later stories

`.bmadmcp/config.toml` `[clickup_create_bug]` table keys (to be documented in story 7-10,
but reserved here so step stubs can reference them):
- `target_list_id` — optional; pinned target list (story 7-5)
- `default_priority` — optional; overrides severity-inferred priority (story 7-6)
- `default_tags` — optional; extra tags beyond `bug` (story 7-6)

No actual config writes are performed by the scaffold itself.

### Git intelligence

Recent pattern: scaffold stories (e.g., 3-1-scaffold-clickup-dev-implement-skill) committed
as `feat(custom-skills): scaffold <skill-name> skill (story N-M)`. The commit message
convention for this story follows the same pattern.

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (root agent)

### Completion Notes List

- Task 1: Created `src/custom-skills/clickup-create-bug/` directory and `SKILL.md` with valid YAML front-matter (`name`, `description`) and workflow delegation line.
- Task 2: Created `workflow.md` with human-readable step-orchestration overview describing all five steps, their goals, and which downstream story implements each step.
- Task 3: Created five stub step files under `steps/` with YAML front-matter (all variables empty), heading, `## STATUS` section marking `🚧 Not yet implemented — story <N>`, and `## NEXT` line pointing to the next step or stating "terminal step".
- Task 4: Appended `[[agent.menu]]` `CB` entry to `_bmad/custom/bmad-agent-dev.toml` after the existing `DS` entry, preserving `CS` and `DS` unchanged.
- Task 5: Updated `planning-artifacts/sprint-status.yaml`: `7-2-scaffold-bug-skill` → `done`, `last_updated` → 2026-04-30.
- Task 6: Committed with `feat(custom-skills): scaffold clickup-create-bug skill (story 7-2)`.

### File List

**New**

- `src/custom-skills/clickup-create-bug/SKILL.md`
- `src/custom-skills/clickup-create-bug/workflow.md`
- `src/custom-skills/clickup-create-bug/steps/step-01-prereq-check.md`
- `src/custom-skills/clickup-create-bug/steps/step-02-list-picker.md`
- `src/custom-skills/clickup-create-bug/steps/step-03-epic-picker.md`
- `src/custom-skills/clickup-create-bug/steps/step-04-description-composer.md`
- `src/custom-skills/clickup-create-bug/steps/step-05-create-task.md`

**Modified**

- `_bmad/custom/bmad-agent-dev.toml`
- `planning-artifacts/stories/7-2-scaffold-bug-skill.md`
- `planning-artifacts/sprint-status.yaml`

**Deleted**

- (none)

## Change Log

| Date       | Change |
| ---------- | ------ |
| 2026-04-30 | Story drafted. Status → ready-for-dev. |
| 2026-04-30 | Story implemented. All ACs satisfied. Status → done. |
