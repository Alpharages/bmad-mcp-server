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

## INSTRUCTIONS

0. **Pinned-config short-circuit.** Read `{project-root}/.bmadmcp/config.toml` if it exists. Inside, look for the `[clickup_create_story]` table and read the optional keys `pinned_space_id`, `pinned_space_name`, and `pinned_backlog_list_id`. Treat any missing file, missing table, or missing key as unset.

   - **If both `pinned_space_id` AND `pinned_backlog_list_id` are set to non-empty values:** skip the space and backlog discovery calls below. Set `{space_id}` = `pinned_space_id`, `{space_name}` = `pinned_space_name` (fall back to `(pinned)` if that key is unset), `{backlog_list_id}` = `pinned_backlog_list_id`. Confirm to the user: `✅ Space + backlog list pinned via .bmadmcp/config.toml — skipping picker.` Proceed directly to instruction 7 below (`searchTasks`) using the pinned `{backlog_list_id}`. If `searchTasks` returns "list not found" or a similar error, surface it verbatim and instruct the user to update or remove the pinned IDs in `.bmadmcp/config.toml`.
   - **If only `pinned_space_id` is set:** skip `getCurrentSpace` and `pickSpace`. Set `{space_id}` = `pinned_space_id`, `{space_name}` = `pinned_space_name` (or `(pinned)`). Continue to instruction 5 below (`searchSpaces`).
   - **If only `pinned_backlog_list_id` is set (no `pinned_space_id`):** continue to instruction 1 below; the list-pin will be applied at instruction 6.
   - **If no pins are set:** continue to instruction 1 below.

1. Call `getCurrentSpace` (no arguments) to check if a space is already selected for this MCP session. If a space is returned, confirm with the user: "Current space: **{space_name}** (`{space_id}`). Use this space? [Y/n]". If confirmed, set `{space_id}` and `{space_name}` from the response and skip to step 5. If declined, call `clearCurrentSpace` and continue to step 2.

2. Call `pickSpace` with no arguments to list all available spaces.

3. Ask: "Which space are you working in? Enter the space name or ID."

4. Call `pickSpace` with `query: "<user input>"` to select the space. If one match, the session is updated automatically — extract `{space_id}` and `{space_name}` from the confirmation response. If multiple matches, present them and ask the user to narrow the query or provide the exact space ID.

5. Call `searchSpaces` with `terms: ["{space_name}"]` to retrieve the detailed folder/list tree for the selected space (single-space search guarantees the ≤5 threshold for detailed mode).

6. **Pinned-list short-circuit.** Before scanning the tree, check whether `.bmadmcp/config.toml`'s `[clickup_create_story].pinned_backlog_list_id` is set to a non-empty value. If it is, verify that the pinned ID appears as a list in the tree returned by `searchSpaces`; if it does, set `{backlog_list_id}` to the pinned value, confirm `✅ Backlog list pinned via config: {backlog_list_id}` to the user, and skip the scan. If the pinned ID is not found in the tree, warn the user (`⚠️ pinned_backlog_list_id not found in current space — falling back to scan`) and continue with the scan below. If the key is unset or empty, proceed directly to the scan.

   Scan the tree for a list whose name matches `Backlog` (case-insensitive). If found, set `{backlog_list_id}` automatically (do not ask the user). If NOT found, present all lists visible in the tree and ask: "I couldn't find a list named 'Backlog'. Enter the name or number of the list that holds your epics."

   > **Edge case:** If the space tree contains multiple lists named `Backlog` (possible in multi-folder spaces), present both and ask the user to pick. Pin the chosen list via `[clickup_create_story].pinned_backlog_list_id` in `.bmadmcp/config.toml` to skip this prompt on future invocations.

7. Call `searchTasks` with `list_ids: ["{backlog_list_id}"]` and no search terms to retrieve all tasks in the Backlog list.

   **Filter the results to root-level tasks only.** For each returned task, drop it unless its `parent_task_id` field is null/absent/empty. Treat all of the following as "no parent": the field is missing entirely from the response, the value is the literal string `null`, the value is the literal empty string `''`, or the value is JSON `null`. Only keep tasks that survive this filter — these are the candidate epics. Subtasks (created later under the same-list pivot per `cross-list-subtask-block`) MUST NOT appear as candidate epics in the picker.

8. If zero tasks are returned, emit the following error block and stop:

   ```
   ❌ **Epic picker failed — Backlog list is empty**

   The `clickup-create-story` skill found the Backlog list (`{backlog_list_id}`) in space **{space_name}** but it contains no tasks.

   **Why:** Epics are created by the team lead as tasks in the Backlog list before the Dev agent can create stories under them.

   **What to do:** Ask your team lead to create at least one epic task in the Backlog list for space **{space_name}**, then re-invoke the Dev agent in story-creation mode.
   ```

9. Present the tasks as a numbered pick-list: `[N] Task name (ID: <task_id>) — status: <status>`.

10. Ask: "Which epic should this story be created under? Enter the number."

11. Parse the user's response to set `{epic_id}` (the task ID) and `{epic_name}` (the task name). Confirm: "Selected epic: **{epic_name}** (`{epic_id}`). Continuing to sprint-list picker…"

## NEXT

Proceed to [step-03-sprint-list-picker.md](./step-03-sprint-list-picker.md) (story 2.4) with `{space_id}`, `{space_name}`, `{backlog_list_id}`, `{epic_id}`, and `{epic_name}` available in step context.

> **Refinement source:** `epic-picker-no-root-level-filter`, `two-backlog-lists-in-team-space` (story 5-7).
