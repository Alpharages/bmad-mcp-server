/**
 * Behavioural contracts for the migrated BMAD 6.11 ClickUp workflows.
 *
 * The workflows are LLM instruction documents, so these are contract tests on
 * the instructions themselves: each asserts that a specific promise the
 * migration makes to users is actually written down where the executing model
 * will read it. They are the regression net for the guarantees that have no
 * other enforcement — read-only review and QA, the verdict matrix, and
 * exactly-once ClickUp writes.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const SKILLS_DIR = join(REPO_ROOT, 'src', 'custom-skills');

/** SKILL.md + workflow.md + every step file, concatenated. */
const wholeSkill = (skill: string): string => {
  const root = join(SKILLS_DIR, skill);
  const parts = [readFileSync(join(root, 'SKILL.md'), 'utf-8')];
  if (existsSync(join(root, 'workflow.md'))) {
    parts.push(readFileSync(join(root, 'workflow.md'), 'utf-8'));
  }
  const stepsDir = join(root, 'steps');
  if (existsSync(stepsDir)) {
    for (const f of readdirSync(stepsDir)
      .filter((f) => f.endsWith('.md'))
      .sort()) {
      parts.push(readFileSync(join(stepsDir, f), 'utf-8'));
    }
  }
  return parts.join('\n');
};

const step = (skill: string, file: string): string =>
  readFileSync(join(SKILLS_DIR, skill, 'steps', file), 'utf-8');

describe('bmad-clickup-code-review — verdict matrix', () => {
  const exec = step('bmad-clickup-code-review', 'step-04-review-execution.md');

  it('declares exactly three verdicts and no default', () => {
    expect(exec).toMatch(
      /MUST be exactly one of `approved`, `changes_requested`, or `inconclusive`/,
    );
    expect(exec).toMatch(/no default and no fallback to `approved`/);
  });

  // One row of the plan's verdict contract per case.
  const rows: Array<{ evidence: RegExp; verdict: string }> = [
    {
      evidence: /unresolved `patch` finding with severity `high` or `medium`/i,
      verdict: '`changes_requested`',
    },
    {
      evidence:
        /unresolved `decision_needed` finding with severity `high` or `medium`/i,
      verdict: '`changes_requested`',
    },
    {
      evidence: /Only `low`-severity findings remain.+accepted deferral/i,
      verdict: '`approved` with notes',
    },
    {
      evidence: /No findings remain and verification passed/i,
      verdict: '`approved`',
    },
    {
      evidence: /Evidence unavailable/i,
      verdict: '`inconclusive`',
    },
    {
      evidence: /Reviewer execution failed/i,
      verdict: '`inconclusive`',
    },
  ];

  it.each(rows)('maps "$evidence" to $verdict', ({ evidence, verdict }) => {
    const row = exec
      .split('\n')
      .find((line) => line.startsWith('|') && evidence.test(line));
    expect(row, `no matrix row matches ${evidence}`).toBeDefined();
    expect(row).toContain(verdict);
  });

  it('consumes BMAD 6.11 finding actions rather than a blocking binary', () => {
    for (const action of ['decision_needed', 'patch', 'defer', 'dismissed']) {
      expect(exec).toContain(action);
    }
    expect(exec).toMatch(
      /do not translate them into a blocking \/ non-blocking binary/i,
    );
  });

  it('includes severity and verification-gap analysis', () => {
    expect(exec).toMatch(/`high`, `medium`, or `low`/);
    expect(exec).toContain('{verification_gaps}');
    expect(exec).toMatch(/verification-gap layer/i);
  });

  it('has no rule that approves because a section was absent', () => {
    expect(exec).toMatch(
      /There is no rule that approves because an expected section was absent/i,
    );
    expect(exec).toMatch(/Absence of evidence is never approval/i);
  });

  it('builds the structured finding set before rendering a comment', () => {
    expect(exec).toMatch(
      /Build the structured finding set[\s\S]{0,200}BEFORE rendering any ClickUp comment/i,
    );
    expect(
      exec.indexOf('### 3. Build the structured finding set'),
    ).toBeLessThan(exec.indexOf('### 4. Determine the verdict'));
  });

  it('gives inconclusive a specific reason', () => {
    expect(exec).toContain('{review_inconclusive_reason}');
  });
});

describe('bmad-clickup-code-review — read-only invariant', () => {
  const all = wholeSkill('bmad-clickup-code-review');
  const exec = step('bmad-clickup-code-review', 'step-04-review-execution.md');
  const transition = step(
    'bmad-clickup-code-review',
    'step-06-status-transition.md',
  );

  it('forbids every mutating operation by name', () => {
    for (const forbidden of [
      'apply a patch',
      'edit source or tests',
      'stash',
      'sprint-status.yaml',
      'deferred-work.md',
    ]) {
      expect(
        exec,
        `the report-only contract must name "${forbidden}" explicitly`,
      ).toContain(forbidden);
    }
  });

  it('never runs the upstream present-and-act stage', () => {
    expect(exec).toMatch(/Do NOT run its present-and-act stage/i);
    expect(exec).toContain('step-04-present.md');
  });

  it('passes no spec file so upstream has nothing to write into', () => {
    expect(exec).toMatch(/Pass no `spec_file` path/);
  });

  it('states the invariant in the workflow overview too', () => {
    expect(all).toMatch(/## Read-only invariant/);
  });

  it('performs no ClickUp write at all when inconclusive', () => {
    expect(transition).toMatch(/Inconclusive short-circuit/i);
    expect(transition).toMatch(
      /Do NOT call `getListInfo` and do NOT call `updateTask`/,
    );
  });
});

describe('bmad-clickup-qa — read-only and inconclusive invariants', () => {
  const all = wholeSkill('bmad-clickup-qa');
  const codePass = step('bmad-clickup-qa', 'step-04-ai-qa-pass.md');
  const visualPass = step('bmad-clickup-qa', 'step-05-human-qa-pass.md');
  const report = step('bmad-clickup-qa', 'step-06-qa-report-poster.md');
  const transition = step('bmad-clickup-qa', 'step-07-status-transition.md');

  it('never creates or edits tests or source files', () => {
    expect(all).toMatch(/## Read-only invariant/);
    expect(codePass).toMatch(/Hard read-only on the repo/i);
    expect(codePass).toMatch(
      /MUST NOT create, modify, or delete any source file or test file/i,
    );
    expect(all).toMatch(
      /Authoring new tests (here was explicitly excluded|is explicitly out of scope)/i,
    );
  });

  it('cannot report a pass when the code pass verified nothing', () => {
    expect(codePass).toMatch(
      /`\{ai_qa_verdict\}` = `'inconclusive'`[\s\S]{0,300}every item is `BLOCKED`/,
    );
    expect(codePass).toMatch(/at least one item is `PASS`/);
  });

  it('cannot report a pass when the visual pass verified nothing', () => {
    expect(visualPass).toMatch(
      /`\{human_qa_verdict\}` = `'inconclusive'`[\s\S]{0,300}every one is `BLOCKED`/,
    );
    expect(visualPass).toMatch(/at least one scenario is `PASS`/);
  });

  it('aggregates to inconclusive as an explicit catch-all', () => {
    expect(report).toMatch(/Infrastructure failure is never a pass/i);
    expect(report).toMatch(/otherwise \(no pass and no fail on either side\)/i);
    expect(report).toContain('{qa_inconclusive_reason}');
  });

  it('keeps execution/visual QA distinct from official test generation', () => {
    expect(all).toContain('bmad-qa-generate-e2e-tests');
    expect(all).toMatch(
      /distinct from the official BMAD Developer `QA` trigger/i,
    );
  });

  it('performs no ClickUp status write when inconclusive', () => {
    expect(transition).toMatch(
      /Do NOT call `getListInfo` and do NOT call `updateTask`/,
    );
  });
});

describe('exactly-once ClickUp writes', () => {
  const cases = [
    {
      skill: 'bmad-clickup-code-review',
      comment: 'steps/step-05-review-comment-poster.md',
      transition: 'steps/step-06-status-transition.md',
    },
    {
      skill: 'bmad-clickup-qa',
      comment: 'steps/step-06-qa-report-poster.md',
      transition: 'steps/step-07-status-transition.md',
    },
  ];

  it.each(cases)(
    '$skill posts exactly one report comment',
    ({ skill, comment }) => {
      const body = readFileSync(join(SKILLS_DIR, skill, comment), 'utf-8');
      expect(body).toMatch(/(Exactly one comment|One comment per session)/i);
      expect(body).toMatch(/called exactly once|Post exactly one/i);
    },
  );

  it.each(cases)(
    '$skill transitions status at most once',
    ({ skill, transition }) => {
      const body = readFileSync(join(SKILLS_DIR, skill, transition), 'utf-8');
      expect(body).toMatch(/At most one transition per session/i);
      expect(body).toMatch(/`updateTask` is called at most once/i);
    },
  );

  it.each(cases)(
    '$skill never retries a ClickUp write',
    ({ skill, comment, transition }) => {
      for (const rel of [comment, transition]) {
        const body = readFileSync(join(SKILLS_DIR, skill, rel), 'utf-8');
        expect(body, `${skill}/${rel} must forbid retrying`).toMatch(
          /(Do NOT retry|Never retry|never retry)/,
        );
      }
    },
  );

  const creators = [
    'bmad-clickup-create-epic',
    'bmad-clickup-create-story',
    'bmad-clickup-create-bug',
  ];

  it.each(creators)(
    '%s calls createTask exactly once and checks for duplicates',
    (skill) => {
      const body = step(skill, 'step-05-create-task.md');
      expect(body).toMatch(
        /createTask.{0,80}(exactly once|once per skill execution)/is,
      );
      expect(body).toContain('searchTasks');
      expect(body).toMatch(/duplicate/i);
      expect(body).toMatch(/does not retry silently|MUST NOT retry|not retry/i);
    },
  );
});

describe('bmad-clickup-create-story — sourcing and ambiguity', () => {
  const composer = step(
    'bmad-clickup-create-story',
    'step-04-description-composer.md',
  );

  it('prefers an already-planned story over re-planning', () => {
    expect(composer).toMatch(/Prefer a story that is already planned/i);
    expect(composer).toContain('stories.yaml');
    expect(composer).toMatch(/epics artifact/i);
  });

  it('invokes bmad-spec headlessly without a manual intermediate step', () => {
    expect(composer).toMatch(/workflow name `bmad-spec`/);
    expect(composer).toMatch(
      /user MUST NOT be asked to run another workflow by hand/i,
    );
  });

  it('requires user selection on ambiguity', () => {
    expect(composer).toMatch(/ambiguous/i);
    expect(composer).toMatch(
      /Never choose for them|never resolve.{0,40}silently/i,
    );
  });

  it('never invents a task from missing input', () => {
    expect(composer).toMatch(
      /Never invent a task from missing or ambiguous input/i,
    );
    expect(composer).toMatch(/Do not compose a plausible-looking story/i);
    expect(composer).toContain('insufficient_intent');
  });

  it('preserves the full ClickUp description contract', () => {
    for (const section of [
      'User story',
      'Acceptance criteria',
      'Tasks / subtasks',
      'Dependencies',
      'Dev notes',
      '`## QA / Testing Notes`',
      '`## Human QA Notes`',
    ]) {
      expect(composer, `contract must retain "${section}"`).toContain(section);
    }
  });
});

describe('bmad-clickup-dev-implement — bmad-build delegation', () => {
  const loop = step(
    'bmad-clickup-dev-implement',
    'steps/step-04-implementation-loop.md'.replace('steps/', ''),
  );

  it('passes the full ClickUp context into the build', () => {
    for (const piece of [
      '{task_url}',
      '{epic_task_id}',
      'WORK ITEM CONTENT',
      'REVIEW CONTINUATION',
      'data.prd.path',
    ]) {
      expect(loop, `build intent must carry ${piece}`).toContain(piece);
    }
  });

  it('carries prior requested changes into a review-continuation build', () => {
    expect(loop).toMatch(
      /review-continuation build that does not carry the prior requested changes.{0,40}is a defect/i,
    );
  });

  it('lets bmad-build own its implementation spec', () => {
    expect(loop).toMatch(/Let bmad-build own its spec/i);
    expect(loop).toMatch(/Do not suppress it/i);
  });

  it('suppresses deprecated story and sprint file writes', () => {
    expect(loop).toMatch(/leave `story_key` unset/);
    expect(loop).toMatch(/`sync-sprint-status` (sub-step )?returns/);
    expect(loop).toMatch(/do not write or update a story file/i);
  });

  it('keeps ClickUp comments and the transition in the outer workflow', () => {
    expect(loop).toMatch(/Outer workflow owns ClickUp/i);
    expect(loop).toMatch(/must not post to ClickUp or transition the task/i);
  });

  it('never falls back to the deprecated shim on failure', () => {
    expect(loop).toMatch(/do NOT fall back to `bmad-dev-story`/i);
  });
});

describe('bmad-clickup-create-epic — BMAD 6.11 artifact inputs', () => {
  const prereq = step('bmad-clickup-create-epic', 'step-01-prereq-check.md');
  const picker = step(
    'bmad-clickup-create-epic',
    'step-03-local-epic-picker.md',
  );

  it('resolves paths through the cascade, not a hardcoded directory', () => {
    expect(prereq).toContain('.bmadmcp/config.toml');
    expect(prereq).toContain('bmadmcp-config');
    expect(prereq).toContain('bmad-config');
    expect(prereq).toContain('planning_artifacts');
  });

  it('honours an explicitly configured epics path first', () => {
    expect(prereq).toContain('epics_path');
    expect(prereq).toMatch(/Layer 1[\s\S]{0,600}epics_path/);
  });

  it('accepts both the directory and single-file epic layouts', () => {
    expect(prereq).toMatch(/directory containing at least one `\*\.md`/i);
    expect(prereq).toMatch(/single-file epics artifact/i);
  });

  it('recognises the BMAD 6.11 per-file epic heading forms', () => {
    expect(picker).toContain('# EPIC-N');
    expect(picker).toContain('## Epic N');
  });

  it('requires user selection when epics collide', () => {
    expect(picker).toMatch(/do NOT choose between them/i);
    expect(picker).toMatch(/Never resolve an ambiguous match silently/i);
  });

  it('publishes an already-planned epic rather than planning one', () => {
    expect(picker).toMatch(/Publish, do not plan/i);
    expect(picker).toMatch(/never invokes an upstream planning workflow/i);
  });
});

describe('bmad-clickup-create-bug — independence from planning artifacts', () => {
  const composer = step(
    'bmad-clickup-create-bug',
    'step-04-description-composer.md',
  );
  const prereq = step('bmad-clickup-create-bug', 'step-01-prereq-check.md');

  it('delegates to no BMAD workflow at all', () => {
    expect(composer).toMatch(/MUST NOT invoke `bmad-spec`, `bmad-build`/);
    expect(composer).toMatch(/MUST NOT invoke any deprecated v6 shim/i);
  });

  it('warns but does not block when planning artifacts are missing', () => {
    expect(prereq).toMatch(/optional|does not abort|warn/i);
  });

  it('keeps the structured bug template', () => {
    for (const section of ['reproduce', 'Expected', 'Actual', 'Impact']) {
      expect(composer.toLowerCase()).toContain(section.toLowerCase());
    }
  });
});
