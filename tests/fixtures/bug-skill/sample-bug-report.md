## Bug: `createTask` fails with 404 when `parent_task_id` is set on a non-subtask-enabled list

Steps to reproduce:

1. Set `[clickup_create_bug].pinned_epic_id` in `.bmadmcp/config.toml`.
2. Invoke `clickup-create-bug` and complete steps 1–4.
3. Confirm task creation in step 5.

Expected behaviour: task is created as a subtask of the selected epic.
Actual behaviour: `createTask` returns `Error creating task: 404 — parent task not found`.
Impact: broken — cannot attach bug tickets to epics in any list that disables subtasks.
Suspected area: `step-05-create-task.md`, `parent_task_id` parameter handling.
Environment: Node.js 22.14.0, macOS 15.4, Claude Desktop 0.9.
