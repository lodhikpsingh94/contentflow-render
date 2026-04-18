import { Router, Request, Response } from 'express';
import { hijriConverter } from '../utils/hijri-converter';
import { prayerTimeService } from '../services/prayer-time.service';

const router = Router();

/**
 * GET /hijri/today
 * Returns today's Hijri date.
 */
router.get('/today', (_req: Request, res: Response) => {
  const h = hijriConverter.gregorianDateToHijri(new Date());
  res.json({ success: true, data: h });
});

/**
 * POST /hijri/convert
 * Body: { year, month, day }  (Gregorian)
 * Returns Hijri equivalent.
 */
router.post('/convert', (req: Request, res: Response) => {
  const { year, month, day } = req.body;
  if (!year || !month || !day) {
    return res.status(400).json({ success: false, error: 'year, month, day are required' });
  }
  const h = hijriConverter.gregorianToHijri(Number(year), Number(month), Number(day));
  res.json({ success: true, data: h });
});

/**
 * GET /hijri/season/:tag?year=2025
 * Returns Gregorian date range for a seasonal campaign tag.
 */
router.get('/season/:tag', (req: Request, res: Response) => {
  const { tag } = req.params;
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  try {
    const range = hijriConverter.getSeasonGregorianRange(tag as any, year);
    res.json({ success: true, data: { tag, year, ...range } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /hijri/prayer-times?city=riyadh
 * Returns today's prayer times for a Saudi city.
 */
router.get('/prayer-times', (req: Request, res: Response) => {
  const city = (req.query.city as string) || 'riyadh';
  const times = prayerTimeService.getPrayerTimes(city);
  res.json({ success: true, data: times });
});

/**
 * GET /hijri/prayer-times/active?city=riyadh
 * Returns whether it is currently prayer time + which window if so.
 */
router.get('/prayer-times/active', (req: Request, res: Response) => {
  const city = (req.query.city as string) || 'riyadh';
  const active = prayerTimeService.getActivePrayerWindow(city);
  res.json({
    success: true,
    data: {
      isPrayerTime: active !== null,
      activeWindow: active,
    },
  });
});

export { router as hijriRoutes };
