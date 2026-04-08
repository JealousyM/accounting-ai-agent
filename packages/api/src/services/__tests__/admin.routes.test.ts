// IMPORTANT: mocks must be set up BEFORE imports

jest.mock('../admin.instance', () => ({
  adminService: {
    softDeleteUser: jest.fn().mockResolvedValue(undefined),
    hardDeleteUser: jest.fn().mockResolvedValue(undefined),
    updateSubscriptionPlan: jest.fn().mockResolvedValue({ id: 'u', subscriptionPlan: 'pro' }),
    updateUserLimits: jest.fn().mockResolvedValue({ id: 'u', aiMessagesLimit: 1000, wfirmaRequestsLimit: 30 }),
    resetUsageCounter: jest.fn().mockResolvedValue({ id: 'u', aiMessagesUsed: 0, wfirmaRequestsUsed: 0 }),
    getUserDeepStats: jest.fn().mockResolvedValue({
      range: 'month',
      cost: { totalUsd: 0, totalTokens: 0, promptTokens: 0, completionTokens: 0, runCount: 0, langsmithConversationCount: 0, avgCostPerLangsmithConversation: 0 },
      activityByDay: [],
      conversations: { totalInRange: 0 },
      toolUsage: { totalCalls: 0, topTools: [], byCategory: [] },
      channels: { web: { active: true }, telegram: { active: false, linkedAt: null } },
      tts: { charactersUsed: 0, costUsd: 0 },
      memories: { total: 0, byCategory: [] },
      lastActivity: { lastConversationAt: null, lastToolCallAt: null },
    }),
    getUsers: jest.fn(),
    getDashboardStats: jest.fn(),
    getUserDetail: jest.fn(),
    updateUserRole: jest.fn(),
  },
}));

jest.mock('../../middleware/auth.middleware', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { userId: 'admin-1', email: 'admin@example.com', role: 'admin' };
    next();
  },
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../middleware/rate-limiter.middleware', () => ({
  rateLimiter: () => (_req: any, _res: any, next: any) => next(),
}));

import express from 'express';
import request from 'supertest';
import adminRoutes from '../../routes/admin.routes';
import { adminService } from '../admin.instance';

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

beforeEach(() => jest.clearAllMocks());

describe('admin routes — user management', () => {
  it('DELETE /users/:id → 200 calls softDeleteUser', async () => {
    const r = await request(app).delete('/api/admin/users/u-2');
    expect(r.status).toBe(200);
    expect(r.body.data.mode).toBe('soft');
    expect(adminService.softDeleteUser).toHaveBeenCalledWith({ actorId: 'admin-1', targetUserId: 'u-2' });
  });

  it('DELETE /users/:id/hard → 200 calls hardDeleteUser', async () => {
    const r = await request(app).delete('/api/admin/users/u-2/hard');
    expect(r.status).toBe(200);
    expect(r.body.data.mode).toBe('hard');
    expect(adminService.hardDeleteUser).toHaveBeenCalledWith({ actorId: 'admin-1', targetUserId: 'u-2' });
  });

  it('PATCH /users/:id/subscription → 400 on invalid plan', async () => {
    const r = await request(app).patch('/api/admin/users/u-2/subscription').send({ plan: 'gold' });
    expect(r.status).toBe(400);
  });

  it('PATCH /users/:id/subscription → 200 on valid', async () => {
    const r = await request(app).patch('/api/admin/users/u-2/subscription').send({ plan: 'pro' });
    expect(r.status).toBe(200);
    expect(r.body.data.subscriptionPlan).toBe('pro');
  });

  it('PATCH /users/:id/limits → 400 when no field provided', async () => {
    const r = await request(app).patch('/api/admin/users/u-2/limits').send({});
    expect(r.status).toBe(400);
  });

  it('PATCH /users/:id/limits → 400 on float', async () => {
    const r = await request(app).patch('/api/admin/users/u-2/limits').send({ aiMessagesLimit: 100.5 });
    expect(r.status).toBe(400);
  });

  it('PATCH /users/:id/limits → 400 on out-of-range', async () => {
    const r = await request(app).patch('/api/admin/users/u-2/limits').send({ aiMessagesLimit: 2_000_000 });
    expect(r.status).toBe(400);
  });

  it('PATCH /users/:id/limits → 400 on negative', async () => {
    const r = await request(app).patch('/api/admin/users/u-2/limits').send({ aiMessagesLimit: -1 });
    expect(r.status).toBe(400);
  });

  it('PATCH /users/:id/limits → 200 on valid', async () => {
    const r = await request(app).patch('/api/admin/users/u-2/limits').send({ aiMessagesLimit: 1000 });
    expect(r.status).toBe(200);
  });

  it('POST /users/:id/reset-usage → 400 on invalid type', async () => {
    const r = await request(app).post('/api/admin/users/u-2/reset-usage').send({ type: 'all' });
    expect(r.status).toBe(400);
  });

  it('POST /users/:id/reset-usage → 200 on valid type', async () => {
    const r = await request(app).post('/api/admin/users/u-2/reset-usage').send({ type: 'both' });
    expect(r.status).toBe(200);
  });

  it('GET /users/:id/stats → 400 on invalid range', async () => {
    const r = await request(app).get('/api/admin/users/u-2/stats?range=decade');
    expect(r.status).toBe(400);
  });

  it('GET /users/:id/stats → 200 default range=month', async () => {
    const r = await request(app).get('/api/admin/users/u-2/stats');
    expect(r.status).toBe(200);
    expect(adminService.getUserDeepStats).toHaveBeenCalledWith('u-2', 'month');
  });

  it('soft delete propagates 400 for self-action error from service', async () => {
    (adminService.softDeleteUser as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('Cannot perform this action on your own account'), { statusCode: 400 })
    );
    const r = await request(app).delete('/api/admin/users/admin-1');
    expect(r.status).toBe(400);
  });

  it('returns 404 when service throws statusCode=404', async () => {
    (adminService.updateSubscriptionPlan as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('User not found'), { statusCode: 404 })
    );
    const r = await request(app).patch('/api/admin/users/u-2/subscription').send({ plan: 'pro' });
    expect(r.status).toBe(404);
  });
});
