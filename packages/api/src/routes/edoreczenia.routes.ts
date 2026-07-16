import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { edoreczeniaService } from '../services/edoreczenia';
import { logger } from '../utils/logger';

const router = Router();
router.use(authenticate);

function userId(req: Request): string {
  return (req as unknown as { user: { userId: string } }).user.userId;
}

router.get('/letters', async (req: Request, res: Response) => {
  try {
    const filter = (req.query.filter as 'all' | 'needs_action' | 'done') ?? 'all';
    const letters = await edoreczeniaService.getLetters(userId(req), filter);
    res.json({ letters });
  } catch (e) {
    logger.error('[edoreczenia] GET /letters failed', { error: (e as Error).message });
    res.status(500).json({ error: 'Failed to fetch letters' });
  }
});

router.get('/letters/:id', async (req: Request, res: Response) => {
  const letter = await edoreczeniaService.getLetterById(userId(req), req.params.id);
  if (!letter) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ letter });
});

router.post('/letters/:id/done', async (req: Request, res: Response) => {
  await edoreczeniaService.markLetterDone(userId(req), req.params.id);
  res.json({ ok: true });
});

router.get('/deadlines', async (req: Request, res: Response) => {
  const deadlines = await edoreczeniaService.getActiveDeadlines(userId(req));
  res.json({ deadlines });
});

const CsrSchema = z.object({ commonName: z.string().min(1) });
router.post('/onboarding/csr', async (req: Request, res: Response) => {
  const parsed = CsrSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'commonName required' }); return; }
  const out = await edoreczeniaService.beginOnboarding(userId(req), parsed.data.commonName);
  res.json({ csrPem: out.csrPem });
});

const CertSchema = z.object({ certPem: z.string().min(1) });
router.post('/onboarding/certificate', async (req: Request, res: Response) => {
  const parsed = CertSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'certPem required' }); return; }
  await edoreczeniaService.completeOnboarding(userId(req), parsed.data.certPem);
  res.json({ ok: true });
});

export default router;
