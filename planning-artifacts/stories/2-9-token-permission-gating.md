# Story 2.9: Token-permission gating for `clickup-create-story`

Status: ready-for-dev

Epic: [EPIC-2: Dev agent story-creation mode → ClickUp (non-destructive)](../epics/EPIC-2-dev-story-creation-clickup.md)

> Stories 2.2–2.6 implemented five interactive steps (prereq check, epic picker, sprint-list picker, description composer, task creation). If the user's `CLICKUP_API_KEY` token is invalid, missing, or `CLICKUP_MCP_MODE` is not `write`, today's skill fails at step 5 — after the user has patiently walked through epic, sprint-list, and description pickers. Story 2.9 moves the gate to the top of step 1, so the user receives an actionable error at invocation time, not after completing all pickers.
>
> EPIC-2 specifically names this: "Gate invocation to users whose ClickUp token has create-task permission on the space (natural gating via token)." The natural gating works by:
> (a) verifying `createTask` is registered — which only happens in `write` mode — and
> (b) making a lightweight `pickSpace` call to confirm the token authenticates against the ClickUp API.
> Neither check requires a destructive API call. `createTask`'s actual permission is still verified naturally by step 5 when the task is created; this gate fails fast on the two most common misconfigurations (wrong mode, bad token).
>
> **Depends on story 2.2 (`step-01-prereq-check.md` exists).** No dependency on 2.3–2.8 — those stories add later steps and do not change step-01.

## Story

As the **bmad-mcp-server platform maintainer**,
I want `step-01-prereq-check.md` to check `CLICKUP_MCP_MODE=write` and a valid `CLICKUP_API_KEY` token BEFORE the skill enters the interactive pickers,
so that the user receives an actionable permission error at invocation time rather than after completing the epic picker, sprint-list picker, and description composer — satisfying EPIC-2 exit criterion "Gate invocation to users whose ClickUp token has create-task permission on the space" and PRD §Auth ("per-user ClickUp token via `CLICKUP_API_KEY` env var").

## Acceptance Criteria

1. `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md` is enhanced with a **`## Permission Gate`** section that appears as the FIRST section (before `## File Check`). The section MUST:

   (a) State the mode requirement: `CLICKUP_MCP_MODE` MUST be `write`. Verify by checking whether `createTask` is available in the current tool list. If it is absent (mode is `read-minimal` or `read`), emit the mode error block (AC #2) and stop the entire skill run immediately.

   (b) Verify the token by calling `pickSpace` with no arguments. If the response contains an authentication error (response text contains `401`, `Unauthorized`, `invalid token`, or `CLICKUP_API_KEY`, or zero spaces are returned alongside an error indicator), emit the token error block (AC #3) and stop immediately.

   (c) If both checks pass, confirm to the user: "✅ Permission gate passed — write mode active, token authenticated." and continue to `## File Check`.

2. The mode error block (AC #1a) MUST follow this exact template (verbatim in the step file):

   ```
   ❌ **Permission gate failed — write mode required**

   The `clickup-create-story` skill requires `CLICKUP_MCP_MODE=write`. The current
   mode does not register `createTask`, so task creation is impossible.

   **Why:** `createTask` is only registered in `write` mode. The full skill requires
   `write` mode from step 1 (token verification via `pickSpace`) through step 5
   (task creation via `createTask`). Running in `read-minimal` or `read` mode will
   fail at step 5 at the latest — failing here avoids wasted picker round-trips.

   **What to do:** Set `CLICKUP_MCP_MODE=write` in your environment and restart the
   MCP server, then re-invoke the Dev agent in story-creation mode.
   ```

3. The token error block (AC #1b) MUST follow this exact template (verbatim in the step file):

   ```
   ❌ **Permission gate failed — ClickUp authentication failed**

   The `clickup-create-story` skill called `pickSpace` to verify your
   `CLICKUP_API_KEY` token, but the ClickUp API returned an authentication error or
   no spaces.

   **Why:** Without a valid token the skill cannot list epics (step 2), sprint lists
   (step 3), or create tasks (step 5). Failing here avoids wasted picker round-trips.

   **What to do:**
   - Confirm `CLICKUP_API_KEY` is set in your environment to a valid personal token.
   - Confirm `CLICKUP_TEAM_ID` is set to your workspace ID (7–10 digits).
   - Restart the MCP server after updating either variable, then re-invoke the Dev
     agent in story-creation mode.
   ```

4. The existing `## RULES` section of `step-01-prereq-check.md` MUST be updated:
   - Remove the blanket prohibition "Do not... call ClickUp APIs." — one read-only call (`pickSpace`) is now permitted for token validation.
   - Add rule: "This step calls `pickSpace` (no arguments) exactly once for token validation. No other ClickUp API calls are made in this step. No writes to ClickUp."
   - Add rule: "`CLICKUP_MCP_MODE=write` is required. If `createTask` is not in the available tool list, stop immediately."
   - Retain the existing rule: "If either required file is missing, stop the entire skill run immediately."

5. The section title `# Step 1: Prereq File Check` MUST remain unchanged (the step's identity in the workflow doesn't change — this story adds a gate inside it, not a new step).

6. `src/custom-skills/clickup-create-story/workflow.md` — the `## Prerequisites` section MUST be updated to document the permission gate:
   - Add one sentence before the `See: ./steps/step-01-prereq-check.md` pointer: "Before checking project files, step 1 verifies that `CLICKUP_MCP_MODE=write` (so `createTask` is registered) and that the `CLICKUP_API_KEY` token authenticates against the ClickUp API; the skill aborts with an actionable error if either check fails."
   - No other sections in `workflow.md` change.

7. No files under `BMAD-METHOD/`, `src/tools/clickup/`, or `src/*.ts` are created, modified, or deleted. `git diff --stat -- BMAD-METHOD/ src/tools/clickup/ 'src/**/*.ts'` MUST be empty.

8. The vendor-tree exclusions from story 1.1 and the TOML wiring from story 2.7 remain unchanged: `.gitignore`, `_bmad/custom/bmad-agent-dev.toml`, `src/core/resource-loader.ts`. `git diff --stat -- _bmad/ src/core/` MUST be empty after this story.

9. `npm run build` → clean. `npm run lint` → 0 errors. `npm run format` → no diff. `npm test` → 233 passing (unchanged — no `.ts` files land in this story).

## Out of Scope (explicitly deferred to later stories)

- Per-list or per-space permission checks (verifying the token can create tasks in the SPECIFIC sprint list selected by the user) — too expensive to verify pre-picker without knowing the target list.
- `CLICKUP_TEAM_ID` format validation (7–10 digit check) — implicit in `pickSpace` response; a malformed team ID surfaces as a token error through the same gate.
- Role-based permission introspection via the ClickUp `/v2/team/{team_id}/user/{user_id}` endpoint — the "natural gating via token" approach (EPIC-2) is sufficient.
- Retry or backoff on transient `pickSpace` failures — the gate emits the token error and stops; the user re-invokes after confirming connectivity.
- Moving the mode-check RULE from `step-05-create-task.md` — step-05's rule (a) remains in place as a defence-in-depth guard; this story adds an early gate at step-01, not a removal of the late gate.

## Tasks / Subtasks

- [ ] **Task 1 — Add `## Permission Gate` section to step-01 (AC: #1–#4)**
  - [ ] Open `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md`.
  - [ ] Rename the existing `## RULES` and main body into `## File Check` by introducing a new H2 heading so the file becomes: YAML frontmatter → `## RULES` (updated) → `## Permission Gate` → `## File Check` → `## NEXT`.
  - [ ] Update `## RULES` per AC #4: remove "no ClickUp API calls" prohibition; add `pickSpace`-only rule and `createTask`-availability rule.
  - [ ] Add `## Permission Gate` with instructions (a), (b), (c) as described in AC #1:
    - Step (a): "Verify `createTask` is in the available tool list. If absent, emit the mode error block verbatim and stop."
    - Step (b): "Call `pickSpace` (no arguments). If the response contains `401`, `Unauthorized`, `invalid token`, or `CLICKUP_API_KEY`, or returns zero spaces with an error indicator, emit the token error block verbatim and stop."
    - Step (c): "Emit `✅ Permission gate passed — write mode active, token authenticated.` and continue to `## File Check`."
  - [ ] Embed the mode error block (AC #2) and the token error block (AC #3) verbatim inside the Permission Gate section (use blockquote `>` format to avoid triple-backtick nesting — the agent will strip `>` markers and emit the block contents).
  - [ ] Retain the existing `## File Check` content (steps 1–5 from story 2.2) without modification.

- [ ] **Task 2 — Update `workflow.md` Prerequisites section (AC: #6)**
  - [ ] Open `src/custom-skills/clickup-create-story/workflow.md`.
  - [ ] In `## Prerequisites`, add the sentence from AC #6 before the `See:` pointer.
  - [ ] Confirm no other sections change. `diff` MUST show only the `## Prerequisites` section modified.

- [ ] **Task 3 — Verify regression-free (AC: #7–#9)**
  - [ ] `git diff --stat -- BMAD-METHOD/ src/tools/clickup/ 'src/**/*.ts'` → empty.
  - [ ] `git diff --stat -- _bmad/ src/core/` → empty.
  - [ ] `npm run build` → clean.
  - [ ] `npm run lint` → 0 errors.
  - [ ] `npm run format` → no diff.
  - [ ] `npm test` → 233 passing (unchanged).

- [ ] **Task 4 — Commit (AC: all)**
  - [ ] Stage: `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md`, `src/custom-skills/clickup-create-story/workflow.md`.
  - [ ] Commit message: `feat(custom-skills): add permission gate to step-01 in clickup-create-story`
  - [ ] Body:

    ```
    Enhances step-01-prereq-check.md with a ## Permission Gate section that
    runs before the file checks. The gate verifies two things:

    (a) createTask is in the available tool list — absent means CLICKUP_MCP_MODE
        is not write, and the skill would fail at step 5 anyway.
    (b) pickSpace (no args) succeeds — an auth error means CLICKUP_API_KEY or
        CLICKUP_TEAM_ID is missing or invalid.

    If either check fails the skill stops immediately with an actionable error
    block, avoiding wasted epic-picker, sprint-list-picker, and description-
    composer round-trips.

    Updates workflow.md ## Prerequisites to document the gate.

    No TypeScript source changes. No test changes. Test count: 233 (unchanged).

    Satisfies EPIC-2: "Gate invocation to users whose ClickUp token has
    create-task permission on the space (natural gating via token)."

    Refs: EPIC-2, story 2-9-token-permission-gating.
    ```

## Dev Notes

### Why two checks instead of one

A single "try to call `createTask` with dummy args" would cover both the mode check and a partial permission check, but:

1. `createTask` is a write operation — calling it with dummy args creates a real task (or returns an API error that is hard to distinguish from a permission error vs. bad args).
2. `pickSpace` is read-only, idempotent, and has a clear auth error path distinct from "no spaces found."
3. The mode check (AC #1a) is a tool-availability check with no API call; the token check (AC #1b) is a single read-only call. Together they cover the two most common failure modes without side effects.

### How the agent detects mode

The BMAD Dev agent operates in an MCP session with a specific tool list. When `CLICKUP_MCP_MODE=write`, the registered tools include `createTask`. In `read` or `read-minimal` mode, `createTask` is absent from the list. The agent can check by inspecting its available tools before attempting the call. The step file's RULES section states this requirement explicitly so the agent knows to check before proceeding rather than discovering the failure at step 5.

### Why `pickSpace` for token validation

`pickSpace` is registered in all `CLICKUP_MCP_MODE` values. It makes a lightweight authenticated call to the ClickUp API to list available spaces. An invalid or missing `CLICKUP_API_KEY` returns a `401 Unauthorized` response; a missing or wrong `CLICKUP_TEAM_ID` returns an empty or error response. The agent reads the response text and applies the rules from AC #1b to decide whether to proceed.

Importantly, `pickSpace` does not verify that the token can **create tasks** — it only verifies authentication. The actual create-task permission is verified naturally by step 5's `createTask` call (which step-05 already handles with its creation-error block). EPIC-2's "natural gating via token" captures this: ClickUp's API enforces create-task permission at the API boundary; story 2.9 adds an early authentication gate, not a synthetic permission-probe.

### Step-01 file structure after this story

```
---
prd_content: ''
architecture_content: ''
---

# Step 1: Prereq File Check

## RULES

- [updated] CLICKUP_MCP_MODE=write required; check createTask availability before any picker.
- [updated] One read-only ClickUp API call (pickSpace) permitted for token validation. No writes.
- [retained] If either required file is missing, stop immediately.

## Permission Gate

[steps a, b, c from AC #1 with verbatim error blocks]

## File Check

[existing steps 1–5 from story 2.2, unchanged]

## NEXT

[existing NEXT pointer, unchanged]
```

### Relationship to step-05 mode rule

Step-05 (story 2.6) already contains RULE (a): "CLICKUP_MCP_MODE MUST be write." That rule stays in place — it is defence in depth for the case where step-01's gate is somehow bypassed (e.g., the skill is invoked starting from step 5 directly). Story 2.9 adds an early gate; it does not remove the late gate.

### Test count baseline

No `.ts` files land in this story. Test count is unchanged.

| Story | Passing tests                |
| ----- | ---------------------------- |
| 2.8   | 233                          |
| 2.9   | 233 (unchanged) ← this story |

### References

- `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md` — the file being enhanced.
- `src/custom-skills/clickup-create-story/workflow.md` — `## Prerequisites` section updated.
- `src/custom-skills/clickup-create-story/steps/step-05-create-task.md` (story 2.6) — mode-check RULE (a) remains; permission gate at step-01 is additive.
- [Story 2.6 §Dev Notes: createTask tool usage](./2-6-create-clickup-task.md) — confirms `createTask` registered only in write mode; `pickSpace` registered in all modes.
- [EPIC-2 §Outcomes](../epics/EPIC-2-dev-story-creation-clickup.md) — "Gate invocation to users whose ClickUp token has create-task permission on the space (natural gating via token)."
- [PRD §Auth](../PRD.md) — "per-user ClickUp token via `CLICKUP_API_KEY` env var; team-shared `CLICKUP_TEAM_ID`."

## Dev Agent Record

### Agent Model Used

(to be filled in during implementation)

### Debug Log References

(to be filled in during implementation)

### Completion Notes List

(to be filled in during implementation)

### File List

**New**

- (none)

**Modified**

- `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md` — `## RULES` updated; new `## Permission Gate` section added before `## File Check` (AC #1–#4)
- `src/custom-skills/clickup-create-story/workflow.md` — `## Prerequisites` section updated with one sentence (AC #6)

**Deleted**

- (none)

## Change Log

| Date       | Change                                                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-22 | Story drafted from EPIC-2 bullet "Gate invocation to users whose ClickUp token has create-task permission". Status → ready-for-dev. |
