import express from 'express';
import { generateRoadmap, getRoadmapHistory } from '../controllers/roadmapController.js';
import auth from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';

const router = express.Router();

router.get('/history', auth, getRoadmapHistory);
router.post('/generate', optionalAuth, generateRoadmap);

export default router;