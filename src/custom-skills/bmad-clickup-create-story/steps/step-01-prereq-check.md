---
prd_content: ''
architecture_content: ''
epics_content: ''
resolve_doc_paths_result: ''
prd_available: 'false'
arch_available: 'false'
fallback_code_context: ''
lore_enabled: ''
lore_project_slug: ''
lore_project_context: ''
---

# Step 1: Prereq File Check

## RULES

- `CLICKUP_MCP_MODE=write` is required. If `createTask` is not in the available tool list, stop immediately.
- Verify authentication by calling `pickSpace` directly — do NOT run shell commands (`printenv`, `env`, etc.) to check for env vars. ClickUp credentials live in the MCP server process, not in the shell.
- Missing PRD or architecture docs are **warnings, not errors**. The skill continues with whatever context is available (code structure, git history, README, epics, existing ClickUp tasks). Do not stop the skill run because docs are absent.
- **Doc-path resolution is client-side.** Resolve PRD / architecture / epics paths yourself against the client project root (your current working directory) using the cascade in instruction 1. Do NOT call `bmad({ operation: 'resolve-doc-paths' })` — the MCP server may be remote and cannot see this project's files. All file reads (`.bmadmcp/config.toml`, the BMAD config chain, the planning docs themselves) are performed by you against the local filesystem.

## Permission Gate

Run these two checks in order. If either fails, emit the corresponding error block and stop the entire skill run immediately.

1. **Verify write mode.** Check whether `createTask` is available in the current tool list. If it is absent (mode is `read-minimal` or `read`), emit the mode error block below and stop.

2. **Verify token authentication.** Call `pickSpace` with no arguments. If the response contains an authentication error (response text contains `401`, `Unauthorized`, or `invalid token`, or zero spaces are returned alongside an error indicator), emit the token error block below and stop.

3. **Confirm success.** If both checks pass, report to the user:

   > ✅ Permission gate passed — write mode active, token authenticated.

   Capture this line **verbatim** in the Dev Agent Record. Then continue to `## INSTRUCTIONS`.

### Mode error block

> ❌ **Permission gate failed — write mode required**
>
> The `bmad-clickup-create-story` skill requires `CLICKUP_MCP_MODE=write`. The current mode does not register `createTask`, so task creation is impossible.
>
> **What to do:** Set `CLICKUP_MCP_MODE=write` in the `bmad-mcp-server` env config (whichever name you gave it in your MCP client settings) and restart, then re-invoke the skill.

### Token error block

> ❌ **Permission gate failed — ClickUp authentication failed**
>
> `pickSpace` returned an authentication error. The `CLICKUP_API_KEY` or `CLICKUP_TEAM_ID` in the MCP server config may be invalid or expired.
>
> **What to do:** Update the credentials in the `bmad-mcp-server` env config (whichever name you gave it in your MCP client settings), restart the MCP server, then re-invoke the skill.

## INSTRUCTIONS

1. **Resolve doc paths yourself (client-side cascade).** Run the cascade below against the **client project root** — your current working directory, the project you are operating in, NOT the MCP server's filesystem. Resolve the three keys `prd`, `architecture`, and `epics` **independently and per-key** (first match wins for each key — preserve the full chain; do NOT collapse it to a single `.bmadmcp/config.toml [docs]` read). Treat relative paths as relative to the project root (join them); absolute paths are used as-is. Collect any malformed/wrong-type config warnings into `{warnings}`.

   Default filenames per key: `prd` → `PRD.md`, `architecture` → `architecture.md`, `epics` → `epics/` (a directory — keep the trailing slash). Layer tags MUST be exactly the resolver strings: `bmadmcp-config`, `bmad-config`, or `default`.

   - **Layer 1 — `{root}/.bmadmcp/config.toml` `[docs]` table.** Read `{root}/.bmadmcp/config.toml`.
     - Absent → skip this layer.
     - Present but not valid TOML → add warning `<path>: malformed TOML — <reason>; falling back to BMAD / default for all doc paths`, then skip this layer.
     - Parses with a `[docs]` table:
       - **Per-key path settings** (`prd_path`, `architecture_path`, `epics_path`): for each key, if the setting is present but is **not** a non-empty string, add warning `<path> [docs].<setting>: expected non-empty string, got <type>; ignoring this layer for key '<key>'` (emit this even if `planning_dir` later fills the key). If it is a non-empty string, resolve that key to its path with layer `bmadmcp-config`.
       - **`planning_dir`** (base dir for any key still unresolved): if it is a non-empty string, resolve each still-unset key to `<planning_dir>/<default filename>` with layer `bmadmcp-config`. If `planning_dir` is present but not a non-empty string, add warning `<path> [docs].planning_dir: expected non-empty string, got <type>; ignoring this layer`.
   - **Layer 2 — BMAD config chain** (unresolved keys only). Choose the BMAD dir: use `{root}/bmad` if `{root}/bmad/config.toml` exists, else `{root}/_bmad` if `{root}/_bmad/config.toml` exists, else skip this layer. Merge the `[bmm]` table across these four files **in order**, later overriding earlier (deep-merge tables; replace scalars/arrays); skip any missing file, and for a malformed file add warning `<path>: malformed TOML — <reason>; skipping this BMAD config layer` and skip just that file:
     1. `<bmaddir>/config.toml`
     2. `<bmaddir>/config.user.toml`
     3. `<bmaddir>/custom/config.toml`
     4. `<bmaddir>/custom/config.user.toml`

     From the merged `[bmm]`, read `planning_artifacts`. If it is a non-empty string, resolve each still-unset key to `<planning_artifacts>/<default filename>` with layer `bmad-config`. If `planning_artifacts` is present but not a non-empty string, add warning `<bmaddir>/config.toml chain [bmm].planning_artifacts: expected non-empty string, got <type>; falling back to default`.
   - **Layer 3 — default** (remaining keys): resolve to `{root}/planning-artifacts/<default filename>` with layer `default`.

   Store the result as `{resolve_doc_paths_result}` — an object with `prd`, `architecture`, `epics` (each `{ path, layer }`) plus `warnings`. Extract `data.prd` → `{prd_info}`, `data.architecture` → `{arch_info}`, `data.epics` → `{epics_info}`, `data.warnings` → `{warnings}`.

2. **Emit cascade warnings.** If `{warnings}` is non-empty, emit each warning to the user as a `⚠️`-prefixed line before proceeding.

3. **Attempt to load each planning doc.** Try to read each resolved path and set availability flags:

   - If `{prd_info.path}` exists and is readable → set `{prd_available}` = `true`, read into `{prd_content}`.
   - If not readable → set `{prd_available}` = `false`, set `{prd_content}` = `''`, emit:

     ```
     ⚠️ PRD not found at <data.prd.path> [<data.prd.layer>] — story will be derived from code context.

     To add a PRD later, either place it at the resolved path or set [docs].prd_path in .bmadmcp/config.toml.
     ```

   - If `{arch_info.path}` exists and is readable → set `{arch_available}` = `true`, read into `{architecture_content}`.
   - If not readable → set `{arch_available}` = `false`, set `{architecture_content}` = `''`, emit:

     ```
     ⚠️ Architecture doc not found at <data.architecture.path> [<data.architecture.layer>] — story will be derived from code context.

     To add an architecture doc later, either place it at the resolved path or set [docs].architecture_path in .bmadmcp/config.toml.
     ```

4. **Gather fallback code context when any doc is missing.** If `{prd_available}` = `false` OR `{arch_available}` = `false`, collect the following and concatenate into `{fallback_code_context}`:

   a. Read `{project-root}/README.md` if it exists — provides project purpose and tech overview.
   b. List the top-level directory tree (one level deep under `src/`, `lib/`, `app/`, or equivalent) — shows module layout.
   c. Run `git log --oneline -20` to capture recent commit history — reveals what has been built and the current development direction.
   d. Read `package.json`, `pyproject.toml`, `Cargo.toml`, or equivalent manifest if present — identifies the tech stack and dependencies.
   e. Emit:

   ```
   ℹ️ Fallback context gathered for missing docs:
   - README: <found / not found>
   - Source tree: <summarised>
   - Recent git log: <N commits captured>
   - Manifest: <found file / not found>

   Story descriptions will use this context in place of missing planning docs.
   ```

   If all docs are present, set `{fallback_code_context}` = `''` and skip this instruction.

5. **Load epics.** Use `{epics_info.path}` from the resolver result. Branch based on whether the path ends with `.md`:
   - **If the path ends with `.md` (single file):** attempt to read it directly → `{epics_content}`.
   - **Otherwise (directory path):** list and read all `EPIC-*.md` files inside the directory, concatenate them with `---` separators → `{epics_content}`. If the directory is absent or contains no `EPIC-*.md` files, set `{epics_content}` = `''`.

   If the resolved epics path does not exist (neither as file nor populated directory), set `{epics_content}` = `''` and emit:

   ```
   ⚠️ Epics path not found at <data.epics.path> [<data.epics.layer>] — story detail will be derived from PRD and epic ClickUp task only.
   ```

   Also check for optional files and note their presence (do not fail if absent):
   - `{project-root}/planning-artifacts/ux-design.md` or similar `*ux*.md`
   - `{project-root}/planning-artifacts/tech-spec.md`

6. **Query Lore for current project context (optional).**

   Read `lore.yaml` from the project root.

   - Missing, unparseable, or no `project.slug` → set `{lore_enabled}` = `'false'`, `{lore_project_context}` = `''`, and skip the rest of this instruction **silently**. Do NOT emit a warning — Lore is optional and most projects do not have it. Everything else in this step continues exactly as it does today.
   - Present with `project.slug` → set `{lore_enabled}` = `'true'`, `{lore_project_slug}` = the slug value.

   **Lore-enabled path only.** Call `query_project_context` on the `lore-memory-{lore_project_slug}` MCP server:

   - `query`: `current requirements, constraints, and recent decisions — story planning`
   - `limit`: `10`

   Best-effort — if the tool is not registered in this session (Lore builds without the Project Evolution surface do not expose it) or the call fails for any reason, set `{lore_project_context}` = `''`, emit the single line `WARNING: Lore configured but project context unavailable — continuing with planning docs only.` and continue. Do NOT halt.

   On success, store the returned items in `{lore_project_context}` and surface them inline:

   ```
   Current project context (from Lore):

   {for each item:}
     - <type>: <statement> [<status>] — <why it matched>
       (evidence: <source>, item_id: <id>)
   {end}
   ```

   **Precedence.** Accepted Lore items are the project's *current* truth; planning docs may be stale. Where an accepted item contradicts a planning doc, prefer the Lore item downstream and say so once — `⚠️ <doc statement> superseded by Lore item <id>`. Lore never substitutes for a planning doc: the doc checks in this step still apply unchanged.

7. **Confirm and continue.** Report to the user:

   ```
   ✅ Prereq check passed — context loaded:
   - PRD: <data.prd.path> [<data.prd.layer>] — <found / NOT FOUND — fallback context in use>
   - Architecture: <data.architecture.path> [<data.architecture.layer>] — <found / NOT FOUND — fallback context in use>
   - Epics: <data.epics.path> [<data.epics.layer>] — <found N file(s) / not found>
   ```

   If any planning doc was missing, also emit:

   ```
   ⚠️ One or more planning docs are absent. Story descriptions will be derived from available code context (README, source structure, git history). Consider adding planning docs for richer, more accurate stories.
   ```

   Then proceed to the next step.

## NEXT

Proceed to [step-02-epic-picker.md](./step-02-epic-picker.md). The permission-gate verbatim message, `{prd_content}` / `{architecture_content}` / `{epics_content}`, `{prd_available}` / `{arch_available}`, `{fallback_code_context}`, `{lore_project_context}`, and the full `{resolve_doc_paths_result}` (including resolved paths and their layers) are available to all downstream steps.

> **Refinement source:** `pwd-deviation-cwd-not-pilot-repo`, `step-01-verbatim-message-not-captured`, `stale-next-wording-in-skill-files` (story 5-7).
