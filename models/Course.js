import mongoose from 'mongoose';
const courseSchema = new mongoose.Schema({
  courseId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    required: true,
    maxlength: 200
  },
  category: {
    type: String,
    enum: [
      'Artificial Intelligence',
      'Machine Learning',
      'Data Science',
      'Web Development',
      'Mobile Development',
      'Game Development',
      'Cloud Computing',
      'Cybersecurity',
      'DevOps',
      'Blockchain',
      'Programming Languages',
      'Database',
      'UI/UX Design',
      'Software Engineering'
    ],
    required: true,
    index: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    required: true,
    index: true
  },
  duration: {
    hours: { type: Number, required: true },
    minutes: { type: Number, default: 0 }
  },
  instructor: {
    name: { type: String, required: true },
    title: String,
    avatar: String
  },
  videoUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String,
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  skills: [{
    type: String,
    trim: true
  }],
  prerequisites: [{
    type: String
  }],
  learningOutcomes: [{
    type: String
  }],
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  enrollments: {
    type: Number,
    default: 0
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  price: {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' }
  },
  language: {
    type: String,
    default: 'English'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
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

// Indexes for efficient querying
courseSchema.index({ category: 1, difficulty: 1 });
courseSchema.index({ tags: 1 });
courseSchema.index({ 'rating.average': -1 });
courseSchema.index({ enrollments: -1 });
courseSchema.index({ featured: 1, isActive: 1 });

// Text search index
courseSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text',
  skills: 'text'
});

// Update timestamp on save
courseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Course', courseSchema);
