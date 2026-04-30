# Story 6.6: Migrate `clickup-dev-implement` step-03 to consume `resolve-doc-paths` operation

Status: review

Epic: [EPIC-6: Configurable doc-path resolution (cascade)](../epics/EPIC-6-configurable-doc-path-resolution.md)

> Sixth story in EPIC-6. Migrates `src/custom-skills/clickup-dev-implement/steps/step-03-planning-artifact-reader.md` from hardcoded `planning-artifacts/PRD.md` / `planning-artifacts/architecture.md` reads to the `resolve-doc-paths` MCP operation landed by story 6.4, mirroring what story 6.5 did for `clickup-create-story/steps/step-01-prereq-check.md`.
>
> **Markdown-only migration.** No TypeScript files are changed. The target step file and its companion `workflow.md` are the only artifacts modified; all logic is LLM-interpreted markdown prose.
>
> **Key difference from story 6.5.** `step-03` also reads `planning-artifacts/tech-spec.md` (optional, best-effort) and searches for `project-context.md` via a glob pattern. These two reads are **NOT migrated** — `tech_spec_path` is explicitly deferred in EPIC-6 §Open questions, and `project-context.md` is not a planning-artifact path (it is a repo-wide glob search, not a configurable doc path). Only the PRD and architecture paths are migrated to the resolver. `tech-spec.md` and `project-context.md` reads remain hardcoded exactly as before.
>
> **Depends on story 6.4.** The `resolve-doc-paths` operation must be registered on the unified `bmad` tool. Story 6.4 is already merged (commit `2a775f7`).
>
> **Scope guard.** This story does NOT migrate `clickup-code-review` step-03. That is story 6.7. It does not change any `.ts` file, any other step file within `clickup-dev-implement`, or any `planning-artifacts/` planning document.

## Story

As the **bmad-mcp-server platform maintainer**,
I want `src/custom-skills/clickup-dev-implement/steps/step-03-planning-artifact-reader.md` to call `bmad({ operation: 'resolve-doc-paths' })` instead of hardcoding `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md` paths,
so that pilot projects with non-standard layouts (e.g. `docs/architecture/overview.md` or `specs/PRD.md`) can run `clickup-dev-implement` end-to-end after setting overrides in `.bmadmcp/config.toml [docs]`, matching EPIC-6 §Outcomes ("`clickup-create-story`, `clickup-dev-implement`, `clickup-code-review` migrated to consume the operation").

## Acceptance Criteria

1. **`step-03-planning-artifact-reader.md` MUST be modified.** The YAML front-matter MUST add a `resolve_doc_paths_result: ''` variable to document that the full resolver response is stored in step context. The `## INSTRUCTIONS / ### Load planning artifacts` sub-section MUST replace instruction 1 ("Read `planning-artifacts/PRD.md`") and instruction 3 ("Read `planning-artifacts/architecture.md`") with a `resolve-doc-paths` call as the new first action, followed by derived existence checks and cascade-layer error reporting. The `## RULES` section MUST update rules 2 and 3 to reference the resolved paths (`data.prd.path` and `data.architecture.path`) rather than the hardcoded strings.

2. **The `resolve-doc-paths` call MUST be the first action in `### Load planning artifacts`.** Call `bmad({ operation: 'resolve-doc-paths' })` with no `projectRoot` argument (defaults to the server's configured project root). Store the full response as `{resolve_doc_paths_result}`. Extract `data.prd`, `data.architecture`, `data.warnings` for use in subsequent instructions.

3. **Cascade warnings MUST be surfaced before file-existence checks.** If `data.warnings` from the `resolve-doc-paths` response is non-empty, emit each warning as a `⚠️`-prefixed line before proceeding to check whether files exist at the resolved paths.

4. **Required-file existence check MUST use the resolved paths.** Check `data.prd.path` (PRD) and `data.architecture.path` (architecture) — not the hardcoded strings. Set `{prd_loaded}` and `{architecture_loaded}` from the resolved-path reads respectively.

5. **Missing-file error blocks MUST include cascade-layer context.** When the PRD file is missing at `data.prd.path`, the error block MUST include:
   - The resolved path and layer tag: `- PRD: <data.prd.path> [<data.prd.layer>] — **MISSING**`
   - Layer tags MUST be exactly the resolver strings: `bmadmcp-config`, `bmad-config`, or `default`.
   - A three-bullet "How to override doc paths" block:
     ```
     **How to override doc paths:**
     1. Per-project (highest priority): add `[docs].prd_path` to `.bmadmcp/config.toml`
     2. BMAD-config: set `[bmm].planning_artifacts` in `_bmad/config.toml`
     3. Default (no config needed): place file at `planning-artifacts/PRD.md`
     ```
   The architecture error block MUST follow the same pattern with `data.architecture.path` and `data.architecture.layer`, pointing to `[docs].architecture_path` and `planning-artifacts/architecture.md`.

6. **File loading MUST use the resolved paths.** When the file at `data.prd.path` is confirmed present, load it into conversation context (replacing the former `Read planning-artifacts/PRD.md` instruction). Likewise for `data.architecture.path`. The variables `{prd_loaded}` = `'true'` and `{architecture_loaded}` = `'true'` MUST be set after each confirmed read, exactly as before.

7. **`tech-spec.md` MUST remain hardcoded best-effort.** Instruction 5 (attempt `planning-artifacts/tech-spec.md`) MUST be byte-identical to its pre-migration form — path, warning message, and `{tech_spec_loaded}` variable name unchanged. The `resolve-doc-paths` operation does not return a `tech_spec` key (deferred in EPIC-6 §Open questions); this instruction is intentionally not migrated.

8. **`project-context.md` glob search MUST remain unchanged.** Instruction 6 (search `**/project-context.md` from project root) MUST be byte-identical to its pre-migration form — glob pattern, `{project_context_loaded}` variable name, and silent-no-warning behaviour unchanged.

9. **The `### Parse task description structure` and `### Emit success summary` sub-sections MUST be updated.** Specifically:
   - The `### Emit success summary` block MUST replace the flat `planning-artifacts/PRD.md — loaded` / `planning-artifacts/architecture.md — loaded` lines with cascade-layer-aware lines:
     ```
     - PRD: <data.prd.path> [<data.prd.layer>] — loaded
     - Architecture: <data.architecture.path> [<data.architecture.layer>] — loaded
     ```
   - The tech-spec and project-context lines in the summary block remain unchanged.
   - The `### Parse task description structure` instructions (extract `{task_ac_list}`, `{task_subtasks}`, dev notes) are unchanged — they operate on the ClickUp task description already in context, not on file paths.

10. **`## RULES` section MUST be updated.** Rules 2 and 3 MUST reference the resolved paths instead of hardcoded strings:
    - Rule 2: "**PRD required:** If the file at `data.prd.path` (resolved by `resolve-doc-paths`) is missing or cannot be read, emit the PRD-not-found error block and **stop**."
    - Rule 3: "**Architecture required:** If the file at `data.architecture.path` (resolved by `resolve-doc-paths`) is missing or cannot be read, emit the architecture-not-found error block and **stop**."
    Rules 4 ("Tech-spec best-effort: `planning-artifacts/tech-spec.md`…") and 5 ("project-context best-effort…") MUST be byte-identical to their pre-migration form.

11. **`workflow.md` Context Builder section MUST be updated.** In `src/custom-skills/clickup-dev-implement/workflow.md`, the paragraph beginning "Loads `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md` (required)…" in the `## Context Builder` section MUST be replaced with:

    > Calls `bmad({ operation: 'resolve-doc-paths' })` to determine PRD and architecture paths via the 3-layer cascade (`.bmadmcp/config.toml [docs]` → BMAD `_bmad/config.toml` chain → `planning-artifacts/` default), then verifies the required files exist at the resolved paths. Also reads `planning-artifacts/tech-spec.md` and `project-context.md` (optional, best-effort, hardcoded paths — `tech_spec_path` cascade is deferred to a later story). The skill aborts if either required file is missing, surfacing the cascade layer and instructions for all three override layers.

    The `See:` reference line and the variable-availability line (`{prd_loaded}`, `{architecture_loaded}`, etc.) MUST remain unchanged.

12. **No TypeScript changes.** `git diff --stat -- '*.ts'` MUST be empty.

13. **No changes outside the two target files.** `git diff --stat` MUST show exactly:
    - **Modified:**
      - `src/custom-skills/clickup-dev-implement/steps/step-03-planning-artifact-reader.md`
      - `src/custom-skills/clickup-dev-implement/workflow.md`
    - Specifically:
      - `git diff --stat -- src/custom-skills/clickup-create-story/` MUST be empty.
      - `git diff --stat -- src/custom-skills/clickup-code-review/` MUST be empty.
      - `git diff --stat -- src/custom-skills/clickup-dev-implement/steps/step-01*` through `step-02*` and `step-04*` through `step-08*` MUST be empty.
      - `git diff --stat -- src/utils/` MUST be empty.
      - `git diff --stat -- tests/` MUST be empty.
      - `git diff --stat -- '*.ts'` MUST be empty.
      - `git diff --stat -- package.json` MUST be empty.
      - `git diff --stat -- planning-artifacts/` MUST be empty (this story file lands in a separate planning commit; CLAUDE.md updates land in story 6.8).

14. **Default behavior preserved for standard-layout projects.** A project with no `.bmadmcp/config.toml` and no `_bmad/config.toml`, with `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md` present, MUST produce functionally identical behaviour: same files loaded, same content in context. The only observable difference is the success summary now includes `[default]` layer tags.

15. **Commit message MUST follow Conventional Commits.** Use:
    ```
    feat(custom-skills): migrate clickup-dev-implement step-03 to resolve-doc-paths op
    ```
    Body MUST cite EPIC-6 and story 6.6, note that the migration is markdown-only (no TypeScript changes), explicitly state that `tech-spec.md` and `project-context.md` reads are intentionally not migrated, and that story 6.7 migrates `clickup-code-review` step-03.

## Out of Scope

- Migration of `tech-spec.md` to the cascade resolver — `tech_spec_path` is explicitly deferred in EPIC-6 §Open questions. Stays hardcoded until a future epic adds it to the resolver surface.
- Migration of `project-context.md` — this is a repo-wide glob search, not a configurable planning-artifact path. It is out of scope for EPIC-6.
- Migration of `clickup-code-review/steps/step-03-code-reader.md` → **story 6.7**.
- Documentation updates to `CLAUDE.md`, `.bmadmcp/config.example.toml`, README.md → **story 6.8**. The `workflow.md` update in AC #11 is structural and lands here to avoid immediate drift.
- Changes to steps 01, 02, 04–08 of `clickup-dev-implement` — those steps work with ClickUp task IDs, code changes, comments, and status transitions. They do not reference planning-artifact file paths.
- Adding automated tests for the markdown step file — there is no unit-testable TypeScript function. End-to-end correctness is covered by story 6.4's integration tests and EPIC-6's exit criteria.
- Handling `epics` key from the resolver — step-03 does not load epics context. Epic content arrives pre-loaded via step-02 (`getTaskById` fetches the parent epic task). No `data.epics.path` handling is needed.

## Tasks / Subtasks

- [x] **Task 1 — Confirm story 6.4 is merged** (prereq)
  - [x] Run `git log --oneline | grep 'resolve-doc-paths'` on the working branch. Record the output in §Debug Log References.
  - [x] Run `npm run cli:list-tools` and confirm `resolve-doc-paths` appears in the operation list. Record true/false.

- [x] **Task 2 — Update `step-03-planning-artifact-reader.md`** (AC: #1–#10)
  - [x] Add `resolve_doc_paths_result: ''` to YAML front-matter.
  - [x] Update `## RULES`: replace rules 2 and 3 path references with `data.prd.path` / `data.architecture.path` per AC #10. Rules 4 and 5 remain byte-identical.
  - [x] In `### Load planning artifacts`, replace instructions 1–4 (the two hardcoded `Read` calls and their `{x_loaded} = 'true'` setters) with:
    1. Call `bmad({ operation: 'resolve-doc-paths' })`. Store full response as `{resolve_doc_paths_result}`. Extract `data.prd`, `data.architecture`, `data.warnings`.
    2. If `data.warnings` non-empty, emit each as a `⚠️` line.
    3. Check existence of `data.prd.path`. If missing, emit PRD error block (with resolved path, layer tag, 3-bullet override block) and stop. Otherwise set `{prd_loaded}` = `'true'` and load file content.
    4. Check existence of `data.architecture.path`. If missing, emit architecture error block (same structure) and stop. Otherwise set `{architecture_loaded}` = `'true'` and load file content.
  - [x] Verify instructions 5 (`tech-spec.md`) and 6 (`project-context.md`) are byte-identical to pre-migration form.
  - [x] Verify `### Parse task description structure` instructions 7–9 are unchanged.
  - [x] Update `### Emit success summary` block per AC #9 (resolved paths + layer tags for PRD and architecture lines).

- [x] **Task 3 — Update `workflow.md`** (AC: #11)
  - [x] Replace the `## Context Builder` opening paragraph per AC #11, keeping the `See:` reference line and variable-availability line unchanged.

- [x] **Task 4 — Verify diff scope** (AC: #12, #13)
  - [x] `git diff --stat` shows exactly the two target files, nothing else.
  - [x] `git diff --stat -- '*.ts'` is empty.
  - [x] `git diff --stat -- tests/` is empty.

- [x] **Task 5 — Commit** (AC: #15)
  - [x] Stage only the two modified files.
  - [x] Commit with header and body per AC #15.

## Dev Notes

### Why `tech-spec.md` is NOT migrated

The `resolve-doc-paths` operation's surface is locked to `prd`, `architecture`, and `epics` keys (story 6.3 AC #1). EPIC-6 §Open questions explicitly defers `tech_spec_path` and `ux_design_path` cascade keys. The step-03 read of `planning-artifacts/tech-spec.md` remains hardcoded best-effort intentionally — it is a soft dependency that falls through gracefully, and its path is not configurable in this epic. A future story adding `tech_spec_path` to the resolver will migrate it then.

### Why `project-context.md` is NOT migrated

`project-context.md` is discovered via `**/project-context.md` glob from the project root — it is not a fixed planning-artifact path and is not listed in the resolver's `DocPaths` shape. It is intentionally excluded from the cascade design. It continues to be searched silently with no change.

### Why `epics` key is not used in step-03

Unlike `clickup-create-story/step-01`, which loads epics context to enrich the story description, `clickup-dev-implement/step-03` does not load epics. Epic context arrives pre-loaded in the conversation via step-02 (`getTaskById` fetches the parent epic task and makes its description available). Calling `data.epics.path` would be a no-op — step-03 has no use for it.

### Why there is no permission gate equivalent

`clickup-create-story/step-01` has a ClickUp write-mode permission gate before calling `resolve-doc-paths` (because story creation requires write access). `clickup-dev-implement/step-03` has no such gate — step-03 is read-only (IDE file reads only, per RULE 1). The `resolve-doc-paths` call goes first without any prerequisite gate.

### Structure of migrated instructions

Pre-migration flow:
1. Read `planning-artifacts/PRD.md` → error or set `{prd_loaded}`
2. (implicit set prd_loaded)
3. Read `planning-artifacts/architecture.md` → error or set `{architecture_loaded}`
4. (implicit set architecture_loaded)
5. Read `planning-artifacts/tech-spec.md` (best-effort)
6. Search `**/project-context.md` (silent best-effort)
7–9. Parse task description structure
10. Emit success summary

Post-migration flow:
1. `bmad({ operation: 'resolve-doc-paths' })` → `{resolve_doc_paths_result}`
2. Emit `data.warnings` (if any)
3. Check `data.prd.path`, load, set `{prd_loaded}`
4. Check `data.architecture.path`, load, set `{architecture_loaded}`
5. Read `planning-artifacts/tech-spec.md` (best-effort, UNCHANGED)
6. Search `**/project-context.md` (silent best-effort, UNCHANGED)
7–9. Parse task description structure (UNCHANGED)
10. Emit updated success summary (with resolved paths + layers)

The instruction numbering may shift — the resolver call absorbs instructions 1–4 into a tighter block.

### Previous story learnings from 6.5

Story 6.5 migrated `clickup-create-story/step-01-prereq-check.md` using the same resolver pattern. Key learnings:
- The YAML front-matter variable `resolve_doc_paths_result: ''` documents the new context variable to downstream steps.
- Error blocks must include path, layer tag, and 3-bullet override block as a unit.
- The confirmation/success message must include layer tags so operators can see which config layer resolved each path.
- `workflow.md` structural updates belong in the same commit to avoid drift.

### References

- [EPIC-6 §Outcomes](../epics/EPIC-6-configurable-doc-path-resolution.md) — "`clickup-create-story`, `clickup-dev-implement`, `clickup-code-review` migrated to consume the operation"
- [EPIC-6 §Open questions](../epics/EPIC-6-configurable-doc-path-resolution.md) — defers `tech_spec_path` and `ux_design_path`
- [Story 6.4 §Out of Scope](./6-4-resolve-doc-paths-mcp-operation.md) — explicitly defers this migration here
- [Story 6.5](./6-5-migrate-clickup-create-story.md) — parallel story migrating `clickup-create-story/step-01`; acceptance criteria structure mirrors this story
- [Story 6.3 AC #1](./6-3-doc-path-resolver-cascade.md) — locks resolver surface to `prd`, `architecture`, `epics` keys only
- [`src/custom-skills/clickup-dev-implement/steps/step-03-planning-artifact-reader.md`](../../src/custom-skills/clickup-dev-implement/steps/step-03-planning-artifact-reader.md) — the file being migrated
- [`src/custom-skills/clickup-dev-implement/workflow.md`](../../src/custom-skills/clickup-dev-implement/workflow.md) — the skill-level doc being updated
- [`src/utils/doc-path-resolver.ts`](../../src/utils/doc-path-resolver.ts) — the resolver whose output `resolve-doc-paths` surfaces

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (kimi-cli) with bmad-mcp-server tooling.

### Debug Log References

- **Story 6.4 merge status:** `caa033b feat(tools): add resolve-doc-paths MCP operation` (confirmed via `git log --oneline | grep 'resolve-doc-paths'`)
- **`npm run cli:list-tools` shows `resolve-doc-paths`:** `true` — operation is registered on the unified `bmad` tool (confirmed by `src/tools/bmad-unified.ts` grep)
- **`git diff --stat` after implementation:** exactly 2 files modified (`step-03-planning-artifact-reader.md` +35/-10, `workflow.md` +1/-1)
- **`tech-spec.md` instruction unchanged:** confirmed byte-identical (instruction 5 shows zero diff)
- **`project-context.md` instruction unchanged:** confirmed byte-identical (instruction 6 shows zero diff)

### Completion Notes List

1. Added `resolve_doc_paths_result: ''` to YAML front-matter to document the new context variable for downstream steps.
2. Replaced hardcoded `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md` reads with `bmad({ operation: 'resolve-doc-paths' })` call as the first action in `### Load planning artifacts`.
3. Updated RULES 2 and 3 to reference `data.prd.path` and `data.architecture.path` (resolved by `resolve-doc-paths`) instead of hardcoded strings.
4. Added cascade warning emission (instruction 2) before file-existence checks.
5. Updated PRD and architecture error blocks to include resolved path, layer tag (`bmadmcp-config` | `bmad-config` | `default`), and 3-bullet "How to override doc paths" block.
6. Updated success summary to show resolved paths + layer tags for PRD and architecture lines.
7. Verified instructions 5 (`tech-spec.md`) and 6 (`project-context.md`) are byte-identical to pre-migration form.
8. Updated `workflow.md` Context Builder paragraph to describe the 3-layer cascade resolver pattern, keeping `See:` reference and variable-availability lines unchanged.
9. All diff-scope checks pass: only 2 files modified, zero TypeScript changes, zero test changes, zero changes to other skills or steps.
10. Commit follows Conventional Commits with EPIC-6 citation, markdown-only note, and explicit mention of non-migrated `tech-spec.md` / `project-context.md` reads.

### File List

**Modified**

- `src/custom-skills/clickup-dev-implement/steps/step-03-planning-artifact-reader.md` — replace hardcoded PRD + architecture reads with `resolve-doc-paths` call; update RULES 2–3, error blocks, loading, and success summary
- `src/custom-skills/clickup-dev-implement/workflow.md` — update Context Builder section to describe cascade

**New**

- (none)

**Deleted**

- (none)

## Change Log

| Date       | Change                                                                                                                                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-30 | Story drafted from EPIC-6 bullet 6 ("Migrate `clickup-dev-implement` step-03 to consume the new op") and Story 6.5 as structural template. Key difference: `tech-spec.md` and `project-context.md` not migrated. Status → ready-for-dev. |
| 2026-04-30 | Story implemented — step-03 and workflow.md migrated to `resolve-doc-paths` operation. All ACs satisfied. Diff scope clean (2 files only, no TypeScript changes). Status → review. |
