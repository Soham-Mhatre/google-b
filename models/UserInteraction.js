import mongoose from 'mongoose';

// Schema for tracking user learning interactions
const userInteractionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  sessionId: {
    type: String,
    required: true
  },
  interactionType: {
    type: String,
    enum: [
      'chatbot', 
      'roadmap', 
      'checklist', 
      'placement', 
      'video_watch', 
      'quiz', 
      'resource_click',
      'recommendation_view',
      'recommendation_click',
      'recommendation_dismiss',
      'recommendation_regenerate',
      'search',
      'page_view',
      'content_share',
      'bookmark',
      'course_view',
      'course_enroll',
      'course_complete'
    ],
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  subtopic: {
    type: String
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced']
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  score: {
    type: Number, // for quiz/assessment interactions
    min: 0,
    max: 100
  },
  feedback: {
    helpful: Boolean,
    rating: Number
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});

// Compound index for efficient querying
userInteractionSchema.index({ userId: 1, createdAt: -1 });
userInteractionSchema.index({ userId: 1, topic: 1 });

export default mongoose.model('UserInteraction', userInteractionSchema);
