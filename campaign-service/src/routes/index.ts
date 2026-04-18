import { Router } from 'express';
import { campaignRoutes } from './campaign.routes';
import { ruleRoutes } from './rule.routes';
import { healthRoutes } from './health.routes';
import { hijriRoutes } from './hijri.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/rules', ruleRoutes);
router.use('/hijri', hijriRoutes);    // Prayer times + Hijri conversion (no auth needed)

export { router as apiRoutes };