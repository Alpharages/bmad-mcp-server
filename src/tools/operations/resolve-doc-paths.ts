/**
 * BMAD Resolve Doc Paths Operation
 *
 * Resolves PRD/architecture/epics doc paths via the EPIC-6 cascade:
 * .bmadmcp/config.toml [docs] → BMAD _bmad/config.toml chain → default.
 * This operation is READ-ONLY and has no side effects beyond logging warnings.
 */

import { isAbsolute } from 'node:path';
import type { BMADEngine, BMADResult } from '../../core/bmad-engine.js';

/**
 * Parameters for resolve-doc-paths operation
 */
export interface ResolveDocPathsParams {
  /**
   * Absolute project root to resolve paths against. Optional —
   * when omitted the operation defaults to the engine's configured
   * project root (see BMADEngine.getProjectRoot).
   */
  projectRoot?: string;
}

/**
 * Execute resolve-doc-paths operation
 *
 * @param engine - BMAD Engine instance
 * @param params - Resolve doc paths operation parameters
 * @returns BMADResult with resolved paths
 */
export async function executeResolveDocPathsOperation(
  engine: BMADEngine,
  params: ResolveDocPathsParams,
): Promise<BMADResult> {
  const resolvedProjectRoot =
    params.projectRoot !== undefined
      ? params.projectRoot
      : engine.getProjectRoot();

  try {
    const result = await engine.resolveDocPaths(resolvedProjectRoot);

    const lines: string[] = [
      `Resolved doc paths (project root: ${resolvedProjectRoot})`,
      '',
      `- prd: ${result.prd.path} [${result.prd.layer}]`,
      `- architecture: ${result.architecture.path} [${result.architecture.layer}]`,
      `- epics: ${result.epics.path} [${result.epics.layer}]`,
    ];

    if (result.warnings.length > 0) {
      lines.push('', `Warnings (${result.warnings.length}):`);
      for (const warning of result.warnings) {
        lines.push(`- ${warning}`);
      }
    }

    return {
      success: true,
      data: {
        prd: result.prd,
        architecture: result.architecture,
        epics: result.epics,
        warnings: result.warnings,
        projectRoot: resolvedProjectRoot,
      },
      text: lines.join('\n') + '\n',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      text: '',
    };
  }
}

/**
 * Validate resolve-doc-paths operation parameters
 *
 * @param params - Parameters to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateResolveDocPathsParams(
  params: unknown,
): string | undefined {
  if (params === undefined) {
    return undefined;
  }

  if (typeof params !== 'object' || params === null || Array.isArray(params)) {
    return 'Parameters must be an object';
  }

  const p = params as Partial<ResolveDocPathsParams>;

  if (p.projectRoot !== undefined) {
    if (typeof p.projectRoot !== 'string') {
      return 'Parameter "projectRoot" must be a string';
    }

    if (p.projectRoot.length === 0) {
      return 'Parameter "projectRoot" cannot be empty';
    }

    if (!isAbsolute(p.projectRoot)) {
      return `Parameter "projectRoot" must be an absolute path, got "${p.projectRoot}"`;
    }
  }

  return undefined;
}

/**
 * Get usage examples for resolve-doc-paths operation
 */
export function getResolveDocPathsExamples(): string[] {
  return [
    'Default (server project root): { operation: "resolve-doc-paths" }',
    'Specific project: { operation: "resolve-doc-paths", projectRoot: "/abs/path/to/project" }',
    'After configuring .bmadmcp/config.toml [docs].prd_path: { operation: "resolve-doc-paths" }',
    'After configuring _bmad/config.toml [bmm].planning_artifacts: { operation: "resolve-doc-paths" }',
  ];
}
