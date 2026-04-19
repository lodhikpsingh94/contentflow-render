const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Service authentication middleware — accepts INTERNAL_SERVICE_TOKEN only
const authenticateService = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Service token required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const internalToken = process.env.INTERNAL_SERVICE_TOKEN;

    if (!internalToken) {
      return res.status(500).json({ error: 'Server Error', message: 'INTERNAL_SERVICE_TOKEN is not configured' });
    }

    if (token !== internalToken) {
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
