import { describe, it, expect } from 'vitest';
import { ResourceLoaderGit } from '../../src/core/resource-loader.js';
import { join } from 'node:path';
import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  rmSync,
  readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = join(__filename, '..', '..', '..');

describe('clickup-create-bug skill', () => {
  it('should load clickup-create-bug via ResourceLoaderGit from src/custom-skills/', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'bmad-bug-skill-test-'));
    try {
      const skillDir = join(
        projectDir,
        'src',
        'custom-skills',
        'clickup-create-bug',
      );
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(
        join(skillDir, 'SKILL.md'),
        '# ClickUp Create Bug — fixture',
      );

      const loader = new ResourceLoaderGit(projectDir);
      const resource = await loader.loadWorkflow('clickup-create-bug');

      expect(resource.name).toBe('clickup-create-bug');
      expect(resource.content).toContain('ClickUp Create Bug — fixture');
      expect(resource.source).toBe('project');
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('step-01-prereq-check describes PRD as soft-loaded — skill MUST NOT stop when PRD is absent', () => {
    const content = readFileSync(
      join(
        projectRoot,
        'src',
        'custom-skills',
        'clickup-create-bug',
        'steps',
        'step-01-prereq-check.md',
      ),
      'utf-8',
    );

    const mustNotStopMatches = content.match(/MUST NOT stop/g);
    expect(mustNotStopMatches).not.toBeNull();
    expect(mustNotStopMatches!.length).toBeGreaterThanOrEqual(2);

    const softLoadMatch =
      content.match(/soft-load/i) || content.match(/Soft-load/);
    expect(softLoadMatch).not.toBeNull();
  });

  it('step-01-prereq-check describes architecture as soft-loaded — skill MUST NOT stop when arch is absent', () => {
    const content = readFileSync(
      join(
        projectRoot,
        'src',
        'custom-skills',
        'clickup-create-bug',
        'steps',
        'step-01-prereq-check.md',
      ),
      'utf-8',
    );

    expect(content).toContain('architecture');
    expect(content).toContain(
      'Missing planning artifacts never block bug creation',
    );
  });

  it('step-03-epic-picker contains skip prompt — bugs do not require an epic parent', () => {
    const content = readFileSync(
      join(
        projectRoot,
        'src',
        'custom-skills',
        'clickup-create-bug',
        'steps',
        'step-03-epic-picker.md',
      ),
      'utf-8',
    );

    expect(content).toContain('Bugs do not require an epic parent');
    expect(content).toContain('skip');
    expect(content).toContain('epic_id');
    expect(content).toContain('epic_name');
  });

  it('step-04-description-composer severity table includes Critical-level keywords', () => {
    const content = readFileSync(
      join(
        projectRoot,
        'src',
        'custom-skills',
        'clickup-create-bug',
        'steps',
        'step-04-description-composer.md',
      ),
      'utf-8',
    );

    expect(content).toContain('Critical');
    expect(content).toContain('crash');
    expect(content).toContain('data loss');
    expect(content).toContain('security');
  });

  it('step-04-description-composer severity table includes Low-level keywords', () => {
    const content = readFileSync(
      join(
        projectRoot,
        'src',
        'custom-skills',
        'clickup-create-bug',
        'steps',
        'step-04-description-composer.md',
      ),
      'utf-8',
    );

    expect(content).toContain('Low');
    expect(content).toContain('cosmetic');
    expect(content).toContain('typo');
  });

  it('step-04-description-composer defaults to High severity when no keyword matches', () => {
    const content = readFileSync(
      join(
        projectRoot,
        'src',
        'custom-skills',
        'clickup-create-bug',
        'steps',
        'step-04-description-composer.md',
      ),
      'utf-8',
    );

    expect(content).toContain('Default to **High**');
  });

  it('step-05-create-task maps Medium severity to priority 2 — high not normal', () => {
    const content = readFileSync(
      join(
        projectRoot,
        'src',
        'custom-skills',
        'clickup-create-bug',
        'steps',
        'step-05-create-task.md',
      ),
      'utf-8',
    );

    expect(content).toContain('Medium');
    expect(content).toContain('2 (high)');
    expect(content).toContain('Medium maps to `high` (not `normal`)');
  });
});
