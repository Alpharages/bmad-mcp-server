# EPIC-6: Configurable doc-path resolution (cascade)

> **Note:** Bootstrap file. Will migrate to ClickUp once EPIC-1 completes.
>
> **Context:** The custom skills (`clickup-create-story`, `clickup-dev-implement`, `clickup-code-review`) hard-code `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md`. Pilot projects with different layouts (e.g., `docs/architecture/`, `specs/BRD.md`) hit a hard prereq failure with no override. This epic introduces a 3-layer per-key cascade so projects can place planning artifacts wherever their conventions require, without forking the skills.

## Goal

Replace hardcoded planning-artifact paths in the custom skills with a shared 3-layer cascade resolved by a TS helper, callable from any skill via a new `bmad` MCP operation.

## Cascade order (highest → lowest, per-key)

1. `.bmadmcp/config.toml` `[docs]` table — project escape hatch. Per-key keys: `prd_path`, `architecture_path`, `epics_path`, plus optional `planning_dir`.
2. BMAD official config — `_bmad/config.toml`, `_bmad/config.user.toml`, `_bmad/custom/config.toml`, `_bmad/custom/config.user.toml`. Key: `[bmm].planning_artifacts` (directory; resolver derives `<dir>/PRD.md` etc.).
3. Hardcoded default — `{project-root}/planning-artifacts/PRD.md` (current behaviour).

Resolution is per-key: if `.bmadmcp/config.toml` overrides only `prd_path`, architecture still resolves from BMAD or the default.

## Outcomes

- Shared TS helper `src/utils/doc-path-resolver.ts` exposing `resolveDocPaths(projectRoot)` returning paths + which layer each came from.
- Thin TOML loader `src/utils/toml-loader.ts` wrapping `smol-toml` (new dep).
- New `bmad` MCP operation `resolve-doc-paths` so LLM-driven skill prose can call the resolver via a single tool call instead of re-implementing the cascade in markdown.
- `clickup-create-story`, `clickup-dev-implement`, `clickup-code-review` migrated to consume the operation.
- Error blocks updated to list all 3 layers so users know where to set the override.
- `.bmadmcp/config.example.toml` documents the new `[docs]` table.
- `CLAUDE.md` documents the cascade.

## Stories (to become ClickUp subtasks under this epic)

- Add `smol-toml` to dependencies (deps-only PR, lands first)
- Implement `src/utils/toml-loader.ts` with malformed/missing handling + unit tests
- Implement `src/utils/doc-path-resolver.ts` with per-key cascade, BMAD 4-layer merge, `bmad/` vs `_bmad/` precedence + unit tests (default-only, BMAD-only, `.bmadmcp`-only, mixed per-key, malformed-skip)
- Add `resolve-doc-paths` operation to `src/tools/bmad-unified.ts` and `src/tools/operations/` + unit + integration tests
- Migrate `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md` to consume the new op; update error block
- Migrate `src/custom-skills/clickup-dev-implement/steps/step-03-planning-artifact-reader.md` to consume the new op
- Migrate `src/custom-skills/clickup-code-review/steps/step-03-code-reader.md` to consume the new op
- Update `CLAUDE.md`, `.bmadmcp/config.example.toml`, and per-skill `workflow.md` files to document the cascade

## Dependencies

- None (independent of EPIC-2/3; can land in parallel with EPIC-4).
- EPIC-7 (bug-shaped stories) and EPIC-8 (no-epic stories) build on the resolver but do not block this epic.

## Exit criteria

- A pilot project with `docs/architecture/overview.md` and `specs/PRD.md` can run `clickup-create-story` end-to-end after setting `[docs].architecture_path` and `[docs].prd_path` in `.bmadmcp/config.toml`.
- Default behaviour preserved: a project with no config files and a `planning-artifacts/` directory works exactly as before.
- BMAD-method config support verified against an upstream-shaped project that defines `[bmm].planning_artifacts`.
- All three migrated skills pass their existing integration tests with the new resolver in place.

## Open questions / decisions to resolve before coding

- TOML lib choice: `smol-toml` (recommended — small, ESM, maintained) vs `@iarna/toml` (CJS, unmaintained).
- Cascade order between `.bmadmcp/config.toml` and BMAD official: plan favours `.bmadmcp` first as escape hatch; product owner to confirm.
- `bmad/` vs `_bmad/` precedence: mirror `src/core/resource-loader.ts` (which prefers `bmad/`)?
- Whether `tech_spec_path` and `ux_design_path` get cascade keys this round or stay hardcoded.
