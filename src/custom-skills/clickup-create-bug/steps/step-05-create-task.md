---
created_task_id: ''
created_task_url: ''
---

# Step 5: Create Task

## STATUS

🚧 **Not yet implemented — stories 7-6 + 7-7**

This step will: validate all required context from steps 01–04, call `searchTasks`
to check for duplicate task names in the target list, present a pre-creation summary
for user confirmation, call `createTask` with bug defaults (`bug` tag, priority
inferred from severity), and store the created task's `{created_task_id}` and
`{created_task_url}`. Optional epic parent wiring (via `{epic_id}`) is handled here
once EPIC-8 lands.

See: [EPIC-7 stories 7-6 and 7-7](../../../../planning-artifacts/epics/EPIC-7-bug-shaped-stories.md)

## NEXT

Terminal step — skill execution ends after `createTask` completes or errors.
