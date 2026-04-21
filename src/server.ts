/**
 * BMAD MCP Server - Unified Tool Architecture
 *
 * Single 'bmad' tool powered by BMADEngine core, wired through the high-level
 * `McpServer` API so the vendored ClickUp `register*Tools` functions
 * (which call `server.tool(...)` / `server.registerResource(...)`) can
 * coexist on the same server instance.
 *
 * The `any`-cast calls on `server.tool` / `server.prompt` below are a
 * deliberate workaround for TS2589 (excessively-deep type instantiation)
 * that fires when the SDK's `ShapeOutput<>` generic is inferred over a
 * multi-key optional Zod shape. Both callsites pass legitimate schemas and
 * handlers — the cast only erases the deep generic, not type safety.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */

import {
  McpServer,
  ResourceTemplate,
  type RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { CompleteRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { SERVER_CONFIG } from './config.js';
import { BMADEngine } from './core/bmad-engine.js';
import {
  handleBMADTool,
  type BMADToolParams,
  createBMADTool,
} from './tools/index.js';
import { registerClickUpTools } from './tools/clickup-adapter.js';
import { ClickUpSessionState } from './tools/clickup-session.js';
import { logger } from './utils/logger.js';

export class BMADServerLiteMultiToolGit {
  private server: McpServer;
  private engine: BMADEngine;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private bmadToolHandle: RegisteredTool | undefined;
  private readonly clickUpSession = new ClickUpSessionState();

  constructor(projectRoot?: string, gitRemotes?: string[]) {
    this.engine = new BMADEngine(projectRoot, gitRemotes);
    this.server = new McpServer(
      {
        name: SERVER_CONFIG.name,
        version: SERVER_CONFIG.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {
            subscribe: false,
            listChanged: false,
          },
          prompts: {},
          completions: {},
        },
      },
    );
  }

  /**
   * Idempotent server initialization: initialize the engine and register every
   * BMAD surface (tool, resources, prompts, completions) plus any ClickUp
   * tools. Both `start()` (stdio) and `connect()` (HTTP) invoke this before
   * attaching a transport, so all surfaces are reachable on the first
   * `tools/list` / `prompts/list` request.
   *
   * Concurrency-safe via `initPromise`: first call creates the promise,
   * subsequent calls await the same promise. On rejection the promise is
   * cleared so the next call retries.
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInitialize().catch((err) => {
      this.initPromise = null;
      throw err;
    });
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    await this.initializeEngine();
    this.registerBmadTool();
    this.registerResources();
    this.registerPrompts();
    this.registerCompletionHandler();
    await this.registerClickUp();

    const gitPaths = this.engine.getLoader().getResolvedGitPaths();
    const agentCount = this.engine.getAgentMetadata().length;
    const workflowCount = this.engine.getWorkflowMetadata().length;
    const resourceCount = this.engine.getCachedResources().length;
    console.error(
      `Loaded ${agentCount} agents, ${workflowCount} workflows, ${resourceCount} resources`,
    );
    if (gitPaths.size > 0) {
      console.error(`Git remotes resolved: ${gitPaths.size}`);
    }
  }

  private async initializeEngine(): Promise<void> {
    if (this.initialized) return;
    await this.engine.initialize();
    this.initialized = true;
  }

  private registerBmadTool(): void {
    // Zod shape mirrors the JSON Schema emitted by `createBMADTool(...)` in
    // `src/tools/bmad-unified.ts`. AC #17 forbids edits to that file, so we
    // reproduce the same shape (enum for `module`, no `search` op by default,
    // `operation` required) here rather than re-deriving at runtime.
    // Explicit ZodRawShape annotation avoids TS2589 (excessively deep type
    // instantiation) that fires when McpServer.tool() tries to infer the
    // ShapeOutput over six conditional optionals.
    const bmadSchema: z.ZodRawShape = {
      operation: z
        .enum(['list', 'read', 'execute'])
        .describe(
          'Operation type:\n- list: Get available agents/workflows/modules\n- read: Inspect agent or workflow details (read-only)\n- execute: Run agent or workflow with user context (action)',
        ),
      module: z
        .enum(['core', 'bmm', 'cis'])
        .optional()
        .describe(
          'Optional module filter. Use to narrow scope or resolve name collisions.',
        ),
      agent: z
        .string()
        .optional()
        .describe(
          'Agent name (e.g., "analyst", "architect", "debug"). Required for read/execute operations with agents.',
        ),
      workflow: z
        .string()
        .optional()
        .describe(
          'Workflow name (e.g., "prd", "party-mode", "architecture"). Required for read/execute operations with workflows.',
        ),
      query: z
        .string()
        .optional()
        .describe(
          'For list operation: "agents", "workflows", "modules". Optionally filtered by module parameter.',
        ),
      message: z
        .string()
        .optional()
        .describe(
          "For execute operation: User's message, question, or context. Optional - some agents/workflows may work without an initial message.",
        ),
    };

    const richDescription =
      createBMADTool(
        this.engine.getAgentMetadata(),
        this.engine.getWorkflowMetadata(),
      ).description ?? '';

    this.bmadToolHandle = (this.server.tool as any)(
      'bmad',
      richDescription,
      bmadSchema,
      async (args: Record<string, unknown>, extra: any) => {
        // Heartbeat: upstream Story 1.2 Out-of-Scope required preserving the
        // pre-migration 3s progress notification so Claude Desktop doesn't
        // show a frozen spinner during first-call cold-start (Git clone,
        // engine init). Tool handlers registered via `server.tool()` receive
        // `_meta.progressToken` and `sendNotification` in `extra`.
        const progressToken = extra._meta?.progressToken;
        let heartbeat: ReturnType<typeof setInterval> | undefined;
        let progress = 0;
        if (progressToken !== undefined) {
          heartbeat = setInterval(() => {
            progress = Math.min(progress + 5, 90);
            void extra
              .sendNotification({
                method: 'notifications/progress',
                params: { progressToken, progress, total: 100 },
              })
              .catch(() => {
                /* client may not support progress */
              });
          }, 3000);
        }

        try {
          const result = await handleBMADTool(
            args as unknown as BMADToolParams,
            this.engine,
          );
          return result;
        } finally {
          if (heartbeat) clearInterval(heartbeat);
          if (progressToken !== undefined) {
            void extra
              .sendNotification({
                method: 'notifications/progress',
                params: { progressToken, progress: 100, total: 100 },
              })
              .catch(() => {
                /* ignore */
              });
          }
        }
      },
    );
  }

  private registerResources(): void {
    // Two virtual manifest resources (generated on read).
    this.server.resource(
      'Agent Manifest',
      'bmad://_cfg/agent-manifest.csv',
      {
        description: 'Virtual manifest of all loaded BMAD agents',
        mimeType: 'text/csv',
      },
      (uri) => ({
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'text/csv',
            text: this.engine.generateAgentManifest(),
          },
        ],
      }),
    );

    this.server.resource(
      'Workflow Manifest',
      'bmad://_cfg/workflow-manifest.csv',
      {
        description: 'Virtual manifest of all loaded BMAD workflows',
        mimeType: 'text/csv',
      },
      (uri) => ({
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'text/csv',
            text: this.engine.generateWorkflowManifest(),
          },
        ],
      }),
    );

    // "Coming soon" placeholders mirror the pre-migration handler so clients
    // that used to receive the explanatory error still do.
    this.server.resource(
      'Tool Manifest',
      'bmad://_cfg/tool-manifest.csv',
      {
        description:
          'Tool manifest generation not yet implemented - coming soon! This will provide virtual tool metadata from loaded BMAD modules.',
        mimeType: 'text/csv',
      },
      () => {
        throw new Error(
          'Tool manifest generation not yet implemented - coming soon! This will provide virtual tool metadata from loaded BMAD modules.',
        );
      },
    );

    this.server.resource(
      'Task Manifest',
      'bmad://_cfg/task-manifest.csv',
      {
        description:
          'Task manifest generation not yet implemented - coming soon! This will provide virtual task metadata from loaded BMAD modules.',
        mimeType: 'text/csv',
      },
      () => {
        throw new Error(
          'Task manifest generation not yet implemented - coming soon! This will provide virtual task metadata from loaded BMAD modules.',
        );
      },
    );

    // Seven resource templates matching the pre-migration
    // ListResourceTemplatesRequestSchema response byte-for-byte (AC #6 bullet 2).
    // `bmad://_cfg/agents/{agent}.customize.yaml` is the 7th — Story 1.2 AC #6
    // explicitly required it.
    const templatePatterns: Array<{
      template: string;
      name: string;
      description: string;
      mime: string;
    }> = [
      {
        template: 'bmad://{module}/agents/{agent}.md',
        name: 'Agent Source',
        description: 'Agent markdown source file',
        mime: 'text/markdown',
      },
      {
        template: 'bmad://{module}/workflows/{workflow}/workflow.yaml',
        name: 'Workflow Definition',
        description: 'Workflow YAML configuration',
        mime: 'application/x-yaml',
      },
      {
        template: 'bmad://{module}/workflows/{workflow}/instructions.md',
        name: 'Workflow Instructions',
        description: 'Workflow instruction template',
        mime: 'text/markdown',
      },
      {
        template: 'bmad://{module}/workflows/{workflow}/template.md',
        name: 'Workflow Template',
        description: 'Workflow output template',
        mime: 'text/markdown',
      },
      {
        template: 'bmad://{module}/knowledge/{category}/{file}',
        name: 'Knowledge Base',
        description: 'Knowledge base articles and references',
        mime: 'text/markdown',
      },
      {
        template: 'bmad://_cfg/agents/{agent}.customize.yaml',
        name: 'Agent Customization',
        description: 'Agent customization configuration',
        mime: 'application/x-yaml',
      },
      {
        template: 'bmad://core/config.yaml',
        name: 'Core Configuration',
        description: 'BMAD core configuration file',
        mime: 'application/x-yaml',
      },
    ];

    for (const pattern of templatePatterns) {
      this.server.resource(
        pattern.name,
        new ResourceTemplate(pattern.template, {
          list: () => {
            // Enumeration is provided by the dynamic file-list template below
            // so every typed template returns an empty list rather than
            // duplicating the cached-file set per template.
            return { resources: [] };
          },
        }),
        { description: pattern.description, mimeType: pattern.mime },
        async (uri) => {
          const relativePath = uri.toString().replace(/^bmad:\/\//, '');
          try {
            const content = await this.engine
              .getLoader()
              .loadFile(relativePath);
            return {
              contents: [
                {
                  uri: uri.toString(),
                  mimeType: pattern.mime,
                  text: content,
                },
              ],
            };
          } catch (error) {
            throw new Error(
              `Resource not found: ${relativePath} (${error instanceof Error ? error.message : String(error)})`,
            );
          }
        },
      );
    }

    // Dynamic file-list catch-all — enumerates every cached resource under
    // the bmad:// scheme so clients can `resources/list` and discover. Kept
    // at the end of the template registration sequence so typed templates
    // are matched first during URI dispatch.
    this.server.resource(
      'BMAD Files',
      new ResourceTemplate('bmad://{+path}', {
        list: () => {
          const cachedResources = this.engine.getCachedResources();
          return {
            resources: cachedResources.map((file) => ({
              uri: `bmad://${file.relativePath}`,
              name: file.relativePath,
              description: `BMAD resource: ${file.relativePath}`,
              mimeType: this.getMimeType(file.relativePath),
            })),
          };
        },
      }),
      async (uri) => {
        const relativePath = uri.toString().replace(/^bmad:\/\//, '');
        try {
          const content = await this.engine.getLoader().loadFile(relativePath);
          return {
            contents: [
              {
                uri: uri.toString(),
                mimeType: this.getMimeType(relativePath),
                text: content,
              },
            ],
          };
        } catch (error) {
          throw new Error(
            `Resource not found: ${relativePath} (${error instanceof Error ? error.message : String(error)})`,
          );
        }
      },
    );
  }

  private registerPrompts(): void {
    const agents = this.engine.getAgentMetadata();
    for (const agent of agents) {
      const promptName = agent.module
        ? `${agent.module}.${agent.name}`
        : `bmad.${agent.name}`;
      const description = `Activate ${agent.displayName} (${agent.title}) - ${agent.description}`;

      (this.server.prompt as any)(
        promptName,
        description,
        {
          message: z
            .string()
            .optional()
            .describe('Initial message or question for the agent'),
        },
        async (args: { message?: string }) => {
          const result = await handleBMADTool(
            {
              operation: 'execute',
              agent: agent.name,
              message: args.message,
              module: agent.module,
            },
            this.engine,
          );
          return {
            description: `Activate ${promptName} agent`,
            messages: result.content.map((c) => ({
              role: 'user' as const,
              content: c,
            })),
          };
        },
      );
    }
  }

  private registerCompletionHandler(): void {
    // CompleteRequestSchema is handled via the low-level escape hatch since
    // McpServer only auto-wires completion when a Completable zod field or a
    // ResourceTemplate.complete callback is registered — neither applies
    // here. Logic is ported byte-identically from the pre-migration handler.
    this.server.server.setRequestHandler(CompleteRequestSchema, (request) => {
      const { ref, argument } = request.params;

      if (ref.type === 'ref/prompt') {
        const agents = this.engine.getAgentMetadata();
        const partialValue = argument.value.toLowerCase();
        const matches = agents
          .map((agent) =>
            agent.module
              ? `${agent.module}.${agent.name}`
              : `bmad.${agent.name}`,
          )
          .filter((promptName) =>
            promptName.toLowerCase().includes(partialValue),
          )
          .slice(0, 20);

        return {
          completion: {
            values: matches,
            total: matches.length,
            hasMore: false,
          },
        };
      }

      if (ref.type === 'ref/resource') {
        const resources = this.engine.getCachedResources();
        const partialValue = argument.value.toLowerCase();

        if (partialValue.includes('{') || partialValue.includes('}')) {
          return {
            completion: { values: [], total: 0, hasMore: false },
          };
        }

        const matches = resources
          .filter((resource) => {
            const uri = `bmad://${resource.relativePath}`;
            return uri.toLowerCase().includes(partialValue);
          })
          .map((resource) => `bmad://${resource.relativePath}`)
          .slice(0, 20);

        return {
          completion: {
            values: matches,
            total: matches.length,
            hasMore: resources.length > matches.length,
          },
        };
      }

      return {
        completion: { values: [], total: 0, hasMore: false },
      };
    });
  }

  private async registerClickUp(): Promise<void> {
    try {
      const result = await registerClickUpTools(
        this.server,
        this.clickUpSession,
      );
      const requireClickUp = /^(1|true)$/i.test(
        (process.env.BMAD_REQUIRE_CLICKUP ?? '').trim(),
      );

      if (result.disabled) {
        if (requireClickUp) {
          logger.error(result.reason);
          process.exitCode = 1;
          process.exit(1);
        } else {
          logger.info(result.reason);
        }
      } else {
        // Log any warnings from the adapter
        for (const warning of result.warnings) {
          logger.warn(`ClickUp env warning: ${warning}`);
        }

        const suffix = result.prefetchError
          ? ` — pre-fetch warning: ${result.prefetchError}`
          : '';
        logger.info(
          `ClickUp tools registered (mode=${result.mode}, count=${result.toolsRegistered.length})${suffix}`,
        );
      }
    } catch (err) {
      logger.error(
        'ClickUp registration error (continuing without ClickUp tools):',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  private getMimeType(relativePath: string): string {
    if (relativePath.endsWith('.md')) return 'text/markdown';
    if (relativePath.endsWith('.yaml') || relativePath.endsWith('.yml'))
      return 'application/x-yaml';
    if (relativePath.endsWith('.json')) return 'application/json';
    if (relativePath.endsWith('.xml')) return 'application/xml';
    if (relativePath.endsWith('.csv')) return 'text/csv';
    return 'text/plain';
  }

  async connect(transport: Transport): Promise<void> {
    await this.ensureInitialized();
    await this.server.connect(transport);
  }

  async start(): Promise<void> {
    await this.ensureInitialized().catch((err) =>
      console.error('BMAD init error:', err),
    );
    const transport = new StdioServerTransport();
    await this.connect(transport);
    console.error('BMAD MCP Server started');
  }
}
