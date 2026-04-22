# Story 2.7: Wire `_bmad/custom/bmad-agent-dev.toml` to route Dev agent's `CS` trigger to `clickup-create-story`

Status: code-review

Epic: [EPIC-2: Dev agent story-creation mode → ClickUp (non-destructive)](../epics/EPIC-2-dev-story-creation-clickup.md)

> Fills the `config.toml` wiring deferred by stories 2.1–2.6. Two deliverables land together:
>
> 1. **TOML override** — `_bmad/custom/bmad-agent-dev.toml` replaces the Dev agent's `CS` menu entry to route to `clickup-create-story`.
> 2. **Resource loader patch** — `src/core/resource-loader.ts` extends `findBmmSkillsRoot` to scan `src/custom-skills/` (and the generic `custom-skills/`) so the `bmad` tool can resolve `clickup-create-story` at runtime.
>
> Without the resource loader patch, `bmad({ operation: "read", workflow: "clickup-create-story" })` throws `"Workflow not found"` even with the TOML override in place — because the MCP server's scan only covers `src/bmm-skills` and `bmm-skills` paths today. The TOML wiring and the discoverability fix are therefore a single atomic unit.
>
> **Depends on stories 2.1 through 2.6 completing first.** The skill being wired must be fully implemented before the routing is activated. Do not start implementation until story 2.6 is merged.

## Story

As the **bmad-mcp-server platform maintainer**,
I want (a) a project-local BMAD override file `_bmad/custom/bmad-agent-dev.toml` that replaces the Dev agent's `CS` menu entry with `skill = "clickup-create-story"`, and (b) `src/core/resource-loader.ts` extended to scan `src/custom-skills/` as an additional skill source,
so that invoking the Dev agent in story-creation mode (`CS` trigger) routes end-to-end to the `clickup-create-story` skill — matching PRD §Functional requirements #2 ("Dev agent, invoked in story-creation mode (`CS` trigger), creates ClickUp tasks with rich, PRD+architecture-derived descriptions") and PRD §FR #7 ("All customizations live in a separate `custom-skills/` layer wired via `config.toml`") — without modifying any upstream BMAD-METHOD source file.

## Acceptance Criteria

1. `_bmad/custom/bmad-agent-dev.toml` exists in the repo root. It MUST:
   - Contain exactly one `[[agent.menu]]` block:
     ```toml
     [[agent.menu]]
     code = "CS"
     description = "Create a ClickUp story as a subtask of a chosen epic in the active sprint list"
     skill = "clickup-create-story"
     ```
   - Contain no other TOML keys, sections, or `[[agent.menu]]` blocks — only the CS override, to minimize drift risk from future upstream changes.
   - Include a short comment header:
     ```toml
     # Project-local Dev agent override.
     # Routes the CS (story-creation) trigger to the custom ClickUp skill.
     # Merge rule (BMAD): [[agent.menu]] entries keyed by `code` replace
     # matching upstream entries and new codes append.
     # See: src/custom-skills/clickup-create-story/
     ```

2. The `code = "CS"` entry in `_bmad/custom/bmad-agent-dev.toml` MUST match the `code` value used in the upstream `customize.toml`. Confirm by reading `~/.bmad/cache/git/github.com-Alpharages-BMAD-METHOD-main/src/bmm-skills/4-implementation/bmad-agent-dev/customize.toml` — as of 2026-04-22 the upstream CS entry is `skill = "bmad-create-story"`. Record any divergence in the Dev Agent Record.

3. `src/core/resource-loader.ts` — the `findBmmSkillsRoot` private method MUST be updated to extend its search array with `'src/custom-skills'` and `'custom-skills'`. The method signature is unchanged; only the array literal widens:

   **Before:**

   ```typescript
   for (const rel of ['src/bmm-skills', 'bmm-skills']) {
   ```

   **After:**

   ```typescript
   for (const rel of ['src/bmm-skills', 'bmm-skills', 'src/custom-skills', 'custom-skills']) {
   ```

   No other lines in `resource-loader.ts` change. This one-line extension is sufficient because:
   - `loadWorkflow` already calls `findBmmSkillsRoot(this.paths.projectRoot)` in its bmm-skills fallback (line ~851).
   - `listWorkflows` already calls `findBmmSkillsRoot(this.paths.projectRoot)` for the project bmm-skills scan (line ~1203).
   - `scanBmmSkills` already stops recursion at a directory that owns a `SKILL.md` and registers non-`bmad-agent-*` directories as workflow skills by directory name.
   - `loadBmmSkillContent` already concatenates `workflow.md` when present alongside `SKILL.md`.
   - Together, these existing behaviours mean `clickup-create-story` is found, loaded, and served as a workflow once `findBmmSkillsRoot` returns `src/custom-skills`.

4. `tests/unit/lite-resource-loader.test.ts` MUST include a new test case verifying that a `src/custom-skills/{name}/SKILL.md` layout is discoverable:

   ```typescript
   it('should load a workflow from src/custom-skills layout', async () => {
     // arrange
     const customSkillDir = join(
       testDir,
       'src',
       'custom-skills',
       'my-custom-skill',
     );
     mkdirSync(customSkillDir, { recursive: true });
     writeFileSync(
       join(customSkillDir, 'SKILL.md'),
       '---\nname: my-custom-skill\n---\n# My Custom Skill',
     );
     const customLoader = new ResourceLoaderGit(testDir);
     // act
     const resource = await customLoader.loadWorkflow('my-custom-skill');
     // assert
     expect(resource.name).toBe('my-custom-skill');
     expect(resource.content).toContain('My Custom Skill');
     expect(resource.source).toBe('project');
   });
   ```

   The test name, arrange/act/assert structure, and assertions MUST match this template exactly so the pattern is consistent with the existing test suite.

5. After the changes in AC #3 land, calling `loadWorkflow('clickup-create-story')` on a `ResourceLoaderGit` instance whose `projectRoot` is the bmad-mcp-server repo root MUST return a resource whose `content` includes the text from `src/custom-skills/clickup-create-story/SKILL.md`. Verify this manually or via the unit test in AC #4 (same mechanism, different skill name).

6. `.gitignore` MUST contain a rule that excludes personal override files from version control. Add the following entry to `.gitignore` (after existing entries, under a new comment):

   ```
   # _bmad personal overrides (team overrides in _bmad/custom/*.toml are committed)
   _bmad/custom/*.user.toml
   ```

   No other `.gitignore` rules change.

7. No files under `BMAD-METHOD/` are created, modified, or deleted. `git diff --stat -- BMAD-METHOD/` MUST be empty.
8. No files under `src/tools/clickup/` are created, modified, or deleted. `git diff --stat -- src/tools/clickup/` MUST be empty.
9. Only the following files change outside `_bmad/` and `.gitignore`:
   - `src/core/resource-loader.ts` — one-line change to `findBmmSkillsRoot` (AC #3).
   - `tests/unit/lite-resource-loader.test.ts` — one new test case (AC #4).
     No other TypeScript or source files are added or modified.
10. `npm run build` → clean. `npm run lint` → 0 errors (pre-existing `no-console` warnings in `tests/support/litellm-helper.mjs` unchanged; no new findings). `npm run format` → no diff. `npm test` → passing count increases by exactly 1 (the new test from AC #4).
11. The vendor-tree exclusions from story 1.1 remain byte-unchanged: `.gitignore` rule `!src/tools/clickup/**`, `tsconfig.json#exclude`, `eslint.config.mjs` `ignores`, `.eslintignore`, `.prettierignore`, and `tests/unit/dependency-audit.test.ts` `VENDORED_PATHS`. Verify the new `.gitignore` entry does not interact with or remove the `!src/tools/clickup/**` rule.

## Out of Scope (explicitly deferred to later stories)

- Regression check that upstream `bmad-create-story` still works in isolation → **story 2.8**.
- Token-permission gating (explicit check that `CLICKUP_API_KEY` has create-task permission before attempting creation) → **story 2.9**.
- `_bmad/scripts/resolve_customization.py` setup — the Dev agent SKILL.md attempts to run this script and falls back to manual TOML resolution if absent. Creating or maintaining the resolver script is out of scope.
- `_bmad/bmm/config.yaml` (loaded by Step 5 of the Dev agent activation) — a separate project-configuration concern unrelated to the CS-trigger routing.
- Adding `_bmad/` to ESLint or Prettier ignore lists — TOML files are not processed by either tool.
- User-scoped personal override (`_bmad/custom/bmad-agent-dev.user.toml`) — adding the gitignore pattern is in scope (AC #6); creating the file is not.
- Supporting projects that have both `src/bmm-skills` and `src/custom-skills`: `findBmmSkillsRoot` returns the first match; a project with both would prioritize `src/bmm-skills` and miss `src/custom-skills`. Handling this edge case (returning multiple roots) is a future refactor.
- Fuzzy routing or conditional routing by project type — the CS override is unconditional.

## Tasks / Subtasks

- [ ] **Task 1 — Create `_bmad/custom/bmad-agent-dev.toml` (AC: #1, #2)**
  - [ ] Create `_bmad/` and `_bmad/custom/` directories (neither exists — confirm with `ls _bmad/`; `mkdir -p _bmad/custom`).
  - [ ] Create `_bmad/custom/bmad-agent-dev.toml` with the comment header and exactly one `[[agent.menu]]` block as specified in AC #1.
  - [ ] Verify `code = "CS"` matches the upstream entry in `~/.bmad/cache/git/github.com-Alpharages-BMAD-METHOD-main/src/bmm-skills/4-implementation/bmad-agent-dev/customize.toml`. Record any divergence in the Dev Agent Record.
  - [ ] Confirm `skill = "clickup-create-story"` matches the `name` key in `src/custom-skills/clickup-create-story/SKILL.md` exactly (case-sensitive).

- [ ] **Task 2 — Patch `findBmmSkillsRoot` in `resource-loader.ts` (AC: #3, #5)**
  - [ ] Open `src/core/resource-loader.ts`.
  - [ ] Locate the `findBmmSkillsRoot` private method (currently near line 371). Find the for-loop array literal `['src/bmm-skills', 'bmm-skills']`.
  - [ ] Extend it to `['src/bmm-skills', 'bmm-skills', 'src/custom-skills', 'custom-skills']`.
  - [ ] Confirm no other lines in the file change (`git diff src/core/resource-loader.ts` MUST show a single array literal change).
  - [ ] Run `npm run build` to confirm the change compiles cleanly.

- [ ] **Task 3 — Add unit test for custom-skills discoverability (AC: #4)**
  - [ ] Open `tests/unit/lite-resource-loader.test.ts`.
  - [ ] Add the new test case from AC #4 inside the existing `describe('ResourceLoader (Lite)', ...)` block, after the existing workflow tests.
  - [ ] Confirm the test passes: `npm run test:unit -- --reporter=verbose --testNamePattern="custom-skills"` (or equivalent).
  - [ ] Confirm total test count increases by exactly 1 vs. the story 2.6 baseline.

- [ ] **Task 4 — Add personal-override gitignore rule (AC: #6, #11)**
  - [ ] Open `.gitignore` and append the `# _bmad personal overrides` section with the `_bmad/custom/*.user.toml` rule.
  - [ ] Verify the new rule does not appear before or interact with the `!src/tools/clickup/**` negation rule from story 1.1.

- [ ] **Task 5 — Verify regression-free (AC: #7–#11)**
  - [ ] `git diff --stat -- BMAD-METHOD/` → empty.
  - [ ] `git diff --stat -- src/tools/clickup/` → empty.
  - [ ] `git diff -- .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty.
  - [ ] `git diff -- .gitignore` → shows only the new `# _bmad personal overrides` section; `!src/tools/clickup/**` rule is intact.
  - [ ] `npm run build` → clean.
  - [ ] `npm run lint` → 0 errors. Pre-existing warnings unchanged.
  - [ ] `npm run format` → no diff.
  - [ ] `npm test` → passes; count is exactly 1 higher than story 2.6 baseline.

- [ ] **Task 6 — Commit (AC: all)**
  - [ ] Stage in this order: `src/core/resource-loader.ts`, `tests/unit/lite-resource-loader.test.ts`, `_bmad/custom/bmad-agent-dev.toml`, `.gitignore`.
  - [ ] Commit message: `feat(config): wire Dev agent CS trigger to clickup-create-story`
  - [ ] Body:

    ```
    Add _bmad/custom/bmad-agent-dev.toml with a single [[agent.menu]] override
    that replaces the upstream CS entry (skill = "bmad-create-story") with
    skill = "clickup-create-story". BMAD's merge rule for arrays-of-tables
    keyed by `code` replaces the matching upstream entry, so no other Dev
    agent menu items are affected.

    Extend findBmmSkillsRoot in resource-loader.ts to scan src/custom-skills/
    (and custom-skills/) in addition to the existing src/bmm-skills / bmm-skills
    paths. Without this change, bmad({ operation: "read", workflow:
    "clickup-create-story" }) throws "Workflow not found" even with the TOML
    override in place — the MCP server's bmm-skills fallback never found the
    skill in src/custom-skills/. loadBmmSkillContent already handles workflow.md
    concatenation, so no other loader changes are needed.

    Add one unit test verifying the src/custom-skills layout is discoverable
    via loadWorkflow.

    Also adds _bmad/custom/*.user.toml to .gitignore so personal override
    files are not accidentally committed.

    Out of scope (deferred): upstream bmad-create-story regression check (2.8),
    token-permission gating (2.9).

    Refs: EPIC-2, story 2-7-config-toml-wiring.
    ```

## Dev Notes

### Why two deliverables land together

The TOML override and the resource loader patch are logically separable but operationally atomic: neither is useful without the other.

- TOML alone: the Dev agent menu says `skill = "clickup-create-story"` but the `bmad` MCP tool returns `"Workflow not found: clickup-create-story"` when the agent tries to load it. The routing silently fails.
- Patch alone: `clickup-create-story` becomes discoverable via `bmad({ operation: "read", workflow: "clickup-create-story" })` but no agent menu entry routes to it.

Splitting into separate commits (or PRs) would leave the codebase in a half-wired state between merges. A single atomic commit keeps the changelog clean.

### BMAD customization merge rules

The Dev agent (`bmad-agent-dev`) SKILL.md specifies the following override chain for the `agent` block:

1. `{skill-root}/customize.toml` — upstream defaults
2. `{project-root}/_bmad/custom/bmad-agent-dev.toml` — **team overrides** (this story)
3. `{project-root}/_bmad/custom/bmad-agent-dev.user.toml` — personal overrides (gitignored)

Merge rules (from upstream SKILL.md):

- Scalars: project override wins.
- `arrays (persistent_facts, principles, activation_steps_*)`: append.
- **`arrays-of-tables` with `code`/`id` keys: replace matching entry, append new ones.**

The third rule is critical: `[[agent.menu]]` with `code = "CS"` in the project override replaces the upstream `CS` entry. All other menu items (`DS`, `QD`, `QA`, `CR`, `SP`, `ER`) remain from the upstream `customize.toml` unchanged.

### `findBmmSkillsRoot` change and its scope

`findBmmSkillsRoot` returns the **first** matching path. The search order `['src/bmm-skills', 'bmm-skills', 'src/custom-skills', 'custom-skills']` means:

- The official BMAD-METHOD git cache (which has `src/bmm-skills`) is unaffected.
- The bmad-mcp-server project root (which has `src/custom-skills` but NOT `src/bmm-skills`) now returns `src/custom-skills`.

**Known limitation:** a project with both `src/bmm-skills` and `src/custom-skills` would have `src/bmm-skills` take priority, and `src/custom-skills` would be invisible to `findBmmSkillsRoot`. This is deferred (see Out of Scope).

`loadBmmSkillContent` already handles `workflow.md` concatenation: it reads `SKILL.md`, checks for a sibling `workflow.md`, and appends it if found (resource-loader.ts `~line 431`). `clickup-create-story` has both; both will be included in the loaded content. No change needed to that method.

### Effect on `loadWorkflow` and `listWorkflows`

Both already call `findBmmSkillsRoot(this.paths.projectRoot)` in their bmm-skills fallback sections (lines ~851 and ~1203 respectively). With the one-line fix, both will now find and register `clickup-create-story`. `listWorkflows` will include it in the sorted workflow list; `loadWorkflow('clickup-create-story')` will return it. No other changes needed.

### `_bmad/` directory and `detectPathType`

After story 2.7 creates `_bmad/`, `detectPathType(projectRoot)` descends into `_bmad/` and `getProjectBmadPath()` returns `{ bmadRoot: '_bmad/' }`. This affects the primary `loadWorkflow` candidates (they look in `_bmad/workflows/...`), but those paths don't exist so the loader falls through to the bmm-skills fallback. The bmm-skills fallback always uses `this.paths.projectRoot` (not `_bmad/`), so it is unaffected by the `_bmad/` detection.

### Resolve script fallback

The Dev agent SKILL.md instructs the agent to run `python3 {project-root}/_bmad/scripts/resolve_customization.py`. If absent, the SKILL.md documents a fallback (manual TOML merge). Creating this script is out of scope.

### File naming: why `bmad-agent-dev.toml`

The override file MUST be named `bmad-agent-dev.toml` — the `{skill-name}` placeholder in the SKILL.md resolves to the skill directory's basename (`bmad-agent-dev`). Any misspelling causes the file to be silently skipped.

### Step file naming convention (for reference)

| Step file                         | Created by story | Execution order |
| --------------------------------- | ---------------- | --------------- |
| `step-01-prereq-check.md`         | 2.2              | 1               |
| `step-02-epic-picker.md`          | 2.3              | 2               |
| `step-03-sprint-list-picker.md`   | 2.4              | 3               |
| `step-04-description-composer.md` | 2.5              | 4               |
| `step-05-create-task.md`          | 2.6              | 5               |

Story 2.7 adds no step files — the routing is handled at the project TOML layer, not inside the skill workflow.

### References

- [PRD §Functional requirements #2](../PRD.md) — "Dev agent, invoked in story-creation mode (`CS` trigger), creates ClickUp tasks."
- [PRD §Functional requirements #7](../PRD.md) — "All customizations live in a separate `custom-skills/` layer wired via `config.toml`."
- Upstream Dev agent SKILL.md — `~/.bmad/cache/git/.../bmad-agent-dev/SKILL.md` — override chain, merge rules, resolver fallback.
- Upstream Dev agent `customize.toml` — CS entry (`skill = "bmad-create-story"`) confirmed 2026-04-22.
- `src/core/resource-loader.ts` — `findBmmSkillsRoot` (~line 371), `loadWorkflow` bmm-skills fallback (~line 851), `listWorkflows` project scan (~line 1203), `loadBmmSkillContent` workflow.md concatenation (~line 431).
- `tests/unit/lite-resource-loader.test.ts` — existing test file where the new test case lands.
- `src/custom-skills/README.md` — "Wiring is per-agent via `customize.toml` — see story 2-7."
- [Story 2.6 §Out of Scope](./2-6-create-clickup-task.md) — confirms `customize.toml` wiring deferred to this story.
- [EPIC-2 §Outcomes](../epics/EPIC-2-dev-story-creation-clickup.md) — "`config.toml` routes the Dev agent's `CS` invocation to the new skill."

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Amelia — Senior Software Engineer)

### Debug Log References

- Upstream CS entry confirmed as `skill = "bmad-create-story"` from `~/.bmad/cache/git/github.com-Alpharages-BMAD-METHOD-main/src/bmm-skills/4-implementation/bmad-agent-dev/customize.toml` on 2026-04-22. No divergence from story AC #2.
- `SKILL.md` name key confirmed as `clickup-create-story` (exact match, case-sensitive).
- `findBmmSkillsRoot` located at `src/core/resource-loader.ts:372` — single array literal change.
- Build: clean. Lint: 0 errors, 7 pre-existing warnings (all in `tests/support/litellm-helper.mjs`). Tests: 233 passed (+1 from baseline of 232).

### Completion Notes List

- All 6 tasks completed. Commit `adb0ec8` on branch `feat/1-2-wire-register-functions`.
- AC #1–#11 verified. No files under `BMAD-METHOD/` or `src/tools/clickup/` changed.
- `!src/tools/clickup/**` negation rule intact; new `.user.toml` rule appended after it.

### File List

**New**

- `_bmad/custom/bmad-agent-dev.toml` — project-local Dev agent override: CS menu entry routes to `clickup-create-story` (AC #1–#2)

**Modified**

- `src/core/resource-loader.ts` — `findBmmSkillsRoot` extended to scan `src/custom-skills/` and `custom-skills/` (AC #3)
- `tests/unit/lite-resource-loader.test.ts` — new test case for `src/custom-skills` layout discoverability (AC #4)
- `.gitignore` — adds `_bmad/custom/*.user.toml` personal-override exclusion rule (AC #6)

**Deleted**

- (none)

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-22 | Story drafted from EPIC-2 bullet 8 via `bmad-create-story` workflow. Status → ready-for-dev.                                                                                                                                                                                                                                                                     |
| 2026-04-22 | Validation pass: discovered that `findBmmSkillsRoot` in `resource-loader.ts` only scans `src/bmm-skills` and `bmm-skills` — `src/custom-skills/` is invisible to both `loadWorkflow` and `listWorkflows`. Added AC #3 (TypeScript patch), AC #4 (unit test), Task 2, Task 3; removed "no TypeScript" restriction; updated commit body, Dev Notes, and File List. |
