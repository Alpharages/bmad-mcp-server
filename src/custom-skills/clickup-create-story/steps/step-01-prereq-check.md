---
prd_content: ''
architecture_content: ''
epics_content: ''
resolve_doc_paths_result: ''
prd_available: 'false'
arch_available: 'false'
fallback_code_context: ''
---

# Step 1: Prereq File Check

## RULES

- `CLICKUP_MCP_MODE=write` is required. If `createTask` is not in the available tool list, stop immediately.
- Verify authentication by calling `pickSpace` directly — do NOT run shell commands (`printenv`, `env`, etc.) to check for env vars. ClickUp credentials live in the MCP server process, not in the shell.
- Missing PRD or architecture docs are **warnings, not errors**. The skill continues with whatever context is available (code structure, git history, README, epics, existing ClickUp tasks). Do not stop the skill run because docs are absent.

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
> The `clickup-create-story` skill requires `CLICKUP_MCP_MODE=write`. The current mode does not register `createTask`, so task creation is impossible.
>
> **What to do:** Set `CLICKUP_MCP_MODE=write` in the `bmad-mcp-server` env config (whichever name you gave it in your MCP client settings) and restart, then re-invoke the skill.

### Token error block

> ❌ **Permission gate failed — ClickUp authentication failed**
>
> `pickSpace` returned an authentication error. The `CLICKUP_API_KEY` or `CLICKUP_TEAM_ID` in the MCP server config may be invalid or expired.
>
> **What to do:** Update the credentials in the `bmad-mcp-server` env config (whichever name you gave it in your MCP client settings), restart the MCP server, then re-invoke the skill.

## INSTRUCTIONS

1. **Call `bmad({ operation: 'resolve-doc-paths' })`.** No `projectRoot` argument — the operation defaults to the server's configured project root. Store the full response data object as `{resolve_doc_paths_result}`. Extract:
   - `data.prd` → `{prd_info}` (contains `.path` and `.layer`)
   - `data.architecture` → `{arch_info}` (contains `.path` and `.layer`)
   - `data.epics` → `{epics_info}` (contains `.path` and `.layer`)
   - `data.warnings` → `{warnings}`

   If the call returns an error or `data` is absent/null, emit the following error block and stop the skill run immediately:

   ```
   ❌ resolve-doc-paths operation failed: <error message>

   The `clickup-create-story` skill could not resolve document paths. This usually means:
   - The `resolve-doc-paths` operation is not registered (check that story 6.4 is merged and the server is rebuilt).
   - The MCP server encountered a transient error.

   **What to do:** Restart the MCP server and re-invoke the skill. If the error persists, verify that `resolve-doc-paths` appears in `npm run cli:list-tools`.
   ```

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

6. **Confirm and continue.** Report to the user:

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

Proceed to [step-02-epic-picker.md](./step-02-epic-picker.md). The permission-gate verbatim message, `{prd_content}` / `{architecture_content}` / `{epics_content}`, `{prd_available}` / `{arch_available}`, `{fallback_code_context}`, and the full `{resolve_doc_paths_result}` (including resolved paths and their layers) are available to all downstream steps.

> **Refinement source:** `pwd-deviation-cwd-not-pilot-repo`, `step-01-verbatim-message-not-captured`, `stale-next-wording-in-skill-files` (story 5-7).
