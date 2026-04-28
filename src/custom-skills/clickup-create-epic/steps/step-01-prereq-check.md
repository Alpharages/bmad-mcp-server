---
prd_content: ''
architecture_content: ''
epics_content: ''
---

# Step 1: Prereq Check

## RULES

- `CLICKUP_MCP_MODE=write` is required. If `createTask` is not in the available tool list, stop immediately.
- Verify authentication by calling `pickSpace` directly — do NOT run shell commands (`printenv`, `env`, etc.) to check for env vars. ClickUp credentials live in the MCP server process, not in the shell.
- If any required file is missing, **stop the entire skill run immediately**. Do not proceed to step 2.

## Permission Gate

1. **Verify write mode.** Check whether `createTask` is available in the current tool list. If it is absent, emit the mode error block below and stop.

2. **Verify token authentication.** Call `pickSpace` with no arguments. If the response contains an authentication error (response text contains `401`, `Unauthorized`, or `invalid token`, or zero spaces are returned alongside an error indicator), emit the token error block below and stop.

3. **Confirm success.** If both checks pass, report to the user:

   > ✅ Permission gate passed — write mode active, token authenticated.

   Then continue to `## INSTRUCTIONS`.

### Mode error block

> ❌ **Permission gate failed — write mode required**
>
> The `clickup-create-epic` skill requires `CLICKUP_MCP_MODE=write`. The current mode does not register `createTask`.
>
> **What to do:** Set `CLICKUP_MCP_MODE=write` in the `bmad-mcp-server` MCP server env config (whichever name you gave it in your MCP client settings) and restart, then re-invoke the skill.

### Token error block

> ❌ **Permission gate failed — ClickUp authentication failed**
>
> `pickSpace` returned an authentication error. The `CLICKUP_API_KEY` or `CLICKUP_TEAM_ID` in the MCP server config may be invalid or expired.
>
> **What to do:** Update the credentials in the `bmad-mcp-server` env config (whichever name you gave it in your MCP client settings), restart the MCP server, then re-invoke the skill.

## INSTRUCTIONS

1. **Resolve the project root.** Determine `{project-root}` from the current working directory.

2. **Check all three required files simultaneously.** Verify whether each of the following paths exists:
   - `{project-root}/planning-artifacts/PRD.md`
   - `{project-root}/planning-artifacts/architecture.md`
   - `{project-root}/planning-artifacts/epics-and-stories.md`

   Set `{prd_present}`, `{arch_present}`, and `{epics_present}` = `present` or `**MISSING**` accordingly.

3. **If any file is missing, emit the following error block and stop:**

   ```
   ❌ **Prereq check failed — missing required file(s)**

   The `clickup-create-epic` skill requires the following files to exist:

   - `planning-artifacts/PRD.md` — {prd_present}
   - `planning-artifacts/architecture.md` — {arch_present}
   - `planning-artifacts/epics-and-stories.md` — {epics_present}

   **Why:** The epic description is composed from PRD and architecture context. The local epics list is used to pick which epic to create.

   **What to do:** Add the missing file(s) to your project's `planning-artifacts/` directory, then re-invoke the skill.
   ```

4. **Load all three files.** Read the contents into `{prd_content}`, `{architecture_content}`, and `{epics_content}` for use by downstream steps.

5. **Confirm and continue.** Report to the user that prerequisite files are present and loaded, then proceed to the next step.

## NEXT

Proceed to [step-02-backlog-list-picker.md](./step-02-backlog-list-picker.md). The cwd-assertion result, the permission-gate verbatim message, and the loaded `{prd_content}` / `{architecture_content}` / `{epics_content}` are available to all downstream steps.
