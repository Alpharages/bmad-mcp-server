import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { BMADServerLiteMultiToolGit } from './server.js';
import { validateClickUpEnv, type ClickUpMode, type ClickUpSessionCredentials } from './utils/clickup-env.js';

interface Session {
  transport: StreamableHTTPServerTransport;
  credentials?: ClickUpSessionCredentials;
}

const sessions = new Map<string, Session>();

type RunWithCredsFn = <T>(creds: ClickUpSessionCredentials, fn: () => T) => T;
let runWithClickUpCredentials: RunWithCredsFn | null = null;

async function ensureRunWithCredentials(): Promise<RunWithCredsFn | null> {
  if (runWithClickUpCredentials !== null) return runWithClickUpCredentials;
  try {
    const mod = await import('./tools/clickup/src/shared/config.js') as {
      runWithClickUpCredentials?: RunWithCredsFn;
    };
    runWithClickUpCredentials = mod.runWithClickUpCredentials ?? null;
  } catch {
    // ClickUp bundle not available
  }
  return runWithClickUpCredentials;
}

function extractClickUpCredentials(req: IncomingMessage): ClickUpSessionCredentials | undefined {
  const apiKey = (req.headers['x-clickup-api-key'] as string | undefined)?.trim();
  const teamId = (req.headers['x-clickup-team-id'] as string | undefined)?.trim();
  if (!apiKey || !teamId) return undefined;
  const modeRaw = (req.headers['x-clickup-mode'] as string | undefined)?.trim().toLowerCase();
  const mode: ClickUpMode =
    modeRaw === 'read-minimal' || modeRaw === 'read' || modeRaw === 'write'
      ? modeRaw
      : 'write';
  return { apiKey, teamId, mode };
}

function authenticate(req: IncomingMessage): boolean {
  const apiKey = process.env.BMAD_API_KEY;
  if (!apiKey) return true;

  const auth = req.headers['authorization'];
  if (auth?.startsWith('Bearer ')) return auth.slice(7) === apiKey;

  const xKey = req.headers['x-api-key'];
  if (typeof xKey === 'string') return xKey === apiKey;

  return false;
}

function sendJSON(res: ServerResponse, status: number, body: object): void {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(data);
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : undefined);
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

const gitRemotes = process.argv.slice(2).filter((a) => a.startsWith('git+'));
const _serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = process.env.BMAD_ROOT ?? _serverRoot;

async function handleMcp(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method === 'POST') {
    let body: unknown;
    try {
      body = await readBody(req);
    } catch {
      sendJSON(res, 400, { error: 'Invalid JSON body' });
      return;
    }

    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      const run = session.credentials ? await ensureRunWithCredentials() : null;
      if (run && session.credentials) {
        await run(session.credentials, () => session.transport.handleRequest(req, res, body));
      } else {
        await session.transport.handleRequest(req, res, body);
      }
      return;
    }

    if (isInitializeRequest(body)) {
      const credentials = extractClickUpCredentials(req);
      const transport: StreamableHTTPServerTransport =
        new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            sessions.set(id, { transport, credentials });
          },
          onsessionclosed: (id) => {
            sessions.delete(id);
          },
        });

      const bmadServer = new BMADServerLiteMultiToolGit(
        projectRoot,
        gitRemotes,
        credentials,
      );
      const run = credentials ? await ensureRunWithCredentials() : null;
      const initAndHandle = async () => {
        await bmadServer.connect(transport);
        await transport.handleRequest(req, res, body);
      };
      if (run && credentials) {
        await run(credentials, initAndHandle);
      } else {
        await initAndHandle();
      }
      return;
    }

    sendJSON(res, 400, { error: 'Bad request: missing or invalid session' });
    return;
  }

  if (req.method === 'GET' || req.method === 'DELETE') {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !sessions.has(sessionId)) {
      sendJSON(res, 404, { error: 'Session not found' });
      return;
    }
    const session = sessions.get(sessionId)!;
    const run = session.credentials ? await ensureRunWithCredentials() : null;
    if (run && session.credentials) {
      await run(session.credentials, () => session.transport.handleRequest(req, res));
    } else {
      await session.transport.handleRequest(req, res);
    }
    return;
  }

  sendJSON(res, 405, { error: 'Method not allowed' });
}

export function startHttpServer(): void {
  const port = parseInt(process.env.PORT ?? '3000', 10);

  const httpServer = createServer(
    (req: IncomingMessage, res: ServerResponse) => {
      (async () => {
        try {
          const pathname = req.url?.split('?')[0] ?? '/';

          if (pathname === '/health') {
            sendJSON(res, 200, { status: 'ok', sessions: sessions.size });
            return;
          }

          if (!authenticate(req)) {
            sendJSON(res, 401, { error: 'Unauthorized' });
            return;
          }

          if (pathname === '/mcp') {
            await handleMcp(req, res);
            return;
          }

          sendJSON(res, 404, { error: 'Not found' });
        } catch (err) {
          console.error('Request error:', err);
          if (!res.headersSent)
            sendJSON(res, 500, { error: 'Internal server error' });
        }
      })().catch((err) => {
        console.error('Unhandled request promise rejection:', err);
        if (!res.headersSent) {
          try {
            sendJSON(res, 500, { error: 'Internal server error' });
          } catch {
            // Response already closed — give up.
          }
        }
      });
    },
  );

  // `listen` errors (EADDRINUSE, bind failures) are emitted asynchronously
  // on the 'error' event — the listen callback only fires on success. Without
  // an explicit listener, Node crashes with "unhandled error event".
  httpServer.on('error', (err) => {
    console.error('HTTP server error:', err);
    process.exit(1);
  });

  const clickUpEnv = validateClickUpEnv();
  const requireClickUp = /^(1|true)$/i.test(
    (process.env.BMAD_REQUIRE_CLICKUP ?? '').trim(),
  );

  if (clickUpEnv.kind !== 'ok') {
    console.error(clickUpEnv.diagnostic);
    if (requireClickUp) {
      process.exit(1);
    }
  } else {
    for (const w of clickUpEnv.warnings) {
      console.error(`ClickUp env warning: ${w}`);
    }
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.error(`BMAD MCP HTTP Server listening on port ${port}`);
    console.error(`MCP endpoint: http://0.0.0.0:${port}/mcp`);
    console.error(`Health check: http://0.0.0.0:${port}/health`);
    if (!process.env.BMAD_API_KEY) {
      console.error(
        'WARNING: BMAD_API_KEY not set — server is open to all clients',
      );
    }
  });
}
