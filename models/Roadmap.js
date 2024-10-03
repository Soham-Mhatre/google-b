import mongoose from 'mongoose';

const roadmapSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  topic: { type: String, required: true },
  duration: { type: Number, required: true },  // Changed from 'weeks' to 'duration'
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Roadmap', roadmapSchema);