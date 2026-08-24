---
name: bmad-clickup-qa
description: 'Accepts a ClickUp task ID (typically "ready for qa"), fetches the task, and reads its "## QA / Testing Notes" (code-access) and "## Human QA Notes" (black-box) sections, then runs end-to-end QA in two passes: a code-access pass (runs the existing test suite and traces every acceptance criterion and edge case through the code — never modifies code or tests) and a human-style visual pass (drives a connected browser MCP screen-by-screen against a URL you supply, an already-running local dev server, or one it auto-starts from the project manifest and tears down afterward). Posts a single structured QA report comment and transitions status to qa-passed or back to in-progress. Use when the user says "qa [task ID]", "run qa on [task ID]", "test task [task ID]", or "qa task [task ID]".'
---

Follow the instructions in ./workflow.md.
