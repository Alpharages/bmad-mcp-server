# EPIC-4: Non-ClickUp agent audit

> **Note:** Bootstrap file. Will migrate to ClickUp once EPIC-1 completes.
>
> **Context:** BMAD removed the SM agent, and Test Architect (TEA) is no longer in the public agent roster. Dev-agent story-creation and implementation flows are covered by EPIC-2 and EPIC-3, so this audit now covers the remaining non-Dev agents: PM, Analyst, Architect, UX Designer, and Tech Writer.

## Goal

Confirm — and where necessary, non-destructively patch — that PM (John), Analyst (Mary), Architect (Winston), UX Designer (Sally), and Tech Writer (Paige) agents touch only `planning-artifacts/` and `docs/`, never ClickUp or the removed `implementation-artifacts/`.

## Outcomes

- Audit report per agent listing: every path it writes to, every path it reads from, and any hard-coded reference to `implementation-artifacts/`, `stories/`, or file-based sprint state.
- Any legacy story/sprint touches patched via custom skills (non-destructive) or an upstream PR.
- Confirmation that epic decomposition no longer produces `epics/*.md` files (epics live in ClickUp only).

## Stories (to become ClickUp subtasks under this epic)

- Audit PM agent (John): confirm output paths; specifically audit the `EP` (Create Epics and Stories) skill — since humans own epics in ClickUp, PM must not write `epics/*.md` or `stories/*.md` files. Override via custom skill if it does.
- Audit Architect agent (Winston): confirm writes only to `planning-artifacts/architecture.md`
- Audit UX Designer agent (Sally): confirm writes only to `planning-artifacts/ux-design.md` or equivalent
- Audit Analyst agent (Mary): confirm research artifacts land in `docs/` or `planning-artifacts/`, not `implementation-artifacts/`
- Audit Tech Writer agent (Paige): confirm documentation output lands in `docs/` only, not `implementation-artifacts/`
- File custom-skill overrides or upstream PRs for any violations found

## Dependencies

None — parallelizable with EPIC-1, EPIC-2, EPIC-3.

## Exit criteria

- Written audit report committed under `planning-artifacts/`.
- All non-Dev agents verified ClickUp-free and `implementation-artifacts/`-free.
- Any remediation tracked as patches in `src/custom-skills/` or merged upstream PRs.
