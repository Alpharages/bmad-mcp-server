import * as esbuild from 'esbuild';

// Read all dependencies (for externals)
import { readFileSync } from 'node:fs';
const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url)),
);
const externals = [
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.devDependencies || {}),
  '@modelcontextprotocol/sdk', // explicit external
];

const entries = [
  'src/tools/clickup/src/tools/task-tools.ts',
  'src/tools/clickup/src/tools/task-write-tools.ts',
  'src/tools/clickup/src/tools/search-tools.ts',
  'src/tools/clickup/src/tools/space-tools.ts',
  'src/tools/clickup/src/tools/list-tools.ts',
  'src/tools/clickup/src/tools/time-tools.ts',
  'src/tools/clickup/src/tools/doc-tools.ts',
  'src/tools/clickup/src/resources/space-resources.ts',
  'src/tools/clickup/src/shared/utils.ts',
  'src/tools/clickup/src/shared/config.ts',
];

try {
  await esbuild.build({
    entryPoints: entries,
    outdir: 'build/tools/clickup/src',
    outbase: 'src/tools/clickup/src',
    bundle: true,
    // splitting + chunkNames hoist shared modules (notably shared/utils.ts
    // and shared/config.ts) into dedicated chunks so they are not duplicated
    // inside every entry bundle. Without this, module-scope state in
    // shared/utils.ts (cachedUserPromise, spaceCache, 60s cleanup timers) is
    // instantiated per entry — each tool handler would miss the cache and
    // hold its own pending timer, delaying process exit.
    splitting: true,
    chunkNames: 'shared/[name]-[hash]',
    platform: 'node',
    target: 'node22',
    format: 'esm',
    sourcemap: true,
    external: externals,
    logLevel: 'info',
  });
  console.log('ClickUp tools bundled successfully');
} catch (e) {
  console.error('Esbuild failed', e);
  process.exit(1);
}
