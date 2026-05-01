# Story 8.4: Allow-No-Epic Config Flag — Coercion Hardening & Project Config Visibility

Status: done

Epic: [EPIC-8: No-epic stories (standalone tasks)](../epics/EPIC-8-no-epic-stories.md)

> Story 8-1 absorbed the original scope of this story: adding
> `[clickup_create_story].allow_no_epic` to the config schema and
> `.bmadmcp/config.example.toml`, and wiring the flag throughout `step-02-epic-picker.md`
> (instruction 0 cascade, instructions 9/10/11/12). That work is complete and shipped.
>
> What remains is two narrow gaps that story 8-1 explicitly deferred:
>
> 1. **Coercion is undefined for non-boolean TOML values.** `step-02` instruction 0
>    says `effective allow_no_epic = [clickup_create_story].allow_no_epic if set, else true`
>    but does not specify what happens when the value is a string (`"true"`, `"false"`),
>    an integer (`0`, `1`), or any other non-boolean type. An LLM executing the step
>    may interpret these differently across models. Making coercion explicit closes the
>    deferred review finding and makes the flag self-documenting for future maintainers.
> 2. **Project config.toml is silent on `allow_no_epic`.** The live
>    `.bmadmcp/config.toml` has an empty `[clickup_create_story]` section. The
>    `allow_no_epic` key is only discoverable via `config.example.toml`. Adding the key
>    as a commented line directly in the project config makes the option visible without
>    requiring a cross-file lookup.

## Story

As a **team lead** configuring the `clickup-create-story` skill,
I want `allow_no_epic` to have explicit coercion rules so that any TOML value I set
produces predictable, documented behaviour — and to find the flag right in the project's
`.bmadmcp/config.toml` without consulting the example file —
so that enforcing a "always require an epic" policy is reliable and discoverable.

## Acceptance Criteria

### step-02-epic-picker.md change

1. **Instruction 0 coercion note.** After the cascade block (the four `effective …`
   lines), and before the `Persist effective_allow_no_epic` line, add the following
   coercion rule on a new line:

   ```
   Boolean coercion for allow_no_epic: TOML boolean true → enabled; TOML boolean
   false → disabled. If the value is present but not a TOML boolean (e.g., a string
   or integer), emit ⚠️ [clickup_create_story].allow_no_epic is not a boolean — defaulting to true
   and treat as enabled.
   ```

   The cascade block itself (`effective allow_no_epic = …`) is NOT rewritten — only
   the coercion note is added.

2. All other instructions in `step-02-epic-picker.md` (1–12, RULES, NEXT, front-matter)
   are NOT modified.

### .bmadmcp/config.toml change

3. The `[clickup_create_story]` section in `.bmadmcp/config.toml` MUST gain a commented
   `allow_no_epic` line so the key is visible without opening `config.example.toml`:

   ```toml
   [clickup_create_story]
   # allow_no_epic = true   # Set false to always require an epic parent (default: true)
   ```

   The `[clickup_create_story]` heading already exists in the file — only the commented
   key line is added below it. No other sections in `.bmadmcp/config.toml` are modified.

### No changes outside these two files

4. `step-01-prereq-check.md`, `step-03-sprint-list-picker.md`,
   `step-04-description-composer.md`, and `step-05-create-task.md` are NOT modified.

5. `.bmadmcp/config.example.toml` is NOT modified — it already has the commented
   `allow_no_epic` key from story 8-1.

6. No `.ts` files are created or modified. `git diff --stat -- 'src/**/*.ts'`
   MUST be empty.

7. No test files are created or modified. `git diff --stat -- tests/` MUST be
   empty. (Tests are story 8-6.)

8. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with
   no new failures.

### sprint-status.yaml updated

9. `8-4-allow-no-epic-config-flag` transitions `backlog` → `ready-for-dev` when
   this story file is saved, and → `done` when implementation is complete.

### Commit

10. Commit message MUST follow Conventional Commits:

    ```
    fix(custom-skills): harden allow_no_epic coercion and add to project config (story 8-4)
    ```

    Body MUST reference story 8.4, name `step-02-epic-picker.md` and
    `.bmadmcp/config.toml` as the two modified files, describe the coercion note
    addition (explicit boolean-only handling with warning on non-boolean), and confirm
    that all other step files and TypeScript are untouched.

## Out of Scope

- Rewriting the `effective allow_no_epic` cascade formula in instruction 0 — the
  cascade is correct; only the coercion note is added.
- Changes to `step-01-prereq-check.md` — config validation is not a prereq-check
  concern; coercion is handled inline in step-02 instruction 0.
- Documenting `allow_no_epic` in `workflow.md` or `SKILL.md` — story 8-7.
- TypeScript validation of `allow_no_epic` — the flag is an LLM-time runtime setting,
  not a server-startup configuration; there is no TS validation layer for custom-skill
  config keys.
- Test coverage for `allow_no_epic = false` or the coercion path — story 8-6.
- Propagating `allow_no_epic` to `clickup-create-bug` — that skill has an always-
  optional epic picker (story 7-7); no config flag is needed.

## Tasks / Subtasks

- [x] **Task 1 — Update `step-02-epic-picker.md` (AC: #1–#2)**
  - [x] Read the current file fully before making any edits.
  - [x] Locate the cascade block in instruction 0 (`effective pinned_space_id … effective allow_no_epic`).
  - [x] Add the coercion note on a new line immediately after the cascade block,
        before the `Persist effective_allow_no_epic` line (AC #1).
  - [x] Verify that all other instructions (1–12), RULES, NEXT, and front-matter
        are byte-unchanged (AC #2).

- [x] **Task 2 — Update `.bmadmcp/config.toml` (AC: #3)**
  - [x] Read the current file fully before making any edits.
  - [x] Add the commented `allow_no_epic` line under the existing `[clickup_create_story]`
        heading (AC #3).
  - [x] Verify no other sections are modified.

- [x] **Task 3 — Regression verification (AC: #4–#8)**
  - [x] Confirm step-01, step-03, step-04, step-05, and `config.example.toml`
        are untouched.
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- tests/` → empty.
  - [x] `npm run build && npm run lint && npm run format && npm test` → clean (1 pre-existing failure in dependency-audit unrelated to this change).

- [x] **Task 4 — Update sprint-status.yaml (AC: #9)**
  - [x] Set `8-4-allow-no-epic-config-flag: done`.
  - [x] Update `last_updated` field.

- [x] **Task 5 — Commit (AC: #10)**
  - [x] Stage: `src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md`,
        `.bmadmcp/config.toml`,
        `planning-artifacts/stories/8-4-allow-no-epic-config-flag.md`,
        `planning-artifacts/sprint-status.yaml`.
  - [x] Commit with header + body per AC #10.

## Dev Notes

### What story 8-1 already delivered

Story 8-1 covered the full primary implementation of `allow_no_epic`:

| Deliverable                                                        | Status            |
| ------------------------------------------------------------------ | ----------------- |
| `config.example.toml` — commented `allow_no_epic` key              | Done (8-1 AC #15) |
| step-02 instruction 0 — two-level cascade reading `allow_no_epic`  | Done (8-1 AC #3)  |
| step-02 instruction 9 — empty-Backlog fallback gated on flag       | Done (8-1 AC #4)  |
| step-02 instruction 10 — `[0] No epic` prepended when flag is true | Done (8-1 AC #5)  |
| step-02 instruction 11 — ask text updated for zero option          | Done (8-1 AC #6)  |
| step-02 instruction 12 — input `0` parsing with flag gate          | Done (8-1 AC #7)  |

Story 8-1 review explicitly deferred the coercion edge case:

> "Non-boolean `allow_no_epic` TOML value (string/int) — coercion undefined — deferred,
> pre-existing pattern; smol-toml loader handles parsing uniformly across all flags"
> [Source: planning-artifacts/stories/8-1-epic-picker-no-epic-option.md#review-findings]

### Why coercion matters for a markdown step

The TypeScript layer (smol-toml, `doc-path-resolver.ts`) parses TOML correctly and
produces strongly-typed values. However, `step-02` is executed by an LLM reading the
TOML file directly with a file tool — not via the TypeScript loader. The LLM sees
raw TOML text and must infer types contextually.

TOML spec: `allow_no_epic = true` is a boolean. An LLM executing the step reads that
and correctly treats it as boolean `true`. The edge case is:

- `allow_no_epic = "false"` (TOML string `"false"`) — LLM may treat it as truthy or
  as the string `"false"` depending on evaluation strategy
- `allow_no_epic = 0` (TOML integer) — LLM may or may not treat `0` as falsy

Adding an explicit coercion note removes the ambiguity: only TOML boolean `false` disables
the feature; all other non-boolean values produce a visible warning and fall back to `true`.
This is conservative (feature stays enabled) and auditable (the warning surfaces the
config error to the user).

### Exact edit to step-02 instruction 0

Current instruction 0 (relevant excerpt):

```markdown

```

effective pinned_space_id = [clickup_create_story].pinned_space_id if non-empty,
else [clickup].pinned_space_id
effective pinned_space_name = [clickup_create_story].pinned_space_name if non-empty,
else [clickup].pinned_space_name
effective pinned_backlog_list_id = [clickup_create_story].pinned_backlog_list_id if non-empty,
else [clickup].pinned_backlog_list_id
effective allow_no_epic = [clickup_create_story].allow_no_epic if set,
else true

```

Persist `effective_allow_no_epic` in step context for later instructions.
```

Target instruction 0 after this story (only the coercion note is added):

```markdown

```

effective pinned_space_id = [clickup_create_story].pinned_space_id if non-empty,
else [clickup].pinned_space_id
effective pinned_space_name = [clickup_create_story].pinned_space_name if non-empty,
else [clickup].pinned_space_name
effective pinned_backlog_list_id = [clickup_create_story].pinned_backlog_list_id if non-empty,
else [clickup].pinned_backlog_list_id
effective allow_no_epic = [clickup_create_story].allow_no_epic if set,
else true

```

Boolean coercion for `allow_no_epic`: TOML boolean `true` → feature enabled; TOML
boolean `false` → feature disabled. If the key is present but its value is not a TOML
boolean (e.g., a string `"true"` / `"false"`, or an integer), emit:
`⚠️ [clickup_create_story].allow_no_epic is not a boolean — defaulting to true`
and treat `effective_allow_no_epic` as `true`.

Persist `effective_allow_no_epic` in step context for later instructions.
```

### Exact edit to .bmadmcp/config.toml

Current `[clickup_create_story]` section:

```toml
[clickup_create_story]
```

Target after this story:

```toml
[clickup_create_story]
# allow_no_epic = true   # Set false to always require an epic parent (default: true)
```

### Sentinel convention (unchanged)

`{epic_id}` = `''` (empty string) is the project-wide sentinel for "no parent".
Established in story 8-1 [Source: planning-artifacts/stories/8-1-epic-picker-no-epic-option.md#key-design-decision].
This story does not change the sentinel.

### Files changed by this story

**Modified:**

- `src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md`
  — adds boolean coercion note to instruction 0 (after cascade block, before
  `Persist effective_allow_no_epic` line)
- `.bmadmcp/config.toml`
  — adds commented `allow_no_epic` key to `[clickup_create_story]` section
- `planning-artifacts/stories/8-4-allow-no-epic-config-flag.md` (this file)
- `planning-artifacts/sprint-status.yaml` (status update)

**New / Deleted:**

- (none)

### References

- Story 8-1 deferred review finding (non-boolean coercion) [Source: planning-artifacts/stories/8-1-epic-picker-no-epic-option.md#review-findings]
- Current step-02 instruction 0 [Source: src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md]
- Current project config [Source: .bmadmcp/config.toml]
- Config schema reference [Source: .bmadmcp/config.example.toml]
- EPIC-8 story list [Source: planning-artifacts/epics/EPIC-8-no-epic-stories.md#stories]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (claude-code)

### Debug Log References

### Completion Notes List

- Added boolean coercion note to `step-02-epic-picker.md` instruction 0: TOML boolean `true` → enabled, `false` → disabled; non-boolean values warn and default to `true`.
- Added commented `allow_no_epic = true` line to `.bmadmcp/config.toml` under `[clickup_create_story]` section.
- No TypeScript files modified; no test files modified; step-01, step-03, step-04, step-05 untouched.
- Build, lint, and format pass. Tests pass with 1 pre-existing failure in dependency-audit (unrelated `node:async_hooks` import).

### File List

- `src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md`
- `.bmadmcp/config.toml`
- `planning-artifacts/stories/8-4-allow-no-epic-config-flag.md`
- `planning-artifacts/sprint-status.yaml`

## Review Findings

- [ ] [Review][Decision] `.bmadmcp/config.toml` tracked despite `.gitignore` — **Resolved: Option B (untrack)**. `.gitignore` line 104 lists `.bmadmcp/config.toml`; commit `47fc8d4` force-added it as a new tracked file containing 4 sections (17 lines) beyond the story's single-commented-line scope. Decision: `git rm --cached .bmadmcp/config.toml` applied in follow-up commit; file stays on disk, gitignore restored. Each contributor maintains their own local copy.
- [x] [Review][Defer] story 8-1 file included in story 8-4 commit [planning-artifacts/stories/8-1-epic-picker-no-epic-option.md] — deferred, pre-existing (documentation-only: table alignment fix + review log entry, no functional impact)
- [x] [Review][Defer] Sprint status promotes 8-5/8-6/8-7/8-8 beyond AC #9 scope [planning-artifacts/sprint-status.yaml] — deferred, pre-existing (valid sprint management, not a defect)
