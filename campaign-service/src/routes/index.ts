import { Router } from 'express';
import { campaignRoutes } from './campaign.routes';
import { ruleRoutes } from './rule.routes';
import { healthRoutes } from './health.routes';
import { hijriRoutes } from './hijri.routes';
import { journeyRoutes } from './journey.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/rules', ruleRoutes);
router.use('/hijri', hijriRoutes);    // Prayer times + Hijri conversion (no auth needed)
router.use('/journeys', journeyRoutes);

export { router as apiRoutes };