import mongoose from 'mongoose';

// Schema for storing personalized recommendations generated from federated models
const userRecommendationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  modelId: {
    type: String,
    required: true
  },
  modelVersion: {
    type: Number,
    required: true
  },
  recommendations: [{
    type: {
      type: String,
      enum: ['topic', 'resource', 'roadmap', 'exercise', 'video', 'article']
    },
    item: {
      id: String,
      title: String,
      description: String,
      url: String,
      metadata: mongoose.Schema.Types.Mixed
    },
    score: {
      type: Number, // Confidence/relevance score
      min: 0,
      max: 1
    },
    reasoning: String, // Why this was recommended
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced']
    },
    estimatedTime: Number, // in minutes
    prerequisites: [String]
  }],
  learningPath: [{
    sequence: Number,
    topic: String,
    subtopics: [String],
    resources: [String],
    estimatedDuration: Number // in hours
  }],
  personalizedInsights: {
    strongAreas: [String],
    improvementAreas: [String],
    suggestedFocus: String,
    learningStyle: String,
    progressPrediction: Number // Expected progress percentage
  },
  userFeedback: {
    viewed: Boolean,
    clickedItems: [Number], // Indices of clicked recommendations
    rating: Number,
    helpful: Boolean,
    comment: String
  },
  expiresAt: {
    type: Date,
    default: () => Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// TTL index to auto-delete expired recommendations
userRecommendationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
userRecommendationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('UserRecommendation', userRecommendationSchema);
