import express from 'express';
import { generatePlacementContent, getPlacementHistory } from '../controllers/placementController.js';
import auth from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';

const router = express.Router();

// Generate placement content (questions and concepts)
router.post('/generate', optionalAuth, generatePlacementContent);

// Get placement history (requires authentication)
router.get('/history', auth, getPlacementHistory);

export default router;