# Story 9.3: Document Bug-Creation Skill in README

Status: done

Epic: [EPIC-9: README freshness pass](../epics/EPIC-9-readme-freshness.md)

> This story has two deliverables: (1) add a `### clickup-create-bug` subsection to the
> Custom Skills section of the README, and (2) fix the prerequisite note at line 590 that
> incorrectly groups all skills together as requiring hard-present planning artifacts.
> Both land in a single commit because they are co-located in the same README section.

## Story

As a **new user reading the README**,
I want to find a description of `clickup-create-bug` alongside the other custom skills
and see an accurate prerequisite note that tells me planning artifacts are optional for
bug creation,
so that I know how to file a bug ticket without needing a PRD or architecture doc in
place.

## Acceptance Criteria

### Add `clickup-create-bug` subsection (punch list item C)

1. **New subsection present.** A `### \`clickup-create-bug\`` subsection MUST be added
   to the Custom Skills section, placed between `### \`clickup-code-review\`` and
   `### Project-local config (...)` (README lines 644–646 post-9-2).

2. **Trigger phrase(s) shown.** The subsection MUST show the trigger phrases that
   activate the skill:

   > create a bug [description]
   > — or — report a bug [description]
   > — or — log bug [description]

3. **Steps line present.** The subsection MUST include a Steps line matching the actual
   workflow sequence:

   > **Steps:** prereq + auth check → list picker → [optional] epic picker → description
   > composer → duplicate check → `createTask`

4. **Description shape noted.** The subsection MUST state that the description is
   bug-shaped: summary · steps to reproduce · expected behaviour · actual behaviour ·
   impact / severity · suspected area · environment · related links.

5. **Soft-load behavior documented.** The subsection MUST state that planning artifacts
   (PRD, architecture, epics) are located via the doc-path cascade and are **optional** —
   the skill warns if a file is missing but does not abort.

6. **Config keys listed.** The subsection MUST list the `[clickup_create_bug]` config
   keys: `target_list_id`, `default_priority`, `default_tags`, `pinned_epic_id`,
   `pinned_epic_name`.

### Fix prerequisite note (punch list item F.3)

7. **Prerequisite note reworded.** README line 590 (the paragraph beginning "All custom
   skills require `CLICKUP_MCP_MODE=write`…") MUST be replaced with wording that:
   - Retains the `CLICKUP_MCP_MODE=write` requirement (applies to all skills).
   - States that `clickup-create-story`, `clickup-dev-implement`, and
     `clickup-code-review` require planning artifacts, with paths resolved via the
     [doc-path cascade](#doc-path-cascade-docs-table) (defaults to
     `planning-artifacts/`).
   - States that `clickup-create-bug` loads those files as **optional context only** —
     missing artifacts produce a warning, not an abort.
   - Retains the sentence "No `.bmad-pilot-marker` or other per-project sentinel files
     are needed — credentials live in the MCP server process."

### Story file and sprint-status.yaml

8. **Story file saved** as
   `planning-artifacts/stories/9-3-document-bug-skill.md`
   with Status set to `review` after implementation.

9. **sprint-status.yaml updated:**
   - `9-3-document-bug-skill`: `ready-for-dev` → `review` after implementation.
   - `last_updated` field updated.

### Change isolation

10. Only `README.md`, `planning-artifacts/stories/9-3-document-bug-skill.md`,
    and `planning-artifacts/sprint-status.yaml` are modified.
    - `git diff --stat -- 'src/**/*.ts'` MUST be empty.
    - `git diff --stat -- tests/` MUST be empty.

### Commit

11. Commit message MUST follow Conventional Commits:

    ```
    docs(readme): document clickup-create-bug skill and fix prerequisite note (story 9-3)
    ```

    Body MUST reference story 9.3, name the modified files
    (`README.md`, `planning-artifacts/stories/9-3-document-bug-skill.md`,
    `planning-artifacts/sprint-status.yaml`), and confirm that source and test files
    are unmodified.

## Out of Scope

- Adding `resolve-doc-paths` to the operations table (punch list section B — story 9-5).
- Adding a no-epic note to the `clickup-create-story` subsection (punch list section D —
  story 9-4).
- Expanding the Project-local config section with missing `[clickup_create_bug]` keys
  and `[clickup]` shared section (punch list section E — story 9-5).
- Rewording walkthrough steps 4, 8, 9, 10 (punch list section F.1/F.2 — story 9-6).
- Removing Step 8's stale `.bmad-pilot-marker` instruction (story 9-6).

## Tasks / Subtasks

- [x] **Task 1 — Add `clickup-create-bug` subsection (AC: #1–#6)**
  - [x] Insert `### \`clickup-create-bug\`` subsection between `### \`clickup-code-review\``
        and `### Project-local config` (after the `---` separator on line 644).
  - [x] Include trigger phrases, Steps line, description-shape note, soft-load note,
        and `[clickup_create_bug]` config keys.
  - [x] Verify the resulting block renders correctly in preview.

- [x] **Task 2 — Fix prerequisite note (AC: #7)**
  - [x] Replace the paragraph at README line 590 with differentiated wording that
        separates hard-require skills from soft-load (`clickup-create-bug`).
  - [x] Confirm the doc-path cascade anchor link resolves.

- [x] **Task 3 — Update sprint-status.yaml (AC: #9)**
  - [x] Set `9-3-document-bug-skill`: `ready-for-dev` → `review`.
  - [x] Update `last_updated` field.

- [x] **Task 4 — Regression verification (AC: #10)**
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- tests/` → empty.
  - [x] `npm run build && npm run lint` → clean.

- [x] **Task 5 — Commit (AC: #11)**
  - [x] Stage `README.md`, story file, `sprint-status.yaml`.
  - [x] Commit with header + body per AC #11.

### Review Findings

- [x] [Review][Patch] `last_updated` YAML value says `ready-for-dev` instead of `review` [`planning-artifacts/sprint-status.yaml:52`] — resolved by overwrite (story 9-4 commit updated the line)

## Dev Notes

### Current README state (post-story-9-2)

**Prerequisite note (line 590 — to be replaced):**

```
All custom skills require `CLICKUP_MCP_MODE=write` and `planning-artifacts/PRD.md` +
`planning-artifacts/architecture.md` in the project root. No `.bmad-pilot-marker` or
other per-project sentinel files are needed — credentials live in the MCP server process.
```

Two problems with this text:
1. After EPIC-6, planning artifact paths are configurable via the doc-path cascade — the
   hardcoded `planning-artifacts/` path is no longer the full story.
2. `clickup-create-bug` (EPIC-7) soft-loads all three artifacts; a missing file is a
   warning, not an abort. The note incorrectly groups all skills under the same hard
   requirement.

**Target prerequisite note (replace line 590 with):**

```
All custom skills require `CLICKUP_MCP_MODE=write`. `clickup-create-story`,
`clickup-dev-implement`, and `clickup-code-review` also require planning artifacts
(PRD, architecture, epics) — paths are resolved via the
[doc-path cascade](#doc-path-cascade-docs-table) and default to `planning-artifacts/`.
`clickup-create-bug` loads those files as optional context only and continues with a
warning if any are missing. No `.bmad-pilot-marker` or other per-project sentinel files
are needed — credentials live in the MCP server process.
```

### Target new subsection (insert after `---` on line 644, before `### Project-local config`)

```markdown
### `clickup-create-bug`

Creates a ClickUp bug ticket from a free-form bug report. Parses the report into a
structured bug description — summary, steps to reproduce, expected behaviour, actual
behaviour, impact / severity, suspected area, environment, and related links — infers
a priority from the stated severity, and adds a `bug` tag automatically. Planning
artifacts (PRD, architecture, epics) are located via the
[doc-path cascade](#doc-path-cascade-docs-table) but are **optional**: the skill warns
if any file is missing and continues rather than aborting.

**Trigger:**

> create a bug [description]
> — or — report a bug [description]
> — or — log bug [description]

**Steps:** prereq + auth check → list picker → [optional] epic picker → description
composer → duplicate check → `createTask`

**Config keys (`[clickup_create_bug]`):** `target_list_id`, `default_priority`,
`default_tags`, `pinned_epic_id`, `pinned_epic_name`

---
```

### Key constraints

- **Do not** touch the walkthrough steps (story 9-6's remit).
- **Do not** update the `clickup-create-story` subsection for the no-epic option (story 9-4).
- **Do not** expand the Project-local config section with `[clickup_create_bug]` keys
  (story 9-5) — the subsection above lists the keys for discoverability; the config
  reference expansion with full descriptions lands in 9-5.
- The anchor `#doc-path-cascade-docs-table` (generated from the heading
  `#### Doc-path cascade (\`[docs]\` table)`) MUST resolve — it was confirmed working
  in story 9-2.

### Source of truth for bug skill behavior

- `src/custom-skills/clickup-create-bug/workflow.md` — workflow overview, soft-load
  behavior, step sequence
- `src/custom-skills/clickup-create-bug/steps/step-01-prereq-check.md` — prereq gate
- `src/custom-skills/clickup-create-bug/steps/step-04-description-composer.md` —
  description shape
- `.bmadmcp/config.example.toml` lines 46–51 — `[clickup_create_bug]` keys

### Files changed by this story

**Modified:**
- `README.md` — new `clickup-create-bug` subsection + prerequisite note fix
- `planning-artifacts/sprint-status.yaml` — story 9-3 status
- `planning-artifacts/stories/9-3-document-bug-skill.md` — this file

**Unchanged:**
- All TypeScript source and test files
- `CLAUDE.md`
- `docs/` directory files

### References

- Punch list items C and F.3 [Source: planning-artifacts/epics/EPIC-9-punch-list.md]
- Bug skill workflow [Source: src/custom-skills/clickup-create-bug/workflow.md]
- Bug skill steps [Source: src/custom-skills/clickup-create-bug/steps/]
- Config schema [Source: .bmadmcp/config.example.toml §[clickup_create_bug]]
- Previous story learnings [Source: planning-artifacts/stories/9-2-document-doc-path-cascade.md]
- EPIC-9 goals [Source: planning-artifacts/epics/EPIC-9-readme-freshness.md]
