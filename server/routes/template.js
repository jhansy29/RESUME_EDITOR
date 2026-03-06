import { Router } from 'express';
import { Template } from '../models/Template.js';

export const templateRouter = Router();

// List all templates
templateRouter.get('/', async (_req, res) => {
  const list = await Template.find({}, 'name description updatedAt').sort({ updatedAt: -1 });
  res.json(list);
});

// Get single template by id
templateRouter.get('/:id', async (req, res) => {
  const doc = await Template.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// Create new template
templateRouter.post('/', async (req, res) => {
  try {
    const doc = await Template.create(req.body);
    res.status(201).json(doc);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Template with this name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update template
templateRouter.patch('/:id', async (req, res) => {
  const doc = await Template.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// Delete template
templateRouter.delete('/:id', async (req, res) => {
  await Template.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});
