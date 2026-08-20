#!/usr/bin/env node
/**
 * Install the canonical BMAD 6.11 ClickUp skills into a target project.
 *
 * This is the *native* installation path, the alternative to using the skills
 * through MCP. It copies each skill package into the target's IDE skill
 * directory and installs the committed team agent overrides into
 * `<target>/_bmad/custom/`, so named-agent dispatch works without this
 * repository's source layout being visible.
 *
 * `src/custom-skills/` remains the only maintained source tree — the copies
 * this script produces are install output and must never be committed back.
 *
 * Usage:
 *   node scripts/install-skills.mjs [target-project-dir] [options]
 *
 *   --ide <name>   claude (default) | cursor | windsurf | opencode
 *   --dir <path>   explicit skill directory, overrides --ide
 *   --dry-run      report what would be written, write nothing
 *   --force        overwrite an existing skill directory
 *   --quiet        only print the summary line
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_SRC = join(REPO_ROOT, 'src', 'custom-skills');
const OVERRIDES_SRC = join(REPO_ROOT, '_bmad', 'custom');

/**
 * Where each supported IDE looks for skills, relative to the project root.
 * `claude` is the default because it is the reference client.
 */
const IDE_SKILL_DIRS = {
  claude: join('.claude', 'skills'),
  cursor: join('.cursor', 'skills'),
  windsurf: join('.windsurf', 'skills'),
  opencode: join('.opencode', 'skills'),
};

/** Text extensions that make up a skill package — mirrors the MCP loader. */
const PACKAGE_EXTENSIONS = ['.md', '.toml', '.yaml', '.yml', '.json', '.txt'];

class InstallError extends Error {}

function parseArgs(argv) {
  const opts = {
    target: null,
    ide: 'claude',
    dir: null,
    dryRun: false,
    force: false,
    quiet: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--ide':
        opts.ide = argv[++i];
        break;
      case '--dir':
        opts.dir = argv[++i];
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--force':
        opts.force = true;
        break;
      case '--quiet':
        opts.quiet = true;
        break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
      default:
        if (arg.startsWith('-')) {
          throw new InstallError(`Unknown option: ${arg}`);
        }
        if (opts.target) {
          throw new InstallError(`Unexpected extra argument: ${arg}`);
        }
        opts.target = arg;
    }
  }
  if (!opts.dir && !(opts.ide in IDE_SKILL_DIRS)) {
    throw new InstallError(
      `Unknown --ide "${opts.ide}". Supported: ${Object.keys(IDE_SKILL_DIRS).join(', ')}. ` +
        `Use --dir <path> for anything else.`,
    );
  }
  return opts;
}

/** The canonical skills present in the source tree, in stable order. */
export function discoverSkills() {
  if (!existsSync(SKILLS_SRC)) {
    throw new InstallError(`Skill source tree not found: ${SKILLS_SRC}`);
  }
  const skills = readdirSync(SKILLS_SRC, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => existsSync(join(SKILLS_SRC, name, 'SKILL.md')))
    .sort();

  const notCanonical = skills.filter((n) => !n.startsWith('bmad-'));
  if (notCanonical.length > 0) {
    throw new InstallError(
      `BMAD 6.11 requires the bmad- prefix; these are not canonical: ${notCanonical.join(', ')}`,
    );
  }
  if (skills.length === 0) {
    throw new InstallError(`No skills with a SKILL.md found in ${SKILLS_SRC}`);
  }
  return skills;
}

/** Agent override TOMLs to install into `<target>/_bmad/custom/`. */
export function discoverOverrides() {
  if (!existsSync(OVERRIDES_SRC)) return [];
  return readdirSync(OVERRIDES_SRC)
    .filter((f) => f.endsWith('.toml'))
    .sort();
}

/**
 * Copy one skill package, keeping only the text files a skill is made of.
 * Filtering here rather than copying wholesale keeps stray local files (build
 * output, editor droppings) out of the installed skill.
 */
function copySkill(name, destRoot, { dryRun }) {
  const src = join(SKILLS_SRC, name);
  const dest = join(destRoot, name);
  const copied = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      if (entry.isSymbolicLink()) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const lower = entry.name.toLowerCase();
      if (!PACKAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))) continue;

      const rel = full.slice(src.length + 1);
      copied.push(rel);
      if (!dryRun) {
        const outPath = join(dest, rel);
        mkdirSync(dirname(outPath), { recursive: true });
        cpSync(full, outPath);
      }
    }
  };

  walk(src);
  return copied;
}

export function installSkills(options = {}) {
  const {
    target,
    ide = 'claude',
    dir = null,
    dryRun = false,
    force = false,
  } = options;

  if (!target) {
    throw new InstallError('A target project directory is required.');
  }
  const targetRoot = resolve(target);
  if (!existsSync(targetRoot) || !statSync(targetRoot).isDirectory()) {
    throw new InstallError(`Target is not a directory: ${targetRoot}`);
  }
  if (resolve(targetRoot) === REPO_ROOT) {
    throw new InstallError(
      'Refusing to install into this repository — that would create the ' +
        'committed duplicate tree the migration plan forbids. Pass another ' +
        'project directory.',
    );
  }

  const skillRoot = dir
    ? resolve(targetRoot, dir)
    : join(targetRoot, IDE_SKILL_DIRS[ide]);
  const overrideRoot = join(targetRoot, '_bmad', 'custom');

  const skills = discoverSkills();
  const overrides = discoverOverrides();

  // Fail before writing anything if a skill is already installed.
  if (!force) {
    const clashes = skills.filter((n) => existsSync(join(skillRoot, n)));
    if (clashes.length > 0) {
      throw new InstallError(
        `Already installed at ${skillRoot}: ${clashes.join(', ')}. ` +
          `Re-run with --force to overwrite.`,
      );
    }
  }

  if (!dryRun) mkdirSync(skillRoot, { recursive: true });

  const installed = [];
  for (const name of skills) {
    if (force && !dryRun) {
      rmSync(join(skillRoot, name), { recursive: true, force: true });
    }
    const files = copySkill(name, skillRoot, { dryRun });
    installed.push({ name, files: files.length });
  }

  if (overrides.length > 0 && !dryRun) {
    mkdirSync(overrideRoot, { recursive: true });
    for (const file of overrides) {
      cpSync(join(OVERRIDES_SRC, file), join(overrideRoot, file));
    }
  }

  return { targetRoot, skillRoot, overrideRoot, installed, overrides, dryRun };
}

/** Trigger codes each override file registers, for the summary output. */
function triggerCodes(file) {
  const body = readFileSync(join(OVERRIDES_SRC, file), 'utf-8');
  return [...body.matchAll(/^code\s*=\s*"([^"]+)"/gm)].map((m) => m[1]);
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[bmad] ERROR: ${error.message}`);
    process.exit(2);
  }

  if (opts.help || !opts.target) {
    console.log(
      [
        'Install the canonical BMAD 6.11 ClickUp skills into a target project.',
        '',
        'Usage: node scripts/install-skills.mjs <target-project-dir> [options]',
        '',
        '  --ide <name>   claude (default) | cursor | windsurf | opencode',
        '  --dir <path>   explicit skill directory, overrides --ide',
        '  --dry-run      report what would be written, write nothing',
        '  --force        overwrite an existing skill directory',
        '  --quiet        only print the summary line',
      ].join('\n'),
    );
    process.exit(opts.help ? 0 : 2);
  }

  let result;
  try {
    result = installSkills(opts);
  } catch (error) {
    console.error(`[bmad] ERROR: ${error.message}`);
    process.exit(1);
  }

  const prefix = result.dryRun ? '[bmad] would install' : '[bmad] installed';
  if (!opts.quiet) {
    for (const { name, files } of result.installed) {
      console.log(`${prefix} ${name} (${files} files) → ${result.skillRoot}`);
    }
    for (const file of result.overrides) {
      const codes = triggerCodes(file);
      console.log(
        `${prefix} ${file} [${codes.join(', ')}] → ${result.overrideRoot}`,
      );
    }
  }

  console.log(
    `[bmad] ${result.dryRun ? 'dry run — ' : ''}${result.installed.length} skills, ` +
      `${result.overrides.length} agent overrides → ${result.targetRoot}`,
  );
}

// Only run the CLI when invoked directly, so tests can import the functions.
if (
  process.argv[1] &&
  resolve(process.argv[1]).endsWith('install-skills.mjs')
) {
  main();
}
