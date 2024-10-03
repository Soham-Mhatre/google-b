import Checklist from '../models/Checklist.js';

export const addToChecklist = async (req, res) => {
  const { content } = req.body;
  const userId = req.user.id;

  try {
    const checklistItem = new Checklist({
      userId,
      content,
    });
    await checklistItem.save();

    res.status(201).json({ message: 'Added to checklist', item: checklistItem });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add to checklist' });
  }
};

export const getChecklist = async (req, res) => {
  const userId = req.user.id;

  try {
    const checklist = await Checklist.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ checklist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch checklist' });
  }
};

export const removeChecklistItem = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const removedItem = await Checklist.findOneAndRemove({ _id: id, userId });

    if (!removedItem) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    res.status(200).json({ message: 'Checklist item removed', item: removedItem });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove checklist item' });
  }
};

export const clearChecklist = async (req, res) => {
  const userId = req.user.id;

  try {
    await Checklist.deleteMany({ userId });
    res.status(200).json({ message: 'Checklist cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear checklist' });
  }
};