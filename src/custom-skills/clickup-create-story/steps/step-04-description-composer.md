---
epic_description: ''
story_title: ''
story_entry: ''
task_description: ''
---

# Step 4: Description Composer (via bmad-create-story)

## RULES

- **Delegate to bmad-create-story.** Do NOT compose an ad-hoc description here. Invoke the `bmad-create-story` workflow via the `bmad` tool (`execute` operation, workflow name `bmad-create-story`). The exhaustive artifact analysis, BDD criteria generation, architecture guardrail extraction, previous-story intelligence, and web research all live there and stay in sync with upstream automatically.
- **Content-composition mode only.** Instruct `bmad-create-story` to produce story content but NOT write to any local file. The composed content is captured here and posted as the ClickUp task description in step 5.
- **Skip file-system side-effects.** Skip steps 5 (write story file) and 6 (update sprint-status.yaml) of `bmad-create-story`. ClickUp is the record.
- **No fabrication.** `bmad-create-story` must not invent requirements not traceable to planning artifacts or the epic ClickUp task.
- **Blocking.** MUST NOT continue to step 5 if `{task_description}` is empty at the end of this step.
- **No-epic override.** When `{epic_id}` is `''`, instruction 3 MUST use branch 3b (the no-epic override block). The composed description MUST NOT contain an "Epic:" or "Parent epic:" field or reference.

## INSTRUCTIONS

### 1. Get story title

Ask: "What is the title for the new story? (This becomes the ClickUp task name.)"

Parse into `{story_title}`. If empty, re-ask. Accept optional follow-up: "Any additional scope notes? (Press Enter to skip.)" Store as `{scope_notes}` if non-empty.

### 2. Fetch epic from ClickUp

- When `{epic_id}` is non-empty: call `getTaskById` with `id: "{epic_id}"`. Extract the epic description text (strip metadata block and all `Comment by …` lines). Store as `{epic_description}`. If fetch fails, set `{epic_description}` = `''` and warn (non-fatal — continue).
- When `{epic_id}` is `''`: skip `getTaskById`. Set `{epic_description}` = `''`. Emit: `ℹ️ No epic parent — epic context will be empty in the story description.`

### 3. Invoke bmad-create-story in content-composition mode

> **Branch dispatch:** If `{epic_id}` is non-empty → use branch 3a. If `{epic_id}` is `''` → use branch 3b.

#### Branch 3a — Epic path (`{epic_id}` is non-empty)

Execute the `bmad-create-story` workflow via the `bmad` tool with the following pre-supplied context and overrides:

**Pre-supplied context (skip upstream discovery steps):**

```
Story title: {story_title}
Epic: {epic_name} ({epic_id})
Epic description: {epic_description}
PRD content: already loaded in conversation context (from step 1: prereq check)
Architecture content: already loaded in conversation context
Epics-and-stories content: {epics_content — already loaded in step 1, or empty}
Scope notes: {scope_notes or empty}
```

**Override instructions for bmad-create-story:**

- **Step 1 (Determine target story):** Skip discovery from sprint-status. Story is pre-supplied: `story_title` = `{story_title}`, epic context = above. Set `story_key` from the title.
- **Step 2 (Load and analyze core artifacts):** Run in full — PRD, architecture, epics-and-stories content are already in conversation context. Use them directly without re-reading files.
- **Step 3 (Architecture analysis):** Run in full.
- **Step 4 (Web research):** Run in full.
- **Step 5 (Create comprehensive story file):** Run the COMPOSITION only — produce the full story document content. Do NOT write to any local file. Return the composed content.
- **Step 6 (Update sprint status):** Skip entirely. ClickUp task creation (step 5 of this skill) is the equivalent.

#### Branch 3b — No-epic path (`{epic_id}` is `''`)

Execute `bmad-create-story` with the following no-epic pre-supplied context and override instructions:

**Pre-supplied context:**

```
Story title: {story_title}
Epic: (none — standalone task)
Epic description: (none)
PRD content: already loaded in conversation context (from step 1: prereq check)
Architecture content: already loaded in conversation context
Epics-and-stories content: {epics_content — available for general technical context only; do NOT look for an epic-specific section}
Scope notes: {scope_notes or empty}
```

**Override instructions for bmad-create-story:**

- **Step 1 (Determine target story):** Skip discovery from sprint-status. Story is pre-supplied: `story_title` = `{story_title}`. No epic parent — set `epic_num` to none; set `story_key` = kebab-case of `{story_title}`.
- **Step 2 (Load and analyze core artifacts):** Run in full — but do NOT extract epic-specific content from `{epics_content}` (there is no epic parent for this story). Use PRD and architecture as the primary context. Epics content is available for general technical reference only (e.g., cross-cutting constraints, shared terminology).
- **Step 3 (Architecture analysis):** Run in full.
- **Step 4 (Web research):** Run in full.
- **Step 5 (Create comprehensive story file):** Run COMPOSITION only — produce the full story document content. **Do NOT include an "Epic:" or "Parent epic:" field anywhere in the document.** Do NOT write to any local file. Return the composed content.
- **Step 6 (Update sprint status):** Skip entirely. ClickUp task creation (step 5 of this skill) is the equivalent.

> **Convention:** `{epic_id}` = `''` is the sentinel for "no parent". It is intentionally passed to `bmad-create-story` as an empty epic block so the workflow's full artifact analysis (PRD, architecture) still runs but the resulting description contains no epic association.

### 4. Capture the composed content

After `bmad-create-story` completes its composition, capture the full story document it produced as `{task_description}`. This is the content that will become the ClickUp task description.

If `{scope_notes}` is non-empty and not already included by `bmad-create-story`, append a `## Scope Notes` section before the footer line.

### 5. Present for review

```
📝 **Proposed task description for "{story_title}":**

---
{task_description}
---

Does this description look correct? [Y/n/edit]
```

- `Y` or Enter → proceed.
- `n` → ask "What would you like to change?", re-invoke `bmad-create-story` step 5 with the feedback using the same branch override context (3a or 3b) as the initial invocation in instruction 3, re-present. Repeat until confirmed.
- `edit` → ask the user to paste the full revised description terminated by `---END---`. Parse as the new `{task_description}`.

### 6. Confirm

Emit `✅ Description set for story "{story_title}". Continuing to task creation…` and proceed to step 5.

## NEXT

Proceed to [step-05-create-task.md](./step-05-create-task.md) with `{story_title}`, `{task_description}`, `{epic_id}`, `{epic_name}`, `{sprint_list_id}`, and `{sprint_list_name}` available in step context.
