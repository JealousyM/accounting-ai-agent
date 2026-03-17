// packages/api/src/lib/test-utils.ts
export function withEnv<T>(
  tempEnv: NodeJS.ProcessEnv,
  testFn: () => Promise<T> | T
): Promise<T> | T {
  const originalEnv = process.env;
  process.env = { ...originalEnv, ...tempEnv };

  const restore = () => {
    process.env = originalEnv;
  };

  try {
    const result = testFn();
    if (result instanceof Promise) {
      return result.finally(restore);
    }
    return result;
  } finally {
    restore();
  }
}
```typescript
// packages/api/src/middleware/__tests__/env.middleware.test.ts

describe('Env Middleware – Test Skeleton', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should load env module without errors (placeholder)', () => {
    const envModule = require('../env');
    expect(envModule).toBeDefined();
    expect(typeof envModule).toBe('object');
  });

  // ------------------------------------------------------------------
  // Planned Unit Tests – will be implemented once middleware is ready
  // ------------------------------------------------------------------
  it.todo('Validation success: calls next() when env is valid');
  it.todo('Missing required variable: responds 500 or throws ConfigError');
  it.todo('Invalid variable format: handles PORT not numeric');
  it.todo('Optional variable absent: uses default value');
  it.todo('Boolean coercion: FEATURE_FLAG="true"/"false" → boolean');
  it.todo('Variable sanitisation: secrets not logged in plain text');
  it.todo('Attaches strongly typed config to request/res.locals');
  it.todo('Idempotence: multiple calls behave consistently');
});
```