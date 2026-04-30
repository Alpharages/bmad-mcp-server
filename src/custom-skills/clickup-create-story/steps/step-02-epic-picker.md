---
space_id: ''
space_name: ''
backlog_list_id: ''
epic_id: ''
epic_name: ''
---

# Step 2: Epic Picker

## RULES

- **Mode requirement.** `CLICKUP_MCP_MODE` must be `read` or `write`. `searchSpaces` is not registered in `read-minimal` mode; since `createTask` in story 2.6 requires `write` mode, the practical minimum for the full skill is `write` mode. See `src/tools/clickup-adapter.ts` lines 167–188.
- **Near-read-only.** This step calls only `pickSpace`, `getCurrentSpace`, `clearCurrentSpace`, `searchSpaces`, and `searchTasks`. No writes to ClickUp are performed.
- **Early-exit.** Stop the skill run immediately if the user cannot identify a space, or if no Backlog list exists in the chosen space.
- **No fabrication.** Never invent or assume an epic ID. Always display the enumerated list of epics and wait for explicit user selection.
- **No-epic option.** When `[clickup_create_story].allow_no_epic` is `true` (the default), the pick-list includes a "no epic" entry. Selecting it sets `{epic_id}` = `''` and `{epic_name}` = `''`. Step 5 omits `parent_task_id` when `{epic_id}` is empty.

## INSTRUCTIONS

0. **Pinned-config short-circuit (two-level cascade).** Read `{project-root}/.bmadmcp/config.toml` if it exists.
   Derive the effective pinned values using the cascade below. Treat any missing file, missing table, or missing key as unset (empty).

   ```
   effective pinned_space_id        = [clickup_create_story].pinned_space_id        if non-empty,
                                      else [clickup].pinned_space_id
   effective pinned_space_name      = [clickup_create_story].pinned_space_name      if non-empty,
                                      else [clickup].pinned_space_name
   effective pinned_backlog_list_id = [clickup_create_story].pinned_backlog_list_id if non-empty,
                                      else [clickup].pinned_backlog_list_id
   effective allow_no_epic          = [clickup_create_story].allow_no_epic          if set,
                                      else true
   ```

   Persist `effective_allow_no_epic` in step context for later instructions.
   - **If both effective `pinned_space_id` AND effective `pinned_backlog_list_id` are set to non-empty values:** skip the space and backlog discovery calls below. Set `{space_id}` = effective `pinned_space_id`, `{space_name}` = effective `pinned_space_name` (fall back to `(pinned)` if that key is unset), `{backlog_list_id}` = effective `pinned_backlog_list_id`. Confirm to the user: `✅ Space + backlog list pinned via .bmadmcp/config.toml — skipping picker.` Proceed directly to instruction 8 below (`searchTasks`) using the pinned `{backlog_list_id}`. If `searchTasks` returns "list not found" or a similar error, surface it verbatim and instruct the user to update or remove the pinned IDs in `.bmadmcp/config.toml`.
   - **If only effective `pinned_space_id` is set:** skip `getCurrentSpace` and `pickSpace`. Set `{space_id}` = effective `pinned_space_id`, `{space_name}` = effective `pinned_space_name` (or `(pinned)`). Continue to instruction 5 below (`searchSpaces`).
   - **If only effective `pinned_backlog_list_id` is set (no effective `pinned_space_id`):** continue to instruction 1 below; the list-pin will be applied at instruction 6.
   - **If no effective pins are set:** continue to instruction 1 below.

1. Call `getCurrentSpace` (no arguments) to check if a space is already selected for this MCP session. If a space is returned, confirm with the user: "Current space: **{space_name}** (`{space_id}`). Use this space? [Y/n]". If confirmed, set `{space_id}` and `{space_name}` from the response and skip to step 5. If declined, call `clearCurrentSpace` and continue to step 2.

2. Call `pickSpace` with no arguments to list all available spaces.

3. Ask: "Which space are you working in? Enter the space name or ID."

4. Call `pickSpace` with `query: "<user input>"` to select the space. If one match, the session is updated automatically — extract `{space_id}` and `{space_name}` from the confirmation response. If multiple matches, present them and ask the user to narrow the query or provide the exact space ID.

5. Call `searchSpaces` with `terms: ["{space_name}"]` to retrieve the detailed folder/list tree for the selected space (single-space search guarantees the ≤5 threshold for detailed mode).

6. **Pinned-list short-circuit (cascade).** Before scanning the tree, derive the effective `pinned_backlog_list_id` using the same two-level cascade as instruction 0: `[clickup_create_story].pinned_backlog_list_id` if non-empty, else `[clickup].pinned_backlog_list_id`. If the effective value is non-empty, verify that the pinned ID appears as a list in the tree returned by `searchSpaces`; if it does, set `{backlog_list_id}` to the pinned value, confirm `✅ Backlog list pinned via config: {backlog_list_id}` to the user, and skip the scan. If the pinned ID is not found in the tree, warn the user (`⚠️ pinned_backlog_list_id not found in current space — falling back to scan`) and continue with the scan below. If the key is unset or empty, proceed directly to the scan.

   Scan the tree for a list whose name matches `Backlog` (case-insensitive). If found, set `{backlog_list_id}` automatically (do not ask the user). If NOT found, present all lists visible in the tree and ask: "I couldn't find a list named 'Backlog'. Enter the name or number of the list that holds your epics."

7. **Auto-save discovered values to `[clickup]`.** If the backlog list in instruction 6 was resolved via the interactive picker (scan or user choice) — i.e., NOT from a pinned config value — persist the discovered space and list IDs so future runs skip the picker:

   a. Use the Write/Edit tool to write `pinned_space_id`, `pinned_space_name`, and `pinned_backlog_list_id` into the `[clickup]` section of `.bmadmcp/config.toml`.
   - If the file does not exist, create it with just the `[clickup]` section.
   - If the file exists but has no `[clickup]` section, append the section.
   - If the `[clickup]` section already exists, update only keys that are absent or empty.

   b. Before writing each key, check whether it already exists with a non-empty value in the file. If it does and the current value differs from the discovered value, emit:
   `⚠️ .bmadmcp/config.toml already has [clickup].{key} set — not overwriting. Update manually if needed.`
   and skip that key.

   c. After a successful write, confirm:
   `✅ Space + backlog list saved to .bmadmcp/config.toml ([clickup] table) — future runs will skip this picker.`

   d. If the write fails for any reason (permission error, disk error), emit a non-fatal warning and continue — auto-save is supplemental, the skill session is not interrupted.

8. Call `searchTasks` with `list_ids: ["{backlog_list_id}"]` and no search terms to retrieve all tasks in the Backlog list.

   **Filter the results to root-level tasks only.** For each returned task, drop it unless its `parent_task_id` field is null/absent/empty. Treat all of the following as "no parent": the field is missing entirely from the response, the value is the literal string `null`, the value is the literal empty string `''`, or the value is JSON `null`. Only keep tasks that survive this filter — these are the candidate epics. Subtasks (created later under the same-list pivot per `cross-list-subtask-block`) MUST NOT appear as candidate epics in the picker.

9. If zero tasks are returned:
   - When `effective_allow_no_epic` is `true`, emit:

     ```
     ⚠️ **Backlog list is empty — no epics found**

     The Backlog list (`{backlog_list_id}`) in space **{space_name}** contains no root-level tasks. No epics are available to pick from.

     **Would you like to create this story without an epic parent (standalone task)?** [Y/n]
     ```

     - `Y` or Enter: set `{epic_id}` = `''`, `{epic_name}` = `''`. Emit `⏭️ No epic selected — story will be created as a standalone task.` Proceed to sprint-list picker (`## NEXT`).
     - `N`: stop.

   - When `effective_allow_no_epic` is `false`, emit the original hard-stop error block and stop:

     ```
     ❌ **Epic picker failed — Backlog list is empty**

     The `clickup-create-story` skill found the Backlog list (`{backlog_list_id}`) in space **{space_name}** but it contains no tasks.

     **Why:** Epics are created by the team lead as tasks in the Backlog list before the Dev agent can create stories under them.

     **What to do:** Ask your team lead to create at least one epic task in the Backlog list for space **{space_name}**, then re-invoke the Dev agent in story-creation mode.
     ```

10. Present the tasks as a numbered pick-list. When `effective_allow_no_epic` is `true`, prepend a zeroth entry:

    ```
    [0] No epic — create as standalone task (research spike, ops task, hotfix, etc.)
    [1] <epic_name> (ID: <task_id>) — status: <status>
    [2] …
    ```

    When `effective_allow_no_epic` is `false`, present the list unchanged (no zero entry): `[N] Task name (ID: <task_id>) — status: <status>`.

11. Ask: "Which epic should this story be created under? Enter the number." When `effective_allow_no_epic` is `true`, use instead: "Which epic should this story be created under? Enter `0` for no epic, or choose a number."

12. Parse the user's response:
    - Input `0` (when `effective_allow_no_epic` is `true`): set `{epic_id}` = `''`, `{epic_name}` = `''`. Emit `⏭️ **No epic selected — story will be created as a standalone task.**` Proceed to sprint-list picker (`## NEXT`).
    - Input `0` (when `effective_allow_no_epic` is `false`): treat as invalid — `0` is not in the pick-list. Re-present the list and re-ask.
    - All other valid numeric inputs: set `{epic_id}` and `{epic_name}` from selection. Confirm: "Selected epic: **{epic_name}** (`{epic_id}`). Continuing to sprint-list picker…"

## NEXT

Proceed to [step-03-sprint-list-picker.md](./step-03-sprint-list-picker.md) with `{space_id}`, `{space_name}`, `{backlog_list_id}`, `{epic_id}`, and `{epic_name}` available in step context.

> **Refinement source:** `epic-picker-no-root-level-filter`, `two-backlog-lists-in-team-space` (story 5-7).
