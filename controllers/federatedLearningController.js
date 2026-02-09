import federatedLearningService from '../services/federatedLearningService.js';
import recommendationService from '../services/recommendationService.js';
import UserInteraction from '../models/UserInteraction.js';
import ModelUpdate from '../models/ModelUpdate.js';
import TrainingRound from '../models/TrainingRound.js';
import FederatedModel from '../models/FederatedModel.js';

/**
 * Initialize a new federated learning model
 */
export const initializeModel = async (req, res) => {
  try {
    const { modelType, architecture, hyperparameters } = req.body;

    if (!modelType || !architecture) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const model = await federatedLearningService.initializeModel(
      modelType,
      architecture,
      hyperparameters || {}
    );

    res.status(201).json({
      message: 'Model initialized successfully',
      model: {
        modelId: model.modelId,
        version: model.version,
        modelType: model.modelType
      }
    });
  } catch (error) {
    console.error('Error initializing model:', error);
    res.status(500).json({ error: 'Failed to initialize model' });
  }
};

/**
 * Get the latest global model for a specific type
 */
export const getLatestModel = async (req, res) => {
  try {
    const { modelType } = req.params;

    const model = await federatedLearningService.getLatestModel(modelType);

    // Don't send the full weights, just metadata
    res.json({
      modelId: model.modelId,
      version: model.version,
      modelType: model.modelType,
      architecture: model.architecture,
      trainingRound: model.trainingRound,
      performance: model.performance,
      hyperparameters: model.hyperparameters,
      participatingClients: model.participatingClients,
      updatedAt: model.updatedAt
    });
  } catch (error) {
    console.error('Error fetching latest model:', error);
    res.status(404).json({ error: 'Model not found' });
  }
};

/**
 * Download model weights for local training
 */
export const downloadModelWeights = async (req, res) => {
  try {
    const { modelId } = req.params;

    const model = await FederatedModel.findOne({ modelId, isActive: true });
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Send weights as binary data
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${modelId}_v${model.version}.weights"`);
    res.send(model.weights);
  } catch (error) {
    console.error('Error downloading model weights:', error);
    res.status(500).json({ error: 'Failed to download model weights' });
  }
};

/**
 * Start a new training round
 */
export const startTrainingRound = async (req, res) => {
  try {
    const { modelId, configuration } = req.body;

    if (!modelId) {
      return res.status(400).json({ error: 'Model ID required' });
    }

    const trainingRound = await federatedLearningService.startTrainingRound(
      modelId,
      configuration || {}
    );

    res.status(201).json({
      message: 'Training round started',
      round: {
        roundNumber: trainingRound.roundNumber,
        modelId: trainingRound.modelId,
        status: trainingRound.status,
        targetClients: trainingRound.targetClients
      }
    });
  } catch (error) {
    console.error('Error starting training round:', error);
    res.status(500).json({ error: 'Failed to start training round' });
  }
};

/**
 * Submit a model update from a client
 */
export const submitModelUpdate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { modelId, weights, metadata, metrics, deviceInfo, dataDistribution } = req.body;

    if (!modelId || !weights) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert weights to Buffer
    const weightsBuffer = Buffer.from(weights, 'base64');

    const updateData = {
      weights: weightsBuffer,
      metadata: metadata || {},
      metrics: metrics || {},
      deviceInfo: deviceInfo || {},
      dataDistribution: dataDistribution || {}
    };

    const modelUpdate = await federatedLearningService.submitModelUpdate(
      userId,
      modelId,
      updateData
    );

    res.status(201).json({
      message: 'Model update submitted successfully',
      update: {
        status: modelUpdate.status,
        qualityScore: modelUpdate.qualityScore,
        trainingRound: modelUpdate.trainingRound
      }
    });
  } catch (error) {
    console.error('Error submitting model update:', error);
    res.status(500).json({ error: 'Failed to submit model update' });
  }
};

/**
 * Get current training round status
 */
export const getTrainingRoundStatus = async (req, res) => {
  try {
    const { modelId } = req.params;

    const trainingRound = await TrainingRound.findOne({
      modelId,
      status: { $in: ['initiated', 'in_progress', 'aggregating'] }
    });

    if (!trainingRound) {
      return res.json({ 
        message: 'No active training round',
        hasActiveRound: false 
      });
    }

    res.json({
      hasActiveRound: true,
      round: {
        roundNumber: trainingRound.roundNumber,
        status: trainingRound.status,
        updatesReceived: trainingRound.updatesReceived,
        targetClients: trainingRound.targetClients,
        startTime: trainingRound.startTime,
        configuration: trainingRound.configuration
      }
    });
  } catch (error) {
    console.error('Error fetching training round status:', error);
    res.status(500).json({ error: 'Failed to fetch training round status' });
  }
};

/**
 * Get user's participation history
 */
export const getUserParticipation = async (req, res) => {
  try {
    const userId = req.user.id;

    const updates = await ModelUpdate.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-weightsUpdate'); // Exclude large weight data

    const stats = {
      totalUpdates: updates.length,
      aggregated: updates.filter(u => u.status === 'aggregated').length,
      pending: updates.filter(u => u.status === 'pending').length,
      rejected: updates.filter(u => u.status === 'rejected').length,
      averageQualityScore: updates.reduce((sum, u) => sum + (u.qualityScore || 0), 0) / updates.length,
      recentUpdates: updates.slice(0, 10).map(u => ({
        modelId: u.modelId,
        trainingRound: u.trainingRound,
        status: u.status,
        qualityScore: u.qualityScore,
        createdAt: u.createdAt
      }))
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching user participation:', error);
    res.status(500).json({ error: 'Failed to fetch participation history' });
  }
};

/**
 * Record user interaction (for training data)
 */
export const recordInteraction = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      sessionId,
      interactionType,
      topic,
      subtopic,
      difficulty,
      timeSpent,
      completed,
      score,
      feedback,
      metadata
    } = req.body;

    if (!interactionType || !topic) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const interaction = new UserInteraction({
      userId,
      sessionId: sessionId || `session_${Date.now()}`,
      interactionType,
      topic,
      subtopic,
      difficulty,
      timeSpent,
      completed,
      score,
      feedback,
      metadata
    });

    await interaction.save();

    res.status(201).json({
      message: 'Interaction recorded',
      interactionId: interaction._id
    });
  } catch (error) {
    console.error('Error recording interaction:', error);
    res.status(500).json({ error: 'Failed to record interaction' });
  }
};

/**
 * Get personalized recommendations
 */
export const getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if recent recommendations exist
    let recommendations = await recommendationService.getLatestRecommendations(userId);

    // If no recent recommendations or expired, generate new ones
    if (!recommendations || new Date() > recommendations.expiresAt) {
      recommendations = await recommendationService.generateRecommendations(userId);
    }

    res.json({
      recommendations: recommendations.recommendations,
      learningPath: recommendations.learningPath,
      insights: recommendations.personalizedInsights,
      modelVersion: recommendations.modelVersion,
      createdAt: recommendations.createdAt
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
};

/**
 * Force regenerate recommendations
 */
export const regenerateRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;

    const recommendations = await recommendationService.generateRecommendations(userId);

    res.json({
      message: 'Recommendations regenerated',
      recommendations: recommendations.recommendations,
      learningPath: recommendations.learningPath,
      insights: recommendations.personalizedInsights
    });
  } catch (error) {
    console.error('Error regenerating recommendations:', error);
    res.status(500).json({ error: 'Failed to regenerate recommendations' });
  }
};

/**
 * Submit feedback on recommendations
 */
export const submitRecommendationFeedback = async (req, res) => {
  try {
    const userId = req.user.id;
    const { recommendationId, feedback } = req.body;

    if (!recommendationId || !feedback) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await recommendationService.recordFeedback(userId, recommendationId, feedback);

    res.json({ message: 'Feedback recorded successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
};

/**
 * Get model performance metrics (admin)
 */
export const getModelMetrics = async (req, res) => {
  try {
    const { modelId } = req.params;

    const model = await FederatedModel.findOne({ modelId, isActive: true });
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Get recent training rounds
    const recentRounds = await TrainingRound.find({ modelId })
      .sort({ roundNumber: -1 })
      .limit(10);

    // Get update statistics
    const updateStats = await ModelUpdate.aggregate([
      { $match: { modelId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgQuality: { $avg: '$qualityScore' }
        }
      }
    ]);

    res.json({
      model: {
        modelId: model.modelId,
        version: model.version,
        modelType: model.modelType,
        trainingRound: model.trainingRound,
        performance: model.performance,
        participatingClients: model.participatingClients
      },
      recentRounds: recentRounds.map(r => ({
        roundNumber: r.roundNumber,
        status: r.status,
        participatingClients: r.participatingClients.length,
        updatesReceived: r.updatesReceived,
        globalMetrics: r.globalMetrics,
        duration: r.duration
      })),
      updateStatistics: updateStats
    });
  } catch (error) {
    console.error('Error fetching model metrics:', error);
    res.status(500).json({ error: 'Failed to fetch model metrics' });
  }
};

/**
 * Get user's local training data summary
 */
export const getLocalTrainingData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 100 } = req.query;

    // Get recent interactions for local training
    const interactions = await UserInteraction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Prepare training data summary
    const trainingData = interactions.map(interaction => ({
      topic: interaction.topic,
      subtopic: interaction.subtopic,
      difficulty: interaction.difficulty,
      interactionType: interaction.interactionType,
      timeSpent: interaction.timeSpent,
      completed: interaction.completed,
      score: interaction.score,
      timestamp: interaction.createdAt
    }));

    res.json({
      totalSamples: trainingData.length,
      data: trainingData
    });
  } catch (error) {
    console.error('Error fetching local training data:', error);
    res.status(500).json({ error: 'Failed to fetch training data' });
  }
};

/**
 * Get user's interaction history
 */
export const getUserInteractions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50 } = req.query;

    const interactions = await UserInteraction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('topic subtopic interactionType difficulty timeSpent completed createdAt');

    res.json({
      interactions,
      total: interactions.length
    });
  } catch (error) {
    console.error('Error fetching user interactions:', error);
    res.status(500).json({ error: 'Failed to fetch interactions' });
  }
};
