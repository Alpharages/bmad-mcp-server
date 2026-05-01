---
space_id: ''
space_name: ''
target_list_id: ''
target_list_name: ''
---

# Step 2: List Picker

## RULES

1. **Mode requirement.** `searchSpaces` is not registered in `read-minimal` mode; `CLICKUP_MCP_MODE` MUST be `read` or `write`. Since `createTask` in step 5 requires `write`, the practical minimum for the full skill is `write` mode.
2. **Read-only.** This step calls only `getCurrentSpace`, `clearCurrentSpace`, `pickSpace`, and `searchSpaces`. MUST NOT call any ClickUp write tool.
3. **Blocking.** MUST NOT proceed to step 3 if `{target_list_id}` or `{space_id}` is empty at the end of this step.
4. **No fabrication.** MUST NOT invent or assume a list ID. Always display the enumerated list and wait for explicit user selection when no pinned value is present.

## INSTRUCTIONS

1. **Pinned-config full short-circuit.** Read `{project-root}/.bmadmcp/config.toml` if it exists. Treat any missing file, missing section, or missing key as unset.

   Derive the effective pinned values using the cascade:

   ```
   effective target_list_id   = [clickup_create_bug].target_list_id   if non-empty
   effective pinned_space_id  = [clickup_create_bug].pinned_space_id  if non-empty,
                                 else [clickup].pinned_space_id
   effective pinned_space_name = [clickup_create_bug].pinned_space_name if non-empty,
                                  else [clickup].pinned_space_name
   ```

   - **If effective `target_list_id` is set:** skip all discovery. Set `{target_list_id}` = effective `target_list_id`, `{space_id}` = effective `pinned_space_id` (or `""` if unset — step 3 does not require it), `{space_name}` = effective `pinned_space_name` (fall back to `(pinned)` if unset). Confirm:

     > ✅ Target list pinned via .bmadmcp/config.toml — skipping list picker.

     If the pinned `target_list_id` later causes a ClickUp API error in step 5 (list not found, permission denied), surface the error verbatim and instruct the user to update or remove `[clickup_create_bug].target_list_id` in `.bmadmcp/config.toml`. Then proceed directly to step 3 (epic picker).

   - **If only effective `pinned_space_id` is set (no `target_list_id`):** skip `getCurrentSpace` and `pickSpace`. Set `{space_id}` = effective `pinned_space_id`, `{space_name}` = effective `pinned_space_name` (or `(pinned)`). Proceed directly to instruction 6 (list discovery).

   - **If neither pin is set:** continue to instruction 2 (space selection).

2. **Space selection — session check.** Call `getCurrentSpace` (no arguments). If a space is already selected for this MCP session, confirm with the user:

   > Current space: **{space_name}** (`{space_id}`). Use this space? [Y/n]

   If confirmed, set `{space_id}` and `{space_name}` from the response and skip to instruction 6. If declined, call `clearCurrentSpace` and continue to instruction 3.

3. **Space selection — interactive picker.** Call `pickSpace` with no arguments to list all available spaces. Ask:

   > "Which space are you working in? Enter the space name or ID."

4. Call `pickSpace` with `query: "<user input>"` to select the space. If one match, extract `{space_id}` and `{space_name}` from the confirmation response. If multiple matches, present them and ask the user to narrow the query or provide the exact space ID.

5. Call `searchSpaces` with `terms: ["{space_name}"]`. If the call fails or returns an error response, emit the following error block and stop:

   ```
   ❌ **List picker failed — space search error**

   The `searchSpaces` call for space **{space_name}** returned an error.

   **Why:** The ClickUp API or MCP tool encountered a problem retrieving the space list tree.

   **What to do:** Check your ClickUp API key and network connection, then re-invoke this step.
   ```

   If the response is in summary mode (no list data — occurs when the space name matches more than five spaces), emit the following error block and stop:

   ```
   ❌ **List picker failed — space name is ambiguous**

   The name "{space_name}" matched multiple spaces and the search returned summary mode with no list data.

   **Why:** `searchSpaces` switches to summary mode when more than five spaces match the query. In summary mode, list data is not included.

   **What to do:** Re-run space selection with a more specific name or the exact space ID, then re-invoke this step.
   ```

   From the detailed response, filter the tree to entries matching `{space_id}` to ensure only the selected space's lists are shown. Collect **all lists** visible in the tree — both lists at the top level of the space and lists nested inside folders. Filter out any list where `archived: true`.

   If no non-archived lists are found, emit the following error block and stop:

   ```
   ❌ **List picker failed — no active lists**

   Space **{space_name}** (`{space_id}`) contains no non-archived lists.

   **Why:** All lists in this space are archived or the space is empty.

   **What to do:** Unarchive a list or create a new list in your ClickUp space, then re-invoke this step.
   ```

6. **List presentation.** Present a numbered list of non-archived lists:

   ```
   [N] <list_name> (list_id: <id>)  [folder: <folder_name>]
   ```

   Omit the `[folder: …]` clause for top-level (unfoldered) lists. Precede the list with the hint:

   > "Select the list where this bug ticket should be created. You can choose the active sprint list, a dedicated bugs list, or any other list."

   Follow with:

   > "Enter the number of the target list."

7. **Parse selection.** Validate the user's response is a number between 1 and N; if invalid, re-present the list and ask again. Set `{target_list_id}` to the selected list's ID and `{target_list_name}` to its name.

8. **Auto-save discovered values.** If `{target_list_id}` was set by interactive selection in instruction 7 (i.e., NOT from a pinned config value), persist the choice so future runs skip the picker:

   a. Use the Write/Edit tool to write `target_list_id = {target_list_id}` into the `[clickup_create_bug]` section of `.bmadmcp/config.toml`.
   - If the file does not exist, create it with just the `[clickup_create_bug]` section.
   - If the file exists but has no `[clickup_create_bug]` section, append the section.
   - If the `[clickup_create_bug]` section already exists, update the key only if it is absent or empty.

   b. If the space was resolved interactively (instructions 2–4, not from a pinned `[clickup].pinned_space_id`), also write `pinned_space_id` and `pinned_space_name` into the `[clickup]` section using the same create-or-append-or-skip-if-set logic.

   c. Before writing each key, check whether it already exists with a non-empty value. If it does and the current value differs from the discovered value, emit a non-fatal warning:
   `⚠️ .bmadmcp/config.toml already has [{section}].{key} set — not overwriting. Update manually if needed.`
   and skip that key.

   d. After a successful write, confirm:
   `✅ Target list saved to .bmadmcp/config.toml ([clickup_create_bug].target_list_id) — future runs will skip this picker.`

   e. If the write fails for any reason (permission error, disk error), emit a non-fatal warning and continue — auto-save is supplemental and MUST NOT interrupt the skill session.

9. **Confirm selection.** Emit:

   > ✅ Target list selected: **{target_list_name}** (list_id: `{target_list_id}`).
   > Continuing to epic picker…

   Then proceed to step 3.

## NEXT

Proceed to [step-03-epic-picker.md](./step-03-epic-picker.md).
