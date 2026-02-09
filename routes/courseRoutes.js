import express from 'express';
import {
  getCourses,
  getCoursesByCategory,
  getCourseDetails,
  getCategories,
  getFeaturedCourses,
  getRecommendedCourses,
  recordCourseInteraction
} from '../controllers/courseController.js';
import { authenticateToken } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';

const router = express.Router();

// Public routes
router.get('/courses', optionalAuth, getCourses);
router.get('/courses/categories', getCategories);
router.get('/courses/featured', getFeaturedCourses);
router.get('/courses/category/:category', getCoursesByCategory);
router.get('/courses/:courseId', getCourseDetails);

// Protected routes
router.get('/courses/recommended/me', authenticateToken, getRecommendedCourses);
router.post('/courses/interaction', authenticateToken, recordCourseInteraction);

export default router;
