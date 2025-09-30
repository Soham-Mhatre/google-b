import express from 'express';
import { askChatbot, getChatHistory } from '../controllers/chatbotController.js';
import auth from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';

const router = express.Router();

router.post('/ask', optionalAuth, askChatbot);
router.get('/history', auth, getChatHistory);

export default router;