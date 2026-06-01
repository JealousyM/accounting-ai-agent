import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { taxCalendarService } from '../services/tax-calendar.instance';
import { logger } from '../utils/logger';
import { Locale } from '../i18n';

const router = Router();

router.use(authenticate);

/**
 * GET /api/tax-calendar/upcoming
 * Returns upcoming (and recently overdue) Polish statutory tax deadlines.
 */
router.get('/upcoming', (req: Request, res: Response) => {
  try {
    const days = Math.min(parseInt(String(req.query.days ?? '14'), 10) || 14, 90);
    const locale = (['pl', 'en', 'ru'].includes(String(req.query.locale)) ? req.query.locale : 'pl') as Locale;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const deadlines = taxCalendarService
      .getUpcomingDeadlines(days, locale, 1)
      .map((d) => {
        const daysUntil = Math.round((d.date.getTime() - todayStart.getTime()) / 86_400_000);
        let urgency: 'overdue' | 'urgent' | 'soon' | 'normal';
        if (daysUntil < 0) urgency = 'overdue';
        else if (daysUntil <= 3) urgency = 'urgent';
        else if (daysUntil <= 7) urgency = 'soon';
        else urgency = 'normal';

        return {
          id: d.id,
          name: d.name,
          description: d.description,
          date: d.date.toISOString().slice(0, 10),
          daysUntil,
          urgency,
          obligatory: d.obligatory,
          category: d.category,
        };
      });

    return res.json({ success: true, data: deadlines });
  } catch (error) {
    logger.error('Failed to fetch upcoming tax deadlines', { error });
    return res.status(500).json({ success: false, error: 'Failed to fetch tax deadlines' });
  }
});

export default router;
