export type ToolCategory = 'wfirma' | 'ksef' | 'memory' | 'hr' | 'org' | 'other';

const PREFIX_MAP: Array<[RegExp, ToolCategory]> = [
  [/^wfirma_/, 'wfirma'],
  [/^ksef_/, 'ksef'],
  [/^(memory_|prefer_)/, 'memory'],
  [/^(hr_|employee_)/, 'hr'],
  [/^(org_|organization_)/, 'org'],
];

export function categorizeToolName(toolName: string): ToolCategory {
  for (const [re, cat] of PREFIX_MAP) {
    if (re.test(toolName)) return cat;
  }
  return 'other';
}

export function assertNotSelf(actorId: string, targetId: string): void {
  if (actorId === targetId) {
    const err = new Error('Cannot perform this action on your own account');
    (err as any).statusCode = 400;
    throw err;
  }
}

export function assertNotSoftDeleted(user: { deletedAt: Date | null }): void {
  if (user.deletedAt !== null) {
    const err = new Error('User is soft-deleted');
    (err as any).statusCode = 400;
    throw err;
  }
}
