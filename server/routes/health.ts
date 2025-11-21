/**
 * Health check routes
 */

import { Router } from 'express';

export function createHealthRouter() {
  const router = Router();

  router.get('/', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'voice-server',
      version: '1.0.0',
    });
  });

  return router;
}

