---
prd_content: ''
architecture_content: ''
epics_content: ''
resolve_doc_paths_result: ''
---

# Step 1: Prereq Check

## RULES

- `CLICKUP_MCP_MODE=write` is required. If `createTask` is not in the available tool list, stop immediately.
- Verify authentication by calling `pickSpace` directly — do NOT run shell commands (`printenv`, `env`, etc.) to check for env vars. ClickUp credentials live in the MCP server process, not in the shell.
- PRD, architecture, and epics are **soft-loaded** — the skill warns when they are absent but does **not abort**. Missing planning artifacts never block bug creation.

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
> The `clickup-create-bug` skill requires `CLICKUP_MCP_MODE=write`. The current mode does not register `createTask`, so ticket creation is impossible.
>
> **What to do:** Set `CLICKUP_MCP_MODE=write` in the `bmad-mcp-server` env config (whichever name you gave it in your MCP client settings) and restart, then re-invoke the skill.

### Token error block

> ❌ **Permission gate failed — ClickUp authentication failed**
>
> `pickSpace` returned an authentication error. The `CLICKUP_API_KEY` or `CLICKUP_TEAM_ID` in the MCP server config may be invalid or expired.
>
> **What to do:** Update the credentials in the `bmad-mcp-server` env config, restart the MCP server, then re-invoke the skill.

## INSTRUCTIONS

1. **Call `bmad({ operation: 'resolve-doc-paths' })`.** No `projectRoot` argument — the operation defaults to the server's configured project root. Store the full response data object as `{resolve_doc_paths_result}`. Extract:
   - `data.prd` → `{prd_info}` (contains `.path` and `.layer`)
   - `data.architecture` → `{arch_info}` (contains `.path` and `.layer`)
   - `data.epics` → `{epics_info}` (contains `.path` and `.layer`)
   - `data.warnings` → `{warnings}`

   If the call returns an error or `data` is absent/null, emit the following error block and stop the skill run immediately:

   ```
   ❌ resolve-doc-paths operation failed: <error message>

   The `clickup-create-bug` skill could not resolve document paths.

   **What to do:** Restart the MCP server and re-invoke the skill. If the error persists, verify that `resolve-doc-paths` appears in `npm run cli:list-tools`.
   ```

2. **Emit cascade warnings.** If `{warnings}` is non-empty, emit each warning to the user as a `⚠️`-prefixed line before proceeding.

3. **Soft-load PRD.** Attempt to read `{prd_info.path}`:
   - If present: load into `{prd_content}`, set `{prd_present}` = `present`.
   - If absent: set `{prd_content}` = `''`, set `{prd_present}` = `missing`, and emit:

     > ⚠️ PRD not found at `<prd_info.path>` [`<prd_info.layer>`] — proceeding without PRD context. Bug description will be based on the user's report only.

     The skill MUST NOT stop.

4. **Soft-load architecture.** Attempt to read `{arch_info.path}`:
   - If present: load into `{architecture_content}`, set `{arch_present}` = `present`.
   - If absent: set `{architecture_content}` = `''`, set `{arch_present}` = `missing`, and emit:

     > ⚠️ Architecture doc not found at `<arch_info.path>` [`<arch_info.layer>`] — proceeding without architecture context.

     The skill MUST NOT stop.

5. **Soft-load epics.** Use `{epics_info.path}` from the resolver result:
   - **If the path ends with `.md` (single file):** attempt to read it directly → `{epics_content}`.
   - **Otherwise (directory path):** list and read all `EPIC-*.md` files inside the directory, concatenate them with `---` separators → `{epics_content}`.
   - If the path does not exist or yields no files: set `{epics_content}` = `''` and emit:

     > ⚠️ Epics path not found at `<epics_info.path>` [`<epics_info.layer>`] — story detail will be derived from bug report only.

     The skill MUST NOT stop.

6. **Confirm and continue.** Report to the user:

   ```
   ✅ Prereq check complete:
   - PRD:          <prd_info.path> [<prd_info.layer>] — <present|missing>
   - Architecture: <arch_info.path> [<arch_info.layer>] — <present|missing>
   - Epics:        <epics_info.path> [<epics_info.layer>] — <found N file(s)|not found>
   ```

   Then proceed to the next step regardless of which soft-load slots are empty.

## NEXT

Proceed to [step-02-list-picker.md](./step-02-list-picker.md). The permission-gate verbatim message, `{prd_content}` / `{architecture_content}` / `{epics_content}`, and the full `{resolve_doc_paths_result}` (including resolved paths and their layers) are available to all downstream steps.
