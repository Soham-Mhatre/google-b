import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import connectDB from './config/database.js';
import chatbotRoutes from './routes/chatbotRoutes.js';
import roadmapRoutes from './routes/roadmapRoutes.js';
import checklistRoutes from './routes/checklistRoutes.js';
import userRoutes from './routes/userRoutes.js';
import placementRoutes from './routes/placementRoutes.js';
import federatedLearningRoutes from './routes/federatedLearningRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import websocketService from './services/websocketService.js';
import federatedLearningService from './services/federatedLearningService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// Import federated learning initialization
import { initializeFederatedLearning, checkSystemHealth } from './utils/initFederatedLearning.js';

// Attempt to connect to MongoDB with error handling
connectDB().then(async () => {
  console.log("Connected to MongoDB successfully");
  
  // Initialize federated learning system
  try {
    await initializeFederatedLearning();
    await checkSystemHealth();
  } catch (error) {
    console.error("Failed to initialize federated learning:", error);
    console.log("Server will continue without federated learning");
  }
}).catch((error) => {
  console.error("Failed to connect to MongoDB:", error);
});

// Initialize express app
const app = express();
const httpServer = createServer(app);

// Initialize WebSocket service
websocketService.initialize(httpServer);

// Configure CORS for specific frontend URL
app.use(cors({
  origin: ['https://google-f-2.onrender.com', 'http://localhost:5173'], // Production and development URLs
  credentials: true,
}));

app.use(express.json({ limit: '50mb' })); // Increased limit for model weights
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Define routes
app.use('/api/user', userRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/checklist', checklistRoutes);
app.use('/api/placement', placementRoutes);
app.use('/api/federated', federatedLearningRoutes);
app.use('/api', courseRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date(),
    connectedClients: websocketService.getConnectedClientsCount()
  });
});

// Global error handler for any unhandled errors
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Schedule automated training rounds (every 6 hours)
cron.schedule('0 */6 * * *', async () => {
  try {
    console.log('Running scheduled training round...');
    const modelData = await federatedLearningService.getLatestModel('recommendation');
    if (modelData) {
      await federatedLearningService.startTrainingRound(modelData.modelId);
    }
  } catch (error) {
    console.error('Scheduled training round failed:', error);
  }
});

// Schedule cleanup (daily at 2 AM)
cron.schedule('0 2 * * *', async () => {
  try {
    console.log('Running cleanup task...');
    await federatedLearningService.cleanup(30);
  } catch (error) {
    console.error('Cleanup task failed:', error);
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
  console.log(`Federated Learning enabled`);
});
