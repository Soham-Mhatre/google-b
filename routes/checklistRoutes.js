import express from 'express';
import Checklist from '../models/Checklist.js';
import auth from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';

const router = express.Router();

// Get all checklist items for a user
router.get('/', auth, async (req, res) => {
  try {
    const checklist = await Checklist.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ checklist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch checklist' });
  }
});

// Add a new checklist item
router.post('/add', auth, async (req, res) => {
  try {
    const { content, type } = req.body;
    const checklistItem = new Checklist({
      userId: req.user.id,
      content,
      type
    });
    await checklistItem.save();
    res.status(201).json({ item: checklistItem });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add to checklist' });
  }
});

// Update a checklist item (toggle completion)
router.patch('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;
    const updatedItem = await Checklist.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { completed },
      { new: true }
    );
    if (!updatedItem) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }
    res.json({ item: updatedItem });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
});

// Remove a checklist item
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedItem = await Checklist.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!deletedItem) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }
    res.json({ message: 'Checklist item removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove checklist item' });
  }
});

export default router;