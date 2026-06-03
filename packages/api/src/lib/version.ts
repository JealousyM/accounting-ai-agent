import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * App version read from package.json at runtime, so it always matches the
 * actually deployed build instead of a hard-coded literal.
 *
 * Path resolves from both the compiled bundle (`dist/lib/version.js` →
 * `/app/package.json`) and ts-node/tsx dev (`src/lib/version.ts` →
 * `packages/api/package.json`). `npm_package_version` is intentionally not
 * used because production starts via `node dist/index.js`, where it is unset.
 */
function readAppVersion(): string {
  try {
    const pkgPath = join(__dirname, '../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const APP_VERSION = readAppVersion();
