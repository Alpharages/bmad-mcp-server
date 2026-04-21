#!/usr/bin/env node
/**
 * Smoke-test harness for ClickUp CRUD round-trip via BMAD MCP Server.
 *
 * Validates the full flow: initialize → tools/list → getListInfo → createTask →
 * getTaskById → addComment → updateTask(status) → getTaskById → DELETE cleanup,
 * across both stdio and HTTP transports.
 *
 * Usage:
 *   node scripts/smoke-clickup-crud.mjs <stdio|http> [--keep-task]
 *
 * Environment:
 *   CLICKUP_API_KEY        (required) ClickUp personal token
 *   CLICKUP_TEAM_ID        (required) ClickUp workspace ID
 *   CLICKUP_SMOKE_LIST_ID  (required) Target list for smoke task
 *   CLICKUP_SMOKE_PORT     (optional) HTTP port; default 3456
 *   BMAD_API_KEY           (optional) Sent as x-api-key in HTTP mode
 *
 * Exit codes:
 *   0 — all assertions passed, cleanup succeeded
 *   1 — assertion failure, protocol error, or server crash
 *   2 — missing required env var
 *   3 — CRUD passed but cleanup DELETE failed
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

const transport = process.argv[2];
const keepTask = process.argv.includes('--keep-task');

if (!['stdio', 'http'].includes(transport)) {
  console.error(
    `Usage: node ${process.argv[1]} <stdio|http> [--keep-task]\n\n` +
      `Environment:\n` +
      `  CLICKUP_API_KEY=pk_... CLICKUP_TEAM_ID=... CLICKUP_SMOKE_LIST_ID=... npm run smoke:clickup\n` +
      `  CLICKUP_API_KEY=pk_... CLICKUP_TEAM_ID=... CLICKUP_SMOKE_LIST_ID=... npm run smoke:clickup:http`,
  );
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Env validation                                                      */
/* ------------------------------------------------------------------ */

const requiredVars = [
  'CLICKUP_API_KEY',
  'CLICKUP_TEAM_ID',
  'CLICKUP_SMOKE_LIST_ID',
];
const missing = requiredVars.filter((v) => !process.env[v]?.trim());

if (missing.length > 0) {
  console.error(
    `SMOKE FAIL transport=${transport} step=env reason="Missing required environment variables: ${missing.join(', ')}"`,
  );
  process.exit(2);
}

const apiKey = process.env.CLICKUP_API_KEY.trim();
const listId = process.env.CLICKUP_SMOKE_LIST_ID.trim();
const httpPort = parseInt(process.env.CLICKUP_SMOKE_PORT ?? '3456', 10);
const bmadApiKey = process.env.BMAD_API_KEY?.trim();

/* ------------------------------------------------------------------ */
/* Unique task name                                                    */
/* ------------------------------------------------------------------ */

const smokeName = `[bmad-smoke] CRUD roundtrip ${new Date().toISOString()}-${randomBytes(4).toString('base64url').slice(0, 6)}`;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

let nextId = 0;

/**
 * @param {string} step
 * @param {string} msg
 */
function log(step, msg) {
  console.error(`[smoke][${transport}][${step}] ${msg}`);
}

/**
 * @param {string} text
 * @param {string} linePrefix
 * @returns {string | undefined}
 */
function extractLine(text, linePrefix) {
  const lines = text.split('\n');
  const line = lines.find((l) => l.trim().startsWith(linePrefix));
  return line ? line.slice(linePrefix.length).trim() : undefined;
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function parseStatuses(text) {
  // Primary: "Valid status names for createTask/updateTask: status1, status2"
  const match = text.match(
    /Valid status names for createTask\/updateTask: (.+)/,
  );
  if (match) {
    return match[1].split(',').map((s) => s.trim());
  }
  // Fallback: bullet list "  - status (type)"
  const bulletMatches = text.matchAll(/^\s+-\s+(.+?)\s*\(/gm);
  const statuses = [];
  for (const m of bulletMatches) {
    statuses.push(m[1].trim());
  }
  return statuses;
}

/* ------------------------------------------------------------------ */
/* Transport-specific JSON-RPC clients                                 */
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
    /** @type {Map<number, {resolve: Function, reject: Function}>} */
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
      console.error(
        `[smoke][${transport}][a] child process error: ${err.message}`,
      );
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

class HttpClient {
  constructor() {
    this.baseUrl = `http://127.0.0.1:${httpPort}/mcp`;
    /** @type {string} */
    this.sessionId = '';
    /** @type {{request: object, response: object} | undefined} */
    this.lastExchange = undefined;
  }

  /**
   * @param {string} method
   * @param {object} params
   * @returns {Promise<object>}
   */
  async rpc(method, params) {
    const id = ++nextId;
    const payload = { jsonrpc: '2.0', id, method, params };
    /** @type {Record<string, string>} */
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }
    if (bmadApiKey) {
      headers['x-api-key'] = bmadApiKey;
    }

    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (method === 'initialize') {
      const sid = res.headers.get('mcp-session-id');
      if (sid) this.sessionId = sid;
    }

    const msg = await res.json().catch(() => ({}));
    this.lastExchange = { request: payload, response: msg };
    if (msg.error) {
      throw new Error(msg.error.message);
    }
    return msg.result;
  }
}

/* ------------------------------------------------------------------ */
/* Main harness                                                        */
/* ------------------------------------------------------------------ */

async function main() {
  const startTime = process.hrtime.bigint();
  /** @type {StdioClient | HttpClient | undefined} */
  let client;
  /** @type {import('node:child_process').ChildProcess | undefined} */
  let child;
  let taskId = '';
  let commentId = '';
  let statusFrom = '';
  let statusTo = '';
  /**
   * @param {string} step
   * @param {() => Promise<void>} fn
   */
  async function step(step, fn) {
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
        `SMOKE FAIL transport=${transport} step=${step} reason="${reason}" elapsed_ms=${Math.round(elapsed)}`,
      );
      await teardown(client, child);
      process.exit(1);
    }
  }

  await step('a', async () => {
    if (transport === 'stdio') {
      client = new StdioClient();
      log('a', 'spawned stdio server');
    } else {
      client = new HttpClient();
      child = spawn('node', [join(__dirname, '..', 'build', 'index-http.js')], {
        stdio: ['ignore', 'ignore', 'inherit'],
        env: { ...process.env, PORT: String(httpPort) },
      });

      await new Promise((resolve, reject) => {
        const t = setTimeout(() => {
          reject(
            new Error(
              `port ${httpPort} already in use — set CLICKUP_SMOKE_PORT`,
            ),
          );
        }, 10000);

        const check = setInterval(() => {
          fetch(`http://127.0.0.1:${httpPort}/health`)
            .then((res) => {
              if (res.ok) {
                clearInterval(check);
                clearTimeout(t);
                resolve(undefined);
              }
            })
            .catch(() => {
              /* still waiting */
            });
        }, 200);
      });
      log('a', `HTTP server ready on port ${httpPort}`);
    }
  });

  await step('b', async () => {
    const initResult = await client.rpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'bmad-smoke', version: '1.0.0' },
    });
    if (!initResult?.capabilities?.tools) {
      throw new Error('initialize response missing capabilities.tools');
    }
    log('b', 'initialize ok');
  });

  await step('c', async () => {
    const toolsResult = await client.rpc('tools/list', {});
    const toolNames = toolsResult?.tools?.map((t) => t.name) ?? [];
    const required = [
      'bmad',
      'createTask',
      'addComment',
      'updateTask',
      'getTaskById',
      'getListInfo',
    ];
    const missingTools = required.filter((n) => !toolNames.includes(n));
    if (missingTools.length > 0) {
      throw new Error(
        `tools/list missing required tools: ${missingTools.join(', ')} — ` +
          `ClickUp tools not registered — verify CLICKUP_API_KEY / CLICKUP_TEAM_ID`,
      );
    }
    const pickSpaceInfo = toolNames.includes('pickSpace') ? ', pickSpace' : '';
    log(
      'c',
      `tools/list returned ${toolNames.length} tools including ${required.slice(1).join(', ')}${pickSpaceInfo}`,
    );
  });

  await step('d', async () => {
    const listResult = await client.rpc('tools/call', {
      name: 'getListInfo',
      arguments: { list_id: listId },
    });
    const listText = listResult?.content?.[0]?.text ?? '';
    const statuses = parseStatuses(listText);
    if (statuses.length < 2) {
      throw new Error(
        `list has ${statuses.length} statuses — cannot validate status transition`,
      );
    }
    statusFrom = statuses[0];
    statusTo =
      statuses.find((s) => s.toLowerCase() === 'in progress') ?? statuses[1];
    log(
      'd',
      `list has ${statuses.length} statuses; from="${statusFrom}" to="${statusTo}"`,
    );
  });

  await step('e', async () => {
    const createResult = await client.rpc('tools/call', {
      name: 'createTask',
      arguments: {
        list_id: listId,
        name: smokeName,
        description: 'smoke-roundtrip probe from bmad-mcp-server story 1-5',
        status: statusFrom,
      },
    });
    const createText = createResult?.content?.[0]?.text ?? '';
    taskId = extractLine(createText, 'task_id:');
    if (!taskId) {
      throw new Error('createTask response did not contain task_id');
    }
    log('e', `created task ${taskId}`);
  });

  await step('f', async () => {
    const getResult = await client.rpc('tools/call', {
      name: 'getTaskById',
      arguments: { id: taskId },
    });
    const getText = getResult?.content?.[0]?.text ?? '';
    const foundName = extractLine(getText, 'name:');
    const foundStatus = extractLine(getText, 'status:');
    if (foundName !== smokeName) {
      throw new Error(
        `getTaskById name mismatch: expected "${smokeName}", got "${foundName}"`,
      );
    }
    if (
      !foundStatus ||
      foundStatus.toLowerCase() !== statusFrom.toLowerCase()
    ) {
      throw new Error(
        `getTaskById status mismatch: expected "${statusFrom}", got "${foundStatus}"`,
      );
    }
    log('f', `getTaskById confirmed name and status "${statusFrom}"`);
  });

  await step('g', async () => {
    const commentIso = new Date().toISOString();
    const commentResult = await client.rpc('tools/call', {
      name: 'addComment',
      arguments: {
        task_id: taskId,
        comment: `smoke-roundtrip probe @ ${commentIso}`,
      },
    });
    const commentText = commentResult?.content?.[0]?.text ?? '';
    if (!commentText.includes('Comment added successfully')) {
      throw new Error('addComment did not report success');
    }
    commentId = extractLine(commentText, 'comment_id:');
    if (!commentId) {
      throw new Error('addComment response did not contain comment_id');
    }
    log('g', `added comment ${commentId}`);
  });

  await step('h', async () => {
    const updateResult = await client.rpc('tools/call', {
      name: 'updateTask',
      arguments: { task_id: taskId, status: statusTo },
    });
    const updateText = updateResult?.content?.[0]?.text ?? '';
    if (updateText.includes('Error updating task:')) {
      throw new Error('updateTask reported an error');
    }
    log('h', `updated task status to "${statusTo}"`);
  });

  await step('i', async () => {
    const get2Result = await client.rpc('tools/call', {
      name: 'getTaskById',
      arguments: { id: taskId },
    });
    const get2Text = get2Result?.content?.[0]?.text ?? '';
    const found2Status = extractLine(get2Text, 'status:');
    if (
      !found2Status ||
      found2Status.toLowerCase() !== statusTo.toLowerCase()
    ) {
      throw new Error(
        `getTaskById status mismatch after update: expected "${statusTo}", got "${found2Status}"`,
      );
    }
    log('i', `getTaskById confirmed status is now "${statusTo}"`);
  });

  await step('j', async () => {
    const elapsed = Number(process.hrtime.bigint() - startTime) / 1_000_000;
    let cleanupFailed = false;

    if (!keepTask) {
      const delRes = await fetch(
        `https://api.clickup.com/api/v2/task/${taskId}`,
        {
          method: 'DELETE',
          headers: { Authorization: apiKey },
        },
      );
      if (!delRes.ok) {
        const body = await delRes.text().catch(() => '');
        console.error(
          `[smoke][${transport}][j] cleanup DELETE failed: ${delRes.status} ${body}`,
        );
        cleanupFailed = true;
      } else {
        log('j', `deleted task ${taskId}`);
      }
    } else {
      log('j', 'skipped cleanup (--keep-task)');
    }

    const summary =
      `SMOKE PASS transport=${transport} task_id=${taskId} comment_id=${commentId} ` +
      `status_from="${statusFrom}" status_to="${statusTo}" elapsed_ms=${Math.round(elapsed)}` +
      (cleanupFailed ? ' (cleanup failed — task still present)' : '');
    console.error(summary);

    await teardown(client, child);
    process.exit(cleanupFailed ? 3 : 0);
  });
}

/**
 * @param {StdioClient | HttpClient | undefined} client
 * @param {import('node:child_process').ChildProcess | undefined} child
 */
async function teardown(client, child) {
  if (client && typeof client.close === 'function') {
    await client.close();
  }
  if (child) {
    child.kill('SIGTERM');
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        child.kill('SIGKILL');
        resolve(undefined);
      }, 3000);
      child.on('exit', () => {
        clearTimeout(t);
        resolve(undefined);
      });
    });
  }
}

main().catch((err) => {
  console.error(
    `SMOKE FAIL transport=${transport} step=unknown reason="${err instanceof Error ? err.message : String(err)}"`,
  );
  process.exit(1);
});
