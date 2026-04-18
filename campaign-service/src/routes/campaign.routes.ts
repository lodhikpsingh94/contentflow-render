import { Router } from 'express';
import { campaignHandler } from '../handlers/campaign.handler';
import { approvalHandler } from '../handlers/approval.handler';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateCampaignData, validateQueryParams, validateCampaignUpdateData } from '../middleware/validation';

const router = Router();

// Apply authentication to all campaign routes
router.use(authenticateToken);

// --- CORRECTED PATCH ROUTE ---
// This route now points to the new, more lenient handler and does NOT use the strict validation middleware.
// PARTIAL UPDATE (PATCH) also uses the lenient validation
router.patch('/:id',
  requireRole(['admin', 'editor']),
  validateCampaignUpdateData,
  campaignHandler.updateCampaignPartial.bind(campaignHandler)
);
// --- END OF CORRECTIONS ---


// CREATE uses the strict validation
router.post('/', 
  requireRole(['admin', 'editor']),
  validateCampaignData,
  campaignHandler.createCampaign.bind(campaignHandler)
);


router.get('/',
  validateQueryParams,
  campaignHandler.getCampaigns.bind(campaignHandler)
);

router.get('/:id',
  campaignHandler.getCampaign.bind(campaignHandler)
);

// UPDATE (PUT) now uses the lenient validation
router.put('/:id',
  requireRole(['admin', 'editor']),
  validateCampaignUpdateData,
  campaignHandler.updateCampaign.bind(campaignHandler)
);

router.delete('/:id',
  requireRole(['admin']),
  campaignHandler.deleteCampaign.bind(campaignHandler)
);

// Campaign evaluation
router.post('/evaluate',
  campaignHandler.evaluateCampaigns.bind(campaignHandler)
);

// Campaign validation
router.get('/:id/validate',
  campaignHandler.validateCampaign.bind(campaignHandler)
);

// Campaign statistics
router.patch('/:id/statistics',
  requireRole(['admin', 'editor']),
  campaignHandler.updateStatistics.bind(campaignHandler)
);

// ── Approval workflow ──────────────────────────────────────────────────────
router.get('/pending-review',
  requireRole(['admin']),
  approvalHandler.getPendingReview.bind(approvalHandler)
);

router.post('/:id/submit-review',
  requireRole(['admin', 'editor']),
  approvalHandler.submitForReview.bind(approvalHandler)
);

router.post('/:id/approve',
  requireRole(['admin']),
  approvalHandler.approve.bind(approvalHandler)
);

router.post('/:id/reject',
  requireRole(['admin']),
  approvalHandler.reject.bind(approvalHandler)
);

router.post('/:id/recall',
  requireRole(['admin', 'editor']),
  approvalHandler.recall.bind(approvalHandler)
);

export const campaignRoutes = router;