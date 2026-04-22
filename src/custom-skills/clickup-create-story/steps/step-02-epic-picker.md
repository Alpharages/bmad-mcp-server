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

1. Call `getCurrentSpace` (no arguments) to check if a space is already selected for this MCP session. If a space is returned, confirm with the user: "Current space: **{space_name}** (`{space_id}`). Use this space? [Y/n]". If confirmed, set `{space_id}` and `{space_name}` from the response and skip to step 5. If declined, call `clearCurrentSpace` and continue to step 2.

2. Call `pickSpace` with no arguments to list all available spaces.

3. Ask: "Which space are you working in? Enter the space name or ID."

4. Call `pickSpace` with `query: "<user input>"` to select the space. If one match, the session is updated automatically — extract `{space_id}` and `{space_name}` from the confirmation response. If multiple matches, present them and ask the user to narrow the query or provide the exact space ID.

5. Call `searchSpaces` with `terms: ["{space_name}"]` to retrieve the detailed folder/list tree for the selected space (single-space search guarantees the ≤5 threshold for detailed mode).

6. Scan the tree for a list whose name matches `Backlog` (case-insensitive). If found, set `{backlog_list_id}` automatically (do not ask the user). If NOT found, present all lists visible in the tree and ask: "I couldn't find a list named 'Backlog'. Enter the name or number of the list that holds your epics."

   > **Edge case:** If the space tree contains multiple lists named `Backlog` (possible in multi-folder spaces), present both and ask the user to pick.

7. Call `searchTasks` with `list_ids: ["{backlog_list_id}"]` and no search terms to retrieve all tasks in the Backlog list.

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
