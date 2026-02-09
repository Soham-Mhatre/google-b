import * as tf from '@tensorflow/tfjs';
import crypto from 'crypto';
// Note: Using @tensorflow/tfjs (CPU backend) instead of tfjs-node for broader compatibility
// For production with higher performance needs, consider using @tensorflow/tfjs-node
import FederatedModel from '../models/FederatedModel.js';
import ModelUpdate from '../models/ModelUpdate.js';
import TrainingRound from '../models/TrainingRound.js';
import { v4 as uuidv4 } from 'uuid';

class FederatedLearningService {
  constructor() {
    this.models = new Map(); // Cache for loaded models
    this.currentRounds = new Map(); // Track active training rounds
  }

  /**
   * Initialize a new federated learning model
   */
  async initializeModel(modelType, architecture, hyperparameters) {
    try {
      // Create TensorFlow model based on architecture
      const model = tf.sequential();
      
      // Add layers based on architecture specification
      for (let i = 0; i < architecture.layers.length; i++) {
        const layerConfig = architecture.layers[i];
        
        if (i === 0) {
          // First layer needs input shape
          model.add(tf.layers[layerConfig.type]({
            units: layerConfig.units,
            activation: layerConfig.activation,
            inputShape: architecture.inputShape,
            ...layerConfig.config
          }));
        } else {
          model.add(tf.layers[layerConfig.type]({
            units: layerConfig.units,
            activation: layerConfig.activation,
            ...layerConfig.config
          }));
        }
      }

      // Compile the model
      model.compile({
        optimizer: tf.train[hyperparameters.optimizer || 'adam'](hyperparameters.learningRate || 0.001),
        loss: hyperparameters.loss || 'meanSquaredError',
        metrics: hyperparameters.metrics || ['accuracy']
      });

      // Serialize model weights
      const weights = model.getWeights();
      const weightsData = await this.serializeWeights(weights);

      // Create model ID
      const modelId = `${modelType}_${uuidv4()}`;

      // Save to database
      const federatedModel = new FederatedModel({
        modelId,
        version: 1,
        modelType,
        architecture,
        weights: weightsData,
        weightsMetadata: {
          format: 'tensorflowjs',
          compression: 'none',
          checksum: this.calculateChecksum(weightsData)
        },
        trainingRound: 0,
        hyperparameters,
        aggregationMethod: 'fedavg',
        isActive: true
      });

      await federatedModel.save();

      // Cache the model
      this.models.set(modelId, model);

      console.log(`Initialized new federated model: ${modelId}`);
      return federatedModel;
    } catch (error) {
      console.error('Error initializing model:', error);
      throw error;
    }
  }

  /**
   * Get the latest active model for a specific type
   */
  async getLatestModel(modelType) {
    try {
      const model = await FederatedModel.findOne({
        modelType,
        isActive: true
      }).sort({ version: -1 });

      if (!model) {
        throw new Error(`No active model found for type: ${modelType}`);
      }

      return model;
    } catch (error) {
      console.error('Error fetching latest model:', error);
      throw error;
    }
  }

  /**
   * Load model weights from database
   */
  async loadModel(modelId) {
    try {
      // Check cache first
      if (this.models.has(modelId)) {
        return this.models.get(modelId);
      }

      // Load from database
      const modelData = await FederatedModel.findOne({ modelId });
      if (!modelData) {
        throw new Error(`Model not found: ${modelId}`);
      }

      // Reconstruct TensorFlow model
      const model = tf.sequential();
      
      for (let i = 0; i < modelData.architecture.layers.length; i++) {
        const layerConfig = modelData.architecture.layers[i];
        
        if (i === 0) {
          model.add(tf.layers[layerConfig.type]({
            units: layerConfig.units,
            activation: layerConfig.activation,
            inputShape: modelData.architecture.inputShape,
            ...layerConfig.config
          }));
        } else {
          model.add(tf.layers[layerConfig.type]({
            units: layerConfig.units,
            activation: layerConfig.activation,
            ...layerConfig.config
          }));
        }
      }

      // Compile model
      model.compile({
        optimizer: tf.train[modelData.hyperparameters.optimizer || 'adam'](
          modelData.hyperparameters.learningRate || 0.001
        ),
        loss: modelData.hyperparameters.loss || 'meanSquaredError',
        metrics: modelData.hyperparameters.metrics || ['accuracy']
      });

      // Deserialize and set weights
      const weights = await this.deserializeWeights(modelData.weights);
      model.setWeights(weights);

      // Cache the model
      this.models.set(modelId, model);

      return model;
    } catch (error) {
      console.error('Error loading model:', error);
      throw error;
    }
  }

  /**
   * Initiate a new training round
   */
  async startTrainingRound(modelId, configuration = {}) {
    try {
      const modelData = await FederatedModel.findOne({ modelId });
      if (!modelData) {
        throw new Error(`Model not found: ${modelId}`);
      }

      // Check if there's already an active round for this model
      const activeRound = await TrainingRound.findOne({
        modelId,
        status: { $in: ['initiated', 'in_progress', 'aggregating'] }
      });

      if (activeRound) {
        console.log(`Training round ${activeRound.roundNumber} already active for model ${modelId}`);
        return activeRound;
      }

      // Get the next round number
      const lastRound = await TrainingRound.findOne({ modelId }).sort({ roundNumber: -1 });
      const roundNumber = (lastRound?.roundNumber || 0) + 1;

      // Create new training round
      const trainingRound = new TrainingRound({
        roundNumber,
        modelId,
        modelVersion: modelData.version,
        status: 'initiated',
        targetClients: configuration.targetClients || 10,
        aggregationMethod: modelData.aggregationMethod,
        configuration: {
          minClients: configuration.minClients || 5,
          maxClients: configuration.maxClients || 50,
          clientSelectionStrategy: configuration.clientSelectionStrategy || 'random',
          aggregationThreshold: configuration.aggregationThreshold || 0.8,
          timeoutMinutes: configuration.timeoutMinutes || 60
        }
      });

      await trainingRound.save();
      
      // Update model training round
      modelData.trainingRound = roundNumber;
      await modelData.save();

      this.currentRounds.set(modelId, trainingRound);

      console.log(`Started training round ${roundNumber} for model ${modelId}`);
      return trainingRound;
    } catch (error) {
      console.error('Error starting training round:', error);
      throw error;
    }
  }

  /**
   * Submit a client model update
   */
  async submitModelUpdate(userId, modelId, updateData) {
    try {
      const modelData = await FederatedModel.findOne({ modelId });
      if (!modelData) {
        throw new Error(`Model not found: ${modelId}`);
      }

      // Get current training round
      const trainingRound = await TrainingRound.findOne({
        modelId,
        status: { $in: ['initiated', 'in_progress'] }
      });

      if (!trainingRound) {
        throw new Error('No active training round for this model');
      }

      // Validate update data
      const qualityScore = await this.validateUpdate(updateData);

      // Create model update record
      const modelUpdate = new ModelUpdate({
        userId,
        modelId,
        modelVersion: modelData.version,
        trainingRound: trainingRound.roundNumber,
        weightsUpdate: updateData.weights,
        updateMetadata: updateData.metadata,
        trainingMetrics: updateData.metrics,
        deviceInfo: updateData.deviceInfo,
        dataDistribution: updateData.dataDistribution,
        status: qualityScore > 0.5 ? 'pending' : 'rejected',
        qualityScore
      });

      await modelUpdate.save();

      // Update training round
      if (qualityScore > 0.5) {
        trainingRound.participatingClients.push(userId);
        trainingRound.updatesReceived += 1;
        trainingRound.status = 'in_progress';
      } else {
        trainingRound.updatesRejected += 1;
      }
      
      await trainingRound.save();

      console.log(`Received model update from user ${userId}, quality score: ${qualityScore}`);

      // Check if we have enough updates to aggregate
      if (trainingRound.updatesReceived >= trainingRound.configuration.minClients) {
        // Trigger aggregation (can be done asynchronously)
        this.triggerAggregation(modelId, trainingRound.roundNumber);
      }

      return modelUpdate;
    } catch (error) {
      console.error('Error submitting model update:', error);
      throw error;
    }
  }

  /**
   * Validate a client model update
   */
  async validateUpdate(updateData) {
    try {
      let qualityScore = 1.0;

      // Check if weights data is valid
      if (!updateData.weights || updateData.weights.length === 0) {
        qualityScore *= 0.1;
      }

      // Check training metrics
      if (updateData.metrics) {
        // Penalize if loss is too high or NaN
        if (!updateData.metrics.trainingLoss || isNaN(updateData.metrics.trainingLoss)) {
          qualityScore *= 0.3;
        } else if (updateData.metrics.trainingLoss > 10) {
          qualityScore *= 0.5;
        }

        // Check if enough samples were used
        if (updateData.metrics.samplesUsed < 10) {
          qualityScore *= 0.7;
        }
      }

      // Check data distribution
      if (updateData.dataDistribution && updateData.dataDistribution.totalSamples < 5) {
        qualityScore *= 0.6;
      }

      return Math.max(0, Math.min(1, qualityScore));
    } catch (error) {
      console.error('Error validating update:', error);
      return 0.5; // Default medium quality if validation fails
    }
  }

  /**
   * Aggregate model updates using FedAvg algorithm
   */
  async aggregateUpdates(modelId, trainingRound) {
    try {
      console.log(`Starting aggregation for model ${modelId}, round ${trainingRound}`);

      // Update round status
      await TrainingRound.updateOne(
        { modelId, roundNumber: trainingRound },
        { status: 'aggregating', aggregationTime: new Date() }
      );

      // Fetch all pending updates for this round
      const updates = await ModelUpdate.find({
        modelId,
        trainingRound,
        status: 'pending'
      });

      if (updates.length === 0) {
        throw new Error('No valid updates to aggregate');
      }

      console.log(`Aggregating ${updates.length} model updates`);

      // Load current global model
      const model = await this.loadModel(modelId);
      const currentWeights = model.getWeights();

      // Initialize aggregated weights
      let aggregatedWeights = currentWeights.map(w => tf.zeros(w.shape));

      // Sum all client weights (weighted by sample size)
      let totalSamples = 0;
      const clientMetrics = [];

      for (const update of updates) {
        const clientWeights = await this.deserializeWeights(update.weightsUpdate);
        const sampleWeight = update.trainingMetrics.samplesUsed || 1;
        totalSamples += sampleWeight;

        // Weighted sum
        for (let i = 0; i < clientWeights.length; i++) {
          const weighted = tf.mul(clientWeights[i], sampleWeight);
          aggregatedWeights[i] = tf.add(aggregatedWeights[i], weighted);
          weighted.dispose();
        }

        // Dispose client weights
        clientWeights.forEach(w => w.dispose());

        // Collect metrics
        clientMetrics.push({
          loss: update.trainingMetrics.trainingLoss,
          accuracy: update.trainingMetrics.trainingAccuracy
        });

        // Mark as aggregated
        update.status = 'aggregated';
        update.aggregatedAt = new Date();
        await update.save();
      }

      // Average the weights
      for (let i = 0; i < aggregatedWeights.length; i++) {
        const averaged = tf.div(aggregatedWeights[i], totalSamples);
        aggregatedWeights[i].dispose();
        aggregatedWeights[i] = averaged;
      }

      // Set the new weights to the model
      model.setWeights(aggregatedWeights);

      // Serialize new weights
      const newWeightsData = await this.serializeWeights(aggregatedWeights);

      // Calculate average metrics
      const avgLoss = clientMetrics.reduce((sum, m) => sum + (m.loss || 0), 0) / clientMetrics.length;
      const avgAccuracy = clientMetrics.reduce((sum, m) => sum + (m.accuracy || 0), 0) / clientMetrics.length;

      // Update model in database
      const modelData = await FederatedModel.findOne({ modelId });
      const newVersion = modelData.version + 1;

      const updatedModel = new FederatedModel({
        modelId,
        version: newVersion,
        modelType: modelData.modelType,
        architecture: modelData.architecture,
        weights: newWeightsData,
        weightsMetadata: {
          format: 'tensorflowjs',
          compression: 'none',
          checksum: this.calculateChecksum(newWeightsData)
        },
        trainingRound: trainingRound,
        participatingClients: updates.length,
        performance: {
          loss: avgLoss,
          accuracy: avgAccuracy
        },
        hyperparameters: modelData.hyperparameters,
        aggregationMethod: modelData.aggregationMethod,
        isActive: true
      });

      await updatedModel.save();

      // Deactivate old version
      modelData.isActive = false;
      await modelData.save();

      // Update cache
      this.models.set(modelId, model);

      // Update training round
      const endTime = new Date();
      await TrainingRound.updateOne(
        { modelId, roundNumber: trainingRound },
        {
          status: 'completed',
          endTime,
          updatesAggregated: updates.length,
          duration: (endTime - (await TrainingRound.findOne({ modelId, roundNumber: trainingRound })).startTime) / 1000,
          globalMetrics: {
            averageLoss: avgLoss,
            averageAccuracy: avgAccuracy
          }
        }
      );

      // Cleanup tensors
      currentWeights.forEach(w => w.dispose());
      aggregatedWeights.forEach(w => w.dispose());

      console.log(`Aggregation completed for model ${modelId}, new version: ${newVersion}`);

      return {
        modelId,
        version: newVersion,
        participatingClients: updates.length,
        metrics: {
          loss: avgLoss,
          accuracy: avgAccuracy
        }
      };
    } catch (error) {
      console.error('Error aggregating updates:', error);
      
      // Mark round as failed
      await TrainingRound.updateOne(
        { modelId, roundNumber: trainingRound },
        { 
          status: 'failed',
          endTime: new Date(),
          notes: error.message
        }
      );
      
      throw error;
    }
  }

  /**
   * Trigger aggregation asynchronously
   */
  triggerAggregation(modelId, trainingRound) {
    // Use setTimeout to avoid blocking
    setTimeout(async () => {
      try {
        await this.aggregateUpdates(modelId, trainingRound);
      } catch (error) {
        console.error('Aggregation failed:', error);
      }
    }, 1000);
  }

  /**
   * Generate personalized predictions using the federated model
   */
  async generatePredictions(userId, modelType, inputData) {
    try {
      // Get latest model
      const modelData = await this.getLatestModel(modelType);
      const model = await this.loadModel(modelData.modelId);

      // Prepare input tensor
      const inputTensor = tf.tensor2d([inputData]);

      // Make prediction
      const prediction = model.predict(inputTensor);
      const predictionData = await prediction.array();

      // Cleanup
      inputTensor.dispose();
      prediction.dispose();

      return predictionData[0];
    } catch (error) {
      console.error('Error generating predictions:', error);
      throw error;
    }
  }

  /**
   * Serialize TensorFlow weights to Buffer
   */
  async serializeWeights(weights) {
    try {
      const weightsData = [];
      
      for (const weight of weights) {
        const data = await weight.data();
        const shape = weight.shape;
        weightsData.push({
          data: Array.from(data),
          shape: shape,
          dtype: weight.dtype
        });
      }

      return Buffer.from(JSON.stringify(weightsData));
    } catch (error) {
      console.error('Error serializing weights:', error);
      throw error;
    }
  }

  /**
   * Deserialize Buffer to TensorFlow weights
   */
  async deserializeWeights(buffer) {
    try {
      const weightsData = JSON.parse(buffer.toString());
      const weights = [];

      for (const weightData of weightsData) {
        const tensor = tf.tensor(weightData.data, weightData.shape, weightData.dtype);
        weights.push(tensor);
      }

      return weights;
    } catch (error) {
      console.error('Error deserializing weights:', error);
      throw error;
    }
  }

  /**
   * Calculate checksum for weights data
   */
  calculateChecksum(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Clean up old model versions and training rounds
   */
  async cleanup(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Delete old inactive models
      await FederatedModel.deleteMany({
        isActive: false,
        createdAt: { $lt: cutoffDate }
      });

      // Delete old completed training rounds
      await TrainingRound.deleteMany({
        status: 'completed',
        endTime: { $lt: cutoffDate }
      });

      // Delete old aggregated updates
      await ModelUpdate.deleteMany({
        status: 'aggregated',
        aggregatedAt: { $lt: cutoffDate }
      });

      console.log('Cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Export singleton instance
export default new FederatedLearningService();
