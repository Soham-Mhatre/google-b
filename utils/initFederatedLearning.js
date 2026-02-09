import federatedLearningService from '../services/federatedLearningService.js';
import FederatedModel from '../models/FederatedModel.js';

/**
 * Initialize the default federated learning model for recommendations
 */
async function initializeFederatedLearning() {
  try {
    console.log('Initializing Federated Learning System...');

    // Check if model already exists
    const existingModel = await FederatedModel.findOne({
      modelType: 'recommendation',
      isActive: true
    });

    if (existingModel) {
      console.log('Existing recommendation model found:', existingModel.modelId);
      console.log('Version:', existingModel.version);
      return existingModel;
    }

    // Define model architecture
    const architecture = {
      inputShape: [10], // 10 input features from user interactions
      layers: [
        {
          type: 'dense',
          units: 32,
          activation: 'relu',
          config: {}
        },
        {
          type: 'dropout',
          config: { rate: 0.2 }
        },
        {
          type: 'dense',
          units: 16,
          activation: 'relu',
          config: {}
        },
        {
          type: 'dense',
          units: 8,
          activation: 'sigmoid',
          config: {}
        }
      ],
      outputShape: [8] // 8 output classes for topic recommendations
    };

    // Define hyperparameters
    const hyperparameters = {
      learningRate: 0.001,
      batchSize: 32,
      epochs: 5,
      optimizer: 'adam',
      loss: 'meanSquaredError',
      metrics: ['accuracy']
    };

    // Initialize model
    const model = await federatedLearningService.initializeModel(
      'recommendation',
      architecture,
      hyperparameters
    );

    console.log('✓ Federated learning model initialized successfully');
    console.log('Model ID:', model.modelId);
    console.log('Version:', model.version);

    // Start first training round
    const trainingRound = await federatedLearningService.startTrainingRound(model.modelId, {
      targetClients: 10,
      minClients: 5,
      maxClients: 50,
      timeoutMinutes: 60
    });

    console.log('✓ First training round initiated:', trainingRound.roundNumber);

    return model;
  } catch (error) {
    console.error('Error initializing federated learning:', error);
    throw error;
  }
}

/**
 * Check federated learning system health
 */
async function checkSystemHealth() {
  try {
    console.log('\n=== Federated Learning System Health Check ===');

    // Check for active models
    const activeModels = await FederatedModel.find({ isActive: true });
    console.log(`Active Models: ${activeModels.length}`);
    
    activeModels.forEach(model => {
      console.log(`  - ${model.modelType}: v${model.version} (Round ${model.trainingRound})`);
    });

    // Check for pending training rounds
    const TrainingRound = (await import('../models/TrainingRound.js')).default;
    const activeRounds = await TrainingRound.find({
      status: { $in: ['initiated', 'in_progress'] }
    });
    console.log(`Active Training Rounds: ${activeRounds.length}`);

    // Check for pending updates
    const ModelUpdate = (await import('../models/ModelUpdate.js')).default;
    const pendingUpdates = await ModelUpdate.countDocuments({ status: 'pending' });
    console.log(`Pending Model Updates: ${pendingUpdates}`);

    // Check user interactions
    const UserInteraction = (await import('../models/UserInteraction.js')).default;
    const totalInteractions = await UserInteraction.countDocuments();
    const recentInteractions = await UserInteraction.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    console.log(`Total User Interactions: ${totalInteractions}`);
    console.log(`Recent Interactions (24h): ${recentInteractions}`);

    console.log('=== Health Check Complete ===\n');
  } catch (error) {
    console.error('Error checking system health:', error);
  }
}

export { initializeFederatedLearning, checkSystemHealth };
