// packages/api/src/config/__tests__/env.test.ts

/* eslint-disable @typescript-eslint/no-var-requires */

describe('Env Middleware Module', () => {
  const ENV_MW_PATH = '../../middleware/env';

  beforeEach(() => {
    jest.resetModules();
  });

  it('imports the module without throwing and exposes an object', () => {
    expect(() => {
      const envModule = require(ENV_MW_PATH);
      expect(envModule).toBeDefined();
      expect(typeof envModule).toBe('object');
    }).not.toThrow();
  });

  it('does not mutate process.env during import', () => {
    const originalEnv = { ...process.env };

    require(ENV_MW_PATH);

    expect(process.env).toEqual(originalEnv);
  });

  it('returns the same instance on multiple synchronous imports', () => {
    const firstImport = require(ENV_MW_PATH);
    const secondImport = require(ENV_MW_PATH);

    expect(firstImport).toBe(secondImport);
  });

  it('returns the same instance across concurrent dynamic imports', async () => {
    jest.resetModules();

    const imports = await Promise.all(
      Array.from({ length: 20 }).map(() => import(ENV_MW_PATH))
    );

    imports.forEach((mod) => {
      expect(mod).toBe(imports[0]);
    });
  });
});
