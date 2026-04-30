# Story 6.8: Document the doc-path cascade in CLAUDE.md, README, and config.example.toml

Status: done

Epic: [EPIC-6: Configurable doc-path resolution (cascade)](../epics/EPIC-6-configurable-doc-path-resolution.md)

> Closing documentation story for EPIC-6. Stories 6.1–6.7 implemented the 3-layer cascade
> (`resolveDocPaths` utility, `toml-loader`, `resolve-doc-paths` MCP operation, and migration
> of all three custom skills). This story surfaces that feature to users and contributors by
> updating the three external-facing files that were explicitly deferred: `CLAUDE.md`,
> `README.md`, and `.bmadmcp/config.example.toml`.
>
> **No TypeScript changes.** All three target files are documentation or configuration
> templates. The cascade is already fully implemented and tested; this story only
> makes it discoverable.
>
> **Scope guard.** This story does NOT re-open any skill step files, does NOT add tests,
> and does NOT change any file in `src/`. It does NOT retroactively document stories 6.1–6.7
> beyond what CLAUDE.md's "Unified Tool Design" section needs to reflect the correct operation
> list.

## Story

As the **bmad-mcp-server platform maintainer**,
I want `CLAUDE.md`, `README.md`, and `.bmadmcp/config.example.toml` to document the 3-layer
doc-path cascade introduced in EPIC-6,
so that both contributors (CLAUDE.md) and end-users (README + config.example.toml) know how
to configure non-standard planning-artifact layouts without having to read the skill step
files or the EPIC-6 implementation stories.

## Acceptance Criteria

1. **`CLAUDE.md` "Unified Tool Design" section MUST list `resolve-doc-paths` as the fifth
   operation.** The current text reads:
   > _"A single `bmad` MCP tool with four operations (`list`, `read`, `execute`, `search`)"_

   It MUST be updated to:
   > _"A single `bmad` MCP tool with five operations (`list`, `read`, `execute`, `search`,
   > `resolve-doc-paths`)"_

   The `See:` line pointing to `src/tools/bmad-unified.ts` and `src/tools/operations/` MUST
   remain.

2. **`CLAUDE.md` MUST gain a `## Doc-Path Cascade` section** inserted immediately after the
   `## Environment Variables` block (before `## Conventions`). The section MUST include:

   a. A one-paragraph overview explaining what the cascade is and why it exists (projects
      with non-standard layouts hit a hard prereq failure before EPIC-6).

   b. A cascade-order table or numbered list (highest → lowest priority):
      1. `.bmadmcp/config.toml` `[docs]` table — per-project escape hatch
      2. BMAD config chain (`_bmad/config.toml` → `_bmad/config.user.toml` →
         `_bmad/custom/config.toml` → `_bmad/custom/config.user.toml`) via
         `[bmm].planning_artifacts` directory key
      3. Hardcoded default — `{project-root}/planning-artifacts/` (preserves
         pre-EPIC-6 behavior)

   c. A table of the four per-key overrides available in `.bmadmcp/config.toml [docs]`:
      | Key | Resolves | Default |
      |-----|---------|---------|
      | `prd_path` | Absolute or project-root-relative path to PRD | `planning-artifacts/PRD.md` |
      | `architecture_path` | Absolute or project-root-relative path to architecture doc | `planning-artifacts/architecture.md` |
      | `epics_path` | Path to epics file or directory | `planning-artifacts/epics/` |
      | `planning_dir` | Directory used to derive default filenames (applies to all three) | `planning-artifacts/` |

   d. A worked example TOML block for a project whose docs live under `docs/`:
      ```toml
      [docs]
      prd_path          = "docs/specs/PRD.md"
      architecture_path = "docs/architecture/overview.md"
      epics_path        = "docs/epics/"
      ```

   e. A note that resolution is **per-key**: overriding only `prd_path` leaves
      architecture and epics to be resolved by the BMAD config or default layers.

   f. A note that the cascade is invoked via `bmad({ operation: 'resolve-doc-paths' })`
      and is consumed by all three custom skills (`clickup-create-story`,
      `clickup-dev-implement`, `clickup-code-review`).

   g. This project's own override note: this repo's architecture lives at
      `docs/architecture.md` (not `planning-artifacts/architecture.md`), so a
      project-local `.bmadmcp/config.toml` must set `architecture_path =
      "docs/architecture.md"`. The gitignored `.bmadmcp/config.toml` is the right
      place for this; `.bmadmcp/config.example.toml` (tracked) shows the schema.

3. **`.bmadmcp/config.example.toml` MUST gain a `[docs]` section** appended after the
   existing `[clickup_create_story]` block. The section MUST:

   a. Have a header comment explaining the cascade and when to use this table.

   b. Document all four keys (`prd_path`, `architecture_path`, `epics_path`,
      `planning_dir`), each commented out with a one-line description.

   c. Include an inline worked example (commented out) for a project whose docs live
      under `docs/`:
      ```toml
      # Example for a project with docs in docs/ rather than planning-artifacts/:
      # prd_path          = "docs/specs/PRD.md"
      # architecture_path = "docs/architecture/overview.md"
      # epics_path        = "docs/epics/"
      ```

   d. Include a reminder that the cascade is per-key — overriding only one key leaves
      the others to the BMAD config or default layers.

   e. Update the file-level header comment ("Read by: clickup-create-epic /
      clickup-create-story custom skills") to also include `clickup-dev-implement` and
      `clickup-code-review`, which now also call `resolve-doc-paths`.

4. **`README.md` "Project-local config" section MUST document the `[docs]` cascade.**
   The current section (`### Project-local config (.bmadmcp/config.toml)`, approximately
   lines 650–686) describes only the ClickUp-picker pinning keys. MUST be extended with:

   a. A sub-section or paragraph titled **"Doc-path cascade (`[docs]` table)"** that
      explains the cascade and refers to `.bmadmcp/config.example.toml` for the full
      schema.

   b. A minimal TOML example showing only the `[docs]` keys:
      ```toml
      [docs]
      prd_path          = "docs/specs/PRD.md"
      architecture_path = "docs/architecture/overview.md"
      ```

   c. A statement that this override is consumed by all three custom skills when they
      call `resolve-doc-paths`.

   d. A note pointing to the `## Environment Variables` table in CLAUDE.md (or to
      CLAUDE.md's `## Doc-Path Cascade` section) for contributor-level detail.

   e. The existing note `> Does **not** apply to clickup-dev-implement or
      clickup-code-review` MUST be removed or corrected — those skills now DO consume
      the cascade via `resolve-doc-paths`.

5. **No TypeScript changes.** `git diff --stat -- src/` MUST be empty. No new
   `// @ts-expect-error` or `// @ts-ignore` directives.

6. **No changes to skill step files or workflow.md files.** `git diff --stat --
   src/custom-skills/` MUST be empty.

7. **No changes to test files.** `git diff --stat -- tests/` MUST be empty.

8. **`npm run build` MUST succeed** (zero TypeScript errors) to confirm no accidental
   imports or file renames were introduced. Run `npm run lint` as well.

9. **Diff scope.** `git diff --stat` MUST show exactly:
   - **Modified:**
     - `CLAUDE.md`
     - `README.md`
     - `.bmadmcp/config.example.toml`
   - No other files.

10. **Commit message MUST follow Conventional Commits:**
    ```
    docs(config): document doc-path cascade in CLAUDE.md, README, and config.example.toml
    ```
    Body MUST cite EPIC-6 and story 6.8, note that no TypeScript was changed, and state
    that the cascade was already fully implemented by stories 6.1–6.7.

## Out of Scope

- Any changes to skill step files (`src/custom-skills/**`) — those were finalized by
  stories 6.5, 6.6, and 6.7.
- Adding automated tests for cascade behavior — story 6.4 owns those integration tests.
- Handling `ux_design_path` or `tech_spec_path` cascade keys — EPIC-6 §Open Questions
  explicitly defers these.
- Adding a `.bmadmcp/config.toml` for this project to `git` history — it is gitignored
  by design. The developer should create it manually after reading the updated example.
- Bumping package version — handled by semantic-release via Conventional Commits.

## Tasks / Subtasks

- [x] **Task 1 — Update `CLAUDE.md`** (AC: #1, #2)
  - [x] Update "Unified Tool Design" paragraph to say five operations, add
        `resolve-doc-paths` to the list.
  - [x] Insert new `## Doc-Path Cascade` section after `## Environment Variables`.
  - [x] Include overview, cascade-order list, per-key table, worked example TOML,
        per-key note, `resolve-doc-paths` invocation note, and this-project note
        (architecture at `docs/architecture.md`).

- [x] **Task 2 — Update `.bmadmcp/config.example.toml`** (AC: #3)
  - [x] Update file-level header comment to include all four skills.
  - [x] Append `[docs]` section with header comment, all four keys (commented out),
        inline worked example, and per-key reminder.

- [x] **Task 3 — Update `README.md`** (AC: #4)
  - [x] Add "Doc-path cascade (`[docs]` table)" sub-section inside the existing
        "Project-local config" section.
  - [x] Add minimal TOML example, note about all three skills, and link to CLAUDE.md.
  - [x] Remove or correct the outdated note that `[docs]` does not apply to
        `clickup-dev-implement` and `clickup-code-review`.

- [x] **Task 4 — Verify** (AC: #5–#9)
  - [x] `npm run build` — zero TypeScript errors.
  - [x] `npm run lint` — no new ESLint warnings.
  - [x] `git diff --stat` shows exactly the three target files.
  - [x] `git diff --stat -- src/` is empty.
  - [x] `git diff --stat -- tests/` is empty.

- [x] **Task 5 — Commit** (AC: #10)
  - [x] Stage the three modified files.
  - [x] Commit with header and body per AC #10.

## Dev Notes

### What the cascade is (summary for implementation)

`resolveDocPaths(projectRoot)` in `src/utils/doc-path-resolver.ts` resolves per-key:

1. Reads `.bmadmcp/config.toml` at `projectRoot`. If `[docs].prd_path` is set, that
   wins for `prd`. Same for `architecture_path`, `epics_path`.
2. Falls back to the BMAD config chain (`_bmad/config.toml` → user/custom overrides)
   and reads `[bmm].planning_artifacts` as the base directory.
3. Falls back to `planning-artifacts/` as the default directory.

Returns `{ prd: { path, layer }, architecture: { path, layer }, epics: { path, layer } }`.
Layer strings are `"bmadmcp-config"`, `"bmad-config"`, or `"default"`.

### Why each file is changing

**`CLAUDE.md`** — CLAUDE.md is the contributor's orientation guide. Two things are wrong today:
- "Unified Tool Design" lists four operations but the server now has five (story 6.4 added
  `resolve-doc-paths`).
- There is no documentation of the cascade, so a contributor hitting the server's resolver
  logic has no narrative context.

**`.bmadmcp/config.example.toml`** — The example file is the schema reference for
users adding a project-local config. The `[docs]` table exists in the TS implementation
but is invisible to users until it appears in the example. Story 6.7's out-of-scope note
("CLAUDE.md updates land in story 6.8") carried an implicit expectation that the example
file would also be updated.

**`README.md`** — The "Project-local config" section currently teaches only the ClickUp
pinning use-case and contains an outdated note saying `clickup-dev-implement` and
`clickup-code-review` don't use `.bmadmcp/config.toml`. That was true before EPIC-6 and
is now false. The `[docs]` table is as user-facing as the ClickUp pinning keys.

### This project's non-standard layout

This repo (`bmad-mcp-server`) does not follow the `planning-artifacts/architecture.md`
convention: its architecture document lives at `docs/architecture.md` (confirmed by story
6.7 debug log). That means running `clickup-create-story` against this project without a
`.bmadmcp/config.toml [docs]` override would trigger the "architecture missing" prereq
failure — even though the file exists.

**Dev setup step (not committed):** After landing this story, create
`.bmadmcp/config.toml` at the project root:
```toml
[docs]
architecture_path = "docs/architecture.md"
```
This is gitignored and must be set up manually by each developer. The updated
`config.example.toml` makes this self-evident.

### Pattern references (from stories 6.5/6.6/6.7)

- Stories 6.5, 6.6, 6.7 each updated their respective `workflow.md` to mention the
  cascade. Those files are already correct — this story does NOT re-open them.
- The cascade was implemented in story 6.3 (`doc-path-resolver.ts`) and exposed as
  an MCP operation in story 6.4 (`resolve-doc-paths` op in `bmad-unified.ts` +
  engine + server.ts Zod enum fixed in story 6.7).

### Project Structure Notes

- `CLAUDE.md` — project root (tracked). Dev-facing contributor guide.
- `README.md` — project root (tracked). End-user-facing documentation.
- `.bmadmcp/config.example.toml` — tracked schema reference; `.bmadmcp/config.toml`
  is gitignored (per `.gitignore` patterns).
- No TypeScript files touched. No test changes.

### References

- [EPIC-6 §Outcomes](../epics/EPIC-6-configurable-doc-path-resolution.md) — "`.bmadmcp/config.example.toml` documents the new `[docs]` table" and "`CLAUDE.md` documents the cascade"
- [Story 6.7 §Out of Scope](./6-7-migrate-clickup-code-review.md) — "Documentation updates to `CLAUDE.md`, `.bmadmcp/config.example.toml`, README.md → story 6.8"
- [Story 6.7 AC #13](./6-7-migrate-clickup-code-review.md) — "`git diff --stat -- planning-artifacts/` MUST be empty ... CLAUDE.md updates land in story 6.8"
- [Story 6.7 §Debug Log](./6-7-migrate-clickup-code-review.md) — confirms `docs/architecture.md` as this project's architecture path
- [`src/utils/doc-path-resolver.ts`](../../src/utils/doc-path-resolver.ts) — resolver implementation
- [`src/tools/operations/resolve-doc-paths.ts`](../../src/tools/operations/resolve-doc-paths.ts) — MCP operation handler
- [`.bmadmcp/config.example.toml`](../../.bmadmcp/config.example.toml) — current schema (missing `[docs]`)
- [`CLAUDE.md`](../../CLAUDE.md) — current contributor guide (Unified Tool Design and Env Vars sections)
- [`README.md`](../../README.md) — "Project-local config" section (~line 650)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (claude-sonnet-4-6) via Claude Code CLI executing `bmad-create-story` workflow.

### Debug Log References

- **EPIC-6 exit criteria:** All three skills migrated (6.5, 6.6, 6.7 done). Only docs remain.
- **Story 6.7 out-of-scope confirmation:** "CLAUDE.md updates land in story 6.8" — explicit handoff.
- **Architecture path confirmed:** `docs/architecture.md` (not `planning-artifacts/architecture.md`) from story 6.7 debug log — this project needs a `.bmadmcp/config.toml` override post-story.
- **config.example.toml current state:** Has `[clickup_create_epic]` and `[clickup_create_story]` sections. Missing `[docs]` section entirely.
- **CLAUDE.md current state:** "Unified Tool Design" says four operations (missing `resolve-doc-paths`). No cascade section exists.
- **README.md current state:** "Project-local config" section (~line 650) covers only ClickUp pinning. Contains outdated note that dev-implement and code-review don't use the config — now false.

### Completion Notes List

- ✅ Updated CLAUDE.md "Unified Tool Design" to list five operations (`resolve-doc-paths` added).
- ✅ Added `## Doc-Path Cascade` section to CLAUDE.md with overview, cascade-order list, per-key table, worked example, per-key note, invocation note, and this-project override note.
- ✅ Updated `.bmadmcp/config.example.toml` header to mention all four skills; appended `[docs]` section with all four keys, inline example, and per-key reminder.
- ✅ Updated README.md "Project-local config" to mention all four skills, added `Doc-path cascade` sub-section with minimal TOML example and CLAUDE.md link, removed outdated note about dev-implement/code-review.
- ✅ `npm run build` passed with zero TypeScript errors.
- ✅ `npm run lint` passed with no new warnings (only pre-existing console warnings in tests/support/litellm-helper.mjs).
- ✅ `git diff --stat` shows exactly three files (CLAUDE.md, README.md, .bmadmcp/config.example.toml); `src/` and `tests/` diffs are empty.

### File List

**Modified**

- `CLAUDE.md` — add `resolve-doc-paths` to Unified Tool Design ops count; add `## Doc-Path Cascade` section after Env Vars
- `README.md` — extend "Project-local config" section with `[docs]` cascade sub-section; remove outdated note about dev-implement/code-review
- `.bmadmcp/config.example.toml` — update header comment; append `[docs]` section with all four keys

**New**

- (none)

**Deleted**

- (none)

## Change Log

| Date       | Change                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| 2026-04-30 | Story drafted from EPIC-6 bullet 8 ("Update CLAUDE.md, .bmadmcp/config.example.toml, and per-skill workflow.md files to document the cascade") and story 6.7 out-of-scope handoff. Status → ready-for-dev. |
