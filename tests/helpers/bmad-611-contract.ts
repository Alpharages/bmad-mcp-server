/**
 * The BMAD 6.11 upstream contract this repository depends on.
 *
 * Every marker below is something a custom `bmad-clickup-*` workflow relies on
 * when it delegates upstream. Declaring them in one place means the offline
 * fixture check (`tests/unit/upstream-compat.test.ts`) and the opt-in live
 * check (`tests/integration/upstream-live-compat.test.ts`) assert exactly the
 * same thing — so when upstream moves, the live job names the specific
 * contract that broke.
 *
 * Each marker's `why` explains which custom instruction breaks if it
 * disappears, so a failure is actionable without archaeology.
 */

export interface ContractMarker {
  /** Human-readable name of the contract element. */
  readonly name: string;
  /** Pattern that must match somewhere in the skill's loaded content. */
  readonly pattern: RegExp;
  /** What in this repository breaks when the marker disappears. */
  readonly why: string;
}

export interface SkillContract {
  /** Canonical upstream workflow ID. */
  readonly skill: string;
  /** Which custom workflow delegates to it. */
  readonly consumer: string;
  /** Files that must be present in a single workflow read. */
  readonly requiredFiles: readonly string[];
  readonly markers: readonly ContractMarker[];
}

const BUILD: SkillContract = {
  skill: 'bmad-build',
  consumer: 'bmad-clickup-dev-implement',
  requiredFiles: [
    'workflow.md',
    'customize.toml',
    'step-01-clarify-and-route.md',
    'step-02-plan.md',
    'step-03-implement.md',
    'step-04-review.md',
    'step-05-present.md',
    'spec-template.md',
    'sync-sprint-status.md',
    'compile-epic-context.md',
  ],
  markers: [
    {
      name: 'explicit-argument intent branch',
      pattern: /Explicit argument/i,
      why: 'step-04-implementation-loop.md hands the ClickUp task over as an explicit intent so bmad-build resolves on the first intent-check branch instead of scanning for specs to resume.',
    },
    {
      name: 'freeform (non-epic-story) routing path',
      pattern: /Freeform path/i,
      why: 'step-04-implementation-loop.md tells bmad-build to use the freeform path unless the ClickUp task clearly maps to a BMAD epic/story number.',
    },
    {
      name: 'spec_file runtime variable',
      pattern: /spec_file/,
      why: 'step-04-implementation-loop.md lets bmad-build own its implementation spec rather than suppressing it.',
    },
    {
      name: 'story_key gates the sprint-status sync',
      pattern: /story_key/,
      why: 'step-04-implementation-loop.md leaves story_key unset so sync-sprint-status returns without writing — this is how deprecated v6 sprint-file writes are suppressed.',
    },
    {
      name: 'sync-sprint-status skip precondition',
      pattern: /Skip this entire file[\s\S]{0,200}story_key.{0,20}is unset/i,
      why: 'The suppression in step-04-implementation-loop.md is only sound while an unset story_key still short-circuits the sprint sync.',
    },
    {
      name: 'never auto-push',
      pattern: /NEVER auto-push/i,
      why: 'bmad-clickup-dev-implement relies on upstream not pushing; the outer workflow owns PR handling.',
    },
  ],
};

const SPEC: SkillContract = {
  skill: 'bmad-spec',
  consumer: 'bmad-clickup-create-story',
  requiredFiles: [
    'customize.toml',
    'assets/headless-schemas.md',
    'assets/spec-template.md',
    'assets/stories-schema.md',
  ],
  markers: [
    {
      name: 'headless mode detection',
      pattern: /\bHeadless\b/,
      why: 'step-04-description-composer.md invokes bmad-spec headlessly for ad hoc story intent; without headless mode it would stop to interview the user.',
    },
    {
      name: 'headless success JSON shape',
      pattern: /"status":\s*"complete"[\s\S]{0,400}"files"/,
      why: 'step-04-description-composer.md reads back the artifact paths from the headless response `files` array.',
    },
    {
      name: 'insufficient_intent error code',
      pattern: /insufficient_intent/,
      why: 'step-04-description-composer.md stops with an actionable message on this code instead of inventing a story.',
    },
    {
      name: 'missing_slug error code',
      pattern: /missing_slug/,
      why: 'step-04-description-composer.md retries once with an explicit slug on this code.',
    },
    {
      name: 'SPEC.md kernel and companions',
      pattern: /SPEC\.md[\s\S]{0,2000}companions:/,
      why: 'step-04-description-composer.md reads SPEC.md plus every path in its `companions:` frontmatter as story context.',
    },
    {
      name: 'stories.yaml Story Breakdown output',
      pattern: /stories\.yaml/,
      why: 'step-04-description-composer.md matches the requested story title against stories.yaml entries before falling back to ad hoc distillation.',
    },
    {
      name: 'stories/<id>-*.md spec filename convention',
      pattern: /stories\/\{?[a-z_]*id\}?-\*?\.md|stories\/<id>-/i,
      why: 'step-04-description-composer.md reads the authored story spec at stories/<id>-*.md and treats multiple matches as ambiguous.',
    },
    {
      name: 'stories.yaml required id/title/description fields',
      pattern: /`id`[\s\S]{0,600}`title`[\s\S]{0,600}`description`/,
      why: 'step-04-description-composer.md matches the story title against each entry’s `title` and `description`.',
    },
  ],
};

const CODE_REVIEW: SkillContract = {
  skill: 'bmad-code-review',
  consumer: 'bmad-clickup-code-review',
  requiredFiles: [
    'customize.toml',
    'steps/step-01-gather-context.md',
    'steps/step-02-review.md',
    'steps/step-03-triage.md',
    'steps/step-04-present.md',
    'review-prompts/edge-case-hunter.md',
    'review-prompts/verification-gap.md',
  ],
  markers: [
    {
      name: 'decision_needed triage bucket',
      pattern: /decision_needed/,
      why: 'step-04-review-execution.md routes High/Medium decision_needed findings to changes_requested.',
    },
    {
      name: 'patch triage bucket',
      pattern: /\*\*patch\*\*/,
      why: 'step-04-review-execution.md routes High/Medium patch findings to changes_requested.',
    },
    {
      name: 'defer triage bucket',
      pattern: /\*\*defer\*\*/,
      why: 'step-04-review-execution.md treats defer entries as pre-existing, not blockers for the change under review.',
    },
    {
      name: 'low/medium/high severity vocabulary',
      pattern: /`low`[\s\S]{0,400}`medium`[\s\S]{0,400}`high`/,
      why: 'The verdict matrix in step-04-review-execution.md keys on upstream-assigned severities rather than re-deriving them.',
    },
    {
      name: 'keep-or-dismiss verification discipline',
      pattern: /Keep or dismiss/i,
      why: 'step-04-review-execution.md records dismissed findings with their disposal reasons as review evidence.',
    },
    {
      name: 'failed_layers reporting',
      pattern: /failed_layers/,
      why: 'step-04-review-execution.md turns a clean result from a partially failed review into inconclusive rather than approved.',
    },
    {
      name: 'verification-gap review layer',
      pattern: /verification[- ]gap/i,
      why: 'step-04-review-execution.md captures verification gaps separately and renders them in the ClickUp comment.',
    },
    {
      name: 'present stage is the writing stage',
      pattern: /Present and Act/i,
      why: 'The report-only contract depends on this being the ONLY stage that applies patches and writes findings, so bmad-clickup-code-review can safely stop before it.',
    },
    {
      name: 'present stage writes to the spec file',
      pattern: /Write findings to the story file/i,
      why: 'Confirms the read-only invariant is enforced by not running the present stage, and by passing no spec_file.',
    },
    {
      name: 'present stage writes deferred work',
      pattern: /deferred_work_file/,
      why: 'Another write the report-only contract must avoid by not running the present stage.',
    },
  ],
};

export const BMAD_611_CONTRACTS: readonly SkillContract[] = [
  BUILD,
  SPEC,
  CODE_REVIEW,
];

/** Upstream IDs that were removed in the BMAD 6.11 migration. */
export const DEPRECATED_UPSTREAM_IDS = [
  'bmad-create-story',
  'bmad-dev-story',
] as const;
