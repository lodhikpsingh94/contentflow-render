import { Router } from 'express';
import { healthHandler } from '../handlers/health.handler';

const router = Router();

// Health checks don't require authentication
router.get('/', healthHandler.healthCheck.bind(healthHandler));
router.get('/detailed', healthHandler.detailedHealthCheck.bind(healthHandler));
router.get('/ready', healthHandler.readinessCheck.bind(healthHandler));
router.get('/live', healthHandler.livenessCheck.bind(healthHandler));

export const healthRoutes = router;