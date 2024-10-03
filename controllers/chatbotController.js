import { askGemini } from '../services/geminiService.js';
import Chat from '../models/Chat.js';

export const askChatbot = async (req, res) => {
  const { message } = req.body;
  const userId = req.user ? req.user.id : null; // Handle unauthenticated requests

  try {
    const botResponse = await askGemini(message);
    
    if (userId) {
      // Save chat to database if user is authenticated
      const chat = new Chat({
        userId,
        userMessage: message,
        botResponse
      });
      await chat.save();
    }

    res.status(200).json({ response: botResponse });
  } catch (error) {
    console.error('Error in chatbot request:', error);
    res.status(500).json({ error: 'Failed to get response from chatbot' });
  }
};

export const getChatHistory = async (req, res) => {
  const userId = req.user.id;

  try {
    const history = await Chat.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
};