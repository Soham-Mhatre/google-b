import mongoose from 'mongoose';

// Schema for storing client model updates before aggregation
const modelUpdateSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  modelId: {
    type: String,
    required: true,
    index: true
  },
  modelVersion: {
    type: Number,
    required: true
  },
  trainingRound: {
    type: Number,
    required: true,
    index: true
  },
  weightsUpdate: {
    type: Buffer, // Serialized weight updates (gradients or full weights)
    required: true
  },
  updateMetadata: {
    format: String,
    compression: String,
    updateType: String, // 'gradient' or 'weights'
    checksum: String
  },
  trainingMetrics: {
    localEpochs: Number,
    samplesUsed: Number,
    trainingLoss: Number,
    trainingAccuracy: Number,
    validationLoss: Number,
    validationAccuracy: Number,
    timeSpent: Number // in seconds
  },
  deviceInfo: {
    userAgent: String,
    memory: Number,
    cores: Number
  },
  dataDistribution: {
    // Statistics about local data used for training
    topicCounts: Map,
    interactionTypes: Map,
    totalSamples: Number
  },
  status: {
    type: String,
    enum: ['pending', 'aggregated', 'rejected', 'outlier'],
    default: 'pending'
  },
  qualityScore: {
    type: Number, // Score assigned during validation
    min: 0,
    max: 1
  },
  aggregatedAt: {
    type: Date
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});

// Compound indexes for efficient aggregation queries
modelUpdateSchema.index({ trainingRound: 1, status: 1 });
modelUpdateSchema.index({ modelId: 1, modelVersion: 1, trainingRound: 1 });

export default mongoose.model('ModelUpdate', modelUpdateSchema);
