# Story 1.7: Document the ClickUp tool surface (README / CHANGELOG / .env.example / docs / VENDOR)

Status: ready-for-dev

Epic: [EPIC-1: ClickUp MCP integration layer](../epics/EPIC-1-clickup-mcp-integration.md)

> Final story in EPIC-1. Stories 1.1 (vendor) and 1.2 (wire `register*Tools` into our `McpServer`) landed on `main`; the tool surface is live but `grep -ri "clickup" README.md CHANGELOG.md docs/ .env.example` returns zero hits. Stories 1.3 (env-var validation), 1.4 (space picker), 1.5 (CRUD smoke test), 1.6 (cross-list parent/subtask smoke test) are drafted-but-unimplemented. This story documents the **tested, landed surface** for a new user pointing an MCP client at the hosted server — so Task 1 verifies each prereq story's `Completion Notes List` before writing prose about behavior those stories will deliver.

## Story

As the **bmad-mcp-server platform maintainer**,
I want the live ClickUp tool surface — 13 tools across three `CLICKUP_MCP_MODE` tiers, the `clickup://space/{spaceId}` resource template, the `my-todos` MCP prompt, six env vars (`CLICKUP_API_KEY`, `CLICKUP_TEAM_ID`, `CLICKUP_MCP_MODE`, `CLICKUP_PRIMARY_LANGUAGE`, `MAX_IMAGES`, `MAX_RESPONSE_SIZE_MB`), the story-1.4 space-picker UX, and the story-1.6 cross-list subtask behavior — documented in `README.md`, `CHANGELOG.md`, `.env.example`, `docs/architecture.md`, `docs/api-contracts.md`, `docs/development-guide.md`, `docs/index.md`, and `VENDOR.md`,
so that a new adopter can (a) discover the tool surface without reading the vendored tree, (b) pick a `CLICKUP_MCP_MODE` matching their threat model, (c) understand the epic→subtask convention this repo enforces per [PRD §ClickUp layout](../PRD.md), and (d) re-vendor upstream later using the authoritative upgrade procedure — all without any edits to the vendored tree (`src/tools/clickup/**`) or to BMAD-METHOD.

## Acceptance Criteria

1. **README.md gains a new section `## ClickUp Integration`** placed **after the `## Docker Deployment` block ends** (i.e., after the `### Resource Discovery Priority` subsection at current line 488, and **before** `## Documentation` at current line 492). Rationale for this placement: `### Resource Discovery Priority` is a subsection _of_ Docker Deployment (it's an `###`, not a sibling `##`), so inserting between them would orphan it from its parent. Verify current line numbers before editing; insert at the `---` separator just above `## Documentation`.
   1.1. Add `[ClickUp Integration](#clickup-integration)` to the header nav badge row (currently `[Features] • [Installation] • [Docker Deployment] • [Usage] • [Documentation]` at around line 10).
   1.2. Section contents, in order:
   - One-paragraph intro: ClickUp is additive (the `bmad` unified tool still works); enabled when both `CLICKUP_API_KEY` and `CLICKUP_TEAM_ID` are set; tool visibility depends on `CLICKUP_MCP_MODE`; when either env var is missing the server logs `ClickUp tools disabled: ...` and keeps running BMAD-only.
   - **Env-var table** with the six vars from AC #3 (same names, same order).
   - **Mode-to-tools table** per AC #2.
   - **Example client config** block for Claude Desktop (JSON), using `CLICKUP_MCP_MODE=read` as the default — safer than `write` for first-run.
   - **Docker env-var pass-through** — one-paragraph callout showing the same three env vars in `docker-compose.yml`'s `environment:` map (the existing `## Docker Deployment` section already explains the broader docker setup; this callout just shows ClickUp-specific keys appended to that block). Cross-link to `## Docker Deployment` above.
   - **Space selection** subsection, 3–5 sentences describing the story-1.4 space-picker UX verbatim from story 1.4's Completion Notes (Task 1 extracts this).
   - **Cross-list parent/subtask** subsection, 2–3 sentences: stories live in the active Sprint list while their parent epic lives in the Backlog list; one link to the story-1.6 smoke-test evidence.
   - **`my-todos` prompt** one-sentence callout: ClickUp adds a German/English MCP prompt for triaging assigned tasks; language follows `CLICKUP_PRIMARY_LANGUAGE` or `$LANG`.
   - **Not supported (this phase)** subsection, 3–5 bullets pointing at [PRD §Non-goals](../PRD.md): Jira/Linear, custom fields, bidirectional sync, historical migration.

2. **Mode → tool table** must match the adapter source exactly. Verify against `src/tools/clickup-adapter.ts` lines 181–229 before committing — the adapter dispatches by mode and pushes tool names incrementally via the `step()` helper. Expected rows (top-to-bottom, narrowest mode first):

   | Mode              | Tools registered                                                                                                                       | Resource template           | Notes                               |
   | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------- |
   | `read-minimal`    | `getTaskById`, `searchTasks`                                                                                                           | _(none)_                    | `registerSpaceResources` not called |
   | `read`            | `getTaskById`, `searchTasks`, `searchSpaces`, `getListInfo`, `getTimeEntries`, `readDocument`, `searchDocuments`                       | `clickup://space/{spaceId}` | adds space/list/time/doc reads      |
   | `write` (default) | above plus `addComment`, `updateTask`, `createTask`, `updateListInfo`, `createTimeEntry`, `updateDocumentPage`, `createDocumentOrPage` | `clickup://space/{spaceId}` | 13 tools total                      |

   One-line note below the table: "`.trim().toLowerCase()` normalization accepts `"  Read  "` as `read`; unknown values fall through to `write` with a `stderr` warning."

3. **`.env.example` gains a ClickUp block** below the existing BMAD four lines. Shape:

   ```
   PORT=3000
   BMAD_API_KEY=your-secret-api-key-here
   BMAD_ROOT=
   BMAD_DEBUG=false

   # ClickUp (optional — set both API key + team ID to enable)
   # Personal token from https://app.clickup.com/settings/apps
   CLICKUP_API_KEY=
   # Workspace (team) ID, team-shared
   CLICKUP_TEAM_ID=
   # Tool surface scope: read-minimal | read | write. Default: write.
   # CLICKUP_MCP_MODE=read
   # Tool-description language: de | en | fr | es | it. Falls back to $LANG.
   # CLICKUP_PRIMARY_LANGUAGE=en
   # Max inline images per tool response (default 4)
   # MAX_IMAGES=4
   # Max response payload in MB (default 1)
   # MAX_RESPONSE_SIZE_MB=1
   ```

   The three optional env vars are left commented-out so a blind copy of `.env.example → .env` matches the default behavior. Source-of-truth reference for every variable is `src/tools/clickup/src/shared/config.ts` lines 1–72.

4. **CHANGELOG.md gains an `[Unreleased]` section** prepended above the existing `# [4.0.0] (TBD)` header. Keep the existing v4.0 section untouched. The new section uses the repo's existing CHANGELOG format (hand-edited — `.releaserc.json` runs semantic-release but this section is human prose about the epic, consistent with how the v4.0 section was authored). Exact shape:

   ```markdown
   # [Unreleased]

   ### Features

   - ClickUp MCP tools integrated alongside the unified `bmad` tool (EPIC-1). Vendored from `hauptsacheNet/clickup-mcp` — see `VENDOR.md` for upstream SHA and upgrade procedure.
   - Tool surface scales with `CLICKUP_MCP_MODE`: `read-minimal` (2 tools), `read` (7 tools), `write` (13 tools, default). Unknown or missing mode values default to `write` with a `stderr` warning.
   - Session-scoped ClickUp space picker — first interaction per session caches the chosen space; cache resets on process restart.
   - Cross-list parent/subtask behavior verified: stories live in the active Sprint list while their parent epic lives in the Backlog list.
   - `my-todos` MCP prompt added (German/English; follows `CLICKUP_PRIMARY_LANGUAGE` or `$LANG`).
   - New env vars documented in `.env.example` and `README.md`: `CLICKUP_API_KEY`, `CLICKUP_TEAM_ID`, `CLICKUP_MCP_MODE`, `CLICKUP_PRIMARY_LANGUAGE`, `MAX_IMAGES`, `MAX_RESPONSE_SIZE_MB`.
   ```

   No `### Bug Fixes`, `### BREAKING CHANGES`, or per-story bullets. One reader-facing entry.

5. **VENDOR.md is updated**, not rewritten. The current file (`c79b21e3f77190a924ef8e2c9ba3dd8088369e17`, dated `2026-04-21`, sections `### What was vendored` / `### What was deliberately excluded` / `### Upstream runtime dependencies` / `### Upgrade procedure`) is factually correct. The current §Upgrade procedure baseline (lines 50–74) is:

   > 1. Capture the new SHA: `SHA=$(git ls-remote https://github.com/hauptsacheNet/clickup-mcp.git HEAD | cut -f1)`
   > 2. Re-run the vendor steps from Story 1.1 (shallow clone at `$SHA`, copy `src/`, `LICENSE`, `README.md`, remove scratch).
   > 3. Update this file: new SHA, new date, refreshed runtime-deps block.
   > 4. Re-run `npm run build` / `npm run lint` / `npm run format` / `npm test` to confirm nothing regressed. **If the register-tools surface changed, reconcile the adapter in `src/server.ts` (Story 1.3's territory).** ← fix target for AC #5.1
   > 5. After re-vendoring, re-run `npm run build` to confirm **`scripts/build-clickup.mjs` (esbuild bundler)** still accepts the new upstream tree. If upstream adds a new `register*Tools` function, wire it into `src/tools/clickup-adapter.ts` per the existing mode-dispatch pattern. ← verify target for AC #5.2
   > 6. Commit with `ALLOW_VENDOR_EDIT=1` to bypass the pre-commit guard.

   Required edits:
   5.1. **§Upgrade procedure step 4** — the bolded clause above is wrong on two counts: (a) the adapter lives at `src/tools/clickup-adapter.ts`, not in `src/server.ts`; (b) adapter reconciliation was story 1.2's scope, not 1.3's (1.3 is env-var validation). Rewrite to: "If the register-tools surface changed, reconcile the adapter at `src/tools/clickup-adapter.ts` (story 1.2 established the dispatch pattern)."
   5.2. **§Upgrade procedure step 5** — the bolded clause above references `scripts/build-clickup.mjs` (esbuild). Verify against `package.json`'s `build` script: if story 1.2 actually landed with Option A (esbuild), the reference stands. If it landed with Option B (secondary `tsconfig.clickup.json` + `scripts/fix-esm-imports.mjs` codemod), rewrite to cite the actual compile path. Read `package.json` and inspect `scripts/` before editing.
   5.3. **Add a new `### What our adapter does on top`** subsection between §"Upstream runtime dependencies" and §"Upgrade procedure". 4–6 bullets, no more:
   - Our adapter at `src/tools/clickup-adapter.ts` dynamic-imports the vendored tree only when both env vars are present (avoids upstream's module-eval throw at `src/tools/clickup/src/shared/config.ts:70`).
   - Upstream's own `initializeServer()` bootstrap in `src/tools/clickup/src/index.ts` is never called — our adapter dispatches the individual `register*Tools` functions directly, respecting `CLICKUP_MCP_MODE`.
   - The upstream `my-todos` prompt is re-registered by our adapter (lines 108–151) via `server.prompt(...)`; upstream's own `registerPrompt` call is bypassed because `initializeServer()` is bypassed.
   - Mode-dispatch logic lives in the adapter; upstream's mode dispatch in `src/tools/clickup/src/index.ts:101–128` is dead code in our build.
   - `userData` and space-index pre-fetch failures are caught and surfaced as `prefetchError` in the `RegisterResult` return value; tool registration proceeds with `undefined` user data rather than crashing startup.
     5.4. Add a one-line §Usage pointer below the existing sections: `**User-facing setup:** see [README.md §ClickUp Integration](./README.md#clickup-integration).`

6. **`docs/architecture.md` gains a `## ClickUp Adapter Layer` section** at the end of the document (after whatever the current last section is). Required contents:
   - One paragraph: the adapter is a dispatch shim at `src/tools/clickup-adapter.ts` that dynamic-imports the vendored tree when `CLICKUP_API_KEY + CLICKUP_TEAM_ID` are present. Dynamic import is load-bearing because `src/tools/clickup/src/shared/config.ts:70` throws at module-evaluation time when env vars are absent — a static import chain would crash BMAD-only usage.
   - 5–8 line ASCII diagram: `BMADServerLiteMultiToolGit → start() → registerClickUpTools(server) → dynamic import('./clickup/src/tools/*.js') → upstream register*Tools(server, userData) → server.tool(...)`.
   - One paragraph explaining: the adapter re-registers the upstream `my-todos` MCP prompt itself (lines 108–151) rather than calling upstream's `initializeServer()`, because `initializeServer()` constructs its own `McpServer` which would shadow ours.
   - One paragraph on the mode-dispatch duplication (README table + adapter `step()` calls), flagged as known duplication; auto-generation is [out of scope](#out-of-scope-explicitly-deferred).

7. **`docs/api-contracts.md` gains a `## ClickUp Tools` section.** Structure: a short intro paragraph, then one subsection per tool (13 total). Each subsection MUST include name, required mode (`read-minimal` / `read` / `write`), one-sentence purpose, input-schema field list (names + types + required/optional), return shape summary (one line), upstream source file + line range. After the 13 tools, a `### Resource: clickup://space/{spaceId}` subsection describing the URI template, mode gating (`read` + `write` only), and handler return shape. Keep each tool subsection ≤ 10 lines. Do NOT re-derive schemas from imagination — read each `src/tools/clickup/src/tools/*.ts` and summarize.

8. **`docs/development-guide.md` gains a `### ClickUp Development Workflow` subsection** under the existing development/testing area. 5–8 bullets covering:
   - How to run the server locally with ClickUp enabled.
   - Where the smoke-test scripts from stories 1.5 and 1.6 live (Task 1 extracts the actual paths).
   - Guidance to use a free-tier personal ClickUp workspace for dev, not production.
   - `CLICKUP_MCP_MODE=read-minimal` tip for low-risk local testing.

9. **`docs/index.md`** — add two nav links pointing at the new `#clickup-adapter-layer` (architecture.md) and `#clickup-tools` (api-contracts.md) anchors. No other changes.

10. **Tool-name drift check.** A grep over the final prose must return exactly the 13 tool names from AC #2 — no invented names (`createDocument`, `listSpaces`, `getTask`). Run at the end of Task 10:

    ```bash
    grep -hoE "(getTaskById|searchTasks|searchSpaces|getListInfo|getTimeEntries|readDocument|searchDocuments|addComment|updateTask|createTask|updateListInfo|createTimeEntry|updateDocumentPage|createDocumentOrPage)" \
      README.md docs/api-contracts.md docs/architecture.md VENDOR.md CHANGELOG.md | sort -u | wc -l
    ```

    Expected output: `13`. Paste the output into the commit body.

11. **No changes to code, vendored tree, or BMAD source.** `git diff --stat -- src/ BMAD-METHOD/` MUST print nothing. This is a docs-only PR. If the dev spots a bug in the adapter while writing docs (e.g., a tool name disagrees between adapter and upstream), document the _observed_ behavior and file a follow-up in `planning-artifacts/deferred-work.md`.

12. **`npm run build && npm run lint && npm run format && npm test`** produce the same pass/warn/error profile as the pre-story `main` baseline. Since only markdown and `.env.example` change, the expected delta is zero.

13. **Markdown link check** — run `npx -y markdown-link-check README.md CHANGELOG.md VENDOR.md docs/*.md` as the last verification step. Fix internal-link errors; document unreachable externals (auth-gated URLs like `app.clickup.com/settings/apps`) in the commit body.

14. **Commit message** follows conventional-commits with scope `docs`: `docs(clickup): document tool surface, env vars, and upgrade procedure (EPIC-1 close)`. Rationale: this story ships only documentation; `docs` scope is correct. Body includes the AC #10 grep output and a sentence confirming `git diff --stat -- src/` is empty.

## Out of Scope (explicitly deferred)

- **Auto-generating `docs/api-contracts.md §ClickUp Tools` from the adapter + upstream source.** Would close the mode-dispatch duplication flagged in AC #6 once upstream re-vendoring becomes routine. Worth considering after EPIC-5.
- **Translating README/docs prose into `CLICKUP_PRIMARY_LANGUAGE` locales.** Tool _descriptions_ honor the env var (upstream); repo docs stay English.
- **Per-story CHANGELOG entries for 1.1 / 1.2 / 1.3 / 1.4 / 1.5 / 1.6.** The single `[Unreleased]` entry (AC #4) covers the epic's user-visible effect; git history is authoritative for per-story context.
- **Adding a "Hello ClickUp" quickstart script.** The dev-guide subsection (AC #8) covers the dev loop; a consumer-facing quickstart is story 5.8's territory.
- **README structural refactor** (e.g., unifying Docker and ClickUp under a "Deployment" parent). File this as a docs-hygiene story if the README hits 1000 lines.
- **Any OpenAPI / JSON-Schema artifact for the ClickUp tools.** MCP already ships zod-derived schemas at `tools/list` time.

## Tasks / Subtasks

- [ ] **Task 1 — Verify prereq stories + extract completion details (AC: #1, #8)**
  - [ ] `cat planning-artifacts/sprint-status.yaml | grep -E "^  1-[3-6]-"`. If any of 1-3 / 1-4 / 1-5 / 1-6 is not `done`, the stories' Completion Notes do not yet exist. In that case: (a) note the gap in this story's commit body; (b) describe behavior based on the _story drafts_ not the _completion notes_; (c) flag with `<!-- TODO: verify after story X lands -->` where the prereq story's behavior may change. Do NOT block on this — the user asked for the docs now.
  - [ ] For each prereq story that _is_ `done`, open its `.md` file and read the `## Dev Agent Record > ### Completion Notes List`. Extract: actual error messages (1.3), actual space-picker UX wording (1.4), actual smoke-test script paths (1.5, 1.6).
  - [ ] If 1.5 and/or 1.6 are done, open the smoke-test outputs they captured in their commit bodies or `scripts/` directory; extract a short quote or link to reference from README AC #1.6.

- [ ] **Task 2 — Verify source-of-truth facts (AC: #2, #3, #5, #10)**
  - [ ] Read `src/tools/clickup-adapter.ts` lines 180–230 end-to-end. Record the exact `step()` calls per mode. If they disagree with AC #2's table, the adapter has evolved since this story was drafted — update AC #2 in this file, then the README table.
  - [ ] Read `src/tools/clickup/src/shared/config.ts` lines 1–72 end-to-end. Confirm the four non-required env vars. If upstream has added new ones in a re-vendor, add them to AC #3.
  - [ ] Read `src/tools/clickup/src/tools/*.ts` for each of the 13 tool files. Capture input-schema summary + return shape for each — feed into Task 8.
  - [ ] Read `src/tools/clickup/src/resources/space-resources.ts`. Confirm URI template `clickup://space/{spaceId}` and handler return shape.
  - [ ] Read `VENDOR.md` end-to-end. Confirm the current SHA at line 10 matches what `git log -- src/tools/clickup/src/` indicates was last vendored; do NOT update the SHA unless there's a real discrepancy.

- [ ] **Task 3 — Write README.md ClickUp Integration section (AC: #1, #2)**
  - [ ] Add nav link to the header badge row (around line 10).
  - [ ] Insert new `## ClickUp Integration` section AFTER the Docker block ends at the `---` separator above `## Documentation` (currently line 490). Verify line numbers before inserting; the file is edited in other commits.
  - [ ] Populate per AC #1.2.
  - [ ] Double-check the env-var table rows against Task 2's config.ts read.
  - [ ] Double-check the mode table against Task 2's adapter read.

- [ ] **Task 4 — Update `.env.example` (AC: #3)**
  - [ ] Append the ClickUp block verbatim per AC #3.
  - [ ] Keep blank line between BMAD block and ClickUp block.
  - [ ] Do not default `CLICKUP_MCP_MODE` to `write` in the example (leave commented with `read` shown).

- [ ] **Task 5 — Update CHANGELOG.md (AC: #4)**
  - [ ] Prepend `[Unreleased]` section per AC #4.
  - [ ] Leave existing `# [4.0.0] (TBD)` section untouched below.

- [ ] **Task 6 — Update VENDOR.md (AC: #5)**
  - [ ] Fix §Upgrade procedure step 4 wording per AC #5.1.
  - [ ] Verify §Upgrade procedure step 5's `scripts/build-clickup.mjs` reference; correct if stale per AC #5.2.
  - [ ] Add `### What our adapter does on top` subsection per AC #5.3.
  - [ ] Add the one-line README pointer per AC #5.4.

- [ ] **Task 7 — Update docs/architecture.md (AC: #6)**
  - [ ] Append `## ClickUp Adapter Layer` section with intro, ASCII diagram, prompt-re-registration paragraph, mode-dispatch-duplication note.

- [ ] **Task 8 — Update docs/api-contracts.md (AC: #7)**
  - [ ] Identify the insertion point (after BMAD tools section, before TypeScript API section — or end of file if no clear split).
  - [ ] Write `## ClickUp Tools` intro paragraph + 13 tool subsections using Task 2's schema captures.
  - [ ] Add `### Resource: clickup://space/{spaceId}` subsection at the end.

- [ ] **Task 9 — Update docs/development-guide.md + docs/index.md (AC: #8, #9)**
  - [ ] Add `### ClickUp Development Workflow` subsection with 5–8 bullets.
  - [ ] Add two anchor links to `docs/index.md` nav.

- [ ] **Task 10 — Validate + commit (AC: #10, #11, #12, #13, #14)**
  - [ ] Run AC #10 grep; confirm output is `13`; paste into commit body.
  - [ ] Run `git diff --stat -- src/ BMAD-METHOD/`; confirm empty; paste into commit body.
  - [ ] Run `npx -y markdown-link-check README.md CHANGELOG.md VENDOR.md docs/*.md`. Fix internal link errors; note external 401/403s in commit body.
  - [ ] Run `npm run build && npm run lint && npm run format && npm test` — confirm baselines.
  - [ ] Commit per AC #14.

## Dev Notes

### Prerequisite stories — soft gate, not hard block

Four stories are `ready-for-dev` at draft time: 1.3 (env-var validation), 1.4 (space picker), 1.5 (CRUD smoke), 1.6 (cross-list smoke). The README's "Space selection" and "Cross-list parent/subtask" subsections (AC #1.2) and the dev-guide's smoke-test script paths (AC #8) describe behavior those stories will deliver.

Two scenarios:

- **All four are `done` before this story runs.** Task 1 extracts actual behavior from each story's Completion Notes; docs reflect ground truth.
- **Some are still in-flight.** Task 1 documents observed state today, marks uncertain sections with `<!-- TODO: verify after story X lands -->`, and the user can land this story now with incomplete references or defer it. The prior draft of this story had a hard "STOP and return to backlog" gate on Task 1 — removed, because the user explicitly asked for the story to be drafted now.

If a prereq story lands with behavior that contradicts what this story describes, the correct fix is a follow-up docs commit, not reverting this story.

### Scope discipline — docs-only, zero code diff

AC #11 is load-bearing. Temptation to "quickly fix" a minor naming inconsistency in the adapter or upstream is real while writing docs. Don't.

- Upstream tree (`src/tools/clickup/**`) is read-only per [story 1.1 AC #2](./1-1-vendor-clickup-mcp-source.md) + [PRD §Customization boundary](../PRD.md).
- The adapter (`src/tools/clickup-adapter.ts`) is our code but frozen for this PR — any change means re-running story 1.5/1.6 smoke tests.
- `src/server.ts`, `src/http-server.ts`, `src/core/**`, `src/tools/bmad-unified.ts` — same logic. Docs PR.

If a real bug blocks documenting actual behavior:

1. Document what the code does today (not the intended behavior).
2. File the bug in `planning-artifacts/deferred-work.md`.
3. Complete this story.

### VENDOR.md — what's actually there

Current VENDOR.md structure (verified against disk):

- `## clickup-mcp` header block with SHA `c79b21e3f77190a924ef8e2c9ba3dd8088369e17`, branch `main`, date `2026-04-21`, license MIT.
- `### What was vendored` — three lines (src/, LICENSE, README.md).
- `### What was deliberately excluded (and why)` — table.
- `### Upstream runtime dependencies` — six-dep JSON block.
- `### Upgrade procedure` — six numbered steps (already exists, do NOT add a new one).

AC #5 mutates this file minimally: two wording fixes in §Upgrade procedure, one new subsection (`### What our adapter does on top`), one new one-line pointer to README. Do NOT rewrite §Modifications — that section does not exist; the file never had it.

### Adapter prompt behavior — ground truth

The `my-todos` prompt IS registered at runtime — by our adapter, not by upstream.

Read `src/tools/clickup-adapter.ts` lines 108–151: our adapter constructs the German/English prompt text, picks the language based on `CONFIG.primaryLanguageHint`, and calls `server.prompt('my-todos', ...)` directly. Upstream's own `registerPrompt` call in `src/tools/clickup/src/index.ts:56–99` is bypassed because we bypass upstream's `initializeServer()` entirely — we dispatch the `register*Tools` functions directly instead.

Docs framing (use this wording): "Our adapter re-registers the upstream `my-todos` MCP prompt using `server.prompt()` after the mode-dispatch fires. Upstream's own bootstrap path (`initializeServer()`) is not called." Do NOT say "we skip the prompt" — the prompt works; we skip upstream's bootstrap.

### README insertion point — verify line numbers

At draft time (post-story-1.2, pre-1.3):

- `## Docker Deployment` starts at ~line 339.
- `### Resource Discovery Priority` is a subsection of Docker Deployment at ~line 481.
- `---` separator at ~line 490.
- `## Documentation` at ~line 492.

Insert the new `## ClickUp Integration` section at the `---` at line 490, before `## Documentation` — this keeps `### Resource Discovery Priority` with its parent Docker Deployment block, and gives ClickUp its own top-level sibling section.

Verify line numbers on disk before editing; the README has other uncommitted modifications on this branch.

### CHANGELOG pattern — hand-edit, consistent with v4.0

`.releaserc.json` configures semantic-release, which would normally auto-generate CHANGELOG entries from conventional-commit messages. But the existing `# [4.0.0] (TBD)` section is clearly hand-written (section structure and bullet style don't match semantic-release output). Follow that precedent: hand-write the `[Unreleased]` section at the top. If a future semantic-release run clobbers it, that's a separate hygiene story — and the commit message's `docs(clickup): ...` scope will still let semantic-release derive its own entry downstream.

### `CLICKUP_PRIMARY_LANGUAGE` nuance

`src/tools/clickup/src/shared/config.ts` line 1: `process.env.CLICKUP_PRIMARY_LANGUAGE || process.env.LANG`. So `$LANG` is the real fallback, not English. If the user's shell has `LANG=de_DE.UTF-8`, the tool descriptions and `my-todos` prompt come out German without the user setting anything. This is a quirk worth mentioning in the README env-var table note — one sentence is enough.

Supported language codes (per config.ts lines 7–44): `de`, `en`, `fr`, `es`, `it`. Other codes fall through to the first-two-chars extraction (line 38); in practice anything without a `detectLanguage` branch defaults to whatever the upstream register functions treat as "unknown" (they check `=== 'de'` explicitly, so non-`de` is effectively English).

### Tool-name and mode-matrix integrity

AC #10's grep is the backstop. If any doc ends up with `createDocument` (wrong — it's `createDocumentOrPage`) or `getTask` (wrong — it's `getTaskById`) or `listSpaces` (wrong — it's `searchSpaces`), the grep catches it. These are the most likely typos because upstream uses slightly non-standard verbs.

Authoritative tool list, verified against `src/tools/clickup-adapter.ts` lines 181–229:

- read-minimal: `getTaskById`, `searchTasks` (2)
- read adds: `searchSpaces`, `getListInfo`, `getTimeEntries`, `readDocument`, `searchDocuments` (7 total)
- write adds: `addComment`, `updateTask`, `createTask`, `updateListInfo`, `createTimeEntry`, `updateDocumentPage`, `createDocumentOrPage` (13 total)

### Testing standards — no new tests

No unit/integration tests. Correctness is validated by AC #10 grep, AC #13 markdown-link-check, AC #12 `npm test` green (regression check). No server-run smoke check needed; if a dev feels anxious they can run `CLICKUP_API_KEY=stub CLICKUP_TEAM_ID=stub npm run dev` to confirm the server starts and the stderr line matches what the docs claim, but this is optional.

### Files that WILL change

- `README.md`
- `.env.example`
- `CHANGELOG.md`
- `VENDOR.md`
- `docs/architecture.md`
- `docs/api-contracts.md`
- `docs/development-guide.md`
- `docs/index.md`
- `planning-artifacts/stories/1-7-document-tool-surface.md` (self, for Dev Agent Record)

### Files that MUST NOT change (AC #11)

- Anything under `src/`, `BMAD-METHOD/`, `tests/`, `scripts/`, `.github/`, `.husky/`
- `package.json`, `package-lock.json`, `tsconfig*.json`, `eslint.config.mjs`, `vitest.config.ts`
- `.gitignore`, `.eslintignore`, `.prettierignore`
- `src/tools/clickup/LICENSE`, `src/tools/clickup/README.md`

If `git status` shows anything outside the first list, stop and investigate — most likely a markdownlint/prettier hook touched something unexpectedly. Revert surgically.

### References

- [EPIC-1 §Stories bullet 8](../epics/EPIC-1-clickup-mcp-integration.md) — "Document the tool surface added (for README / CHANGELOG)" — scope anchor.
- [EPIC-1 §Exit criteria](../epics/EPIC-1-clickup-mcp-integration.md) — "`VENDOR.md` records upstream SHA and date vendored" — AC #5 verifies this.
- [PRD §Functional requirement #1](../PRD.md) — "`bmad-mcp-server` exposes ClickUp tools... alongside BMAD agent/workflow tools" — README's new section makes this visible.
- [PRD §ClickUp layout](../PRD.md) — Sprint list / Backlog list / epic-as-parent convention documented in README AC #1.2 subsection.
- [PRD §Env vars](../PRD.md) — `CLICKUP_API_KEY` + `CLICKUP_TEAM_ID` mandatory; AC #3 adds the four optional upstream vars.
- [Story 1.1](./1-1-vendor-clickup-mcp-source.md) §AC #2–#3, #16 — vendored tree read-only. AC #11 inherits.
- [Story 1.2](./1-2-wire-register-functions.md) §AC #1 (mode → tool table), §AC #5 (adapter shape). AC #2 of this story quotes the adapter-level dispatch.
- [Story 1.3](./1-3-env-var-wiring.md) / [1.4](./1-4-space-picker.md) / [1.5](./1-5-smoke-test-crud.md) / [1.6](./1-6-smoke-test-cross-list-subtask.md) — populate README AC #1.2 subsections and dev-guide AC #8 after each lands.
- [VENDOR.md](../../VENDOR.md) — modified per AC #5.
- [CLAUDE.md §Architecture](../../CLAUDE.md) — transport-agnostic `BMADEngine` invariant; docs don't contradict this.
- Upstream source: `src/tools/clickup/src/tools/*.ts`, `src/tools/clickup/src/resources/space-resources.ts`, `src/tools/clickup/src/shared/config.ts`. Task 2 reads all three directly.
- Adapter: `src/tools/clickup-adapter.ts` lines 90–237 — mode dispatch, prompt re-registration, tool name list.

## Dev Agent Record

### Agent Model Used

<!-- populated by dev agent on implementation -->

### Debug Log References

<!-- populated by dev agent on implementation -->

### Completion Notes List

<!-- populated by dev agent on implementation -->

### File List

**Modified**

- `README.md` — new `## ClickUp Integration` section + header nav link (AC #1, #2)
- `.env.example` — six-variable ClickUp block appended (AC #3)
- `CHANGELOG.md` — `[Unreleased]` section prepended (AC #4)
- `VENDOR.md` — §Upgrade procedure wording fixes + new `### What our adapter does on top` subsection + README pointer (AC #5)
- `docs/architecture.md` — `## ClickUp Adapter Layer` section appended (AC #6)
- `docs/api-contracts.md` — `## ClickUp Tools` section + `### Resource: clickup://space/{spaceId}` subsection added (AC #7)
- `docs/development-guide.md` — `### ClickUp Development Workflow` subsection added (AC #8)
- `docs/index.md` — two nav links added (AC #9)

**New**

- (none — all changes are additions to existing files)

**Untouched (explicitly — AC #11)**

- `src/**` (all source — adapter frozen, vendored tree read-only)
- `BMAD-METHOD/**`
- `package.json`, `package-lock.json`, `tsconfig*.json`, build/lint/test config
- `tests/`, `scripts/`, `.github/`, `.husky/`

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-21 | Story drafted from EPIC-1 §Stories bullet 8 via `bmad-create-story`. Status → ready-for-dev. Task 1 verifies prereq stories 1.3/1.4/1.5/1.6 state at implementation time (soft gate, not hard block).                                                                                                                                                                                                      |
| 2026-04-21 | Checklist validation pass: corrected VENDOR.md description (it has `### Upgrade procedure` already, not `## Modifications`); corrected adapter prompt behavior (we re-register via `server.prompt`, not skip); fixed README insertion point (`### Resource Discovery Priority` is a subsection of `## Docker Deployment`, not a sibling); removed hard prerequisite gate; cut AC and Dev Notes redundancy. |
| 2026-04-21 | Applied remaining validator enhancements/reductions: added Docker env-var pass-through callout to README AC #1.2; quoted the existing 6-step §Upgrade procedure verbatim in AC #5 as diff-target baseline; tightened the mode-table footnote in AC #2; dropped the defensive Out-of-Scope bullet about backporting into `src/tools/clickup/README.md`.                                                     |
