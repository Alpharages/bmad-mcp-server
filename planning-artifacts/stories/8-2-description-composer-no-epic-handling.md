# Story 8.2: Description Composer — No-Epic Override Block

Status: done

Epic: [EPIC-8: No-epic stories (standalone tasks)](../epics/EPIC-8-no-epic-stories.md)

> Refines `src/custom-skills/clickup-create-story/steps/step-04-description-composer.md`
> to add an explicit no-epic override block for the `bmad-create-story` invocation
> (instruction 3). Story 8-1 added the `{epic_id}` empty guard on `getTaskById`
> (instruction 2) and the `"(no epic)"` label in the pre-supplied context, but the
> override instructions passed to `bmad-create-story` still treated both paths
> identically. This story splits instruction 3 into two conditional branches
> (3a = epic path, 3b = no-epic path) and adds a sentinel documentation note.
> Markdown only — no TypeScript changes.

## Story

As a **developer** using `clickup-create-story` after choosing "no epic" in the
epic picker (step-02),
I want the description composer to invoke `bmad-create-story` with an explicit
no-epic override block — suppressing epic-section lookup in the epics file and
omitting any parent-epic reference from the composed description —
so that the ClickUp task description for a standalone story contains no fabricated
or misleading epic associations.

## Acceptance Criteria

### step-04-description-composer.md changes

1. **`## RULES`** MUST add a new rule after the existing "Blocking" rule:
   - **No-epic override.** When `{epic_id}` is `''`, instruction 3 MUST use
     branch 3b (the no-epic override block). The composed description MUST NOT
     contain an "Epic:" or "Parent epic:" field or reference.

2. **Instruction 3 (invoke bmad-create-story)** MUST be split into two
   conditional branches:

   **Branch 3a — Epic path (`{epic_id}` is non-empty):**

   Carries forward the current pre-supplied context block and override
   instructions verbatim. No changes to the existing text.

   **Branch 3b — No-epic path (`{epic_id}` is `''`):**

   Execute `bmad-create-story` with the following no-epic pre-supplied context
   and override instructions:

   Pre-supplied context:

   ```
   Story title: {story_title}
   Epic: (none — standalone task)
   Epic description: (none)
   PRD content: already loaded in conversation context (from step 1: prereq check)
   Architecture content: already loaded in conversation context
   Epics-and-stories content: {epics_content — available for general technical
     context only; do NOT look for an epic-specific section}
   Scope notes: {scope_notes or empty}
   ```

   Override instructions for bmad-create-story:
   - **Step 1 (Determine target story):** Skip discovery from sprint-status.
     Story is pre-supplied: `story_title` = `{story_title}`. No epic parent —
     set `epic_num` to none; set `story_key` = kebab-case of `{story_title}`.
   - **Step 2 (Load and analyze core artifacts):** Run in full — but do NOT
     extract epic-specific content from `{epics_content}` (there is no epic
     parent for this story). Use PRD and architecture as the primary context.
     Epics content is available for general technical reference only (e.g.,
     cross-cutting constraints, shared terminology).
   - **Step 3 (Architecture analysis):** Run in full.
   - **Step 4 (Web research):** Run in full.
   - **Step 5 (Create comprehensive story file):** Run COMPOSITION only —
     produce the full story document content. **Do NOT include an "Epic:" or
     "Parent epic:" field anywhere in the document.** Do NOT write to any local
     file. Return the composed content.
   - **Step 6 (Update sprint status):** Skip entirely. ClickUp task creation
     (step 5 of this skill) is the equivalent.

3. **After both branches**, instruction 3 MUST include the following sentinel
   documentation note:

   > **Convention:** `{epic_id}` = `''` is the sentinel for "no parent". It is
   > intentionally passed to `bmad-create-story` as an empty epic block so the
   > workflow's full artifact analysis (PRD, architecture) still runs but the
   > resulting description contains no epic association.

### No changes outside this file

4. `step-01-prereq-check.md`, `step-02-epic-picker.md`,
   `step-03-sprint-list-picker.md`, and `step-05-create-task.md` are NOT
   modified by this story.

5. No `.ts` files are created or modified. `git diff --stat -- 'src/**/*.ts'`
   MUST be empty.

6. No test files are created or modified. `git diff --stat -- tests/` MUST be
   empty. (Tests are story 8-6.)

7. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with
   no new failures.

### sprint-status.yaml updated

8. `8-2-description-composer-no-epic-handling` transitions `backlog` →
   `ready-for-dev` when this story file is saved, and → `done` when
   implementation is complete.

### Commit

9. Commit message MUST follow Conventional Commits:

   ```
   feat(custom-skills): add no-epic override block to description composer (story 8-2)
   ```

   Body MUST reference story 8.2, name `step-04-description-composer.md` as
   the only modified step file, describe the two conditional branches (3a
   epic-path, 3b no-epic path), and confirm that epic-section lookup is
   suppressed and parent-epic references are omitted in the no-epic output.

## Out of Scope

- Changes to `step-02-epic-picker.md` — epic picker no-epic changes were made
  in story 8-1.
- Changes to `step-05-create-task.md` — `parent_task_id` conditional handling
  and pre-creation summary were made in story 8-1.
- TypeScript changes — no source code changes; markdown only.
- Test files — story 8-6 owns unit + integration tests for the no-epic path.
- Changes to `clickup-create-bug` — bug skill composes descriptions directly
  (no bmad-create-story delegation); no-epic handling is already separate.
- UX prompts or hint text in the picker explaining when "no epic" is
  appropriate — not in scope for the description composer story.

## Tasks / Subtasks

- [x] **Task 1 — Update `step-04-description-composer.md` (AC: #1–#3)**
  - [x] Read the current file fully before making any edits.
  - [x] Add no-epic override RULE after the existing "Blocking" rule (AC #1).
  - [x] Split instruction 3 into branch 3a (existing, carried forward verbatim)
        and branch 3b (new no-epic block) (AC #2).
  - [x] Add sentinel documentation note after both branches (AC #3).

- [x] **Task 2 — Regression verification (AC: #4–#7)**
  - [x] Confirm step-01, step-02, step-03, step-05 are untouched.
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- tests/` → empty.
  - [x] `npm run build && npm run lint && npm run format && npm test` → clean (no new failures; pre-existing `node:async_hooks` audit failure unrelated).

- [x] **Task 3 — Update sprint-status.yaml (AC: #8)**
  - [x] Set `8-2-description-composer-no-epic-handling: done`.
  - [x] Update `last_updated` field.

- [x] **Task 4 — Commit (AC: #9)**
  - [x] Stage: `src/custom-skills/clickup-create-story/steps/step-04-description-composer.md`,
        `planning-artifacts/stories/8-2-description-composer-no-epic-handling.md`,
        `planning-artifacts/sprint-status.yaml`.
  - [x] Commit with header + body per AC #9.

### Review Findings

- [x] [Review][Patch] Missing explicit conditional dispatch at instruction 3 entry — instruction 3 presents two branch headings but has no explicit "if {epic_id} non-empty → 3a; if '' → 3b" gate before the first branch heading. The RULE covers it, but adding one dispatch line at the start of instruction 3 removes ambiguity for LLM executors. [src/custom-skills/clickup-create-story/steps/step-04-description-composer.md:32–34]
- [x] [Review][Patch] Re-invocation loop (instruction 5 'n' path) does not specify branch context — "re-invoke `bmad-create-story` step 5 with the feedback" does not say to use the same branch-3b override context; an executor reset to a fresh sub-invocation could default to the epic path and inject an "Epic:" field on revision. [src/custom-skills/clickup-create-story/steps/step-04-description-composer.md:105]
- [x] [Review][Defer] `story_key` kebab conversion underspecified for special characters/collisions — no rules for punctuation, Unicode, or key uniqueness; this is delegated to bmad-create-story's own conversion logic — deferred, pre-existing responsibility boundary
- [x] [Review][Defer] Branch 3b Step 2 negative constraint ("do NOT extract") has no explicit success criteria — "run in full" is sufficient but no definition of a passing no-epic analysis — deferred, pre-existing design pattern
- [x] [Review][Defer] Whitespace-only `{epic_id}` bypasses empty-string sentinel — step-02 sets `''` explicitly so risk is low — deferred, pre-existing
- [x] [Review][Defer] AC #8 sprint-status skips `backlog → ready-for-dev` intermediate commit — story went directly `backlog → done` in one commit — deferred, pre-existing process gap, unfixable retroactively
- [x] [Review][Defer] `{epics_content}` unset risk — same pattern exists in branch 3a pre-dating this story — deferred, pre-existing
- [x] [Review][Defer] `{epics_content}` as unresolved template literal in fenced code block — pre-existing template pattern used throughout the file — deferred, pre-existing
- [x] [Review][Defer] Duplicate `last_updated` comment + YAML body blocks in sprint-status.yaml — pre-existing structure — deferred, pre-existing

## Dev Notes

### What changed in story 8-1 (predecessor context)

Story 8-1 added the no-epic _infrastructure_ in step-04:

- **Instruction 2** now guards `getTaskById` — skips the call when `{epic_id}`
  is `''` and sets `{epic_description}` = `''`.
  [Source: src/custom-skills/clickup-create-story/steps/step-04-description-composer.md#instruction-2]

- **Instruction 3** updated the inline `Epic:` label to render `"(no epic)"`
  when both epic variables are empty.
  [Source: src/custom-skills/clickup-create-story/steps/step-04-description-composer.md#instruction-3]

But the override instructions passed to `bmad-create-story` were left identical
for both paths. When `{epic_id}` is `''`, `bmad-create-story` step 2 receives:

> "epics-and-stories content: {epics_content — already loaded in step 1, or empty}"

Without explicit guidance, the workflow's step 2 tries to identify `{{epic_num}}`
from the story key. A standalone task (story key derived from title only, no
`N-M-title` prefix) has no epic number, so the workflow may either produce an
error or — worse — silently extract content from an unrelated epic in the epics
file and inject it into the composed description.

Story 8-2 fixes this by making the override instructions **conditional on
`{epic_id}`** and providing a dedicated no-epic override block (branch 3b) that
explicitly suppresses epic-section lookup and omits parent-epic references from
the output.

### Sentinel convention (established in story 8-1)

`{epic_id}` = `''` (empty string) is the project-wide sentinel for "no parent".
Consistent with:

- `clickup-create-bug` step-03 (story 7-7): `{epic_id}` = `''` means no parent
- `step-05-create-task.md` instruction 5 (story 8-1): omits `parent_task_id`
  when `{epic_id}` is `''`
- `step-02-epic-picker.md` instructions 9/12 (story 8-1): sets `{epic_id}` = `''`
  and `{epic_name}` = `''` when user picks "no epic"

[Source: planning-artifacts/stories/8-1-epic-picker-no-epic-option.md#key-design-decision]

### What this story does NOT change

`bmad-create-story` itself is not modified — the skill is open-source and
auto-fetched from the Alpharages BMAD-METHOD repo. All no-epic guidance is
delivered through the override instructions in the `message` parameter of the
`bmad` tool's `execute` operation.

### Files changed by this story

**Modified:**

- `src/custom-skills/clickup-create-story/steps/step-04-description-composer.md`
  — adds RULE, splits instruction 3 into 3a/3b, adds sentinel documentation note
- `planning-artifacts/stories/8-2-description-composer-no-epic-handling.md`
  (this file)
- `planning-artifacts/sprint-status.yaml` (status update)

**New / Deleted:**

- (none)

### Project Structure Notes

- The skill lives at `src/custom-skills/clickup-create-story/`.
- Steps are self-contained markdown files in `steps/`; front-matter on each step
  declares the variables the step writes, accumulated as step context.
- `step-04` front-matter (`epic_description`, `story_title`, `story_entry`,
  `task_description`) need not change — `{epic_id}` and `{epic_name}` arrive
  from `step-02` via step context, not step-04's own front-matter.

### References

- EPIC-8 story list [Source: planning-artifacts/epics/EPIC-8-no-epic-stories.md#stories]
- Story 8-1 sentinel design decision [Source: planning-artifacts/stories/8-1-epic-picker-no-epic-option.md#key-design-decision]
- Current step-04 [Source: src/custom-skills/clickup-create-story/steps/step-04-description-composer.md]
- Step-05 `parent_task_id` conditional (story 8-1 reference) [Source: src/custom-skills/clickup-create-story/steps/step-05-create-task.md#instruction-5]
- Bug skill step-04 for contrast (no bmad-create-story delegation) [Source: src/custom-skills/clickup-create-bug/steps/step-04-description-composer.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (claude-code)

### Debug Log References

### Completion Notes List

- Added **No-epic override** RULE after Blocking rule (AC #1).
- Split instruction 3 into Branch 3a (epic path, verbatim carry-forward) and Branch 3b (no-epic path with explicit `epic_num = none`, suppressed epic-section lookup, and no "Epic:" / "Parent epic:" fields) (AC #2).
- Added sentinel documentation note after both branches explaining `{epic_id} = ''` as the "no parent" sentinel (AC #3).
- Regression checks passed: no changes to step-01/02/03/05, no TypeScript changes, no test changes, build/lint/format clean, tests show no new failures (AC #4–#7).

### File List

- `src/custom-skills/clickup-create-story/steps/step-04-description-composer.md` (modified)
- `planning-artifacts/stories/8-2-description-composer-no-epic-handling.md` (modified)
- `planning-artifacts/sprint-status.yaml` (modified)
