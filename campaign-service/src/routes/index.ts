import { Router } from 'express';
import { campaignRoutes } from './campaign.routes';
import { ruleRoutes } from './rule.routes';
import { healthRoutes } from './health.routes';

const router = Router();

// The main health check is now in its own file
router.use('/health', healthRoutes);

// All routes under /campaigns will be handled by campaignRoutes
router.use('/campaigns', campaignRoutes);

// All routes under /rules will be handled by ruleRoutes
router.use('/rules', ruleRoutes);

export { router as apiRoutes };