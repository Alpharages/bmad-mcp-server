---
epic_description: ''
story_title: ''
story_entry: ''
story_source: ''
spec_folder: ''
task_description: ''
---

# Step 4: Description Composer (BMAD 6.11 planning + spec)

## RULES

- **Never call `bmad-create-story`.** It is a BMAD v6 compatibility shim, not a BMAD 6.11 planning path. It is not supported by this skill.
- **Prefer a story that is already planned.** BMAD 6.11 plans stories in the epics artifact (`bmad-create-epics-and-stories`) and in a spec folder's `stories.yaml` / `stories/<id>-*.md` (`bmad-spec` Story Breakdown). When the selected story already exists there, READ it — do not re-plan it.
- **Distil ad hoc intent through `bmad-spec`, headlessly.** When the user supplies story intent that is not already planned, invoke `bmad-spec` via the `bmad` tool (`execute` operation, workflow name `bmad-spec`) in headless mode to produce the specification context. The user MUST NOT be asked to run another workflow by hand first — this skill's existing inputs stay sufficient.
- **Content composition only.** This skill writes to ClickUp, never to `planning-artifacts/stories/` and never to `sprint-status.yaml`. `bmad-spec` owns its own spec folder — that is its normal, required output, not a side-effect to suppress.
- **Preserve the ClickUp description contract.** Whatever the source, the composed document MUST carry the sections listed under **Description contract** below. That contract is an output promise to the team, not an implementation detail.
- **No fabrication.** Never invent requirements with no basis in any available context. When planning docs are present, trace requirements to them. When they are absent, derive intent from available code context (`{fallback_code_context}`: README, source structure, git history, manifest) and the epic ClickUp task — do not guess at business requirements that cannot be inferred from any of these sources.
- **Never invent a task from missing or ambiguous input.** If several planned stories match, present them and let the user choose. If nothing matches and the user gave no usable intent, stop with an actionable message rather than composing a plausible-looking story.
- **Blocking.** MUST NOT continue to step 5 if `{task_description}` is empty at the end of this step.
- **No-epic override.** When `{epic_id}` is `''`, the composed description MUST NOT contain an "Epic:" or "Parent epic:" field or reference.

## Description contract

Every composed `{task_description}`, on every path, MUST contain:

1. **User story** — the `As a … I want … so that …` statement.
2. **Acceptance criteria** — BDD Given / When / Then, one group per criterion.
3. **Tasks / subtasks** — an ordered, checkable implementation list.
4. **Dependencies** — prerequisite stories, tickets, or external blockers; state "None" explicitly when there are none.
5. **Dev notes** — context-rich implementation guidance:
   - **Specific file paths** — exact source files, modules, or directories to create or modify (e.g. `src/services/auth.ts`, `tests/unit/auth.test.ts`).
   - **Implementation approach** — a concise exit solution: what to change, where to add new code vs. update existing code, and the expected code structure or pattern to follow.
   - **Architecture guardrails** — relevant patterns, conventions, or constraints from the architecture that MUST be followed, cited with file references where possible.
   - **Previous-story intelligence** — where prior stories in the same epic exist, reference established patterns, file naming conventions, or recently modified files to maintain continuity.
6. **`## QA / Testing Notes`** — aimed at the **AI QA agent that has code access**:
   - Test scenarios derived from each acceptance criterion (Given / When / Then).
   - Edge cases and boundary conditions to verify.
   - Regression risks — existing features or integrations that could be affected (cite files / modules where relevant).
   - Any test data, environment, or prerequisite setup QA needs.
   - Suggested test types (unit / integration / e2e) and the files where new tests should live.
7. **`## Human QA Notes`** — aimed at the **human QA tester who does NOT have code access**. Human QA tests the deployed ticket on the staging/dev environment *after* the developer deploys. Black-box only:
   - **Deployment prerequisite** — explicit note that the developer must deploy the change to staging/dev before QA can begin; the dev should comment the build / branch / commit on the ticket once deployed.
   - **Test environment** — staging or dev URL(s), feature flags to enable, test accounts/roles, seed data, or any environment-specific config the tester needs.
   - **Setup & preconditions** — the state the tester must place the app/account in before each scenario.
   - **Test steps (UI / API)** — black-box, click-by-click or request-by-request instructions using only the UI, deep links, or API endpoints. No code references, no file paths.
   - **Expected visible outcomes** — what the tester should observe per step (UI elements, response payloads, notifications, emails, redirects).
   - **Edge cases to try** — empty inputs, oversized inputs, invalid data, refresh mid-flow, slow network, back-button, double-submit.
   - **Cross-cutting checks** — browsers, devices, screen sizes, user roles, locales, permission combinations to spot-check.
   - **Regression areas (manual)** — adjacent screens or flows to click through to confirm nothing else broke.

Field wording may vary where BMAD 6.11 phrases something differently; the sections and their meaning may not.

## INSTRUCTIONS

### 1. Get story title

Ask: "What is the title for the new story? (This becomes the ClickUp task name.)"

Parse into `{story_title}`. If empty, re-ask. Accept optional follow-up: "Any additional scope notes? (Press Enter to skip.)" Store as `{scope_notes}` if non-empty.

### 2. Fetch epic from ClickUp

- When `{epic_id}` is non-empty: call `getTaskById` with `id: "{epic_id}"`. Extract the epic description text (strip metadata block and all `Comment by …` lines). Store as `{epic_description}`. If fetch fails, set `{epic_description}` = `''` and warn (non-fatal — continue).
- When `{epic_id}` is `''`: skip `getTaskById`. Set `{epic_description}` = `''`. Emit: `ℹ️ No epic parent — epic context will be empty in the story description.`

### 3. Resolve the story source

Work down this list and stop at the first source that yields exactly one story. Record which one succeeded in `{story_source}`.

**3a. Planned story in a BMAD 6.11 spec folder** (`story_source` = `spec-story`)

Look for spec folders under the project's spec output location (by default `{output_folder}/specs/spec-*/`; honour `[docs]` overrides from the doc-path cascade already resolved in step 1). For each folder that has a `stories.yaml`, read it and match `{story_title}` against each entry's `title` and `description`.

- Exactly one match → set `{spec_folder}`, set `{story_entry}` to that YAML entry. If `{spec_folder}/stories/<id>-*.md` exists for that entry's `id`, read it as the authored story spec (more than one file matching the id → treat as ambiguous). Also read the folder's `SPEC.md` and every path in its `companions:` frontmatter as supporting context.
- More than one match, across one or several spec folders → **ambiguous**: list every candidate as `<spec-folder> › <id> — <title>` and ask the user to pick one. Never choose for them.
- No match → continue to 3b.

**3b. Planned story in the epics artifact** (`story_source` = `epic-story`)

Read the epics artifact at the `epics_path` resolved by step 1's doc-path cascade (a file, or every `*.md` under it when the path is a directory). Match `{story_title}` against the story headings within the selected epic — or across all epics when `{epic_id}` is `''`.

- Exactly one match → set `{story_entry}` to that story's full section text.
- More than one match → **ambiguous**: list every candidate as `<epic> › <story heading>` and ask the user to pick one.
- No match → continue to 3c.

**3c. Ad hoc intent, distilled through `bmad-spec`** (`story_source` = `adhoc-spec`)

The user supplied intent (`{story_title}` plus any `{scope_notes}`) that is not planned anywhere yet. Do NOT ask them to go run a planning workflow. Invoke `bmad-spec` via the `bmad` tool (`execute` operation, workflow name `bmad-spec`) headlessly:

```
Mode: headless (programmatic caller — bmad-clickup-create-story; return the artifact paths)
Slug: {kebab-case of story_title}
Intent:
  Story title: {story_title}
  Scope notes: {scope_notes or (none)}
  Epic: {epic_name} ({epic_id})          ← omit both lines entirely when {epic_id} is ''
  Epic description: {epic_description}
Sources already loaded in conversation context (do not re-read):
  PRD: {if prd_available=true: '<resolved prd path>' | 'NOT AVAILABLE'}
  Architecture: {if arch_available=true: '<resolved architecture path>' | 'NOT AVAILABLE'}
  Epics: {epics_content — already loaded in step 1, or empty}
  Fallback code context: {fallback_code_context — present only when one or more planning docs were absent; empty otherwise}
```

Read the headless JSON response:

- `status: "complete"` → read every path in `files` (the `SPEC.md` kernel, its companions, and `.memlog.md`). Set `{story_entry}` to the distilled kernel plus companions, and `{spec_folder}` to the folder containing `SPEC.md`.
- `status: "blocked"` → do NOT compose anything. Surface the `error_code` and `reason` verbatim and stop:
  - `insufficient_intent` → `❌ Not enough detail to create this story. bmad-spec reported: <reason>. Add scope notes describing what should change and why, then re-run.`
  - `missing_slug` → re-invoke once with an explicit slug derived from `{story_title}`; if it blocks again, surface and stop.
- `bmad-spec` cannot be executed at all → surface the failure and stop. Do NOT fall back to `bmad-create-story` and do NOT compose an unsourced story.

**3d. Nothing usable**

If 3a–3c all fail to produce a story, stop with:

```
❌ No story to create.
   Searched: spec folders (stories.yaml), epics artifact, and bmad-spec distillation of your intent.
   Give a more specific title or add scope notes describing the change, then re-run.
```

Do not compose a plausible-looking story from the title alone.

### 4. Compose the ClickUp description

Compose `{task_description}` from `{story_entry}` (plus `SPEC.md`/companions when `{spec_folder}` is set), the epic context from instruction 2, and the planning context loaded in step 1, so that it satisfies every item of the **Description contract** above.

Composition rules:

- **Preserve, do not paraphrase away.** Title, description, acceptance criteria, implementation tasks, dependencies, dev notes and QA notes that the planned story or spec already carries transfer into the ClickUp document intact. Re-format them into the contract's section shape; do not drop or dilute them.
- **Fill only genuine gaps.** Where the source is silent on a contract section, derive it from the loaded planning docs, the epic description, and the architecture. An `open_questions[]` entry from `bmad-spec` is a gap to surface, not a gap to invent an answer for — carry it into the document under **Dependencies** or **Dev notes** as an open question.
- **Epic path** (`{epic_id}` non-empty): include the epic association and use the epic description as primary scope context.
- **No-epic path** (`{epic_id}` is `''`): include no "Epic:" or "Parent epic:" field anywhere. Epics content, when loaded, is general technical reference only — do not extract an epic-specific section.

**Missing-docs banner.** If `{prd_available}` = `false` OR `{arch_available}` = `false`, prepend the following notice block to `{task_description}` before the first heading so reviewers know which sources were used:

```
> ⚠️ **Planning docs partially absent** — this story was composed from available context only.
> Missing: {comma-separated list of absent docs, e.g. "PRD, Architecture doc"}
> Context used: {comma-separated list of fallback sources that were available, e.g. "README, source tree, git history"}
> Add the missing docs and regenerate for a richer description.
```

**Contract guardrail.** Before presenting, check `{task_description}` against the **Description contract** and repair anything missing:

- No concrete file-path references (`src/…`, `lib/…`, `tests/…`) or no exit solution → append a `## Implementation Notes` section before the footer with **Files to touch** (inferred from the architecture and acceptance criteria) and **Exit solution** (step-by-step: what to create, what to update, how to wire it).
- No heading matching `## QA / Testing Notes` (case-insensitive; accept `## QA Notes`, `## Testing Notes`, `## Test Cases`) → generate it from the story content per contract item 6 and append it before the footer line.
- No heading matching `## Human QA Notes` (case-insensitive; accept `## Manual QA Notes`, `## Human Testing Notes`) → generate it from the story content per contract item 7 and append it before the footer line. Lead with the deployment prerequisite: `> Developer must deploy this change to staging/dev before QA can begin. Comment the build / branch / commit ID on this ticket once the deploy is live.` Where nothing project-specific is known for the test environment, write "Same as staging defaults".
- No **Dependencies** section → append one, stating "None" when the sources identify no prerequisites.

If `{scope_notes}` is non-empty and not already reflected in the document, append a `## Scope Notes` section before the footer line.

### 5. Present for review

```
📝 **Proposed task description for "{story_title}"** (source: {story_source}):

---
{task_description}
---

Does this description look correct? [Y/n/edit]
```

- `Y` or Enter → proceed.
- `n` → ask "What would you like to change?", then re-run instruction 4 with the feedback against the same `{story_source}` and `{story_entry}`. When `{story_source}` = `adhoc-spec`, feed the change back through `bmad-spec` for the same slug so the spec folder and the ClickUp description stay in agreement. Re-present. Repeat until confirmed.
- `edit` → ask the user to paste the full revised description terminated by `---END---`. Parse as the new `{task_description}`.

### 6. Confirm

Emit `✅ Description set for story "{story_title}". Continuing to task creation…` and proceed to step 5.

## NEXT

Proceed to [step-05-create-task.md](./step-05-create-task.md) with `{story_title}`, `{task_description}`, `{epic_id}`, `{epic_name}`, `{sprint_list_id}`, and `{sprint_list_name}` available in step context.
