---
epic_number: ''
epic_title: ''
epic_raw_content: ''
epic_source_file: ''
---

# Step 3: Epic Picker

## RULES

- **Read-only.** This step reads only from `{epics_content}` (already loaded in step 1). No ClickUp API calls are made in this step.
- **No fabrication.** Never invent epic IDs or titles. Parse them exclusively from `{epics_content}`.
- **Blocking.** The step MUST NOT continue to step 4 if `{epic_title}` is empty.

## INSTRUCTIONS

1. **Parse `{epics_content}` to extract all epics.** BMAD 6.11 projects keep epics either as one file per epic under an `epics/` directory (the resolver's default) or as a single combined artifact. Step 1 loaded both shapes into `{epics_content}`, with a `=== <filename> ===` marker before each file when the source was a directory. Recognise an epic from any of these heading forms:
   - `## Epic N:` / `## Epic N —` — sections within a combined artifact.
   - `# Epic N:` / `# Epic N —` — a per-file epic's top-level heading.
   - `# EPIC-N:` / `# EPIC-N ` — the hyphenated per-file form.

   `N` is the numeric ID in every form. For each epic found, extract:
   - `{epic_number}` — the numeric ID (e.g. `1`, `2`, `3`)
   - `{epic_title}` — the full title text after the number and any separator (e.g. `ClickUp MCP integration layer`)
   - `{epic_raw_content}` — all text belonging to that epic: from its heading down to, but not including, the next epic heading at the same or higher level, the next `=== <filename> ===` marker, or end of content
   - `{epic_source_file}` — the filename from the nearest preceding `=== <filename> ===` marker, or the resolved single-file path when there is no marker

   **Publish, do not plan.** This step selects an epic that has _already been planned_ — by `bmad-create-epics-and-stories`, `bmad-prd`, or by hand — and publishes it to ClickUp. It never drafts epic content and never invokes an upstream planning workflow.

2. **Handle the no-epic and ambiguity cases.**

   If no epics are found in `{epics_content}`, emit the following error block and stop:

   ```
   ❌ **Epic picker failed — no epics found**

   Could not parse any epics from `{epics_info.path}` [{epics_info.layer}].

   **Why:** The skill expects an epic heading in one of these forms: `## Epic 1:`, `# Epic 1 —`, or `# EPIC-1: …`.

   **What to do:** Check that the epics artifact follows one of those formats, or point `epics_path` in `.bmadmcp/config.toml` `[docs]` at the right location, then re-invoke the skill.
   ```

   If two or more parsed epics share the same `{epic_number}` or the same normalised title (case-insensitive, whitespace-trimmed) — which happens when a directory holds both a per-epic file and a combined artifact — do NOT choose between them. List every colliding candidate with its `{epic_source_file}` and require the user to select one explicitly in instruction 4. Never resolve an ambiguous match silently.

3. Also call `searchTasks` with `list_ids: ["{backlog_list_id}"]` and no search terms to retrieve all existing root-level tasks in the Backlog list. Filter to root-level tasks only (those with no `parent_task_id`). Collect their names into `{existing_epic_names}` (a set of lowercase names for duplicate detection in step 5).

4. Present the parsed epics as a numbered pick-list. For each epic, indicate whether a task with the same title already exists in ClickUp. Show `{epic_source_file}` whenever the epics artifact resolved to a directory, or whenever two entries collide:

   ```
   [N] Epic {epic_number}: {epic_title}  ({epic_source_file})  ← already in ClickUp ✓
   [N] Epic {epic_number}: {epic_title}  ({epic_source_file})
   ```

   Follow the list with: "Which epic would you like to create in ClickUp? Enter the number."

   The pick-list is always presented, even when exactly one epic was parsed — the user confirms which epic is being published before any ClickUp write.

5. Parse the user's numeric response. Validate it is between 1 and N; if invalid, re-present and ask again.

6. Set `{epic_number}`, `{epic_title}`, `{epic_raw_content}`, and `{epic_source_file}` from the selected entry.

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

Proceed to [step-04-description-composer.md](./step-04-description-composer.md) with `{epic_number}`, `{epic_title}`, `{epic_raw_content}`, and `{epic_source_file}` available in step context (in addition to all variables set by steps 1–2).
