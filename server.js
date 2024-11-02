import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import chatbotRoutes from './routes/chatbotRoutes.js';
import roadmapRoutes from './routes/roadmapRoutes.js';
import checklistRoutes from './routes/checklistRoutes.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();
connectDB();

const app = express();

// Allow requests only from your frontend
app.use(cors({
  origin: 'https://google-f-1.onrender.com', // Replace with your actual frontend URL
  credentials: true,                          // Use this if cookies or auth headers are needed
}));

app.use(express.json());

// Define routes
app.use('/api/user', userRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/checklist', checklistRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
