# BMAD + ClickUp Team Quickstart

This guide is the single entry point for a **team-lead-in-session** — someone
invoking the Dev agent against a ClickUp-routed pilot epic in their own project.
Reading it from top to bottom gets you to a successful first invocation of either
`clickup-create-story` (story-creation mode) or `clickup-dev-implement`
(implementation mode). The prerequisites and invocation paths documented here
reflect the post-EPIC-5 / post-story-5-7 skill state; readers who land here after
a future skill revision should treat this document as a point-in-time snapshot and
cross-check against the skill source files under
[`src/custom-skills/`](../src/custom-skills/).

## Prerequisites

Satisfy every item below before invoking either skill.

### Node.js version

The bmad-mcp-server runtime requires **Node.js 22.14.0** (pinned in
[`.nvmrc`](../.nvmrc)). Run `nvm use`, `volta install node@22.14.0`, or the
equivalent for your version manager before starting the server. Note: the pilot
repo may have its own Node.js version requirement that is independent.

### bmad-mcp-server installed and wired

Install the server and wire it into your AI client (Claude Desktop, VS Code
Copilot, Cline, etc.) following the [Installation
section](../README.md#installation) of the project README. The quickstart does not
duplicate those steps; the README is authoritative for MCP-client wiring.

### ClickUp credentials

Three environment variables are required. Set them in your AI client's MCP server
configuration — **do not hard-code values in source files**:

- `CLICKUP_API_KEY` — your per-user ClickUp personal token (starts with `pk_`).
- `CLICKUP_TEAM_ID` — your workspace ID (7–10 digits).
- `CLICKUP_MCP_MODE=write` — required so `createTask`, `addComment`, and
  `updateTask` are registered. Both skills emit a clear `❌` error block and stop
  if write mode is not active.

See [README.md §Environment Variables](../README.md#environment-variables) and
[`.env.example`](../.env.example) for canonical formats and the full variable
list.

### ClickUp workspace shape

The skills make three assumptions about your workspace:

1. **Backlog list.** A list named `Backlog` (or containing `Backlog` in its name)
   exists in the chosen space and contains the pilot epic as a root-level task
   (not a subtask).
2. **Sprint folder.** A folder whose name contains `sprint` exists in the same
   space and has at least one non-archived sprint list.
3. **"Tasks in Multiple Lists" ClickApp toggle.** This toggle is required **only**
   if you are using the cross-list layout (epic in Backlog, subtasks in a Sprint
   list). If you use the same-list layout (epic and subtasks all in Backlog), the
   toggle is not needed. See
   [`cross-list-subtask-block`](../planning-artifacts/friction-log.md#cross-list-subtask-block)
   for the historical precedent — the first pilot run hit this block and pivoted to
   the same-list layout. The post-5-7 PRD §ClickUp layout now documents both shapes
   as supported; confirm your workspace toggle state before designing your layout.

### `gh` CLI — right account

> Addresses:
> [`gh-auth-prerequisite-undocumented`](../planning-artifacts/friction-log.md#gh-auth-prerequisite-undocumented)

The `gh` CLI must be installed and authenticated against an account with push
access to the pilot repo's GitHub org. On laptops with multiple `gh` accounts,
the wrong account is silently active until a `gh pr create` call fails.

**Before invoking `clickup-dev-implement`:**

```bash
gh auth status          # verify the active account
gh auth switch --user <handle>   # switch if needed (multi-account laptops)
```

See
[`gh-auth-wrong-account`](../planning-artifacts/friction-log.md#gh-auth-wrong-account)
for the historical precedent — the first pilot run blocked mid-session because
`AsimSabirDev` was the active account instead of `khakanali`.

**Important:** The post-5-7 `step-01-task-id-parser.md` runs a `git remote -v`
PAT-prefix preflight (checking for `ghp_`, `github_pat_`, `ghs_`, `ghu_`,
`ghr_` prefixes in remote URLs) but does **not** verify that `gh auth` is
authenticated against the correct account. The `gh auth status` check above is
the operator's responsibility — the preflight cannot substitute for it.

### Pilot repo cloned with `.bmad-pilot-marker`

> Addresses half of:
> [`multi-repo-cwd-handling-undocumented`](../planning-artifacts/friction-log.md#multi-repo-cwd-handling-undocumented)

Both skills run a **cwd assertion** at step 1 (instruction 0 /
[step-01-prereq-check.md](../src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md);
instruction 0a /
[step-01-task-id-parser.md](../src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md)).
The assertion looks for a `.bmad-pilot-marker` sentinel file at the current
working directory root. If the file is absent, the skill emits a `❌` error block
and stops.

**File:** `<pilot-repo-root>/.bmad-pilot-marker`

**Format:** Plain text whose first line begins with `bmad-pilot-marker:` followed
by any non-empty value.

**Minimal example:**

```
bmad-pilot-marker: 1
```

**Recommended content** (stronger assertion — the optional `repo:` and `epic:`
fields are checked by the cwd-assertion block and recorded in context):

```
bmad-pilot-marker: 1
repo: Alpharages/lore
epic: 86excfrge
```

The marker file **should be committed** to the pilot repo — it is tiny,
audit-friendly, and survives clone / fork / CI.

**Disclosed-deviation escape hatch:** If a dev session genuinely cannot satisfy
the cwd contract (e.g. a Claude Code CLI session pinned at the bmad-mcp-server
root for tooling reasons), load the pilot repo's PRD and architecture via
absolute-path `Read` calls and record the deviation in the Dev Agent Record
§Agent Model Used. Stories 5-4 and 5-5 used this path under disclosed deviation —
see
[step-01-prereq-check.md](../src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md)
and
[step-01-task-id-parser.md](../src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md)
for the documented escape-hatch wording.

### Optional: pinned-ID config knobs

The pickers in `step-02-epic-picker` and `step-03-sprint-list-picker` call
ClickUp on every invocation to discover the active space, the Backlog list,
and the sprint folder. To skip those round-trips — and to bypass the
disambiguation prompts that appear when more than one list named `Backlog` or
more than one sprint folder exists in the space — pin the IDs in a project-
local `.bmadmcp/config.toml` file.

Path: `{project-root}/.bmadmcp/config.toml` (gitignored at the project level;
see [`.bmadmcp/config.example.toml`](../.bmadmcp/config.example.toml) for the
full schema).

Available keys per skill table (`[clickup_create_epic]` /
`[clickup_create_story]`):

- `pinned_space_id` — skip `getCurrentSpace` / `pickSpace` entirely.
- `pinned_space_name` — display label; falls back to `(pinned)` if unset.
- `pinned_backlog_list_id` — pin a specific Backlog list ID (see
  [`two-backlog-lists-in-team-space`](../planning-artifacts/friction-log.md#two-backlog-lists-in-team-space)).
- `pinned_sprint_folder_id` — pin a specific sprint folder ID, story skill
  only (see
  [`two-sprint-folders-in-team-space`](../planning-artifacts/friction-log.md#two-sprint-folders-in-team-space)).
- `allow_no_epic`, story skill only — `true` (default) shows the `[0] No epic`
  picker entry and enables the empty-Backlog Y/n fallback. Set `false` to require
  an epic on every invocation and restore the original hard-stop when the Backlog
  list is empty.

All keys are optional and default to unset. Pinning both `pinned_space_id`
and `pinned_backlog_list_id` produces the full short-circuit (zero ClickUp
calls in the picker). Pinning only one yields a partial short-circuit; see
the step-02 files for the precise behaviour.

**`[clickup_create_bug]` keys:**

| Key                | Description                                               |
| ------------------ | --------------------------------------------------------- |
| `target_list_id`   | Skip the list picker; the bug is created in this list     |
| `default_priority` | Override severity-inferred priority (1 = urgent, 4 = low) |
| `default_tags`     | Additional tags beyond the automatic `bug` tag            |
| `pinned_epic_id`   | Skip the epic picker; the bug is attached to this epic    |
| `pinned_epic_name` | Display label for the pinned epic                         |

Auto-save behaviour: after the first interactive list selection in step 2,
`target_list_id` is written to `.bmadmcp/config.toml` automatically — future
runs skip the list picker.

## Multi-repo Claude Code sessions

> Addresses the other half of:
> [`multi-repo-cwd-handling-undocumented`](../planning-artifacts/friction-log.md#multi-repo-cwd-handling-undocumented)

A team-lead may have both the bmad-mcp-server repo and the pilot repo open in the
same Claude Code session — for example, to develop the skill while running it, or
to debug the pilot from the server side. Claude Code's `pwd` resolution under
multi-repo project configurations does not always default to the pilot repo. The
cwd-assertion contract (see [§Prerequisites](#prerequisites)) catches the
wrong-cwd case at runtime and emits a `❌` error block; this section explains the
operator-side prevention so the error block is the exception rather than the rule.

### Recommended shape: single-repo cwd (default)

Open Claude Code with the **pilot repo** as the workspace root. `cd` into it
before invoking either skill. The cwd-assertion confirms. This is the path of
least friction and the only shape that requires no special handling. See
[`pwd-deviation-cwd-not-pilot-repo`](../planning-artifacts/friction-log.md#pwd-deviation-cwd-not-pilot-repo)
for the historical precedent — both 5-4 and 5-5 dev sessions ran with `pwd`
pointing at bmad-mcp-server instead of the pilot repo and had to use the
escape-hatch path.

### Multi-repo shape with cwd guard

When you must keep both repos open in the same Claude Code session, follow this
workflow for each skill invocation:

1. Place the `.bmad-pilot-marker` file at the pilot repo root per
   [§Prerequisites](#prerequisites) above (one-time setup).
2. `cd` to the pilot repo before invoking either skill — Claude Code's terminal
   and the Bash tool inherit the manual `cd`.
3. Verify with `pwd` before each invocation. The cwd-assertion will halt the skill
   with a clear `❌` error block if cwd is wrong; the manual `pwd` check is the
   cheap pre-empt.
4. If the dev session genuinely cannot `cd` (e.g. a Claude Code CLI session that
   pins cwd at the bmad-mcp-server root for tooling reasons), fall back to the
   disclosed-deviation escape hatch: load the pilot repo's PRD / architecture via
   absolute-path `Read` calls and record the deviation in the Dev Agent Record
   §Agent Model Used. Stories 5-4 and 5-5 are the historical precedent for this
   path.

### Anti-pattern to avoid

Opening the bmad-mcp-server repo as the only workspace and invoking either skill
against a pilot epic without the cwd guard is the failure mode the cwd-assertion
was added to catch — the skills will read `bmad-mcp-server/planning-artifacts/PRD.md`
instead of the pilot's PRD, producing stories grounded in the wrong project. See
[`pwd-deviation-cwd-not-pilot-repo`](../planning-artifacts/friction-log.md#pwd-deviation-cwd-not-pilot-repo)
and
[`multi-repo-cwd-handling-undocumented`](../planning-artifacts/friction-log.md#multi-repo-cwd-handling-undocumented).

## Invoke clickup-create-story

The `clickup-create-story` skill creates a ClickUp task in the active sprint list —
as a subtask of a chosen epic (the default), or as a standalone top-level task when
no epic parent is needed (ops tasks, research spikes, ad-hoc work) — with a
description composed from the pilot repo's `planning-artifacts/PRD.md` +
`planning-artifacts/architecture.md` + the epic's ClickUp body (or PRD +
architecture only on the no-epic path). See
[`src/custom-skills/clickup-create-story/SKILL.md`](../src/custom-skills/clickup-create-story/SKILL.md)
and
[`workflow.md`](../src/custom-skills/clickup-create-story/workflow.md)
for the full skill contract.

### Invocation path A — `CS` trigger via Cursor / VS Code

In an IDE-integrated invocation (Cursor, VS Code Copilot, Cline), type `CS` in
the Dev agent's input to dispatch the `clickup-create-story` skill. The trigger is
defined in [`_bmad/custom/bmad-agent-dev.toml`](../_bmad/custom/bmad-agent-dev.toml)
under the `[[agent.menu]]` entry with `code = "CS"`:

```toml
[[agent.menu]]
code = "CS"
description = "Create a ClickUp story as a subtask of a chosen epic in the active sprint list"
skill = "clickup-create-story"
```

### Invocation path B — manual walk via Claude Code CLI

> Addresses the documented-not-fixed behaviour:
> [`ds-trigger-not-dispatched-via-toml`](../planning-artifacts/friction-log.md#ds-trigger-not-dispatched-via-toml)
> (the entry name reflects the DS/`clickup-dev-implement` trigger, but the same
> TOML-dispatch gap applies to the CS/`clickup-create-story` trigger in Claude Code
> CLI mode — see the comment block in
> [`_bmad/custom/bmad-agent-dev.toml`](../_bmad/custom/bmad-agent-dev.toml))

In Claude Code CLI mode, the `CS` trigger is not dispatched via the TOML routing
table. The agent invokes the skill steps directly, walking
`src/custom-skills/clickup-create-story/steps/step-01` through `step-05`. Both
invocation paths produce the same artifacts (ClickUp task created, description
posted, URL returned).

**Conversational invocation pattern:**

> Invoke the `clickup-create-story` skill against pilot epic `<epic-id>`.

The agent then walks the five steps in order. See
[`_bmad/custom/bmad-agent-dev.toml`](../_bmad/custom/bmad-agent-dev.toml)
comment block for the documented-not-fixed explanation.

### Step-by-step expectations

The skill walks five steps in this order:

1. `step-01-prereq-check` — cwd assertion, permission gate, PRD / architecture load
2. `step-02-epic-picker` — space picker → Backlog list → epic selector; when
   `allow_no_epic` is `true` (the default), a
   `[0] No epic — create as standalone task` entry is prepended to the list
3. `step-03-sprint-list-picker` — sprint folder → sprint list selector
4. `step-04-description-composer` — story title, description synthesis, user review
5. `step-05-create-task` — pre-creation summary, `createTask` call, URL output

Selecting `[0]` routes the skill through the no-epic path: epic context is skipped,
the pre-creation summary shows _(none — standalone task)_ as the parent-epic line
for confirmation, and the created task is a top-level entry in the sprint list with
no parent.

At the end of step 1, you should see the following verbatim message:

> ✅ Permission gate passed — write mode active, token authenticated.

Capture this line verbatim in the Dev Agent Record (§Debug Log References or
§Completion Notes). Functional equivalents are not a substitute — downstream
automation greps for the exact phrase. See
[`step-01-verbatim-message-not-captured`](../planning-artifacts/friction-log.md#step-01-verbatim-message-not-captured)
for the historical precedent.

### What success looks like

- A new ClickUp subtask under the chosen epic.
- The task's description composed from PRD + architecture + epic context.
- The task's URL printed back in the conversation.
- On the no-epic path: a new top-level ClickUp task in the sprint list, with no
  parent, and a description composed from PRD + architecture only.

**Safety note:** Post-5-7, the epic-picker filters out subtasks so they do not
surface as candidate epics in future runs (see
[`epic-picker-no-root-level-filter`](../planning-artifacts/friction-log.md#epic-picker-no-root-level-filter)).

## Invoke clickup-dev-implement

The `clickup-dev-implement` skill accepts a ClickUp task ID, fetches the task
description and parent-epic context, reads the pilot repo's planning artifacts,
implements code via IDE file tools, posts progress comments to ClickUp, and
transitions the task status to a review state. See
[`src/custom-skills/clickup-dev-implement/SKILL.md`](../src/custom-skills/clickup-dev-implement/SKILL.md)
and
[`workflow.md`](../src/custom-skills/clickup-dev-implement/workflow.md)
for the full skill contract.

### Invocation path A — `DS` trigger via Cursor / VS Code

Type `DS` in the Dev agent's input to dispatch the `clickup-dev-implement` skill
in IDE-integrated invocations. Defined in
[`_bmad/custom/bmad-agent-dev.toml`](../_bmad/custom/bmad-agent-dev.toml):

```toml
[[agent.menu]]
code = "DS"
description = "Implement a ClickUp task end-to-end — fetch task + parent-epic context, read planning artifacts, implement code, post progress comments, transition status"
skill = "clickup-dev-implement"
```

### Invocation path B — manual walk via Claude Code CLI

Same documented-not-fixed framing as `clickup-create-story` path B. The agent
walks seven steps directly:

1. `step-01-task-id-parser` — cwd assertion, PAT-prefix preflight, task-ID parsing
2. `step-02-task-fetch` — `getTaskById` for task + parent epic
3. `step-03-planning-artifact-reader` — loads PRD, architecture, optional tech-spec
4. `step-04-progress-comment-poster` — M1 comment posted before implementation
5. `step-05-status-transition` — transitions task to review status after M2
6. `step-06-assumptions` — discretionary assumption comments
7. `step-07-dev-clarification` — blocking clarification requests

**Conversational invocation pattern:**

> Invoke the `clickup-dev-implement` skill against task `<task-id>`.

### Post-5-7 contract changes

Three behaviour changes from the story-5-7 refinement pass that every team-lead
should know:

**Step-01 PAT-prefix preflight.** Before parsing the task ID, the skill runs
`git remote -v` and checks all remote URLs for GitHub PAT prefixes (`ghp_`,
`github_pat_`, `ghs_`, `ghu_`, `ghr_`). If any match is found, the skill emits a
`❌` error block with a rotation-path hint and stops. Pre-empt with
`git remote -v | grep -E 'ghp_|github_pat_|ghs_|ghu_|ghr_'` before invoking —
if the command returns any output, rewrite the remote to a clean HTTPS or SSH URL
and rotate the leaked token. See
[`lore-origin-pat-preflight-gap`](../planning-artifacts/friction-log.md#lore-origin-pat-preflight-gap).

**Step-05 broadened review-status match set.** The skill matches the task list's
allowed statuses against this set in priority order (case-insensitive,
whitespace-trimmed):

1. `in review`
2. `ready for review`
3. `code review`
4. `pending review`
5. `awaiting review`

If none of the five synonyms match, the skill skips the transition with a `⚠️`
warning that enumerates the full match set in the diagnostic. Manual fallback:
`updateTask({ status: "<your-list's-review-status>" })`. Pre-empt by naming your
sprint list's review-state status to one of the five synonyms above. See
[`step-05-in-review-literal-match-miss`](../planning-artifacts/friction-log.md#step-05-in-review-literal-match-miss)
and
[`step-05-match-set-too-narrow`](../planning-artifacts/friction-log.md#step-05-match-set-too-narrow).

**Step-04 Template B PR field.** The M2 "Implementation Complete" comment now
renders a `**Pull Request:** {pr_url}` line between `**Summary:**` and
`**Files changed:**` when `{pr_url}` is non-empty. You are responsible for
supplying `{pr_url}` from `gh pr create` stdout. If no PR was opened (doc-only
change, direct commit to main), omit the field — Template B renders cleanly
without it. See
[`template-b-no-pr-field`](../planning-artifacts/friction-log.md#template-b-no-pr-field).

### What success looks like

- M1 progress comment posted on the ClickUp task before implementation begins.
- Implementation commits and PR landed in the pilot repo.
- M2 progress comment posted with the PR URL.
- Task status transitioned to a review state (or a `⚠️` warning if no synonym
  matched — see broadened match set above).

## Invoke clickup-create-bug

The `clickup-create-bug` skill creates a ClickUp task from a free-form bug report,
with a structured description and an optional parent epic. See
[`src/custom-skills/clickup-create-bug/SKILL.md`](../src/custom-skills/clickup-create-bug/SKILL.md)
and
[`workflow.md`](../src/custom-skills/clickup-create-bug/workflow.md)
for the full skill contract.

### Invocation path A — `CB` trigger via Cursor / VS Code

In an IDE-integrated invocation (Cursor, VS Code Copilot, Cline), type `CB` in
the Dev agent's input to dispatch the `clickup-create-bug` skill. The trigger is
defined in [`_bmad/custom/bmad-agent-dev.toml`](../_bmad/custom/bmad-agent-dev.toml)
under the `[[agent.menu]]` entry with `code = "CB"`:

```toml
[[agent.menu]]
code = "CB"
description = "Create a ClickUp bug ticket from a free-form bug report"
skill = "clickup-create-bug"
```

### Invocation path B — manual walk via Claude Code CLI

Same documented-not-fixed framing as `clickup-create-story` and
`clickup-dev-implement` path B. The agent walks five steps directly:

1. `step-01-prereq-check` — permission gate (write mode + token); soft-loads PRD /
   architecture / epics via `resolve-doc-paths` cascade
2. `step-02-list-picker` — presents lists in the chosen space; operator picks
   target list (active sprint or dedicated bugs list); auto-saves to
   `.bmadmcp/config.toml`
3. `step-03-epic-picker` — optional; operator can skip to create the bug without
   a parent epic, or browse Backlog epics if desired
4. `step-04-description-composer` — operator pastes free-form report; composer
   parses into Summary / Repro / Expected / Actual / Impact / Suspected area /
   Environment / Related links; infers severity
5. `step-05-create-task` — pre-creation summary shown; duplicate check via
   `searchTasks`; operator confirms; `createTask` called; URL returned

**Conversational invocation patterns:**

> Invoke the `clickup-create-bug` skill and report a bug.

Or with inline report:

> Create a bug: [paste bug description here]

### Step-by-step expectations

At the end of step 1, you should see the following verbatim message:

> ✅ Permission gate passed — write mode active, token authenticated.

Capture this line verbatim in the Dev Agent Record (§Debug Log References or
§Completion Notes). Functional equivalents are not a substitute — downstream
automation greps for the exact phrase.

If any planning artifacts are absent, the skill emits soft-load `⚠️` warnings and
continues regardless. The three possible warning wordings are:

**PRD missing:**

> ⚠️ PRD not found at `<prd_info.path>` [`<prd_info.layer>`] — proceeding without PRD context. Bug description will be based on the user's report only.

**Architecture missing:**

> ⚠️ Architecture doc not found at `<arch_info.path>` [`<arch_info.layer>`] — proceeding without architecture context.

**Epics missing:**

> ⚠️ Epics path not found at `<epics_info.path>` [`<epics_info.layer>`] — story detail will be derived from bug report only.

All three warnings are non-fatal; the skill continues and creates the ticket
using the operator's bug report as the sole context source.

### Severity-to-priority mapping

The skill infers ClickUp priority from severity keywords in the bug report:

| Severity | ClickUp priority |
| -------- | ---------------- |
| Critical | 1 (urgent)       |
| High     | 2 (high)         |
| Medium   | 2 (high)         |
| Low      | 4 (low)          |
| Unknown  | 2 (high)         |

Medium severity defaults to `high` priority (not `normal`) — this is intentional
per EPIC-7 requirements.

### What success looks like

- A new ClickUp task in the target list with the tag `bug`.
- Description structured as: Summary / Steps to Reproduce / Expected Behaviour /
  Actual Behaviour / Impact/Severity / Suspected Area / Environment / Related
  Links / (optional Tech Context).
- Priority inferred from severity keywords (or overridden by
  `[clickup_create_bug].default_priority`).
- Optional parent epic if operator chose one in step 3.
- Task URL printed in the conversation at the end of step 5.

## Where things live

<!-- prettier-ignore-start -->

| Artifact | Location | Notes |
| --- | --- | --- |
| PRD + architecture (+ tech-spec if used) | **Pilot repo** at `planning-artifacts/{PRD,architecture,tech-spec}.md` | See [`planning-artifacts/README.md`](../planning-artifacts/README.md) §"What target projects look like" for the canonical shape |
| Epics + stories | **ClickUp** — tasks and subtasks in your workspace | Same-list layout (default, post-5-7): epic and subtasks in the same Backlog list. Cross-list layout: subtasks in a Sprint list, requires "Tasks in Multiple Lists" ClickApp ON. See [`prd-clickup-layout-vs-merged-state-drift`](../planning-artifacts/friction-log.md#prd-clickup-layout-vs-merged-state-drift) |
| Sprint state | **ClickUp** — the active sprint list inside the workspace's sprint folder | See [`planning-artifacts/pilot.md`](../planning-artifacts/pilot.md) §ClickUp coordinates for the bmad-mcp-server pilot's concrete coordinates as a worked example |
| bmad-mcp-server itself | Wherever your MCP client is configured to launch it (per [README.md §Installation](../README.md#installation)) | The server's own `planning-artifacts/` is bootstrap-only and is **not** the source of truth for any pilot project's stories |

<!-- prettier-ignore-end -->

## Common pitfalls

### `gh auth` configured for the wrong account

> See:
> [`gh-auth-wrong-account`](../planning-artifacts/friction-log.md#gh-auth-wrong-account),
> [`gh-auth-prerequisite-undocumented`](../planning-artifacts/friction-log.md#gh-auth-prerequisite-undocumented)

**Symptom:** `gh pr create` fails mid-`clickup-dev-implement` invocation with an
org-access error (e.g. `GraphQL: Resource not accessible by integration`).

**Pre-empt:** Run `gh auth status` before invoking the skill and confirm the
active account has push access to the pilot repo's GitHub org.

**Recovery:** `gh auth switch --user <handle>`, then retry `gh pr create`.

### Wrong cwd at skill invocation

> See:
> [`pwd-deviation-cwd-not-pilot-repo`](../planning-artifacts/friction-log.md#pwd-deviation-cwd-not-pilot-repo),
> [`multi-repo-cwd-handling-undocumented`](../planning-artifacts/friction-log.md#multi-repo-cwd-handling-undocumented)

**Symptom:** The cwd-assertion `❌` error block fires at step 1.

**Pre-empt:** Run `pwd` before invoking; confirm it prints the pilot repo root.
Place `.bmad-pilot-marker` at the pilot repo root per [§Prerequisites](#prerequisites).

**Recovery:** `cd` to the pilot repo and re-invoke. Or use the disclosed-deviation
escape hatch (absolute-path `Read` + Dev Agent Record disclosure) if `cd` is not
available in the session.

### "Tasks in Multiple Lists" ClickApp toggle OFF

> See:
> [`cross-list-subtask-block`](../planning-artifacts/friction-log.md#cross-list-subtask-block)

**Symptom:** `createTask` returns `400 ITEM_137 Parent not child of list`.

**Pre-empt:** If you intend to use the cross-list layout (epic in Backlog,
subtasks in a Sprint list), confirm the toggle is ON before designing the layout.
Ask your workspace admin to enable it under ClickUp workspace Settings → ClickApps.

**Recovery:** Switch to the same-list layout (place epic and subtasks in the same
list) — this is the default supported shape per the post-5-7 PRD amendment, and it
does not require the toggle.

### Review-status enum doesn't match the broadened match set

> See:
> [`step-05-in-review-literal-match-miss`](../planning-artifacts/friction-log.md#step-05-in-review-literal-match-miss),
> [`step-05-match-set-too-narrow`](../planning-artifacts/friction-log.md#step-05-match-set-too-narrow)

**Symptom:** `step-05-status-transition` emits a `⚠️` warning enumerating the
full five-synonym match set, and the task status is not transitioned.

**Pre-empt:** Name your sprint list's review-state status to one of: `in review`,
`ready for review`, `code review`, `pending review`, or `awaiting review`.

**Recovery:** Run `updateTask({ status: "<your-list's-review-status>" })` manually
in the conversation after implementation completes.

### Multi-list / multi-folder ambiguity in pickers

> See:
> [`two-backlog-lists-in-team-space`](../planning-artifacts/friction-log.md#two-backlog-lists-in-team-space),
> [`two-sprint-folders-in-team-space`](../planning-artifacts/friction-log.md#two-sprint-folders-in-team-space)

**Symptom:** `step-02-epic-picker` or `step-03-sprint-list-picker` prompts with a
numbered disambiguation list because more than one `Backlog` list or more than one
`sprint*` folder exists in the space.

**Pre-empt:** Pin the IDs in `.bmadmcp/config.toml` at the project root (see
[`.bmadmcp/config.example.toml`](../.bmadmcp/config.example.toml)):

```toml
[clickup_create_story]
pinned_space_id         = "<your-space-id>"
pinned_space_name       = "<your-space-name>"
pinned_backlog_list_id  = "<your-backlog-list-id>"
pinned_sprint_folder_id = "<your-sprint-folder-id>"
```

**Recovery:** Type the number of the correct list / folder when prompted.

### Origin URL embeds a GitHub PAT

> See:
> [`lore-origin-pat-preflight-gap`](../planning-artifacts/friction-log.md#lore-origin-pat-preflight-gap)

**Symptom:** The step-01 PAT-prefix preflight emits a `❌` error block when you
invoke `clickup-dev-implement`.

**Pre-empt:** Before invoking, run:

```bash
git remote -v | grep -E 'ghp_|github_pat_|ghs_|ghu_|ghr_'
```

If this returns any output, rewrite the remote URL before proceeding.

**Recovery:**

```bash
git remote set-url origin <clean-url>
# e.g. git remote set-url origin git@github.com:Alpharages/lore.git
```

Then rotate the leaked PAT in GitHub Settings → Developer settings → Personal
access tokens — even if the repo is private, treat any leaked token as
compromised.

### Planning artifacts missing or at non-default paths

**Symptom:** One or more `⚠️` soft-load warning lines during step 1; the bug
ticket is created without PRD / architecture context.

**Pre-empt:** Confirm that `planning-artifacts/PRD.md` and
`planning-artifacts/architecture.md` exist, or configure the doc-path cascade in
`.bmadmcp/config.toml` `[docs]` if the files live elsewhere.

**Recovery:** Re-invoke the skill; the `⚠️` warnings are informational only —
the ticket was created correctly despite them.

## Change log

<!-- prettier-ignore-start -->

| Date       | Status        | Change                                                                                                                                                                                 |
| ---------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-28 | ready-for-dev | Initial quickstart created via story 5-8. Covers post-5-7 skill contract: cwd-assertion, both invocation paths, broadened review-status match set, Template B PR field, PAT-prefix preflight, pinned-ID config knobs. Lands `gh-auth-prerequisite-undocumented` and `multi-repo-cwd-handling-undocumented` friction-log entries. |
| 2026-05-01 | ready-for-dev | Added `Invoke clickup-create-bug` section (CB trigger, five-step walkthrough, soft-load warning wording). Added Planning-artifacts-missing pitfall entry. Added `[clickup_create_bug]` config keys to pinned-ID reference. |
| 2026-05-01 | ready-for-dev | Story 8-8: documented the no-epic option in `Invoke clickup-create-story` — updated What-the-skill-does paragraph, step-02 line, added no-epic path note and success bullet, and added `allow_no_epic` config key to `[clickup_create_story]` pinned-ID reference. |

<!-- prettier-ignore-end -->
