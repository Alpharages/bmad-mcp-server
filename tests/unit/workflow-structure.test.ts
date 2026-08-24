/**
 * Workflow structure scanner.
 *
 * One data-driven sweep over every custom workflow under `src/custom-skills/`,
 * asserting the BMAD 6.11 structural rules that a per-skill test would have to
 * repeat six times — and that a newly added seventh skill would otherwise miss
 * entirely.
 *
 * Covers: canonical naming, frontmatter/directory agreement, required files,
 * relative-link resolution, step ordering and contiguity, terminal-step
 * wording, and the absence of deprecated upstream workflow invocations.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEPRECATED_UPSTREAM_IDS } from '../helpers/bmad-611-contract.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const SKILLS_DIR = join(REPO_ROOT, 'src', 'custom-skills');

/** The six canonical workflows this repository ships. */
const EXPECTED_SKILLS = [
  'bmad-clickup-code-review',
  'bmad-clickup-create-bug',
  'bmad-clickup-create-epic',
  'bmad-clickup-create-story',
  'bmad-clickup-dev-implement',
  'bmad-clickup-qa',
] as const;

/** Workflow IDs removed by the BMAD 6.11 clean cutover. */
const REMOVED_WORKFLOW_IDS = [
  'clickup-code-review',
  'clickup-create-bug',
  'clickup-create-epic',
  'clickup-create-story',
  'clickup-dev-implement',
  'clickup-qa',
] as const;

/**
 * Skill directories as they actually ship: the tracked top-level directories
 * under `src/custom-skills/`. Reading the filesystem directly would also pick
 * up gitignored local artifacts (runtime `logs/`, editor `.claude/`), making
 * the sweep pass in CI and fail on a developer machine.
 */
const skillDirs = Array.from(
  new Set(
    execFileSync('git', ['ls-files', '-z', 'src/custom-skills'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    })
      .split('\0')
      .filter(Boolean)
      .map((f) => f.slice('src/custom-skills/'.length).split('/')[0])
      .filter(
        (name) =>
          existsSync(join(SKILLS_DIR, name)) &&
          statSync(join(SKILLS_DIR, name)).isDirectory(),
      ),
  ),
).sort();

const readSkill = (skill: string, rel: string): string =>
  readFileSync(join(SKILLS_DIR, skill, rel), 'utf-8');

const frontmatterName = (skill: string): string | null => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(
    readSkill(skill, 'SKILL.md'),
  );
  if (!match) return null;
  const nameLine = /^name:\s*(.+)$/m.exec(match[1]);
  return nameLine ? nameLine[1].trim() : null;
};

const stepFiles = (skill: string): string[] => {
  const dir = join(SKILLS_DIR, skill, 'steps');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort();
};

/** Every `.md` file in the skill package, relative to the skill directory. */
const packageMarkdown = (skill: string): string[] => {
  const root = join(SKILLS_DIR, skill);
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md'))
        out.push(
          full
            .slice(root.length + 1)
            .split(/[\\/]/)
            .join('/'),
        );
    }
  };
  walk(root);
  return out.sort();
};

describe('custom workflow structure (BMAD 6.11)', () => {
  it('ships exactly the six canonical workflows', () => {
    expect(skillDirs).toEqual([...EXPECTED_SKILLS]);
  });

  it('has no directory named after a removed workflow ID', () => {
    for (const removed of REMOVED_WORKFLOW_IDS) {
      expect(
        existsSync(join(SKILLS_DIR, removed)),
        `${removed} was removed by the BMAD 6.11 cutover — no alias or duplicate directory may reintroduce it`,
      ).toBe(false);
    }
  });

  describe.each(skillDirs)('%s', (skill) => {
    it('uses a canonical bmad- prefixed name', () => {
      expect(skill.startsWith('bmad-')).toBe(true);
    });

    it('has a SKILL.md whose frontmatter name equals the directory name', () => {
      expect(existsSync(join(SKILLS_DIR, skill, 'SKILL.md'))).toBe(true);
      expect(frontmatterName(skill)).toBe(skill);
    });

    it('has a non-empty description in its frontmatter', () => {
      const content = readSkill(skill, 'SKILL.md');
      expect(content).toMatch(/^description:\s*\S/m);
    });

    it('has a workflow.md', () => {
      expect(existsSync(join(SKILLS_DIR, skill, 'workflow.md'))).toBe(true);
    });

    it('resolves every relative markdown link', () => {
      const broken: string[] = [];
      for (const rel of packageMarkdown(skill)) {
        const abs = join(SKILLS_DIR, skill, rel);
        const body = readFileSync(abs, 'utf-8');
        for (const m of body.matchAll(/\]\((\.\/[^)#\s]+)\)/g)) {
          const target = normalize(join(dirname(abs), m[1]));
          if (!existsSync(target)) broken.push(`${rel} -> ${m[1]}`);
        }
      }
      expect(broken, `broken relative links in ${skill}`).toEqual([]);
    });

    it('numbers its steps contiguously from 01', () => {
      const files = stepFiles(skill);
      expect(files.length, `${skill} has no step files`).toBeGreaterThan(0);

      const numbers = files.map((f) => {
        const m = /^step-(\d{2})-/.exec(f);
        expect(m, `${f} does not follow step-NN-<slug>.md`).not.toBeNull();
        return Number(m![1]);
      });

      expect(numbers).toEqual(
        Array.from({ length: numbers.length }, (_, i) => i + 1),
      );
    });

    it('names its own step number in each step heading', () => {
      for (const file of stepFiles(skill)) {
        const n = Number(/^step-(\d{2})-/.exec(file)![1]);
        const body = readFileSync(
          join(SKILLS_DIR, skill, 'steps', file),
          'utf-8',
        );
        const heading = /^#\s+Step\s+(\d+)\b/m.exec(body);
        expect(
          heading,
          `${skill}/steps/${file} has no "# Step N" heading`,
        ).not.toBeNull();
        expect(
          Number(heading![1]),
          `${skill}/steps/${file} heading names step ${heading![1]} but the filename says ${n}`,
        ).toBe(n);
      }
    });

    it('names the correct terminal step number', () => {
      const files = stepFiles(skill);
      const last = files[files.length - 1];
      const lastNumber = Number(/^step-(\d{2})-/.exec(last)![1]);

      const sources = [
        { rel: 'workflow.md', body: readSkill(skill, 'workflow.md') },
        {
          rel: `steps/${last}`,
          body: readSkill(skill, `steps/${last}`),
        },
      ];

      let stated = 0;
      for (const { rel, body } of sources) {
        for (const m of body.matchAll(
          /[Ss]tep (\d+) is the terminal step|[Ee]nd the workflow after step (\d+)/g,
        )) {
          stated += 1;
          const named = Number(m[1] ?? m[2]);
          expect(
            named,
            `${skill}/${rel} names step ${named} as terminal, but the last step file is ${last}`,
          ).toBe(lastNumber);
        }
      }
      expect(
        stated,
        `${skill} never states which step is terminal (checked workflow.md and steps/${last})`,
      ).toBeGreaterThan(0);
    });

    it('never invokes a deprecated upstream workflow', () => {
      // A prohibition ("Never call X", "do NOT fall back to X") is the point of
      // the migration and must survive; an *invocation* must not. Flag only
      // lines that pair a deprecated ID with an invocation verb and carry no
      // negation.
      const invocation = /\b(invoke|execute|delegate to|delegates to|call)\b/i;
      const negation =
        /\b(never|not|non-|no longer|instead of|deprecated|shim|prohibit)\b/i;

      const offenders: string[] = [];
      for (const rel of packageMarkdown(skill)) {
        const body = readFileSync(join(SKILLS_DIR, skill, rel), 'utf-8');
        body.split('\n').forEach((line, i) => {
          if (!DEPRECATED_UPSTREAM_IDS.some((id) => line.includes(id))) return;
          if (!invocation.test(line)) return;
          if (negation.test(line)) return;
          offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
        });
      }
      expect(
        offenders,
        `${skill} still invokes a deprecated upstream workflow`,
      ).toEqual([]);
    });

    it('contains no removed clickup-* workflow ID', () => {
      const offenders: string[] = [];
      for (const rel of packageMarkdown(skill)) {
        const body = readFileSync(join(SKILLS_DIR, skill, rel), 'utf-8');
        body.split('\n').forEach((line, i) => {
          for (const removed of REMOVED_WORKFLOW_IDS) {
            // Match the bare legacy ID, never the canonical bmad- prefixed one.
            const re = new RegExp(`(?<!bmad-)\\b${removed}\\b`);
            if (re.test(line))
              offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
          }
        });
      }
      expect(offenders, `${skill} references a removed workflow ID`).toEqual(
        [],
      );
    });

    it('keeps every package file as readable text', () => {
      for (const rel of packageMarkdown(skill)) {
        const abs = join(SKILLS_DIR, skill, rel);
        expect(statSync(abs).size, `${rel} is empty`).toBeGreaterThan(0);
        expect(
          readFileSync(abs).includes(0),
          `${rel} contains a NUL byte and would be excluded from the skill package`,
        ).toBe(false);
      }
    });
  });

  describe('BMAD 6.11 delegation targets', () => {
    it('dev-implement delegates implementation to bmad-build', () => {
      const body = readSkill(
        'bmad-clickup-dev-implement',
        'steps/step-04-implementation-loop.md',
      );
      expect(body).toMatch(/Invoke the `bmad-build` workflow/);
      expect(body).toContain('workflow name `bmad-build`');
    });

    it('create-story distils ad hoc intent through bmad-spec', () => {
      const body = readSkill(
        'bmad-clickup-create-story',
        'steps/step-04-description-composer.md',
      );
      expect(body).toMatch(/workflow name `bmad-spec`/);
      expect(body).toMatch(/headless/i);
    });

    it('code-review delegates review to bmad-code-review', () => {
      const body = readSkill(
        'bmad-clickup-code-review',
        'steps/step-04-review-execution.md',
      );
      expect(body).toContain('workflow name `bmad-code-review`');
    });
  });
});
