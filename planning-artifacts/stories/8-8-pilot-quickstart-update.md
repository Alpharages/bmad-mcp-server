# Story 8.8: Pilot Quickstart Update — No-Epic Option

Status: done

Epic: [EPIC-8: No-epic stories (standalone tasks)](../epics/EPIC-8-no-epic-stories.md)

> Stories 8-1 through 8-7 implemented the full no-epic path: the `[0] No epic` picker
> entry and `allow_no_epic` config flag (8-1, 8-4), the no-epic branch in the description
> composer (8-2), conditional `parent_task_id` omission and pre-creation summary phrase
> (8-3), the sprint-list-picker regression test (8-5), the no-epic-paths test suite (8-6),
> and the `SKILL.md` / `workflow.md` documentation update (8-7). The last remaining gap is
> `docs/clickup-quickstart.md`, which still describes `clickup-create-story` as always
> requiring an epic parent and makes no mention of the no-epic option or the `allow_no_epic`
> config key.
>
> No changes to any step file, TypeScript source, or test file.

## Story

As a **team lead** reading `docs/clickup-quickstart.md` before their first
`clickup-create-story` invocation,
I want the quickstart to reflect that the skill can create standalone (no-epic)
top-level tasks — covering the `[0] No epic` picker entry, the `allow_no_epic` config
flag, and example use cases (ops tasks, research spikes) — so that I can discover and
use the no-epic path without digging into skill step files.

## Acceptance Criteria

### `## Invoke clickup-create-story` — What the skill does paragraph

1. **Description updated.** The opening paragraph MUST change from:

   ```
   The `clickup-create-story` skill creates a ClickUp task as a subtask of a chosen
   epic in the active sprint list, with a description composed from the pilot repo's
   `planning-artifacts/PRD.md` + `planning-artifacts/architecture.md` + the epic's
   ClickUp body.
   ```

   to wording that names both the epic-parented path (default) and the standalone
   no-epic path. The updated sentence MUST note that standalone tasks are appropriate
   for ops tasks, research spikes, or any work that does not belong under an epic.
   The links to `SKILL.md` and `workflow.md` are NOT removed.

### `## Invoke clickup-create-story` — Step-by-step expectations

2. **Step-02 description updated.** The step-02 line in the step-by-step list MUST
   change from:

   ```
   `step-02-epic-picker` — space picker → Backlog list → epic selector
   ```

   to wording that notes the `[0] No epic — create as standalone task` entry is
   prepended to the picker list when `allow_no_epic` is `true` (the default).
   The other four step lines (`step-01`, `step-03`, `step-04`, `step-05`) and the
   verbatim permission-gate message are NOT modified.

3. **No-epic path noted.** A sentence or note following the step list MUST state that
   selecting `[0]` produces a top-level ClickUp task with no parent epic, and that the
   pre-creation summary shows `_(none — standalone task)_` as the parent line so the
   user can confirm intent before the API call. This note MUST NOT describe internal
   sentinel values (`{epic_id}` = `''`) — it is operator-facing prose only.

### `## Invoke clickup-create-story` — What success looks like

4. **No-epic success bullet added.** A bullet MUST be added (or the existing bullet
   amended) to cover the no-epic path outcome: a new top-level ClickUp task in the
   sprint list with no parent task, with a description composed from PRD +
   architecture (no epic context block). The existing subtask bullet (epic-parented
   path) is NOT removed.

### Optional: pinned-ID config knobs — `[clickup_create_story]` table

5. **`allow_no_epic` key documented.** The `[clickup_create_story]` table in the
   "Optional: pinned-ID config knobs" section MUST gain a row or bullet for
   `allow_no_epic`:

   ```
   - `allow_no_epic` — `true` (default) shows the `[0] No epic` picker entry and
     enables the empty-Backlog Y/n fallback. Set `false` to require an epic on every
     invocation and restore the original hard-stop when the Backlog list is empty.
   ```

   The existing `pinned_space_id`, `pinned_space_name`, `pinned_backlog_list_id`, and
   `pinned_sprint_folder_id` bullets are NOT removed or reordered.

### Change log

6. **Change log entry added.** A new row MUST be appended to `## Change log` with:
   - Date: `2026-05-01` (or the actual execution date)
   - Status: `ready-for-dev`
   - Change: one sentence referencing story 8-8 and naming the four touch-points
     (What-the-skill-does paragraph, step-02 line, no-epic path note, `allow_no_epic`
     config key).

### No changes outside `docs/clickup-quickstart.md`

7. No step files under `src/custom-skills/clickup-create-story/steps/` are modified.
   `git diff --stat -- src/custom-skills/clickup-create-story/steps/` MUST be empty.

8. No `.ts` source files are created or modified.
   `git diff --stat -- 'src/**/*.ts'` MUST be empty.

9. No test files are created or modified.
   `git diff --stat -- tests/` MUST be empty.

10. `SKILL.md` and `workflow.md` for `clickup-create-story` are NOT modified (they
    were updated by story 8-7).
    `git diff --stat -- src/custom-skills/clickup-create-story/SKILL.md src/custom-skills/clickup-create-story/workflow.md`
    MUST be empty.

11. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with no new
    failures.

### sprint-status.yaml updated

12. `8-8-pilot-quickstart-update` transitions `backlog` → `ready-for-dev` when this
    story file is saved, and → `done` when implementation is complete.

### Commit

13. Commit message MUST follow Conventional Commits:

    ```
    docs(quickstart): document no-epic option in clickup-quickstart (story 8-8)
    ```

    Body MUST reference story 8.8, name `docs/clickup-quickstart.md` as the sole
    modified file (besides story file and sprint-status.yaml), describe each change
    (What-the-skill-does paragraph, step-02 line update, no-epic path note, success
    bullet, `allow_no_epic` config key), and confirm that no step files, TypeScript,
    or tests were modified.

## Out of Scope

- Changes to any step file (`step-01` through `step-05`) — all no-epic implementation
  is complete; these files already carry the authoritative documentation.
- Propagating no-epic docs to `clickup-create-bug` — that skill has an always-optional
  epic picker (story 7-7) with no config flag; its quickstart entry (added by story
  7-10) already reflects this correctly.
- EPIC-9 README freshness pass — separate epic.
- Adding a Common Pitfalls entry for `allow_no_epic = false` blocking the option — the
  flag is a deliberate configuration choice, not a pitfall.
- Any update to `docs/clickup-quickstart.md` sections other than the four touch-points
  in AC #1–#5.

## Tasks / Subtasks

- [x] **Task 1 — Update What-the-skill-does paragraph (AC: #1)**
  - [x] Read the current `docs/clickup-quickstart.md` in full before editing.
  - [x] Locate the `## Invoke clickup-create-story` opening paragraph.
  - [x] Rewrite to mention both the epic-parented path and the standalone no-epic path
        with example use cases (ops tasks, research spikes).
  - [x] Verify the `SKILL.md` and `workflow.md` relative links are intact.

- [x] **Task 2 — Update step-by-step expectations (AC: #2, #3)**
  - [x] Locate the step-02 line in the step-by-step list.
  - [x] Update to mention the `[0] No epic — create as standalone task` picker entry.
  - [x] Add a follow-on sentence or note about the standalone outcome and the
        pre-creation summary phrase (AC #3).
  - [x] Verify steps 01, 03, 04, 05 and the verbatim permission-gate message are
        unchanged.

- [x] **Task 3 — Update What success looks like (AC: #4)**
  - [x] Add a bullet (or amend the existing one) covering the no-epic path outcome:
        top-level task, no parent, description from PRD + architecture only.
  - [x] Verify the existing epic-parented success bullet is not removed.

- [x] **Task 4 — Document `allow_no_epic` config key (AC: #5)**
  - [x] Locate the `[clickup_create_story]` table in "Optional: pinned-ID config
        knobs".
  - [x] Add `allow_no_epic` bullet with the `true` / `false` behaviour description.
  - [x] Verify existing four bullets are intact and in original order.

- [x] **Task 5 — Add Change log entry (AC: #6)**
  - [x] Append a new row to `## Change log` with today's date, `ready-for-dev` status,
        and a one-sentence summary referencing story 8-8 and the four touch-points.

- [x] **Task 6 — Regression verification (AC: #7–#11)**
  - [x] `git diff --stat -- src/custom-skills/clickup-create-story/steps/` → empty.
  - [x] `git diff --stat -- src/custom-skills/clickup-create-story/SKILL.md src/custom-skills/clickup-create-story/workflow.md` → empty.
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- tests/` → empty.
  - [x] `npx prettier --check docs/clickup-quickstart.md` → exit 0 (or run
        `npx prettier --write docs/clickup-quickstart.md` scoped only).
  - [x] `npm run build && npm run lint && npm test` → clean, no new failures.

- [x] **Task 7 — Update sprint-status.yaml (AC: #12)**
  - [x] Set `8-8-pilot-quickstart-update: review` (dev hand-off; → `done` after code review).
  - [x] Update `last_updated` field.

- [ ] **Task 8 — Commit (AC: #13)**
  - [ ] Stage: `docs/clickup-quickstart.md`,
        `planning-artifacts/stories/8-8-pilot-quickstart-update.md`,
        `planning-artifacts/sprint-status.yaml`.
  - [ ] Commit with header + body per AC #13.

## Dev Notes

### Summary of EPIC-8 implementation already shipped

| Story | Deliverable                                                                                                                                                                                    |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8-1   | `step-02`: `allow_no_epic` cascade, `[0] No epic` picker entry, empty-Backlog Y/n fallback, sentinel `{epic_id}` = `''`                                                                        |
| 8-2   | `step-04`: branch 3b (no-epic path) — skips `getTaskById`, prohibits Epic field in composed description                                                                                        |
| 8-3   | `step-05`: conditional blocks in instructions 2 (summary) and 8 (success) for `{epic_id}` = `''`                                                                                               |
| 8-4   | `step-02`: boolean coercion note; `.bmadmcp/config.toml`: commented `allow_no_epic` key                                                                                                        |
| 8-5   | `tests/unit/sprint-list-picker-regression.test.ts`: 13 assertions confirming step-03 is epic-agnostic                                                                                          |
| 8-6   | `tests/unit/no-epic-paths.test.ts`: 20 assertions across steps 02, 04, 05                                                                                                                      |
| 8-7   | `SKILL.md` + `workflow.md`: description frontmatter, Goal extension, Epic picker no-epic docs, Description Composer branch 3b note, Task Creation `parent_task_id` omission and summary phrase |

This story closes the final EPIC-8 documentation gap — `docs/clickup-quickstart.md`
still describes an always-epic-required skill.

### Key operator-facing facts (do NOT leak internal sentinel values to the quickstart)

- Picker entry label: `[0] No epic — create as standalone task`
- `allow_no_epic` key: `[clickup_create_story]` table in `.bmadmcp/config.toml`
- Default: `true` (no-epic option shown by default)
- Empty-Backlog fallback: when Backlog list is empty and `allow_no_epic` is `true`, a
  Y/n prompt lets the user proceed as standalone rather than getting a hard-stop error
- Pre-creation summary phrase: `_(none — standalone task)_` as the parent-epic line
- Success artifact: top-level ClickUp task in the sprint list, no parent task

### Exact touch-points in `docs/clickup-quickstart.md`

#### 1. What-the-skill-does paragraph (after the H2 heading)

Current opening sentence:

```
The `clickup-create-story` skill creates a ClickUp task as a subtask of a chosen
epic in the active sprint list, with a description composed from the pilot repo's
`planning-artifacts/PRD.md` + `planning-artifacts/architecture.md` + the epic's
ClickUp body.
```

Updated to cover both paths:

```
The `clickup-create-story` skill creates a ClickUp task in the active sprint list —
as a subtask of a chosen epic (the default), or as a standalone top-level task when
no epic parent is needed (ops tasks, research spikes, ad-hoc work) — with a
description composed from the pilot repo's `planning-artifacts/PRD.md` +
`planning-artifacts/architecture.md` + the epic's ClickUp body (or PRD +
architecture only on the no-epic path).
```

#### 2. Step-by-step expectations — step-02 line

Current:

```
2. `step-02-epic-picker` — space picker → Backlog list → epic selector
```

Updated:

```
2. `step-02-epic-picker` — space picker → Backlog list → epic selector; when
   `allow_no_epic` is `true` (the default), a `[0] No epic — create as standalone
   task` entry is prepended to the list
```

#### 3. No-epic path note (add after the five-step list, before the verbatim message callout)

New sentence:

```
Selecting `[0]` routes the skill through the no-epic path: epic context is skipped,
the pre-creation summary shows _(none — standalone task)_ as the parent-epic line
for confirmation, and the created task is a top-level entry in the sprint list with
no parent.
```

#### 4. What success looks like — add bullet

Add to the existing bullet list:

```
- On the no-epic path: a new top-level ClickUp task in the sprint list, with no
  parent, and a description composed from PRD + architecture only.
```

#### 5. `[clickup_create_story]` config table — add `allow_no_epic`

After the existing four keys (`pinned_space_id`, `pinned_space_name`,
`pinned_backlog_list_id`, `pinned_sprint_folder_id`), add:

```
- `allow_no_epic` — `true` (default) prepends `[0] No epic — create as standalone
  task` to the picker and enables the empty-Backlog Y/n fallback. Set `false` to
  require an epic on every invocation and restore the original hard-stop when the
  Backlog list is empty.
```

### Files changed by this story

**Modified:**

- `docs/clickup-quickstart.md`
  — updates `## Invoke clickup-create-story` (What-the-skill-does paragraph, step-02
  line, no-epic path note, What-success-looks-like bullet) and "Optional: pinned-ID
  config knobs" (`allow_no_epic` key)

**Unchanged:**

- `src/custom-skills/clickup-create-story/SKILL.md` (story 8-7)
- `src/custom-skills/clickup-create-story/workflow.md` (story 8-7)
- `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md`
- `src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md`
- `src/custom-skills/clickup-create-story/steps/step-03-sprint-list-picker.md`
- `src/custom-skills/clickup-create-story/steps/step-04-description-composer.md`
- `src/custom-skills/clickup-create-story/steps/step-05-create-task.md`
- All TypeScript source files
- All test files

### References

- EPIC-8 story list bullet 8: "Pilot quickstart: add a one-line note that 'no epic'
  is available, with example use cases (ops tasks, spikes)."
  [Source: planning-artifacts/epics/EPIC-8-no-epic-stories.md]
- Story 8-7 out of scope: "Pilot quickstart update — story 8-8."
  [Source: planning-artifacts/stories/8-7-skill-docs-no-epic.md]
- Story 8-1 (sentinel + picker entry): `{epic_id}` = `''`, `[0] No epic` label
- Story 8-3 (pre-creation summary): `_(none — standalone task)_` phrase
- Story 8-4 (`allow_no_epic` flag): `true` default, boolean coercion note
- Current quickstart [Source: docs/clickup-quickstart.md]
- Current SKILL.md (post-8-7) [Source: src/custom-skills/clickup-create-story/SKILL.md]
- Current workflow.md (post-8-7) [Source: src/custom-skills/clickup-create-story/workflow.md]

## Dev Agent Record

### Agent Model Used

claude-opus-4-7 (Opus 4.7, 1M-context) via Claude Code CLI, invoked through the
`bmad-dev-story` workflow against `bmad-local` MCP. No disclosed cwd deviation —
session ran from the bmad-mcp-server repo root (this story's only modified-file
target is in this repo, so no pilot-repo cwd switch was required).

### Debug Log References

- Regression scope verified empty for all four protected globs:
  - `git diff --stat -- src/custom-skills/clickup-create-story/steps/` → empty
  - `git diff --stat -- src/custom-skills/clickup-create-story/SKILL.md src/custom-skills/clickup-create-story/workflow.md` → empty
  - `git diff --stat -- 'src/**/*.ts'` → empty
  - `git diff --stat -- tests/` → empty
- `npx prettier --write docs/clickup-quickstart.md` reformatted long-line wraps to
  match the file's existing 80-col style; subsequent `--check` run is clean.
- `npm run build` clean. `npm run lint` reports 0 errors and 7 warnings — all
  pre-existing in `tests/support/litellm-helper.mjs`, unrelated to this story.
- `npm test` reports 337 passing / 1 failing — the failure is
  `tests/unit/dependency-audit.test.ts > "should only import from declared
  dependencies"` flagging `src/tools/clickup/src/shared/config.ts` (vendored
  ClickUp code) for importing `node:async_hooks`. Verified pre-existing on this
  branch by stashing changes and re-running tests; the same failure appears
  before any docs edit. AC #11 ("no new failures") satisfied.

### Completion Notes List

- Five touch-points landed in `docs/clickup-quickstart.md`, all inside the
  `## Invoke clickup-create-story` and `Optional: pinned-ID config knobs`
  sections, plus a new `## Change log` row:
  1. What-the-skill-does paragraph rewritten to cover both epic-parented (default)
     and standalone (no-epic) paths, with ops-tasks / research-spikes / ad-hoc
     example use cases. SKILL.md and workflow.md links preserved.
  2. Step-02 line extended to note that the `[0] No epic — create as standalone
     task` picker entry is prepended when `allow_no_epic` is `true` (default).
  3. New paragraph after the five-step list explaining the no-epic outcome:
     skipped epic context, the pre-creation summary phrase
     `_(none — standalone task)_`, and the top-level resulting task. Operator-
     facing prose only — no internal sentinel values surfaced.
  4. New "What success looks like" bullet for the no-epic path; existing
     epic-parented bullets retained.
  5. New `allow_no_epic` bullet appended to `[clickup_create_story]` config knobs,
     using the AC's verbatim wording. Existing four pinned-ID bullets unchanged.
  6. New row in `## Change log` referencing story 8-8 and naming all four
     touch-points.
- AC scope strictly enforced: zero modifications to step files, SKILL.md /
  workflow.md, any TypeScript source, or any test file. The doc-only diff scope
  is verified.
- Sprint-status transitions to `review` (workflow Step 9 hand-off); a separate
  code-review pass will move it to `done` per the project's review pattern (cf.
  prior commits `24a00a4 docs(stories): mark story 8-5 done after clean code
  review`). The AC #12 "→ done when implementation is complete" wording is
  preserved by that downstream transition.

### File List

**Modified:**

- `docs/clickup-quickstart.md` — five touch-points listed above plus change-log
  row.
- `planning-artifacts/sprint-status.yaml` — `8-8-pilot-quickstart-update: ready-for-dev` → `review`; `last_updated` line updated.
- `planning-artifacts/stories/8-8-pilot-quickstart-update.md` — Tasks/Subtasks
  checkboxes, Dev Agent Record, Status field.

### Review Findings

- [x] [Review][Patch] `allow_no_epic` lacks "story skill only" annotation in shared config-keys section [docs/clickup-quickstart.md:161-163] — The bullet sits in the section "Available keys per skill table (`[clickup_create_epic]` / `[clickup_create_story]`)". Sibling key `pinned_sprint_folder_id` is annotated "story skill only"; `allow_no_epic` lacks the same annotation despite being story-only per `step-02-epic-picker.md` cascade and `.bmadmcp/config.example.toml`. Reader could plausibly add it under `[clickup_create_epic]` and observe no behavior change. Suggested fix: append ", story skill only" to the bullet (e.g., "`allow_no_epic`, story skill only — `true` (default) shows ...").
- [x] [Review][Patch] Step-02 line wraps inline code span across hard newline; line 293 lazy-continues at column 0 [docs/clickup-quickstart.md:291-293] — The inline code span `` `[0] No epic — create as standalone task` `` is split across a hard newline; line 293 begins at column 0 inside what should be a list-item paragraph. Renders correctly via CommonMark (newline-in-code-span = space; lazy continuation), but visually broken in source and fragile to a future prettier reflow. Suggested fix: rewrap so the backticked label is on a single line, or break the sentence outside the code span.
- [x] [Review][Defer] "description composed from PRD + architecture only" overstates scope [docs/clickup-quickstart.md:243, :319] — deferred, wording is verbatim from story spec AC #4 and dev notes; per `step-04-description-composer.md` the `epics_content` is still loaded as cross-cutting reference even on the no-epic path. If the simplification is wrong, treat as a separate spec/EPIC-9 cleanup.
- [x] [Review][Defer] "epic context is skipped" oversimplifies vs. step-04 branch 3b [docs/clickup-quickstart.md:298] — deferred, wording verbatim from story spec dev notes. Step-04 branch 3b sentinelizes epic context (`Epic: (none — standalone task)`) rather than skipping the description composer entirely.
- [x] [Review][Defer] Empty-Backlog Y/n fallback only mentioned in config description, not in Invoke section — deferred, story explicitly limits scope to AC #1–#5 touch-points; readers learn about empty-Backlog only from the config bullet. Candidate for EPIC-9 README freshness pass.
- [x] [Review][Defer] `_(none — standalone task)_` underscore vs `*…*` asterisk emission [docs/clickup-quickstart.md:299] — deferred, wording verbatim from story spec; renders identically (italic). Affects only operators who grep transcripts for the literal underscore form.
- [x] [Review][Defer] Picker label inconsistency — `[0] No epic` (short) vs full label [docs/clickup-quickstart.md:161 vs :292, :298] — deferred, config-knob short form was prescribed verbatim by AC #5; long form matches step files. Both are technically correct; consolidation belongs to a future doc consistency pass.
- [x] [Review][Defer] "Set `false`" missing the verb "to" [docs/clickup-quickstart.md:162] — deferred, wording verbatim from story spec AC #5.
- [x] [Review][Defer] Commit `Co-Authored-By: Claude Sonnet 4.6` mismatches Dev Agent Record `claude-opus-4-7` — deferred, attribution discrepancy only; no code/doc impact.
