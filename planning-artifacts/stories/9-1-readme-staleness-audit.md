# Story 9.1: README Staleness Audit

Status: review

Epic: [EPIC-9: README freshness pass](../epics/EPIC-9-readme-freshness.md)

> This is the gating story for EPIC-9. It produces a committed punch list that all
> subsequent stories (9-2 through 9-9) will act on. **No README edits land here** —
> the output is audit data only.
>
> EPICs 6, 7, and 8 have all shipped: the doc-path cascade (EPIC-6), the bug-creation
> skill (EPIC-7), and the no-epic option (EPIC-8). The audit below pre-populates the
> known gaps so the dev agent only needs to verify and commit rather than re-discover
> them. Running the live-count commands and link checks remains required as a
> correctness gate.

## Story

As a **contributor preparing EPIC-9 edits**,
I want a committed punch list documenting every stale or missing item in `README.md`,
so that subsequent stories have a precise, authoritative target list that prevents
redundant analysis and scope creep.

## Acceptance Criteria

### Punch list file created

1. **File committed.** A file `planning-artifacts/epics/EPIC-9-punch-list.md` MUST be
   created and committed. It MUST contain exactly the sections defined in AC #2–#8 below.
   No other files are modified by this story (except the story file and sprint-status.yaml).

### Section A — Agent and workflow count verification

2. **Live counts confirmed.** The punch list MUST record the result of running:

   ```bash
   npm run cli:list-agents
   npm run cli:list-workflows
   ```

   and comparing output against the README's claimed counts. As of the pre-analysis
   in the story dev notes, the expected results are:
   - `cli:list-agents` → **6 agents** (README claims 9 on lines 18 and 121)
   - `cli:list-workflows` → **29 workflows** (README claims 26 on lines 18 and 406)

   If the live counts differ from these expected values, the punch list MUST record
   the actual counts and flag the discrepancy. The punch list entry MUST cite the
   exact README line numbers affected.

### Section B — Agent table gap

3. **Missing agents noted.** The punch list MUST list the agents present in the README
   Features table (lines 392–401) but absent from the live `cli:list-agents` output.
   Pre-analysis identifies: `qa` (Murat), `sm` (Bob), `debug` (Diana).
   Verify each against the live output and record which three (or fewer, if upstream
   added them) are absent.

### Section C — Missing `resolve-doc-paths` operation

4. **Operation gap documented.** The punch list MUST note that the README "Unified
   `bmad` tool" operations table (line 374) and Usage examples (lines 440–453) document
   only 4 operations (`list`, `read`, `execute`, `search`) and that `resolve-doc-paths`
   — introduced in EPIC-6 — is absent. Story 9-5 (or 9-3; the owner story TBD) should
   add it.

### Section D — Custom skills section gaps

5. **Missing `clickup-create-bug` skill.** The punch list MUST record that the Custom
   Skills section (lines 597–704) has no `### clickup-create-bug` subsection. It MUST
   note the skill's key characteristics:
   - Trigger: "create a bug", "report a bug", "log bug `<description>`"
   - Steps: prereq check → list picker → (optional) epic picker → description composer
     → `createTask`
   - Planning artifacts are **soft-loaded** (optional) — different from create-story
     and dev-implement which require them
   - Config keys: `[clickup_create_bug].target_list_id`, `.default_priority`,
     `.default_tags`, `.pinned_epic_id`, `.pinned_epic_name`

6. **`clickup-create-story` no-epic gap.** The punch list MUST note that the
   `### clickup-create-story` subsection (lines 611–622) describes the skill as always
   creating a subtask of an epic, with no mention of:
   - The `[0] No epic — create as standalone task` picker entry (EPIC-8)
   - The `allow_no_epic` config key
   - The standalone task outcome
   The walkthrough Step 10 (line 305) has the same gap.

### Section E — Project-local config section gaps

7. **Missing config keys.** The punch list MUST enumerate every key present in
   `.bmadmcp/config.example.toml` but absent from the Project-local config section
   of the README (lines 650–700). Pre-analysis finds:
   - `[clickup]` shared section (`pinned_space_id`, `pinned_space_name`,
     `pinned_backlog_list_id`) — entirely absent
   - `[clickup_create_story].allow_no_epic` — absent
   - `[clickup_create_bug]` section — entirely absent (`target_list_id`,
     `default_priority`, `default_tags`, `pinned_epic_id`, `pinned_epic_name`)
   - `[docs].epics_path` and `[docs].planning_dir` — the example in the README only
     shows `prd_path` and `architecture_path`
   - Auto-save behaviour (skills write discovered IDs back to config) — not mentioned
   The punch list MUST cite the config.example.toml as the authoritative source and
   note which story (9-5) owns the fix.

### Section F — Walkthrough staleness

8. **Stale walkthrough items.** The punch list MUST document:
   - **Step 4** (lines 155–170): hardcodes `mkdir -p planning-artifacts` and `touch
     planning-artifacts/PRD.md` without noting that the `[docs]` table in
     `.bmadmcp/config.toml` allows any path. Assign to story 9-6.
   - **Step 8** (lines 266–281): instructs users to create `.bmad-pilot-marker` and
     states "The skills check this sentinel file at every invocation." However, the
     Custom Skills intro (line 593) states "No `.bmad-pilot-marker` or other
     per-project sentinel files are needed" and no step file under
     `src/custom-skills/*/steps/` references the marker. Step 8 is stale and should
     be removed or replaced with setup instructions that are actually required
     (e.g. `.bmadmcp/config.toml`). Assign to story 9-6.
   - **Custom Skills prerequisite note** (line 593): states all custom skills require
     `planning-artifacts/PRD.md` + `planning-artifacts/architecture.md` without
     noting (a) the doc-path cascade makes these paths configurable, and (b)
     `clickup-create-bug` soft-loads artifacts (they are optional). Assign to
     story 9-3 (which owns the cascade documentation).

### Section G — Configuration reference table gaps

9. **Env-var coverage vs CLAUDE.md.** The punch list MUST list every env var in
   `CLAUDE.md` that is absent from the Configuration reference table (README lines
   810–819). Pre-analysis: `BMAD_REQUIRE_CLICKUP` is in CLAUDE.md and in the ClickUp
   section env table (README line 505) but not in the Configuration reference.

### Section H — Internal anchors and links

10. **Link audit results.** The punch list MUST record the result of verifying each
    internal link and external URL listed in the Dev Notes §Link inventory. Every link
    MUST be marked `✓ ok`, `⚠️ redirects`, or `❌ broken`. Pre-analysis confirms all
    internal links resolve; external links require a live check. No README edits for
    this AC — broken externals go to story 9-8.

### Story file and sprint-status.yaml updates

11. **Story file saved** as `planning-artifacts/stories/9-1-readme-staleness-audit.md`
    with Status updated to `review` (transitioning to `done` after code review).

12. **sprint-status.yaml updated:**
    - `9-1-readme-staleness-audit`: `backlog` → `ready-for-dev` (when story file is
      saved); `ready-for-dev` → `review` (after implementation).
    - `epic-9`: `backlog` → `in-progress`.
    - `last_updated` field updated.

### No-edit constraint

13. `README.md` is NOT modified by this story.
    `git diff --stat -- README.md` MUST be empty.

14. No TypeScript source files or test files are created or modified.
    `git diff --stat -- 'src/**/*.ts'` MUST be empty.
    `git diff --stat -- tests/` MUST be empty.

### Commit

15. Commit message MUST follow Conventional Commits:

    ```
    docs(stories): audit README staleness and commit punch list (story 9-1)
    ```

    Body MUST reference story 9.1, name the three committed files
    (`planning-artifacts/epics/EPIC-9-punch-list.md`,
    `planning-artifacts/stories/9-1-readme-staleness-audit.md`,
    `planning-artifacts/sprint-status.yaml`), and confirm that README.md and all
    source/test files are unmodified.

## Out of Scope

- Any edit to `README.md` — this is the audit story; edits belong to stories 9-2
  through 9-9.
- Fixing broken external links — story 9-8.
- Cross-checking `docs/` directory — story 9-9.
- Adding a Common Patterns / FAQ section — story 9-7.
- Decisions about whether to split the README into multiple files — deferred per
  EPIC-9 open questions.
- Updating the architecture doc's stale org link (`bmad-code-org` → `Alpharages`) —
  `docs/architecture.md` is story 9-9 territory.

## Tasks / Subtasks

- [x] **Task 1 — Run live-count commands (AC: #2, #3)**
  - [x] Run `npm run cli:list-agents` and record actual count and names.
  - [x] Run `npm run cli:list-workflows` and record actual count.
  - [x] Verify the three expected missing agents (qa/Murat, sm/Bob, debug/Diana) are
        absent from the live output.
  - [x] Document counts and compare against README lines 18, 121, 406.

- [x] **Task 2 — Verify internal links (AC: #10)**
  - [x] Confirm `#quick-start`, `#your-first-session--a-beginner-walkthrough`,
        `#clickup-integration`, `#custom-skills`, `#self-hosting-http`, `#documentation`
        nav anchors all resolve.
  - [x] Confirm file links: `./docs/clickup-quickstart.md`, `./docs/architecture.md`,
        `./docs/api-contracts.md`, `./docs/development-guide.md`,
        `./src/custom-skills/README.md`, `./.github/RELEASE_PROCESS.md`,
        `./.bmadmcp/config.example.toml` all exist.
  - [x] Check `./CLAUDE.md#doc-path-cascade` anchor.

- [x] **Task 3 — Verify external links (AC: #10)**
  - [x] `https://github.com/Alpharages/BMAD-METHOD` — live check.
  - [x] `https://www.npmjs.com/package/bmad-mcp-server` — live check.
  - [x] `https://modelcontextprotocol.io/` — live check.
  - [x] `https://github.com/Alpharages/bmad-mcp-server` — live check.
  - [x] `https://github.com/mkellerman/bmad-mcp-server` (Credits) — live check (may 404).
  - [x] npm badge URL — live check.

- [x] **Task 4 — Write punch list file (AC: #1–#10)**
  - [x] Create `planning-artifacts/epics/EPIC-9-punch-list.md` with sections A–H.
  - [x] Populate each section using the pre-analysis in Dev Notes below.
  - [x] Fill in live-count results from Task 1.
  - [x] Fill in link-check results from Tasks 2–3.
  - [x] Assign each item to its owner story (9-2 through 9-9).

- [x] **Task 5 — Update sprint-status.yaml (AC: #12)**
  - [x] Set `epic-9`: `backlog` → `in-progress`.
  - [x] Set `9-1-readme-staleness-audit`: → `review`.
  - [x] Update `last_updated` field.

- [x] **Task 6 — Regression verification (AC: #13, #14)**
  - [x] `git diff --stat -- README.md` → empty.
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- tests/` → empty.
  - [x] `npm run build && npm run lint && npm test` → clean, no new failures.

- [x] **Task 7 — Commit (AC: #15)**
  - [x] Stage: `planning-artifacts/epics/EPIC-9-punch-list.md`,
        `planning-artifacts/stories/9-1-readme-staleness-audit.md`,
        `planning-artifacts/sprint-status.yaml`.
  - [x] Commit with header + body per AC #15.

## Dev Notes

### Pre-analysis summary

The audit below was completed during story creation (2026-05-01). Live counts from
`npm run cli:list-agents` (output: `"Loaded 6 agents, 29 workflows, 546 resources"`).
The dev agent MUST re-run the commands to confirm numbers haven't changed before
writing the punch list.

### Section A — Agent and workflow counts

| Item | README claim | Live count | Lines affected |
|------|-------------|-----------|----------------|
| Agents | 9 | **6** | 18, 121, 393 (table rows) |
| Workflows | 26 | **29** | 18, 406 |

The 6 live agents: `analyst` (Mary), `tech-writer` (Paige), `architect` (Winston),
`dev` (Amelia), `pm` (John), `ux-designer` (Sally).

Agents in the README table but NOT in the live list:
- `qa` — Murat, Test Architect (line 397)
- `sm` — Bob, Scrum Master (line 399)
- `debug` — Diana, Debug Specialist (line 400)

These three are present in the Features agent table and referenced in Step 1's
expected output but do not appear in the cached `Alpharages/BMAD-METHOD` build.
Owner story: **9-1** (this story documents the gap); fix in README target: **9-2**
or a new sub-story depending on whether the agents will be re-added upstream or
removed from the README table.

### Section B — `resolve-doc-paths` operation

The unified `bmad` tool now has **5 operations** (confirmed from tool schema):
`list`, `read`, `execute`, `search`, `resolve-doc-paths`.

README gaps:
- Features › Unified `bmad` tool → operations table (lines 374–387): 4 ops only
- Usage section → direct tool call examples (lines 440–453): 4 ops only
- No usage example for `resolve-doc-paths`

Owner story: **9-5** (expand configuration reference) or a dedicated sub-story in 9-3
(cascade documentation). Recommend 9-5 since it touches the feature tables.

### Section C — Missing `clickup-create-bug` skill

EPIC-7 shipped `src/custom-skills/clickup-create-bug/`. The README Custom Skills
section (lines 597–704) has entries for: `clickup-create-epic`, `clickup-create-story`,
`clickup-dev-implement`, `clickup-code-review`. No entry for `clickup-create-bug`.

Key facts for the new subsection (sourced from step files):
- **Trigger**: "create a bug", "report a bug", "log bug `<description>`"
- **Steps**: prereq + auth check → list picker → epic picker (optional) → description
  composer → `createTask`
- **Planning artifacts**: soft-loaded (PRD, architecture, epics are optional); the skill
  MUST NOT abort on missing artifacts — confirmed in `step-01-prereq-check.md`
- **Description shape**: bug-shaped (repro / expected / actual / impact / suspected area)
- **Config keys** (`[clickup_create_bug]`): `target_list_id`, `default_priority`,
  `default_tags`, `pinned_epic_id`, `pinned_epic_name`

This is a contrast from `clickup-create-story` and `clickup-dev-implement`, which both
hard-fail when `PRD.md` is absent.

Owner story: **9-3** (document bug skill).

### Section D — No-epic gaps

Two touch-points in README have no mention of EPIC-8's no-epic option:

**1. Walkthrough Step 10 (lines 305–316)**

Current text: "Invoke the `clickup-create-story` skill against pilot epic `<epic-id>`."

Missing: Any mention that selecting `[0] No epic — create as standalone task` in the
epic picker creates a top-level task with no parent (see `docs/clickup-quickstart.md`
which was updated by story 8-8).

**2. Custom Skills `### clickup-create-story` subsection (lines 611–622)**

Current steps line: "Steps: prereq + auth check → epic picker → sprint-list picker →
`bmad-create-story` (description composition only, no file write) → review (Y/n/edit)
→ `createTask`"

Missing:
- `[0] No epic` picker entry when `allow_no_epic` is `true` (default)
- Standalone task outcome
- `allow_no_epic` config key reference

Owner story: **9-4** (document no-epic option in README).

### Section E — Project-local config section gaps

Compare `.bmadmcp/config.example.toml` against README "Project-local config" section
(lines 650–700):

| Key / Section | In `config.example.toml` | In README |
|---------------|--------------------------|-----------|
| `[clickup]` shared section | ✓ (lines 22–25) | ❌ absent |
| `[clickup].pinned_space_id` | ✓ | ❌ absent |
| `[clickup].pinned_space_name` | ✓ | ❌ absent |
| `[clickup].pinned_backlog_list_id` | ✓ | ❌ absent |
| `[clickup_create_epic]` (empty override) | ✓ | ⚠️ shown but keys not listed |
| `[clickup_create_story].pinned_sprint_folder_id` | ✓ | ✓ |
| `[clickup_create_story].allow_no_epic` | ✓ | ❌ absent |
| `[clickup_create_bug]` section | ✓ | ❌ entirely absent |
| `[clickup_create_bug].target_list_id` | ✓ | ❌ absent |
| `[clickup_create_bug].default_priority` | ✓ | ❌ absent |
| `[clickup_create_bug].default_tags` | ✓ | ❌ absent |
| `[clickup_create_bug].pinned_epic_id` | ✓ | ❌ absent |
| `[clickup_create_bug].pinned_epic_name` | ✓ | ❌ absent |
| `[docs].epics_path` | ✓ | ❌ absent (only prd_path + architecture_path shown) |
| `[docs].planning_dir` | ✓ | ❌ absent |
| Auto-save behaviour | documented in step files | ❌ not mentioned in README |

Owner story: **9-5** (expand configuration reference).

### Section F — Walkthrough staleness

**Step 4 (lines 155–170) — hardcodes `planning-artifacts/`**

```bash
mkdir -p planning-artifacts
touch planning-artifacts/PRD.md
touch planning-artifacts/architecture.md
```

After EPIC-6, these paths are configurable via `[docs]` table. The step should include
a note like: "If your docs already exist elsewhere, skip the `mkdir`/`touch` and set
`[docs].prd_path` and `[docs].architecture_path` in `.bmadmcp/config.toml` instead."

Owner story: **9-6** (rework walkthrough hardcoded paths).

**Step 8 (lines 266–281) — stale `.bmad-pilot-marker` requirement**

Step 8 instructs: "cat > .bmad-pilot-marker" and says "The skills check this sentinel
file at every invocation to confirm they're running in the right repo."

Evidence this is stale:
- No step file under `src/custom-skills/*/steps/` references `.bmad-pilot-marker`
- Custom Skills intro (README line 593) says: "No `.bmad-pilot-marker` or other
  per-project sentinel files are needed"
- `grep -r "bmad-pilot-marker" src/custom-skills/` → zero matches

Step 8 should be removed or replaced with the actual one-time setup that IS required
(creating `.bmadmcp/config.toml` with credentials, or verifying space/list access via
the interactive pickers on first run).

Owner story: **9-6**.

**Custom Skills prerequisite note (line 593) — soft-load inconsistency**

"All custom skills require `CLICKUP_MCP_MODE=write` and `planning-artifacts/PRD.md`
+ `planning-artifacts/architecture.md` in the project root."

Two problems:
1. After EPIC-6, paths are configurable — the statement is no longer fully accurate.
2. `clickup-create-bug` soft-loads all three artifacts; missing PRD/architecture is
   a warning, not an abort. The prerequisite note groups all skills together incorrectly.

Owner story: **9-3** (cascade + bug skill docs).

### Section G — Configuration reference env-var gaps

CLAUDE.md env var table vs README Configuration reference (lines 810–819):

| Env var | CLAUDE.md | README config ref |
|---------|-----------|-------------------|
| `BMAD_ROOT` | ✓ | ✓ |
| `BMAD_DEBUG` | ✓ | ✓ |
| `NODE_ENV` | ✓ | ✓ |
| `BMAD_GIT_AUTO_UPDATE` | ✓ | ✓ |
| `BMAD_REQUIRE_CLICKUP` | ✓ | ❌ absent (only in ClickUp section line 505) |
| `CLICKUP_API_KEY` | ✓ | noted as "ClickUp vars listed separately" |
| `CLICKUP_TEAM_ID` | ✓ | noted as "ClickUp vars listed separately" |
| `CLICKUP_MCP_MODE` | ✓ | noted as "ClickUp vars listed separately" |
| `PORT` | ✓ | ✓ |
| `BMAD_API_KEY` | ✓ | ✓ |

Gap: `BMAD_REQUIRE_CLICKUP` should appear in the Configuration reference table or have
a cross-reference to the ClickUp section where it is documented.

Owner story: **9-5** (expand configuration reference).

### Section H — Link inventory

**Internal links** (pre-analysis, all expected to resolve):

| Link | Target | Status |
|------|--------|--------|
| `#quick-start` nav | `## Quick start` | verify |
| `#your-first-session--a-beginner-walkthrough` | `## Your first session…` | verify |
| `#clickup-integration` | `## ClickUp integration` | verify |
| `#custom-skills` | `## Custom Skills` | verify |
| `#self-hosting-http` | `## Self-hosting (HTTP)` | verify |
| `#documentation` | `## Documentation` | verify |
| `./docs/clickup-quickstart.md` | exists | ✓ |
| `./docs/architecture.md` | exists | ✓ |
| `./docs/api-contracts.md` | exists | ✓ |
| `./docs/development-guide.md` | exists | ✓ |
| `./src/custom-skills/README.md` | exists | ✓ |
| `./.github/RELEASE_PROCESS.md` | exists | ✓ |
| `./.bmadmcp/config.example.toml` | exists | ✓ |
| `./CLAUDE.md#doc-path-cascade` | anchor in CLAUDE.md | verify |

**External links** (require live check during implementation):

| URL | Notes |
|-----|-------|
| `https://github.com/Alpharages/BMAD-METHOD` | primary upstream |
| `https://www.npmjs.com/package/bmad-mcp-server` | npm package |
| `https://modelcontextprotocol.io/` | MCP spec |
| `https://github.com/Alpharages/bmad-mcp-server` | repo |
| `https://github.com/mkellerman/bmad-mcp-server` | original credits — may 404 |
| npm badge `https://badge.fury.io/js/bmad-mcp-server.svg` | badge CDN |
| License badge URL | Shields.io |

### Punch list file format

Create `planning-artifacts/epics/EPIC-9-punch-list.md` with this structure:

```markdown
# EPIC-9 README Staleness Punch List

Generated: <date>
Story: 9-1-readme-staleness-audit

## Status

This punch list is the authoritative input for stories 9-2 through 9-9.
Each item is marked with its owner story.

## A. Agent / workflow counts
...

## B. Missing resolve-doc-paths operation
...

## C. Custom skills — missing clickup-create-bug
...

## D. Custom skills — no-epic gap
...

## E. Project-local config — missing keys
...

## F. Walkthrough staleness
...

## G. Configuration reference — env-var gaps
...

## H. Internal anchors
...

## I. External links
...
```

### Files changed by this story

**Created:**
- `planning-artifacts/epics/EPIC-9-punch-list.md` — the audit output

**Modified:**
- `planning-artifacts/sprint-status.yaml` — epic-9 and story 9-1 status
- `planning-artifacts/stories/9-1-readme-staleness-audit.md` — this file

**Unchanged:**
- `README.md`
- All TypeScript source and test files

### References

- EPIC-9 goals and stories list [Source: planning-artifacts/epics/EPIC-9-readme-freshness.md]
- Live agent/workflow count [Source: `npm run cli:list-agents` output at story creation time]
- Bug skill step files [Source: src/custom-skills/clickup-create-bug/steps/*.md]
- Config schema [Source: .bmadmcp/config.example.toml]
- Story 8-8 (no-epic quickstart update) [Source: planning-artifacts/stories/8-8-pilot-quickstart-update.md]
- CLAUDE.md env var table [Source: CLAUDE.md]

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (root agent)

### Debug Log References

- Live count commands: `npm run cli:list-agents` and `npm run cli:list-workflows` both output `Loaded 6 agents, 29 workflows, 546 resources`.
- External link checks performed with `curl -sI` on 2026-05-01.
- `grep -r "bmad-pilot-marker" src/custom-skills/` confirmed zero matches.

### Completion Notes List

- All tasks completed. Punch list file created with 9 sections (A–I) covering agent counts, missing operations, custom skill gaps, config gaps, walkthrough staleness, env-var gaps, and link audits.
- Live counts confirmed: 6 agents (not 9), 29 workflows (not 26). Three agents absent from live output: `qa`, `sm`, `debug`.
- Internal links: all nav anchors and file links resolve correctly.
- External links: 4 return 200, 2 return redirects (308/302), 1 returns 403 from curl but is browser-accessible (npmjs.com Cloudflare challenge).
- No edits to README.md, TypeScript sources, or test files.

### File List

- `planning-artifacts/epics/EPIC-9-punch-list.md` — created (new)
- `planning-artifacts/stories/9-1-readme-staleness-audit.md` — modified (status + tasks + dev agent record)
- `planning-artifacts/sprint-status.yaml` — modified (status updates)
