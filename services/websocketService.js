import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map(); // userId -> socket
    this.trainingRoomClients = new Map(); // modelId -> Set of userIds
  }

  /**
   * Initialize Socket.io server
   */
  initialize(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: ['https://google-f-2.onrender.com', 'http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Authentication middleware
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('WebSocket server initialized');
  }

  /**
   * Handle new client connection
   */
  handleConnection(socket) {
    const userId = socket.userId;
    console.log(`Client connected: ${userId}`);

    // Store connected client
    this.connectedClients.set(userId, socket);

    // Send welcome message
    socket.emit('connection:success', {
      message: 'Connected to federated learning server',
      userId
    });

    // Join training room handler
    socket.on('training:join', (data) => {
      this.handleJoinTraining(socket, data);
    });

    // Leave training room handler
    socket.on('training:leave', (data) => {
      this.handleLeaveTraining(socket, data);
    });

    // Model update progress
    socket.on('training:progress', (data) => {
      this.handleTrainingProgress(socket, data);
    });

    // Request model update
    socket.on('model:request', (data) => {
      this.handleModelRequest(socket, data);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }

  /**
   * Handle client joining a training session
   */
  handleJoinTraining(socket, data) {
    const { modelId } = data;
    const userId = socket.userId;

    if (!modelId) {
      socket.emit('error', { message: 'Model ID required' });
      return;
    }

    // Join room
    socket.join(`training:${modelId}`);

    // Track in training room
    if (!this.trainingRoomClients.has(modelId)) {
      this.trainingRoomClients.set(modelId, new Set());
    }
    this.trainingRoomClients.get(modelId).add(userId);

    console.log(`User ${userId} joined training for model ${modelId}`);

    // Notify client
    socket.emit('training:joined', {
      modelId,
      message: 'Successfully joined training session'
    });

    // Notify room
    this.io.to(`training:${modelId}`).emit('training:participant_joined', {
      userId,
      totalParticipants: this.trainingRoomClients.get(modelId).size
    });
  }

  /**
   * Handle client leaving training session
   */
  handleLeaveTraining(socket, data) {
    const { modelId } = data;
    const userId = socket.userId;

    socket.leave(`training:${modelId}`);

    if (this.trainingRoomClients.has(modelId)) {
      this.trainingRoomClients.get(modelId).delete(userId);
      
      if (this.trainingRoomClients.get(modelId).size === 0) {
        this.trainingRoomClients.delete(modelId);
      }
    }

    console.log(`User ${userId} left training for model ${modelId}`);

    socket.emit('training:left', { modelId });
  }

  /**
   * Handle training progress updates
   */
  handleTrainingProgress(socket, data) {
    const { modelId, progress, status } = data;
    const userId = socket.userId;

    // Broadcast progress to monitoring clients
    this.io.to(`admin:${modelId}`).emit('training:client_progress', {
      userId,
      progress,
      status
    });
  }

  /**
   * Handle model download request
   */
  handleModelRequest(socket, data) {
    const { modelId } = data;
    
    socket.emit('model:ready', {
      modelId,
      message: 'Model available for download',
      downloadUrl: `/api/federated/model/${modelId}/weights`
    });
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(socket) {
    const userId = socket.userId;
    console.log(`Client disconnected: ${userId}`);

    // Remove from connected clients
    this.connectedClients.delete(userId);

    // Remove from all training rooms
    this.trainingRoomClients.forEach((clients, modelId) => {
      if (clients.has(userId)) {
        clients.delete(userId);
        
        // Notify room
        this.io.to(`training:${modelId}`).emit('training:participant_left', {
          userId,
          totalParticipants: clients.size
        });

        if (clients.size === 0) {
          this.trainingRoomClients.delete(modelId);
        }
      }
    });
  }

  /**
   * Broadcast training round started
   */
  broadcastTrainingRoundStart(modelId, roundData) {
    console.log(`Broadcasting training round start for model ${modelId}`);
    
    this.io.emit('training:round_started', {
      modelId,
      roundNumber: roundData.roundNumber,
      targetClients: roundData.targetClients,
      configuration: roundData.configuration,
      message: 'New training round started'
    });
  }

  /**
   * Broadcast training round completed
   */
  broadcastTrainingRoundComplete(modelId, roundData) {
    console.log(`Broadcasting training round completion for model ${modelId}`);
    
    this.io.to(`training:${modelId}`).emit('training:round_completed', {
      modelId,
      roundNumber: roundData.roundNumber,
      participatingClients: roundData.participatingClients,
      metrics: roundData.globalMetrics,
      message: 'Training round completed'
    });
  }

  /**
   * Notify specific user about model update acceptance
   */
  notifyUpdateAccepted(userId, updateData) {
    const socket = this.connectedClients.get(userId.toString());
    
    if (socket) {
      socket.emit('update:accepted', {
        modelId: updateData.modelId,
        trainingRound: updateData.trainingRound,
        qualityScore: updateData.qualityScore,
        message: 'Your model update was accepted'
      });
    }
  }

  /**
   * Notify specific user about model update rejection
   */
  notifyUpdateRejected(userId, updateData, reason) {
    const socket = this.connectedClients.get(userId.toString());
    
    if (socket) {
      socket.emit('update:rejected', {
        modelId: updateData.modelId,
        trainingRound: updateData.trainingRound,
        reason,
        message: 'Your model update was rejected'
      });
    }
  }

  /**
   * Broadcast new model version available
   */
  broadcastNewModelVersion(modelData) {
    console.log(`Broadcasting new model version: ${modelData.modelId} v${modelData.version}`);
    
    this.io.emit('model:new_version', {
      modelId: modelData.modelId,
      version: modelData.version,
      modelType: modelData.modelType,
      performance: modelData.performance,
      message: 'New model version available'
    });
  }

  /**
   * Send personalized notification to user
   */
  sendNotification(userId, notification) {
    const socket = this.connectedClients.get(userId.toString());
    
    if (socket) {
      socket.emit('notification', notification);
    }
  }

  /**
   * Broadcast system message
   */
  broadcastSystemMessage(message, data = {}) {
    this.io.emit('system:message', {
      message,
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  /**
   * Get training room participants
   */
  getTrainingParticipants(modelId) {
    return this.trainingRoomClients.get(modelId) || new Set();
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId) {
    return this.connectedClients.has(userId.toString());
  }
}

// Export singleton instance
export default new WebSocketService();
