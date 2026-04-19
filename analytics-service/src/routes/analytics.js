const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Service authentication middleware
const FALLBACK_SERVICE_TOKEN = 'tenant1_key_123';

const authenticateService = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Service token required' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Accept the configured SERVICE_TOKEN, the fallback dev token, or any
    // non-empty token when no SERVICE_TOKEN env var is set (dev/staging).
    const isValid =
      token === process.env.SERVICE_TOKEN ||
      token === FALLBACK_SERVICE_TOKEN ||
      (!process.env.SERVICE_TOKEN && token.length > 0);

    if (!isValid) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid service token' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication Error', message: 'Failed to authenticate service request' });
  }
};

// POST /api/analytics/events - Receive events from SDK or API service
router.post('/events', analyticsController.receiveEvents);

// GET /api/analytics - Get analytics data (for internal services)
router.get('/', authenticateService, analyticsController.getAnalytics);

// GET /api/analytics/dashboard - Get dashboard data (for internal services)
router.get('/dashboard', authenticateService, analyticsController.getDashboardData);

// GET /api/analytics/health - Service health check
router.get('/health', analyticsController.healthCheck);

module.exports = router;