#!/usr/bin/env node
/**
 * Smoke-test harness for ClickUp cross-list parent/subtask (PRD R1 mitigation).
 *
 * Verifies whether ClickUp accepts a story as a subtask of an epic when the
 * two tasks live in different lists (story in sprint list, parent in backlog list).
 *
 * Supported transport: stdio only (stdio alone is sufficient proof for API capability).
 *
 * Usage:
 *   node scripts/smoke-clickup-cross-list.mjs [--keep-tasks]
 *
 * Environment:
 *   CLICKUP_API_KEY                (required) ClickUp personal token
 *   CLICKUP_TEAM_ID                (required) ClickUp workspace ID
 *   CLICKUP_SMOKE_BACKLOG_LIST_ID  (required) Target list for parent epic task
 *   CLICKUP_SMOKE_SPRINT_LIST_ID   (required) Target list for child story task
 *
 * Exit codes:
 *   0 — all assertions passed, cleanup succeeded
 *   1 — assertion failure, protocol error, server crash, or R1 materialization
 *   2 — missing/malformed env config (including same-list equality check)
 *   3 — round-trip passed but cleanup DELETE failed
 *
 * ⚠️  Workspace-toggle dependency (story-1-6-smoke-false-positive-risk):
 *     A SMOKE PASS from this harness is conditional on the workspace having
 *     ClickUp's "Tasks in Multiple Lists" ClickApp toggle ON. If the toggle
 *     is OFF, cross-list createTask is rejected with `400 — Parent not child
 *     of list, ECODE: ITEM_137` (observed during the EPIC-5 pilot, story 5-4).
 *     The harness does NOT inspect the toggle state directly — verify it in
 *     the ClickUp workspace UI before relying on a PASS as evidence that PRD
 *     §Risks R1 is mitigated. A PASS from one workspace does not transfer
 *     to another workspace whose toggle is OFF.
 */

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* ------------------------------------------------------------------ */
/* CLI parsing                                                         */
/* ------------------------------------------------------------------ */

const args = process.argv.slice(2);
const keepTasks = args.includes('--keep-tasks');
const unknownArgs = args.filter((a) => a !== '--keep-tasks');

if (unknownArgs.length > 0) {
  console.error(
    `Usage: node scripts/smoke-clickup-cross-list.mjs [--keep-tasks]\n\n` +
      `Example:\n` +
      `  CLICKUP_API_KEY=pk_... CLICKUP_TEAM_ID=... \\\n` +
      `  CLICKUP_SMOKE_BACKLOG_LIST_ID=... CLICKUP_SMOKE_SPRINT_LIST_ID=... \\\n` +
      `  node scripts/smoke-clickup-cross-list.mjs`,
  );
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Env validation                                                      */
/* ------------------------------------------------------------------ */

const requiredVars = [
  'CLICKUP_API_KEY',
  'CLICKUP_TEAM_ID',
  'CLICKUP_SMOKE_BACKLOG_LIST_ID',
  'CLICKUP_SMOKE_SPRINT_LIST_ID',
];
const missing = requiredVars.filter((v) => !process.env[v]?.trim());

if (missing.length > 0) {
  console.error(
    `SMOKE FAIL cross-list step=env reason="Missing required environment variables: ${missing.join(', ')}"`,
  );
  process.exit(2);
}

const apiKey = process.env.CLICKUP_API_KEY.trim();
const backlogListId = process.env.CLICKUP_SMOKE_BACKLOG_LIST_ID.trim();
const sprintListId = process.env.CLICKUP_SMOKE_SPRINT_LIST_ID.trim();

if (backlogListId === sprintListId) {
  console.error(
    `SMOKE FAIL cross-list step=env reason="backlog and sprint list IDs must differ — same-list subtask is story 1.5's CRUD scope, not cross-list"`,
  );
  process.exit(2);
}

/* ------------------------------------------------------------------ */
/* Unique task names                                                   */
/* ------------------------------------------------------------------ */

const suffix = randomBytes(4).toString('base64url').slice(0, 6);
const isoTs = new Date().toISOString();
const epicName = `[bmad-smoke-x] epic ${isoTs}-${suffix}`;
const storyName = `[bmad-smoke-x] story ${isoTs}-${suffix}`;

console.error(`[smoke-x] Generating tasks:`);
console.error(`[smoke-x]   Epic:  ${epicName}`);
console.error(`[smoke-x]   Story: ${storyName}`);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

let nextId = 0;

/**
 * @param {string} step
 * @param {string} msg
 */
function log(step, msg) {
  console.error(`[smoke-x][${step}] ${msg}`);
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function parseStatuses(text) {
  const match = text.match(
    /Valid status names for createTask\/updateTask: (.+)/,
  );
  if (match) {
    return match[1].split(',').map((s) => s.trim());
  }
  const bulletMatches = text.matchAll(/^\s+-\s+(.+?)\s*\(/gm);
  const statuses = [];
  for (const m of bulletMatches) {
    statuses.push(m[1].trim());
  }
  return statuses;
}

/* ------------------------------------------------------------------ */
/* JSON-RPC Stdio Client                                               */
/* ------------------------------------------------------------------ */

class StdioClient {
  constructor() {
    this.child = spawn('node', [join(__dirname, '..', 'build', 'index.js')], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    this.rl = createInterface({
      input: this.child.stdout,
      crlfDelay: Infinity,
    });
    /** @type {Map<number, {resolve: Function, reject: Function, request: object}>} */
    this.pending = new Map();
    /** @type {{request: object, response: object} | undefined} */
    this.lastExchange = undefined;

    this.rl.on('line', (line) => {
      if (!line.trim()) return;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        return;
      }
      const cb = this.pending.get(msg.id);
      if (!cb) return;
      this.pending.delete(msg.id);
      this.lastExchange = { request: cb.request, response: msg };
      if (msg.error) cb.reject(new Error(msg.error.message));
      else cb.resolve(msg.result);
    });

    this.child.on('error', (err) => {
      console.error(`[smoke-x][a] child process error: ${err.message}`);
      for (const cb of this.pending.values()) {
        cb.reject(new Error(`child process error: ${err.message}`));
      }
      this.pending.clear();
    });

    this.child.on('exit', (code) => {
      if (this.pending.size > 0) {
        for (const cb of this.pending.values()) {
          cb.reject(new Error(`child process exited with code ${code}`));
        }
        this.pending.clear();
      }
    });
  }

  /**
   * @param {string} method
   * @param {object} params
   * @returns {Promise<object>}
   */
  async rpc(method, params) {
    const id = ++nextId;
    const payload = { jsonrpc: '2.0', id, method, params };
    this.child.stdin.write(JSON.stringify(payload) + '\n');
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, request: payload });
    });
  }

  async close() {
    this.child.stdin.end();
    this.rl.close();
    this.child.kill('SIGTERM');
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        this.child.kill('SIGKILL');
        resolve(undefined);
      }, 3000);
      this.child.on('exit', () => {
        clearTimeout(t);
        resolve(undefined);
      });
    });
  }
}

/* ------------------------------------------------------------------ */
/* Main harness                                                        */
/* ------------------------------------------------------------------ */

async function main() {
  const startTime = process.hrtime.bigint();
  let client;
  let backlogStatus = '';
  let sprintStatus = '';
  let epicId = '';
  let storyId = '';

  /**
   * @param {string} stepLetter
   * @param {() => Promise<void>} fn
   */
  async function step(stepLetter, fn) {
    try {
      await fn();
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const elapsed = Number(process.hrtime.bigint() - startTime) / 1_000_000;
      if (client && client.lastExchange) {
        console.error('--- failing request ---');
        console.error(JSON.stringify(client.lastExchange.request, null, 2));
        console.error('--- failing response ---');
        console.error(JSON.stringify(client.lastExchange.response, null, 2));
      }
      console.error(
        `SMOKE FAIL cross-list step=${stepLetter} reason="${reason}" elapsed_ms=${Math.round(elapsed)}`,
      );
      if (client) await client.close();
      process.exit(1);
    }
  }

  /**
   * @param {string} name
   * @param {object} args
   * @returns {Promise<{text: string}>}
   */
  async function callTool(name, args) {
    const result = await client.rpc('tools/call', { name, arguments: args });
    const text = result?.content?.[0]?.text;
    if (typeof text !== 'string') {
      throw new Error(`tool ${name} returned invalid content shape`);
    }
    return { text };
  }

  // a. Boot server
  await step('a', async () => {
    client = new StdioClient();
    log('a', 'spawned stdio server');
  });

  // b. initialize
  await step('b', async () => {
    const initResult = await client.rpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'bmad-smoke-x', version: '1.0.0' },
    });
    if (!initResult?.capabilities?.tools) {
      throw new Error('initialize response missing capabilities.tools');
    }
    log('b', 'initialize ok');
  });

  // c. tools/list
  await step('c', async () => {
    const toolsResult = await client.rpc('tools/list', {});
    const toolNames = toolsResult?.tools?.map((t) => t.name) ?? [];
    const required = ['bmad', 'createTask', 'getTaskById', 'getListInfo'];
    const missingTools = required.filter((n) => !toolNames.includes(n));
    if (missingTools.length > 0) {
      throw new Error(
        `ClickUp tools not registered — verify CLICKUP_API_KEY / CLICKUP_TEAM_ID and that story 1.5's ensureInitialized fix is on main`,
      );
    }
    log(
      'c',
      `tools/list returned ${toolNames.length} tools including ${required.join(', ')}`,
    );
  });

  // d. getListInfo (backlog)
  await step('d', async () => {
    const { text } = await callTool('getListInfo', { list_id: backlogListId });
    const statuses = parseStatuses(text);
    if (statuses.length === 0) {
      throw new Error('backlog list returned no statuses — verify list ID');
    }
    backlogStatus = statuses[0];
    log('d', `backlog list status="${backlogStatus}"`);
  });

  // e. getListInfo (sprint)
  await step('e', async () => {
    const { text } = await callTool('getListInfo', { list_id: sprintListId });
    const statuses = parseStatuses(text);
    if (statuses.length === 0) {
      throw new Error('sprint list returned no statuses — verify list ID');
    }
    sprintStatus = statuses[0];
    log('e', `sprint list status="${sprintStatus}"`);
  });

  // f. createTask (epic)
  await step('f', async () => {
    const { text } = await callTool('createTask', {
      list_id: backlogListId,
      name: epicName,
      description:
        'smoke-cross-list epic (parent) from bmad-mcp-server story 1-6',
      status: backlogStatus,
    });
    const match = text.match(/^task_id:\s*(\S+)\s*$/m);
    epicId = match ? match[1] : undefined;
    if (!epicId) {
      throw new Error('createTask (epic) response did not contain task_id');
    }
    log('f', `created epic ${epicId} in list ${backlogListId}`);
  });

  // g. createTask (story as subtask)
  await step('g', async () => {
    const result = await client.rpc('tools/call', {
      name: 'createTask',
      arguments: {
        list_id: sprintListId,
        parent_task_id: epicId,
        name: storyName,
        description:
          'smoke-cross-list story (subtask) from bmad-mcp-server story 1-6',
        status: sprintStatus,
      },
    });
    const text = result?.content?.[0]?.text ?? '';
    if (text.includes('Error creating task:')) {
      throw new Error(
        `R1 Materialization: ClickUp rejected cross-list create: ${text.split('\n')[0]}`,
      );
    }
    const match = text.match(/^task_id:\s*(\S+)\s*$/m);
    storyId = match ? match[1] : undefined;
    if (!storyId) {
      throw new Error('createTask (story) response did not contain task_id');
    }
    log(
      'g',
      `created story ${storyId} as subtask of ${epicId} in list ${sprintListId}`,
    );
  });

  // h. getTaskById (story)
  await step('h', async () => {
    const { text } = await callTool('getTaskById', { task_id: storyId });

    // list.id check
    const listMatch = text.match(/^list:\s*.+?\s*\((\S+)\)\s*$/m);
    if (!listMatch) {
      throw new Error(
        'could not parse list field from getTaskById response — upstream format may have changed',
      );
    }
    const reportedStoryListId = listMatch[1];
    if (reportedStoryListId !== sprintListId) {
      throw new Error(
        `cross-list placement not honored — child is in list ${reportedStoryListId}, expected ${sprintListId}`,
      );
    }

    // parent_task_id check
    const parentMatch = text.match(/^parent_task_id:\s*(\S+)\s*$/m);
    const reportedParentId = parentMatch ? parentMatch[1] : undefined;
    if (reportedParentId !== epicId) {
      throw new Error(
        `parent linkage not preserved — expected parent_task_id ${epicId}, got ${reportedParentId || 'missing'}`,
      );
    }

    // name check
    const nameMatch = text.match(/^name:\s*(.+)$/m);
    const reportedName = nameMatch ? nameMatch[1].trim() : undefined;
    if (reportedName !== storyName) {
      throw new Error(
        `name mismatch: expected "${storyName}", got "${reportedName}"`,
      );
    }

    log(
      'h',
      `story in sprint list (id=${sprintListId}), parent_task_id=${epicId}, name matches`,
    );
  });

  // i. getTaskById (epic)
  await step('i', async () => {
    const { text } = await callTool('getTaskById', { task_id: epicId });
    const childrenMatch = text.match(/^child_task_ids:\s*(.+)$/m);
    const childrenStr = childrenMatch ? childrenMatch[1] : '';
    const children = childrenStr.split(',').map((s) => s.trim());

    if (!children.includes(storyId)) {
      throw new Error(
        `parent does not report child — expected storyId ${storyId} in child_task_ids, got ${childrenStr || 'missing'}`,
      );
    }
    log('i', `epic reports story in child_task_ids`);
  });

  // j. Cleanup
  const elapsed = Number(process.hrtime.bigint() - startTime) / 1_000_000;
  let cleanupChildFailed = false;
  let cleanupParentFailed = false;

  if (!keepTasks) {
    // Delete child first
    const delStoryRes = await fetch(
      `https://api.clickup.com/api/v2/task/${storyId}`,
      {
        method: 'DELETE',
        headers: { Authorization: apiKey },
      },
    );
    if (!delStoryRes.ok) {
      const body = await delStoryRes.text().catch(() => '');
      console.error(
        `[smoke-x][j] cleanup child DELETE failed: ${delStoryRes.status} ${body}`,
      );
      cleanupChildFailed = true;
    } else {
      log('j', `deleted story ${storyId}`);
    }

    // Then delete parent
    const delEpicRes = await fetch(
      `https://api.clickup.com/api/v2/task/${epicId}`,
      {
        method: 'DELETE',
        headers: { Authorization: apiKey },
      },
    );
    if (!delEpicRes.ok) {
      const body = await delEpicRes.text().catch(() => '');
      console.error(
        `[smoke-x][j] cleanup parent DELETE failed: ${delEpicRes.status} ${body}`,
      );
      cleanupParentFailed = true;
    } else {
      log('j', `deleted epic ${epicId}`);
    }
  } else {
    log('j', 'skipped cleanup (--keep-tasks)');
  }

  const cleanupStatus =
    cleanupChildFailed || cleanupParentFailed
      ? ` (cleanup failed: child=${cleanupChildFailed ? 'y' : 'n'} parent=${cleanupParentFailed ? 'y' : 'n'})`
      : '';

  const summary = `SMOKE PASS cross-list epic_id=${epicId} story_id=${storyId} backlog_list=${backlogListId} sprint_list=${sprintListId} elapsed_ms=${Math.round(elapsed)}${cleanupStatus}`;
  console.error(summary);
  console.error(
    `[smoke-x][warn] PASS is conditional on workspace ClickApp "Tasks in Multiple Lists" toggle = ON. Verify the toggle in the ClickUp workspace UI before treating this signal as PRD §Risks R1 mitigation. See story-1-6-smoke-false-positive-risk in planning-artifacts/friction-log.md.`,
  );

  await client.close();
  process.exit(cleanupChildFailed || cleanupParentFailed ? 3 : 0);
}

main().catch((err) => {
  console.error(
    `SMOKE FAIL cross-list step=unknown reason="${err instanceof Error ? err.message : String(err)}"`,
  );
  process.exit(1);
});
