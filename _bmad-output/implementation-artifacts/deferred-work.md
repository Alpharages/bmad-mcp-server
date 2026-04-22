## Deferred from: code review of 2-1-scaffold-clickup-create-story-skill (2026-04-22)

- `src/custom-skills/` not on BMAD discovery path in `resource-loader.ts` — `findBmmSkillsRoot` only looks for `src/bmm-skills`/`bmm-skills`; `custom-skills/` is invisible to the engine until story 2.7 wires it via `customize.toml`. Story 2.7 investigation scope.
- `loadBmmSkillContent` does not surface `steps/*.md` files — only concatenates `SKILL.md` + `workflow.md`; step files added by stories 2.2–2.6 will not be loaded by the BMAD resource system. Story 2.7 investigation scope.
- SKILL.md description line exceeds 80-char Prettier print width — Prettier does not reformat YAML frontmatter in `.md` files so this won't auto-fix; worth addressing when the description is next edited.
