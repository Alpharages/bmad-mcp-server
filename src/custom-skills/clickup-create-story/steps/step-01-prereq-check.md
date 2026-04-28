---
prd_content: ''
architecture_content: ''
epics_content: ''
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

1. **Resolve the project root.** Determine `{project-root}` from the current working directory.

2. **Check required and optional files.** Verify whether each path exists:

   **Required:**
   - `{project-root}/planning-artifacts/PRD.md`
   - `{project-root}/planning-artifacts/architecture.md`

   **Optional (strongly preferred — enables rich story generation):**
   - `{project-root}/planning-artifacts/epics-and-stories.md`

   Set `{prd_present}`, `{arch_present}` = `present` or `**MISSING**`. Set `{epics_present}` = `present` or `absent`.

3. **If either required file is missing, emit the following error block and stop:**

   ```
   ❌ **Prereq check failed — missing required file**

   The `clickup-create-story` skill requires both of the following files to exist in the project root before it can proceed:

   - `planning-artifacts/PRD.md` — {prd_present}
   - `planning-artifacts/architecture.md` — {arch_present}

   **Why:** Story descriptions are composed from PRD and architecture context. Without these files the description would be empty or fabricated.

   **What to do:** Add the missing file(s) to your project's `planning-artifacts/` directory, then re-invoke the skill.
   ```

4. **Load files.** Read:
   - `{project-root}/planning-artifacts/PRD.md` → `{prd_content}`
   - `{project-root}/planning-artifacts/architecture.md` → `{architecture_content}`
   - If `epics-and-stories.md` is present: read it → `{epics_content}`. If absent, set `{epics_content}` = `''` and note to the user: `⚠️ planning-artifacts/epics-and-stories.md not found — story detail will be derived from PRD and epic ClickUp task only.`

   Also check for optional files and note their presence (do not fail if absent):
   - `{project-root}/planning-artifacts/ux-design.md` or similar `*ux*.md`
   - `{project-root}/planning-artifacts/tech-spec.md`

5. **Confirm and continue.** Report to the user which files were loaded, then proceed to the next step.

## NEXT

Proceed to [step-02-epic-picker.md](./step-02-epic-picker.md). The cwd-assertion result, the permission-gate verbatim message, and the loaded `{prd_content}` / `{architecture_content}` are available to all downstream steps.

> **Refinement source:** `pwd-deviation-cwd-not-pilot-repo`, `step-01-verbatim-message-not-captured`, `stale-next-wording-in-skill-files` (story 5-7).
