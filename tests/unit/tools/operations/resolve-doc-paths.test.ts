import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validateResolveDocPathsParams,
  executeResolveDocPathsOperation,
  getResolveDocPathsExamples,
} from '@/tools/operations/resolve-doc-paths.js';
import { resolveDocPaths } from '@/utils/doc-path-resolver.js';
import type { BMADEngine } from '@/core/bmad-engine.js';

describe('validateResolveDocPathsParams', () => {
  it('accepts undefined', () => {
    expect(validateResolveDocPathsParams(undefined)).toBeUndefined();
  });

  it('accepts {}', () => {
    expect(validateResolveDocPathsParams({})).toBeUndefined();
  });

  it('accepts { projectRoot: "/abs/path" }', () => {
    expect(
      validateResolveDocPathsParams({ projectRoot: '/abs/path' }),
    ).toBeUndefined();
  });

  it('rejects non-object', () => {
    expect(validateResolveDocPathsParams(42)).toBe(
      'Parameters must be an object',
    );
  });

  it('rejects non-string projectRoot', () => {
    expect(validateResolveDocPathsParams({ projectRoot: 42 })).toBe(
      'Parameter "projectRoot" must be a string',
    );
  });

  it('rejects empty projectRoot', () => {
    expect(validateResolveDocPathsParams({ projectRoot: '' })).toBe(
      'Parameter "projectRoot" cannot be empty',
    );
  });

  it('rejects relative projectRoot', () => {
    const result = validateResolveDocPathsParams({ projectRoot: 'subdir' });
    expect(result).toContain('must be an absolute path');
    expect(result).toContain('subdir');
  });
});

describe('getResolveDocPathsExamples', () => {
  it('returns at least 4 entries with expected first four strings', () => {
    const examples = getResolveDocPathsExamples();
    expect(examples.length).toBeGreaterThanOrEqual(4);
    expect(examples[0]).toBe(
      'Default (server project root): { operation: "resolve-doc-paths" }',
    );
    expect(examples[1]).toBe(
      'Specific project: { operation: "resolve-doc-paths", projectRoot: "/abs/path/to/project" }',
    );
    expect(examples[2]).toBe(
      'After configuring .bmadmcp/config.toml [docs].prd_path: { operation: "resolve-doc-paths" }',
    );
    expect(examples[3]).toBe(
      'After configuring _bmad/config.toml [bmm].planning_artifacts: { operation: "resolve-doc-paths" }',
    );
  });
});

describe('executeResolveDocPathsOperation', () => {
  let tempDir: string;

  const makeTempDir = () => {
    tempDir = mkdtempSync(join(tmpdir(), 'resolve-doc-paths-op-'));
    return tempDir;
  };

  const cleanup = () => {
    rmSync(tempDir, { recursive: true, force: true });
  };

  it('happy path with explicit projectRoot', async () => {
    const root = makeTempDir();
    try {
      const fakeEngine = {
        getProjectRoot: () => '/ignored',
        resolveDocPaths: (r: string) => resolveDocPaths(r),
      } as unknown as BMADEngine;

      const result = await executeResolveDocPathsOperation(fakeEngine, {
        projectRoot: root,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const data = result.data as {
        prd: { path: string; layer: string };
        architecture: { path: string; layer: string };
        epics: { path: string; layer: string };
      };
      expect(data.prd.layer).toBe('default');
      expect(data.architecture.layer).toBe('default');
      expect(data.epics.layer).toBe('default');
    } finally {
      cleanup();
    }
  });

  it('defaults to engine project root when projectRoot omitted', async () => {
    const root = makeTempDir();
    try {
      const fakeEngine = {
        getProjectRoot: () => root,
        resolveDocPaths: (r: string) => resolveDocPaths(r),
      } as unknown as BMADEngine;

      const spy = vi.spyOn(fakeEngine, 'getProjectRoot');

      const result = await executeResolveDocPathsOperation(fakeEngine, {});

      expect(spy).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const data = result.data as { projectRoot: string };
      expect(data.projectRoot).toBe(root);
    } finally {
      cleanup();
    }
  });

  it('passes warnings through', async () => {
    const fakeEngine = {
      getProjectRoot: () => '/fake/root',
      resolveDocPaths: vi.fn().mockResolvedValue({
        prd: { path: '/fake/root/prd.md', layer: 'default' as const },
        architecture: {
          path: '/fake/root/arch.md',
          layer: 'default' as const,
        },
        epics: { path: '/fake/root/epics/', layer: 'default' as const },
        warnings: ['warning one', 'warning two'],
      }),
    } as unknown as BMADEngine;

    const result = await executeResolveDocPathsOperation(fakeEngine, {});

    expect(result.success).toBe(true);
    const data = result.data as { warnings: string[] };
    expect(data.warnings).toEqual(['warning one', 'warning two']);
    expect(result.text).toContain('Warnings (2):');
    expect(result.text).toContain('warning one');
    expect(result.text).toContain('warning two');
  });

  it('text format omits warnings section when empty', async () => {
    const fakeEngine = {
      getProjectRoot: () => '/fake/root',
      resolveDocPaths: vi.fn().mockResolvedValue({
        prd: { path: '/fake/root/prd.md', layer: 'default' as const },
        architecture: {
          path: '/fake/root/arch.md',
          layer: 'default' as const,
        },
        epics: { path: '/fake/root/epics/', layer: 'default' as const },
        warnings: [],
      }),
    } as unknown as BMADEngine;

    const result = await executeResolveDocPathsOperation(fakeEngine, {});

    expect(result.success).toBe(true);
    expect(result.text).not.toContain('Warnings (');
  });

  it('text format includes project-root header', async () => {
    const root = makeTempDir();
    try {
      const fakeEngine = {
        getProjectRoot: () => '/ignored',
        resolveDocPaths: (r: string) => resolveDocPaths(r),
      } as unknown as BMADEngine;

      const result = await executeResolveDocPathsOperation(fakeEngine, {
        projectRoot: root,
      });

      const lines = (result.text as string).split('\n');
      expect(lines[0]).toBe(`Resolved doc paths (project root: ${root})`);
    } finally {
      cleanup();
    }
  });

  it('coerces engine method throw into error result', async () => {
    const fakeEngine = {
      getProjectRoot: () => '/fake/root',
      resolveDocPaths: vi.fn().mockImplementation(() => {
        throw new TypeError('boom');
      }),
    } as unknown as BMADEngine;

    const result = await executeResolveDocPathsOperation(fakeEngine, {});

    expect(result.success).toBe(false);
    expect(result.error).toBe('boom');
    expect(result.text).toBe('');
  });

  it('data.projectRoot matches resolved root when defaulted', async () => {
    const root = makeTempDir();
    try {
      const fakeEngine = {
        getProjectRoot: () => root,
        resolveDocPaths: (r: string) => resolveDocPaths(r),
      } as unknown as BMADEngine;

      const result = await executeResolveDocPathsOperation(fakeEngine, {});

      expect(result.success).toBe(true);
      const data = result.data as { projectRoot: string };
      expect(data.projectRoot).toBe(root);
    } finally {
      cleanup();
    }
  });
});
