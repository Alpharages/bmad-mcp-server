# EPIC-5: Pilot + iterate

> **Note:** Bootstrap file. Will migrate to ClickUp once EPIC-1 completes.

## Goal

Run the full ClickUp-first BMAD flow on one real project and one real epic, capture friction, and lock the v1 workflow before broader team rollout.

## Outcomes

- One pilot project has PRD + architecture in `planning-artifacts/`.
- One epic exists in ClickUp Backlog for that project.
- Dev agent (story-creation mode) created at least 3 stories as ClickUp subtasks under that epic.
- Dev agent (implementation mode) completed at least 1 story end-to-end: fetched from ClickUp → implemented → PR linked in a ClickUp comment → status transitioned to In Review.
- Friction log captured and translated into prompt / template / config refinements.
- Team-facing workflow documented (how to invoke Dev in story-creation mode, how to invoke Dev in implementation mode, what goes where).

## Stories (to become ClickUp subtasks under this epic)

- Choose pilot project (small scope, low-risk, active)
- Seed pilot project's `planning-artifacts/PRD.md` and `architecture.md`
- Create pilot epic in ClickUp Backlog
- Dev (story-creation mode) creates pilot stories (at least 3) under the epic
- Dev (implementation mode) implements at least 1 pilot story end-to-end
- Capture friction log (what surprised / blocked / slowed the flow)
- Refine prompts / description template / config based on friction
- Write team-facing "how to use BMAD+ClickUp" quickstart
- Retro: decide go/no-go for broader rollout

## Dependencies

- EPIC-1, EPIC-2, EPIC-3 complete.
- EPIC-4 strongly recommended (to prevent surprise file writes during pilot).

## Exit criteria

- One story completed end-to-end in ClickUp with a linked PR and no story/sprint files created in the repo.
- Friction log and refinements merged.
- Go/no-go decision recorded.
