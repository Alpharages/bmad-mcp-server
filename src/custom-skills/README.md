# Custom Skills Layer

This directory (`src/custom-skills/`) is the designated extension boundary for project-specific BMAD skill customizations. Per PRD §Customization boundary, upstream BMAD skills are treated as read-only — they are owned by the BMAD-METHOD repo and overwriting them would be lost on the next update. Any modifications or new skills specific to this server project live here instead.

Wiring is per-agent via `customize.toml` — see story 2-7 when adding or moving a skill entry.
