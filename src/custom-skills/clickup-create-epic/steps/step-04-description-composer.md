---
epic_description: ''
---

# Step 4: Description Composer

## RULES

- **Read-only.** This step makes no ClickUp API calls. It composes the description from already-loaded local content.
- **Blocking.** The step MUST NOT continue to step 5 if `{epic_description}` is empty.
- **No fabrication.** The description MUST NOT invent goals, requirements, or technical constraints that cannot be traced to `{prd_content}`, `{architecture_content}`, or `{epic_raw_content}`. If the planning artifacts are thin, the description should be shorter, not padded with plausible-sounding content.

## INSTRUCTIONS

1. Verify that `{prd_content}`, `{architecture_content}`, `{epic_raw_content}`, `{epic_number}`, and `{epic_title}` are all non-empty. If any are missing, emit the following error block and stop:

   ```
   ❌ **Description composer failed — missing upstream context**

   The `clickup-create-epic` skill requires the following variables to be set:

   - `{prd_content}` — {MISSING or present}  (set by step 1)
   - `{architecture_content}` — {MISSING or present}  (set by step 1)
   - `{epic_raw_content}` — {MISSING or present}  (set by step 3)
   - `{epic_number}` — {MISSING or present}  (set by step 3)
   - `{epic_title}` — {MISSING or present}  (set by step 3)

   **What to do:** Re-run from step 1 to ensure all prerequisite steps have completed, then return to this step.
   ```

2. Confirm current context to the user:

   ```
   📋 **Description composer context**
   - Epic: **{epic_number}: {epic_title}**
   - Backlog list: `{backlog_list_id}` in space **{space_name}**
   - PRD: loaded ✓
   - Architecture: loaded ✓
   - Local epic content: loaded ✓
   ```

3. Ask (optional): "Any additional scope notes for this epic? (Press Enter to skip.)" Accept free-text or empty input. Store as `{scope_notes}` if non-empty.

4. Compose `{epic_description}` as a structured Markdown document following the template below. The composer MUST:
   - Include the full `{epic_raw_content}` under the "Epic Definition" section (unmodified — the human owns this text).
   - Pull a concise "Business Context" summary (≤5 bullets) from `{prd_content}` — the Problem, Goal, and functional requirements most relevant to this epic.
   - Pull a concise "Technical Context" summary (≤5 bullets) from `{architecture_content}` — the tech stack, key patterns, and constraints most relevant to this epic.
   - Include `{scope_notes}` under a "Scope Notes" section if non-empty; omit the section entirely if empty.
   - Keep each section focused: synthesize and reference, do not paste entire documents verbatim.

   Use this exact structure:

   ```text
   ## Epic {epic_number}: {epic_title}

   {epic_raw_content}

   ---

   ## Business Context

   _Synthesized from planning-artifacts/PRD.md_

   - [bullet 1 — problem, goal, or relevant functional requirement]
   - [bullet 2 …]
   - … (up to 5 bullets)

   ---

   ## Technical Context

   _Synthesized from planning-artifacts/architecture.md_

   - [bullet 1 — stack, pattern, or constraint relevant to this epic]
   - [bullet 2 …]
   - … (up to 5 bullets)

   ---

   ## Scope Notes

   {scope_notes}

   ---

   _Created by bmad-mcp-server `clickup-create-epic` skill from planning-artifacts/epics-and-stories.md._
   ```

   If `{scope_notes}` is empty, omit the entire "Scope Notes" section including its heading and divider.

   After composing the description, check whether `planning-artifacts/tech-spec.md` exists. If it does, append to the footer: "See also: `planning-artifacts/tech-spec.md`."

5. Present the composed description to the user:

   ```
   📝 **Proposed epic description for "Epic {epic_number}: {epic_title}":**

   ---
   {epic_description}
   ---

   Does this description look correct? [Y/n/edit]
   ```

   - If user replies `Y` or presses Enter: proceed.
   - If user replies `n`: ask "What would you like to change?" and accept free-text edit instructions. Regenerate the description applying the requested changes. Re-present and ask again. Repeat until confirmed.
   - If user replies `edit`: instruct the user to paste the full revised description, terminated by a line containing only `---END---`. Parse the pasted text as the new `{epic_description}` and confirm it back to the user before proceeding.

6. Confirm: "✅ Description set for Epic {epic_number}: {epic_title}. Continuing to task creation…"

## NEXT

Proceed to [step-05-create-task.md](./step-05-create-task.md) with `{epic_description}` available in step context (in addition to all variables set by steps 1–3).
