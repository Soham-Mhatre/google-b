import mongoose from 'mongoose';

const placementSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  companyName: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    required: true 
  },
  questions: [{
    question: {
      type: String,
      required: true
    },
    options: [{
      type: String,
      required: true
    }],
    correctAnswer: {
      type: Number,
      required: true,
      min: 0,
      max: 3
    },
    explanation: {
      type: String,
      required: true
    }
  }],
  concepts: { 
    type: String, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for better query performance
placementSchema.index({ userId: 1, createdAt: -1 });
placementSchema.index({ companyName: 1 });
placementSchema.index({ role: 1 });

export default mongoose.model('Placement', placementSchema);