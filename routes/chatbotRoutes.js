import express from 'express';
import { askChatbot, getChatHistory } from '../controllers/chatbotController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/ask', auth, askChatbot);
router.get('/history', auth, getChatHistory);

export default router;