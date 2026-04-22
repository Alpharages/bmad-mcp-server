---
prd_content: ''
architecture_content: ''
---

# Step 1: Prereq File Check

## RULES

- `CLICKUP_MCP_MODE=write` is required. If `createTask` is not in the available tool list, stop immediately.
- This step calls `pickSpace` (no arguments) exactly once for token validation. No other ClickUp API calls are made in this step. No writes to ClickUp.
- If either required file is missing, **stop the entire skill run immediately**. Do not proceed to step 2.

## Permission Gate

Before checking project files, run these two checks in order. If either fails, emit the corresponding error block and stop the entire skill run immediately.

1. **Verify write mode.** Check whether `createTask` is available in the current tool list. If it is absent (mode is `read-minimal` or `read`), emit the mode error block below and stop.

2. **Verify token authentication.** Call `pickSpace` with no arguments. If the response contains an authentication error (response text contains `401`, `Unauthorized`, `invalid token`, or `CLICKUP_API_KEY`, or zero spaces are returned alongside an error indicator), emit the token error block below and stop.

3. **Confirm success.** If both checks pass, report to the user:

   > ✅ Permission gate passed — write mode active, token authenticated.

   Then continue to `## INSTRUCTIONS`.

### Mode error block

> ❌ **Permission gate failed — write mode required**
>
> The `clickup-create-story` skill requires `CLICKUP_MCP_MODE=write`. The current
> mode does not register `createTask`, so task creation is impossible.
>
> **Why:** `createTask` is only registered in `write` mode. The full skill requires
> `write` mode from step 1 (token verification via `pickSpace`) through step 5
> (task creation via `createTask`). Running in `read-minimal` or `read` mode will
> fail at step 5 at the latest — failing here avoids wasted picker round-trips.
>
> **What to do:** Set `CLICKUP_MCP_MODE=write` in your environment and restart the
> MCP server, then re-invoke the Dev agent in story-creation mode.

### Token error block

> ❌ **Permission gate failed — ClickUp authentication failed**
>
> The `clickup-create-story` skill called `pickSpace` to verify your
> `CLICKUP_API_KEY` token, but the ClickUp API returned an authentication error or
> no spaces.
>
> **Why:** Without a valid token the skill cannot list epics (step 2), sprint lists
> (step 3), or create tasks (step 5). Failing here avoids wasted picker round-trips.
>
> **What to do:**
>
> - Confirm `CLICKUP_API_KEY` is set in your environment to a valid personal token.
> - Confirm `CLICKUP_TEAM_ID` is set to your workspace ID (7–10 digits).
> - Restart the MCP server after updating either variable, then re-invoke the Dev
>   agent in story-creation mode.

## INSTRUCTIONS

1. **Resolve the project root.** Determine `{project-root}` from the current working directory.

2. **Check both required files simultaneously.** Verify whether each of the following paths exists:
   - `{project-root}/planning-artifacts/PRD.md`
   - `{project-root}/planning-artifacts/architecture.md`

   Set `{prd_present}` = `present` or `**MISSING**` and `{arch_present}` = `present` or `**MISSING**` accordingly.

3. **If either file is missing, emit the following error block (substituting the correct status values) and stop:**

   ```
   ❌ **Prereq check failed — missing required file**

   The `clickup-create-story` skill requires both of the following files to exist in the project root before it can proceed:

   - `planning-artifacts/PRD.md` — {prd_present}
   - `planning-artifacts/architecture.md` — {arch_present}

   **Why:** Story descriptions are composed from PRD and architecture context (story 2.5). Without these files the description would be empty or fabricated.

   **What to do:** Add the missing file(s) to your project's `planning-artifacts/` directory, then re-invoke the Dev agent in story-creation mode.
   ```

4. **Load both files.** Read the contents of `{project-root}/planning-artifacts/PRD.md` into `{prd_content}` and `{project-root}/planning-artifacts/architecture.md` into `{architecture_content}` for use by downstream steps.

5. **Confirm and continue.** Report to the user that prerequisite files are present and loaded, then proceed to the next step.

## NEXT

Steps 2–5 (epic picker, sprint-list picker, description composer, task creation) are not yet implemented. Inform the user that the `clickup-create-story` skill is still in progress and stop here.
