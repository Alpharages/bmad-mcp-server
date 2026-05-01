# Story 9.5: Expand Configuration Reference

Status: review

Epic: [EPIC-9: README freshness pass](../epics/EPIC-9-readme-freshness.md)

> This story covers three punch list items that all live in or near the README's reference
> tables: (B partial) add the missing `resolve-doc-paths` operation to the unified-tool
> operations table; (E) replace the stale Project-local config code block and add the
> `[clickup]` shared section, `[clickup_create_story].allow_no_epic`,
> `[clickup_create_bug]` section, and auto-save behavior; (G) add `BMAD_REQUIRE_CLICKUP`
> to the Configuration reference env-var table. All changes are README-only and land in
> a single commit.

## Story

As a **new user reading the README**,
I want the operations table, project-local config section, and configuration reference
table to list every supported key and operation,
so that I can configure the server correctly without having to read the source code or
`.bmadmcp/config.example.toml` directly.

## Acceptance Criteria

### Punch list B (partial) — `resolve-doc-paths` in operations table

1. **Operations count updated.** The sentence at README line 374 MUST change from:

   > A single MCP tool with **four** operations replaces what would otherwise be dozens of per-agent tools:

   To:

   > A single MCP tool with **five** operations replaces what would otherwise be dozens of per-agent tools:

2. **`resolve-doc-paths` row added.** The operations table MUST include a new row for
   `resolve-doc-paths`:

   | Operation           | Purpose                                                            |
   | ------------------- | ------------------------------------------------------------------ |
   | `list`              | Enumerate available agents / workflows                             |
   | `read`              | Inspect an agent or workflow                                       |
   | `execute`           | Run an agent or workflow with context                              |
   | `search`            | Search BMAD content                                                |
   | `resolve-doc-paths` | Resolve PRD / architecture / epics paths via the three-layer cascade |

3. **Usage example added.** A `resolve-doc-paths` example MUST be added to the TypeScript
   code block immediately following the table:

   ```typescript
   { operation: "resolve-doc-paths" }
   ```

   The full block after the change:

   ```typescript
   { operation: "execute", agent: "analyst", message: "Analyze the SaaS market for X" }
   { operation: "execute", workflow: "prd", message: "Create a PRD for a task app" }
   { operation: "list", query: "agents" }
   { operation: "resolve-doc-paths" }
   ```

### Punch list E — Project-local config missing keys

4. **Intro paragraph updated.** The opening paragraph of the "Project-local config" section
   MUST be updated to mention all four skills (currently only mentions `clickup-create-epic`
   and `clickup-create-story`). Change from:

   > `clickup-create-epic` and `clickup-create-story` discover the active space, the
   > Backlog list, and (for the story skill) the sprint folder by calling ClickUp on
   > every invocation — typically `getCurrentSpace` → `pickSpace` → `searchSpaces`,
   > then a tree scan. To pin those IDs and skip the round-trips, drop a project-local
   > `.bmadmcp/config.toml` at the project root:

   To:

   > All four `clickup-create-*` skills discover the active space and Backlog list by
   > calling ClickUp on every invocation — typically `getCurrentSpace` → `pickSpace` →
   > `searchSpaces`, then a tree scan. To pin those IDs and skip the round-trips, drop a
   > project-local `.bmadmcp/config.toml` at the project root. Skills **auto-save**
   > discovered IDs back to `config.toml` after the first successful picker run, so
   > subsequent invocations skip discovery automatically:

5. **Config code block replaced.** The current code block (showing per-skill `pinned_space_id`
   under `[clickup_create_epic]` and `[clickup_create_story]` separately) MUST be replaced
   with the accurate structure reflecting the shared `[clickup]` section and all current keys:

   ```toml
   # Shared ClickUp defaults — inherited by all clickup-create-* skills
   [clickup]
   pinned_space_id        = "..."   # auto-saved after first picker run
   pinned_space_name      = "..."   # display only; falls back to "(pinned)" if unset
   pinned_backlog_list_id = "..."   # auto-saved after first picker run

   # Per-skill overrides (take precedence over [clickup])
   [clickup_create_story]
   pinned_sprint_folder_id = "..."  # bypass sprint-folder disambiguation when >1 sprint folder exists
   allow_no_epic           = true   # set false to always require an epic parent

   [clickup_create_bug]
   target_list_id  = "..."  # pin target list; skips list picker
   default_priority = ""    # 1=urgent · 2=high · 3=normal · 4=low
   default_tags     = []    # extra tags added beyond automatic "bug" tag
   pinned_epic_id   = ""    # pin epic parent; skips epic picker
   pinned_epic_name = ""    # display name for the pinned epic
   ```

6. **Explanatory paragraph updated.** The paragraph immediately after the code block
   (currently "When **both** `pinned_space_id` and `pinned_backlog_list_id` are set…")
   MUST be updated to reflect the shared `[clickup]` section:

   Change from:

   > When **both** `pinned_space_id` and `pinned_backlog_list_id` are set, the
   > picker steps skip every ClickUp discovery call and jump straight to the local
   > content steps. Pinning only one yields a partial short-circuit (see the step
   > files for exact behaviour). All keys are optional.

   To:

   > When **both** `pinned_space_id` and `pinned_backlog_list_id` are set in
   > `[clickup]`, the picker steps skip every ClickUp discovery call and jump straight
   > to the local content steps. Pinning only one yields a partial short-circuit (see
   > the step files for exact behaviour). Per-skill sections override individual
   > `[clickup]` keys — useful when different skills target different spaces. All keys
   > are optional.

### Punch list G — `BMAD_REQUIRE_CLICKUP` in Configuration reference

7. **`BMAD_REQUIRE_CLICKUP` added to env-var table.** The Configuration reference table
   (near README line 852) MUST include a `BMAD_REQUIRE_CLICKUP` row:

   | Variable               | Default       | Purpose                                                |
   | ---------------------- | ------------- | ------------------------------------------------------ |
   | `BMAD_ROOT`            | auto          | Override BMAD installation root                        |
   | `BMAD_DEBUG`           | `false`       | Verbose logging via `src/utils/logger.ts`              |
   | `BMAD_GIT_AUTO_UPDATE` | `true`        | Auto-refresh Git-cached BMAD content (CI sets `false`) |
   | `BMAD_REQUIRE_CLICKUP` | unset         | `1`/`true` → hard-fail at boot if ClickUp vars missing |
   | `BMAD_API_KEY`         | unset         | API key for HTTP transport                             |
   | `PORT`                 | `3000`        | HTTP port                                              |
   | `NODE_ENV`             | `development` | `test` / `development` / `production`                  |

   The footnote below the table ("`ClickUp env vars are listed in the ClickUp section…`")
   MUST be preserved unchanged.

### Story file and sprint-status.yaml

8. **Story file saved** as
   `planning-artifacts/stories/9-5-expand-configuration-reference.md`
   with Status set to `review` after implementation.

9. **sprint-status.yaml updated:**
   - `9-5-expand-configuration-reference`: `backlog` → `review` after implementation.
   - `last_updated` field updated.

### Change isolation

10. Only `README.md`, `planning-artifacts/stories/9-5-expand-configuration-reference.md`,
    and `planning-artifacts/sprint-status.yaml` are modified.
    - `git diff --stat -- 'src/**/*.ts'` MUST be empty.
    - `git diff --stat -- tests/` MUST be empty.

### Commit

11. Commit message MUST follow Conventional Commits:

    ```
    docs(readme): expand configuration reference with new config keys and resolve-doc-paths (story 9-5)
    ```

    Body MUST reference story 9.5, name the three modified files, and confirm source and
    test files are unmodified.

## Out of Scope

- Rewording walkthrough steps 4, 8, 9, 10 for hardcoded paths (punch list F — story 9-6).
- Adding a "Common patterns" / FAQ section (story 9-7).
- Verifying internal anchors and external links (stories 9-8 and 9-9).
- Any changes to `src/`, `tests/`, or `docs/` files.

## Tasks / Subtasks

- [x] **Task 1 — Update operations count and table (AC: #1, #2)**
  - [x] Change "four operations" to "five operations" (verify exact line with `grep -n`).
  - [x] Append `resolve-doc-paths` row to the operations table.

- [x] **Task 2 — Add `resolve-doc-paths` usage example (AC: #3)**
  - [x] Add `{ operation: "resolve-doc-paths" }` line to the TypeScript code block.

- [x] **Task 3 — Update Project-local config intro paragraph (AC: #4)**
  - [x] Replace the opening paragraph per the target text in AC #4.

- [x] **Task 4 — Replace config code block (AC: #5)**
  - [x] Replace the entire TOML code block with the accurate structure per AC #5.
  - [x] Preserve the `[docs]` table section below it — do not touch it.

- [x] **Task 5 — Update explanatory paragraph after code block (AC: #6)**
  - [x] Replace the "When **both** `pinned_space_id`…" paragraph per AC #6.

- [x] **Task 6 — Add `BMAD_REQUIRE_CLICKUP` to Configuration reference (AC: #7)**
  - [x] Insert `BMAD_REQUIRE_CLICKUP` row between `BMAD_GIT_AUTO_UPDATE` and
        `BMAD_API_KEY` in the env-var table.

- [x] **Task 7 — Update sprint-status.yaml (AC: #9)**
  - [x] Set `9-5-expand-configuration-reference`: `ready-for-dev` → `review`.
  - [x] Update `last_updated` field.

- [x] **Task 8 — Regression verification (AC: #10)**
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- tests/` → empty.
  - [x] `npm run build && npm run lint` → clean.

- [x] **Task 9 — Commit (AC: #11)**
  - [x] Stage `README.md`, story file, `sprint-status.yaml`.
  - [x] Commit with header + body per AC #11.

## Dev Notes

### Dependency on story 9-4

Story 9-4 (`ready-for-dev`) adds a config-key note for `allow_no_epic` inline within the
`clickup-create-story` Custom Skills subsection. Story 9-5 adds it to the Project-local
config code block as part of the full `[clickup_create_story]` section. These are
non-overlapping edits — 9-4 edits around README line 610 (Custom Skills) while 9-5 edits
around line 681 (Project-local config) and line 852 (Configuration reference). They can
land in either order without conflict.

If 9-4 lands first, the `allow_no_epic` config key note will already appear inline in the
Custom Skills section; story 9-5 adds it to the reference config block for completeness.
If 9-5 lands first, the reference block is complete and 9-4 adds the inline note later.

### Current README state (post-story-9-3)

**Operations table (lines 374–387):**

```
A single MCP tool with four operations replaces what would otherwise be dozens of per-agent tools:

| Operation | Purpose                                |
| --------- | -------------------------------------- |
| `list`    | Enumerate available agents / workflows |
| `read`    | Inspect an agent or workflow           |
| `execute` | Run an agent or workflow with context  |
| `search`  | Search BMAD content                    |

```typescript
{ operation: "execute", agent: "analyst", message: "Analyze the SaaS market for X" }
{ operation: "execute", workflow: "prd", message: "Create a PRD for a task app" }
{ operation: "list", query: "agents" }
```
```

**Project-local config code block (lines 681–692):**

```
```toml
[clickup_create_epic]
pinned_space_id        = "..."
pinned_space_name      = "..."   # display only
pinned_backlog_list_id = "..."

[clickup_create_story]
pinned_space_id         = "..."
pinned_space_name       = "..."
pinned_backlog_list_id  = "..."
pinned_sprint_folder_id = "..."
```
```

**Configuration reference table (lines 852–861):**

```
| Variable               | Default       | Purpose                                                |
| ---------------------- | ------------- | ------------------------------------------------------ |
| `BMAD_ROOT`            | auto          | Override BMAD installation root                        |
| `BMAD_DEBUG`           | `false`       | Verbose logging via `src/utils/logger.ts`              |
| `BMAD_GIT_AUTO_UPDATE` | `true`        | Auto-refresh Git-cached BMAD content (CI sets `false`) |
| `BMAD_API_KEY`         | unset         | API key for HTTP transport                             |
| `PORT`                 | `3000`        | HTTP port                                              |
| `NODE_ENV`             | `development` | `test` / `development` / `production`                  |
```

### Source of truth for each change

- **`resolve-doc-paths` operation:** `src/tools/bmad-unified.ts` — five operations are
  registered there. The `resolve-doc-paths` operation is also referenced in `CLAUDE.md`
  (Unified Tool Design section) and `docs/architecture.md`.
- **`[clickup]` shared section:** `.bmadmcp/config.example.toml` lines 22–25 — authoritative
  schema. The shared section was introduced in EPIC-6/8 work; the README example was never
  updated to match.
- **`allow_no_epic`:** `.bmadmcp/config.example.toml` line 40; also
  `src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md`.
- **`[clickup_create_bug]` keys:** `.bmadmcp/config.example.toml` lines 46–51; also
  `src/custom-skills/clickup-create-bug/` step files.
- **Auto-save behavior:** `.bmadmcp/config.example.toml` lines 18–19 comment ("Skills
  auto-save these values after the first successful picker run").
- **`BMAD_REQUIRE_CLICKUP`:** `CLAUDE.md` env-var table; also `src/index.ts` boot check.
  Currently documented at README line 502 (ClickUp section) but missing from the
  Configuration reference table.

### Key constraints

- **Do not** touch the `[docs]` table subsection (lines 706–742) — it is complete and
  correct as of story 9-2.
- **Do not** expand the Custom Skills subsections — that is story 9-3's domain.
- **Do not** modify the ClickUp env-var table (around line 498–504) — `BMAD_REQUIRE_CLICKUP`
  already appears there; story 9-5 only adds a cross-reference row to the *Configuration
  reference* table at line 852.
- Line numbers shift after each story lands. Always verify exact lines with `grep -n`
  before editing.
- The `---` separator at the end of the Project-local config section (post `[docs]` table)
  is load-bearing for section breaks; preserve it.
- `npm run build && npm run lint` MUST pass before commit — even README-only PRs pass
  through CI lint.

### Previous story learnings (from 9-3 and 9-4)

- Line numbers shift after each story lands. Verify exact line numbers with `grep -n`
  before editing; do not rely on numbers recorded here.
- Use `npm run build && npm run lint` (not just `lint`) to catch both type errors and style
  violations before committing.
- The `---` separator between sections is load-bearing for markdown rendering. Preserve it
  when inserting new lines before or after it.
- Commit body must name every modified file explicitly; reviewers check this against
  `git diff --stat`.

### Files changed by this story

**Modified:**
- `README.md` — operations table, Project-local config code block, Configuration reference
  table
- `planning-artifacts/sprint-status.yaml` — story 9-5 status
- `planning-artifacts/stories/9-5-expand-configuration-reference.md` — this file

**Unchanged:**
- All TypeScript source and test files
- `CLAUDE.md`
- `docs/` directory files
- `.bmadmcp/config.example.toml` (read-only source of truth for this story)

### References

- Punch list items B, E, G [Source: planning-artifacts/epics/EPIC-9-punch-list.md]
- Config schema [Source: .bmadmcp/config.example.toml]
- Operations list [Source: src/tools/bmad-unified.ts]
- `BMAD_REQUIRE_CLICKUP` boot check [Source: src/index.ts]
- EPIC-9 goals [Source: planning-artifacts/epics/EPIC-9-readme-freshness.md]
- Previous story learnings [Source: planning-artifacts/stories/9-4-document-no-epic-option.md]
