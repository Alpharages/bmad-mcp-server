/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

type ClickUpMode = 'read-minimal' | 'read' | 'write';

export type RegisterResult =
  | { disabled: true; reason: string }
  | {
      disabled: false;
      mode: ClickUpMode;
      toolsRegistered: readonly string[];
      prefetchError?: string;
    };

// Redact anything that looks like a credential (20+ alphanumeric run) and
// truncate, so upstream error messages that embed the API key or bearer URL
// can't leak into logs.
function sanitizeErrorMessage(input: unknown): string {
  const raw = input instanceof Error ? input.message : String(input);
  return raw.replace(/[A-Za-z0-9_-]{20,}/g, '***').slice(0, 200);
}

export async function registerClickUpTools(
  server: McpServer,
): Promise<RegisterResult> {
  const apiKey = process.env.CLICKUP_API_KEY?.trim();
  const teamId = process.env.CLICKUP_TEAM_ID?.trim();

  if (!apiKey || !teamId) {
    return {
      disabled: true,
      reason: 'CLICKUP_API_KEY and CLICKUP_TEAM_ID required',
    };
  }

  // Paths are stored as a constant manifest so TypeScript doesn't trace the
  // vendored tree at compile time (it's excluded from the strict root tsc pass).
  // The build step (`scripts/build-clickup.mjs`) emits these paths under
  // `build/tools/clickup/src/**` relative to `build/tools/clickup-adapter.js`.
  const paths = {
    utils: './clickup/src/shared/utils.js',
    config: './clickup/src/shared/config.js',
    taskTools: './clickup/src/tools/task-tools.js',
    taskWriteTools: './clickup/src/tools/task-write-tools.js',
    searchTools: './clickup/src/tools/search-tools.js',
    spaceTools: './clickup/src/tools/space-tools.js',
    listTools: './clickup/src/tools/list-tools.js',
    timeTools: './clickup/src/tools/time-tools.js',
    docTools: './clickup/src/tools/doc-tools.js',
    spaceResources: './clickup/src/resources/space-resources.js',
  } as const;

  const [
    utils,
    configModule,
    taskTools,
    taskWriteTools,
    searchTools,
    spaceTools,
    listTools,
    timeTools,
    docTools,
    spaceResources,
  ] = await Promise.all([
    import(paths.utils),
    import(paths.config),
    import(paths.taskTools),
    import(paths.taskWriteTools),
    import(paths.searchTools),
    import(paths.spaceTools),
    import(paths.listTools),
    import(paths.timeTools),
    import(paths.docTools),
    import(paths.spaceResources),
  ]);

  // Pre-fetch userData and the space search index. Upstream register functions
  // read `userData.user.username` / `.id` at registration time (baked into
  // tool descriptions), so a missing userData would crash registration.
  // AC #3 + Task 6 subtask 2 require registration to succeed even with
  // invalid credentials (only tool *invocation* should auth-fail), so we
  // fall back to a neutral stub that doesn't misidentify the user.
  // Use Promise.allSettled so one failure doesn't discard the other result.
  const stubUserData = {
    user: {
      id: 0,
      username: 'current user',
      email: '(unknown)',
      color: '',
      profilePicture: '',
    },
  };
  let userData: unknown = stubUserData;
  let prefetchError: string | undefined;
  const [userResult, indexResult] = await Promise.allSettled([
    utils.getCurrentUser(),
    utils.getSpaceSearchIndex(),
  ]);
  if (userResult.status === 'fulfilled') {
    userData = userResult.value;
  } else {
    prefetchError = sanitizeErrorMessage(userResult.reason);
  }
  if (indexResult.status === 'rejected' && !prefetchError) {
    prefetchError = sanitizeErrorMessage(indexResult.reason);
  }

  // Register upstream's `my-todos` prompt (AC #5, upstream parity — see
  // src/tools/clickup/src/index.ts lines 56-99). Uses the high-level
  // `server.prompt()` API, same as BMAD's own prompts elsewhere in server.ts.
  const CONFIG = configModule.CONFIG as { primaryLanguageHint?: string };
  const lang = CONFIG.primaryLanguageHint === 'de' ? 'de' : 'en';
  const myTodosText =
    lang === 'de'
      ? `Kannst du in ClickUp nachsehen, was meine aktuellen TODOs sind? Bitte suche nach allen offenen Aufgaben, die mir zugewiesen sind, analysiere deren Inhalt und kategorisiere sie nach erkennbarer Priorität (dringend, hoch, normal, niedrig). Für jede Kategorie gib eine kurze Zusammenfassung dessen, was getan werden muss und hebe Fälligkeitstermine oder wichtige Details aus den Aufgabenbeschreibungen hervor.

Bitte strukturiere deine Antwort mit:
1. **Zusammenfassung**: Gesamtanzahl der Aufgaben und allgemeine Prioritätsverteilung
2. **Dringende Aufgaben**: Aufgaben, die sofortige Aufmerksamkeit benötigen (heute fällig, überfällig oder als dringend markiert)
3. **Hohe Priorität**: Wichtige Aufgaben, die bald erledigt werden sollten
4. **Normale Priorität**: Regelmäßige Aufgaben, die später geplant werden können
5. **Niedrige Priorität**: Aufgaben, die erledigt werden können, wenn Zeit vorhanden ist
6. **Empfehlungen**: Vorgeschlagene Maßnahmen oder Prioritäten für den kommenden Zeitraum

Verwende die ClickUp-Suchtools, um mir zugewiesene Aufgaben zu finden, und hole detaillierte Informationen über die wichtigsten mit getTaskById.`
      : `Can you look into ClickUp and check what my current TODO's are? Please search for all open tasks assigned to me, analyze their content, and categorize them by apparent priority (urgent, high, normal, low). For each category, provide a brief summary of what needs to be done and highlight any due dates or important details from the task descriptions.

Please structure your response with:
1. **Summary**: Total number of tasks and overall priority distribution
2. **Urgent Tasks**: Tasks that need immediate attention (due today, overdue, or marked as urgent)
3. **High Priority**: Important tasks that should be addressed soon
4. **Normal Priority**: Regular tasks that can be scheduled for later
5. **Low Priority**: Tasks that can be done when time permits
6. **Recommendations**: Suggested actions or priorities for the upcoming period

Use the ClickUp search tools to find tasks assigned to me, and get detailed information about the most important ones using getTaskById.`;

  server.prompt(
    'my-todos',
    lang === 'de'
      ? 'Meine aktuellen TODO-Aufgaben aus ClickUp abrufen und nach Priorität kategorisiert analysieren'
      : 'Get and analyze my current TODO tasks from ClickUp, categorized by priority',
    () => ({
      messages: [
        {
          role: 'user' as const,
          content: { type: 'text' as const, text: myTodosText },
        },
      ],
    }),
  );

  // Mode dispatch. Trim to survive copy-paste whitespace in .env files
  // (prevents privilege-escalation-by-typo where "  read " falls through
  // the equality check and defaults to 'write').
  const modeRaw = process.env.CLICKUP_MCP_MODE?.trim().toLowerCase();
  let mode: ClickUpMode;
  if (modeRaw === 'read-minimal' || modeRaw === 'read' || modeRaw === 'write') {
    mode = modeRaw;
  } else {
    if (modeRaw) {
      console.warn(
        `Unknown CLICKUP_MCP_MODE '${modeRaw}', defaulting to write mode`,
      );
    }
    mode = 'write';
  }

  // Register in order, pushing names incrementally so a partial failure still
  // reports what was successfully registered.
  const toolsRegistered: string[] = [];
  const step = (fn: () => void, names: readonly string[]): void => {
    fn();
    toolsRegistered.push(...names);
  };

  if (mode === 'read-minimal') {
    step(
      () => taskTools.registerTaskToolsRead(server, userData),
      ['getTaskById'],
    );
    step(
      () => searchTools.registerSearchTools(server, userData),
      ['searchTasks'],
    );
  } else if (mode === 'read') {
    step(
      () => taskTools.registerTaskToolsRead(server, userData),
      ['getTaskById'],
    );
    step(
      () => searchTools.registerSearchTools(server, userData),
      ['searchTasks'],
    );
    step(() => spaceTools.registerSpaceTools(server), ['searchSpaces']);
    spaceResources.registerSpaceResources(server);
    step(() => listTools.registerListToolsRead(server), ['getListInfo']);
    step(() => timeTools.registerTimeToolsRead(server), ['getTimeEntries']);
    // Upstream at SHA c79b21e3 ships only `readDocument` in the read surface.
    // `searchDocuments` is named in the spec AC #1 tool list but does not yet
    // exist in vendored code — will appear automatically when upstream adds
    // it and we re-vendor.
    step(() => docTools.registerDocumentToolsRead(server), ['readDocument']);
  } else {
    step(
      () => taskTools.registerTaskToolsRead(server, userData),
      ['getTaskById'],
    );
    step(
      () => taskWriteTools.registerTaskToolsWrite(server, userData),
      ['addComment', 'updateTask', 'createTask'],
    );
    step(
      () => searchTools.registerSearchTools(server, userData),
      ['searchTasks'],
    );
    step(() => spaceTools.registerSpaceTools(server), ['searchSpaces']);
    spaceResources.registerSpaceResources(server);
    step(() => listTools.registerListToolsRead(server), ['getListInfo']);
    step(() => listTools.registerListToolsWrite(server), ['updateListInfo']);
    step(() => timeTools.registerTimeToolsRead(server), ['getTimeEntries']);
    step(() => timeTools.registerTimeToolsWrite(server), ['createTimeEntry']);
    // Upstream at SHA c79b21e3 ships only `readDocument` in the read surface.
    // `searchDocuments` is named in the spec AC #1 tool list but does not yet
    // exist in vendored code — will appear automatically when upstream adds
    // it and we re-vendor.
    step(() => docTools.registerDocumentToolsRead(server), ['readDocument']);
    step(
      () => docTools.registerDocumentToolsWrite(server),
      ['updateDocumentPage', 'createDocumentOrPage'],
    );
  }

  return {
    disabled: false,
    mode,
    toolsRegistered,
    prefetchError,
  };
}
