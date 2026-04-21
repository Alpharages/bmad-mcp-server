/**
 * Dependency audit tests
 *
 * Validates that source code only imports from declared dependencies.
 * Prevents runtime errors from missing packages during fresh installation.
 */

import { describe, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve the repo root from this test file's location rather than process.cwd(),
// so behavior is stable when tests are invoked from a subdirectory (IDE runners,
// monorepo harnesses). This file lives at tests/unit/dependency-audit.test.ts,
// so two `..` segments reach the repo root.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..', '..');
const SRC_ROOT = join(REPO_ROOT, 'src');

// Vendored third-party trees are read-only and audited at their upstream pin,
// not against our package.json. See VENDOR.md for the vendoring posture.
const VENDORED_PATHS = ['src/tools/clickup'];

// Normalize any backslash separators to '/' so prefix matching is portable
// across OSes and tolerant of mixed separators (e.g. MSYS on Windows).
const toPosix = (p: string): string => p.replace(/\\/g, '/');

const isVendored = (absPath: string): boolean => {
  const rel = toPosix(relative(REPO_ROOT, absPath));
  return VENDORED_PATHS.some((v) => rel === v || rel.startsWith(`${v}/`));
};

// Recursively find non-test TypeScript source files under `dir`, skipping
// anything inside VENDORED_PATHS.
const findTsFiles = (dir: string): string[] => {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (isVendored(fullPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...findTsFiles(fullPath));
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.d.ts') &&
      !entry.name.endsWith('.test.ts')
    ) {
      files.push(fullPath);
    }
  }

  return files;
};

describe('dependency-audit', () => {
  it('should only import from declared dependencies', () => {
    const packagePath = join(REPO_ROOT, 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    const declaredDeps = new Set([
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.devDependencies || {}),
    ]);

    // Node.js built-in modules (don't need to be in package.json)
    const builtinModules = new Set([
      'node:fs',
      'node:path',
      'node:os',
      'node:crypto',
      'node:process',
      'node:util',
      'node:url',
      'node:child_process',
      'fs',
      'path',
      'os',
      'crypto',
      'process',
      'util',
      'url',
      'child_process',
    ]);

    const sourceFiles = findTsFiles(SRC_ROOT);

    const violations: string[] = [];

    for (const filePath of sourceFiles) {
      const content = readFileSync(filePath, 'utf-8');

      // Match both: import ... from 'package' and import('package')
      const importRegex = /(?:from|import\()\s+['"]([^'"./][^'"]*)['"]/g;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        const importedPackage = match[1];

        // Extract base package name (handle scoped packages)
        const basePackage = importedPackage.startsWith('@')
          ? importedPackage.split('/').slice(0, 2).join('/')
          : importedPackage.split('/')[0];

        if (builtinModules.has(basePackage) || declaredDeps.has(basePackage)) {
          continue;
        }

        violations.push(
          `${filePath}: imports '${importedPackage}' which is not in package.json`,
        );
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} undeclared dependency imports:\n  ${violations.join('\n  ')}`,
      );
    }
  });

  it('should use js-yaml consistently (not yaml package)', () => {
    const sourceFiles = findTsFiles(SRC_ROOT);

    const violations: string[] = [];

    for (const filePath of sourceFiles) {
      const content = readFileSync(filePath, 'utf-8');

      if (
        /from\s+['"]yaml['"]/.test(content) ||
        /import\(['"]yaml['"]\)/.test(content)
      ) {
        violations.push(
          `${filePath}: imports from 'yaml' instead of 'js-yaml'`,
        );
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} incorrect yaml package imports:\n  ${violations.join('\n  ')}\n\nUse 'js-yaml' instead of 'yaml'`,
      );
    }
  });

  // Tripwire: the vendor upgrade procedure (see VENDOR.md) is manual, and the
  // exclusion rationale in VENDOR.md calls out exactly these files as hazards
  // for nearest-ancestor config discovery (Node module resolution, ESLint flat
  // config, Prettier). If a future re-vendor accidentally lets one through,
  // fail loudly here instead of debugging silent breakage later.
  it('vendored trees must not contain nested package/tsconfig/lint configs', () => {
    const FORBIDDEN = new Set([
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'tsconfig.json',
      'tsconfig.base.json',
      '.eslintrc',
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.json',
      '.eslintrc.yml',
      '.eslintrc.yaml',
      'eslint.config.js',
      'eslint.config.mjs',
      'eslint.config.cjs',
      '.prettierrc',
      '.prettierrc.js',
      '.prettierrc.cjs',
      '.prettierrc.json',
      '.prettierrc.yml',
      '.prettierrc.yaml',
    ]);

    const violations: string[] = [];

    const scan = (dir: string): void => {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (entry.isFile() && FORBIDDEN.has(entry.name)) {
          violations.push(toPosix(relative(REPO_ROOT, fullPath)));
        }
      }
    };

    for (const v of VENDORED_PATHS) {
      const abs = join(REPO_ROOT, v);
      if (existsSync(abs)) {
        scan(abs);
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Vendored tree contains forbidden config files (would collide with nearest-ancestor config discovery — see VENDOR.md exclusion rationale):\n  ${violations.join('\n  ')}`,
      );
    }
  });
});
