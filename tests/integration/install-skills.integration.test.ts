/**
 * Native skill installation into a clean temporary project.
 *
 * The alternative to using the skills through MCP is installing them into a
 * project's IDE skill directory. This exercises that path end to end against a
 * fresh temp dir, so a fresh installation is proven to expose all six
 * canonical skills together with the agent overrides that dispatch them.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { parse as parseToml } from 'smol-toml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

// The installer is a plain .mjs script with no build step, imported directly.
const installer = (await import(
  join(REPO_ROOT, 'scripts', 'install-skills.mjs')
)) as {
  installSkills: (options: Record<string, unknown>) => {
    targetRoot: string;
    skillRoot: string;
    overrideRoot: string;
    installed: Array<{ name: string; files: number }>;
    overrides: string[];
    dryRun: boolean;
  };
  discoverSkills: () => string[];
  discoverOverrides: () => string[];
};

const CANONICAL = [
  'bmad-clickup-code-review',
  'bmad-clickup-create-bug',
  'bmad-clickup-create-epic',
  'bmad-clickup-create-story',
  'bmad-clickup-dev-implement',
  'bmad-clickup-qa',
];

describe('native skill installation', () => {
  let project = '';

  beforeEach(() => {
    project = mkdtempSync(join(tmpdir(), 'bmad-install-'));
  });

  afterEach(() => {
    rmSync(project, { recursive: true, force: true });
  });

  it('exposes all six canonical skills in a fresh project', () => {
    const result = installer.installSkills({ target: project });

    expect(result.installed.map((s) => s.name).sort()).toEqual(CANONICAL);

    const skillRoot = join(project, '.claude', 'skills');
    expect(readdirSync(skillRoot).sort()).toEqual(CANONICAL);

    for (const name of CANONICAL) {
      const skillMd = join(skillRoot, name, 'SKILL.md');
      expect(existsSync(skillMd), `${name}/SKILL.md`).toBe(true);
      expect(readFileSync(skillMd, 'utf-8')).toContain(`name: ${name}`);
      expect(existsSync(join(skillRoot, name, 'workflow.md'))).toBe(true);
      expect(
        readdirSync(join(skillRoot, name, 'steps')).length,
      ).toBeGreaterThan(0);
    }
  });

  it('installs the agent overrides so named-agent dispatch works', () => {
    installer.installSkills({ target: project });

    const overrideRoot = join(project, '_bmad', 'custom');
    expect(readdirSync(overrideRoot).sort()).toEqual([
      'bmad-agent-dev.toml',
      'bmad-agent-pm.toml',
    ]);

    const routed: string[] = [];
    for (const file of readdirSync(overrideRoot)) {
      const parsed = parseToml(
        readFileSync(join(overrideRoot, file), 'utf-8'),
      ) as { agent?: { menu?: Array<{ code: string; skill?: string }> } };
      for (const item of parsed.agent?.menu ?? []) {
        expect(item.skill, `${item.code} must dispatch a skill`).toBeTruthy();
        // Every routed skill must exist in the installation we just made.
        expect(
          existsSync(
            join(project, '.claude', 'skills', item.skill!, 'SKILL.md'),
          ),
          `${item.code} routes to ${item.skill}, which was not installed`,
        ).toBe(true);
        routed.push(item.skill!);
      }
    }
    expect([...new Set(routed)].sort()).toEqual(CANONICAL);
  });

  it('installs into an alternate IDE directory', () => {
    installer.installSkills({ target: project, ide: 'cursor' });
    expect(readdirSync(join(project, '.cursor', 'skills')).sort()).toEqual(
      CANONICAL,
    );
    expect(existsSync(join(project, '.claude'))).toBe(false);
  });

  it('honours an explicit --dir target', () => {
    installer.installSkills({ target: project, dir: 'custom/skill-dir' });
    expect(readdirSync(join(project, 'custom', 'skill-dir')).sort()).toEqual(
      CANONICAL,
    );
  });

  it('copies only skill-package text files', () => {
    installer.installSkills({ target: project });
    const skillRoot = join(project, '.claude', 'skills');

    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : [e.name],
      );

    for (const file of walk(skillRoot)) {
      expect(
        /\.(md|toml|yaml|yml|json|txt)$/i.test(file),
        `${file} is not a skill-package text file`,
      ).toBe(true);
      expect(file.startsWith('.'), `${file} is hidden`).toBe(false);
    }
  });

  it('writes nothing on a dry run', () => {
    const result = installer.installSkills({ target: project, dryRun: true });
    expect(result.installed).toHaveLength(6);
    expect(existsSync(join(project, '.claude'))).toBe(false);
    expect(existsSync(join(project, '_bmad'))).toBe(false);
  });

  it('refuses to overwrite an existing installation without --force', () => {
    installer.installSkills({ target: project });
    expect(() => installer.installSkills({ target: project })).toThrow(
      /Already installed/,
    );
  });

  it('overwrites cleanly with force', () => {
    installer.installSkills({ target: project });
    expect(() =>
      installer.installSkills({ target: project, force: true }),
    ).not.toThrow();
    expect(readdirSync(join(project, '.claude', 'skills')).sort()).toEqual(
      CANONICAL,
    );
  });

  it('refuses to install into this repository', () => {
    expect(() => installer.installSkills({ target: REPO_ROOT })).toThrow(
      /Refusing to install into this repository/,
    );
  });

  it('rejects a target that is not a directory', () => {
    expect(() =>
      installer.installSkills({ target: join(project, 'nope') }),
    ).toThrow(/not a directory/);
  });

  it('does not commit a generated duplicate tree', () => {
    // src/custom-skills/ is the only maintained source tree. A generated copy
    // would show up as a bmad-clickup-* directory somewhere the installer
    // writes. (.claude/skills/ itself may legitimately hold unrelated skills,
    // so check for our skill names rather than for the directory.)
    const generatedRoots = [
      join(REPO_ROOT, '.claude', 'skills'),
      join(REPO_ROOT, '.cursor', 'skills'),
      join(REPO_ROOT, 'custom-skills'),
      join(REPO_ROOT, 'bmm-skills'),
    ];

    for (const root of generatedRoots) {
      if (!existsSync(root)) continue;
      const duplicated = readdirSync(root).filter((n) => CANONICAL.includes(n));
      expect(
        duplicated,
        `${root} holds a generated copy of ${duplicated.join(', ')} — ` +
          `src/custom-skills/ is the only source tree`,
      ).toEqual([]);
    }
  });
});
