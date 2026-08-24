# BMAD 6.11 Custom Workflow Compatibility Migration Plan

- **Status:** Proposed
- **Prepared:** 2026-08-19
- **Updated:** 2026-08-20
- **Repository:** `bmad-mcp-server`
- **Migration:** Clean cutover to BMAD Method 6.11
- **Compatibility policy:** BMAD 6.11 only; no backward compatibility

## 1. Purpose

This plan defines a behavior-preserving migration of the repository's six
ClickUp workflows to BMAD Method 6.11. The BMAD engine, skill structure,
templates, and upstream workflow calls will move to 6.11, but the customer
journey and business capabilities must remain unchanged. BMAD 6.8 workflow
IDs, artifact formats, and shims will not be supported after the migration.

The migration covers:

- BMAD skill naming and discovery;
- named-agent ownership and menu routing;
- replacement of deprecated implementation and story workflows;
- BMAD 6.11 code-review behavior;
- complete loading of upstream skill support files;
- removal of legacy workflow IDs and routes;
- offline compatibility tests, documentation, and rollout.

This plan does not authorize production ClickUp writes or implementation by
itself. Those actions require a separate implementation run.

## 2. Source References

This plan is based on the current BMAD documentation:

- [Agents reference](https://docs.bmad-method.org/reference/agents/)
- [Workflow map](https://docs.bmad-method.org/reference/workflow-map/)
- [Named agents](https://docs.bmad-method.org/explanation/named-agents/)

Relevant conclusions from those references:

- John, the Product Manager, owns planning, epics, and stories.
- Amelia, the Developer, owns build, test generation, code review, sprint
  planning, and retrospective workflows.
- Official Developer triggers are `BD`, `QA`, `CR`, `SP`, and `ER`.
- Every implementation path converges on `bmad-build`.
- `bmad-spec` is the canonical writer of `SPEC.md` and may produce
  `stories.yaml`.
- Named-agent behavior is composed from an installed skill, an agent skill,
  and `_bmad/custom/*.toml` customization.

## 3. Current-State Findings

### 3.1 Version change

The cached BMAD source previously identified itself as version 6.8.0. It now
identifies itself as version 6.11.0.

### 3.2 Custom workflows

The repository contains these workflows under `src/custom-skills/`:

| Workflow                | Steps | Current condition                                     |
| ----------------------- | ----: | ----------------------------------------------------- |
| `clickup-create-epic`   |     5 | Loads, but assumes legacy planning artifact shapes    |
| `clickup-create-story`  |     5 | Depends on deprecated `bmad-create-story` behavior    |
| `clickup-create-bug`    |     5 | Mostly independent of upstream BMAD workflows         |
| `clickup-dev-implement` |    10 | Depends on deprecated `bmad-dev-story` behavior       |
| `clickup-code-review`   |     7 | Output and mutation contract conflicts with BMAD 6.11 |
| `clickup-qa`            |     8 | Loads, but is not equivalent to official BMAD `QA`    |

All current relative Markdown links resolve, and the MCP runtime can list and
read the workflows. Runtime readability alone does not establish BMAD 6.11
compatibility.

### 3.3 Naming incompatibility

The BMAD 6.11 validator expects BMAD skill names to use the `bmad-` prefix.
All six current `clickup-*` names fail that convention.

### 3.4 Removed upstream dependencies

`bmad-create-story` and `bmad-dev-story` are compatibility shims rather than
current BMAD 6.11 implementation paths. The migration removes them completely
from custom workflow execution, tests, and documentation.

### 3.5 Code-review incompatibility

The custom code-review wrapper expects a binary `approved` or
`changes_requested` verdict and searches for old-style blocking findings.
BMAD 6.11 uses finding actions such as `decision_needed`, `patch`, and
`defer`, adds verification-gap analysis, and may apply patches.

The custom workflow promises read-only review. Delegating unrestricted
execution to the current upstream review workflow violates that promise and
can also produce a false approval when the expected old output sections are
absent.

### 3.6 Incomplete upstream workflow payload

`ResourceLoaderGit.loadBmmSkillContent` currently concatenates only:

- `SKILL.md`;
- `workflow.md`;
- `steps/*.md`.

BMAD 6.11 skills can also require `customize.toml`, checklists, templates,
input-discovery files, reviewer prompts, and reference documents. These files
exist as resources but are missing from the single workflow payload used by
MCP execution.

### 3.7 Named-agent routing

The current Developer customization routes only story creation,
implementation, and bug creation. Custom code review, QA, and epic creation
have no named-agent routes.

Custom ClickUp workflows must not replace official menu semantics. In
particular:

- official `BD` must continue to mean `bmad-build`;
- official `CR` must continue to mean `bmad-code-review`;
- official `QA` must continue to mean test generation.

### 3.8 Environmental blockers

- The workspace volume has insufficient free space; Vitest currently fails
  with `ENOSPC`.
- The GitNexus index is incomplete and warns that FTS indexes are missing.
- GitNexus currently reports LOW/zero impact for shared workflow-loading
  methods, but manual tracing shows that they are used by the common
  workflow read/execute path.

The shared loader change must therefore be treated as high logical risk until
the index is repaired and impact analysis is repeated.

## 4. Migration Goals

The migration is complete when:

1. All canonical custom skills satisfy BMAD 6.11 naming and structure rules.
2. Only canonical `bmad-clickup-*` workflow IDs are exposed and accepted.
3. No active custom workflow depends on `bmad-create-story` or
   `bmad-dev-story`.
4. Implementation delegates to `bmad-build`.
5. Code review remains strictly read-only and understands BMAD 6.11 finding
   actions.
6. Complete upstream text skill packages are available through one MCP read.
7. Official named-agent triggers retain their documented meanings.
8. All custom workflows have suitable named-agent routes.
9. Compatibility tests run offline and never silently skip.
10. ClickUp writes remain explicit, controlled, and idempotent.

### 4.1 Non-negotiable functional contract

The migration must preserve these existing capabilities end to end:

| Customer action  | Required behavior after migration                                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create an epic   | Read BMAD 6.11 planning artifacts, render the established ClickUp epic template, and create the epic in the configured Backlog list                                                |
| Create a story   | Use BMAD 6.11 planning/spec context to produce the same structured ClickUp story with BDD acceptance criteria, tasks, development notes, and QA notes                              |
| Create a bug     | Convert a free-form bug report into the same structured ClickUp bug template and create it in the configured list                                                                  |
| Develop a ticket | Accept a ClickUp task ID, load its complete context, implement it through BMAD 6.11, run checks, create or update the PR, post progress, and move the task to review               |
| Review code      | Review the task's implementation against its ClickUp/BMAD requirements, post one structured review report, and transition the task according to the verdict without modifying code |
| Run QA           | Execute code-access and visual QA, post one QA report, and transition the task according to the QA verdict without modifying source or tests                                       |

Behavior-preservation rules:

- The same user inputs must remain sufficient; users must not manually create
  intermediate BMAD files that the current workflow creates or derives for
  them.
- Existing ClickUp description templates and required sections must remain
  semantically equivalent. Field wording may change only where BMAD 6.11
  requires it.
- Existing permission gates, clarification behavior, progress comments,
  status transitions, PR handling, and Lore integration remain in place.
- A migration is not complete if a workflow merely loads successfully but no
  longer completes its ClickUp business outcome.
- Internal upstream substitutions such as `bmad-dev-story` to `bmad-build`
  must be invisible to the user apart from improved BMAD 6.11 behavior.

## 5. Non-Goals

The migration will not:

- fork or edit upstream BMAD source;
- introduce a new workflow framework or dependency;
- replace ClickUp as the delivery/status system of record;
- duplicate canonical workflow sources into committed generated directories;
- retain BMAD 6.8 workflow IDs, artifact formats, or shims; existing custom
  customer triggers are preserved against the new canonical skills;
- remove or redesign the existing ClickUp ticket, development, review, or QA
  journeys;
- require customers to perform new manual conversion steps between BMAD and
  ClickUp;
- run destructive or production ClickUp tests without explicit authorization;
- override official BMAD agent trigger meanings;
- add speculative configuration that no runtime path consumes.

## 6. Design Decisions

### 6.1 Canonical names and clean cutover

Use these canonical IDs:

| Removed ID              | BMAD 6.11 ID                 |
| ----------------------- | ---------------------------- |
| `clickup-create-epic`   | `bmad-clickup-create-epic`   |
| `clickup-create-story`  | `bmad-clickup-create-story`  |
| `clickup-create-bug`    | `bmad-clickup-create-bug`    |
| `clickup-dev-implement` | `bmad-clickup-dev-implement` |
| `clickup-code-review`   | `bmad-clickup-code-review`   |
| `clickup-qa`            | `bmad-clickup-qa`            |

Cutover policy:

- Rename each source directory and its frontmatter together.
- Update every caller, menu entry, test, fixture, and document in the same
  migration.
- Return only canonical IDs from workflow discovery.
- Reject removed `clickup-*` IDs as unknown workflows.
- Do not add aliases, redirects, wrappers, or duplicate workflow directories.
- Support BMAD 6.11 contracts only.

### 6.2 Systems of record

- BMAD planning/spec artifacts own product intent and implementation context.
- ClickUp owns task identity, delivery status, review/QA reports, and team
  discussion.
- Git owns code and review evidence.
- Custom adapters may translate between these systems but must not create a
  second competing status model.
- Existing ClickUp templates are output contracts, not implementation details;
  the BMAD 6.11 migration must continue producing their required sections.

### 6.3 Review safety

The ClickUp code-review workflow remains report-only. It must never apply
patches, update source or tests, stage files, commit, stash, or update BMAD
story/sprint/deferred-action files.

### 6.4 Minimal implementation

- Reuse the existing loader, agent customization, and test patterns.
- Add no dependency.
- Keep one source tree under `src/custom-skills/`.
- Remove old IDs instead of adding an alias or compatibility layer.
- Add only tests that protect the new compatibility contracts.

## 7. Implementation Phases

### Phase 0: Restore a reliable baseline

#### Tasks

- [ ] Free at least 1–2 GB on the workspace volume.
- [ ] Run the existing unit and build commands and record current failures.
- [ ] Run GitNexus with the repository's supported Node version.
- [ ] Repair or rebuild the GitNexus FTS and relationship indexes.
- [ ] Run upstream impact analysis for:
  - `ResourceLoaderGit.loadBmmSkillContent`;
  - `ResourceLoaderGit.loadWorkflow`;
  - workflow discovery/listing methods;
  - `getWorkflowExecutionPrompt`.
- [ ] Review all depth-1 dependents and affected execution processes.
- [ ] Warn before implementation if repaired analysis reports HIGH or
      CRITICAL risk.

#### Exit criteria

- Tests can create temporary files.
- The current baseline is documented.
- GitNexus returns usable callers and execution flows.
- The expected blast radius is agreed before shared loader edits.

### Phase 1: Load complete BMAD skill packages

#### Files

- `src/core/resource-loader.ts`
- `src/config.ts`
- `tests/unit/lite-resource-loader.test.ts`
- `tests/unit/config.test.ts`

#### Tasks

- [ ] Update `loadBmmSkillContent` to recursively enumerate supported text
      files beneath the selected skill directory.
- [ ] Support `.md`, `.toml`, `.yaml`, `.yml`, `.json`, and `.txt`.
- [ ] Read `SKILL.md` first and exclude it from the recursive pass.
- [ ] Sort relative paths for deterministic output.
- [ ] Add a stable `=== ./relative/path ===` marker before each file.
- [ ] Ignore binary files, hidden directories, and symlinks.
- [ ] Preserve the single-read execution contract.
- [ ] Update the fallback execution prompt to say that the complete text
      skill package is inlined.
- [ ] Remove wording that only promises workflow and step files.

#### Tests

- [ ] Nested prompts and references are included.
- [ ] `customize.toml`, templates, and checklists are included.
- [ ] `SKILL.md` is included once.
- [ ] Files are emitted in deterministic order.
- [ ] Hidden, binary, and unrelated files are excluded.
- [ ] Existing custom workflow reads still work.
- [ ] Current upstream `bmad-build`, `bmad-spec`, and
      `bmad-code-review` payloads contain their required text files.

#### Exit criteria

- One MCP workflow read contains the complete executable text package.
- Existing workflow listing and reading behavior has not regressed.

### Phase 2: Replace old workflow IDs with canonical names

#### Files

- `src/core/resource-loader.ts`
- `src/custom-skills/*`
- loader and workflow discovery tests

#### Tasks

- [ ] Rename the six workflow directories to their canonical
      `bmad-clickup-*` names.
- [ ] Update `name` frontmatter in every `SKILL.md`.
- [ ] Update self-references, cross-workflow references, generated comment
      signatures, documentation links, and tests.
- [ ] Update all MCP examples and internal callers to canonical IDs.
- [ ] Remove every old workflow ID from runtime lookup and discovery.
- [ ] Ensure project/user/git source precedence is unchanged.
- [ ] Keep workflow discovery canonical-only to avoid duplicate menu entries.

#### Tests

- [ ] All six canonical names list, read, and execute successfully.
- [ ] All six removed names return the normal unknown-workflow error.
- [ ] Listing contains no removed or duplicate entries.
- [ ] Frontmatter name equals directory name.

#### Exit criteria

- BMAD 6.11 naming validation passes.
- All repository callers use BMAD 6.11 canonical IDs.
- Removed IDs are not accepted by the runtime.

### Phase 3: Migrate workflow behavior

#### 3.1 `bmad-clickup-create-epic`

Tasks:

- [ ] Preserve existing ClickUp epic creation and permission gates.
- [ ] Preserve the existing epic selection and creation user journey.
- [ ] Support an explicitly configured epics path first.
- [ ] Support BMAD 6.11 epic files from the planning-artifacts directory.
- [ ] Require user selection when several epics match.
- [ ] Publish an already planned epic; do not reproduce upstream planning.
- [ ] Correct inconsistent final-step wording.

Acceptance:

- A BMAD 6.11 epic artifact produces the expected ClickUp epic description
  contract.
- Exactly one ClickUp task is created.
- The created task retains the current epic template sections and parent-level
  ClickUp behavior.

#### 3.2 `bmad-clickup-create-story`

Tasks:

- [ ] Remove active calls and references to `bmad-create-story`.
- [ ] Preserve the current epic picker, sprint picker, story intent, and task
      creation user journey.
- [ ] Read or derive the selected story from BMAD 6.11 epic/story planning and
      specification output.
- [ ] Preserve title, description, acceptance criteria, implementation tasks,
      dependencies, development notes, and QA notes.
- [ ] Format the selected story into the existing ClickUp description
      contract.
- [ ] When the current workflow accepts ad hoc story intent, invoke
      `bmad-spec` headlessly or use the corresponding BMAD 6.11 planning
      contract without requiring the user to run another workflow manually.
- [ ] Preserve the no-epic path when it is enabled by existing configuration.
- [ ] Correct inconsistent final-step wording.

Acceptance:

- No active file references `bmad-create-story`.
- A BMAD 6.11 planned story can be published without losing acceptance or QA
  context.
- The resulting ClickUp task retains the current BDD acceptance criteria,
  tasks/subtasks, development notes, and QA/testing sections.
- Existing story-creation inputs still complete the workflow without a new
  manual intermediate step.
- Missing or ambiguous story input never results in an invented task.

#### 3.3 `bmad-clickup-create-bug`

Tasks:

- [ ] Update naming and cross-references.
- [ ] Preserve optional planning context.
- [ ] Preserve the write-mode permission gate.
- [ ] Preserve the structured reproduction/expected/actual/impact format.
- [ ] Ensure retry behavior cannot create duplicate tasks.

Acceptance:

- The workflow creates exactly one structured bug task.
- Missing planning artifacts warn but do not block bug creation.
- The resulting ticket keeps the current reproduction, expected, actual, and
  impact template.

#### 3.4 `bmad-clickup-dev-implement`

Tasks:

- [ ] Remove active calls and references to `bmad-dev-story`.
- [ ] Pass the ClickUp task description, task URL, parent epic context,
      planning paths, architecture context, and review-continuation comments to
      `bmad-build`.
- [ ] Treat the ClickUp task as a planned-story or issue entry to
      `bmad-build`.
- [ ] Allow `bmad-build` to create its required implementation spec.
- [ ] Prevent deprecated story/sprint file update behavior.
- [ ] Preserve clarification, assumption, progress, PR, and cross-story
      context behavior.
- [ ] Keep ClickUp status transition and final reporting in the outer custom
      workflow.

Acceptance:

- No active file references `bmad-dev-story`.
- Implementation enters through `bmad-build`.
- A review-continuation task passes prior requested changes into the build.
- ClickUp receives at most the intended comments and one status transition.
- The workflow still creates or updates the pull request and moves successful
  work to the configured review status.

#### 3.5 `bmad-clickup-code-review`

Tasks:

- [ ] Remove assumptions about old `approved`/`changes_requested` upstream
      output.
- [ ] Use BMAD 6.11 finding actions: `decision_needed`, `patch`, `defer`, and
      dismissed/accepted findings.
- [ ] Include severity and verification-gap analysis.
- [ ] Keep the workflow report-only; do not run upstream patch/application
      stages.
- [ ] Produce a structured internal finding set before rendering a ClickUp
      comment.
- [ ] Add an `inconclusive` outcome for unavailable evidence or reviewer
      failure.
- [ ] Remove the fallback that can approve because a nonexistent blocking
      section was not found.

Verdict contract:

| Evidence                                           | Verdict               |
| -------------------------------------------------- | --------------------- |
| Unresolved High/Medium `patch` finding             | `changes_requested`   |
| Unresolved High/Medium `decision_needed`           | `changes_requested`   |
| Only Low findings or explicitly accepted deferrals | `approved` with notes |
| No findings and verification passed                | `approved`            |
| Diff, specification, or test evidence unavailable  | `inconclusive`        |
| Reviewer execution failed                          | `inconclusive`        |

For `inconclusive`, post the reason but do not perform an approval or
changes-requested status transition.

Acceptance:

- The workflow cannot modify repository or BMAD artifact state.
- A missing old-style section cannot cause approval.
- Each verdict-matrix row has a test.
- Exactly one review report is posted.
- Conclusive review outcomes continue mapping to the established ClickUp
  approved/changes-requested status flow.

#### 3.6 `bmad-clickup-qa`

Tasks:

- [ ] Preserve repository read-only behavior.
- [ ] Keep execution/visual QA distinct from official test-generation `QA`.
- [ ] Add `inconclusive` handling for unavailable browser or test evidence.
- [ ] Post exactly one QA report.
- [ ] Transition status exactly once only for conclusive pass/fail outcomes.
- [ ] Correct any inconsistent step-count or terminal-step wording.

Acceptance:

- The workflow never creates or edits tests or source files.
- Infrastructure failure cannot be reported as QA passed.
- The report and transition counts are deterministic.
- Conclusive pass/fail outcomes retain the established ClickUp QA report and
  status behavior.

### Phase 4: Preserve workflow entry points and add missing routes

#### Files

- `_bmad/custom/bmad-agent-dev.toml`
- `_bmad/custom/bmad-agent-pm.toml` (new)
- named-agent routing tests

#### Official routes to preserve

| Agent                  | Official triggers            |
| ---------------------- | ---------------------------- |
| John / Product Manager | `PRD`, `CE`, `IR`, `CC`      |
| Amelia / Developer     | `BD`, `QA`, `CR`, `SP`, `ER` |

#### Custom routes after migration

| Agent                  | Trigger | Canonical workflow           | Change                                |
| ---------------------- | ------- | ---------------------------- | ------------------------------------- |
| Amelia / Developer     | `CS`    | `bmad-clickup-create-story`  | Preserve existing entry point         |
| Amelia / Developer     | `DS`    | `bmad-clickup-dev-implement` | Preserve existing entry point         |
| Amelia / Developer     | `CB`    | `bmad-clickup-create-bug`    | Preserve existing entry point         |
| John / Product Manager | `CUE`   | `bmad-clickup-create-epic`   | Add missing epic publishing route     |
| Amelia / Developer     | `CUR`   | `bmad-clickup-code-review`   | Add missing ClickUp review route      |
| Amelia / Developer     | `CUQ`   | `bmad-clickup-qa`            | Add missing execution/visual QA route |

Tasks:

- [ ] Retarget existing `CS`, `DS`, and `CB` entries to canonical BMAD 6.11
      skill IDs without changing their user-facing triggers.
- [ ] Add the missing ClickUp epic, review, and execution/visual QA routes.
- [ ] Keep official routes unchanged.
- [ ] Update documented workflow IDs while preserving documented `CS`, `DS`,
      and `CB` invocations.
- [ ] Verify the merged agent menus through the actual runtime path.

Exit criteria:

- Existing customer menu entry points still invoke the same business
  capabilities.
- Official agent behavior is unchanged.
- Direct intent and menu-code dispatch both find the canonical skill.

### Phase 5: Package native BMAD skills

Tasks:

- [ ] Keep `src/custom-skills/` as the only maintained source tree.
- [ ] Package canonical skills through the supported BMAD custom-module
      installation path.
- [ ] Generate or copy skills into `.claude/skills/` or the selected IDE's
      equivalent during installation.
- [ ] Install committed team overrides into `_bmad/custom/`.
- [ ] Do not commit generated duplicate workflow trees.
- [ ] Test installation in a clean temporary project.
- [ ] Document MCP-only and native-install usage separately.

Exit criteria:

- A fresh installation exposes all six canonical skills.
- Named-agent dispatch works without relying on this repository's source
  layout.

### Phase 6: Add deterministic compatibility validation

#### Workflow structure test

Add one scanner test covering every custom workflow:

- [ ] Directory and frontmatter names match.
- [ ] Canonical names begin with `bmad-`.
- [ ] `workflow.md` exists.
- [ ] Relative links resolve.
- [ ] Steps are ordered and contiguous.
- [ ] The terminal step names the correct step number.
- [ ] Deprecated upstream workflow IDs are absent.

#### Offline upstream contract test

- [ ] Replace network-dependent compatibility checks with a small pinned
      BMAD 6.11 fixture.
- [ ] Verify the contracts used from `bmad-build`, `bmad-spec`, and
      `bmad-code-review`.
- [ ] Remove silent success when the remote cache is unavailable.
- [ ] Keep optional live-upstream checks in a separate CI job.

#### Behavioral tests

- [ ] Test canonical lookup and rejection of removed IDs.
- [ ] Test the code-review verdict matrix.
- [ ] Test read-only review and QA invariants.
- [ ] Test one-comment/one-transition guarantees.
- [ ] Test the BMAD 6.11 planning-artifact formats used by the current
      upstream workflows.
- [ ] Test named-agent menu merges and official trigger preservation.

Exit criteria:

- Unit and integration tests run without network access.
- A future upstream contract change produces an explicit failure.

### Phase 7: Documentation and release

#### Files

- `README.md`
- `src/custom-skills/README.md`
- `docs/clickup-quickstart.md`
- `docs/api-contracts.md`
- release notes/changelog used by the repository

#### Tasks

- [ ] Document BMAD 6.11 as the supported upstream contract.
- [ ] List canonical IDs and state that old IDs were removed.
- [ ] Document the preserved `CS`, `DS`, and `CB` triggers and the added epic,
      review, and QA triggers.
- [ ] Explain official `QA` versus custom `CUQ`.
- [ ] Explain `bmad-build` implementation delegation.
- [ ] Document code-review read-only and `inconclusive` behavior.
- [ ] Document MCP-only versus native skill installation.
- [ ] Publish the clean-cutover technical breaking changes and explicitly
      state that customer workflow capabilities are unchanged.

#### Rollout

1. Release loader completeness and tests first.
2. Replace old workflow IDs with canonical IDs.
3. Release migrated workflow behavior and agent routing.
4. Run an MCP list/read/execute smoke test.
5. Run a dry-run or mocked ClickUp integration test.
6. With explicit authorization, run a canary against disposable ClickUp
   tasks.
7. Monitor duplicate writes, incorrect transitions, removed-ID calls, and
   upstream contract failures.

#### Rollback

- Revert the relevant migration commit rather than editing upstream BMAD.
- Roll back the complete release if downstream callers were not migrated.
- Disable only the affected custom agent menu item if a workflow is unsafe.
- Never roll back by restoring deprecated upstream workflows as permanent
  dependencies.

## 8. Proposed Commit Sequence

1. `test: add bmad 6.11 compatibility fixtures`
2. `fix: load complete bmad skill packages`
3. `refactor: replace clickup workflow ids`
4. `refactor: migrate implementation to bmad-build`
5. `fix: make clickup review bmad 6.11 aware`
6. `refactor: align story and epic artifact inputs`
7. `feat: align clickup workflows with named agents`
8. `docs: document bmad 6.11 migration`

Before each commit:

- run relevant tests;
- run formatting and type checking;
- run `gitnexus_detect_changes` for the intended scope;
- inspect unexpected changed symbols or processes;
- confirm that every depth-1 dependent was updated.

## 9. Risk Register

| Risk                                            | Level  | Mitigation                                                                  |
| ----------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| Shared loader regression affects every workflow | High   | Repair graph, repeat impact analysis, add broad read/list tests, ship first |
| Migration loads but breaks a business journey   | High   | Add end-to-end contracts for ticket creation, development, review, and QA   |
| Review unexpectedly changes code                | High   | Local report-only contract and explicit mutation-invariant tests            |
| Unmigrated clients call removed workflow IDs    | High   | Inventory and update all callers before cutover; fail clearly afterward     |
| Official agent codes change meaning             | High   | Add new custom codes; test official menu entries unchanged                  |
| BMAD upstream changes again                     | Medium | Offline pinned fixture plus separate live compatibility CI                  |
| Duplicate ClickUp writes on retry               | High   | Preserve permission gates and test exactly-once behavior                    |
| Ambiguous planning artifacts select wrong work  | Medium | Explicit path priority and user selection on ambiguity                      |
| Disk/index state hides regressions              | High   | Phase 0 blocks implementation until repaired                                |

## 10. Verification Matrix

| Area              | Required verification                                                              |
| ----------------- | ---------------------------------------------------------------------------------- |
| Skill structure   | Official BMAD 6.11 validation has no HIGH/CRITICAL findings                        |
| Discovery         | Six canonical workflows listed once                                                |
| Removed IDs       | Six old IDs fail clearly and are absent from discovery                             |
| Functional parity | All six customer journeys complete with their existing inputs and ClickUp outcomes |
| Loader            | Complete nested text package returned in deterministic order                       |
| Implementation    | `bmad-build` invoked; deprecated dev shim absent                                   |
| Story publishing  | BMAD 6.11 planned story is preserved in ClickUp                                    |
| Review            | Read-only; verdict matrix and verification gaps covered                            |
| QA                | Read-only; inconclusive infrastructure failures cannot pass                        |
| Agents            | Official triggers unchanged; all custom triggers dispatch                          |
| ClickUp           | Exactly one intended create/comment/transition operation                           |
| CI                | Unit and integration suites pass offline                                           |
| Impact            | GitNexus reports only expected symbols and processes                               |

## 11. Definition of Done

The migration is done only when all of the following are true:

- [ ] The six canonical workflows pass BMAD 6.11 validation.
- [ ] Only canonical IDs work through MCP.
- [ ] Existing `CS`, `DS`, and `CB` menu triggers still perform the same
      customer actions using canonical BMAD 6.11 skills.
- [ ] No active workflow references `bmad-create-story` or
      `bmad-dev-story`.
- [ ] Implementation uses `bmad-build`.
- [ ] Code review cannot modify repository or BMAD artifact state.
- [ ] Missing review evidence produces `inconclusive`, never approval.
- [ ] Official named-agent triggers retain their documented meanings.
- [ ] Every custom workflow has an appropriate agent route.
- [ ] One workflow read contains all required upstream text files.
- [ ] Tests run offline and do not silently skip.
- [ ] Build, unit, integration, and smoke checks pass.
- [ ] GitNexus change detection confirms the intended blast radius.
- [ ] An authorized disposable ClickUp canary completes without duplicate
      tasks, comments, or status transitions.
- [ ] The canary proves epic/story/bug creation, development-to-PR,
      code-review, and QA behavior remain functionally equivalent.

## 12. Implementation Approval Gate

Before starting code changes, confirm these defaults:

1. Canonical IDs use `bmad-clickup-*`; old IDs are removed without aliases.
2. Official BMAD menu codes remain unchanged.
3. Custom code review remains read-only.
4. ClickUp remains the delivery/status system of record.
5. Native skill installation is included in the compatibility target.
6. Customer functionality, ClickUp templates, and workflow journeys remain
   unchanged; only BMAD internals and skill IDs move to 6.11.

If any of these decisions changes, update this plan before implementation so
tests and rollout criteria continue to describe the intended behavior.
