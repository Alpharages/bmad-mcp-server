# Story 3.9: Wire `_bmad/custom/bmad-agent-dev.toml` to route Dev agent's `DS` trigger to `clickup-dev-implement`

Status: done

Epic: [EPIC-3: Dev agent implementation mode → ClickUp (non-destructive)](../epics/EPIC-3-dev-agent-clickup.md)

> Fills the `config.toml` wiring deferred by stories 3.1–3.8. One deliverable lands: a second `[[agent.menu]]` block is **appended** to the existing `_bmad/custom/bmad-agent-dev.toml` so the Dev agent's `DS` (develop-story / implementation-mode) trigger routes to `clickup-dev-implement` instead of the upstream `bmad-dev-story` skill. The CS override from story 2.7 is preserved byte-unchanged — this story does not touch it.
>
> **No TypeScript lands.** The `findBmmSkillsRoot` scan over `src/custom-skills/` was extended by story 2.7 (`src/core/resource-loader.ts`) and is already in effect. `clickup-dev-implement` is already discoverable via `bmad({ operation: "read", workflow: "clickup-dev-implement" })` today; this story activates the menu entry that routes end-users to it. No resource-loader changes, no new unit tests — the generic `src/custom-skills` discoverability test from story 2.7 already covers this skill's layout.
>
> **Depends on stories 3.1 through 3.8 completing first.** The skill being wired must be fully implemented (all seven step files land in 3.2–3.8) before the DS routing is activated. Do not start implementation until story 3.8 is merged.

## Story

As the **bmad-mcp-server platform maintainer**,
I want `_bmad/custom/bmad-agent-dev.toml` extended with a second `[[agent.menu]]` block that replaces the Dev agent's `DS` menu entry with `skill = "clickup-dev-implement"`,
so that invoking the Dev agent in implementation mode (`DS` trigger) routes end-to-end to the `clickup-dev-implement` skill — matching PRD §Functional requirements #5 ("Dev agent accepts a ClickUp task ID, fetches description + comments + status + parent epic context, reads repo `planning-artifacts/*`, implements code, posts progress comments, and transitions status") and PRD §FR #7 ("All customizations live in a separate `custom-skills/` layer wired via `config.toml`") — without modifying any upstream BMAD-METHOD source file and without disturbing the existing CS override from story 2.7.

## Acceptance Criteria

1. `_bmad/custom/bmad-agent-dev.toml` is extended to contain **exactly two** `[[agent.menu]]` blocks. The CS block from story 2.7 remains byte-unchanged; a new DS block is appended below it. The header comment is broadened in the same commit to reflect both overrides. The final file contents (after this story lands) MUST be:

   ```toml
   # Project-local Dev agent override.
   # Routes the CS (story-creation) and DS (implementation) triggers to
   # custom ClickUp skills.
   # Merge rule (BMAD): [[agent.menu]] entries keyed by `code` replace
   # matching upstream entries and new codes append.
   # See: src/custom-skills/clickup-create-story/
   # See: src/custom-skills/clickup-dev-implement/

   [[agent.menu]]
   code = "CS"
   description = "Create a ClickUp story as a subtask of a chosen epic in the active sprint list"
   skill = "clickup-create-story"

   [[agent.menu]]
   code = "DS"
   description = "Implement a ClickUp task end-to-end — fetch task + parent-epic context, read planning artifacts, implement code, post progress comments, transition status"
   skill = "clickup-dev-implement"
   ```

   No other TOML keys, sections, or `[[agent.menu]]` blocks are added. The header update is intentionally narrow: only the routing line expands to mention both triggers, and a second `# See:` pointer is added for `src/custom-skills/clickup-dev-implement/`. All other comment lines (merge-rule reminder, blank-line spacing) remain unchanged.

2. The `code = "DS"` value MUST match the `code` used in the upstream Dev agent `customize.toml`. Confirm by reading `~/.bmad/cache/git/github.com-Alpharages-BMAD-METHOD-main/src/bmm-skills/4-implementation/bmad-agent-dev/customize.toml` — as of 2026-04-23 the upstream DS entry is `code = "DS"`, `description = "Write the next or specified story's tests and code"`, `skill = "bmad-dev-story"`. Record any divergence in the Dev Agent Record.

3. The `skill = "clickup-dev-implement"` value MUST match the `name` key in `src/custom-skills/clickup-dev-implement/SKILL.md` exactly (case-sensitive). Confirm by reading that file — current `name` value is `clickup-dev-implement`.

4. After the change lands, calling `bmad({ operation: "read", workflow: "clickup-dev-implement" })` on the MCP server whose `projectRoot` is the bmad-mcp-server repo root MUST return a resource whose `content` includes both the text from `src/custom-skills/clickup-dev-implement/SKILL.md` and the text from `src/custom-skills/clickup-dev-implement/workflow.md` (the loader concatenates both via `loadBmmSkillContent`). Verify manually — no new unit test is added, because the generic `src/custom-skills` layout discoverability is already covered by the `'should load a workflow from src/custom-skills layout'` test from story 2.7 in `tests/unit/lite-resource-loader.test.ts`.

5. The CS `[[agent.menu]]` block added in story 2.7 is byte-unchanged — its `code`, `description`, and `skill` keys remain exactly as story 2.7 committed them. The header comment is modified **only** on the routing line (CS-only → CS + DS) and by appending one new `# See:` pointer; the merge-rule comment lines are byte-unchanged. `git diff -- _bmad/custom/bmad-agent-dev.toml` MUST show: (a) a replaced routing line in the header, (b) one appended `# See:` line for `clickup-dev-implement`, (c) the new DS `[[agent.menu]]` block and its separating blank line, and (d) zero other removals or edits.

6. `src/core/resource-loader.ts` is byte-unchanged. The `findBmmSkillsRoot` scan over `src/custom-skills/` was added in story 2.7 and is already in effect. `git diff -- src/core/resource-loader.ts` MUST be empty.

7. `tests/unit/lite-resource-loader.test.ts` is byte-unchanged. `git diff -- tests/unit/lite-resource-loader.test.ts` MUST be empty.

8. No new TypeScript source files are added or modified. `git diff --stat -- 'src/**/*.ts'` MUST be empty.

9. No files under `BMAD-METHOD/` are created, modified, or deleted. `git diff --stat -- BMAD-METHOD/` MUST be empty.

10. No files under `src/tools/clickup/` are created, modified, or deleted. `git diff --stat -- src/tools/clickup/` MUST be empty.

11. No files under `src/custom-skills/clickup-create-story/` or `src/custom-skills/clickup-dev-implement/` are created, modified, or deleted. `git diff --stat -- src/custom-skills/` MUST be empty. This story ships TOML only — all seven step files and both SKILL.md / workflow.md files are already in their post-3.8 state.

12. `.gitignore` is byte-unchanged. The `_bmad/custom/*.user.toml` personal-override rule from story 2.7 remains in place; no new rules are added. `git diff -- .gitignore` MUST be empty.

13. `npm run build` → clean. `npm run lint` → 0 errors (pre-existing warnings in `tests/support/litellm-helper.mjs` unchanged; no new findings). `npm run format` → no diff. `npm test` → passes with **no change in test count** vs. the merge commit of story 3.8 (current baseline: 234 passing — unchanged since story 3.6 because 3.7 and 3.8 also shipped markdown-only). Since this story ships TOML-only, the expected test-count delta is zero. **Re-verify the baseline against the merge commit of story 3.8 before committing** — if 3.8 landed with an unexpected test-count change, update this baseline in the commit message accordingly.

14. The vendor-tree exclusions added in story 1.1 remain byte-unchanged: `.gitignore` rule `!src/tools/clickup/**`, `tsconfig.json#exclude`, `eslint.config.mjs` `ignores`, `.eslintignore`, `.prettierignore`, and `tests/unit/dependency-audit.test.ts` `VENDORED_PATHS`.

15. The `_bmad/custom/bmad-agent-dev.toml` file remains the **only** file under `_bmad/` that is committed. `git diff --stat -- _bmad/` MUST show only the single TOML file. In particular, no `_bmad/custom/bmad-agent-dev.user.toml` (personal override) is committed — that pattern is gitignored by story 2.7 and remains so.

16. After the TOML change lands, the Dev agent's menu resolution (when BMAD customization loads) MUST surface exactly two routing changes vs. upstream `customize.toml`: CS → `clickup-create-story` (from 2.7) and DS → `clickup-dev-implement` (from this story). All other upstream menu entries (`QD`, `QA`, `CR`, `SP`, `ER`) remain unchanged — they are not overridden by `_bmad/custom/bmad-agent-dev.toml`. Verify by running `python3 _bmad/scripts/resolve_customization.py` if present, or by inspecting the resolved menu manually (see "How to verify merge result" under Dev Notes). Record any divergence in the Dev Agent Record.

## Out of Scope (explicitly deferred to later stories)

- `_bmad/scripts/resolve_customization.py` setup — the Dev agent SKILL.md attempts to run this script and falls back to manual TOML resolution if absent. Creating or maintaining the resolver script is out of scope (same as story 2.7).
- User-scoped personal override (`_bmad/custom/bmad-agent-dev.user.toml`) for the DS trigger — the gitignore pattern from story 2.7 already covers it; creating the file is not in scope for this story.
- Fuzzy or conditional routing by project type — the DS override is unconditional, same as the CS override.
- Regression check that upstream `bmad-dev-story` still works in isolation (parallel to story 2.8's check for `bmad-create-story`). Upstream `bmad-dev-story` is unused in bmad-mcp-server's own dev loop once DS is routed to `clickup-dev-implement`; a formal regression test is deferred pending a concrete need.
- Token-permission gating for the implementation-mode flow (parallel to story 2.9's gating for the story-creation flow). The `clickup-dev-implement` skill's runtime gates (steps 4, 5, 6, 7 all check for `addComment` / `updateTask` availability via `CLICKUP_MCP_MODE=write`) provide adequate per-step protection today; a consolidated boot-time token-permission check is deferred pending a concrete need.
- Updating the `src/custom-skills/README.md` to note that the DS trigger is now wired — the existing reference to story 2-7 already frames the wiring pattern; a second pointer for 3-9 is cosmetic and deferred.
- Adding a project-wide CI check that flags any future edit to upstream BMAD-METHOD source files — this story's AC #9 verifies the current change is clean, but a standing guardrail is a broader platform concern.
- Any change to the `clickup-dev-implement` skill's SKILL.md, workflow.md, or step files. The skill is frozen at its post-3.8 state; this story only activates the routing.

## Tasks / Subtasks

- [x] **Task 1 — Edit `_bmad/custom/bmad-agent-dev.toml` (AC: #1, #2, #3, #5)**
  - [x] Open `_bmad/custom/bmad-agent-dev.toml` (it already exists from story 2.7).
  - [x] Broaden the header-comment routing line (line 2) from CS-only to "CS (story-creation) and DS (implementation) triggers to custom ClickUp skills." Append one new `# See: src/custom-skills/clickup-dev-implement/` line immediately after the existing `# See: src/custom-skills/clickup-create-story/` line. All other comment lines (merge-rule reminder, blank-line spacing) are byte-unchanged.
  - [x] Append a blank line after the existing CS block, then the new DS block exactly as specified in AC #1.
  - [x] Verify the CS `[[agent.menu]]` block is untouched by running `git diff _bmad/custom/bmad-agent-dev.toml` and confirming edits are limited to the two header lines plus additions below the CS block.
  - [x] Verify `code = "DS"` matches the upstream entry in `~/.bmad/cache/git/github.com-Alpharages-BMAD-METHOD-main/src/bmm-skills/4-implementation/bmad-agent-dev/customize.toml`. Record any divergence in the Dev Agent Record.
  - [x] Confirm `skill = "clickup-dev-implement"` matches the `name` key in `src/custom-skills/clickup-dev-implement/SKILL.md` exactly (case-sensitive).

- [x] **Task 2 — Manually verify the skill is discoverable end-to-end (AC: #4, #16)**
  - [x] Run `npm run cli:list-workflows` from the repo root and confirm `clickup-dev-implement` appears in the output. This is the lowest-friction check — it uses the same resource-loader path the MCP server uses and does not require an IDE round-trip.
  - [x] Run `bmad({ operation: "read", workflow: "clickup-dev-implement" })` via the MCP tool (the same pathway the Dev agent uses at runtime). Confirm the returned `content` field contains both the SKILL.md frontmatter (`name: clickup-dev-implement`) and the workflow.md body (headings like `## Input`, `## Fetch`, `## Planning Artifacts`, `## Progress Comments`, `## Status Transitions`, `## Assumptions`, `## Dev Clarification`).
  - [x] Confirm `bmad({ operation: "list", query: "workflows" })` includes `clickup-dev-implement` in the returned list (belt-and-suspenders alongside the CLI check above).
  - [x] If `_bmad/scripts/resolve_customization.py` is present, run it to print the resolved Dev agent menu and confirm both CS → `clickup-create-story` and DS → `clickup-dev-implement` appear in the output alongside the unchanged upstream entries. As of 2026-04-23 this script is absent from the repo (`_bmad/scripts/` does not exist), so default to the manual inspection path below.
  - [x] Manual inspection (required when the resolver script is absent): (a) upstream `customize.toml` exposes seven menu codes (DS, QD, QA, CR, SP, CS, ER); (b) `_bmad/custom/bmad-agent-dev.toml` after this story exposes two override codes (CS, DS); (c) the resolved result per BMAD's `arrays-of-tables` keyed-by-`code` merge rule = five upstream entries (QD, QA, CR, SP, ER) + two overridden entries (CS, DS) = seven total, zero drift in count.

- [x] **Task 3 — Verify regression-free (AC: #5–#15)**
  - [x] `git diff -- _bmad/custom/bmad-agent-dev.toml` → shows only the DS block addition and the blank separator line; no existing line is edited or removed (AC #5).
  - [x] `git diff -- src/core/resource-loader.ts` → empty (AC #6).
  - [x] `git diff -- tests/unit/lite-resource-loader.test.ts` → empty (AC #7).
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty (AC #8).
  - [x] `git diff --stat -- BMAD-METHOD/` → empty (AC #9).
  - [x] `git diff --stat -- src/tools/clickup/` → empty (AC #10).
  - [x] `git diff --stat -- src/custom-skills/` → empty (AC #11).
  - [x] `git diff -- .gitignore` → empty (AC #12).
  - [x] `git diff -- .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty (AC #14).
  - [x] `git diff --stat -- _bmad/` → shows only `_bmad/custom/bmad-agent-dev.toml` (AC #15).
  - [x] `npm run build` → clean (AC #13).
  - [x] `npm run lint` → 0 errors. Pre-existing warnings unchanged (AC #13).
  - [x] `npm run format` → no diff (AC #13).
  - [x] `npm test` → passes with no change in test count vs. baseline of 234 (AC #13).

- [ ] **Task 4 — Commit (AC: all)**
  - [ ] Stage: `_bmad/custom/bmad-agent-dev.toml`.
  - [ ] Commit message: `feat(config): wire Dev agent DS trigger to clickup-dev-implement`
  - [ ] Body:

    ```
    Append a second [[agent.menu]] block to _bmad/custom/bmad-agent-dev.toml
    that replaces the upstream DS entry (skill = "bmad-dev-story") with
    skill = "clickup-dev-implement". BMAD's merge rule for arrays-of-tables
    keyed by `code` replaces the matching upstream entry, so the only Dev
    agent menu items affected by this repo's overrides are CS (from 2.7)
    and DS (this story) — the remaining upstream entries (QD, QA, CR, SP,
    ER) are untouched.

    No TypeScript lands. The resource-loader scan over src/custom-skills/
    was extended by story 2.7, so clickup-dev-implement is already
    discoverable via bmad({ operation: "read", workflow:
    "clickup-dev-implement" }). This commit activates the DS routing that
    points the Dev agent's implementation-mode menu entry at the ClickUp
    skill.

    Out of scope (deferred): upstream bmad-dev-story regression check;
    token-permission gating for the implementation flow.

    This is the final implementation story of EPIC-3. After this lands,
    only the optional epic-3 retrospective remains.

    Refs: EPIC-3, story 3-9-dev-config-toml-wiring.
    ```

## Dev Notes

### Why one deliverable — and why it's TOML-only

Story 2.7 had to ship both the TOML override and a resource-loader patch atomically, because without the loader scanning `src/custom-skills/`, the TOML would have routed to a workflow the MCP server couldn't find. That barrier is gone: the `findBmmSkillsRoot` array literal was widened in 2.7 to `['src/bmm-skills', 'bmm-skills', 'src/custom-skills', 'custom-skills']` and is in effect today. You can verify right now (before this story lands) that `bmad({ operation: "read", workflow: "clickup-dev-implement" })` returns the skill content — the loader finds it. The only reason the Dev agent doesn't route to it on a `DS` invocation is that the upstream `customize.toml` still points `DS` at `bmad-dev-story`. This story flips that routing.

Because the loader and the skill are both already in place, the change surface collapses to a single file: `_bmad/custom/bmad-agent-dev.toml`. No new unit test, no new step file, no TypeScript. This is the narrowest possible change that closes EPIC-3.

### BMAD customization merge rules (reminder from story 2.7)

The Dev agent (`bmad-agent-dev`) SKILL.md specifies the override chain for the `agent` block:

1. `{skill-root}/customize.toml` — upstream defaults (seven menu entries: DS, QD, QA, CR, SP, CS, ER).
2. `{project-root}/_bmad/custom/bmad-agent-dev.toml` — **team overrides** (this story adds DS; story 2.7 added CS).
3. `{project-root}/_bmad/custom/bmad-agent-dev.user.toml` — personal overrides (gitignored via story 2.7).

Merge rules (from upstream SKILL.md):

- Scalars: project override wins.
- `arrays (persistent_facts, principles, activation_steps_*)`: append.
- **`arrays-of-tables` with `code`/`id` keys: replace matching entry, append new ones.**

The third rule is critical: `[[agent.menu]]` blocks keyed by `code` in the project override replace the upstream entry with the same `code` in place, leaving order and all other entries untouched. After 2.7 + 3.9:

| Code | Upstream skill             | Project override      | Resolved skill             |
| ---- | -------------------------- | --------------------- | -------------------------- |
| DS   | bmad-dev-story             | clickup-dev-implement | clickup-dev-implement      |
| QD   | bmad-quick-dev             | (none)                | bmad-quick-dev             |
| QA   | bmad-qa-generate-e2e-tests | (none)                | bmad-qa-generate-e2e-tests |
| CR   | bmad-code-review           | (none)                | bmad-code-review           |
| SP   | bmad-sprint-planning       | (none)                | bmad-sprint-planning       |
| CS   | bmad-create-story          | clickup-create-story  | clickup-create-story       |
| ER   | bmad-retrospective         | (none)                | bmad-retrospective         |

Five upstream entries pass through unchanged; two are replaced by project overrides.

### How to verify merge result (AC #16)

Two paths:

**Option A — resolver script (preferred if present):** Run `python3 _bmad/scripts/resolve_customization.py` from the repo root. The script reads the upstream `customize.toml`, merges the project override, and prints the resolved TOML. Confirm the output matches the expected table above.

**Option B — manual inspection (if the resolver script is absent):** The script is out of scope (see story 2.7's Out of Scope), so this is the fallback. Open the upstream `customize.toml` (cached path above in AC #2), confirm its seven `[[agent.menu]]` entries. Open `_bmad/custom/bmad-agent-dev.toml` after this story lands, confirm the two override entries. Mentally apply the keyed merge rule: for each project `code`, replace the matching upstream entry; unmatched project `code`s append. The expected final count is seven entries with two substitutions (CS, DS) and five pass-throughs.

The Dev agent activation step doesn't error if the script is missing — it falls back to the same manual merge. No runtime dependency on Python.

### The DS code — why this trigger and not a new code

Upstream BMAD's Dev agent reserves `DS` for implementation-mode. The skill body is `bmad-dev-story` — the "write the next story's tests and code" loop. By replacing DS, this repo redirects any `DS` invocation (whether from a menu click, a slash command, or an activation prompt like "develop the next story") to the ClickUp-aware implementation skill. No new menu code is introduced, so dev operators' muscle memory (DS = implement) is preserved, and upstream documentation that says "use DS to develop a story" still applies — only the destination skill changes.

Creating a new code (e.g., `DI` for "Develop Implement") would have leaked ClickUp-specific vocabulary into the menu and broken the upstream invariant that DS is the implementation trigger. Keeping `code = "DS"` and swapping only `skill` matches the CS-override precedent from 2.7 and is the narrowest possible divergence.

### File naming — why the same `bmad-agent-dev.toml`

The override file's basename (`bmad-agent-dev`) must match the skill directory's basename, which is `bmad-agent-dev` (the upstream Dev agent skill). The `{skill-name}` placeholder in the SKILL.md override chain resolves to that basename. Story 2.7 created this file; this story appends to it. A separate file (e.g., `bmad-agent-dev-ds.toml`) would be silently ignored — the SKILL.md only looks at the one filename.

### Why no new unit test

Story 2.7's test `'should load a workflow from src/custom-skills layout'` in `tests/unit/lite-resource-loader.test.ts` verifies the generic mechanism: a `src/custom-skills/{name}/SKILL.md` is discoverable via `loadWorkflow({name})`. The test uses `my-custom-skill` as the placeholder name; the same mechanism applies to `clickup-dev-implement` without code changes. Adding a second test that swaps the name for `clickup-dev-implement` would duplicate coverage and add no new assertion. The manual verification in Task 2 is sufficient for this story's change surface.

### What the Dev agent sees at runtime after this story

When a user invokes the Dev agent and selects `DS` (or types a develop-story intent), the agent's activation loads `customize.toml`, merges `_bmad/custom/bmad-agent-dev.toml`, and resolves DS → `clickup-dev-implement`. The agent then calls `bmad({ operation: "execute", workflow: "clickup-dev-implement", message: <user input> })`. The user input typically contains a ClickUp task identifier (bare ID, full URL, or `CU-`-prefixed form). Step 1 (task-id-parser) normalises it, step 2 fetches task + epic context, step 3 loads planning artifacts, step 4 posts M1, implementation proceeds, step 4 posts M2, step 5 transitions status, and steps 6/7 are invoked discretionarily as ambiguities arise.

Nothing in the skill itself changed between the pre-3.9 and post-3.9 state — the seven step files, SKILL.md, and workflow.md are all frozen at their post-3.8 content. Only the **entry point** changes.

### Upstream `bmad-dev-story` is not removed

The upstream skill still exists in the BMAD git cache and remains loadable as a workflow. `bmad({ operation: "read", workflow: "bmad-dev-story" })` still returns it. Only the Dev agent's DS **menu routing** changes. Nothing in this repo depends on `bmad-dev-story` for its own dev loop after DS is rerouted, so there is no self-hosting concern.

### Interaction with story 2.7's file-format invariants

Story 2.7's AC #1 stated the override file "contain no other TOML keys, sections, or `[[agent.menu]]` blocks — only the CS override, to minimize drift risk from future upstream changes." This story relaxes that constraint deliberately: the file now contains two `[[agent.menu]]` blocks (CS and DS). The motivation for 2.7's constraint — minimize drift risk — still applies: the file stays narrow and auditable. Adding a DS block is the first legitimate reason to relax the constraint, and the per-block discipline (exactly three keys: `code`, `description`, `skill`) is preserved.

### `_bmad/` directory and `detectPathType` (unchanged from 2.7)

`detectPathType(projectRoot)` already descends into `_bmad/` and `getProjectBmadPath()` returns `{ bmadRoot: '_bmad/' }`. This shape was established by story 2.7 when `_bmad/custom/bmad-agent-dev.toml` first appeared; appending a DS block to that file does not change the directory structure. The bmm-skills fallback loader still finds `clickup-dev-implement` via `findBmmSkillsRoot` → `src/custom-skills/`. No loader-side interaction with the TOML change.

### Step file naming convention for EPIC-3 (reminder — unchanged since story 3.8)

| Step file                             | Created by story | Execution order         |
| ------------------------------------- | ---------------- | ----------------------- |
| `step-01-task-id-parser.md`           | 3.2              | 1                       |
| `step-02-task-fetch.md`               | 3.3              | 2                       |
| `step-03-planning-artifact-reader.md` | 3.4              | 3                       |
| `step-04-progress-comment-poster.md`  | 3.5              | 4 (M1, M2, M3+)         |
| `step-05-status-transition.md`        | 3.6              | 5 (post-M2)             |
| `step-06-assumptions.md`              | 3.7              | 6 (discretionary)       |
| `step-07-dev-clarification.md`        | 3.8              | 7 (blocking, on-demand) |

Story 3.9 adds no step file — the routing is handled at the project TOML layer, identical to how story 2.7 added no step file for the CS wiring.

### Tooling interaction

- **tsc**: `_bmad/` contains only TOML (and potentially Python/markdown). No new exclude entry needed — TypeScript doesn't scan it.
- **ESLint**: flat config targets `**/*.{ts,tsx,js,mjs,cjs}`. TOML is out of scope by default. No change.
- **Prettier**: does not format `.toml` files by default. Run `npm run format` before staging anyway, to catch any incidental markdown or source edits.
- **Vitest**: scans `tests/**/*.{test,spec}.ts`. Nothing under `_bmad/` is picked up. Test count unchanged.
- **Dep-audit test**: scans `src/**/*.ts`. No `.ts` in this story — no new dep-audit findings.

### CLICKUP_MCP_MODE considerations (unchanged from stories 3.4–3.8)

The `clickup-dev-implement` skill's runtime gates (steps 4, 5, 6, 7) check for `addComment` / `updateTask` / `getListInfo` availability and degrade gracefully when `CLICKUP_MCP_MODE` is `read` or `read-minimal`. This story does not add or remove any gate — the TOML wiring is unconditional on mode. A DS invocation in `read-minimal` mode will route to `clickup-dev-implement` and the skill will internally decide, step by step, whether to post comments / transition status / etc. That behaviour is already in place from stories 3.5–3.8.

### Final implementation story of EPIC-3

Story 3.9 is the last implementation story in EPIC-3. After it lands, the remaining items under `epic-3:` in `planning-artifacts/sprint-status.yaml` are the optional `epic-3-retrospective` and the epic's own `in-progress → done` transition. Neither is in scope for this story — both are post-merge follow-ups. The commit body calls this out explicitly so reviewers can see the epic closeout framing without cross-referencing sprint status.

### References

- [EPIC-3 §Stories bullet 9](../epics/EPIC-3-dev-agent-clickup.md) — "Wire `config.toml` override to route Dev agent's implementation-mode invocation to the new skill when ClickUp mode is configured."
- [EPIC-3 §Outcomes](../epics/EPIC-3-dev-agent-clickup.md) — "New custom skill `src/custom-skills/clickup-dev-implement/` as the dev agent's ClickUp-mode entry point."
- [PRD §Functional requirements #5](../PRD.md) — "Dev agent accepts a ClickUp task ID, fetches description + comments + status + parent epic context, reads repo `planning-artifacts/*`, implements code, posts progress comments, and transitions status."
- [PRD §Functional requirements #7](../PRD.md) — "All customizations live in a separate `custom-skills/` layer wired via `config.toml`."
- [Story 2.7 §Acceptance Criteria #1–#3](./2-7-config-toml-wiring.md) — CS wiring, `findBmmSkillsRoot` patch, and the `[[agent.menu]]` override format this story reuses.
- [Story 2.7 §Dev Notes: BMAD customization merge rules](./2-7-config-toml-wiring.md) — the keyed-by-`code` merge rule that makes appending a second `[[agent.menu]]` block safe.
- Upstream Dev agent SKILL.md — `~/.bmad/cache/git/.../bmad-agent-dev/SKILL.md` — override chain, merge rules, resolver fallback.
- Upstream Dev agent `customize.toml` — DS entry (`skill = "bmad-dev-story"`) confirmed 2026-04-23.
- [`src/core/resource-loader.ts` — `findBmmSkillsRoot`](../../src/core/resource-loader.ts) — already patched by story 2.7 to scan `src/custom-skills/`; no change in this story.
- [`src/custom-skills/clickup-dev-implement/SKILL.md`](../../src/custom-skills/clickup-dev-implement/SKILL.md) — `name: clickup-dev-implement` (case-sensitive match required by AC #3).
- [`src/custom-skills/clickup-dev-implement/workflow.md`](../../src/custom-skills/clickup-dev-implement/workflow.md) — the workflow body that `loadBmmSkillContent` concatenates after SKILL.md.
- [Story 3.1 §Acceptance Criteria](./3-1-scaffold-clickup-dev-implement-skill.md) — created the `clickup-dev-implement` skill directory and the seven workflow sections populated by stories 3.2–3.8.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M) via `bmad-dev-story` skill.

### Debug Log References

- `git diff -- _bmad/custom/bmad-agent-dev.toml` — confirmed CS block byte-unchanged; header routing line broadened; one `# See:` line appended; DS block appended with separating blank line; zero other edits.
- `bmad({ operation: "read", workflow: "clickup-dev-implement" })` via `scripts/bmad-cli.mjs` — returned SKILL.md frontmatter + workflow.md body with all seven expected section headings (`## Input`, `## Fetch`, `## Planning Artifacts`, `## Progress Comments`, `## Status Transitions`, `## Assumptions`, `## Dev Clarification`). `loadBmmSkillContent` concatenation verified.
- Upstream DS entry at `~/.bmad/cache/git/github.com-Alpharages-BMAD-METHOD-main/src/bmm-skills/4-implementation/bmad-agent-dev/customize.toml` re-read 2026-04-23: `code = "DS"`, `description = "Write the next or specified story's tests and code"`, `skill = "bmad-dev-story"`. No divergence from the story's recorded expectation.
- `src/custom-skills/clickup-dev-implement/SKILL.md` frontmatter re-read: `name: clickup-dev-implement`. Exact case match confirmed against AC #3.
- Merge-rule manual inspection per AC #16: upstream 7 codes (DS, QD, QA, CR, SP, CS, ER) + project override 2 codes (CS, DS) = resolved 7 (DS→clickup-dev-implement, QD→upstream, QA→upstream, CR→upstream, SP→upstream, CS→clickup-create-story, ER→upstream). Zero drift in count; two substitutions; five pass-throughs.
- `_bmad/scripts/resolve_customization.py` confirmed absent (`find` returned nothing under `_bmad/scripts/`); fell back to manual inspection path per AC #16 and story Dev Notes.

### Completion Notes List

- AC #1 — `_bmad/custom/bmad-agent-dev.toml` contains exactly two `[[agent.menu]]` blocks (CS, DS) matching the spec byte-for-byte. Header broadened; second `# See:` pointer appended. ✓
- AC #2 — `code = "DS"` matches upstream entry. No divergence. ✓
- AC #3 — `skill = "clickup-dev-implement"` matches `name` key in `src/custom-skills/clickup-dev-implement/SKILL.md`. ✓
- AC #4 — `bmad({ operation: "read", workflow: "clickup-dev-implement" })` returns concatenated SKILL.md + workflow.md content with all expected headings. ✓
- AC #5 — `git diff` shows exactly: (a) replaced routing line, (b) appended `# See:` line, (c) appended DS block + blank separator, (d) zero other edits. CS block byte-unchanged. ✓
- AC #6–#11 — All protected-path diffs empty (resource-loader, lite-resource-loader.test, src/\*_/_.ts, BMAD-METHOD/, src/tools/clickup/, src/custom-skills/). ✓
- AC #12 — `.gitignore` byte-unchanged. ✓
- AC #13 — `npm run build` clean; `npm run lint` 0 errors (7 pre-existing warnings in `tests/support/litellm-helper.mjs` unchanged); `npm run format` clean on TOML (prettier has no TOML parser by design) and on `planning-artifacts/sprint-status.yaml`; `npm test` 234 passing / 0 failing (baseline preserved vs. story 3.8 merge commit). ✓
- AC #14 — Vendor-tree exclusions unchanged. ✓
- AC #15 — `git diff --stat -- _bmad/` shows only `_bmad/custom/bmad-agent-dev.toml`. No personal-override file committed. ✓
- AC #16 — Manual merge inspection: 7 upstream + 2 overrides → 7 resolved (DS and CS substituted; QD/QA/CR/SP/ER pass through). ✓

Environment note: `npm run cli:list-workflows` helper script in `scripts/show-list-workflows.mjs` hardcodes the legacy tool name `bmad-resources` and returns `MCP error -32602: Tool bmad-resources not found`. This is a pre-existing repo issue unrelated to this story — the unified tool name is `bmad`. Verification via `scripts/bmad-cli.mjs tools/call '{"name":"bmad","arguments":{"operation":"read","workflow":"clickup-dev-implement"}}'` succeeded and covered AC #4.

### File List

**New**

- (none)

**Modified**

- `_bmad/custom/bmad-agent-dev.toml` — appended second `[[agent.menu]]` block for DS trigger → `clickup-dev-implement` (AC #1–#3, #5)

**Deleted**

- (none)

### Review Findings

Code review 2026-04-23 via `bmad-code-review` (Blind Hunter + Edge Case Hunter + Acceptance Auditor). Acceptance Auditor confirmed all 16 ACs satisfied. Triage: 0 decision-needed, 0 patch, 2 defer, 7 dismissed (spec-mandated or verified).

- [x] [Review][Defer] `findBmmSkillsRoot` probe order would shadow `src/custom-skills/` if anyone later adds `src/bmm-skills/` [src/core/resource-loader.ts] — deferred, pre-existing from story 2.7; no path added by 3-9 changes the risk.
- [x] [Review][Defer] `BMAD_GIT_AUTO_UPDATE=true` window: upstream rename of the `DS` code would silently convert this override from "replace" into "append new code" [_bmad/custom/bmad-agent-dev.toml] — deferred, broader platform concern already flagged in story 3-9 Out of Scope ("CI check that flags any future edit to upstream BMAD-METHOD source files").

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-23 | Story drafted from EPIC-3 bullet 9 via `bmad-create-story` workflow. Status → ready-for-dev.                                                                                                                                                                                                                                                                                                 |
| 2026-04-23 | Validation pass (`bmad-create-story` checklist): promoted the header-comment update from Out of Scope → AC #1 and AC #5 so the file's docstring stays in sync with its routing (E1); added `npm run cli:list-workflows` as a terminal-friendly verification step to Task 2 (E2); added a Dev Notes section + commit-body sentence framing 3.9 as the final EPIC-3 implementation story (E3). |
| 2026-04-23 | Implementation complete via `bmad-dev-story`: appended DS `[[agent.menu]]` block to `_bmad/custom/bmad-agent-dev.toml` routing DS → `clickup-dev-implement`; broadened header routing line + appended second `# See:` pointer; CS block byte-unchanged. Build, lint, prettier, and test gates all green (234 passing, 0 failing — baseline preserved). Status → review.                      |
| 2026-04-23 | Code review complete via `bmad-code-review` (Blind Hunter + Edge Case Hunter + Acceptance Auditor). All 16 ACs confirmed satisfied by the Auditor. Triage: 0 decision-needed, 0 patch, 2 defer (pre-existing cross-story concerns — `findBmmSkillsRoot` probe ordering and upstream auto-update drift window — both filed in `deferred-work.md`), 7 dismissed. Status → done.                |
