# Story 9.4: Add No-Epic Option Note to README

Status: done

Epic: [EPIC-9: README freshness pass](../epics/EPIC-9-readme-freshness.md)

> This story covers punch list item D — two touch-points in the README that have no
> mention of EPIC-8's no-epic option. Both are co-located in the README and land in a
> single commit: (1) Walkthrough Step 10's "What runs" and "Expected" paragraphs, and
> (2) the `clickup-create-story` Custom Skills subsection description and steps line.

## Story

As a **new user reading the README**,
I want to see that `clickup-create-story` can create a standalone task without requiring
an epic parent, and that Walkthrough Step 10 reflects this optional path,
so that I know I can file stories for work that doesn't belong under any epic without
having to search the step files.

## Acceptance Criteria

### Walkthrough Step 10 — "What runs" paragraph (punch list D.1)

1. **Epic-picker step updated.** The "What runs" paragraph at README line 311 MUST update
   step ② to mention the no-epic option:

   > ② epic picker (space → Backlog → your epic; when `allow_no_epic` is `true` — the
   > default — the list also includes `[0] No epic — create as standalone task`)

2. **"Expected" paragraph updated.** The "Expected" paragraph at README line 313 MUST be
   reworded to cover both outcomes:

   > **Expected.** A ClickUp URL printed in chat. If you picked an epic in step ②, the
   > new task is a subtask of that epic; if you chose `[0] No epic`, it is created as a
   > standalone top-level task. Either way, the task description references your PRD and
   > architecture.

### Custom Skills — `clickup-create-story` subsection (punch list D.2)

3. **Description updated.** The opening paragraph of the `### \`clickup-create-story\``
   subsection (README line 610) MUST be updated to mention the standalone (no-epic) path.
   Change from:

   > Creates a ClickUp task (story) as a subtask of a chosen epic in the active sprint
   > list. Delegates to …

   To:

   > Creates a ClickUp task (story) in the active sprint list — as a subtask of a chosen
   > epic, or as a standalone top-level task when no epic parent is needed. Delegates to …

4. **Steps line updated.** The **Steps** line at README line 616 MUST mention the no-epic
   path through the epic picker. Change from:

   > **Steps:** prereq + auth check → epic picker → sprint-list picker →
   > `bmad-create-story` (description composition only, no file write) → review (Y/n/edit)
   > → `createTask`

   To:

   > **Steps:** prereq + auth check → epic picker (`[0] No epic` available when
   > `allow_no_epic = true`) → sprint-list picker → `bmad-create-story` (description
   > composition only, no file write) → review (Y/n/edit) → `createTask`

5. **`allow_no_epic` config key noted.** A config-key note MUST be added immediately after
   the steps line and before the `---` separator:

   > **Config key:** `[clickup_create_story].allow_no_epic` (boolean, default `true`) —
   > set to `false` to hide the `[0] No epic` entry and always require an epic parent.

### Story file and sprint-status.yaml

6. **Story file saved** as
   `planning-artifacts/stories/9-4-document-no-epic-option.md`
   with Status set to `review` after implementation.

7. **sprint-status.yaml updated:**
   - `9-4-document-no-epic-option`: `backlog` → `review` after implementation.
   - `last_updated` field updated.

### Change isolation

8. Only `README.md`, `planning-artifacts/stories/9-4-document-no-epic-option.md`,
   and `planning-artifacts/sprint-status.yaml` are modified.
   - `git diff --stat -- 'src/**/*.ts'` MUST be empty.
   - `git diff --stat -- tests/` MUST be empty.

### Commit

9. Commit message MUST follow Conventional Commits:

   ```
   docs(readme): add no-epic option note to walkthrough and custom-skills (story 9-4)
   ```

   Body MUST reference story 9.4, name the modified files
   (`README.md`, `planning-artifacts/stories/9-4-document-no-epic-option.md`,
   `planning-artifacts/sprint-status.yaml`), and confirm that source and test files
   are unmodified.

## Out of Scope

- Expanding the `[clickup_create_story]` table in the "Project-local config" section with
  `allow_no_epic` and its full description (punch list item E — story 9-5).
- Rewording walkthrough steps 4, 8, 9 (punch list F.1/F.2 — story 9-6).
- Adding a `clickup-create-bug` subsection (punch list C — story 9-3, already done).
- Adding `resolve-doc-paths` to the operations table (story 9-5).

## Tasks / Subtasks

- [ ] **Task 1 — Update Step 10 "What runs" paragraph (AC: #1)**
  - [ ] In the sentence starting "**What runs.** Five sub-steps:", update step ②
        `epic picker (space → Backlog → your epic)` to include the no-epic option note.
  - [ ] Keep all other sub-steps unchanged.

- [ ] **Task 2 — Update Step 10 "Expected" paragraph (AC: #2)**
  - [ ] Replace the single-outcome sentence with the two-outcome wording from AC #2.

- [ ] **Task 3 — Update `clickup-create-story` description (AC: #3)**
  - [ ] Change "as a subtask of a chosen epic" to "as a subtask of a chosen epic, or as
        a standalone top-level task when no epic parent is needed".

- [ ] **Task 4 — Update `clickup-create-story` Steps line (AC: #4)**
  - [ ] Append `(\`[0] No epic\` available when \`allow_no_epic = true\`)` to the
        epic-picker step in the Steps line.

- [ ] **Task 5 — Add `allow_no_epic` config key note (AC: #5)**
  - [ ] Insert the config-key note immediately after the updated Steps line, before `---`.

- [ ] **Task 6 — Update sprint-status.yaml (AC: #7)**
  - [ ] Set `9-4-document-no-epic-option`: `backlog` → `review`.
  - [ ] Update `last_updated` field.

- [ ] **Task 7 — Regression verification (AC: #8)**
  - [ ] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [ ] `git diff --stat -- tests/` → empty.
  - [ ] `npm run build && npm run lint` → clean.

- [ ] **Task 8 — Commit (AC: #9)**
  - [ ] Stage `README.md`, story file, `sprint-status.yaml`.
  - [ ] Commit with header + body per AC #9.

## Dev Notes

### Current README state (post-story-9-3)

**Walkthrough Step 10 (lines 303–316):**

```
### Step 10 — Create a story under the epic

**Action.** Open your AI client **inside your project repo** (cwd matters), then ask:

> Invoke the `clickup-create-story` skill against pilot epic `<epic-id>`.

Replace `<epic-id>` with the value from Step 9.

**What runs.** Five sub-steps: ① prereq check (cwd + permissions + load PRD/architecture) → ② epic picker (space → Backlog → your epic) → ③ sprint-list picker → ④ description composer (synthesizes story title + body from PRD + architecture + epic context, with your review) → ⑤ `createTask`.

**Expected.** A ClickUp URL printed in chat, pointing at a new task that is a subtask of your epic. The task description references your PRD and architecture.

**Fix.** If the skill stops at step 1 with a permission error, your `CLICKUP_MCP_MODE` isn't `write` — re-check Step 6. If it stops at the cwd assertion, you're not in the pilot repo — check Step 8.
```

**Custom Skills `clickup-create-story` subsection (lines 608–620):**

```
### `clickup-create-story`

Creates a ClickUp task (story) as a subtask of a chosen epic in the active sprint list. Delegates to `bmad-create-story` for exhaustive description composition: BDD acceptance criteria, task/subtask checklist, architecture guardrails, previous-story intelligence from git, and web research. When `bmad-create-story` improves upstream, this skill inherits those improvements automatically.

**Trigger:**

> Invoke the `clickup-create-story` skill against epic `<epic-id>`.

**Steps:** prereq + auth check → epic picker → sprint-list picker → `bmad-create-story` (description composition only, no file write) → review (Y/n/edit) → `createTask`

**Optional but recommended:** `planning-artifacts/epics-and-stories.md` (enables full BDD criteria from story spec)
```

### Target text for Step 10

**Replace "What runs" line with:**

```
**What runs.** Five sub-steps: ① prereq check (cwd + permissions + load PRD/architecture) → ② epic picker (space → Backlog → your epic; when `allow_no_epic` is `true` — the default — the list also includes `[0] No epic — create as standalone task`) → ③ sprint-list picker → ④ description composer (synthesizes story title + body from PRD + architecture + epic context, with your review) → ⑤ `createTask`.
```

**Replace "Expected" line with:**

```
**Expected.** A ClickUp URL printed in chat. If you picked an epic in step ②, the new task is a subtask of that epic; if you chose `[0] No epic`, it is created as a standalone top-level task. Either way, the task description references your PRD and architecture.
```

### Target text for Custom Skills subsection

**Replace opening paragraph:**

```
Creates a ClickUp task (story) in the active sprint list — as a subtask of a chosen epic, or as a standalone top-level task when no epic parent is needed. Delegates to `bmad-create-story` for exhaustive description composition: BDD acceptance criteria, task/subtask checklist, architecture guardrails, previous-story intelligence from git, and web research. When `bmad-create-story` improves upstream, this skill inherits those improvements automatically.
```

**Replace Steps line and add config key note (replacing the current Steps line through the `---` separator):**

```
**Steps:** prereq + auth check → epic picker (`[0] No epic` available when `allow_no_epic = true`) → sprint-list picker → `bmad-create-story` (description composition only, no file write) → review (Y/n/edit) → `createTask`

**Config key:** `[clickup_create_story].allow_no_epic` (boolean, default `true`) — set to `false` to hide the `[0] No epic` entry and always require an epic parent.

**Optional but recommended:** `planning-artifacts/epics-and-stories.md` (enables full BDD criteria from story spec)
```

### Key constraints

- **Do not** touch the walkthrough step Action trigger phrase ("Invoke the `clickup-create-story` skill against pilot epic `<epic-id>`.") — it's an example invocation, not wrong.
- **Do not** expand the Project-local config table with `allow_no_epic` (story 9-5's remit).
- **Do not** modify Step 8's `.bmad-pilot-marker` content (story 9-6's remit).
- The `allow_no_epic` config key note in the subsection is for discoverability; the full description with all `[clickup_create_story]` keys lands in story 9-5.

### Source of truth for no-epic behavior

- `src/custom-skills/clickup-create-story/SKILL.md` — already updated in story 8-7:
  "Creates a ClickUp task in the active sprint list — as a subtask of a chosen epic, or as a standalone top-level task when no epic parent is needed…"
- `src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md` — implements the
  `[0] No epic — create as standalone task` picker entry and `allow_no_epic` config flag
- `.bmadmcp/config.example.toml` line 40:
  `# allow_no_epic = true   # Set false to hide the "no epic" option and always require an epic parent`
- Story 8-7 (`planning-artifacts/stories/8-7-skill-docs-no-epic.md`) — full spec for
  SKILL.md / workflow.md updates in EPIC-8

### Files changed by this story

**Modified:**
- `README.md` — Step 10 "What runs" + "Expected" + `clickup-create-story` subsection
- `planning-artifacts/sprint-status.yaml` — story 9-4 status
- `planning-artifacts/stories/9-4-document-no-epic-option.md` — this file

**Unchanged:**
- All TypeScript source and test files
- `CLAUDE.md`
- `docs/` directory files

### Previous story learnings (from 9-3)

- Line numbers shift after each story lands. Verify exact line numbers with `grep -n`
  before editing; do not rely on the line numbers recorded in this file.
- Use `npm run build && npm run lint` (not just `lint`) to catch both type errors and
  style violations before committing.
- The `---` separator between skill subsections is load-bearing for markdown rendering.
  Preserve it when inserting new lines before or after it.

### References

- Punch list item D [Source: planning-artifacts/epics/EPIC-9-punch-list.md §D]
- No-epic SKILL.md / workflow.md updates [Source: planning-artifacts/stories/8-7-skill-docs-no-epic.md]
- Epic picker step-02 implementation [Source: src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md]
- Config schema [Source: .bmadmcp/config.example.toml §[clickup_create_story]]
- Previous story learnings [Source: planning-artifacts/stories/9-3-document-bug-skill.md]
- EPIC-9 goals [Source: planning-artifacts/epics/EPIC-9-readme-freshness.md]
