import { Router } from 'express';
import { ruleHandler } from '../handlers/rule.handler';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateRuleData } from '../middleware/validation';

const router = Router();

// Apply authentication to all rule routes
router.use(authenticateToken);

// Rule CRUD operations
router.post('/',
  requireRole(['admin', 'editor']),
  validateRuleData,
  ruleHandler.createRule.bind(ruleHandler)
);

router.put('/:id',
  requireRole(['admin', 'editor']),
  validateRuleData,
  ruleHandler.updateRule.bind(ruleHandler)
);

router.delete('/:id',
  requireRole(['admin']),
  ruleHandler.deleteRule.bind(ruleHandler)
);

// Rule evaluation
router.post('/evaluate',
  ruleHandler.evaluateRules.bind(ruleHandler)
);

// Get rules by type
router.get('/type/:type',
  ruleHandler.getRulesByType.bind(ruleHandler)
);

export const ruleRoutes = router;