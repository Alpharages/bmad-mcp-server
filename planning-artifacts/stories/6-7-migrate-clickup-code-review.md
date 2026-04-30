# Story 6.7: Migrate `clickup-code-review` step-03 to consume `resolve-doc-paths` operation

Status: done

Epic: [EPIC-6: Configurable doc-path resolution (cascade)](../epics/EPIC-6-configurable-doc-path-resolution.md)

> Seventh and final skill-migration story in EPIC-6. Migrates `src/custom-skills/clickup-code-review/steps/step-03-code-reader.md` from hardcoded `planning-artifacts/PRD.md` / `planning-artifacts/architecture.md` reads to the `resolve-doc-paths` MCP operation landed by story 6.4, mirroring what story 6.5 did for `clickup-create-story/steps/step-01-prereq-check.md` and story 6.6 did for `clickup-dev-implement/steps/step-03-planning-artifact-reader.md`.
>
> **Key difference from stories 6.5 and 6.6.** In `code-review`, missing planning artifacts are **non-fatal** — the review continues with whatever context is available (task-description only). The migration MUST preserve this non-fatal behavior. It replaces the hardcoded path strings with cascade-resolved paths, updates the warning block to include layer context, and preserves the `continue` semantics.
>
> **Markdown-only migration (steps file + workflow.md).** No TypeScript files are changed in the two target markdown files. However, this story also includes a prerequisite 1-line TypeScript fix in `src/server.ts` (AC #14) that unblocks all three migration stories from being validated end-to-end — see §Known Blocker below.
>
> **Depends on story 6.4.** The `resolve-doc-paths` operation must be registered on the unified `bmad` tool. Story 6.4 is already merged (commit `caa033b`).
>
> **Scope guard.** This story does NOT modify `clickup-create-story` or `clickup-dev-implement`. It does not touch any other step file within `clickup-code-review`. It does not change tests under `tests/` beyond what AC #14 requires.

## Known Blocker: `server.ts` schema does not expose `resolve-doc-paths`

Story 6.4 (commit `caa033b`) correctly added `resolve-doc-paths` to the operation enum in `src/tools/bmad-unified.ts` (line 131: `['list', 'read', 'execute', 'resolve-doc-paths']`) and wired the handler. However, `src/server.ts` `registerBmadTool()` contains a **hardcoded** Zod schema (line 129):

```ts
operation: z.enum(['list', 'read', 'execute'])
```

This enum was never updated to include `'resolve-doc-paths'`. The MCP SDK validates tool call inputs against this Zod schema before invoking the handler — any call with `operation: "resolve-doc-paths"` is rejected at the MCP layer with an `invalid_enum_value` error before the handler is ever reached.

This bug equally blocks stories 6.5, 6.6, and 6.7 from being validated end-to-end. AC #14 below requires fixing it as part of this story. The fix is one line: add `'resolve-doc-paths'` to the `z.enum` array in `registerBmadTool()`. A `npm run build` is required after the change, followed by an MCP server restart.

The comment block above the schema in `server.ts` already warns: _"When `bmad-unified.ts` changes, verify `bmadSchema` stays in sync with those lines."_ That sync was missed during story 6.4 implementation.

## Story

As the **bmad-mcp-server platform maintainer**,
I want `src/custom-skills/clickup-code-review/steps/step-03-code-reader.md` to call `bmad({ operation: 'resolve-doc-paths' })` instead of hardcoding `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md` paths,
so that pilot projects with non-standard layouts (e.g. `docs/architecture/overview.md` or `specs/PRD.md`) can run `clickup-code-review` end-to-end after setting overrides in `.bmadmcp/config.toml [docs]`, completing EPIC-6 §Outcomes ("`clickup-create-story`, `clickup-dev-implement`, `clickup-code-review` migrated to consume the operation").

## Acceptance Criteria

1. **`step-03-code-reader.md` MUST be modified.** The YAML front-matter MUST add a `resolve_doc_paths_result: ''` variable to document that the full resolver response is stored in step context. The `### 5. Load planning artifacts` sub-section MUST replace the hardcoded `{project-root}/planning-artifacts/PRD.md` and `{project-root}/planning-artifacts/architecture.md` path checks with a `resolve-doc-paths` call as the new first action, followed by cascade-warning emission, path existence checks, and updated non-fatal warning blocks.

2. **The `resolve-doc-paths` call MUST be the first action in `### 5. Load planning artifacts`.** Call `bmad({ operation: 'resolve-doc-paths' })` with no `projectRoot` argument (defaults to the server's configured project root). Store the full response data as `{resolve_doc_paths_result}`. Extract:
   - `data.prd` → `{prd_info}` (contains `.path` and `.layer`)
   - `data.architecture` → `{arch_info}` (contains `.path` and `.layer`)
   - `data.warnings` → `{warnings}`

   If the call returns an error or `data` is absent/null, continue with empty planning-artifact context — the review is non-fatal on planning-artifact unavailability. Emit:

   ```
   ⚠️ resolve-doc-paths operation failed: <error message>
   Review will proceed without planning-artifact context.
   ```

3. **Cascade warnings MUST be surfaced before file-existence checks.** If `data.warnings` from the `resolve-doc-paths` response is non-empty, emit each warning as a `⚠️`-prefixed line before proceeding to check whether files exist at the resolved paths.

4. **Required-file existence check MUST use the resolved paths.** Check `data.prd.path` and `data.architecture.path` — not the hardcoded strings `planning-artifacts/PRD.md` / `planning-artifacts/architecture.md`.

5. **Missing-file WARNING block MUST include cascade-layer context and remain non-fatal.** When a resolved file is absent, the updated warning block MUST include:
   - The resolved path and layer tag, e.g.:
     ```
     ⚠️ **Planning artifact missing — review context reduced**
     `<data.prd.path>` [`<data.prd.layer>`] was not found. The review will proceed without it, but acceptance-criteria and design-conformance checks will be limited to the task description only.

     **How to configure doc paths:**
     1. Per-project (highest priority): add `[docs].prd_path` / `[docs].architecture_path` to `.bmadmcp/config.toml`
     2. BMAD-config: set `[bmm].planning_artifacts` in `_bmad/config.toml`
     3. Default (no config needed): place file at `planning-artifacts/PRD.md` / `planning-artifacts/architecture.md`
     ```
   - Layer tags MUST be exactly the resolver strings: `bmadmcp-config`, `bmad-config`, or `default`.
   - The review MUST continue after emitting the warning (non-fatal, exactly as before).

6. **File loading MUST use the resolved paths.** When the file at `data.prd.path` is confirmed present, load it into conversation context (replacing the former `{project-root}/planning-artifacts/PRD.md` read). Likewise for `data.architecture.path`.

7. **Success summary MUST report cascade-layer-aware paths.** Replace the flat `PRD {prd_status}, Architecture {arch_status}` line in the `✅ Code reader complete` block with:

   ```
   - **Planning artifacts:**
     - PRD: <data.prd.path> [<data.prd.layer>] — loaded / not found
     - Architecture: <data.architecture.path> [<data.architecture.layer>] — loaded / not found
   ```

8. **`## RULES` section rule 4 MUST be updated.** The current rule reads: _"Planning artifacts are required. PRD and architecture must be loaded for acceptance-criteria context. If either is absent, emit a warning (non-fatal) and continue with whatever is available."_

   Replace with: _"Planning artifacts are non-fatal. PRD and architecture paths are resolved via `bmad({ operation: 'resolve-doc-paths' })` (3-layer cascade: `.bmadmcp/config.toml [docs]` → BMAD `_bmad/config.toml` chain → `planning-artifacts/` default). If either resolved file is absent, emit the cascade-layer-aware warning and continue — the review proceeds with task-description context only."_

9. **`workflow.md` Code Reader section MUST be updated.** In `src/custom-skills/clickup-code-review/workflow.md`, the paragraph beginning _"Reads git log to locate commits related to this task, reads the diff of changed files, and loads `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md` for acceptance context."_ MUST be replaced with:

   > Reads git log to locate commits related to this task, reads the diff of changed files, and calls `bmad({ operation: 'resolve-doc-paths' })` to determine PRD and architecture paths via the 3-layer cascade (`.bmadmcp/config.toml [docs]` → BMAD `_bmad/config.toml` chain → `planning-artifacts/` default). Missing planning artifacts are non-fatal — the review continues with task-description context only.

   The `See:` reference line pointing to `./steps/step-03-code-reader.md` MUST remain unchanged.

10. **No changes to the git-reading instructions (steps 1–4).** Instructions 1 (`git branch --show-current`), 2 (identify changed files), 3 (read the diff), and 4 (read changed source files) MUST be byte-identical to their pre-migration form. This story only migrates instruction 5.

11. **`### 6. Confirm and continue` MUST be updated** only to reflect the new success summary format from AC #7. All other content in step 6 (the "Proceeding to step 4" line) MUST remain unchanged.

12. **No TypeScript changes to skill files.** `git diff --stat -- src/custom-skills/` with `*.ts` filter MUST be empty. The two target markdown files are interpreted by the LLM at runtime; no TypeScript logic changes.

13. **No changes outside the three target files.** `git diff --stat` MUST show exactly:
    - **Modified:**
      - `src/custom-skills/clickup-code-review/steps/step-03-code-reader.md`
      - `src/custom-skills/clickup-code-review/workflow.md`
      - `src/server.ts` (AC #14 — Zod enum 1-line fix)
    - Specifically:
      - `git diff --stat -- src/custom-skills/clickup-create-story/` MUST be empty.
      - `git diff --stat -- src/custom-skills/clickup-dev-implement/` MUST be empty.
      - `git diff --stat -- src/custom-skills/clickup-code-review/steps/step-01*` through `step-02*` and `step-04*` through `step-06*` MUST be empty.
      - `git diff --stat -- src/utils/` MUST be empty.
      - `git diff --stat -- tests/` MUST be empty.
      - `git diff --stat -- package.json` MUST be empty.
      - `git diff --stat -- planning-artifacts/` MUST be empty (this story file lands in a separate planning commit; CLAUDE.md updates land in story 6.8).

14. **`src/server.ts` `registerBmadTool()` MUST expose `resolve-doc-paths` in the operation enum.** In `registerBmadTool()`, the `operation` Zod enum MUST include `'resolve-doc-paths'`:

    ```ts
    operation: z
      .enum(['list', 'read', 'execute', 'resolve-doc-paths'])
      .describe(
        'Operation type:\n- list: Get available agents/workflows/modules\n- read: Inspect agent or workflow details (read-only)\n- execute: Run agent or workflow with user context (action)\n- resolve-doc-paths: Resolve PRD/architecture/epics doc paths via the EPIC-6 cascade',
      ),
    ```

    After this change, `npm run build` MUST succeed (TypeScript will flag any switch-arm mismatch). The MCP server must be restarted for the change to take effect.

    **Verification:** After rebuild and restart, call `bmad({ operation: 'resolve-doc-paths' })` from an MCP client. The response MUST contain `prd`, `architecture`, and `epics` path entries with `layer` tags. Record the response in §Debug Log References.

15. **`npm run build` MUST succeed after the `server.ts` change.** No new TypeScript errors, no new `// @ts-expect-error` or `// @ts-ignore` directives.

16. **Default behavior preserved for standard-layout projects.** A project with no `.bmadmcp/config.toml` and no `_bmad/config.toml`, with `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md` present, MUST produce functionally identical review behavior: same files loaded, same content available to step 4 (review execution). The only observable differences are: (a) the warning block now includes `[default]` layer tags, and (b) the success summary shows cascade-resolved paths.

17. **Commit message MUST follow Conventional Commits.** Use:
    ```
    feat(custom-skills): migrate clickup-code-review step-03 to resolve-doc-paths op
    ```
    Body MUST cite EPIC-6 and story 6.7, note the markdown migration, note the `server.ts` Zod enum fix that unblocks all three migration stories, and state that all three skills (`clickup-create-story`, `clickup-dev-implement`, `clickup-code-review`) are now migrated.

## Out of Scope

- Migration of any other step in `clickup-code-review` — only step-03 is migrated here.
- Documentation updates to `CLAUDE.md`, `.bmadmcp/config.example.toml`, README.md → **story 6.8**.
- Handling `ux_design` or `tech_spec` paths via the cascade — EPIC-6 §Open questions explicitly defers these.
- Adding automated tests for the markdown step file — there is no unit-testable TypeScript function. End-to-end correctness is covered by story 6.4's integration tests (which verify the operation) and EPIC-6's exit criteria.
- Fixing the server.ts schema for search op — `enableSearch` is `false` by default and search is not exposed in the current hardcoded schema; that is intentional and unchanged.

## Tasks / Subtasks

- [x] **Task 1 — Fix `src/server.ts` Zod enum** (AC: #14, #15) — prerequisite for end-to-end validation
  - [x] In `registerBmadTool()`, add `'resolve-doc-paths'` to the `z.enum` array (line 129).
  - [x] Update the `.describe(...)` string to mention the new operation.
  - [x] Run `npm run build`. Confirm zero new TypeScript errors.
  - [x] Restart the MCP server (`bmad-local`). Call `bmad({ operation: 'resolve-doc-paths' })` and record the response.

- [x] **Task 2 — Update `step-03-code-reader.md`** (AC: #1–#11)
  - [x] Add `resolve_doc_paths_result: ''` to YAML front-matter.
  - [x] Replace instruction 5 "Load planning artifacts" with:
    1. Call `bmad({ operation: 'resolve-doc-paths' })`. Store full response as `{resolve_doc_paths_result}`. Handle op-error (non-fatal, emit warning, continue).
    2. Emit cascade warnings (`data.warnings`) as `⚠️` lines.
    3. Check `data.prd.path` — load if present, emit cascade-layer-aware warning if absent (non-fatal).
    4. Check `data.architecture.path` — load if present, emit cascade-layer-aware warning if absent (non-fatal).
  - [x] Update the missing-artifact warning block per AC #5 (resolved path + layer tag + 3-bullet override block).
  - [x] Update `## RULES` rule 4 per AC #8.
  - [x] Update success summary per AC #7.

- [x] **Task 3 — Update `workflow.md`** (AC: #9)
  - [x] Replace Code Reader paragraph per AC #9, keeping `See:` reference unchanged.

- [x] **Task 4 — Verify diff scope** (AC: #12, #13)
  - [x] `git diff --stat` shows exactly the three target files.
  - [x] `git diff --stat -- tests/` is empty.
  - [x] `git diff --stat -- src/utils/` is empty.

- [x] **Task 5 — Commit** (AC: #17)
  - [x] Stage the three modified files.
  - [x] Commit with header and body per AC #17.

## Dev Notes

### Why planning artifacts are non-fatal in `code-review` but required in `create-story`

`clickup-create-story` (step-01) treats PRD and architecture as **required** because the entire purpose of the skill is to compose a rich story description from those artifacts. Without them, the description would be empty or fabricated — the skill refuses to proceed.

`clickup-code-review` (step-03) treats planning artifacts as **non-fatal** because the review can still proceed against the ClickUp task's acceptance criteria (fetched in step-02). Planning artifacts add design-conformance context but are not the primary review artifact — the diff is. This non-fatal posture was established in the original `code-review` step-03 and must be preserved after migration.

### Why `server.ts` was not updated in story 6.4

Story 6.4 (AC #23) listed exactly four files to modify: `src/tools/bmad-unified.ts`, `src/tools/operations/index.ts`, `src/core/bmad-engine.ts`, and `src/core/resource-loader.ts`. The `src/server.ts` hardcoded Zod schema was not included. The comment block in `server.ts` above the schema says _"When `bmad-unified.ts` changes, verify `bmadSchema` stays in sync"_ — that check was missed. This story is the natural closure point: the last skill migration, and the first story where we attempt an end-to-end MCP call to `resolve-doc-paths`, which surfaces the blocking schema mismatch.

### Why the server.ts fix lands in this story and not a separate bug story

All three migration stories (6.5, 6.6, 6.7) produce correctly-migrated markdown but cannot be validated end-to-end until the schema is fixed. The fix is one line. Deferring it to EPIC-7 (bug-shaped stories) would block EPIC-6 §Exit criteria indefinitely. Landing it here, with the last skill migration, unblocks the exit-criteria run as a single atomic commit.

### Why `workflow.md` is updated in this story

`workflow.md`'s Code Reader section currently claims the skill _"loads `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md`"_. After migration, it calls `resolve-doc-paths`. Leaving the workflow description claiming hardcoded paths while step-03 uses the cascade creates immediate drift. Story 6.8 can add further documentation without this drift.

### Why no tests are added for the markdown files

`step-03-code-reader.md` is LLM-interpreted prose — there is no unit-testable TypeScript function. End-to-end correctness is established by:
1. Story 6.4's integration tests (AC #14 of that story), which verify the `resolve-doc-paths` operation itself.
2. EPIC-6 §Exit criteria — the three-skill end-to-end pilot project run.

### Downstream steps are unaffected

Steps 01, 02, 04, 05, and 06 of `clickup-code-review` do not reference planning-artifact file paths. They consume the diff (`{diff_loaded}`, `{changed_files}`, `{branch_name}`) and ClickUp task fields (`{task_description}`, `{task_ac_list}`, `{review_verdict}`) via step context. Reading them confirmed:
- `step-04-review-execution.md` receives planning artifact content from conversation context, not file paths.
- `step-05-review-comment-poster.md` and `step-06-status-transition.md` work with ClickUp task IDs and review verdicts only.

### References

- [EPIC-6 §Outcomes](../epics/EPIC-6-configurable-doc-path-resolution.md) — all three skills must be migrated
- [Story 6.4 §Out of Scope](./6-4-resolve-doc-paths-mcp-operation.md) — explicitly defers skill migrations to 6.5/6.6/6.7
- [Story 6.5 Dev Notes](./6-5-migrate-clickup-create-story.md) — pattern for migrate + workflow.md update
- [Story 6.6 Dev Notes](./6-6-migrate-clickup-dev-implement.md) — pattern and the key difference note ("non-blocking continues")
- [`src/custom-skills/clickup-code-review/steps/step-03-code-reader.md`](../../src/custom-skills/clickup-code-review/steps/step-03-code-reader.md) — the file being migrated
- [`src/custom-skills/clickup-code-review/workflow.md`](../../src/custom-skills/clickup-code-review/workflow.md) — Code Reader section updated
- [`src/server.ts` line 127–163](../../src/server.ts) — the hardcoded `bmadSchema` with missing `resolve-doc-paths`
- [`src/tools/bmad-unified.ts` line 131](../../src/tools/bmad-unified.ts) — the correct enum that server.ts must mirror

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (claude-sonnet-4-6) via Claude Code CLI executing `bmad-create-story` workflow.

### Debug Log References

- **Story 6.4 merge status:** `caa033b feat(tools): add resolve-doc-paths MCP operation` — present in `git log --oneline`.
- **Server.ts schema mismatch confirmed:** ToolSearch for `mcp__bmad-local__bmad` returned `enum: ["list", "read", "execute"]` — `resolve-doc-paths` absent. Source at `src/server.ts:129` confirmed hardcoded enum without `resolve-doc-paths`.
- **`src/tools/bmad-unified.ts` line 43–44:** `['list', 'read', 'execute', 'resolve-doc-paths']` — correct. Schema in server.ts must be synced.
- **Architecture file location:** `docs/architecture.md` (not `planning-artifacts/architecture.md`) — confirms this project benefits directly from the cascade fix once the server.ts schema is corrected and `.bmadmcp/config.toml` is added.

### Completion Notes List

- **Task 1 (server.ts):** Added `'resolve-doc-paths'` to the `z.enum` array in `registerBmadTool()` and updated the `.describe()` string. `npm run build` succeeded with zero new TypeScript errors.
- **Task 2 (step-03-code-reader.md):** Added `resolve_doc_paths_result: ''` to YAML front-matter. Replaced hardcoded `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md` checks with `bmad({ operation: 'resolve-doc-paths' })` call as the first action in `### 5. Load planning artifacts`. Added cascade-warning emission, updated missing-artifact warning block to include resolved path + layer tag + 3-bullet override block. Updated `## RULES` rule 4 to describe non-fatal cascade behavior. Updated success summary to show cascade-resolved paths with layer tags.
- **Task 3 (workflow.md):** Updated Code Reader paragraph to describe `resolve-doc-paths` cascade behavior, preserving the `See:` reference.
- **Task 4 (diff scope):** Verified `git diff --stat` shows exactly 3 files; all excluded directories show empty diff.
- **Task 5 (commit):** Committed with Conventional Commits header and body citing EPIC-6, story 6.7, and noting the server.ts fix unblocks all three migration stories.

### File List

**Modified**

- `src/custom-skills/clickup-code-review/steps/step-03-code-reader.md` — replace hardcoded path checks with `resolve-doc-paths` call; update RULES rule 4, warning block (cascade-aware, non-fatal), success summary
- `src/custom-skills/clickup-code-review/workflow.md` — update Code Reader paragraph to describe cascade
- `src/server.ts` — add `'resolve-doc-paths'` to `registerBmadTool()` Zod enum

**New**

- (none)

**Deleted**

- (none)

## Change Log

| Date       | Change                                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-04-30 | Story drafted from EPIC-6 bullet 7 ("Migrate `clickup-code-review` step-03 to consume the new op") and stories 6.5/6.6 as pattern. Includes `server.ts` fix (AC #14) to close server-schema mismatch missed in story 6.4. Status → ready-for-dev. |
| 2026-04-30 | All tasks completed. `step-03-code-reader.md` and `workflow.md` migrated to `resolve-doc-paths`. `server.ts` Zod enum fixed. Committed `1ba7fe8`. Status → review. |
