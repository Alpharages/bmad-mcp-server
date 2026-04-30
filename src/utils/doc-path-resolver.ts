import { join, isAbsolute } from 'node:path';
import { existsSync } from 'node:fs';
import { loadToml } from './toml-loader.js';

/**
 * The three documented keys that the resolver handles.
 *
 * Note on `epics`: the actual repo layout uses a directory of per-epic files
 * (`planning-artifacts/epics/EPIC-*.md`), not a single `epics.md` file. The
 * resolver therefore treats the `epics` key as a directory path (trailing
 * slash) by default. Callers decide whether to glob the directory or read a
 * single file based on whether the resolved path ends with `.md`.
 */
export type DocKey = 'prd' | 'architecture' | 'epics';

export type DocPathLayer =
  | 'bmadmcp-config' // .bmadmcp/config.toml [docs]
  | 'bmad-config' // _bmad/config.toml chain (4-layer merge)
  | 'default'; // hardcoded planning-artifacts/*

export interface ResolvedDocPath {
  /** Absolute path. May or may not exist on disk — the resolver does not stat it. */
  path: string;
  /** Which layer of the cascade produced this path. */
  layer: DocPathLayer;
}

export interface ResolvedDocPaths {
  prd: ResolvedDocPath;
  architecture: ResolvedDocPath;
  epics: ResolvedDocPath;
  /**
   * Per-file warnings for malformed config files encountered during
   * resolution. Empty if every consulted file was either ok or missing.
   * Format: human-readable, single-line each, suitable for callers to
   * pass to `logger.warn` verbatim.
   */
  warnings: readonly string[];
}

const DOC_KEYS: DocKey[] = ['prd', 'architecture', 'epics'];

const DEFAULT_FILENAMES: Record<DocKey, string> = {
  prd: 'PRD.md',
  architecture: 'architecture.md',
  epics: 'epics/',
};

const PER_KEY_PATH_KEYS: Record<DocKey, string> = {
  prd: 'prd_path',
  architecture: 'architecture_path',
  epics: 'epics_path',
};

/**
 * Deep-merge two plain objects. Scalars are overridden; tables are recursed.
 * Arrays are replaced, not concatenated. This is the minimal subset needed
 * for the BMAD 4-layer config merge.
 */
function mergeTables(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(overlay)) {
    const overlayVal = overlay[key];
    const baseVal = result[key];
    if (
      typeof overlayVal === 'object' &&
      overlayVal !== null &&
      !Array.isArray(overlayVal) &&
      typeof baseVal === 'object' &&
      baseVal !== null &&
      !Array.isArray(baseVal)
    ) {
      result[key] = mergeTables(
        baseVal as Record<string, unknown>,
        overlayVal as Record<string, unknown>,
      );
    } else {
      result[key] = overlayVal;
    }
  }
  return result;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function resolvePath(projectRoot: string, value: string): string {
  if (isAbsolute(value)) {
    return value;
  }
  return join(projectRoot, value);
}

/**
 * Resolve the BMAD base directory for a project.
 *
 * Prefer `bmad/` if it contains a `config.toml`; otherwise use `_bmad/` if it
 * contains a `config.toml`. If neither has a `config.toml`, return `null`.
 */
function resolveBmadDir(projectRoot: string): string | null {
  const bmadDir = join(projectRoot, 'bmad');
  if (existsSync(join(bmadDir, 'config.toml'))) {
    return bmadDir;
  }
  const _bmadDir = join(projectRoot, '_bmad');
  if (existsSync(join(_bmadDir, 'config.toml'))) {
    return _bmadDir;
  }
  return null;
}

/**
 * For each of the three documented keys (`prd`, `architecture`, `epics`),
 * walks the per-key cascade and returns absolute paths annotated with which
 * layer produced each one, plus a list of warnings for any malformed config
 * files encountered.
 *
 * Cascade order (per-key):
 *   1. `.bmadmcp/config.toml [docs]`      (project escape hatch — wins)
 *   2. `_bmad/config.toml` chain          (4-layer base→user→custom→custom.user
 *      (or `bmad/` if present)            merge, `[bmm].planning_artifacts` key)
 *   3. `planning-artifacts/<doc>`          (hardcoded default)
 */
export function resolveDocPaths(projectRoot: string): ResolvedDocPaths {
  if (!isAbsolute(projectRoot)) {
    throw new TypeError(
      `resolveDocPaths: expected absolute projectRoot, got "${String(projectRoot)}"`,
    );
  }

  const warnings: string[] = [];
  const resolved: Partial<Record<DocKey, ResolvedDocPath>> = {};

  // Layer 1: .bmadmcp/config.toml [docs]
  const bmadmcpPath = join(projectRoot, '.bmadmcp', 'config.toml');
  const bmadmcpResult = loadToml(bmadmcpPath);

  if (bmadmcpResult.kind === 'malformed') {
    warnings.push(
      `${bmadmcpResult.path}: malformed TOML — ${bmadmcpResult.error.message}; falling back to BMAD / default for all doc paths`,
    );
  } else if (bmadmcpResult.kind === 'ok') {
    const docs = (bmadmcpResult.data as { docs?: unknown }).docs;
    if (typeof docs === 'object' && docs !== null && !Array.isArray(docs)) {
      const docsTable = docs as Record<string, unknown>;

      for (const key of DOC_KEYS) {
        if (resolved[key] !== undefined) continue;

        const perKeyValue = docsTable[PER_KEY_PATH_KEYS[key]];
        if (isNonEmptyString(perKeyValue)) {
          resolved[key] = {
            path: resolvePath(projectRoot, perKeyValue),
            layer: 'bmadmcp-config',
          };
        }
      }

      const planningDir = docsTable.planning_dir;
      if (isNonEmptyString(planningDir)) {
        for (const key of DOC_KEYS) {
          if (resolved[key] !== undefined) continue;

          resolved[key] = {
            path: resolvePath(
              projectRoot,
              join(planningDir, DEFAULT_FILENAMES[key]),
            ),
            layer: 'bmadmcp-config',
          };
        }
      } else if (
        'planning_dir' in docsTable &&
        planningDir !== undefined &&
        !isNonEmptyString(planningDir)
      ) {
        // planning_dir is present but not a non-empty string
        const typeName = Array.isArray(planningDir)
          ? 'object'
          : typeof planningDir;
        warnings.push(
          `${bmadmcpPath} [docs].planning_dir: expected non-empty string, got ${typeName}; ignoring this layer`,
        );
      }

      // Warn for any per-key path that is present but not a non-empty string
      for (const key of DOC_KEYS) {
        if (resolved[key] !== undefined) continue;

        const perKeyValue = docsTable[PER_KEY_PATH_KEYS[key]];
        if (
          PER_KEY_PATH_KEYS[key] in docsTable &&
          perKeyValue !== undefined &&
          !isNonEmptyString(perKeyValue)
        ) {
          warnings.push(
            `${bmadmcpPath} [docs].${PER_KEY_PATH_KEYS[key]}: expected non-empty string, got ${typeof perKeyValue}; ignoring this layer for key '${key}'`,
          );
        }
      }
    }
  }

  // Layer 2: BMAD official config (4-layer merge)
  const bmadDir = resolveBmadDir(projectRoot);
  if (bmadDir !== null) {
    const bmadFiles = [
      join(bmadDir, 'config.toml'),
      join(bmadDir, 'config.user.toml'),
      join(bmadDir, 'custom', 'config.toml'),
      join(bmadDir, 'custom', 'config.user.toml'),
    ];

    let mergedBmm: Record<string, unknown> | undefined;

    for (const filePath of bmadFiles) {
      const result = loadToml(filePath);
      if (result.kind === 'missing') {
        continue;
      }
      if (result.kind === 'malformed') {
        warnings.push(
          `${result.path}: malformed TOML — ${result.error.message}; skipping this BMAD config layer`,
        );
        continue;
      }

      const bmm = (result.data as { bmm?: unknown }).bmm;
      if (typeof bmm === 'object' && bmm !== null && !Array.isArray(bmm)) {
        mergedBmm = mergedBmm
          ? mergeTables(mergedBmm, bmm as Record<string, unknown>)
          : { ...(bmm as Record<string, unknown>) };
      }
    }

    if (mergedBmm !== undefined) {
      const planningArtifacts = mergedBmm.planning_artifacts;
      if (isNonEmptyString(planningArtifacts)) {
        for (const key of DOC_KEYS) {
          if (resolved[key] !== undefined) continue;

          resolved[key] = {
            path: resolvePath(
              projectRoot,
              join(planningArtifacts, DEFAULT_FILENAMES[key]),
            ),
            layer: 'bmad-config',
          };
        }
      } else if (
        'planning_artifacts' in mergedBmm &&
        planningArtifacts !== undefined &&
        !isNonEmptyString(planningArtifacts)
      ) {
        warnings.push(
          `${bmadDir}/config.toml chain [bmm].planning_artifacts: expected non-empty string, got ${typeof planningArtifacts}; falling back to default`,
        );
      }
    }
  }

  // Layer 3: default
  for (const key of DOC_KEYS) {
    if (resolved[key] !== undefined) continue;

    resolved[key] = {
      path: join(projectRoot, 'planning-artifacts', DEFAULT_FILENAMES[key]),
      layer: 'default',
    };
  }

  return {
    prd: resolved.prd!,
    architecture: resolved.architecture!,
    epics: resolved.epics!,
    warnings,
  };
}
