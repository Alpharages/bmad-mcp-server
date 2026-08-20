---
epic_number: ''
epic_title: ''
epic_raw_content: ''
---

# Step 3: Local Epic Picker

## RULES

- **Read-only.** This step reads only from `{epics_content}` (already loaded in step 1). No ClickUp API calls are made in this step.
- **No fabrication.** Never invent epic IDs or titles. Parse them exclusively from `{epics_content}`.
- **Blocking.** The step MUST NOT continue to step 4 if `{epic_title}` is empty.

## INSTRUCTIONS

1. Parse `{epics_content}` to extract all epics. Epics are identified by headers of the form `## Epic N:` or `## Epic N —` (where N is a number). For each epic found, extract:
   - `{epic_number}` — the numeric ID (e.g. `1`, `2`, `3`)
   - `{epic_title}` — the full title text after the number (e.g. `ClickUp MCP integration layer`)
   - `{epic_raw_content}` — all text belonging to that epic (from its `## Epic N` header down to, but not including, the next `## Epic` header or end of file)

2. If no epics are found in `{epics_content}`, emit the following error block and stop:

   ```
   ❌ **Local epic picker failed — no epics found**

   Could not parse any epics from `planning-artifacts/epics-and-stories.md`.

   **Why:** The skill expects epic sections to start with headers like `## Epic 1:` or `## Epic 1 —`.

   **What to do:** Check that `planning-artifacts/epics-and-stories.md` follows the expected format, then re-invoke the skill.
   ```

3. Also call `searchTasks` with `list_ids: ["{backlog_list_id}"]` and no search terms to retrieve all existing root-level tasks in the Backlog list. Filter to root-level tasks only (those with no `parent_task_id`). Collect their names into `{existing_epic_names}` (a set of lowercase names for duplicate detection in step 5).

4. Present the parsed epics as a numbered pick-list. For each epic, indicate whether a task with the same title already exists in ClickUp:

   ```
   [N] Epic {epic_number}: {epic_title}  ← already in ClickUp ✓
   [N] Epic {epic_number}: {epic_title}
   ```

   Follow the list with: "Which epic would you like to create in ClickUp? Enter the number."

5. Parse the user's numeric response. Validate it is between 1 and N; if invalid, re-present and ask again.

6. Set `{epic_number}`, `{epic_title}`, and `{epic_raw_content}` from the selected entry.

7. If the selected epic title already exists in `{existing_epic_names}` (case-insensitive), emit the following warning and require explicit confirmation before continuing:

   > ⚠️ **Epic already exists in ClickUp**
   >
   > A task named "{epic_title}" already exists in the Backlog list.
   >
   > **Creating a duplicate epic may cause confusion.**
   >
   > Type `y` to proceed anyway, or press Enter to abort. [y/N]

   If the user types `y`, continue. Otherwise emit `❌ Epic creation cancelled — duplicate detected.` and stop.

8. Confirm: "Selected: **Epic {epic_number}: {epic_title}**. Continuing to description composer…"

## NEXT

Proceed to [step-04-description-composer.md](./step-04-description-composer.md) with `{epic_number}`, `{epic_title}`, and `{epic_raw_content}` available in step context (in addition to all variables set by steps 1–2).
