import express from 'express';
import { generateRoadmap, getRoadmapHistory } from '../controllers/roadmapController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/history', auth, getRoadmapHistory);
router.post('/generate', auth, generateRoadmap);

export default router;