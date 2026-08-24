/**
 * Named-agent routing tests (BMAD 6.11).
 *
 * Verifies that the project-local agent overrides in `_bmad/custom/`:
 *   - route every custom ClickUp workflow to a canonical `bmad-clickup-*` ID;
 *   - preserve the existing customer-facing CS / DS / CB triggers;
 *   - never override an official BMAD named-agent trigger code.
 *
 * These are content contracts on files BMAD merges at install time, so they
 * are asserted against the parsed TOML rather than a running agent.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseToml } from 'smol-toml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const CUSTOM_DIR = join(REPO_ROOT, '_bmad', 'custom');
const SKILLS_DIR = join(REPO_ROOT, 'src', 'custom-skills');

interface MenuItem {
  code: string;
  description: string;
  skill?: string;
  prompt?: string;
}

const loadMenu = (file: string): MenuItem[] => {
  const parsed = parseToml(readFileSync(join(CUSTOM_DIR, file), 'utf-8')) as {
    agent?: { menu?: MenuItem[] };
  };
  return parsed.agent?.menu ?? [];
};

/**
 * Official BMAD 6.11 named-agent triggers, from the upstream
 * `bmad-agent-<name>/customize.toml` files. A project override that reuses one of
 * these codes silently changes what a documented trigger does.
 */
const OFFICIAL_CODES: Record<string, string[]> = {
  'bmad-agent-dev.toml': ['BD', 'QA', 'CR', 'SP', 'ER'],
  'bmad-agent-pm.toml': ['PRD', 'CE', 'IR', 'CC'],
};

describe('named-agent routing (BMAD 6.11)', () => {
  describe('bmad-agent-dev.toml — Amelia / Developer', () => {
    const menu = loadMenu('bmad-agent-dev.toml');
    const byCode = new Map(menu.map((m) => [m.code, m]));

    it('preserves the existing CS / DS / CB customer triggers', () => {
      expect(byCode.get('CS')?.skill).toBe('bmad-clickup-create-story');
      expect(byCode.get('DS')?.skill).toBe('bmad-clickup-dev-implement');
      expect(byCode.get('CB')?.skill).toBe('bmad-clickup-create-bug');
    });

    it('adds the missing ClickUp review and execution/visual QA routes', () => {
      expect(byCode.get('CUR')?.skill).toBe('bmad-clickup-code-review');
      expect(byCode.get('CUQ')?.skill).toBe('bmad-clickup-qa');
    });

    it('never overrides an official Developer trigger code', () => {
      for (const code of OFFICIAL_CODES['bmad-agent-dev.toml']) {
        expect(
          byCode.has(code),
          `custom override must not define official code ${code}`,
        ).toBe(false);
      }
    });

    it('documents that official QA and CR keep their meanings', () => {
      const raw = readFileSync(
        join(CUSTOM_DIR, 'bmad-agent-dev.toml'),
        'utf-8',
      );
      expect(raw).toContain('bmad-qa-generate-e2e-tests');
      expect(raw).toContain('bmad-code-review');
      expect(raw).toContain('bmad-build');
    });
  });

  describe('bmad-agent-pm.toml — John / Product Manager', () => {
    it('exists so the epic-publishing route has an owner', () => {
      expect(existsSync(join(CUSTOM_DIR, 'bmad-agent-pm.toml'))).toBe(true);
    });

    const menu = loadMenu('bmad-agent-pm.toml');
    const byCode = new Map(menu.map((m) => [m.code, m]));

    it('adds the ClickUp epic-publishing route', () => {
      expect(byCode.get('CUE')?.skill).toBe('bmad-clickup-create-epic');
    });

    it('never overrides an official Product Manager trigger code', () => {
      for (const code of OFFICIAL_CODES['bmad-agent-pm.toml']) {
        expect(
          byCode.has(code),
          `custom override must not define official code ${code}`,
        ).toBe(false);
      }
    });
  });

  describe('coverage across both agents', () => {
    const allItems = [
      ...loadMenu('bmad-agent-dev.toml'),
      ...loadMenu('bmad-agent-pm.toml'),
    ];

    it('every custom workflow has exactly one agent route', () => {
      const routed = allItems
        .map((m) => m.skill)
        .filter((s): s is string => Boolean(s?.startsWith('bmad-clickup-')));

      const expected = [
        'bmad-clickup-code-review',
        'bmad-clickup-create-bug',
        'bmad-clickup-create-epic',
        'bmad-clickup-create-story',
        'bmad-clickup-dev-implement',
        'bmad-clickup-qa',
      ];
      expect([...routed].sort()).toEqual(expected);
    });

    it('every routed skill resolves to a real skill directory', () => {
      for (const item of allItems) {
        if (!item.skill?.startsWith('bmad-clickup-')) continue;
        expect(
          existsSync(join(SKILLS_DIR, item.skill, 'SKILL.md')),
          `${item.code} routes to missing skill ${item.skill}`,
        ).toBe(true);
      }
    });

    it('assigns each trigger code at most once per agent', () => {
      for (const file of Object.keys(OFFICIAL_CODES)) {
        const codes = loadMenu(file).map((m) => m.code);
        expect(new Set(codes).size, `duplicate code in ${file}`).toBe(
          codes.length,
        );
      }
    });

    it('gives every custom route a non-empty description and a skill', () => {
      for (const item of allItems) {
        expect(item.description?.trim().length ?? 0).toBeGreaterThan(0);
        expect(item.skill, `${item.code} must dispatch a skill`).toBeTruthy();
        expect(item.prompt).toBeUndefined();
      }
    });
  });
});
