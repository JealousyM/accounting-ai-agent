// Copies non-TypeScript data assets (e.g. help-topics JSON) from src/data into
// dist/data after `tsc`. tsc only emits compiled .ts files, so files read at
// runtime via readFileSync(join(__dirname, ...)) — like data/help-topics/*.json —
// would otherwise be missing from dist and crash the server on startup.
const { cpSync, existsSync } = require('fs');
const { join } = require('path');

const src = join(__dirname, '..', 'src', 'data');
const dest = join(__dirname, '..', 'dist', 'data');

if (!existsSync(src)) {
  console.log('[copy-data-assets] no src/data directory, nothing to copy');
  process.exit(0);
}

// Recurse directories; copy every non-.ts file (.ts is already compiled by tsc).
cpSync(src, dest, {
  recursive: true,
  filter: (entry) => !entry.endsWith('.ts'),
});

console.log('[copy-data-assets] copied src/data assets to dist/data');
