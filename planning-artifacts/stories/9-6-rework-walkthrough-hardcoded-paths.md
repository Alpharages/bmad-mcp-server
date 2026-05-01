# Story 9.6: Rework Walkthrough Hardcoded Paths

Status: done

Epic: [EPIC-9: README freshness pass](../epics/EPIC-9-readme-freshness.md)

> This story covers two punch list items that both live in the beginner walkthrough:
> (F.1) Step 4 hardcodes `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md`
> without mentioning that EPIC-6 made those paths configurable via `.bmadmcp/config.toml [docs]`;
> (F.2) Step 8 tells users to create a `.bmad-pilot-marker` sentinel file — a requirement
> that was removed and is now contradicted by the Custom Skills intro at README line 590.
> Both are README-only fixes; no source or test files change.

## Story

As a **new user following the beginner walkthrough**,
I want Steps 4 and 8 to reflect how the skills actually work today,
so that I don't create files the skills ignore and don't miss the option to configure
custom doc paths.

## Acceptance Criteria

### Punch list F.1 — Step 4 configurable-path note

1. **Step 4 bash block preserved unchanged.** The `mkdir -p planning-artifacts` /
   `touch planning-artifacts/PRD.md` / `touch planning-artifacts/architecture.md`
   commands MUST remain as-is — they are still the recommended default layout.

2. **Configurable-path note added before `Expected`.** Immediately before the
   `**Expected.**` line in Step 4 (after the "Drafted by BMAD" bullet), a blockquote note MUST be inserted:

   > **Note.** If your docs already exist at a different path (e.g. `docs/PRD.md`),
   > configure them in `.bmadmcp/config.toml` instead of moving files:
   >
   > ```toml
   > [docs]
   > prd_path          = "docs/PRD.md"
   > architecture_path = "docs/architecture.md"
   > ```
   >
   > See [Doc-path cascade](#doc-path-cascade-docs-table) for the full `[docs]` table.

3. **`Drafted by BMAD` line unchanged.** The "Drafted by BMAD" bullet that references
   `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md` MUST NOT be
   modified — it describes the default BMAD output paths, not a constraint.

### Punch list F.2 — Step 8 sentinel file removed

4. **Step 8 heading updated.** The current heading:

   > `### Step 8 — Add the pilot marker to your repo`

   MUST be replaced with:

   > `### Step 8 — (Optional) Create a project-local config`

5. **Step 8 body replaced.** The entire Step 8 body (intro paragraph, bash block,
   Expected, and Fix paragraphs) MUST be replaced with the following content:

   ---

   The skills work without any project-local config file — on the first run they
   auto-discover your ClickUp space and list, then save the IDs back to
   `.bmadmcp/config.toml` so subsequent runs skip discovery. Create the file now
   if you want to seed those IDs upfront, or if your planning docs don't live at
   the default `planning-artifacts/` paths.

   **Action.** In your project root:

   ```bash
   mkdir -p .bmadmcp
   # Copy the example schema, or create the file from scratch
   # cp .bmadmcp/config.example.toml .bmadmcp/config.toml
   ```

   Then create (or edit) `.bmadmcp/config.toml` with the keys you need — all are
   optional:

   ```toml
   # Shared ClickUp IDs — skills auto-fill these after the first successful picker run
   [clickup]
   # pinned_space_id        = ""
   # pinned_space_name      = ""
   # pinned_backlog_list_id = ""

   # Only needed when planning docs don't live in planning-artifacts/
   # [docs]
   # prd_path          = "..."
   # architecture_path = "..."
   ```

   **Expected.** Either `.bmadmcp/config.toml` exists with your values, or you skip
   this step entirely — the first skill invocation auto-discovers and populates it.

   ---

6. **No trailing `Fix.` paragraph in Step 8.** The old "If you forget this and run a
   skill, you'll see ❌ cwd assertion failed" paragraph MUST NOT appear in the
   replacement — it was specific to the removed sentinel file check.

### Stale `.bmad-pilot-marker` references cleaned up

7. **Step 10 Fix note updated.** The current Fix line in Step 10:

   > **Fix.** If the skill stops at step 1 with a permission error, your
   > `CLICKUP_MCP_MODE` isn't `write` — re-check Step 6. If it stops at the cwd
   > assertion, you're not in the pilot repo — check Step 8.

   MUST be updated to remove the stale sentinel file reference:

   > **Fix.** If the skill stops at step 1 with a permission error, your
   > `CLICKUP_MCP_MODE` isn't `write` — re-check Step 6. If it stops at the cwd
   > assertion, you're not inside the project repo — open your AI client from the
   > project root and try again.

8. **Troubleshooting table row updated.** The row:

   | Skill stops at step 1 with "cwd assertion failed" | Running the skill outside the pilot repo | `cd` into the pilot repo before invoking, or create `.bmad-pilot-marker` if missing. |

   MUST be updated to:

   | Skill stops at step 1 with "cwd assertion failed" | Running the skill outside the project repo | `cd` into the project repo before invoking the skill. |

### Story file and sprint-status.yaml

9. **Story file saved** as
   `planning-artifacts/stories/9-6-rework-walkthrough-hardcoded-paths.md`
   with Status set to `review` after implementation.

10. **sprint-status.yaml updated:**
    - `9-6-rework-walkthrough-hardcoded-paths`: `backlog` → `review` after implementation.
    - `last_updated` field updated.

### Change isolation

11. Only `README.md`, `planning-artifacts/stories/9-6-rework-walkthrough-hardcoded-paths.md`,
    and `planning-artifacts/sprint-status.yaml` are modified.
    - `git diff --stat -- 'src/**/*.ts'` MUST be empty.
    - `git diff --stat -- tests/` MUST be empty.

### Commit

12. Commit message MUST follow Conventional Commits:

    ```
    docs(readme): rework walkthrough steps 4 and 8 for configurable paths (story 9-6)
    ```

    Body MUST reference story 9.6, name all modified files, and confirm source and test
    files are unmodified.

## Out of Scope

- Adding the "Common patterns" / FAQ section (story 9-7).
- Verifying internal anchors and external links (stories 9-8 and 9-9).
- Cross-checking the `docs/` directory (story 9-9).
- Any changes to `src/`, `tests/`, or `docs/` files.
- Rewording Step 9 or Step 10 beyond the single Fix note update in AC #7.

## Tasks / Subtasks

- [x] **Task 1 — Add configurable-path note to Step 4 (AC: #1, #2, #3)**
  - [x] Verify exact Step 4 line numbers with `grep -n "Step 4\|Expected.*Both files"`.
  - [x] Insert the blockquote note immediately after the `**Expected.**` line.
  - [x] Confirm bash block and "Drafted by BMAD" line are unchanged.

- [x] **Task 2 — Replace Step 8 body (AC: #4, #5, #6)**
  - [x] Verify exact Step 8 line numbers with `grep -n "Step 8\|pilot-marker"`.
  - [x] Replace heading and all body paragraphs per AC #4–#6.

- [x] **Task 3 — Fix Step 10 Fix note (AC: #7)**
  - [x] Verify exact line with `grep -n "cwd assertion.*pilot repo\|check Step 8"`.
  - [x] Update the Fix sentence per AC #7.

- [x] **Task 4 — Fix troubleshooting table row (AC: #8)**
  - [x] Verify exact row with `grep -n "cwd assertion failed"`.
  - [x] Replace the row per AC #8.

- [x] **Task 5 — Update sprint-status.yaml (AC: #10)**
  - [x] Set `9-6-rework-walkthrough-hardcoded-paths`: `backlog` → `review`.
  - [x] Update `last_updated` field.

- [x] **Task 6 — Regression verification (AC: #11)**
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- tests/` → empty.
  - [x] `npm run build && npm run lint` → clean (0 errors, pre-existing warnings only).

- [ ] **Task 7 — Commit (AC: #12)**
  - [ ] Stage `README.md`, story file, `sprint-status.yaml`.
  - [ ] Commit with header + body per AC #12.

### Review Findings

- [x] [Review][Decision] Note position: AC #2 originally said "after Expected" but implementation placed it before — accepted current placement (before Expected, after "Drafted by BMAD") as the better UX; AC #2 amended to match.
- [x] [Review][Patch] `last_updated` annotation omits story 9-6 — fixed: both sprint-status.yaml annotations updated to `2026-05-01 (story 9-6 → review)`.
- [x] [Review][Patch] Task 7 commit pending — fixed: committed as 299b772 with AC #12 header; body notes README/sprint-status changes were in prior commit fea2acf.
- [x] [Review][Defer] Step 8 missing gitignore reminder for `.bmadmcp/config.toml` — a new user seeding ClickUp IDs may commit the file unknowingly; out of scope for AC #5 but worth a future note — deferred, pre-existing gap

## Dev Notes

### Dependency on stories 9-3, 9-4, 9-5

Story 9-3 already corrected the Custom Skills prerequisite note (line ~590) to say
"No `.bmad-pilot-marker` or other per-project sentinel files are needed." Story 9-4
updated Step 10's walkthrough text for the no-epic option. Story 9-5 updates the
operations table and project-local config code block. All of these are non-overlapping
edits relative to 9-6:

- 9-3 touches line ~590 (Custom Skills intro) — 9-6 does not touch that line.
- 9-4 touches Step 10's `**What runs.**` and `**Expected.**` text — 9-6 only changes the
  Step 10 `**Fix.**` sentence.
- 9-5 touches lines ~374–387 (operations table) and ~681–692 (Project-local config block)
  — 9-6 touches lines ~153–173 (Step 4) and ~264–282 (Step 8).

These can land in any order without conflicts. If 9-5 lands before 9-6, line numbers
in Step 4 and Step 8 areas will shift slightly — always verify with `grep -n` rather
than trusting the numbers recorded here.

### Current README state (post story 9-4)

**Step 4 (lines 153–173):**

```
### Step 4 — Add planning artifacts to your project

The remaining steps assume your project has a PRD and architecture doc — BMAD agents
and skills read them as context.

**Action.** In your project root:

```bash
mkdir -p planning-artifacts
touch planning-artifacts/PRD.md
touch planning-artifacts/architecture.md
# planning-artifacts/tech-spec.md is optional
```

Fill in the content one of two ways:

- **By hand.** Use headings like `## Goals`, `## Non-goals`, `## Requirements`,
  `## Acceptance criteria`.
- **Drafted by BMAD.** Ask: _"Have John draft `planning-artifacts/PRD.md` for
  [feature]. Then have Winston draft `planning-artifacts/architecture.md`."_

**Expected.** Both files exist and contain real content describing your project / feature.
```

**Step 8 (lines 264–282):**

```
### Step 8 — Add the pilot marker to your repo

The skills check this sentinel file at every invocation to confirm they're running
in the right repo. Without it, every skill invocation fails at step 1.

**Action.** In your project root:

```bash
cat > .bmad-pilot-marker <<'EOF'
bmad-pilot-marker: 1
repo: your-org/your-repo
EOF
git add .bmad-pilot-marker
git commit -m "chore: add BMAD pilot marker"
```

**Expected.** `cat .bmad-pilot-marker` shows the two-line content. The file is committed.

**Fix.** If you forget this and run a skill, you'll see _"❌ cwd assertion failed."_
Create the file and retry.
```

**Step 10 Fix note (line 315):**

```
**Fix.** If the skill stops at step 1 with a permission error, your `CLICKUP_MCP_MODE`
isn't `write` — re-check Step 6. If it stops at the cwd assertion, you're not in the
pilot repo — check Step 8.
```

**Troubleshooting table row (line 360):**

```
| Skill stops at step 1 with "cwd assertion failed" | Running the skill outside the pilot repo | `cd` into the pilot repo before invoking, or create `.bmad-pilot-marker` if missing. |
```

### Evidence that `.bmad-pilot-marker` is stale

- `grep -r "bmad-pilot-marker" src/custom-skills/` → zero matches.
- README line ~590 already says: "No `.bmad-pilot-marker` or other per-project sentinel
  files are needed — credentials live in the MCP server process." (Corrected by story 9-3.)
- EPIC-9 punch list section F.2 explicitly flags Step 8 as stale and calls for removal
  or replacement.

### Evidence that doc-path configurability belongs in Step 4

- The doc-path cascade (EPIC-6) introduced `[docs].prd_path`, `[docs].architecture_path`
  in `.bmadmcp/config.toml`. Documented in CLAUDE.md and README §Doc-path cascade.
- EPIC-9 exit criteria: "A new user following the README end-to-end can complete the
  walkthrough on a project whose docs do **not** live in `planning-artifacts/` by setting
  `[docs].prd_path` and `[docs].architecture_path`."
- Step 4 is the natural place for this note — it's where the user creates the files or
  learns where to put them.

### Key constraints

- **Do not** remove or alter the bash block in Step 4 — `planning-artifacts/` is still
  the recommended default and most users will follow it.
- **Do not** touch the `[docs]` table section in the Project-local config area — it is
  complete and correct as of story 9-2.
- **Do not** touch any line in the Custom Skills intro at line ~590 — corrected by 9-3.
- Line numbers shift as stories land. Always verify with `grep -n` before editing.
- The `---` separators between walkthrough steps are load-bearing for section breaks;
  preserve them when inserting content around Step 4 and Step 8.
- `npm run build && npm run lint` MUST pass before commit.

### Previous story learnings (from 9-3, 9-4, 9-5)

- Line numbers shift after each story lands. Use `grep -n` before editing; do not trust
  numbers recorded in story files.
- Use `npm run build && npm run lint` (not just `lint`) to catch both type errors and
  style violations before committing.
- The `---` separators between walkthrough steps are load-bearing for rendering; preserve
  them when inserting new content around them.
- Commit body must name every modified file explicitly; reviewers check this against
  `git diff --stat`.

### Files changed by this story

**Modified:**
- `README.md` — Step 4 (add configurable-path note), Step 8 (replace sentinel-file
  step with optional project-config step), Step 10 Fix note (remove sentinel file
  reference), troubleshooting table row (remove sentinel file reference)
- `planning-artifacts/sprint-status.yaml` — story 9-6 status
- `planning-artifacts/stories/9-6-rework-walkthrough-hardcoded-paths.md` — this file

**Unchanged:**
- All TypeScript source and test files
- `CLAUDE.md`
- `docs/` directory files
- `.bmadmcp/config.example.toml`
- `src/custom-skills/` directory

### References

- Punch list items F.1, F.2 [Source: planning-artifacts/epics/EPIC-9-punch-list.md]
- EPIC-9 exit criteria [Source: planning-artifacts/epics/EPIC-9-readme-freshness.md]
- Doc-path cascade docs [Source: CLAUDE.md §Doc-Path Cascade, README §Doc-path cascade]
- `.bmad-pilot-marker` staleness evidence [Source: `grep -r "bmad-pilot-marker" src/`]
- Current README state [Source: README.md — verified against current branch]
- Previous story learnings [Source: planning-artifacts/stories/9-5-expand-configuration-reference.md]
