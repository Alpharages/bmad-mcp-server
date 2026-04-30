# BMAD MCP Server

<div align="center">

[![npm version](https://badge.fury.io/js/bmad-mcp-server.svg)](https://www.npmjs.com/package/bmad-mcp-server)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

A Model Context Protocol server that exposes the [BMAD Method](https://github.com/Alpharages/BMAD-METHOD) to AI assistants.

[Quick start](#quick-start) · [Walkthrough](#your-first-session--a-beginner-walkthrough) · [ClickUp](#clickup-integration) · [Custom Skills](#custom-skills) · [Self-hosting](#self-hosting-http) · [Docs](#documentation)

</div>

---

## Overview

The BMAD MCP Server gives MCP-capable AI clients (Claude Desktop, Claude Code, VS Code Copilot, Cline, …) universal access to the BMAD methodology — **9 specialized agents** and **26 automated workflows** — through a single unified `bmad` tool. Configure it once and use it across every project, with no per-project file copying.

**What is BMAD?** A software-development methodology with role-specialized AI agents (Analyst, Architect, Developer, UX Designer, PM, SM, …) and pre-built workflows for common tasks (PRD, architecture, debugging, ATDD, …).

**Why MCP?** One installation serves every project, methodology stays consistent, no project clutter, and updates are centralized.

---

## Quick start

**Prerequisites:** Node.js 18+ (22.14.0 recommended — see `.nvmrc`) and an MCP-capable client.

Add this to your client's MCP config:

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server"]
    }
  }
}
```

That's it. On first run the server fetches BMAD content from the official `Alpharages/BMAD-METHOD` repo and caches it under `~/.bmad/cache/git/`.

### Client-specific setup

<details>
<summary><b>Claude Desktop</b></summary>

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows), add the snippet above, and restart Claude Desktop.

</details>

<details>
<summary><b>Claude Code (CLI)</b></summary>

```bash
claude mcp add bmad npx -- -y bmad-mcp-server --scope user
```

Use `--scope project` to share with your team via `.mcp.json`.

</details>

<details>
<summary><b>VS Code + GitHub Copilot</b></summary>

Add to your VS Code settings (JSON):

```json
{
  "github.copilot.chat.mcp.servers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server"]
    }
  }
}
```

Restart VS Code.

</details>

<details>
<summary><b>Cline (VS Code extension)</b></summary>

Open Cline's MCP settings and add the same `mcpServers` block as the [Quick start](#quick-start).

</details>

### Alternate install methods

```bash
# Global install
npm install -g bmad-mcp-server
# → command: "bmad-mcp-server"

# Local development clone
git clone https://github.com/Alpharages/bmad-mcp-server.git
cd bmad-mcp-server && npm install && npm run build
# → command: "node", args: ["/abs/path/to/bmad-mcp-server/build/index.js"]
```

---

## Your first session — a beginner walkthrough

This walkthrough is the canonical happy path from "I just installed the server" to "I shipped a feature using BMAD + ClickUp." Follow the steps in order. Each step has an **Action** (what to do), an **Expected** outcome (how you know it worked), and a **Fix** (what to do if it doesn't).

> Steps 1–3 are a no-setup smoke test. Steps 4–8 are one-time setup. Steps 9–12 are the per-feature loop you'll repeat. Troubleshooting is at the end.

---

### Step 1 — Verify the server is reachable

**Action.** In your AI client, type:

> List all BMAD agents.

**Expected.** A response listing **9 agents**: Mary (analyst), Winston (architect), Amelia (dev), Sally (ux-designer), Murat (qa), John (pm), Bob (sm), Diana (debug), and a tech-writer.

**Fix.** If your client doesn't see the tool, the server didn't start. Re-check the [Quick start](#quick-start) snippet, restart your client. As a CLI sanity check, run `npm run cli:list-agents` in your local clone — if that prints 9 agents, the server itself is healthy and the issue is in your client config. If that fails, run the binary directly (`node /path/to/build/index.js`) and read stderr.

---

### Step 2 — Run your first agent

**Action.** Ask:

> Have Mary do a 5-minute market scan of project-management SaaS tools. Summarize the top three differentiators.

**Expected.** A structured analyst-style response in Mary's voice — competitive landscape, axes of differentiation, recommendation.

**Fix.** If the model answers in its default voice (no analyst framing), it likely didn't call the bmad tool. Tell it explicitly: _"Use the bmad tool to execute the analyst agent."_

---

### Step 3 — Run your first workflow

**Action.** Ask:

> Start a PRD workflow for [your feature idea].

**Expected.** John (PM) walks you through goals, users, requirements, and acceptance criteria interactively — it's a conversation, not a one-shot answer. Stop whenever you've gathered what you need.

**Fix.** If nothing happens, ask: _"Use the bmad tool to execute the prd workflow."_

> ✋ **Stop here if you only wanted AI-assisted thinking.** Steps 4–12 set up the full team workflow — only continue if you want BMAD to create ClickUp tasks and ship code for you.

---

### Step 4 — Add planning artifacts to your project

The remaining steps assume your project has a PRD and architecture doc — BMAD agents and skills read them as context.

**Action.** In your project root:

```bash
mkdir -p planning-artifacts
touch planning-artifacts/PRD.md
touch planning-artifacts/architecture.md
# planning-artifacts/tech-spec.md is optional
```

Fill in the content one of two ways:

- **By hand.** Use headings like `## Goals`, `## Non-goals`, `## Requirements`, `## Acceptance criteria`.
- **Drafted by BMAD.** Ask: _"Have John draft `planning-artifacts/PRD.md` for [feature]. Then have Winston draft `planning-artifacts/architecture.md`."_

**Expected.** Both files exist and contain real content describing your project / feature.

---

### Step 5 — Get your ClickUp credentials

**Action.**

1. ClickUp → click your avatar (top right) → **Settings** → **Apps** → **API Token** → **Generate**. Copy the token (starts with `pk_`).
2. Note your **Team ID**: it's the 7–10 digit number in any ClickUp settings page URL (e.g. `app.clickup.com/12345678/settings/...`).

**Expected.** You have two values:

- `CLICKUP_API_KEY=pk_...`
- `CLICKUP_TEAM_ID=12345678`

---

### Step 6 — Wire the credentials into your MCP config

How you supply credentials depends on which transport you're using.

#### stdio (local / npx install)

Add an `env` block — the client injects these into the server process at startup:

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server"],
      "env": {
        "CLICKUP_API_KEY": "pk_...",
        "CLICKUP_TEAM_ID": "12345678",
        "CLICKUP_MCP_MODE": "write"
      }
    }
  }
}
```

#### HTTP (self-hosted shared server)

The server process has no ClickUp credentials of its own — each user passes theirs per-session via request headers. Add a `headers` block instead of `env`:

```json
{
  "mcpServers": {
    "bmad": {
      "type": "http",
      "url": "https://your-server.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_BMAD_API_KEY",
        "X-ClickUp-Api-Key": "pk_...",
        "X-ClickUp-Team-Id": "12345678",
        "X-ClickUp-Mode": "write"
      }
    }
  }
}
```

The server reads `X-ClickUp-Api-Key`, `X-ClickUp-Team-Id`, and `X-ClickUp-Mode` from the session-init request and uses them for all ClickUp calls within that session. Credentials never touch the server's `.env` — each user brings their own key.

---

`CLICKUP_MCP_MODE=write` (or `X-ClickUp-Mode: write`) is required — `createTask`, `addComment`, and `updateTask` aren't registered in `read` mode and the dev skill will stop with a permission error.

Restart your AI client.

**Expected.** Ask: _"List my ClickUp spaces."_ You should get the list back.

**Fix.** If you see _"ClickUp tools disabled — missing required environment variables,"_ the credentials didn't reach the server. For stdio: check JSON syntax, restart the client, and confirm the values are in the `env:` block (not just your shell). For HTTP: confirm the three `X-ClickUp-*` headers are present in the `headers:` block.

---

### Step 7 — Prepare your ClickUp workspace shape

The skills assume a specific layout. Set this up once per workspace.

**Action.** In ClickUp UI, in the space you'll work in:

1. Ensure a list named `Backlog` (or containing "Backlog") exists.
2. Ensure a folder containing `sprint` in its name exists, with at least one non-archived sprint list inside.
3. _(Optional — only if you want stories in the Sprint list with parent epics in Backlog)_ Workspace **Settings** → **ClickApps** → enable **"Tasks in Multiple Lists"**.

**Expected.** You can see both the Backlog list and the sprint folder/list in the ClickUp sidebar.

**Fix.** If you skip the ClickApp toggle and try cross-list layout anyway, `createTask` returns `400 ITEM_137 Parent not child of list`. Either enable the toggle or use same-list layout (put both epic and stories in Backlog).

---

### Step 8 — Add the pilot marker to your repo

The skills check this sentinel file at every invocation to confirm they're running in the right repo. Without it, every skill invocation fails at step 1.

**Action.** In your project root:

```bash
cat > .bmad-pilot-marker <<'EOF'
bmad-pilot-marker: 1
repo: your-org/your-repo
EOF
git add .bmad-pilot-marker
git commit -m "chore: add BMAD pilot marker"
```

**Expected.** `cat .bmad-pilot-marker` shows the two-line content. The file is committed.

**Fix.** If you forget this and run a skill, you'll see _"❌ cwd assertion failed."_ Create the file and retry.

---

✅ **Setup complete.** Steps 9–12 below are the per-feature loop. Repeat them for every feature you want to ship through BMAD.

---

### Step 9 — Create an epic in ClickUp

**Action.** In ClickUp UI:

1. Open your Backlog list.
2. Click **+ New task**, give it a title (e.g. _"Add user authentication"_).
3. Open the task and copy the **Task ID** from its URL — it looks like `86excfrge`.

**Expected.** A root-level task exists in Backlog. You have its ID.

**Fix.** Make sure it's a root-level task, not a subtask of something else. The epic-picker filters out subtasks.

---

### Step 10 — Create a story under the epic

**Action.** Open your AI client **inside your project repo** (cwd matters), then ask:

> Invoke the `clickup-create-story` skill against pilot epic `<epic-id>`.

Replace `<epic-id>` with the value from Step 9.

**What runs.** Five sub-steps: ① prereq check (cwd + permissions + load PRD/architecture) → ② epic picker (space → Backlog → your epic) → ③ sprint-list picker → ④ description composer (synthesizes story title + body from PRD + architecture + epic context, with your review) → ⑤ `createTask`.

**Expected.** A ClickUp URL printed in chat, pointing at a new task that is a subtask of your epic. The task description references your PRD and architecture.

**Fix.** If the skill stops at step 1 with a permission error, your `CLICKUP_MCP_MODE` isn't `write` — re-check Step 6. If it stops at the cwd assertion, you're not in the pilot repo — check Step 8.

---

### Step 11 — Implement the story

**Action.** Take the task ID from Step 10 and ask:

> Invoke the `clickup-dev-implement` skill against task `<task-id>`.

**What runs.** Seven sub-steps: ① cwd + PAT preflight on git remotes → ② fetch the task + parent epic → ③ load PRD, architecture, optional tech-spec → ④ post a "starting work" comment on the ClickUp task → ⑤ implement the code (Edit/Write/Bash tools) → ⑥ open a PR via `gh pr create` → ⑦ post an "implementation complete" comment with the PR URL, transition task status to a review state.

**Expected.**

- The ClickUp task has **two new comments** (the M1 "starting" one and the M2 "complete" one with the PR URL).
- The task is in a **review status** (one of: `in review`, `ready for review`, `code review`, `pending review`, `awaiting review`).
- A **PR exists** in your repo from a new dev branch.
- The dev branch contains the implementation commits.

**Fix.**

- If the PAT preflight fails: your git remote URL contains a token. Run `git remote -v | grep -E 'ghp_|github_pat_|ghs_|ghu_|ghr_'` — if anything matches, rewrite the remote (`git remote set-url origin git@github.com:org/repo.git`) and rotate the leaked token.
- If `gh pr create` fails with an org-access error: wrong `gh` account. Run `gh auth status`, then `gh auth switch --user <handle>`.
- If the status transition emits a `⚠️` warning instead of moving the task: your sprint list's review-state name isn't in the match set. Rename it to one of the five listed above, or run `updateTask({ status: "<your-name>" })` manually.

---

### Step 12 — Review and merge

**Action.** Open the PR in GitHub (the URL is in the ClickUp M2 comment). Review the diff, request changes if needed, merge when ready.

**Expected.** PR merged, ClickUp task can now be moved to Done by the reviewer.

---

That's the full BMAD lifecycle. Repeat **Steps 9–12** for every feature.

For the comprehensive runbook with every edge case, escape hatch, and historical pitfall, see [`docs/clickup-quickstart.md`](./docs/clickup-quickstart.md).

### Troubleshooting reference

| Symptom                                                  | Likely cause                                           | Fix                                                                                                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client doesn't see the bmad tool                         | Server didn't start                                    | Run the binary directly: `node /path/to/build/index.js`. Watch stderr for the error.                                                                                      |
| "ClickUp tools disabled — missing required env vars"     | Credentials not reaching the server                    | **stdio:** add to `env:` block in MCP config, not just your shell. **HTTP:** add `X-ClickUp-Api-Key` and `X-ClickUp-Team-Id` to the `headers:` block. Restart the client. |
| Skill stops at step 1 with "cwd assertion failed"        | Running the skill outside the pilot repo               | `cd` into the pilot repo before invoking, or create `.bmad-pilot-marker` if missing.                                                                                      |
| `createTask` returns `400 ITEM_137`                      | Cross-list layout but "Tasks in Multiple Lists" is OFF | Either turn the ClickApp on, or use same-list layout (epic + story in Backlog).                                                                                           |
| `gh pr create` fails with org-access error               | Wrong `gh` account active                              | `gh auth status`, then `gh auth switch --user <handle>`.                                                                                                                  |
| Status didn't transition after implement                 | Sprint list's review-state name isn't in the match set | Rename the status to one of: `in review`, `ready for review`, `code review`, `pending review`, `awaiting review`. Or update manually.                                     |
| PAT preflight `❌` at step-01 of `clickup-dev-implement` | Git remote URL embeds a GitHub token                   | `git remote set-url origin <clean-url>`. Rotate the leaked token.                                                                                                         |

For deeper diagnosis, set `BMAD_DEBUG=1` in your env block — verbose logs go to stderr.

---

## Features

### Unified `bmad` tool

A single MCP tool with four operations replaces what would otherwise be dozens of per-agent tools:

| Operation | Purpose                                |
| --------- | -------------------------------------- |
| `list`    | Enumerate available agents / workflows |
| `read`    | Inspect an agent or workflow           |
| `execute` | Run an agent or workflow with context  |
| `search`  | Search BMAD content                    |

```typescript
{ operation: "execute", agent: "analyst", message: "Analyze the SaaS market for X" }
{ operation: "execute", workflow: "prd", message: "Create a PRD for a task app" }
{ operation: "list", query: "agents" }
```

### Specialized agents

| Agent    | Role             | Load with     |
| -------- | ---------------- | ------------- |
| Mary     | Business Analyst | `analyst`     |
| Winston  | System Architect | `architect`   |
| Amelia   | Developer        | `dev`         |
| Sally    | UX Designer      | `ux-designer` |
| Murat    | Test Architect   | `qa`          |
| John     | Product Manager  | `pm`          |
| Bob      | Scrum Master     | `sm`          |
| Diana    | Debug Specialist | `debug`       |
| (writer) | Tech Writer      | `tech-writer` |

Run `npm run cli:list-agents` for the live list.

### Workflows (26)

Includes `prd`, `architecture`, `debug-inspect`, `atdd`, `ux-design`, `party-mode`, and 20 more. Run `npm run cli:list-workflows` for the full list.

### MCP capabilities

- **Tools** — unified `bmad` tool plus optional ClickUp tool surface
- **Resources** — BMAD files via `bmad://` URIs
- **Prompts** — agents exposed as native MCP prompts
- **Completions** — argument autocomplete
- **Multi-source loading** — project-local, user-global, and Git-remote BMAD content

### Resource discovery priority

The loader checks these locations in order; the first match wins:

1. `./bmad/` (project-local — highest priority)
2. `~/.bmad/` (user-global defaults)
3. Git remotes passed as CLI args (cached at `~/.bmad/cache/git/`)
4. Official `Alpharages/BMAD-METHOD` repo (auto-fetched on first run)

---

## Usage

Most clients let you describe what you want naturally; the LLM picks the right tool call:

```
You: "Have Mary analyze the market for a task-management SaaS"
You: "Start a PRD workflow for an inventory app"
You: "Get Winston to review this system design" (with diagram attached)
You: "Start party-mode with the planning team to brainstorm features"
```

Direct tool calls (handy for scripts and dev/testing):

```typescript
// List agents
{ operation: "list", query: "agents" }

// Read an agent definition (no execution)
{ operation: "read", type: "agent", agent: "architect" }

// Execute an agent
{ operation: "execute", agent: "analyst", message: "..." }

// Run a workflow
{ operation: "execute", workflow: "prd", message: "..." }
```

### Custom BMAD source via Git remote

Append a Git URL to the args to layer your own BMAD content over the defaults:

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": [
        "-y",
        "bmad-mcp-server",
        "git+https://github.com/your-org/custom-bmad.git#main"
      ]
    }
  }
}
```

### Override discovery root

```json
"env": { "BMAD_ROOT": "/custom/bmad/location" }
```

---

## ClickUp integration

ClickUp tools are **additive** — the `bmad` tool keeps working with or without them. The ClickUp surface is enabled when both the API key and team ID are supplied; otherwise the server logs `ClickUp tools disabled: …` and runs in BMAD-only mode.

### How credentials are supplied

Credential delivery differs by transport:

| Transport                            | How to supply credentials                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| **stdio** (local / npx)              | `env` block in the MCP client config — injected into the server process at startup |
| **HTTP** (self-hosted shared server) | `X-ClickUp-*` request headers — per-session, never stored server-side              |

This means a shared HTTP server requires **no ClickUp credentials in its `.env`**. Every user brings their own key via headers, so different users can authenticate independently to ClickUp from the same server instance.

### stdio — env vars

| Variable                   | Purpose                                                                    |
| -------------------------- | -------------------------------------------------------------------------- |
| `CLICKUP_API_KEY`          | Personal token from ClickUp → Settings → Apps (starts with `pk_`)          |
| `CLICKUP_TEAM_ID`          | Workspace / team ID (7–10 digits, visible in any settings page URL)        |
| `CLICKUP_MCP_MODE`         | Tool-surface scope: `read-minimal`, `read`, or `write` (default: `write`)  |
| `CLICKUP_PRIMARY_LANGUAGE` | Tool-description language: `de`, `en`, `fr`, `es`, `it` (default: `$LANG`) |
| `BMAD_REQUIRE_CLICKUP`     | `1`/`true` → hard-fail at boot if ClickUp vars are missing                 |
| `MAX_IMAGES`               | Max inline images per ClickUp tool response (default: `4`)                 |
| `MAX_RESPONSE_SIZE_MB`     | Max ClickUp response payload (default: `1`)                                |

### HTTP — request headers

| Header              | Equivalent env var | Required              |
| ------------------- | ------------------ | --------------------- |
| `X-ClickUp-Api-Key` | `CLICKUP_API_KEY`  | Yes                   |
| `X-ClickUp-Team-Id` | `CLICKUP_TEAM_ID`  | Yes                   |
| `X-ClickUp-Mode`    | `CLICKUP_MCP_MODE` | No (default: `write`) |

Headers are read on session init and stored in-memory for the lifetime of that session only — they are never logged or written to disk.

### Mode → tool surface

| Mode              | Tools registered                                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `read-minimal`    | `getTaskById`, `searchTasks` (2)                                                                                                         |
| `read`            | above + `searchSpaces`, `getListInfo`, `getTimeEntries`, `readDocument` (6)                                                              |
| `write` (default) | above + `addComment`, `updateTask`, `createTask`, `updateListInfo`, `createTimeEntry`, `updateDocumentPage`, `createDocumentOrPage` (13) |

A session-scoped picker (`pickSpace`, `getCurrentSpace`, `clearCurrentSpace`) is registered in **all** modes; the first call caches the chosen space and resets on process restart.

Stories in the active sprint list can have a parent epic in a separate backlog list — cross-list `parent_task_id` is supported and validated by a dedicated smoke test (see [Development](#development)).

### Example client configs

**stdio:**

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server"],
      "env": {
        "CLICKUP_API_KEY": "pk_...",
        "CLICKUP_TEAM_ID": "12345678",
        "CLICKUP_MCP_MODE": "write"
      }
    }
  }
}
```

**HTTP (shared server):**

```json
{
  "mcpServers": {
    "bmad": {
      "type": "http",
      "url": "https://your-server.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_BMAD_API_KEY",
        "X-ClickUp-Api-Key": "pk_...",
        "X-ClickUp-Team-Id": "12345678",
        "X-ClickUp-Mode": "write"
      }
    }
  }
}
```

`write` mode is required for the `clickup-create-story` and `clickup-dev-implement` skills. Use `read` for first-run exploration.

### Out of scope for this phase

- Jira / Linear integration
- ClickUp custom fields (deferred)
- Bidirectional sync with external trackers
- Historical migration of existing tasks into BMAD

---

## Custom Skills

Custom skills are **ClickUp-integrated workflows** built on top of the standard BMAD agent/workflow layer. They are distinct from the BMAD built-in workflows (like `bmad-sprint-planning`, `prd`, `architecture`):

|                 | BMAD built-in workflows                  | Custom skills                                                                         |
| --------------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| Source of truth | Local filesystem (YAML / Markdown files) | ClickUp                                                                               |
| Output          | Files written to `planning-artifacts/`   | ClickUp tasks, comments, status transitions                                           |
| Example trigger | "start sprint planning"                  | "invoke `clickup-create-epic`", "invoke `clickup-create-story`", "review task `<id>`" |

> **Important:** If your project uses ClickUp as the source of truth, use the custom skills below — not `bmad-sprint-planning` or other file-system workflows. Invoking `bmad-sprint-planning` on a ClickUp project will write a local `sprint-status.yaml` instead of touching ClickUp.

All custom skills require `CLICKUP_MCP_MODE=write` and `planning-artifacts/PRD.md` + `planning-artifacts/architecture.md` in the project root. No `.bmad-pilot-marker` or other per-project sentinel files are needed — credentials live in the MCP server process.

---

### `clickup-create-epic`

Creates a root-level ClickUp task (epic) in the Backlog list of the active space. Reads your local `epics-and-stories.md`, lets you pick which epic to create, and synthesizes the description from PRD, architecture, and the local epic content. No local files are written.

**Trigger:**

> Invoke the `clickup-create-epic` skill for Epic [number/name].

**Steps:** prereq + auth check → space + Backlog list picker → local epic picker → description composer → `createTask`

**Also requires:** `planning-artifacts/epics-and-stories.md`

---

### `clickup-create-story`

Creates a ClickUp task (story) as a subtask of a chosen epic in the active sprint list. Delegates to `bmad-create-story` for exhaustive description composition: BDD acceptance criteria, task/subtask checklist, architecture guardrails, previous-story intelligence from git, and web research. When `bmad-create-story` improves upstream, this skill inherits those improvements automatically.

**Trigger:**

> Invoke the `clickup-create-story` skill against epic `<epic-id>`.

**Steps:** prereq + auth check → epic picker → sprint-list picker → `bmad-create-story` (description composition only, no file write) → review (Y/n/edit) → `createTask`

**Optional but recommended:** `planning-artifacts/epics-and-stories.md` (enables full BDD criteria from story spec)

---

### `clickup-dev-implement`

Implements a story given a ClickUp task ID. Fetches the task and parent epic for context, loads planning artifacts, then delegates the full implementation loop to `bmad-dev-story` (TDD red-green-refactor, per-task DoD validation, review-continuation detection). Posts progress comments on the ClickUp task and transitions status to "in review" when done. No local story files or `sprint-status.yaml` are written.

**Trigger:**

> Invoke the `clickup-dev-implement` skill against task `<task-id>`.

**Steps:** PAT preflight → task fetch → context builder → `bmad-dev-story` (implementation loop, no file writes) → M1/M2 progress comments → status transition

---

### `clickup-code-review`

Reviews a story implementation given a ClickUp task ID. Fetches the task requirements and acceptance criteria, reads the git diff, then delegates the full adversarial review to `bmad-code-review` (Blind Hunter, Edge Case Hunter, Acceptance Auditor + triage). Posts a structured review comment to ClickUp and transitions status to approved or back to in-progress based on the verdict.

**Trigger:**

> Invoke the `clickup-code-review` skill against task `<task-id>`.
> — or — review task `<task-id>`

**Steps:** PAT preflight → task fetch → git diff + planning artifact reader → `bmad-code-review` (adversarial review, no file writes) → review comment → status transition

---

### Project-local config (`.bmadmcp/config.toml`)

`clickup-create-epic` and `clickup-create-story` discover the active space, the
Backlog list, and (for the story skill) the sprint folder by calling ClickUp on
every invocation — typically `getCurrentSpace` → `pickSpace` → `searchSpaces`,
then a tree scan. To pin those IDs and skip the round-trips, drop a project-local
`.bmadmcp/config.toml` at the project root:

```toml
[clickup_create_epic]
pinned_space_id        = "..."
pinned_space_name      = "..."   # display only
pinned_backlog_list_id = "..."

[clickup_create_story]
pinned_space_id         = "..."
pinned_space_name       = "..."
pinned_backlog_list_id  = "..."
pinned_sprint_folder_id = "..."
```

When **both** `pinned_space_id` and `pinned_backlog_list_id` are set, the
picker steps skip every ClickUp discovery call and jump straight to the local
content steps. Pinning only one yields a partial short-circuit (see the step
files for exact behaviour). All keys are optional.

The file is intended to be gitignored at the project level (per-developer or
per-project IDs aren't checked in). See
[`.bmadmcp/config.example.toml`](./.bmadmcp/config.example.toml) for the full
schema. The `.bmadmcp/` directory is the home for additional project-local
MCP-server configs; current users are the four skills above, future configs
will land alongside.

#### Doc-path cascade (`[docs]` table)

`clickup-create-story`, `clickup-dev-implement`, and `clickup-code-review` call
`resolve-doc-paths` at startup to locate the PRD, architecture document, and
epics directory. By default they look under `planning-artifacts/`, but projects
with non-standard layouts can override individual paths via the `[docs]` table
in `.bmadmcp/config.toml`:

```toml
[docs]
prd_path          = "docs/specs/PRD.md"
architecture_path = "docs/architecture/overview.md"
```

Resolution is **per-key**: overriding only `prd_path` leaves `architecture_path`
and `epics_path` to be resolved by the BMAD config chain or the hardcoded
default. See [`CLAUDE.md`](./CLAUDE.md#doc-path-cascade) for the full cascade
order and contributor-level detail.

---

Custom skill source lives in `src/custom-skills/`. See [`src/custom-skills/README.md`](./src/custom-skills/README.md) for the extension boundary convention.

---

## Self-hosting (HTTP)

For shared team deployments, run the HTTP transport behind a reverse proxy.

```bash
git clone https://github.com/Alpharages/bmad-mcp-server.git
cd bmad-mcp-server
cp .env.example .env  # set BMAD_API_KEY — no ClickUp vars needed here
docker compose up -d
```

The server starts on `http://localhost:3000`. BMAD content is fetched on first start and refreshed on each restart.

> **ClickUp credentials are per-user, not per-server.** Each client passes its own `X-ClickUp-Api-Key` / `X-ClickUp-Team-Id` headers (see [ClickUp integration](#clickup-integration)). The server `.env` only needs `PORT`, `BMAD_API_KEY`, and optionally `BMAD_DEBUG`.

### HTTP endpoints

| Endpoint      | Auth | Purpose                                       |
| ------------- | ---- | --------------------------------------------- |
| `GET /health` | No   | Health check — returns `{"status":"ok",...}`  |
| `POST /mcp`   | Yes  | MCP Streamable HTTP transport                 |
| `GET /mcp`    | Yes  | SSE stream for server-to-client notifications |
| `DELETE /mcp` | Yes  | Close MCP session                             |

Authenticate with either `Authorization: Bearer <key>` or `X-API-Key: <key>`. If `BMAD_API_KEY` is unset, the server runs in open mode (development only).

### Connecting to a self-hosted server

**Claude Desktop** (stdio-only — use [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) as a bridge):

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://your-domain.com/mcp",
        "--header",
        "Authorization: Bearer YOUR_KEY"
      ]
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add --transport http bmad https://your-domain.com/mcp \
  --header "Authorization: Bearer YOUR_KEY" --scope user
```

**VS Code / Cline** (native HTTP):

```json
{
  "mcpServers": {
    "bmad": {
      "url": "https://your-domain.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_KEY",
        "X-ClickUp-Api-Key": "pk_...",
        "X-ClickUp-Team-Id": "12345678",
        "X-ClickUp-Mode": "write"
      }
    }
  }
}
```

### Reverse proxy notes

`proxy_buffering off` is required for SSE streams. A minimal nginx block:

```nginx
location / {
  proxy_pass http://localhost:3000;
  proxy_http_version 1.1;
  proxy_set_header Connection '';
  proxy_set_header Host $host;
  proxy_buffering off;
  proxy_cache off;
}
```

To pin BMAD content to a specific version, override the container `command` in `docker-compose.yml`:

```yaml
command:
  [
    'node',
    'build/index-http.js',
    'git+https://github.com/Alpharages/BMAD-METHOD.git#v6.0.0',
  ]
```

---

## Configuration reference

| Variable               | Default       | Purpose                                                |
| ---------------------- | ------------- | ------------------------------------------------------ |
| `BMAD_ROOT`            | auto          | Override BMAD installation root                        |
| `BMAD_DEBUG`           | `false`       | Verbose logging via `src/utils/logger.ts`              |
| `BMAD_GIT_AUTO_UPDATE` | `true`        | Auto-refresh Git-cached BMAD content (CI sets `false`) |
| `BMAD_API_KEY`         | unset         | API key for HTTP transport                             |
| `PORT`                 | `3000`        | HTTP port                                              |
| `NODE_ENV`             | `development` | `test` / `development` / `production`                  |

ClickUp env vars are listed in the [ClickUp section](#clickup-integration). The canonical list lives in `.env.example`.

---

## Development

```bash
git clone https://github.com/Alpharages/bmad-mcp-server.git
cd bmad-mcp-server
npm install
npm run build
npm test
```

### Common scripts

```bash
npm run dev              # stdio mode, watch
npm run dev:http         # HTTP mode, watch
npm test                 # unit + integration
npm run test:coverage    # with coverage
npm run test:e2e         # end-to-end
npm run lint             # ESLint
npm run format           # Prettier
npm run cli:list-agents  # verify loaded agents
npm run cli:list-workflows
```

### ClickUp smoke tests

Two live-credential smoke harnesses are wired up but **excluded from CI** (they require real ClickUp tokens, hit live rate limits, and exercise external state):

```bash
# Basic CRUD round-trip
npm run smoke:clickup            # stdio
npm run smoke:clickup:http       # HTTP

# Cross-list parent/subtask (story in sprint list, epic in backlog list)
npm run smoke:clickup:cross-list
```

See [`docs/clickup-quickstart.md`](./docs/clickup-quickstart.md) for the full runbook (required env vars, expected output, cleanup).

### Conventions

- **Commits:** Conventional Commits (`feat:`, `fix:`, …) — semantic-release derives version bumps from these.
- **Logging:** never use `console.*` directly — use `src/utils/logger.ts`.
- **Imports:** `.js` extensions in TypeScript imports (ES module resolution).
- **Tests:** mirror `src/` under `tests/unit/`; integration tests may spin up the full server.

### Releases

Releases are fully automated via semantic-release on merges to `main`. Do **not** bump `package.json` manually. See [`.github/RELEASE_PROCESS.md`](./.github/RELEASE_PROCESS.md).

---

## Architecture

```
AI client → MCP transport → Server → BMADEngine → ResourceLoader → BMAD content
```

`BMADEngine` (`src/core/bmad-engine.ts`) is **transport-agnostic** — it returns plain TypeScript objects, not MCP types — which lets the same engine power the MCP server, the CLI, and tests.

```
src/
├── index.ts              # MCP (stdio) entry point
├── index-http.ts         # MCP (HTTP) entry point
├── cli.ts                # CLI entry point
├── server.ts             # MCP server class
├── core/
│   ├── bmad-engine.ts    # Transport-agnostic business logic
│   └── resource-loader.ts# Multi-source content loader
├── tools/
│   ├── bmad-unified.ts   # Unified `bmad` tool
│   └── operations/       # list / read / execute / search handlers
└── utils/                # logger, git-source-resolver
```

Full design details: [`docs/architecture.md`](./docs/architecture.md).

---

## Documentation

- [Architecture](./docs/architecture.md)
- [API contracts](./docs/api-contracts.md)
- [Development guide](./docs/development-guide.md)
- [BMAD + ClickUp team quickstart](./docs/clickup-quickstart.md)
- [Release process](./.github/RELEASE_PROCESS.md)

---

## Contributing

1. Fork and branch off `main` (`feature/your-thing`).
2. Make changes with tests.
3. `npm test && npm run lint`.
4. Commit using Conventional Commits.
5. Open a PR — the title is validated against Conventional Commits format.

See [`docs/development-guide.md`](./docs/development-guide.md) for the full contributor flow.

---

## License

ISC

## Credits

This MCP server was originally created by [@mkellerman](https://github.com/mkellerman) at [mkellerman/bmad-mcp-server](https://github.com/mkellerman/bmad-mcp-server) and is now maintained under the Alpharages organization. All credit for the original implementation, design, and architecture goes to the original author.

It is built on the [BMAD Method](https://github.com/Alpharages/BMAD-METHOD); all methodology, agents, and workflows are credited to that project.

## Links

- Repository: https://github.com/Alpharages/bmad-mcp-server
- Issues: https://github.com/Alpharages/bmad-mcp-server/issues
- npm: https://www.npmjs.com/package/bmad-mcp-server
- BMAD Method: https://github.com/Alpharages/BMAD-METHOD
- MCP spec: https://modelcontextprotocol.io/
