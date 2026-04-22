---
prd_content: ''
architecture_content: ''
---

# Step 1: Prereq File Check

## RULES

- This step is **read-only**. Do not write files, create ClickUp tasks, or call ClickUp APIs.
- If either required file is missing, **stop the entire skill run immediately**. Do not proceed to step 2.

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
