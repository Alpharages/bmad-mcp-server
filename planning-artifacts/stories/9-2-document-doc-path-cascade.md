# Story 9.2: Document Doc-Path Cascade in README

Status: review

Epic: [EPIC-9: README freshness pass](../epics/EPIC-9-readme-freshness.md)

> This story has two deliverables: (1) expand the existing `#### Doc-path cascade` subsection in
> README to include the full 3-layer resolution order, the complete `[docs]` table schema, and a
> worked example; and (2) correct the agent and workflow count discrepancies documented in the 9-1
> punch list (section A). Both fit naturally into a single commit because the agent-table and
> cascade section are close together in the README.

## Story

As a **new user reading the README**,
I want a clear explanation of how BMAD locates PRD, architecture, and epics documents
so that I can set up projects whose docs don't live under `planning-artifacts/` without
reading the contributor-level `CLAUDE.md`.

## Acceptance Criteria

### Doc-path cascade expansion

1. **3-layer order documented.** The `#### Doc-path cascade (\`[docs]\` table)` subsection
   (currently README lines 683–700) MUST be expanded so that it clearly lists the three
   resolution layers in order (highest → lowest priority):

   1. `.bmadmcp/config.toml [docs]` table — per-project override
   2. BMAD config chain (`_bmad/config.toml` → `_bmad/config.user.toml` →
      `_bmad/custom/config.toml` → `_bmad/custom/config.user.toml`) using
      `[bmm].planning_artifacts` as the base directory
   3. Hardcoded default — `{project-root}/planning-artifacts/` (pre-EPIC-6 behavior)

2. **All four `[docs]` keys shown.** The subsection MUST include a table (or equivalent)
   documenting all four keys: `prd_path`, `architecture_path`, `epics_path`, `planning_dir`.
   Each entry MUST show its default value. (Currently only `prd_path` and `architecture_path`
   appear in the code block; `epics_path` and `planning_dir` are absent.)

3. **Worked example present.** The subsection MUST include a complete worked example for a
   project whose docs live under `docs/` (not `planning-artifacts/`), showing all three
   path overrides (`prd_path`, `architecture_path`, `epics_path`).

4. **Per-key resolution note preserved.** The note "Resolution is per-key: overriding only
   `prd_path` leaves `architecture_path` and `epics_path` to be resolved by the BMAD config
   chain or the hardcoded default" MUST be retained (wording may be tightened).

5. **Cross-reference to `CLAUDE.md` preserved.** The link to
   [`CLAUDE.md#doc-path-cascade`](./CLAUDE.md#doc-path-cascade) for contributor-level detail
   MUST remain in the subsection.

### Agent and workflow count fixes (punch list section A)

6. **Overview line corrected.** README line 18:
   - `"9 specialized agents"` → `"6 specialized agents"`
   - `"26 automated workflows"` → `"29 automated workflows"`

7. **Step 1 expected-response text corrected.** README line 121 currently reads:
   > "A response listing **9 agents**: Mary (analyst), Winston (architect), Amelia (dev),
   > Sally (ux-designer), Murat (qa), John (pm), Bob (sm), Diana (debug), and a tech-writer."

   MUST be updated to list the 6 live agents only: `analyst` (Mary), `architect` (Winston),
   `dev` (Amelia), `ux-designer` (Sally), `pm` (John), `tech-writer`. Remove Murat (`qa`),
   Bob (`sm`), and Diana (`debug`).

8. **Step 1 CLI sanity-check line corrected.** README line 123 currently reads:
   > "if that prints 9 agents, the server itself is healthy"

   MUST be updated to: "if that prints 6 agents, the server itself is healthy".

9. **Agent table corrected.** The `### Specialized agents` table (README lines 391–403) MUST
   remove the three rows for `Murat / qa`, `Bob / sm`, and `Diana / debug`. The resulting
   table has 6 rows (Mary, Winston, Amelia, Sally, John, and the tech-writer). The heading
   above the table already says "Specialized agents" (no count); no heading change needed.

10. **Workflows heading corrected.** `### Workflows (26)` (README line 405) → `### Workflows (29)`.

11. **Workflow description corrected.** README line 407 currently reads:
    > "Includes `prd`, `architecture`, `debug-inspect`, `atdd`, `ux-design`, `party-mode`, and 20 more."

    MUST be updated to: "and 23 more" (6 named + 23 unnamed = 29 total).

### Story file and sprint-status.yaml

12. **Story file saved** as `planning-artifacts/stories/9-2-document-doc-path-cascade.md`
    with Status set to `review` after implementation.

13. **sprint-status.yaml updated:**
    - `9-2-document-doc-path-cascade`: `backlog` → `ready-for-dev` (when story file saved);
      `ready-for-dev` → `review` after implementation.
    - `last_updated` field updated.

### Change isolation

14. Only `README.md`, `planning-artifacts/stories/9-2-document-doc-path-cascade.md`,
    and `planning-artifacts/sprint-status.yaml` are modified.
    - `git diff --stat -- 'src/**/*.ts'` MUST be empty.
    - `git diff --stat -- tests/` MUST be empty.

### Commit

15. Commit message MUST follow Conventional Commits:

    ```
    docs(readme): document doc-path cascade and fix agent/workflow counts (story 9-2)
    ```

    Body MUST reference story 9.2, name the modified files
    (`README.md`, `planning-artifacts/stories/9-2-document-doc-path-cascade.md`,
    `planning-artifacts/sprint-status.yaml`), and confirm that source and test files
    are unmodified.

## Out of Scope

- Adding `resolve-doc-paths` to the operations table (punch list section B — story 9-5).
- Updating the Custom Skills prerequisite note (punch list section F.3 — story 9-3).
- Adding a `clickup-create-bug` subsection (story 9-3).
- Expanding the Project-local config section with the missing `[clickup]`, `[clickup_create_bug]`,
  `[docs].epics_path`, `[docs].planning_dir`, and auto-save keys (story 9-5).
- Rewording walkthrough steps 4, 8, 9, 10 (story 9-6).

## Tasks / Subtasks

- [x] **Task 1 — Expand doc-path cascade subsection (AC: #1–#5)**
  - [x] Replace the existing `#### Doc-path cascade` block (README lines 683–700) with the
        expanded version: 3-layer ordered list, full 4-key `[docs]` table, worked example,
        per-key note, CLAUDE.md cross-reference.
  - [x] Verify the resulting block renders correctly in preview.

- [x] **Task 2 — Fix agent count on line 18 (AC: #6)**
  - [x] Change "9 specialized agents" → "6 specialized agents".
  - [x] Change "26 automated workflows" → "29 automated workflows".

- [x] **Task 3 — Fix Step 1 walkthrough (AC: #7, #8)**
  - [x] Update the expected-response text to list 6 agents (remove qa/sm/debug).
  - [x] Update the CLI sanity-check line to say "6 agents".

- [x] **Task 4 — Fix agent table (AC: #9)**
  - [x] Remove the `Murat / Test Architect / qa` row.
  - [x] Remove the `Bob / Scrum Master / sm` row.
  - [x] Remove the `Diana / Debug Specialist / debug` row.

- [x] **Task 5 — Fix workflow heading and description (AC: #10, #11)**
  - [x] Change `### Workflows (26)` → `### Workflows (29)`.
  - [x] Change "and 20 more" → "and 23 more".

- [x] **Task 6 — Update sprint-status.yaml (AC: #13)**
  - [x] Set `9-2-document-doc-path-cascade`: `ready-for-dev` → `review`.
  - [x] Update `last_updated` field.

- [x] **Task 7 — Regression verification (AC: #14)**
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- tests/` → empty.
  - [x] `npm run build && npm run lint` → clean.

- [x] **Task 8 — Commit (AC: #15)**
  - [x] Stage `README.md`, story file, `sprint-status.yaml`.
  - [x] Commit with header + body per AC #15.

## Dev Notes

### Pre-analysis: current README state at story-creation time

**Lines affected by agent/workflow count fixes:**

| Fix | Current text | Target text | Line(s) |
|-----|-------------|------------|---------|
| Overview | "9 specialized agents" | "6 specialized agents" | 18 |
| Overview | "26 automated workflows" | "29 automated workflows" | 18 |
| Step 1 expected response | Lists 9 agents including Murat/qa, Bob/sm, Diana/debug | Lists 6 agents (remove 3) | 121 |
| Step 1 CLI sanity check | "prints 9 agents" | "prints 6 agents" | 123 |
| Agent table rows | 9 rows (Murat/qa, Bob/sm, Diana/debug present) | 6 rows (3 removed) | 397–400 |
| Workflows heading | `### Workflows (26)` | `### Workflows (29)` | 405 |
| Workflow description | "and 20 more" | "and 23 more" | 407 |

**Why the three agents are absent:** `qa` (Murat), `sm` (Bob), and `debug` (Diana) appear in the
`Alpharages/BMAD-METHOD` upstream fork referenced by the README credits section, but are absent
from the current `Alpharages/BMAD-METHOD#main` branch that the server actually downloads. Removing
them from the table is correct; if they are re-added upstream, the table will need to be updated
again. Do NOT add a footnote or "upstream pending" note — just remove the rows.

### Pre-analysis: doc-path cascade section (README lines 683–700)

**Current content (lines 683–700):**

```markdown
#### Doc-path cascade (`[docs]` table)

`clickup-create-story`, `clickup-dev-implement`, and `clickup-code-review` call
`resolve-doc-paths` at startup to locate the PRD, architecture document, and
epics directory. By default they look under `planning-artifacts/`, but projects
with non-standard layouts can override individual paths via the `[docs]` table
in `.bmadmcp/config.toml`:

​```toml
[docs]
prd_path          = "docs/specs/PRD.md"
architecture_path = "docs/architecture/overview.md"
​```

Resolution is **per-key**: overriding only `prd_path` leaves `architecture_path`
and `epics_path` to be resolved by the BMAD config chain or the hardcoded
default. See [`CLAUDE.md`](./CLAUDE.md#doc-path-cascade) for the full cascade
order and contributor-level detail.
```

**Target expansion — replace the above block with:**

```markdown
#### Doc-path cascade (`[docs]` table)

`clickup-create-story`, `clickup-dev-implement`, and `clickup-code-review` call
`resolve-doc-paths` at startup to locate the PRD, architecture document, and
epics directory. Each path is resolved independently through three layers
(highest → lowest priority):

1. **`.bmadmcp/config.toml` `[docs]` table** — per-project override. Set any
   key here to skip the lower layers for that path only.
2. **BMAD config chain** — reads `_bmad/config.toml` →
   `_bmad/config.user.toml` → `_bmad/custom/config.toml` →
   `_bmad/custom/config.user.toml` and uses `[bmm].planning_artifacts` as the
   base directory.
3. **Hardcoded default** — `{project-root}/planning-artifacts/` (pre-EPIC-6
   behavior preserved).

The `[docs]` table supports four keys:

| Key                 | Resolves                                                                | Default                              |
| ------------------- | ----------------------------------------------------------------------- | ------------------------------------ |
| `prd_path`          | Path to PRD (absolute or project-root-relative)                         | `planning-artifacts/PRD.md`          |
| `architecture_path` | Path to architecture doc                                                | `planning-artifacts/architecture.md` |
| `epics_path`        | Path to epics file or directory (trailing `/` marks a directory)        | `planning-artifacts/epics/`          |
| `planning_dir`      | Base directory for default filenames when a per-key override is not set | `planning-artifacts/`                |

**Example — project with docs in `docs/`:**

​```toml
[docs]
prd_path          = "docs/specs/PRD.md"
architecture_path = "docs/architecture/overview.md"
epics_path        = "docs/epics/"
​```

Resolution is **per-key**: setting only `prd_path` leaves `architecture_path`
and `epics_path` to fall through to layer 2 or 3. See
[`CLAUDE.md`](./CLAUDE.md#doc-path-cascade) for contributor-level detail.
```

### Key constraints

- **Do not** add `resolve-doc-paths` to the operations table (story 9-5's remit).
- **Do not** update the Custom Skills prerequisite note at line 593 (story 9-3's remit).
- **Do not** touch walkthrough steps 4, 8 (story 9-6's remit).
- The doc-path cascade section lives inside the `### Project-local config` subsection of
  `## Custom Skills`. This nesting is intentional — the cascade is a config-file feature.
- The `[docs]` table example in `.bmadmcp/config.example.toml` (lines 64–73) is the
  authoritative schema reference; it already shows all 4 keys and a worked example. Match
  the README expansion to it.

### Source of truth for cascade spec

- `CLAUDE.md` — "Doc-Path Cascade" section (lines ~119–150) — 3-layer order and key table
- `.bmadmcp/config.example.toml` — `[docs]` section (lines 64–73) — key names and defaults
- `src/custom-skills/clickup-create-story/steps/` — runtime behavior

### Files changed by this story

**Modified:**
- `README.md` — doc-path cascade expansion + agent/workflow count fixes
- `planning-artifacts/sprint-status.yaml` — story 9-2 status
- `planning-artifacts/stories/9-2-document-doc-path-cascade.md` — this file

**Unchanged:**
- All TypeScript source and test files
- `CLAUDE.md` (already has correct cascade docs; no changes needed)
- `docs/` directory files

### References

- EPIC-9 goals [Source: planning-artifacts/epics/EPIC-9-readme-freshness.md]
- Punch list section A [Source: planning-artifacts/epics/EPIC-9-punch-list.md]
- Cascade spec [Source: CLAUDE.md §Doc-Path Cascade]
- Config schema [Source: .bmadmcp/config.example.toml §[docs]]
- Live agent count [Source: Story 9-1 dev notes — `npm run cli:list-agents` → 6 agents, 29 workflows]

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (k1.6)

### Completion Notes List

1. Expanded `#### Doc-path cascade` subsection with 3-layer resolution order, full 4-key `[docs]` table, worked example for `docs/` layout, per-key resolution note, and preserved CLAUDE.md cross-reference.
2. Corrected agent count: 9 → 6 agents, 26 → 29 workflows across overview, walkthrough Step 1, CLI sanity check, agent table, and workflow heading/description.
3. Removed Murat (qa), Bob (sm), and Diana (debug) rows from the agent table.
4. Verified zero source/test file changes via `git diff --stat`.
5. Build and lint passed cleanly.

### File List

**Modified:**
- `README.md`
- `planning-artifacts/sprint-status.yaml`
- `planning-artifacts/stories/9-2-document-doc-path-cascade.md`
