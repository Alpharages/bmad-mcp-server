---
epic_description: ''
story_title: ''
task_description: ''
---

# Step 4: Description Composer

## RULES

- **Mode note.** `getTaskById` is available in **all** `CLICKUP_MCP_MODE` values (`read-minimal`, `read`, `write`). Since the full skill requires `write` mode (for `createTask` in step-05 and `searchSpaces` in steps 02–03), this step always runs in `write` context.
- **Read-only.** This step calls only `getTaskById` for the epic; it MUST NOT call `createTask`, `updateTask`, `addComment`, or any other write tool.
- **Blocking.** The step MUST NOT continue to step 5 if `{task_description}` is empty at the end of this step.
- **No fabrication.** The description MUST NOT invent requirements, acceptance criteria, or technical constraints that cannot be traced to `{prd_content}`, `{architecture_content}`, the epic task response, or explicit user input; if the planning artifacts are thin, the description should be shorter, not padded with plausible-sounding content.

## INSTRUCTIONS

1. Verify that `{prd_content}`, `{architecture_content}`, `{epic_id}`, and `{epic_name}` are all non-empty. If any are missing, emit the standard missing-context error block below and stop.

   ```
   ❌ **Description composer failed — missing upstream context**

   The `clickup-create-story` skill requires the following variables to be set before the description composer can run:

   - `{prd_content}` — {MISSING or present}  (set by step 1: prereq check)
   - `{architecture_content}` — {MISSING or present}  (set by step 1: prereq check)
   - `{epic_id}` — {MISSING or present}  (set by step 2: epic picker)
   - `{epic_name}` — {MISSING or present}  (set by step 2: epic picker)

   **Why:** The description is synthesized from PRD + architecture content and the selected epic's ClickUp task. Without these inputs, the description would be empty or fabricated.

   **What to do:** Re-run from step 1 to ensure all prerequisite steps have completed successfully, then return to this step.
   ```

   Replace `{MISSING or present}` with the actual status of each variable at runtime.

2. Confirm current context to the user:

   ```
   📋 **Description composer context**
   - Epic: **{epic_name}** (`{epic_id}`)
   - Sprint list: **{sprint_list_name}**
   - PRD: loaded ✓
   - Architecture: loaded ✓
   ```

3. Ask: "What is the title for the new story? (This becomes the ClickUp task name.)"

4. Parse the user's response and set `{story_title}`. Validate it is non-empty; if empty, re-ask.

5. Ask (optional follow-up): "Any additional scope notes for this story? (Press Enter to skip.)" Accept free-text or empty input. Store as `{scope_notes}` (a local variable for this step only) if non-empty.

6. Call `getTaskById` with `id: "{epic_id}"` to fetch the full epic task details. The response contains task metadata, then the task's own description content, then comments (each prefixed with `Comment by {username} on {date}:`), then status-change events. Extract only the text **before** the first `Comment by` line as `{epic_description}` — do not include any comment or status-change content. If `getTaskById` returns an error or the pre-comment content is empty, warn the user ("⚠️ Could not fetch epic description — proceeding without it.") and continue with `{epic_description}` as an empty string.

7. Compose `{task_description}` as a structured Markdown document following the template below. The composer MUST:
   - Pull a concise "Business Context" summary (≤5 bullet points) from `{prd_content}` — specifically the Problem, Goal, and the Functional requirements most relevant to `{story_title}`.
   - Pull a concise "Technical Context" summary (≤5 bullet points) from `{architecture_content}` — the tech stack, key patterns, and constraints most relevant to `{story_title}`.
   - Include the full `{epic_description}` under the Epic section (unmodified — the human owns this text).
   - Include `{scope_notes}` under a "Scope Notes" section if non-empty; omit the section entirely if empty.
   - Keep each section focused: synthesize and reference, do not paste entire documents verbatim.

   Compose `{task_description}` using this exact structure. Copy the heading and divider style, synthesizing the bullet content from the sources above rather than copying the placeholder bullets verbatim:

   ```text
   ## Epic: {epic_name}

   {epic_description}

   ---

   ## Business Context

   _Synthesized from planning-artifacts/PRD.md_

   - [bullet 1 — problem, goal, or relevant functional requirement]
   - [bullet 2 …]
   - … (up to 5 bullets)

   ---

   ## Technical Context

   _Synthesized from planning-artifacts/architecture.md_

   - [bullet 1 — stack, pattern, or constraint relevant to this story]
   - [bullet 2 …]
   - … (up to 5 bullets)

   ---

   ## Scope Notes

   {scope_notes}

   ---

   _Created by Dev agent (story-creation mode) via bmad-mcp-server `clickup-create-story` skill. Sprint: {sprint_list_name}._
   ```

   If `{epic_description}` is empty, keep the Epic section heading but replace the body with: `_Epic description unavailable — see ClickUp task {epic_id}._`

   If `{scope_notes}` is empty, omit the entire "Scope Notes" section including its heading and divider.

   After composing the description body, check whether `planning-artifacts/ux-design.md` or `planning-artifacts/tech-spec.md` exists. If either exists, append a single line to the footer: "See also: `planning-artifacts/ux-design.md`." (or `tech-spec.md` as appropriate). Do not warn or fail if they are absent.

8. Present the composed description to the user:

   ```
   📝 **Proposed task description for "{story_title}":**

   ---
   {task_description}
   ---

   Does this description look correct? [Y/n/edit]
   ```

   - If user replies `Y` or presses Enter: proceed.
   - If user replies `n`: ask "What would you like to change?" and accept free-text edit instructions. Regenerate the description applying the requested changes. Re-present and ask again. Repeat until confirmed.
   - If user replies `edit`: instruct the user to paste the full revised description, terminated by a line containing only `---END---`. Parse the pasted text as the new `{task_description}` and confirm it back to the user before proceeding.

9. Confirm the finalized description: emit `✅ Description set for story "{story_title}". Continuing to task creation…` and proceed to step 5.

## NEXT

Proceed to [step-05-create-task.md](./step-05-create-task.md) (story 2.6) with `{story_title}`, `{task_description}`, `{epic_id}`, `{epic_name}`, `{sprint_list_id}`, and `{sprint_list_name}` available in step context.
