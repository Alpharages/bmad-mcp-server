---
prd_content: ''
architecture_content: ''
epics_content: ''
resolve_doc_paths_result: ''
---

# Step 1: Prereq File Check

## RULES

- `CLICKUP_MCP_MODE=write` is required. If `createTask` is not in the available tool list, stop immediately.
- Verify authentication by calling `pickSpace` directly — do NOT run shell commands (`printenv`, `env`, etc.) to check for env vars. ClickUp credentials live in the MCP server process, not in the shell.
- If either required file is missing, **stop the entire skill run immediately**. Do not proceed to step 2.

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

3. **Check required files.** Verify whether each resolved path exists:

   **Required:**
   - `{prd_info.path}`
   - `{arch_info.path}`

   Set `{prd_present}` / `{arch_present}` = `present` or `**MISSING**`.

4. **If either required file is missing, emit the following error block and stop:**

   ```
   ❌ **Prereq check failed — missing required file**

   The `clickup-create-story` skill requires both of the following files to exist before it can proceed:

   - PRD: <data.prd.path> [<data.prd.layer>] — {prd_present}
   - Architecture: <data.architecture.path> [<data.architecture.layer>] — {arch_present}

   **Why:** Story descriptions are composed from PRD and architecture context. The paths above were resolved via the cascade (not hardcoded). Without these files the description would be empty or fabricated.

   **How to override doc paths:**
   1. Per-project (highest priority): add `[docs].prd_path` / `[docs].architecture_path` to `.bmadmcp/config.toml`
   2. BMAD-config: set `[bmm].planning_artifacts` in `_bmad/config.toml` (affects all three paths via default filenames)
   3. Default (no config needed): place files at `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md`

   **What to do:** Add the missing file(s) at the resolved path(s), adjust your config to point to existing files, then re-invoke the skill.
   ```

5. **Load files.** Read:
   - `{prd_info.path}` → `{prd_content}`
   - `{arch_info.path}` → `{architecture_content}`

6. **Load epics.** Use `{epics_info.path}` from the resolver result. Branch based on whether the path ends with `.md`:
   - **If the path ends with `.md` (single file):** attempt to read it directly → `{epics_content}`.
   - **Otherwise (directory path):** list and read all `EPIC-*.md` files inside the directory, concatenate them with `---` separators → `{epics_content}`. If the directory is absent or contains no `EPIC-*.md` files, set `{epics_content}` = `''`.

   If the resolved epics path does not exist (neither as file nor populated directory), set `{epics_content}` = `''` and emit:

   ```
   ⚠️ Epics path not found at <data.epics.path> [<data.epics.layer>] — story detail will be derived from PRD and epic ClickUp task only.
   ```

   Also check for optional files and note their presence (do not fail if absent):
   - `{project-root}/planning-artifacts/ux-design.md` or similar `*ux*.md`
   - `{project-root}/planning-artifacts/tech-spec.md`

7. **Confirm and continue.** Report to the user:

   ```
   ✅ Prereq check passed — files loaded:
   - PRD: <data.prd.path> [<data.prd.layer>]
   - Architecture: <data.architecture.path> [<data.architecture.layer>]
   - Epics: <data.epics.path> [<data.epics.layer>] — <found N file(s) / not found>
   ```

   Then proceed to the next step.

## NEXT

Proceed to [step-02-epic-picker.md](./step-02-epic-picker.md). The cwd-assertion result, the permission-gate verbatim message, `{prd_content}` / `{architecture_content}` / `{epics_content}`, and the full `{resolve_doc_paths_result}` (including resolved paths and their layers) are available to all downstream steps.

> **Refinement source:** `pwd-deviation-cwd-not-pilot-repo`, `step-01-verbatim-message-not-captured`, `stale-next-wording-in-skill-files` (story 5-7).
