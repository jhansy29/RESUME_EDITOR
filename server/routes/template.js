import { Router } from 'express';
import { Template } from '../models/Template.js';

export const templateRouter = Router();

// List all templates (user's own + system templates)
templateRouter.get('/', async (req, res) => {
  const list = await Template.find(
    { $or: [{ userId: req.userId }, { userId: null }] },
    'name description updatedAt userId'
  ).sort({ updatedAt: -1 });
  res.json(list);
});

// Get single template by id (user's own or system)
templateRouter.get('/:id', async (req, res) => {
  const doc = await Template.findOne({
    _id: req.params.id,
    $or: [{ userId: req.userId }, { userId: null }],
  });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// Create new template
templateRouter.post('/', async (req, res) => {
  try {
    const doc = await Template.create({ ...req.body, userId: req.userId });
    res.status(201).json(doc);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Template with this name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update template (only user's own)
templateRouter.patch('/:id', async (req, res) => {
  const doc = await Template.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// Delete template (only user's own)
templateRouter.delete('/:id', async (req, res) => {
  await Template.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  res.json({ ok: true });
});
