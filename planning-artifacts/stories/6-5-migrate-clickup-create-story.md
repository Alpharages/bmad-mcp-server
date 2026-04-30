# Story 6.5: Migrate `clickup-create-story` step-01 to consume `resolve-doc-paths` operation

Status: done

Epic: [EPIC-6: Configurable doc-path resolution (cascade)](../epics/EPIC-6-configurable-doc-path-resolution.md)

> Fifth story in EPIC-6. Migrates `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md` from hardcoded `planning-artifacts/PRD.md` / `planning-artifacts/architecture.md` path checks to the `resolve-doc-paths` MCP operation landed by story 6.4. Also updates the optional epics path to use the resolver's `epics` key (default: `planning-artifacts/epics/` directory rather than the previous hardcoded `epics-and-stories.md` single-file check).
>
> **Markdown-only migration.** No TypeScript files are changed. The skill's step file and its companion `workflow.md` are the only artifacts; all logic is in markdown prose that the LLM-driven agent interprets at runtime.
>
> **Depends on story 6.4.** The `resolve-doc-paths` operation must be registered on the unified `bmad` tool before this step can call it. Story 6.4 must be merged on the target branch before this story's implementation can be validated end-to-end.
>
> **Scope guard.** This story does NOT migrate `clickup-dev-implement` step-03 or `clickup-code-review` step-03. Those are stories 6.6 and 6.7. It does not change any `.ts` file, any other step file within `clickup-create-story`, or any `planning-artifacts/` planning document.

## Story

As the **bmad-mcp-server platform maintainer**,
I want `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md` to call `bmad({ operation: 'resolve-doc-paths' })` instead of hardcoding `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md` paths,
so that pilot projects with non-standard layouts (e.g. `docs/architecture/overview.md` or `specs/PRD.md`) can run `clickup-create-story` end-to-end after setting overrides in `.bmadmcp/config.toml [docs]`, matching EPIC-6 §Outcomes ("`clickup-create-story`, `clickup-dev-implement`, `clickup-code-review` migrated to consume the operation").

## Acceptance Criteria

1. **`step-01-prereq-check.md` MUST be modified.** The `## INSTRUCTIONS` section MUST replace the two hardcoded path checks with a call to `bmad({ operation: 'resolve-doc-paths' })` (no `projectRoot` argument — defaults to the server's configured project root). This call MUST be the first action in `## INSTRUCTIONS`. The YAML front-matter MUST add a `resolve_doc_paths_result: ''` variable to document that the full result is stored in step context.

2. **The `resolve-doc-paths` call MUST appear after the permission gate.** The ClickUp write-mode check and `pickSpace` auth check in `## Permission Gate` MUST remain unchanged and MUST execute before `resolve-doc-paths` is called. The two existing error blocks (mode error block, token error block) and the `✅ Permission gate passed` confirmation MUST be byte-identical to their pre-migration form. This ensures fast-fail on auth issues without unnecessary tool calls.

3. **Cascade warnings MUST be surfaced before file-existence checks.** If `data.warnings` from the `resolve-doc-paths` response is non-empty, the step MUST emit each warning to the user as a `⚠️`-prefixed line before proceeding to check whether files exist at the resolved paths. Warnings indicate malformed config files that were skipped during cascade resolution.

4. **Required-file existence check MUST use the resolved paths.** The step MUST check whether `data.prd.path` (PRD) and `data.architecture.path` (architecture) exist — not the hardcoded strings `planning-artifacts/PRD.md` / `planning-artifacts/architecture.md`. Set `{prd_present}` and `{arch_present}` from the resolved paths.

5. **Missing-file error block MUST include cascade-layer context.** When either required file is missing, the updated error block MUST include:
   - The resolved path and layer tag for each key, e.g.:
     ```
     - PRD: <data.prd.path> [<data.prd.layer>] — present / **MISSING**
     - Architecture: <data.architecture.path> [<data.architecture.layer>] — present / **MISSING**
     ```
   - Layer tags MUST be exactly the strings returned by the resolver: `bmadmcp-config`, `bmad-config`, or `default`. No translation, no decoration.
   - A three-bullet "How to override doc paths" block listing all cascade layers so the user knows where to set a custom path:
     ```
     **How to override doc paths:**
     1. Per-project (highest priority): add `[docs].prd_path` / `[docs].architecture_path` to `.bmadmcp/config.toml`
     2. BMAD-config: set `[bmm].planning_artifacts` in `_bmad/config.toml` (affects all three paths via default filenames)
     3. Default (no config needed): place files at `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md`
     ```
     The existing "Why" paragraph MUST be updated to reflect that the path is cascade-resolved, not hardcoded.

6. **Required-file loading MUST use the resolved paths.** When both required files are present, load:
   - `data.prd.path` → `{prd_content}`
   - `data.architecture.path` → `{architecture_content}`
     The variable names `{prd_content}` and `{architecture_content}` MUST remain unchanged — downstream steps (step-04 in particular) reference these names in their pre-supplied context blocks.

7. **Epics path MUST use `data.epics.path` with directory/file branching.** The optional epics check MUST use `data.epics.path` from the resolver result (default: `planning-artifacts/epics/`). Because the resolver treats the `epics` key as a directory path by default (story 6.3 §Dev Agent Record completion note #5), the step MUST handle two cases:
   - If `data.epics.path` ends with `.md` (i.e. a file path was configured): attempt to read it directly → `{epics_content}`.
   - Otherwise (directory path): list and read all `EPIC-*.md` files inside the directory, concatenate them with `---` separators → `{epics_content}`. If the directory is absent or contains no `EPIC-*.md` files, set `{epics_content}` = `''`.
     If the resolved epics path does not exist (neither as file nor populated directory), set `{epics_content}` = `''` and emit:

   ```
   ⚠️ Epics path not found at <data.epics.path> [<data.epics.layer>] — story detail will be derived from PRD and epic ClickUp task only.
   ```

   The variable name `{epics_content}` MUST remain unchanged.

8. **Confirmation message MUST report resolved paths and layers.** Replace the current flat "which files were loaded" line with:

   ```
   ✅ Prereq check passed — files loaded:
   - PRD: <data.prd.path> [<data.prd.layer>]
   - Architecture: <data.architecture.path> [<data.architecture.layer>]
   - Epics: <data.epics.path> [<data.epics.layer>] — <found N file(s) / not found>
   ```

   The `✅ Permission gate passed` line from the gate check MUST remain captured verbatim in the Dev Agent Record per the existing gate instruction — the new confirmation is additive, not a replacement of the gate line.

9. **`## NEXT` section MUST document the new context variable.** Add a sentence noting that `{resolve_doc_paths_result}` (the full data object from `resolve-doc-paths`) is available to downstream steps alongside `{prd_content}`, `{architecture_content}`, and `{epics_content}`, in case a downstream step needs to reference the resolved paths or their layers without re-calling the operation.

10. **`workflow.md` Prerequisites section MUST be updated.** In `src/custom-skills/clickup-create-story/workflow.md`, the paragraph beginning "Before proceeding, the skill verifies that `planning-artifacts/PRD.md`…" MUST be replaced with:

    > Before proceeding, the skill calls `bmad({ operation: 'resolve-doc-paths' })` to determine PRD, architecture, and epics paths via the 3-layer cascade (`.bmadmcp/config.toml [docs]` → BMAD `_bmad/config.toml` chain → `planning-artifacts/` default), then verifies the required files exist at the resolved paths. The skill aborts if either required file is missing, surfacing the cascade layer that produced the path and instructions for all three override layers.

    The `See:` reference line MUST remain, pointing to `./steps/step-01-prereq-check.md`.

11. **No TypeScript changes.** `git diff --stat -- '*.ts'` MUST be empty. No `src/**/*.ts` file is modified — the operation call is prose in the markdown step file interpreted at runtime.

12. **No changes outside the two target files.** `git diff --stat` MUST show exactly:
    - **Modified:**
      - `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md`
      - `src/custom-skills/clickup-create-story/workflow.md`
    - Specifically:
      - `git diff --stat -- src/custom-skills/clickup-dev-implement/` MUST be empty.
      - `git diff --stat -- src/custom-skills/clickup-code-review/` MUST be empty.
      - `git diff --stat -- src/custom-skills/clickup-create-story/steps/step-02*` through `step-05*` MUST be empty.
      - `git diff --stat -- src/utils/` MUST be empty.
      - `git diff --stat -- tests/` MUST be empty.
      - `git diff --stat -- '*.ts'` MUST be empty.
      - `git diff --stat -- package.json` MUST be empty.
      - `git diff --stat -- planning-artifacts/` MUST be empty (this story file lands in a separate planning commit; CLAUDE.md updates land in story 6.8).

13. **Default behavior preserved for standard-layout projects.** A project with no `.bmadmcp/config.toml` and no `_bmad/config.toml`, with `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md` present, MUST produce functionally identical behavior: same files loaded, same content in `{prd_content}` and `{architecture_content}`. The only observable difference is the confirmation line now includes `[default]` layer tags.

14. **Commit message MUST follow Conventional Commits.** Use:
    ```
    feat(custom-skills): migrate clickup-create-story step-01 to resolve-doc-paths op
    ```
    Body MUST cite EPIC-6 and story 6.5, note that the migration is markdown-only (no TypeScript changes), and explicitly state that stories 6.6 and 6.7 migrate the remaining two skills (`clickup-dev-implement` step-03 and `clickup-code-review` step-03).

## Out of Scope

- Migration of `clickup-dev-implement/steps/step-03-planning-artifact-reader.md` → **story 6.6**.
- Migration of `clickup-code-review/steps/step-03-code-reader.md` → **story 6.7**.
- Documentation updates to `CLAUDE.md`, `.bmadmcp/config.example.toml`, README.md → **story 6.8**. The `workflow.md` update in AC #10 is structural (documents what the step actually does) and lands here to avoid immediate drift; story 6.8 can expand with additional context.
- Changes to step-02 through step-05 of `clickup-create-story` — those steps consume `{prd_content}` / `{architecture_content}` / `{epics_content}` via step context and do not reference file paths directly. Verified by reading `step-04-description-composer.md`'s pre-supplied context block.
- Adding automated tests for the markdown step file — there is no unit-testable TypeScript function. End-to-end correctness is covered by story 6.4's integration tests (which verify the operation) and EPIC-6's exit criteria (§Exit criteria #1).
- Handling `ux_design` or `tech_spec` paths via the cascade — EPIC-6 §Open questions explicitly defers these. Those keys do not exist in the resolver's output (story 6.3 AC #1 locks the surface to `prd`, `architecture`, `epics`).
- A `format: 'json' | 'text'` parameter on the `resolve-doc-paths` call — the operation returns a `text` field suitable for direct display; skill prose can pluck `data.prd.path` etc. from the structured result.

## Tasks / Subtasks

- [x] **Task 1 — Confirm story 6.4 is merged** (prereq)
  - [x] Run `git log --oneline | grep 'resolve-doc-paths'` on the working branch. If the commit is absent, coordinate with the 6.4 implementer before proceeding.
  - [x] Run `npm run cli:list-tools` and confirm `resolve-doc-paths` appears in the operation list. Record the output in §Debug Log References.

- [x] **Task 2 — Update `step-01-prereq-check.md`** (AC: #1–#9)
  - [x] Add `resolve_doc_paths_result: ''` to YAML front-matter.
  - [x] Replace instruction 1 ("Resolve the project root") and instruction 2 ("Check required and optional files") with:
    1. Call `bmad({ operation: 'resolve-doc-paths' })`. Store full response data as `{resolve_doc_paths_result}`. Extract `data.prd`, `data.architecture`, `data.epics`, `data.warnings`.
    2. If `data.warnings` is non-empty, emit each as a `⚠️` line.
    3. Check existence of `data.prd.path` and `data.architecture.path`. Set `{prd_present}` / `{arch_present}`.
  - [x] Update the missing-file error block per AC #5 (resolved paths + layer tags + 3-bullet override block).
  - [x] Update file-loading instruction (previously instruction 4) to load from `data.prd.path` → `{prd_content}` and `data.architecture.path` → `{architecture_content}`.
  - [x] Update epics check to use `data.epics.path` with directory/file branching per AC #7.
  - [x] Update the confirmation message per AC #8 (resolved paths + layers).
  - [x] Update `## NEXT` per AC #9 (document `{resolve_doc_paths_result}` availability).

- [x] **Task 3 — Update `workflow.md`** (AC: #10)
  - [x] Replace the Prerequisites paragraph per AC #10, keeping the `See:` reference line unchanged.

- [x] **Task 4 — Verify diff scope** (AC: #11, #12)
  - [x] `git diff --stat` shows exactly the two target files, nothing else.
  - [x] `git diff --stat -- '*.ts'` is empty.
  - [x] `git diff --stat -- tests/` is empty.

- [x] **Task 5 — Commit** (AC: #14)
  - [x] Stage only the two modified files.
  - [x] Commit with header and body per AC #14.

## Dev Notes

### Why `resolve-doc-paths` is called after the permission gate, not before

The permission gate is a fast-fail for ClickUp-specific issues. If credentials are missing or invalid, the skill should abort before touching the filesystem. `resolve-doc-paths` itself is a local filesystem operation (no auth dependency), but architecturally the gate is the right first check since the entire skill's purpose is ClickUp task creation. Swapping the order would delay auth errors behind filesystem I/O.

### Why the `epics` key defaults to a directory, not a file

Story 6.3's resolver returns `planning-artifacts/epics/` (a directory path) for the `epics` key by default — matching this project's actual layout where epics are split into per-epic `EPIC-*.md` files. The previous `step-01` checked for a single `epics-and-stories.md` file (older BMAD single-file layout). The migration aligns with the resolver's design. Projects still using a single epics file can configure `[docs].epics_path = "planning-artifacts/epics-and-stories.md"` in `.bmadmcp/config.toml` to restore the old behavior explicitly.

### Why `workflow.md` is updated in this story and not deferred to 6.8

Story 6.8 covers CLAUDE.md, README.md, and per-skill `workflow.md` files for broader documentation. However, `workflow.md`'s Prerequisites section is structural documentation of what the step does. Leaving it claiming the skill "verifies `planning-artifacts/PRD.md` exists" while the step now calls `resolve-doc-paths` creates immediate drift. Updating it in the same commit keeps documentation in sync with implementation. Story 6.8 can add additional explanation without this drift.

### Why no tests are added

`step-01-prereq-check.md` is LLM-interpreted prose — there is no unit-testable TypeScript function. End-to-end correctness is established by:

1. Story 6.4's integration tests (AC #14 of that story), which verify the `resolve-doc-paths` operation itself against real temp-dir filesystems.
2. EPIC-6 §Exit criteria #1: "A pilot project with `docs/architecture/overview.md` and `specs/PRD.md` can run `clickup-create-story` end-to-end after setting `[docs].architecture_path` and `[docs].prd_path` in `.bmadmcp/config.toml`."

Adding a mechanical test (e.g. grep for `resolve-doc-paths` in the step file) would be brittle and superficial.

### Downstream steps are unaffected

Steps 02–05 receive `{prd_content}`, `{architecture_content}`, and `{epics_content}` via step context. They do not reference file paths directly. Confirmed by reading:

- `step-04-description-composer.md` §3 pre-supplied context block: "PRD content: already loaded in conversation context (from step 1: prereq check)".
- `step-02-epic-picker.md`: no reference to planning artifact paths.
- `step-03-sprint-list-picker.md` and `step-05-create-task.md`: not read but confirmed by the workflow's description (they work with ClickUp IDs and `{task_description}`, not file content).

### References

- [EPIC-6 §Outcomes](../epics/EPIC-6-configurable-doc-path-resolution.md) — "`clickup-create-story`, `clickup-dev-implement`, `clickup-code-review` migrated to consume the operation"
- [EPIC-6 §Exit criteria](../epics/EPIC-6-configurable-doc-path-resolution.md) — end-to-end pilot project criterion
- [Story 6.3 §Dev Agent Record](./6-3-doc-path-resolver-cascade.md) — completion note #5 confirms `epics` → directory by default
- [Story 6.4 §Out of Scope](./6-4-resolve-doc-paths-mcp-operation.md) — explicitly defers this migration here
- [`src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md`](../../src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md) — the file being migrated
- [`src/custom-skills/clickup-create-story/workflow.md`](../../src/custom-skills/clickup-create-story/workflow.md) — the skill-level doc being updated
- [`src/custom-skills/clickup-create-story/steps/step-04-description-composer.md`](../../src/custom-skills/clickup-create-story/steps/step-04-description-composer.md) — confirms `{prd_content}` / `{architecture_content}` variable names must be preserved
- [`src/utils/doc-path-resolver.ts`](../../src/utils/doc-path-resolver.ts) — the resolver whose output `resolve-doc-paths` surfaces; see `DEFAULT_FILENAMES` for the `epics: 'epics/'` default

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (root agent) executing bmad-dev-story workflow.

### Debug Log References

- **Story 6.4 merge status:** `caa033b feat(tools): add resolve-doc-paths MCP operation` — present in `git log --oneline`.
- **`npm run cli:list-tools` shows `resolve-doc-paths`:** CLI requires `CLICKUP_API_KEY` to boot; operation verified present in `src/tools/bmad-unified.ts` registration and `src/tools/operations/index.ts` exports.
- **`git diff --stat` after implementation:** exactly 2 files modified:
  - `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md` (48 insertions, 21 deletions)
  - `src/custom-skills/clickup-create-story/workflow.md` (2 insertions, 2 deletions)
- **Epics directory handling:** Step instruction 6 branches on `.md` suffix — directory path (`epics/`) globs `EPIC-*.md` files; file path reads directly. Default layer is `default` for standard-layout projects.

### Completion Notes List

1. Migrated `step-01-prereq-check.md` from hardcoded `planning-artifacts/PRD.md` / `planning-artifacts/architecture.md` checks to `bmad({ operation: 'resolve-doc-paths' })` call.
2. Permission gate (write mode + token auth) remains unchanged and executes before `resolve-doc-paths` per AC #2.
3. Cascade warnings (`data.warnings`) emitted as `⚠️`-prefixed lines before file-existence checks per AC #3.
4. Missing-file error block now includes resolved paths, layer tags (`bmadmcp-config`, `bmad-config`, `default`), and 3-bullet override instructions per AC #5.
5. Epics handling branches on `.md` suffix: directory → glob `EPIC-*.md`; file → read directly per AC #7.
6. Confirmation message reports resolved paths and layers per AC #8.
7. `## NEXT` documents `{resolve_doc_paths_result}` availability for downstream steps per AC #9.
8. `workflow.md` Prerequisites paragraph updated to describe cascade behavior per AC #10.
9. Diff scope verified: only two target files modified, no `.ts`, no `tests/`, no other skill steps changed per AC #11–#12.
10. Default behavior preserved: standard-layout projects with no config see identical file loading, only confirmation line gains `[default]` layer tags per AC #13.

### File List

**Modified**

- `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md` — replace hardcoded path checks with `resolve-doc-paths` call; update error block, loading, epics, and confirmation
- `src/custom-skills/clickup-create-story/workflow.md` — update Prerequisites section to describe cascade

**New**

- (none)

**Deleted**

- (none)

## Change Log

| Date       | Change                                                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-30 | Story drafted from EPIC-6 bullet 5 ("Migrate `clickup-create-story` step-01 to consume the new op; update error block") and Story 6.4 §Out of Scope. Status → ready-for-dev. |
| 2026-04-30 | Code review fixes: (1) added error guard in step-01 instruction 1 for `resolve-doc-paths` call failure (E-1/Major); (2) split implementation commit from planning commit to satisfy AC #12 scope guard. Status remains review. |
