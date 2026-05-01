# Story 9.9: Cross-check docs/ directory

Status: review

Epic: [EPIC-9: README freshness pass](../epics/EPIC-9-readme-freshness.md)

> This story audits `docs/architecture.md`, `docs/clickup-quickstart.md`,
> `docs/development-guide.md`, `docs/api-contracts.md`, and `docs/index.md` for
> the same drift that Stories 9-2 through 9-8 corrected in `README.md`. Findings
> that are straightforward to fix are fixed here; items requiring wider discussion
> are noted as out-of-scope.

## Story

As a **developer or contributor looking for reference documentation**,
I want the `docs/` directory to reflect the current project state (correct repo
links, Node.js version, operations list, and no dead file references),
so that I can trust the `docs/` content without cross-checking it against
`README.md` or the source code.

## Acceptance Criteria

### AC 1 — docs/index.md: fix stale repo links

All references to `bmad-code-org/BMAD-METHOD` and `mkellerman/bmad-mcp-server`
are updated to `Alpharages/BMAD-METHOD` and `Alpharages/bmad-mcp-server`
respectively, in every URL and link text.

### AC 2 — docs/index.md: add clickup-quickstart.md to Essential Documentation

A new entry for `./clickup-quickstart.md` is added to the **Essential
Documentation** section of `docs/index.md`, positioned between the README entry
and the Architecture entry.

### AC 3 — docs/index.md: remove ghost file references

All links to files that do not exist in `docs/` are removed:
- `deployment-guide.md`
- `testing-guide.md`
- `project-overview.md`
- `source-tree-analysis.md`

These appear in the "Documentation Structure" code block, the "What's What"
table, and the "Additional Resources / Documentation" lists. After removal those
sections reference only files that exist: `architecture.md`,
`api-contracts.md`, `development-guide.md`, `clickup-quickstart.md`.

### AC 4 — docs/index.md: remove duplicate "Additional Resources" section

`docs/index.md` contains two `## Additional Resources` headings. Remove the
first (lower-content) one and keep the second, which includes the repo link.
After the fix there is exactly one `## Additional Resources` heading.

### AC 5 — docs/index.md: fix broken README navigation link

The "For Users" quick-nav entry links to `../README.md#-installation` — an
anchor that does not exist in the current README. Update the link to
`../README.md#quick-start` which is the correct section anchor.

### AC 6 — docs/development-guide.md: fix Node.js prerequisite

The "Prerequisites" section says "Node.js 18+". Update to "Node.js 22.14.0
(pinned in `.nvmrc`)". Update both the prose sentence and the
Quick Start "Prerequisites" list.

### AC 7 — docs/development-guide.md: fix repo links

All occurrences of `bmad-code-org/BMAD-METHOD` and `mkellerman/bmad-mcp-server`
(including the `git clone` example URL) are updated to `Alpharages/BMAD-METHOD`
and `Alpharages/bmad-mcp-server` respectively.

### AC 8 — docs/development-guide.md: fix Environment Variables table

The table currently lists only three variables (`BMAD_ROOT`, `DEBUG`,
`NODE_ENV`), where `DEBUG` is also wrong (the actual var is `BMAD_DEBUG`).

Replace the table with one that matches CLAUDE.md §Environment Variables:

| Variable | Purpose | Default |
|---|---|---|
| `BMAD_ROOT` | Override BMAD installation root | Auto-discovered |
| `BMAD_DEBUG` | Enable verbose debug logging (`1` or `true`) | `false` |
| `NODE_ENV` | Environment (`test`, `development`, `production`) | `development` |
| `BMAD_GIT_AUTO_UPDATE` | Auto-update Git cache | `true` |
| `BMAD_REQUIRE_CLICKUP` | Hard-fail at boot if ClickUp vars missing | unset |
| `CLICKUP_API_KEY` | Per-user ClickUp personal token | unset |
| `CLICKUP_TEAM_ID` | Workspace ID (7–10 digits) | unset |
| `CLICKUP_MCP_MODE` | Tool surface: `read-minimal`, `read`, `write` | `write` |
| `PORT` | HTTP port for `src/http-server.ts` | `3000` |
| `BMAD_API_KEY` | API key for HTTP-transport authentication | unset |

The inline usage example below the table must also change `DEBUG=true` →
`BMAD_DEBUG=1`.

### AC 9 — docs/development-guide.md: remove non-existent script references

The following scripts appear in tables or prose in `development-guide.md` but
do not exist in `package.json`. Remove every occurrence:

| Non-existent script | Section |
|---|---|
| `npm run bmad` | BMAD Integration table |
| `npm run lite:list` | BMAD Integration table |
| `npm run doctor:show` | BMAD Integration / Debugging sections |
| `npm run guard:src-js` | Code Quality / Available Commands tables |
| `npm run test:report` | Maintenance table |

After removal those tables/sections reference only scripts that appear in
`package.json`.

### AC 10 — docs/development-guide.md: remove dead doc links

The "Additional Resources" section in `development-guide.md` references
`source-tree-analysis.md` which does not exist in `docs/`. Remove that entry.
Any other link to a non-existent file in `docs/` must also be removed.

### AC 11 — docs/architecture.md: add resolve-doc-paths to all operations lists

`docs/architecture.md` describes 4 operations in three places; `resolve-doc-paths`
is missing from all of them:

1. **Engine Layer diagram** (ASCII box) — currently reads
   `Operations: list, read, execute`. Update to
   `Operations: list, read, execute, search, resolve-doc-paths`.
2. **Component responsibilities table** — "Unified tool with 4 operations
   (list, read, execute, search)". Update to "5 operations
   (list, read, execute, search, resolve-doc-paths)".
3. **Unified Tool section** operations bullet list — add
   `- resolve-doc-paths — Resolve PRD/architecture/epics doc paths via the
   doc-path cascade`.

### AC 12 — docs/architecture.md: fix stale repo link

The single `bmad-code-org/BMAD-METHOD` URL near the end of the file is updated
to `Alpharages/BMAD-METHOD`.

### AC 13 — docs/api-contracts.md: add resolve-doc-paths to schema and operation docs

1. The **operations enum** in the tool schema JSON block reads
   `["list", "read", "execute"]`. Update to
   `["list", "read", "execute", "search", "resolve-doc-paths"]`.
2. The **operations description** in that same schema reads
   `"list: Get available agents/workflows/modules\n- read: Inspect agent or
   workflow details\n- execute: Run agent or workflow"`. Add
   `\n- search: Find agents/workflows by query\n- resolve-doc-paths: Resolve
   PRD/architecture/epics paths via doc-path cascade`.
3. Add a brief **Operation 5: resolve-doc-paths** subsection (after the
   existing search section if present, otherwise after execute), mirroring the
   structure of the other operation subsections.

### AC 14 — docs/api-contracts.md: fix stale agent list in tool description

The tool schema's inline description string lists `debug (Diana): Debug
Specialist` and `debug-inspect` workflow. These agents/workflows do not appear
in the live `npm run cli:list-agents` / `npm run cli:list-workflows` output.
Remove or replace them with agents actually present in the live output:

Live agents: `analyst`, `tech-writer`, `architect`, `dev`, `pm`, `ux-designer`.

### AC 15 — docs/api-contracts.md: fix stale repo link

The single `bmad-code-org/BMAD-METHOD` URL is updated to
`Alpharages/BMAD-METHOD`.

### AC 16 — docs/clickup-quickstart.md: annotate .bmad-pilot-marker section as historical

The `§ Prerequisites → Pilot repo cloned with .bmad-pilot-marker` section
still documents `.bmad-pilot-marker` as a required sentinel file. A grep of
`src/` and `_bmad/` returns zero matches — the cwd check was removed when the
skills were refactored. README story 9-6 reached the same conclusion for the
README's step 8.

Add a **deprecation callout** at the top of the `.bmad-pilot-marker` subsection:

```markdown
> **Note (2026-05-01):** The `.bmad-pilot-marker` sentinel check was removed
> from the skill source files during post-EPIC-5 refinement. This section is
> retained as historical context; you no longer need to create this file for
> the skills to run. See README §Step 8 (story 9-6) for the corresponding
> README update.
```

Do **not** delete the section — it remains valuable as a record of why the
marker existed and why it was removed. Optionally, if the content is misleading
enough to cause operator errors, the section may be collapsed to just the note
above plus a one-sentence summary.

Also update the `§ Common pitfalls → Wrong cwd at skill invocation` entry
to remove the instruction to "Place `.bmad-pilot-marker` at the pilot repo
root" since the check no longer exists.

### AC 17 — Sprint status and story file

- **Story file** saved as
  `planning-artifacts/stories/9-9-cross-check-docs-directory.md` with Status
  set to `review` after implementation.
- **sprint-status.yaml** updated:
  - `9-9-cross-check-docs-directory`: `backlog` → `ready-for-dev` (on story
    creation), then `review` after implementation.
  - `last_updated` field and annotation updated.

### AC 18 — Change isolation

Only the following files are modified:

- `docs/index.md`
- `docs/development-guide.md`
- `docs/architecture.md`
- `docs/api-contracts.md`
- `docs/clickup-quickstart.md`
- `planning-artifacts/sprint-status.yaml`
- `planning-artifacts/stories/9-9-cross-check-docs-directory.md`

`git diff --stat -- 'src/**/*.ts'` and `git diff --stat -- tests/` MUST be
empty. `README.md` and `CLAUDE.md` are not modified.

### AC 19 — Commit

Commit message MUST follow Conventional Commits:

```
docs(docs): cross-check docs/ directory for drift (story 9-9)
```

Body MUST name all modified `docs/` files, summarise the category of fix for
each (e.g. "repo links, ghost file refs, operations list, Node.js version"),
and confirm source and test files are unmodified.

---

## Out of Scope

- Rewriting any section beyond the targeted fixes above.
- Adding new documentation sections (such as a cascade walkthrough) to
  `docs/` — the README is the primary onboarding surface; `docs/` is reference
  only.
- Fixing stale "Version: 4.0.0 / Last Updated: November 6, 2025" headers in
  `docs/architecture.md`, `docs/api-contracts.md`, and
  `docs/development-guide.md`. These headers are cosmetic and do not mislead
  users about functionality. Updating them is the doc owner's responsibility on
  each future release and is deferred to a maintenance pass.
- Removing or rewriting the `§ Multi-repo Claude Code sessions` content in
  `docs/clickup-quickstart.md` — this is still accurate and useful.
- Auditing `docs/clickup-quickstart.md` for other `post-5-7` contract changes —
  the changelog entries at the bottom of that file confirm it has been kept
  current through 2026-05-01.
- External link re-verification for `docs/` URLs (covered by story 9-8 scope
  for README; `docs/` external links are separately out of scope here).
- Any changes to `src/`, `tests/`, or `CLAUDE.md`.

---

## Tasks / Subtasks

- [x] **Task 1 — docs/index.md (AC 1–5)**
  - [x] Replace `bmad-code-org` → `Alpharages` and `mkellerman` → `Alpharages`
        in all URLs and link text.
  - [x] Add `clickup-quickstart.md` entry to Essential Documentation.
  - [x] Remove ghost file references from all three locations (Documentation
        Structure code block, What's What table, Additional Resources lists).
  - [x] Remove the duplicate `## Additional Resources` heading (the first one).
  - [x] Fix `../README.md#-installation` → `../README.md#quick-start`.

- [x] **Task 2 — docs/development-guide.md (AC 6–10)**
  - [x] Update Node.js prerequisite to "22.14.0 (pinned in `.nvmrc`)".
  - [x] Fix `git clone` URL and all other `mkellerman`/`bmad-code-org` links.
  - [x] Replace env vars table with the 10-row table from CLAUDE.md; fix inline
        `DEBUG=true` → `BMAD_DEBUG=1`.
  - [x] Remove five non-existent scripts from all tables and prose sections.
  - [x] Remove `source-tree-analysis.md` link from Additional Resources.

- [x] **Task 3 — docs/architecture.md (AC 11–12)**
  - [x] Add `resolve-doc-paths` to the engine layer ASCII diagram.
  - [x] Update component responsibilities table operation count (4 → 5) and list.
  - [x] Add `resolve-doc-paths` bullet to the Unified Tool section.
  - [x] Fix `bmad-code-org` → `Alpharages` in the external link.

- [x] **Task 4 — docs/api-contracts.md (AC 13–15)**
  - [x] Extend operations enum: add `"search"` and `"resolve-doc-paths"`.
  - [x] Extend operations description string with the two new entries.
  - [x] Add Operation 5: resolve-doc-paths subsection.
  - [x] Remove `debug (Diana)` and `debug-inspect` from the inline tool
        description; replace with current live agent list.
  - [x] Fix `bmad-code-org` → `Alpharages`.

- [x] **Task 5 — docs/clickup-quickstart.md (AC 16)**
  - [x] Add deprecation callout at the top of the
        `.bmad-pilot-marker` prerequisites subsection.
  - [x] Remove "Place `.bmad-pilot-marker`…" from the
        "Wrong cwd at skill invocation" pitfall entry.

- [x] **Task 6 — Update sprint-status.yaml (AC 17)**
  - [x] Set `9-9-cross-check-docs-directory` → `review` after implementation.
  - [x] Update `last_updated` field and annotation.

- [x] **Task 7 — Regression and commit (AC 18–19)**
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- tests/` → empty.
  - [x] `npm run build && npm run lint` → clean.
  - [x] Commit with required header and body per AC 19.

---

## Dev Notes

### Audit results per file

The following tables record every finding from the pre-story audit (2026-05-01).
Each row is tagged to its AC.

#### docs/index.md

| # | Location | Finding | AC |
|---|---|---|---|
| 1 | "Additional Resources" link | `bmad-code-org/BMAD-METHOD` → `Alpharages/BMAD-METHOD` | 1 |
| 2 | Issues link text and URL | `mkellerman/bmad-mcp-server` → `Alpharages/bmad-mcp-server` | 1 |
| 3 | Essential Documentation section | `clickup-quickstart.md` absent | 2 |
| 4 | Documentation Structure code block | Lists `deployment-guide.md` — file absent | 3 |
| 5 | Documentation Structure code block | Lists `testing-guide.md` — file absent | 3 |
| 6 | Documentation Structure code block | Lists `project-overview.md` — file absent | 3 |
| 7 | "What's What" table | Rows for `deployment-guide.md`, `testing-guide.md`, `project-overview.md` — all absent | 3 |
| 8 | Additional Resources (Documentation) | Link to `source-tree-analysis.md` — file absent | 3 |
| 9 | File-level structure | Two `## Additional Resources` headings (lines ~55 and ~98) | 4 |
| 10 | For Users quick-nav | `../README.md#-installation` → `../README.md#quick-start` | 5 |

#### docs/development-guide.md

| # | Location | Finding | AC |
|---|---|---|---|
| 1 | Prerequisites section | "Node.js 18+" should be "22.14.0 (pinned in `.nvmrc`)" | 6 |
| 2 | `git clone` URL | `mkellerman/bmad-mcp-server` → `Alpharages/bmad-mcp-server` | 7 |
| 3 | Multiple external link sections | `bmad-code-org/BMAD-METHOD` → `Alpharages/BMAD-METHOD` | 7 |
| 4 | Multiple external link sections | `mkellerman/bmad-mcp-server` → `Alpharages/bmad-mcp-server` | 7 |
| 5 | Environment Variables table | Only 3 vars; `DEBUG` should be `BMAD_DEBUG`; 7 vars missing | 8 |
| 6 | Environment Variables usage example | `DEBUG=true` → `BMAD_DEBUG=1` | 8 |
| 7 | BMAD Integration table | `npm run bmad`, `npm run lite:list`, `npm run doctor:show` — absent from `package.json` | 9 |
| 8 | Available Commands table | `npm run guard:src-js`, `npm run test:report` — absent from `package.json` | 9 |
| 9 | Debugging section | `npm run doctor:show -- --full` — script absent | 9 |
| 10 | Additional Resources | Link to `source-tree-analysis.md` — file absent | 10 |

#### docs/architecture.md

| # | Location | Finding | AC |
|---|---|---|---|
| 1 | Engine layer ASCII box | `Operations: list, read, execute` — missing `search`, `resolve-doc-paths` | 11 |
| 2 | Component responsibilities table | "4 operations (list, read, execute, search)" — missing `resolve-doc-paths`, count is wrong | 11 |
| 3 | Unified Tool section bullet list | No `resolve-doc-paths` bullet | 11 |
| 4 | External links (end of file) | `bmad-code-org/BMAD-METHOD` → `Alpharages/BMAD-METHOD` | 12 |

#### docs/api-contracts.md

| # | Location | Finding | AC |
|---|---|---|---|
| 1 | Tool schema `operation` enum | `["list", "read", "execute"]` — missing `search`, `resolve-doc-paths` | 13 |
| 2 | Tool schema description string | Only 3 operations listed; `search` and `resolve-doc-paths` absent | 13 |
| 3 | Operation subsections | No `resolve-doc-paths` operation subsection | 13 |
| 4 | Tool schema description string | `debug (Diana): Debug Specialist` and `debug-inspect` workflow — absent from live output | 14 |
| 5 | External links (end of file) | `bmad-code-org/BMAD-METHOD` → `Alpharages/BMAD-METHOD` | 15 |

#### docs/clickup-quickstart.md

| # | Location | Finding | AC |
|---|---|---|---|
| 1 | Prerequisites → `.bmad-pilot-marker` subsection | Documents sentinel file as required; zero matches in `src/` and `_bmad/` confirm the check was removed | 16 |
| 2 | Common pitfalls → Wrong cwd | "Place `.bmad-pilot-marker` at the pilot repo root" — instruction is stale | 16 |

### docs/clickup-quickstart.md — what NOT to change

The quickstart is otherwise well-maintained:
- `§ Invoke clickup-create-bug` added 2026-05-01 (story 7-x changelog entry) ✓
- `§ Invoke clickup-create-story` no-epic path documented (story 8-8 changelog entry) ✓
- `allow_no_epic` config key documented ✓
- `[clickup_create_bug]` config keys table ✓
- Soft-load warning wordings ✓
- Broadened review-status match set ✓
- PAT-prefix preflight ✓

### resolve-doc-paths operation summary (for AC 13 subsection)

```
Operation 5: resolve-doc-paths

Purpose: Resolve the paths to PRD, architecture, and epics documents through
the three-layer doc-path cascade.

Example:
{ "operation": "resolve-doc-paths" }

Response: Paths object with prd, architecture, and epics resolved paths plus
the resolution layer that applied (default | bmad-config | bmadmcp-config).

Use case: Called by clickup-create-story, clickup-dev-implement, and
clickup-code-review at skill startup to locate planning artifacts regardless
of where they live in the project.
```

### Live agent list for AC 14

From `npm run cli:list-agents` (2026-05-01):
```
analyst (Mary — Business Analyst)
tech-writer (Paige — Technical Writer)
architect (Winston — System Architect)
dev (Amelia — Senior Software Engineer)
pm (John — Product Manager)
ux-designer (Sally — UX Designer)
```

### Key constraints

- Use `grep -n` to confirm line numbers before editing — they will have shifted
  since this audit.
- `npm run build && npm run lint` MUST pass before commit.
- The "Version: 4.0.0" and "Last Updated: November 6, 2025" headers in
  `docs/architecture.md`, `docs/api-contracts.md`, and
  `docs/development-guide.md` are intentionally left as-is (out of scope).

### Previous story learnings (from 9-6 through 9-8)

- Line numbers shift after each story lands; always verify with `grep -n` before
  editing. Do not trust numbers from story files or audit logs.
- `npm run build && npm run lint` (not just `lint`) catches both type errors and
  style violations.
- Commit body must name every modified file explicitly; reviewers check against
  `git diff --stat`.
- The `---` section separators in Markdown are load-bearing for rendering;
  avoid accidentally removing them when deleting adjacent content.

### Files changed by this story

**Modified:**
- `docs/index.md`
- `docs/development-guide.md`
- `docs/architecture.md`
- `docs/api-contracts.md`
- `docs/clickup-quickstart.md`
- `planning-artifacts/sprint-status.yaml` — story 9-9 status
- `planning-artifacts/stories/9-9-cross-check-docs-directory.md` — this file

**Unchanged:**
- `README.md`
- `CLAUDE.md`
- All TypeScript source and test files
- `.bmadmcp/config.example.toml`
- `src/custom-skills/` directory

### References

- EPIC-9 §Stories line 31 (scope of 9-9) [Source: planning-artifacts/epics/EPIC-9-readme-freshness.md]
- EPIC-9 §Open questions — `docs/` pointer-vs-content question [Source: planning-artifacts/epics/EPIC-9-readme-freshness.md]
- CLAUDE.md §Environment Variables — authoritative env var table [Source: CLAUDE.md]
- README story 9-6 findings — `.bmad-pilot-marker` removed from source [Source: planning-artifacts/stories/9-6-rework-walkthrough-hardcoded-paths.md]
- Live agent count [Source: `npm run cli:list-agents` output, 2026-05-01]
- `package.json` scripts — authoritative list [Source: package.json §scripts]
