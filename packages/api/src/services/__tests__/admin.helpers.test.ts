import { categorizeToolName, assertNotSelf, assertNotSoftDeleted } from '../admin.helpers';

describe('categorizeToolName', () => {
  it.each([
    ['wfirma_list_invoices', 'wfirma'],
    ['ksef_send_invoice', 'ksef'],
    ['memory_save', 'memory'],
    ['prefer_set', 'memory'],
    ['hr_list_employees', 'hr'],
    ['employee_add', 'hr'],
    ['org_invite', 'org'],
    ['organization_get', 'org'],
    ['random_unknown_tool', 'other'],
    ['', 'other'],
  ])('maps %s → %s', (tool, category) => {
    expect(categorizeToolName(tool)).toBe(category);
  });
});

describe('assertNotSelf', () => {
  it('throws with statusCode 400 when actorId === targetId', () => {
    expect.assertions(2);
    try {
      assertNotSelf('u1', 'u1');
    } catch (e: any) {
      expect(e.message).toMatch(/own account/);
      expect(e.statusCode).toBe(400);
    }
  });

  it('does not throw when ids differ', () => {
    expect(() => assertNotSelf('u1', 'u2')).not.toThrow();
  });
});

describe('assertNotSoftDeleted', () => {
  it('throws with statusCode 400 when deletedAt is set', () => {
    expect.assertions(2);
    try {
      assertNotSoftDeleted({ deletedAt: new Date() });
    } catch (e: any) {
      expect(e.message).toMatch(/soft-deleted/);
      expect(e.statusCode).toBe(400);
    }
  });

  it('does not throw when deletedAt is null', () => {
    expect(() => assertNotSoftDeleted({ deletedAt: null })).not.toThrow();
  });
});
