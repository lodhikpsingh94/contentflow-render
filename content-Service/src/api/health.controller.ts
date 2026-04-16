import express from 'express';
import { config } from '../config';

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'content-service',
    version: config.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

export default router;