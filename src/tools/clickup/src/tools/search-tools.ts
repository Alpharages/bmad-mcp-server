import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {CONFIG} from "../shared/config";
import {isTaskId, getTaskSearchIndex, performMultiTermSearch} from "../shared/utils";
import {generateTaskMetadata} from "./task-tools";

const MAX_SEARCH_RESULTS = 50;

/** Fetch one task straight from the API by ID. Returns null if it does not exist or the call fails. */
async function fetchTaskById(id: string): Promise<any | null> {
  try {
    const response = await fetch(`https://api.clickup.com/api/v2/task/${id}`, {
      headers: {Authorization: CONFIG.apiKey}
    });
    if (!response.ok) return null;
    const task = await response.json();
    return task && typeof task.id === 'string' ? task : null;
  } catch (error) {
    console.error(`Error directly fetching task ${id}:`, error);
    return null;
  }
}

export function registerSearchTools(server: McpServer, userData: any) {
  // Dynamically construct the searchTasks description
  const searchTasksDescriptionBase = [
    "Searches tasks (sometimes called Tickets or Cards) by name, content, assignees, and ID with fuzzy matching and support for multiple search terms (OR logic).",
    "Can filter by multiple list_ids, space_ids, todo status, or tasks assigned to the current user. If no search terms provided, returns most recently updated tasks.",
    "Can also be used to find tasks for the current user by providing the assigned_to_me flag."
  ];

  if (CONFIG.primaryLanguageHint && CONFIG.primaryLanguageHint.toLowerCase() !== 'en') {
    searchTasksDescriptionBase.push(`For optimal results, as your ClickUp tasks may be primarily in '${CONFIG.primaryLanguageHint}', consider providing search terms in English and '${CONFIG.primaryLanguageHint}'.`);
  }

  searchTasksDescriptionBase.push("Always reference tasks by their URLs when discussing search results or suggesting actions.");
  searchTasksDescriptionBase.push("You'll get a rough overview of the tasks that match the search terms, sorted by relevance.");
  searchTasksDescriptionBase.push("Always use getTaskById to get more specific information if a task is relevant, and always share the task URL.");

  server.tool(
    "searchTasks",
    searchTasksDescriptionBase.join("\n"),
    {
      terms: z
        .array(z.string())
        .optional()
        .describe(
          "Array of search terms (OR logic). Can include task IDs. Optional - if not provided, returns most recent tasks."
        ),
      list_ids: z
        .array(z.string())
        .optional()
        .describe("Filter tasks to specific list IDs"),
      space_ids: z
        .array(z.string())
        .optional()
        .describe("Filter tasks to specific space IDs"),
      only_todo: z
        .boolean()
        .optional()
        .describe("Filter for open/todo tasks only (exclude done and closed tasks)"),
      status: z
        .array(z.string())
        .optional()
        .describe("Filter for tasks with specific status names (overrides only_todo if provided)"),
      assigned_to_me: z
        .boolean()
        .optional()
        .describe(`Filter for tasks assigned to the current user (${userData.user.username} (${userData.user.id}))`),
    },
    {
      readOnlyHint: true
    },
    async ({terms, list_ids, space_ids, only_todo, status, assigned_to_me}) => {
      // Get current user ID if filtering by assigned_to_me
      const assignees = assigned_to_me ? [userData.user.id as string] : [];

      // Every term is a task ID — fetch them directly. Building the search index for this means
      // paging the whole workspace when no list_ids/space_ids narrow it, which is both pointless
      // (we already know the exact IDs) and slow enough to look like a hang to a caller.
      if (terms && terms.length > 0 && terms.every(isTaskId)) {
        const tasks = (await Promise.all(terms.map(fetchTaskById))).filter(Boolean);
        if (tasks.length > 0) {
          return { content: await Promise.all(tasks.map((task: any) => generateTaskMetadata(task))) };
        }
        // Fall through: the IDs matched nothing, so treat them as ordinary search terms.
      }

      const searchIndex = await getTaskSearchIndex(space_ids, list_ids, assignees);
      if (!searchIndex) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No tasks available or index could not be built.",
            },
          ],
        };
      }

      // Early return for no search terms
      if (!terms || terms.length === 0) {
        let allTasks = (searchIndex as any)._docs || [];

        // Apply status filtering
        if (status && status.length > 0) {
          const statusLower = status.map(s => s.toLowerCase());
          allTasks = allTasks.filter((task: any) => statusLower.includes(task.status.status.toLowerCase()));
        } else if (only_todo) {
          allTasks = allTasks.filter((task: any) => task.status.type !== "done" && task.status.type !== "closed");
        }

        // Sort by updated date (most recent first) and limit
        const resultTasks = allTasks
          .sort((a: any, b: any) => {
            const dateA = parseInt(a.date_updated || "0");
            const dateB = parseInt(b.date_updated || "0");
            return dateB - dateA;
          })
          .slice(0, MAX_SEARCH_RESULTS);

        if (resultTasks.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No tasks found.",
              },
            ],
          };
        }

        return {
          content: await Promise.all(resultTasks.map((task: any) => generateTaskMetadata(task))),
        };
      }

      // Create a results map to track unique tasks with scores
      const uniqueResults = new Map<string, { item: any, score: number }>();

      // Perform multi-term search with aggressive boosting
      const searchResults = await performMultiTermSearch(searchIndex, terms);
      searchResults.forEach(task => {
        uniqueResults.set(task.id, { item: task, score: 0.1 }); // Give search results a good score
      });

      // Task ID Fallback Logic
      const potentialTaskIds = terms.filter(isTaskId);
      const foundTaskIdsByFuse = new Set(Array.from(uniqueResults.keys()).map(id => id.toLowerCase()));

      const taskIdsToFetchDirectly = potentialTaskIds.filter(id => {
        const lowerId = id.toLowerCase();
        return !foundTaskIdsByFuse.has(lowerId);
      });

      if (taskIdsToFetchDirectly.length > 0) {
        console.error(`Attempting direct fetch for task IDs: ${taskIdsToFetchDirectly.join(', ')}`);
        const directFetches = await Promise.all(taskIdsToFetchDirectly.map(fetchTaskById));
        for (const task of directFetches) {
          if (!task) continue;
          const existing = uniqueResults.get(task.id);
          if (!existing || 0 < existing.score) {
            uniqueResults.set(task.id, {item: task, score: 0});
          }
        }
      }

      let resultTasks = Array.from(uniqueResults.values())
        .sort((a, b) => a.score - b.score)
        .map(entry => entry.item);

      // Apply status filtering
      if (status && status.length > 0) {
        const statusLower = status.map(s => s.toLowerCase());
        resultTasks = resultTasks.filter((task: any) => statusLower.includes(task.status.status.toLowerCase()));
      } else if (only_todo) {
        resultTasks = resultTasks.filter((task: any) => task.status.type !== "done" && task.status.type !== "closed");
      }

      // Apply result limit
      resultTasks = resultTasks.slice(0, MAX_SEARCH_RESULTS);

      if (resultTasks.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No tasks found matching the search criteria.",
            },
          ],
        };
      }

      return {
        content: await Promise.all(resultTasks.map((task: any) => generateTaskMetadata(task))),
      };
    }
  );
}
