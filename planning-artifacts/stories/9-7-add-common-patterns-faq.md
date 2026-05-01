# Story 9.7: Add Common Patterns FAQ

Status: review

Epic: [EPIC-9: README freshness pass](../epics/EPIC-9-readme-freshness.md)

> This story adds the "Common patterns" / FAQ section called for in the EPIC-9
> Outcomes list. The five entries answer the questions new users ask most often
> and are not obvious from the existing walkthrough or reference sections. All
> work is README-only; no source or test files change.

## Story

As a **new user who has just installed bmad-mcp-server**,
I want a "Common patterns" section in the README that answers the five most
frequent how-to questions in one place,
so that I can find a quick answer without reading through the full walkthrough or
scanning multiple reference sections.

## Acceptance Criteria

### New `## Common patterns` section

1. A new `## Common patterns` section is inserted into `README.md` between the
   Custom Skills section and `## Self-hosting (HTTP)`.

2. The section is delimited by `---` separators: the existing `---` that
   currently separates Custom Skills from Self-hosting becomes the **opening**
   separator (unchanged); a **new** `---` is added immediately before `## Self-
   hosting (HTTP)` to close the section.

3. Resulting structure around the insertion point:

   ```
   (end of Custom Skills)

   ---

   ## Common patterns

   <five FAQ entries>

   ---

   ## Self-hosting (HTTP)
   ```

### Five FAQ entries

Each entry is a level-4 heading (`####`) followed by a one-to-two paragraph
answer. The entries MUST appear in the order below and contain at minimum the
information described.

4. **Entry 1 — Docs path override**

   Heading: `#### My docs aren't in \`planning-artifacts/\``

   Body MUST:
   - Instruct the user to set keys in the `[docs]` table of `.bmadmcp/config.toml`.
   - Include a minimal TOML code block showing at least `prd_path`,
     `architecture_path`, and `epics_path`.
   - State that each key is resolved independently (only set the ones that differ).
   - Link to `[Doc-path cascade](#doc-path-cascade-docs-table)`.

5. **Entry 2 — Bug filing**

   Heading: `#### I want to file a bug`

   Body MUST:
   - Name the trigger phrase (`create a bug [description]` and its aliases).
   - Identify the skill (`clickup-create-bug`) and briefly describe the
     structured output (repro / expected / actual / impact / suspected area).
   - Note that planning artifacts are optional (skill continues with a warning
     if any are missing).
   - Link to `[clickup-create-bug](#clickup-create-bug)`.

6. **Entry 3 — No-epic tasks**

   Heading: `#### This work doesn't fit under any epic`

   Body MUST:
   - Explain that `clickup-create-story` supports standalone tasks via the
     `[0] No epic — create as standalone task` picker entry.
   - State that `allow_no_epic = true` is the default.
   - Mention setting `allow_no_epic = false` under `[clickup_create_story]` to
     always require an epic parent.
   - Link to `[clickup-create-story](#clickup-create-story)`.

7. **Entry 4 — HTTP credential sharing**

   Heading: `#### I need to share credentials per-team via HTTP`

   Body MUST:
   - State that the HTTP transport passes ClickUp credentials as per-request
     headers (`X-ClickUp-Api-Key`, `X-ClickUp-Team-Id`).
   - Clarify that each user authenticates independently and no ClickUp
     credentials are stored server-side.
   - Link to `[Self-hosting](#self-hosting-http)`.

8. **Entry 5 — Pinned IDs**

   Heading: `#### How do I pin space/list IDs to skip pickers`

   Body MUST:
   - State that setting `pinned_space_id` and `pinned_backlog_list_id` in the
     `[clickup]` section bypasses picker discovery when both are set.
   - Note that skills auto-save discovered IDs after the first successful picker
     run, so manual pinning is usually unnecessary.
   - Link to `[Project-local config](#project-local-config-bmadmcpconfigtoml)`.

### Nav row updated

9. The nav row on line 10 of `README.md` (the `[Quick start] · [Walkthrough] · …`
   row) MUST be updated to add `· [Common patterns](#common-patterns)` between
   `[Custom Skills](#custom-skills)` and `[Self-hosting](#self-hosting-http)`.

   Before:
   ```
   [Quick start](#quick-start) · [Walkthrough](#your-first-session--a-beginner-walkthrough) · [ClickUp](#clickup-integration) · [Custom Skills](#custom-skills) · [Self-hosting](#self-hosting-http) · [Docs](#documentation)
   ```

   After:
   ```
   [Quick start](#quick-start) · [Walkthrough](#your-first-session--a-beginner-walkthrough) · [ClickUp](#clickup-integration) · [Custom Skills](#custom-skills) · [Common patterns](#common-patterns) · [Self-hosting](#self-hosting-http) · [Docs](#documentation)
   ```

### Story file and sprint-status.yaml

10. **Story file saved** as
    `planning-artifacts/stories/9-7-add-common-patterns-faq.md`
    with Status set to `review` after implementation.

11. **sprint-status.yaml updated:**
    - `9-7-add-common-patterns-faq`: `backlog` → `ready-for-dev` (on story
      creation), then `review` after implementation.
    - `last_updated` field and annotation updated.

### Change isolation

12. Only `README.md`, `planning-artifacts/stories/9-7-add-common-patterns-faq.md`,
    and `planning-artifacts/sprint-status.yaml` are modified.
    - `git diff --stat -- 'src/**/*.ts'` MUST be empty.
    - `git diff --stat -- tests/` MUST be empty.

### Commit

13. Commit message MUST follow Conventional Commits:

    ```
    docs(readme): add common patterns FAQ section (story 9-7)
    ```

    Body MUST reference story 9.7, name all modified files, and confirm source
    and test files are unmodified.

## Out of Scope

- Verifying internal anchors and external links (stories 9-8 and 9-9).
- Cross-checking the `docs/` directory (story 9-9).
- Any changes to `src/`, `tests/`, or `docs/` files.
- Adding new configuration keys or reference table rows — those are covered by
  story 9-5 (already done).
- Rewriting or expanding any existing section — this story only adds the new
  FAQ section.

## Tasks / Subtasks

- [x] **Task 1 — Locate insertion point (AC: #1, #2, #3)**
  - [x] Run `grep -n "^## Self-hosting"` to confirm the current line number.
  - [x] Run `grep -n "^---"` around that range to identify the preceding `---`.
  - [x] Confirm the exact structure around the insertion point matches AC #3.

- [x] **Task 2 — Insert `## Common patterns` section (AC: #1–#8)**
  - [x] Insert the section with correct `---` delimiters per AC #3.
  - [x] Write all five FAQ entries per AC #4–#8 using `####` headings.
  - [x] Verify each entry contains the required content and link.

- [x] **Task 3 — Update nav row (AC: #9)**
  - [x] Run `grep -n "Quick start.*Walkthrough"` to confirm line number.
  - [x] Insert `· [Common patterns](#common-patterns)` between `[Custom Skills]`
        and `[Self-hosting]`.

- [x] **Task 4 — Update sprint-status.yaml (AC: #11)**
  - [x] Set `9-7-add-common-patterns-faq`: `ready-for-dev` → `review`.
  - [x] Update `last_updated` field and annotation.

- [x] **Task 5 — Regression verification (AC: #12)**
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- tests/` → empty.
  - [x] `npm run build && npm run lint` → clean (0 errors, pre-existing
        warnings only).

- [x] **Task 6 — Commit (AC: #13)**
  - [x] Stage `README.md`, story file, `sprint-status.yaml`.
  - [x] Commit with header + body per AC #13.

## Dev Notes

### Exact FAQ section content

Insert the following block verbatim (or with equivalent meaning — wording may
be adjusted for flow, but all required points per AC #4–#8 must be present):

```markdown
## Common patterns

#### My docs aren't in `planning-artifacts/`

Set the `[docs]` table in `.bmadmcp/config.toml` — each key resolves
independently, so only override the paths that differ from the default:

```toml
[docs]
prd_path          = "docs/PRD.md"
architecture_path = "docs/architecture/overview.md"
epics_path        = "docs/epics/"
```

See [Doc-path cascade](#doc-path-cascade-docs-table) for the full key reference
and three-layer resolution order.

#### I want to file a bug

Say `create a bug [description]` (or `report a bug …` / `log bug …`). The
`clickup-create-bug` skill picks the target list, optionally links the bug to an
epic, and composes a structured ticket (repro / expected / actual / impact /
suspected area). Planning artifacts are loaded as optional context — the skill
continues with a warning if any are missing. See
[clickup-create-bug](#clickup-create-bug).

#### This work doesn't fit under any epic

`clickup-create-story` supports standalone tasks: when `allow_no_epic = true`
(the default), the epic picker includes `[0] No epic — create as standalone
task`. Selecting it creates a top-level ClickUp task with no parent epic. To
always require an epic parent, set `allow_no_epic = false` under
`[clickup_create_story]`. See [clickup-create-story](#clickup-create-story).

#### I need to share credentials per-team via HTTP

Run the HTTP transport (see [Self-hosting](#self-hosting-http)). ClickUp
credentials are passed as request headers (`X-ClickUp-Api-Key`,
`X-ClickUp-Team-Id`) on each call — every team member authenticates
independently from the same server instance. The server `.env` only needs
`PORT`, `BMAD_API_KEY`, and optionally `BMAD_DEBUG`; no ClickUp credentials
are stored server-side.

#### How do I pin space/list IDs to skip pickers

Set `pinned_space_id` and `pinned_backlog_list_id` in the `[clickup]` section
of `.bmadmcp/config.toml`. When both are set, picker discovery is bypassed
entirely. In practice you usually don't need to do this manually — skills
auto-save discovered IDs back to the file after the first successful picker run.
See [Project-local config](#project-local-config-bmadmcpconfigtoml).
```

### Insertion point (verified against current branch)

Current README structure around the insertion (line numbers will drift — always
verify with `grep -n` before editing):

```
line ~778  Custom skill source lives in `src/custom-skills/`. See ...
line ~779  (blank)
line ~780  ---
line ~781  (blank)
line ~782  ## Self-hosting (HTTP)
```

The new section goes **between** the `---` at line ~780 and `## Self-hosting
(HTTP)` at line ~782. The `---` at line ~780 becomes the opening separator for
`## Common patterns`; a new `---` is inserted after the last FAQ entry and
before `## Self-hosting (HTTP)`.

### Anchors

| Heading | GitHub-generated anchor |
|---------|------------------------|
| `## Common patterns` | `#common-patterns` |
| `#### My docs aren't in \`planning-artifacts/\`` | `#my-docs-arent-in-planning-artifacts` |
| `#### I want to file a bug` | `#i-want-to-file-a-bug` |
| `#### This work doesn't fit under any epic` | `#this-work-doesnt-fit-under-any-epic` |
| `#### I need to share credentials per-team via HTTP` | `#i-need-to-share-credentials-per-team-via-http` |
| `#### How do I pin space/list IDs to skip pickers` | `#how-do-i-pin-spacelist-ids-to-skip-pickers` |

The nav row links to `#common-patterns` (the section heading), not to the
individual entry headings.

### Key constraints

- **Do not** modify any existing section — only insert the new FAQ section and
  update the nav row.
- **Do not** alter the `---` separator at line ~780 (it becomes the opening
  separator for the new section).
- Line numbers shift as stories land. Always verify with `grep -n` before
  editing.
- The `---` separators between sections are load-bearing for rendering; the new
  section must have one on each side.
- `npm run build && npm run lint` MUST pass before commit.

### Previous story learnings (from 9-3 through 9-6)

- Line numbers shift after each story lands. Use `grep -n` before editing; do
  not trust numbers recorded in story files.
- Use `npm run build && npm run lint` (not just `lint`) to catch both type
  errors and style violations before committing.
- The `---` separators between walkthrough steps are load-bearing for
  rendering; preserve them when inserting new content around them.
- Commit body must name every modified file explicitly; reviewers check this
  against `git diff --stat`.
- TOML code blocks inside Markdown occasionally render oddly if the opening
  fence starts on the same line as the preceding paragraph — leave a blank line
  before the code fence.

### Files changed by this story

**Modified:**
- `README.md` — nav row (line ~10) + new `## Common patterns` section before
  `## Self-hosting (HTTP)`
- `planning-artifacts/sprint-status.yaml` — story 9-7 status
- `planning-artifacts/stories/9-7-add-common-patterns-faq.md` — this file

**Unchanged:**
- All TypeScript source and test files
- `CLAUDE.md`
- `docs/` directory files
- `.bmadmcp/config.example.toml`
- `src/custom-skills/` directory

### References

- EPIC-9 Outcomes [Source: planning-artifacts/epics/EPIC-9-readme-freshness.md §Outcomes]
- EPIC-9 exit criteria [Source: planning-artifacts/epics/EPIC-9-readme-freshness.md §Exit criteria]
- Story 9-7 scope [Source: planning-artifacts/epics/EPIC-9-readme-freshness.md §Stories (line 28)]
- Doc-path cascade docs [Source: CLAUDE.md §Doc-Path Cascade, README §Doc-path cascade]
- clickup-create-bug section [Source: README.md §`clickup-create-bug`, line ~671]
- clickup-create-story section [Source: README.md §`clickup-create-story`, line ~630]
- Project-local config section [Source: README.md §Project-local config, line ~695]
- Self-hosting section [Source: README.md §Self-hosting (HTTP), line ~782]
- Previous story learnings [Source: planning-artifacts/stories/9-6-rework-walkthrough-hardcoded-paths.md]
