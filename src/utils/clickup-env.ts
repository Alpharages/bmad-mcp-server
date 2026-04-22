/**
 * ClickUp Environment Validator
 *
 * Provides pure-function validation for ClickUp environment variables
 * with structured diagnostic output for missing variables and non-fatal
 * warnings for format anomalies.
 */

export type ClickUpMode = 'read-minimal' | 'read' | 'write';

export type ClickUpEnvResult =
  | {
      kind: 'ok';
      apiKey: string;
      teamId: string;
      mode: ClickUpMode;
      warnings: readonly string[];
    }
  | {
      kind: 'disabled';
      missing: readonly ('CLICKUP_API_KEY' | 'CLICKUP_TEAM_ID')[];
      warnings: readonly string[];
      diagnostic: string;
    }
;

/**
 * Validates ClickUp environment variables from an injected env map.
 * Pure function: no side effects (no logging, no process.exit).
 */
export function validateClickUpEnv(
  env: Readonly<NodeJS.ProcessEnv> = process.env,
): ClickUpEnvResult {
  const warnings: string[] = [];
  const missing: ('CLICKUP_API_KEY' | 'CLICKUP_TEAM_ID')[] = [];

  const rawApiKey = (env.CLICKUP_API_KEY ?? '').trim();
  const rawTeamId = (env.CLICKUP_TEAM_ID ?? '').trim();

  if (!rawApiKey) missing.push('CLICKUP_API_KEY');
  if (!rawTeamId) missing.push('CLICKUP_TEAM_ID');

  // Mode resolution
  const modeRaw = (env.CLICKUP_MCP_MODE ?? '').trim().toLowerCase();
  let mode: ClickUpMode = 'write';
  if (modeRaw === 'read-minimal' || modeRaw === 'read' || modeRaw === 'write') {
    mode = modeRaw as ClickUpMode;
  } else if (modeRaw) {
    warnings.push(
      `CLICKUP_MCP_MODE="${modeRaw}" is not recognized; using default "write" (valid: read-minimal, read, write)`,
    );
  }

  const requireClickUp = /^(1|true)$/i.test(
    (env.BMAD_REQUIRE_CLICKUP ?? '').trim(),
  );

  if (missing.length > 0) {
    return {
      kind: 'disabled',
      missing,
      warnings,
      diagnostic: buildDiagnostic(missing, requireClickUp),
    };
  }

  // Format warnings for 'ok' result
  if (!rawApiKey.startsWith('pk_')) {
    warnings.push(
      'CLICKUP_API_KEY does not start with "pk_"; upstream docs note personal tokens usually do — double-check at Profile → Settings → Apps → API Token',
    );
  }
  if (/\D/.test(rawTeamId)) {
    warnings.push(
      `CLICKUP_TEAM_ID="${rawTeamId}" contains non-digit characters; upstream docs describe team ID as a 7–10 digit number`,
    );
  }

  return {
    kind: 'ok',
    apiKey: rawApiKey,
    teamId: rawTeamId,
    mode,
    warnings,
  };
}

function buildDiagnostic(
  missing: ('CLICKUP_API_KEY' | 'CLICKUP_TEAM_ID')[],
  requireClickUp: boolean,
): string {
  const lines: string[] = [
    'ClickUp tools disabled — missing required environment variables:',
  ];

  if (missing.includes('CLICKUP_API_KEY')) {
    lines.push(
      '  - CLICKUP_API_KEY: per-user ClickUp personal token (usually starts with "pk_")',
      '      Obtain at: Profile Icon → Settings → Apps → API Token',
    );
  }
  if (missing.includes('CLICKUP_TEAM_ID')) {
    lines.push(
      '  - CLICKUP_TEAM_ID: workspace ID (7–10 digit number)',
      '      Obtain at: the number in the URL while on any ClickUp settings page',
    );
  }

  lines.push(
    '',
    'To enable, set the missing variable(s) in your environment (or .env file for local dev)',
    'and restart the server. See .env.example for the canonical list of supported vars.',
    '',
  );

  if (requireClickUp) {
    lines.push('Refusing to start — BMAD_REQUIRE_CLICKUP=1');
  } else {
    lines.push(
      'Running in BMAD-only mode: the `bmad` tool remains fully available.',
    );
  }

  return lines.join('\n');
}
