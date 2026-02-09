import express from 'express';
import * as federatedLearningController from '../controllers/federatedLearningController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Model management routes
router.post('/model/initialize', federatedLearningController.initializeModel);
router.get('/model/:modelType/latest', federatedLearningController.getLatestModel);
router.get('/model/:modelId/weights', auth, federatedLearningController.downloadModelWeights);
router.get('/model/:modelId/metrics', federatedLearningController.getModelMetrics);

// Training round routes
router.post('/training/start', federatedLearningController.startTrainingRound);
router.get('/training/:modelId/status', federatedLearningController.getTrainingRoundStatus);

// Client participation routes
router.post('/update/submit', auth, federatedLearningController.submitModelUpdate);
router.get('/participation/history', auth, federatedLearningController.getUserParticipation);
router.get('/training/data', auth, federatedLearningController.getLocalTrainingData);

// Interaction tracking routes
router.post('/interaction/record', auth, federatedLearningController.recordInteraction);
router.get('/interactions/me', auth, federatedLearningController.getUserInteractions);

// Recommendation routes
router.get('/recommendations', auth, federatedLearningController.getRecommendations);
router.post('/recommendations/regenerate', auth, federatedLearningController.regenerateRecommendations);
router.post('/recommendations/feedback', auth, federatedLearningController.submitRecommendationFeedback);

export default router;
