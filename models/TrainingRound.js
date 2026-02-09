import mongoose from 'mongoose';

// Schema for managing federated learning training rounds
const trainingRoundSchema = new mongoose.Schema({
  roundNumber: {
    type: Number,
    required: true,
    unique: true
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
  status: {
    type: String,
    enum: ['initiated', 'in_progress', 'aggregating', 'completed', 'failed'],
    default: 'initiated',
    index: true
  },
  targetClients: {
    type: Number,
    default: 10 // Minimum clients needed for aggregation
  },
  participatingClients: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },
  updatesReceived: {
    type: Number,
    default: 0
  },
  updatesAggregated: {
    type: Number,
    default: 0
  },
  updatesRejected: {
    type: Number,
    default: 0
  },
  aggregationMethod: {
    type: String,
    enum: ['fedavg', 'fedprox', 'fedadam'],
    default: 'fedavg'
  },
  globalMetrics: {
    averageLoss: Number,
    averageAccuracy: Number,
    improvementFromPrevious: Number
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  aggregationTime: {
    type: Date
  },
  duration: {
    type: Number // in seconds
  },
  configuration: {
    minClients: Number,
    maxClients: Number,
    clientSelectionStrategy: String,
    aggregationThreshold: Number,
    timeoutMinutes: Number
  },
  notes: {
    type: String
  },
  errors: [{
    timestamp: Date,
    message: String,
    userId: mongoose.Schema.Types.ObjectId
  }]
});

// Index for querying active rounds
trainingRoundSchema.index({ status: 1, startTime: -1 });

export default mongoose.model('TrainingRound', trainingRoundSchema);
