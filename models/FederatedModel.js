import mongoose from 'mongoose';
// Schema for storing global federated learning models
const federatedModelSchema = new mongoose.Schema({
  modelId: {
    type: String,
    required: true,
    unique: true
  },
  version: {
    type: Number,
    required: true,
    default: 1
  },
  modelType: {
    type: String,
    enum: ['recommendation', 'difficulty_prediction', 'content_suggestion', 'learning_path'],
    required: true
  },
  architecture: {
    inputShape: [Number],
    layers: [mongoose.Schema.Types.Mixed],
    outputShape: [Number]
  },
  weights: {
    type: Buffer, // Serialized model weights
    required: true
  },
  weightsMetadata: {
    format: String, // 'tensorflowjs', 'onnx', etc.
    compression: String,
    checksum: String
  },
  trainingRound: {
    type: Number,
    default: 0
  },
  participatingClients: {
    type: Number,
    default: 0
  },
  performance: {
    accuracy: Number,
    loss: Number,
    mae: Number,
    mse: Number,
    f1Score: Number
  },
  hyperparameters: {
    learningRate: Number,
    batchSize: Number,
    epochs: Number,
    optimizer: String
  },
  aggregationMethod: {
    type: String,
    enum: ['fedavg', 'fedprox', 'fedadam', 'custom'],
    default: 'fedavg'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update the updatedAt timestamp on save
federatedModelSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient version queries
federatedModelSchema.index({ modelType: 1, version: -1 });
federatedModelSchema.index({ isActive: 1, modelType: 1 });

export default mongoose.model('FederatedModel', federatedModelSchema);