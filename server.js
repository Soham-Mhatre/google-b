import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import chatbotRoutes from './routes/chatbotRoutes.js';
import roadmapRoutes from './routes/roadmapRoutes.js';
import checklistRoutes from './routes/checklistRoutes.js';
import userRoutes from './routes/userRoutes.js';
import placementRoutes from './routes/placementRoutes.js';

dotenv.config();

// Attempt to connect to MongoDB with error handling
connectDB().then(() => {
  console.log("Connected to MongoDB successfully");
}).catch((error) => {
  console.error("Failed to connect to MongoDB:", error);
});

// Initialize express app
const app = express();

// Configure CORS for specific frontend URL
app.use(cors({
  origin: '*', // Replace with your actual frontend URL
  credentials: true,
}));

app.use(express.json());

// Define routes
app.use('/api/user', userRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/checklist', checklistRoutes);
app.use('/api/placement', placementRoutes);

// Global error handler for any unhandled errors
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
