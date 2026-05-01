# Story 7.10: Bug-flow documentation — pilot quickstart entry and error-block wording

Status: done

Epic: [EPIC-7: Bug-shaped stories in ClickUp](../epics/EPIC-7-bug-shaped-stories.md)

> Stories 7.1–7.9 delivered a fully functional `clickup-create-bug` skill with five
> steps, severity inference, optional epic picker, soft-loaded planning artifacts, and
> unit-test coverage. None of that work is surfaced in the team-facing
> `docs/clickup-quickstart.md`, and the error-block wording for partially-loaded
> artifacts is not documented anywhere outside the step files themselves.
>
> This story closes that gap with a focused documentation pass — no TypeScript
> changes, no step-file changes, no new config keys. Pure docs only.
>
> **Depends on stories 7.1–7.9 completing first.**

## Story

As the **bmad-mcp-server platform maintainer**,
I want `docs/clickup-quickstart.md` to include an "Invoke clickup-create-bug" section
and document the soft-load warning messages emitted when PRD or architecture is absent,
so that teams can report bugs to ClickUp without consulting the step files directly.

## Acceptance Criteria

### AC 1 — New quickstart section

`docs/clickup-quickstart.md` MUST gain an `## Invoke clickup-create-bug` section (after
the existing `## Invoke clickup-dev-implement` section and before `## Where things live`).

The section MUST cover:

a. **Invocation paths:**

- Path A — `CB` trigger via Cursor / VS Code (defined in `_bmad/custom/bmad-agent-dev.toml`).
- Path B — conversational invocation via Claude Code CLI.
- Both paths MUST include the invocation pattern the operator types.

b. **Step-by-step expectations** — a numbered list covering all five steps in order:

1.  `step-01-prereq-check` — permission gate + soft-load (PRD / architecture / epics are optional)
2.  `step-02-list-picker` — target list selection (active sprint or dedicated bugs list)
3.  `step-03-epic-picker` — optional epic picker (bugs do not require a parent)
4.  `step-04-description-composer` — free-form bug report → structured template
5.  `step-05-create-task` — pre-creation summary, duplicate check, `createTask` call

c. **Verbatim permission-gate message** — the exact string the operator must capture in their
Dev Agent Record:

> ✅ Permission gate passed — write mode active, token authenticated.

d. **Soft-load warning wording** — verbatim patterns for the three warning messages emitted
when planning artifacts are absent (PRD missing, architecture missing, epics missing). Must
clarify that all three are non-fatal and that the skill continues regardless.

e. **What success looks like** — a bullet list with the concrete outputs: ClickUp task created
with `bug` tag, priority inferred from severity, optional epic parent, URL printed in the
conversation.

### AC 2 — Common pitfalls entry for partially-loaded artifacts

`docs/clickup-quickstart.md` `## Common pitfalls` MUST gain a new entry:

**Heading:** `### Planning artifacts missing or at non-default paths`

The entry MUST include:

- **Symptom:** one or more `⚠️` soft-load warning lines during step 1; bug ticket is created
  without PRD / architecture context.
- **Pre-empt:** confirm that `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md`
  exist, or configure the doc-path cascade in `.bmadmcp/config.toml [docs]` if the files live
  elsewhere.
- **Recovery:** re-invoke the skill; the `⚠️` warnings are informational only — the ticket was
  created correctly despite them.

### AC 3 — Config knob reference updated

`docs/clickup-quickstart.md` `### Optional: pinned-ID config knobs` (or equivalent section)
MUST reference the `[clickup_create_bug]` table and list its five keys with a one-line
description each:

| Key                | Description                                               |
| ------------------ | --------------------------------------------------------- |
| `target_list_id`   | Skip the list picker; the bug is created in this list     |
| `default_priority` | Override severity-inferred priority (1 = urgent, 4 = low) |
| `default_tags`     | Additional tags beyond the automatic `bug` tag            |
| `pinned_epic_id`   | Skip the epic picker; the bug is attached to this epic    |
| `pinned_epic_name` | Display label for the pinned epic                         |

### AC 4 — Change log row

`docs/clickup-quickstart.md` `## Change log` table MUST gain a new row dated `2026-05-01`
describing: "Added Invoke clickup-create-bug section (CB trigger, five-step walkthrough, soft-load
warning wording). Added Planning-artifacts-missing pitfall entry. Added `[clickup_create_bug]`
config keys to pinned-ID reference."

### AC 5 — No other files changed

Only the following files are added or modified by this story:

**New:**

- `planning-artifacts/stories/7-10-bug-flow-documentation.md` (this file)

**Modified:**

- `docs/clickup-quickstart.md`
- `planning-artifacts/sprint-status.yaml` (status update)

No TypeScript source files, step files, skill files, TOML files, or test files are modified.

### AC 6 — Build, lint, format clean

`npm run build` → clean. `npm run lint` → 0 errors. `npm run format` → no diff
(Markdown files under `docs/` are covered by Prettier).

## Out of Scope

- Updating `README.md` or `docs/index.md` — that is EPIC-9's remit.
- Adding a `CB` trigger entry to `_bmad/custom/bmad-agent-dev.toml` — already added in story 7-2.
- Adding `[clickup_create_bug]` keys to `.bmadmcp/config.example.toml` — already present.
- Any changes to skill step files.
- E2E tests for the bug flow — deferred.

## Tasks / Subtasks

- [x] **Task 1 — Write `## Invoke clickup-create-bug` section (AC #1)**
  - [x] Add section after `## Invoke clickup-dev-implement`, before `## Where things live`.
  - [x] Include Path A (`CB` trigger) and Path B (conversational) invocation patterns.
  - [x] List all five steps with descriptions matching the step-file contracts.
  - [x] Include verbatim permission-gate success message.
  - [x] Include verbatim wording for all three soft-load `⚠️` warnings (PRD, arch, epics).
  - [x] Write "What success looks like" bullet list.

- [x] **Task 2 — Add `### Planning artifacts missing or at non-default paths` pitfall (AC #2)**
  - [x] Append to `## Common pitfalls` section.
  - [x] Cover symptom, pre-empt, and recovery per AC 2.

- [x] **Task 3 — Add `[clickup_create_bug]` keys to pinned-ID config reference (AC #3)**
  - [x] Update the existing `### Optional: pinned-ID config knobs` section (or equivalent).
  - [x] List the five bug-skill keys from the `[clickup_create_bug]` table with descriptions.

- [x] **Task 4 — Add change log row (AC #4)**
  - [x] Add `2026-05-01` row to `## Change log` table in `docs/clickup-quickstart.md`.

- [x] **Task 5 — Verify (AC #5–#6)**
  - [x] Confirm only `docs/clickup-quickstart.md` and sprint-status are modified.
  - [x] `npm run build` → clean.
  - [x] `npm run lint` → 0 errors.
  - [x] `npm run format` → no diff (or auto-apply and recheck).

- [x] **Task 6 — Update sprint-status.yaml**
  - [x] Set `7-10-bug-flow-documentation: in-progress` (later updated to `review`).
  - [x] Update `last_updated` field.

## Dev Notes

### Quickstart structure — where each section lands

The existing `docs/clickup-quickstart.md` structure is:

```
## Prerequisites
## Multi-repo Claude Code sessions
## Invoke clickup-create-story
## Invoke clickup-dev-implement
## Where things live
## Common pitfalls
## Change log
```

The new `## Invoke clickup-create-bug` section goes **between** `## Invoke clickup-dev-implement`
and `## Where things live`.

The new `### Planning artifacts missing or at non-default paths` pitfall goes **at the end of**
`## Common pitfalls`, after the existing "Multi-list / multi-folder ambiguity" and "Origin URL
embeds a GitHub PAT" entries.

The `[clickup_create_bug]` config key table goes **inside** `### Optional: pinned-ID config knobs`
after the existing `clickup_create_story` table block.

### `CB` trigger TOML snippet

Already committed in `_bmad/custom/bmad-agent-dev.toml` (added by story 7-2):

```toml
[[agent.menu]]
code = "CB"
description = "Create a ClickUp bug ticket from a free-form bug report"
skill = "clickup-create-bug"
```

Copy this verbatim into the quickstart section under Path A.

### Verbatim soft-load warning messages (from step-01-prereq-check.md)

**PRD missing:**

> ⚠️ PRD not found at `<prd_info.path>` [`<prd_info.layer>`] — proceeding without PRD context. Bug description will be based on the user's report only.

**Architecture missing:**

> ⚠️ Architecture doc not found at `<arch_info.path>` [`<arch_info.layer>`] — proceeding without architecture context.

**Epics missing:**

> ⚠️ Epics path not found at `<epics_info.path>` [`<epics_info.layer>`] — story detail will be derived from bug report only.

These appear in the conversation during step 1 when planning artifacts are absent. The skill continues in all three cases — the warnings are informational.

### Verbatim permission-gate success message (from step-01-prereq-check.md)

> ✅ Permission gate passed — write mode active, token authenticated.

Operators MUST capture this verbatim in the Dev Agent Record, same convention as `clickup-create-story`.

### Step-by-step summary (for quickstart prose)

| Step | File                              | What happens                                                                                                                                                        |
| ---- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `step-01-prereq-check.md`         | Permission gate (write mode + token); soft-loads PRD / arch / epics via `resolve-doc-paths` cascade                                                                 |
| 2    | `step-02-list-picker.md`          | Presents lists in the chosen space; operator picks target list (sprint or bugs list); auto-saves to `.bmadmcp/config.toml`                                          |
| 3    | `step-03-epic-picker.md`          | Optional; operator can skip to create bug without parent; browses Backlog epics if desired                                                                          |
| 4    | `step-04-description-composer.md` | Operator pastes free-form report; composer parses into Summary / Repro / Expected / Actual / Impact / Suspected area / Environment / Related links; infers severity |
| 5    | `step-05-create-task.md`          | Pre-creation summary shown; duplicate check via `searchTasks`; operator confirms; `createTask` called; URL returned                                                 |

### Severity-to-priority mapping (reference for quickstart note)

| Severity | ClickUp priority                           |
| -------- | ------------------------------------------ |
| Critical | 1 (urgent)                                 |
| High     | 2 (high)                                   |
| Medium   | 2 (high) — Medium maps to high, not normal |
| Low      | 4 (low)                                    |
| Unknown  | 2 (high)                                   |

Worth a one-liner in the quickstart: "Medium severity defaults to `high` priority (not `normal`)
— this is intentional per EPIC-7 requirements."

### What success looks like (for quickstart bullet list)

- A new ClickUp task in the target list with the tag `bug`.
- Description structured as: Summary / Steps to Reproduce / Expected Behaviour / Actual Behaviour /
  Impact/Severity / Suspected Area / Environment / Related Links / (optional Tech Context).
- Priority inferred from severity keywords (or overridden by `[clickup_create_bug].default_priority`).
- Optional parent epic if operator chose one in step 3.
- Task URL printed in the conversation at the end of step 5.

### `[clickup_create_bug]` config keys (already in config.example.toml)

```toml
[clickup_create_bug]
# target_list_id   = ""    # Pin the target list for bug tickets (skips list picker)
# default_priority = ""    # Override severity-inferred priority (1=urgent,2=high,3=normal,4=low)
# default_tags     = []    # Extra tags added beyond the automatic "bug" tag
# pinned_epic_id   = ""    # Pin the epic parent (skips epic picker)
# pinned_epic_name = ""    # Display name for the pinned epic
```

Auto-save behaviour: after the first interactive list selection in step 2, `target_list_id` is
written to `.bmadmcp/config.toml` automatically — future runs skip the list picker.

### Invocation patterns (for quickstart)

**Path A (IDE trigger):**

```
CB
```

**Path B (Claude Code CLI conversational):**

> Invoke the `clickup-create-bug` skill and report a bug.

Or with inline report:

> Create a bug: [paste bug description here]

### Noted-not-fixed context

The `ds-trigger-not-dispatched-via-toml` framing in the existing quickstart applies equally to
`CB` in Claude Code CLI mode — the TOML routing table is load-bearing only for IDE-integrated
invocations. In Claude Code CLI mode the agent walks the step files directly. Document this
the same way as `CS` and `DS` in the existing quickstart.

### Files changed by this story

**New:**

- `planning-artifacts/stories/7-10-bug-flow-documentation.md`

**Modified:**

- `docs/clickup-quickstart.md`
- `planning-artifacts/sprint-status.yaml`

## Dev Agent Record

_(Filled in by the implementing agent after completion.)_

### Agent Model Used

Kimi Code CLI (root agent)

### Completion Notes List

- Inserted `## Invoke clickup-create-bug` section with Path A (CB trigger), Path B (conversational), five-step walkthrough, verbatim permission-gate message, three soft-load warning wordings, severity-to-priority mapping, and success bullets.
- Added `[clickup_create_bug]` config key table to `### Optional: pinned-ID config knobs`.
- Added `### Planning artifacts missing or at non-default paths` pitfall to `## Common pitfalls`.
- Added `2026-05-01` change-log row.
- Build, lint, and format verified clean.

### File List

**Modified:**

- `docs/clickup-quickstart.md`
- `planning-artifacts/sprint-status.yaml`

## Change Log

| Date       | Change                                 |
| ---------- | -------------------------------------- |
| 2026-05-01 | Story drafted. Status → ready-for-dev. |
| 2026-05-01 | Story implemented. Status → review.    |

### Review Findings

- [x] [Review][Decision] Soft-load warning placeholder wording — resolved: updated to verbatim (`<prd_info.path>` / `<prd_info.layer>` / `<arch_info.path>` / `<arch_info.layer>` / `<epics_info.path>` / `<epics_info.layer>`) matching `step-01-prereq-check.md` exactly.
- [x] [Review][Patch] `sprint-status.yaml` comment/data-field inconsistency [`planning-artifacts/sprint-status.yaml:52`] — fixed: data field updated to `→ review` to match the comment.
- [x] [Review][Patch] Story file needs a prettier format pass before committing [`planning-artifacts/stories/7-10-bug-flow-documentation.md`] — `npm run format` auto-wrote the fix; stage this file alongside the other changes before committing.
