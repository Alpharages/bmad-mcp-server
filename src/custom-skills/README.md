# Custom Skills Layer

This directory (`src/custom-skills/`) is the designated extension boundary for project-specific BMAD skill customizations. Per PRD §Customization boundary, upstream BMAD skills are treated as read-only — they are owned by the BMAD-METHOD repo and overwriting them would be lost on the next update. Any modifications or new skills specific to this server project live here instead.

It is also the **only** maintained source tree for these skills. Nothing here is duplicated into a generated directory that is then committed.

## Supported upstream

**BMAD Method 6.11 only.** BMAD 6.8 workflow IDs, artifact formats, and compatibility shims are not supported. In particular, `bmad-create-story` and `bmad-dev-story` are BMAD v6 shims and are never invoked from this tree — `tests/unit/workflow-structure.test.ts` fails the build if one reappears in an invocation position.

## Canonical skill IDs

BMAD 6.11 requires BMAD skill names to carry the `bmad-` prefix. The six skills here were renamed in a clean cutover — no aliases, no redirects, no duplicate directories. The old IDs now fail with the normal unknown-workflow error:

| Removed ID              | Canonical BMAD 6.11 ID       |
| ----------------------- | ---------------------------- |
| `clickup-create-epic`   | `bmad-clickup-create-epic`   |
| `clickup-create-story`  | `bmad-clickup-create-story`  |
| `clickup-create-bug`    | `bmad-clickup-create-bug`    |
| `clickup-dev-implement` | `bmad-clickup-dev-implement` |
| `clickup-code-review`   | `bmad-clickup-code-review`   |
| `clickup-qa`            | `bmad-clickup-qa`            |

A skill's directory name and its `SKILL.md` frontmatter `name` must always match; the structure scanner enforces it.

## Upstream delegation

| Skill                        | Delegates to                     | Notes                                                                             |
| ---------------------------- | -------------------------------- | --------------------------------------------------------------------------------- |
| `bmad-clickup-create-epic`   | _(none)_                         | Publishes an epic that `bmad-create-epics-and-stories` or a human already planned |
| `bmad-clickup-create-story`  | `bmad-spec` (headless, fallback) | Prefers a story already planned in a spec folder or the epics artifact            |
| `bmad-clickup-create-bug`    | _(none)_                         | Parses the user's report directly, so bugs can be filed with no planning docs     |
| `bmad-clickup-dev-implement` | `bmad-build`                     | The single BMAD 6.11 implementation entry point                                   |
| `bmad-clickup-code-review`   | `bmad-code-review`               | Gather / review / triage stages only — never the present-and-act stage            |
| `bmad-clickup-qa`            | _(none)_                         | Runs the project's existing suite and drives a browser                            |

The exact upstream contracts these depend on are declared in `tests/helpers/bmad-611-contract.ts`, checked offline against the pinned fixture in `tests/fixtures/bmad-6.11/`, and checked against live upstream by the scheduled `upstream-compat.yml` CI job.

## Structural rules

Every skill in this directory must satisfy the following. `tests/unit/workflow-structure.test.ts` sweeps all of them, so a new skill is covered the moment it is added.

- A `SKILL.md` with a `bmad-` prefixed `name` equal to the directory name, plus a non-empty `description`.
- A `workflow.md`.
- Step files named `steps/step-NN-<slug>.md`, numbered contiguously from `01`.
- Each step file headed `# Step N: …` with `N` matching its filename.
- The terminal step number stated in `workflow.md` or the last step file, and correct.
- Every relative markdown link resolving.
- No removed `clickup-*` ID and no invocation of a deprecated upstream workflow.

## Safety contracts

Two skills make promises that nothing else enforces at runtime, so they are asserted in `tests/unit/workflow-behavior-contracts.test.ts`:

- **`bmad-clickup-code-review` is report-only.** It must never apply a patch, edit source or tests, stage, commit, stash, or write to any BMAD artifact (story files, `deferred-work.md`, `sprint-status.yaml`). Its only writes are one ClickUp comment and at most one status transition. It achieves this by running only the gather / review / triage stages of `bmad-code-review` and passing no `spec_file`.
- **`bmad-clickup-qa` never authors tests.** It runs the suite that exists and drives a browser; it never creates, modifies, or deletes a source or test file.

Both return `inconclusive` when evidence is unavailable, and an `inconclusive` outcome performs no ClickUp status write at all — missing evidence must never read as an approval or a pass.

## Loading

A single MCP workflow read returns the **complete text skill package**: `SKILL.md` first, then every other supported text file beneath the skill directory (`.md`, `.toml`, `.yaml`, `.yml`, `.json`, `.txt`) inlined in sorted relative-path order behind a `=== ./<path> ===` marker. Step files, templates, checklists and `customize.toml` are therefore reachable without a second call — they live inside the npm package or the Git cache, not under any BMAD root the client can see.

## Installing into another project

`scripts/install-skills.mjs` copies these packages into a target project's IDE
skill directory and installs the `_bmad/custom/` agent overrides alongside
them, so named-agent dispatch works without this repository's layout being
visible:

```bash
npm run install-skills -- /path/to/project            # .claude/skills/
npm run install-skills -- /path/to/project --ide cursor
npm run install-skills -- /path/to/project --dry-run
npm run install-skills -- /path/to/project --force    # update an install
```

The copies it produces are install output. They are never committed back here,
and the installer refuses to target this repository for exactly that reason.
`tests/integration/install-skills.integration.test.ts` runs the whole flow
against a fresh temp project on every integration run.

## Wiring

Agent routing is per-agent TOML under `_bmad/custom/`:

- `bmad-agent-dev.toml` — Amelia: `CS`, `DS`, `CB`, `CUR`, `CUQ`
- `bmad-agent-pm.toml` — John: `CUE`

`[[agent.menu]]` entries merge by `code`: a matching code replaces the upstream entry, a new code appends. Custom entries therefore **must not** reuse an official code — Amelia's `BD`, `QA`, `CR`, `SP`, `ER` or John's `PRD`, `CE`, `IR`, `CC`. `tests/unit/named-agent-routing.test.ts` fails if one is reused.

Per-skill configuration (pinned space / list / folder IDs, doc-path overrides) lives in `.bmadmcp/config.toml` at the project root, not here. See `.bmadmcp/config.example.toml` for the schema.
