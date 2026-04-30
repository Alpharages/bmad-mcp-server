# Story 7.3: Implement bug-intent prereq check (soft artifact loading)

Status: done

Epic: [EPIC-7: Bug-shaped stories in ClickUp](../epics/EPIC-7-bug-shaped-stories.md)

> Fills the `🚧 Not yet implemented — story 7-3` stub in
> `src/custom-skills/clickup-create-bug/steps/step-01-prereq-check.md`.
>
> The permission gate (write-mode + token check) is identical to
> `clickup-create-story` step 1. The critical difference: PRD and architecture
> are **optional** — the skill warns when they are absent but does **not abort**.
> The EPIC-6 `resolve-doc-paths` cascade is reused to locate both files when they
> do exist, so any project-local `.bmadmcp/config.toml [docs]` overrides are
> automatically honoured.
>
> No TypeScript is touched; this story ships markdown only.

## Story

As a **developer** using the `clickup-create-bug` skill,
I want step 1 to verify ClickUp write access and attempt to soft-load PRD and
architecture via the EPIC-6 cascade,
so that the skill can proceed without planning artifacts when they are absent,
while still enriching the bug description with project context when they are present.

## Acceptance Criteria

### Permission gate — identical to `clickup-create-story` step 1

1. **Write-mode check.** If `createTask` is not in the available tool list
   (mode is `read-minimal` or `read`), the step MUST emit the mode error block
   (see Dev Notes) and stop the skill run immediately.

2. **Token authentication check.** The step MUST call `pickSpace` with no
   arguments to verify the ClickUp token. If the response contains `401`,
   `Unauthorized`, `invalid token`, or zero spaces alongside an error indicator,
   the step MUST emit the token error block (see Dev Notes) and stop immediately.

3. **Success confirmation.** If both checks pass, the step MUST report:

   > ✅ Permission gate passed — write mode active, token authenticated.

   This verbatim line MUST be captured in the Dev Agent Record.

### Soft artifact loading via EPIC-6 cascade

4. **`resolve-doc-paths` call.** The step MUST call
   `bmad({ operation: 'resolve-doc-paths' })` and store the full response as
   `{resolve_doc_paths_result}`. Extracted values:
   - `data.prd` → `{prd_info}` (`.path`, `.layer`)
   - `data.architecture` → `{arch_info}` (`.path`, `.layer`)
   - `data.epics` → `{epics_info}` (`.path`, `.layer`)
   - `data.warnings` → `{warnings}`

   If the operation errors or `data` is absent/null, the step MUST emit the
   resolve-error block (see Dev Notes) and stop immediately (resolve-doc-paths
   failure is non-recoverable).

5. **Cascade warnings forwarded.** If `{warnings}` is non-empty, emit each
   warning as a `⚠️`-prefixed line before continuing.

6. **PRD soft-load.** Attempt to read `{prd_info.path}`:
   - If present: load into `{prd_content}`, set `{prd_present}` = `present`.
   - If absent: set `{prd_content}` = `''`, set `{prd_present}` = `missing`,
     and emit:

     > ⚠️ PRD not found at `<prd_info.path>` [`<prd_info.layer>`] — proceeding
     > without PRD context. Bug description will be based on the user's report
     > only.

     The skill MUST NOT stop.

7. **Architecture soft-load.** Attempt to read `{arch_info.path}`:
   - If present: load into `{architecture_content}`, set `{arch_present}` =
     `present`.
   - If absent: set `{architecture_content}` = `''`, set `{arch_present}` =
     `missing`, and emit:

     > ⚠️ Architecture doc not found at `<arch_info.path>`
     > [`<arch_info.layer>`] — proceeding without architecture context.

     The skill MUST NOT stop.

8. **Epics soft-load.** Use `{epics_info.path}` from the resolver result:
   - If path ends with `.md` (single file): attempt to read it →
     `{epics_content}`.
   - Otherwise (directory): list and read all `EPIC-*.md` files, concatenate
     with `---` separators → `{epics_content}`.
   - If the path does not exist or yields no files: set `{epics_content}` = `''`
     and emit:

     > ⚠️ Epics path not found at `<epics_info.path>` [`<epics_info.layer>`]
     > — story detail will be derived from bug report only.

     The skill MUST NOT stop.

9. **Step completion summary.** After all soft-loads attempt, emit:

   ```
   ✅ Prereq check complete:
   - PRD:          <prd_info.path> [<prd_info.layer>] — <present|missing>
   - Architecture: <arch_info.path> [<arch_info.layer>] — <present|missing>
   - Epics:        <epics_info.path> [<epics_info.layer>] — <found N file(s)|not found>
   ```

   Then proceed to step 2 regardless of which soft-load slots are empty.

### Step file structure

10. **YAML front-matter keys** in `step-01-prereq-check.md` MUST be updated to
    the full runtime-population set used by downstream steps:

    ```yaml
    ---
    prd_content: ''
    architecture_content: ''
    epics_content: ''
    resolve_doc_paths_result: ''
    ---
    ```

11. **`## STATUS` block replaced.** The `🚧 Not yet implemented` stub block is
    removed and replaced with the implemented gate + instructions content.

12. **`## NEXT` line preserved.** The line pointing to `step-02-list-picker.md`
    MUST remain unchanged.

### No TypeScript changes

13. No `.ts` files are created or modified. `git diff --stat -- src/**/*.ts`
    MUST be empty.

14. No test files are created or modified. `git diff --stat -- tests/` MUST be
    empty.

15. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with
    no new failures.

### sprint-status.yaml updated

16. `7-3-bug-prereq-check-soft-artifacts` transitions `backlog` →
    `ready-for-dev` when this story file is saved, and → `done` when
    implementation is complete.

### Commit

17. Commit message MUST follow Conventional Commits:
    ```
    feat(custom-skills): implement bug prereq check with soft artifact loading (story 7-3)
    ```
    Body MUST reference story 7.3, name the modified step file, and note the
    soft-load behaviour.

## Out of Scope

- List/sprint picker (story 7-5).
- Epic parent picker (story 7-7, EPIC-8 dependency).
- Description composer (story 7-4).
- Task creation with tags and priority (story 7-6).
- Tests and fixtures (story 7-9).
- Documentation updates (story 7-10).
- Any changes to `clickup-create-story`, `clickup-create-epic`, or
  `clickup-dev-implement`.

## Tasks / Subtasks

- [x] **Task 1 — Implement permission gate (AC: #1–#3)**
  - [x] Add `## RULES` section: write-mode required; `pickSpace` auth check; stop
        immediately on gate failure.
  - [x] Add `## Permission Gate` section with the two sequential checks and
        success confirmation line.
  - [x] Include both error blocks verbatim (see Dev Notes).

- [x] **Task 2 — Implement soft artifact loading (AC: #4–#9)**
  - [x] Add `## INSTRUCTIONS` with numbered steps:
        (1) call `resolve-doc-paths`, (2) forward cascade warnings,
        (3) soft-load PRD, (4) soft-load architecture,
        (5) soft-load epics, (6) emit completion summary.
  - [x] Ensure all three "missing but continue" warning lines are included
        verbatim.

- [x] **Task 3 — Update front-matter (AC: #10)**
  - [x] Replace existing stub front-matter with the full four-key set.

- [x] **Task 4 — Verify no TypeScript changes (AC: #13–#15)**
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- tests/` → empty.
  - [x] `npm run build && npm run lint && npm run format && npm test` → clean
        (1 pre-existing failure in dependency-audit unrelated to this story).

- [x] **Task 5 — Update sprint-status.yaml (AC: #16)**
  - [x] Set `7-3-bug-prereq-check-soft-artifacts: done`.
  - [x] Update `last_updated` field.

- [x] **Task 6 — Commit (AC: #17)**
  - [x] Stage modified files.
  - [x] Commit with header + body per AC #17.

## Dev Notes

### Key difference from `clickup-create-story` step 1

`clickup-create-story/steps/step-01-prereq-check.md` hard-fails if PRD or
architecture is missing (see AC #4 in story 2-2). Story 7-3 flips this to a
soft warning — the bug skill continues with empty `{prd_content}` /
`{architecture_content}` if the files are not found. The permission gate and
`resolve-doc-paths` call are identical; only the file-missing branch differs.

### Error blocks (verbatim, for inclusion in the step file)

**Mode error block:**

```
❌ **Permission gate failed — write mode required**

The `clickup-create-bug` skill requires `CLICKUP_MCP_MODE=write`. The current
mode does not register `createTask`, so ticket creation is impossible.

**What to do:** Set `CLICKUP_MCP_MODE=write` in the `bmad-mcp-server` env config
(whichever name you gave it in your MCP client settings) and restart, then
re-invoke the skill.
```

**Token error block:**

```
❌ **Permission gate failed — ClickUp authentication failed**

`pickSpace` returned an authentication error. The `CLICKUP_API_KEY` or
`CLICKUP_TEAM_ID` in the MCP server config may be invalid or expired.

**What to do:** Update the credentials in the `bmad-mcp-server` env config,
restart the MCP server, then re-invoke the skill.
```

**`resolve-doc-paths` error block:**

```
❌ resolve-doc-paths operation failed: <error message>

The `clickup-create-bug` skill could not resolve document paths.

**What to do:** Restart the MCP server and re-invoke the skill. If the error
persists, verify that `resolve-doc-paths` appears in `npm run cli:list-tools`.
```

### Soft-load rationale

EPIC-7 goal: "Bug creation succeeds with no PRD, no architecture, and no epic
parent." The permission gate is non-negotiable (no write token = no task), but
missing planning artifacts should never block a bug report. Story 7-4 (description
composer) reads `{prd_content}` and `{architecture_content}` and gracefully skips
context enrichment when both are empty.

### EPIC-6 cascade reuse

`resolve-doc-paths` (story 6-4) is the single source of truth for doc path
resolution across all three custom skills. Using it here means any
`.bmadmcp/config.toml [docs]` override the user configured for `clickup-create-story`
also benefits `clickup-create-bug` with zero additional config.

### Files changed by this story

**Modified**

- `src/custom-skills/clickup-create-bug/steps/step-01-prereq-check.md` — stub
  replaced with gate + soft-load implementation
- `planning-artifacts/stories/7-3-bug-prereq-check-soft-artifacts.md` (this file)
- `planning-artifacts/sprint-status.yaml` (status update)

**No other files change.**

### Git pattern

Recent analogous commit (story 2-2):
`feat(custom-skills): implement prereq-file check in clickup-create-story`

Story 7-3 follows the same pattern:
`feat(custom-skills): implement bug prereq check with soft artifact loading (story 7-3)`

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (root agent)

### Completion Notes List

- Implemented permission gate (write-mode + `pickSpace` auth check) with verbatim error blocks for mode, token, and `resolve-doc-paths` failures.
- Implemented soft artifact loading: PRD, architecture, and epics are loaded when present, warned when missing, and the skill continues regardless.
- Front matter already contained the required four keys; no changes needed.
- No TypeScript or test files modified; build, lint, format pass; tests show 1 pre-existing dependency-audit failure unrelated to this story.
- sprint-status.yaml updated: `7-3-bug-prereq-check-soft-artifacts` → `done`.

### File List

**Modified**

- `src/custom-skills/clickup-create-bug/steps/step-01-prereq-check.md`
- `planning-artifacts/stories/7-3-bug-prereq-check-soft-artifacts.md`
- `planning-artifacts/sprint-status.yaml`

**New / Deleted**

- (none)

## Change Log

| Date       | Change                                 |
| ---------- | -------------------------------------- |
| 2026-04-30 | Story drafted. Status → ready-for-dev. |
