import { Request, Response, NextFunction } from 'express';
import { auditLogService } from '../services/audit-log.instance';
import { logger } from '../utils/logger';

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const SKIP_PATH_PREFIXES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/webhooks',
  '/api/tts',
  '/health',
];

function deriveEntity(path: string): string {
  const stripped = path.replace(/^\/api\//, '');
  const segments = stripped.split('/').filter(Boolean);
  const skipSegments = new Set(['admin', 'api']);
  const meaningful = segments.filter((s) => !skipSegments.has(s));
  return meaningful[0] ?? 'unknown';
}

function deriveAction(method: string, entity: string): string {
  const methodMap: Record<string, string> = {
    POST: 'CREATE',
    PUT: 'UPDATE',
    PATCH: 'UPDATE',
    DELETE: 'DELETE',
  };
  const prefix = methodMap[method] ?? method;
  return `${prefix}_${entity.toUpperCase()}`;
}

function extractEntityId(params: Record<string, string>): string | undefined {
  for (const value of Object.values(params)) {
    if (/^[0-9a-f-]{36}$/i.test(value)) {
      return value;
    }
  }
  return undefined;
}

export const auditLogMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!AUDITED_METHODS.has(req.method)) {
    return next();
  }

  if (SKIP_PATH_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    return next();
  }

  res.on('finish', () => {
    if (res.statusCode >= 500) return;

    const entity = deriveEntity(req.path);
    const action = deriveAction(req.method, entity);
    const entityId = extractEntityId(req.params ?? {});

    auditLogService
      .create({
        userId: req.user?.userId,
        action,
        entity,
        entityId,
        changes: req.body,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })
      .catch((err) => {
        logger.error('Audit log fire-and-forget failed', { err });
      });
  });

  next();
};
