---
epic_id: ''
epic_name: ''
---

# Step 3: Epic Picker

## RULES

1. **Optional step.** This step is skippable — bugs do not require an epic parent. When the user skips, `{epic_id}` and `{epic_name}` remain `''`. Step 5 checks `{epic_id}` before setting `parent_task_id` on the created task — an empty value means no parent.

2. **Read-only.** This step calls only `searchSpaces` and `searchTasks`. MUST NOT call any ClickUp write tool.

3. **No fabrication.** MUST NOT invent or assume an epic ID. Always display the enumerated list of epics from `searchTasks` and wait for explicit user selection. If the user skips, `{epic_id}` stays `''`.

## INSTRUCTIONS

1. **Pinned-config short-circuit.** Read `{project-root}/.bmadmcp/config.toml` if it exists. Treat any missing file, missing section, or missing key as unset.

   Derive effective pinned values:

   ```
   effective pinned_epic_id   = [clickup_create_bug].pinned_epic_id   if non-empty
   effective pinned_epic_name = [clickup_create_bug].pinned_epic_name if non-empty
                                else "(pinned)" if pinned_epic_id is set
   ```

   - **If `pinned_epic_id` is set:** confirm to the user:

     > ✅ Epic pinned via .bmadmcp/config.toml — skipping epic picker.

     Set `{epic_id}` = effective `pinned_epic_id`, `{epic_name}` = effective `pinned_epic_name`. Proceed directly to step 4 (`## NEXT`).

   - **Otherwise:** continue to instruction 2.

2. **Skip prompt.** Emit the following verbatim:

   > 🔗 **Optional: Attach this bug to an epic**
   >
   > Bugs do not require an epic parent. Press **Enter** or type `s` to skip and create the bug without a parent. Type `y` to browse epics.

   Wait for user input:
   - `s` or empty input (Enter alone): set `{epic_id}` = `''`, `{epic_name}` = `''`. Emit `⏭️ Epic picker skipped — bug will be created without an epic parent.` Proceed to step 4 (`## NEXT`).
   - `y`: continue to instruction 3.

3. **Resolve Backlog list.** Derive `{backlog_list_id}` via the cascade below. Treat any missing file, missing section, or missing key as unset:

   ```
   effective backlog_list_id = [clickup].pinned_backlog_list_id              if non-empty
                               else [clickup_create_story].pinned_backlog_list_id if non-empty
                               else (discover via searchSpaces)
   ```

   - **If effective `backlog_list_id` is set:** proceed to instruction 5.
   - **If not set:** call `searchSpaces` with `terms: ["{space_name}"]` using the `{space_name}` from step 2's front-matter. Scan the returned list tree for a list whose name is exactly `Backlog` (case-insensitive). If found, set `{backlog_list_id}` and proceed to instruction 5. If not found, emit the error block in instruction 4 and ask whether to skip.

4. **Backlog-not-found fallback.** If no Backlog list was located in instruction 3, emit the following verbatim:

   > ❌ **Epic picker failed — Backlog list not found**
   >
   > Could not find a list named "Backlog" in space **{space_name}**.
   >
   > **Why:** Epics are stored as root-level tasks in the Backlog list. Without it the picker cannot enumerate epics.
   >
   > **What to do:** Create a "Backlog" list in your space, set `[clickup].pinned_backlog_list_id` in `.bmadmcp/config.toml`, or skip the epic picker.

   Ask: `Skip epic picker and create bug without a parent? [Y/n]`
   - Y or Enter: set `{epic_id}` = `''`, `{epic_name}` = `''`. Proceed to step 4 (`## NEXT`).
   - N: stop.

5. **Enumerate epics.** Call `searchTasks` with `list_ids: ["{backlog_list_id}"]` and no search terms to retrieve all tasks in the Backlog list.

   **Filter to root-level tasks only.** Drop any task whose `parent_task_id` field is non-empty. Treat all of the following as "no parent" (keep the task): the field is missing entirely from the response, the value is the literal string `null`, the value is an empty string `''`, or the value is JSON `null`. Only tasks that survive this filter are candidate epics.

6. **No epics found.** If zero root-level tasks are returned, emit the following verbatim:

   > ⚠️ **No epics found in Backlog list**
   >
   > The Backlog list (`{backlog_list_id}`) contains no root-level tasks.
   >
   > **Why:** Epics are created by the team lead as root-level tasks in the Backlog list before bugs can be attached to them.

   Ask: `Skip epic picker and create bug without a parent? [Y/n]`
   - Y or Enter: set `{epic_id}` = `''`, `{epic_name}` = `''`. Proceed to step 4 (`## NEXT`).
   - N: stop.

7. **Present epic list.** Display a numbered pick-list:

   ```
   [N] <epic_name> (ID: <task_id>) — status: <status>
   ```

   Follow with:

   > "Which epic should this bug be attached to? Enter the number, or press **Enter** to skip (no parent)."

8. **Parse selection.**
   - **Empty input (Enter alone):** set `{epic_id}` = `''`, `{epic_name}` = `''`. Emit `⏭️ No epic selected — bug will be created without a parent.` Proceed to step 4 (`## NEXT`).
   - **Numeric input:** validate the number is between 1 and N. If invalid, re-present the list and ask again.
   - Set `{epic_id}` = selected task ID, `{epic_name}` = selected task name.
   - Confirm:

     > ✅ Epic selected: **{epic_name}** (`{epic_id}`). Continuing to description composer…

## NEXT

Proceed to [step-04-description-composer.md](./step-04-description-composer.md).
