# Story 6.9: Shared `[clickup]` config table and auto-save after first-run picker

Status: done

Epic: [EPIC-6: Configurable doc-path resolution (cascade)](../epics/EPIC-6-configurable-doc-path-resolution.md)

> Config-simplification companion to EPIC-6. Stories 6.1–6.8 introduced and documented the
> doc-path cascade. During review of the existing ClickUp config structure, two independent
> problems were identified:
>
> 1. **Duplicate keys.** `pinned_space_id`, `pinned_space_name`, and `pinned_backlog_list_id`
>    appear identically under both `[clickup_create_epic]` and `[clickup_create_story]`. A
>    project using both skills must write and maintain two copies of the same values. If the
>    space ID ever changes, it must be updated in two places.
>
> 2. **No auto-save.** On first run, both skills walk through the full interactive space-and-
>    backlog-list picker. When the picker succeeds, the discovered values are used for that
>    session only — nothing is written back to `.bmadmcp/config.toml`. Every subsequent
>    invocation repeats the full picker. The edge-case tips currently just tell the user to
>    "Pin the chosen list via `config.toml`" — a manual step most users will miss.
>
> This story fixes both problems by introducing a shared `[clickup]` table and adding auto-save
> instructions to each affected step file so discovered values are persisted after a successful
> picker run.
>
> **Skills affected:** `clickup-create-story` (step-02, step-03) and `clickup-create-epic`
> (step-02) only. `clickup-dev-implement` and `clickup-code-review` operate from a user-supplied
> task ID and perform no space/backlog discovery — they are untouched.
>
> **No TypeScript changes.** All changes are to skill step markdown files and
> `.bmadmcp/config.example.toml`.

## Story

As a **project operator** running `clickup-create-story` or `clickup-create-epic` for the
first time,
I want the skill to save my confirmed space and backlog-list IDs to `.bmadmcp/config.toml`
automatically after the picker succeeds,
and I want to write those values once even when both skills are used,
so that every subsequent invocation skips the picker entirely without any manual config editing.

## Acceptance Criteria

### Shared `[clickup]` table in config.example.toml

1. **`.bmadmcp/config.example.toml` MUST gain a `[clickup]` section** placed before
   `[clickup_create_epic]` and `[clickup_create_story]`. It MUST document `pinned_space_id`,
   `pinned_space_name`, and `pinned_backlog_list_id` as the shared defaults consumed by all
   `clickup-create-*` skills, with a header comment explaining they are the common starting
   point and that skill-specific sections below can override them.

2. **`[clickup_create_epic]` in `config.example.toml` MUST remove `pinned_space_id`,
   `pinned_space_name`, and `pinned_backlog_list_id`** (those move to `[clickup]`). The section
   header comment MUST say it is for per-skill overrides only — values here take precedence
   over `[clickup]`. Since no skill-specific keys remain for create-epic, the section body MUST
   contain a single commented-out placeholder explaining how to override, e.g.:
   ```toml
   # (uncomment and set keys here to override [clickup] values for this skill only)
   ```

3. **`[clickup_create_story]` in `config.example.toml` MUST remove `pinned_space_id`,
   `pinned_space_name`, and `pinned_backlog_list_id`** and retain only `pinned_sprint_folder_id`
   (which is story-specific and has no shared equivalent). The header comment MUST note it
   overrides `[clickup]` for create-story.

### Read cascade in step-02 files

4. **`step-02-backlog-list-picker.md` (clickup-create-epic) pinned-config instruction
   (instruction 0) MUST implement a two-level read cascade:**
   - Level 1 (skill override): read `[clickup_create_epic]` — any non-empty key here wins.
   - Level 2 (shared): read `[clickup]` — used for any key absent or empty at level 1.
   - Level 3 (picker): interactive flow if neither level provides the value.

   The effective-value derivation MUST be stated explicitly, e.g.:
   > `effective pinned_space_id` = `[clickup_create_epic].pinned_space_id` if non-empty, else
   > `[clickup].pinned_space_id`.

5. **`step-02-epic-picker.md` (clickup-create-story) pinned-config instruction (instruction 0)
   MUST implement the same two-level read cascade**, reading `[clickup_create_story]` first,
   then `[clickup]` as fallback for `pinned_space_id`, `pinned_space_name`, and
   `pinned_backlog_list_id`. `pinned_sprint_folder_id` is story-specific and is NOT looked up
   in `[clickup]`.

6. **Both step-02 files MUST preserve the existing partial-pin sub-cases** (both set → full
   skip; only space set → skip to instruction 5; only list set → apply at instruction 6). The
   cascade only changes *where* values are read from, not *how* partial-pin conditions are
   evaluated. The short-circuit confirmation messages remain unchanged.

### Auto-save after picker

7. **Both step-02 files MUST gain an auto-save instruction** that fires after the backlog list
   is successfully resolved via the interactive picker (i.e., when the values came from the
   picker, not from existing config). The instruction MUST:

   a. Use the Write/Edit tool to write `pinned_space_id`, `pinned_space_name`, and
      `pinned_backlog_list_id` into the `[clickup]` section of `.bmadmcp/config.toml`
      (creating the file if absent; appending the section if the file exists but has no
      `[clickup]`; preserving all other existing content).

   b. Before writing each key, check whether it already exists with a non-empty value in the
      file. If it does and the current value differs from the picker result, emit:
      `⚠️ .bmadmcp/config.toml already has [clickup].{key} set — not overwriting. Update
      manually if needed.` and skip that key.

   c. After a successful write, confirm:
      `✅ Space + backlog list saved to .bmadmcp/config.toml ([clickup] table) — future runs
      will skip this picker.`

   d. If the write fails for any reason (permission error, disk error), emit a non-fatal
      warning and continue — auto-save is supplemental, the skill session is not interrupted.

8. **`step-03-sprint-list-picker.md` (clickup-create-story) MUST gain an auto-save
   instruction** for `pinned_sprint_folder_id`. It MUST trigger only when the sprint folder
   was resolved via user disambiguation (more than one sprint folder found and user was asked
   to choose). It MUST NOT trigger when:
   - The folder was already pinned (instruction 3 short-circuit).
   - Exactly one sprint folder was found automatically (no disambiguation needed).

   The instruction MUST:
   a. Write `pinned_sprint_folder_id` into the `[clickup_create_story]` section of
      `.bmadmcp/config.toml` (creating the file/section if absent; preserving other content).
   b. Apply the same non-overwrite guard as AC #7b.
   c. Confirm: `✅ Sprint folder saved to .bmadmcp/config.toml
      ([clickup_create_story].pinned_sprint_folder_id) — future disambiguation prompts will
      be skipped.`
   d. Non-fatal on write failure.

   The existing edge-case tip ("Pin the chosen folder via `[clickup_create_story]
   .pinned_sprint_folder_id` in `.bmadmcp/config.toml` to skip this prompt on future
   invocations") MUST be removed or replaced with a note that auto-save handles this.

### Hygiene

9. **No TypeScript changes.** `git diff --stat -- src/` MUST be empty.

10. **No test file changes.** `git diff --stat -- tests/` MUST be empty.

11. **`npm run build` MUST succeed** (zero TypeScript errors). Run `npm run lint` as well.

12. **Diff scope.** `git diff --stat` MUST show exactly:
    - `src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md`
    - `src/custom-skills/clickup-create-story/steps/step-03-sprint-list-picker.md`
    - `src/custom-skills/clickup-create-epic/steps/step-02-backlog-list-picker.md`
    - `.bmadmcp/config.example.toml`
    - No other files.

13. **Commit message MUST follow Conventional Commits:**
    ```
    feat(config): shared [clickup] config table and auto-save after first-run picker
    ```
    Body MUST note that no TypeScript was changed, list the four modified files, and reference
    story 6.9.

## Out of Scope

- `clickup-dev-implement` and `clickup-code-review` — they take a task ID directly and do
  no space/backlog discovery. No changes needed.
- Auto-migrating existing `.bmadmcp/config.toml` files — users with skill-specific pinned
  values continue to work unchanged via the cascade level-1 override. No migration tooling.
- Removing `[clickup_create_epic]` from `config.example.toml` entirely — it stays as an
  override-only placeholder even though it currently has no skill-specific keys.
- README or CLAUDE.md updates for this story — documentation pass deferred to EPIC-9
  (README freshness) or a dedicated follow-up.
- Auto-save for the sprint list itself (`sprint_list_id`) — the active sprint changes
  each sprint; pinning it would cause stale selections. Only the sprint *folder* is
  stable enough to pin.
- Adding automated tests for step-file prose logic — these are LLM-executed markdown
  instructions, not TypeScript code.

## Tasks / Subtasks

- [x] **Task 1 — Update `.bmadmcp/config.example.toml`** (AC: #1–#3)
  - [x] Add `[clickup]` section above skill-specific sections with shared keys + header comment.
  - [x] Update `[clickup_create_epic]` — remove shared keys, add override-only header + placeholder comment.
  - [x] Update `[clickup_create_story]` — remove shared keys, keep only `pinned_sprint_folder_id`, update header.

- [x] **Task 2 — Update `step-02-backlog-list-picker.md` (create-epic)** (AC: #4, #6, #7)
  - [x] Rewrite instruction 0 to implement the two-level cascade (`[clickup_create_epic]` → `[clickup]`) with explicit effective-value derivation.
  - [x] Add auto-save instruction (with non-overwrite guard and failure fallback) after backlog list resolves via picker.

- [x] **Task 3 — Update `step-02-epic-picker.md` (create-story)** (AC: #5, #6, #7)
  - [x] Rewrite instruction 0 to implement the two-level cascade (`[clickup_create_story]` → `[clickup]`) with explicit effective-value derivation.
  - [x] Add auto-save instruction (with non-overwrite guard and failure fallback) after backlog list resolves via picker.

- [x] **Task 4 — Update `step-03-sprint-list-picker.md` (create-story)** (AC: #8)
  - [x] Add auto-save instruction for `pinned_sprint_folder_id` triggered only on user disambiguation.
  - [x] Remove or replace the existing manual-pin edge-case tip.

- [x] **Task 5 — Verify** (AC: #9–#12)
  - [x] `npm run build` — zero TypeScript errors.
  - [x] `npm run lint` — no new ESLint warnings.
  - [x] `git diff --stat` shows exactly the four target files.
  - [x] `git diff --stat -- src/` and `git diff --stat -- tests/` are both empty.

- [x] **Task 6 — Commit** (AC: #13)
  - [x] Stage the four modified files.
  - [x] Commit with header and body per AC #13.

## Dev Notes

### Why `[clickup]` and not `[shared]` or `[defaults]`

`[clickup]` signals these are ClickUp-specific shared defaults, consistent with the existing
`[clickup_create_epic]` / `[clickup_create_story]` naming. A generic name like `[defaults]`
would be ambiguous given the file also has a `[docs]` section.

### Read cascade — implementation note for step-02 files

The agent executing the step file reads `.bmadmcp/config.toml` as plain text. Express the
cascade as explicit prose:

```
effective pinned_space_id        = [clickup_create_story].pinned_space_id        if non-empty,
                                   else [clickup].pinned_space_id
effective pinned_space_name      = [clickup_create_story].pinned_space_name      if non-empty,
                                   else [clickup].pinned_space_name
effective pinned_backlog_list_id = [clickup_create_story].pinned_backlog_list_id if non-empty,
                                   else [clickup].pinned_backlog_list_id
```

The same pattern applies to create-epic (substituting `[clickup_create_epic]`).

### Auto-save — TOML write pattern

The agent uses its Write or Edit tool to modify `.bmadmcp/config.toml`. The write pattern:

- File does not exist → create it at `.bmadmcp/config.toml` with just the `[clickup]` section.
- File exists, no `[clickup]` section → append the section.
- File exists, `[clickup]` section present → update only keys that are absent or empty
  (AC #7b non-overwrite guard).

The `.bmadmcp/` directory always exists at this point (the step file itself was loaded from
it, or `config.example.toml` already lives there). No directory creation needed.

### Auto-save scope for step-03 (sprint folder)

Auto-save for `pinned_sprint_folder_id` triggers **only** on user disambiguation (multiple
sprint folders found). It does NOT trigger when:

- Folder is already pinned via `[clickup_create_story].pinned_sprint_folder_id` (AC #8 guard).
- Exactly one sprint folder found (auto-selected — no user input, so no need to persist
  an obvious single choice that auto-detection already handles cleanly).

This avoids writing config noise for a value that is trivially discoverable on every run.

### Final shape of config.example.toml

```toml
# ---------------------------------------------------------------------------
# clickup — shared defaults (consumed by all clickup-create-* skills)
# ---------------------------------------------------------------------------
# Pinning both `pinned_space_id` and `pinned_backlog_list_id` makes both
# create skills skip space/backlog discovery entirely on every invocation.
# Skills auto-save these values after the first successful picker run.
# Per-skill sections below can override individual keys.

[clickup]
# pinned_space_id        = ""    # ClickUp space ID (digits only)
# pinned_space_name      = ""    # Display name; falls back to "(pinned)" if unset
# pinned_backlog_list_id = ""    # ClickUp list ID for the Backlog list

# ---------------------------------------------------------------------------
# clickup-create-epic — per-skill overrides (take precedence over [clickup])
# ---------------------------------------------------------------------------

[clickup_create_epic]
# (uncomment and set keys here to override [clickup] values for this skill only)

# ---------------------------------------------------------------------------
# clickup-create-story — per-skill overrides (take precedence over [clickup])
# ---------------------------------------------------------------------------

[clickup_create_story]
# pinned_sprint_folder_id = ""   # Bypass sprint-folder disambiguation when >1 sprint folder exists
```

### Existing config migration (informational)

Users who already have `.bmadmcp/config.toml` with skill-specific pinned values see no
behavior change — the cascade level-1 reads their existing table first and wins. They can
optionally consolidate to `[clickup]` manually to remove the duplication, but are not
required to.

### References

- [`src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md`](../../src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md) — instruction 0 + instruction 6
- [`src/custom-skills/clickup-create-story/steps/step-03-sprint-list-picker.md`](../../src/custom-skills/clickup-create-story/steps/step-03-sprint-list-picker.md) — instruction 3 + edge-case tip
- [`src/custom-skills/clickup-create-epic/steps/step-02-backlog-list-picker.md`](../../src/custom-skills/clickup-create-epic/steps/step-02-backlog-list-picker.md) — instruction 0 + instruction 6
- [`.bmadmcp/config.example.toml`](../../.bmadmcp/config.example.toml) — current schema (shared keys duplicated)
- [Story 5-7](./5-7-refine-prompts-and-templates.md) — introduced `pinned_backlog_list_id` and `pinned_sprint_folder_id`
- [Story 6-8](./6-8-docs-and-config-example.md) — first noticed duplicate keys while reviewing config.example.toml

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (k1.6)

### Debug Log References

- Build: zero TypeScript errors
- Lint: 7 pre-existing warnings in tests/support/litellm-helper.mjs (none new)
- Diff scope: exactly 4 files as specified in AC #12

### Completion Notes List

1. **Task 1 — Config example:** Added `[clickup]` shared section with `pinned_space_id`, `pinned_space_name`, `pinned_backlog_list_id`. Updated `[clickup_create_epic]` to override-only placeholder. Updated `[clickup_create_story]` to retain only `pinned_sprint_folder_id`.
2. **Task 2 — create-epic step-02:** Rewrote instruction 0 with explicit two-level cascade derivation. Rewrote instruction 6 (pinned-list) to use cascade. Added instruction 7 (auto-save) with non-overwrite guard and failure fallback.
3. **Task 3 — create-story step-02:** Rewrote instruction 0 with explicit two-level cascade derivation. Rewrote instruction 6 (pinned-list) to use cascade. Added instruction 7 (auto-save) with non-overwrite guard and failure fallback. Shifted subsequent instructions 7→8 through 11→12.
4. **Task 4 — create-story step-03:** Replaced manual-pin edge-case tip in instruction 3 with auto-save instruction 4 that triggers only on user disambiguation (more than one sprint folder). Shifted subsequent instructions 4→5 through 9→10.
5. **Task 5 — Verification:** All checks passed (build, lint, diff scope).
6. **Task 6 — Commit:** Committed with Conventional Commits format per AC #13.

### File List

**Modified**

- `src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md`
- `src/custom-skills/clickup-create-story/steps/step-03-sprint-list-picker.md`
- `src/custom-skills/clickup-create-epic/steps/step-02-backlog-list-picker.md`
- `.bmadmcp/config.example.toml`

**New**

- (none)

**Deleted**

- (none)

## Change Log

| Date       | Change |
| ---------- | ------ |
| 2026-04-30 | Story drafted following post-EPIC-6 config review. Identified duplicate shared keys and missing auto-save after first-run picker. Status → ready-for-dev. |
