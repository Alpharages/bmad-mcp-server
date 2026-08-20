# Pinned BMAD 6.11 upstream fixture

A verbatim, offline copy of the three upstream BMAD skills this repository's
custom ClickUp workflows delegate to. It exists so the compatibility tests in
`tests/unit/upstream-compat.test.ts` run deterministically with **no network
and no Git cache**, and never silently skip.

## Provenance

| Field       | Value                                      |
| ----------- | ------------------------------------------ |
| Repository  | `Alpharages/BMAD-METHOD`                   |
| Version     | `6.11.0` (`package.json`)                  |
| Commit      | `86beb06547dd28059a7ddba0b027fb449d88eedb` |
| Commit date | 2026-08-17                                 |
| Captured    | 2026-08-20                                 |

## Contents

Only the supported text files (`.md`, `.toml`, `.yaml`, `.yml`, `.json`,
`.txt`) beneath each skill directory were copied — the same set
`ResourceLoaderGit.loadBmmSkillContent` inlines.

```
src/bmm-skills/
├── module.yaml
├── plan/bmad-spec/           ← ad hoc story intent is distilled here (headless)
├── ship/bmad-build/          ← implementation entry point
└── ship/bmad-code-review/    ← review layers + triage
```

The directory layout mirrors upstream exactly (`src/bmm-skills/<group>/<skill>/`)
so `ResourceLoaderGit` discovers it through the normal bmm-skills path with no
special-casing.

## What the tests assert against it

`tests/unit/upstream-compat.test.ts` checks the specific contract markers the
custom workflows depend on — the triage buckets, the severity vocabulary, the
headless JSON error codes, the sprint-sync precondition, and so on. The
contract itself is declared once in
`tests/helpers/bmad-611-contract.ts` and is shared with the live check.

## Keeping it current

The fixture is deliberately frozen: it is the _pinned_ contract, so a
regression in this repository fails locally and offline. Upstream drift is
caught separately by `tests/integration/upstream-live-compat.test.ts`, which
runs against the real Git cache and is opt-in via `BMAD_LIVE_UPSTREAM=1`.

When that live check fails, the upstream contract has moved. Re-capture this
fixture from the new upstream, update the provenance table above, and update
`tests/helpers/bmad-611-contract.ts` plus the affected custom workflow
instructions in the same change.
