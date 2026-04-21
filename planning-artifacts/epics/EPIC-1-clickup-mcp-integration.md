# EPIC-1: ClickUp MCP integration layer

> **Note:** Epics are intended to live in ClickUp per the locked architecture. This file is a bootstrap — once EPIC-1 itself completes, these epics will be created in ClickUp and this folder archived.

## Goal

`bmad-mcp-server` can talk to ClickUp with the same auth / tool shape as the rest of its MCP surface.

## Outcomes

- `hauptsacheNet/clickup-mcp@<SHA>` vendored into `src/tools/clickup/`, LICENSE preserved, upstream SHA recorded in `VENDOR.md`.
- `register*Tools` functions wired into the existing MCP bootstrap.
- `CLICKUP_API_KEY` + `CLICKUP_TEAM_ID` env vars wired; space prompted interactively.
- Smoke-test: create task, add comment, update status, list folders/lists, cross-list parent/subtask — all round-trip successfully against a real ClickUp workspace.

## Stories (to become ClickUp subtasks under this epic)

- Vendor hauptsache source + LICENSE into `src/tools/clickup/`
- Record upstream SHA in `VENDOR.md`
- Wire register functions into server bootstrap
- Add env var loading and validation (`CLICKUP_API_KEY`, `CLICKUP_TEAM_ID`)
- Build "pick space" interactive picker with session caching
- Smoke-test create-task + comment + status round-trip
- Smoke-test cross-list parent/subtask (story in sprint list, parent in backlog list)
- Document the tool surface added (for README / CHANGELOG)

## Dependencies

None — start here.

## Exit criteria

- All smoke tests pass against a real ClickUp workspace.
- `VENDOR.md` records upstream SHA and date vendored.
- No edits to BMAD-METHOD source.
