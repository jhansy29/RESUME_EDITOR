import { Router } from 'express';
import { Resume } from '../models/Resume.js';

export const resumeRouter = Router();

// List all resumes (just name + id + updatedAt)
resumeRouter.get('/', async (_req, res) => {
  const list = await Resume.find({}, 'name updatedAt').sort({ updatedAt: -1 });
  res.json(list);
});

// Get single resume by id
resumeRouter.get('/:id', async (req, res) => {
  const doc = await Resume.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// Create new resume
resumeRouter.post('/', async (req, res) => {
  const doc = await Resume.create(req.body);
  res.status(201).json(doc);
});

// Duplicate a resume (create a copy with a new name)
resumeRouter.post('/:id/duplicate', async (req, res) => {
  try {
    const source = await Resume.findById(req.params.id);
    if (!source) return res.status(404).json({ error: 'Not found' });

    const obj = source.toObject();
    delete obj._id;
    delete obj.createdAt;
    delete obj.updatedAt;

    // Allow caller to override the name, otherwise append " (Copy)"
    const baseName = req.body.name || `${obj.name} (Copy)`;

    // Ensure uniqueness — append a number if name already exists
    let finalName = baseName;
    let counter = 1;
    while (await Resume.findOne({ name: finalName })) {
      counter++;
      finalName = `${baseName} ${counter}`;
    }
    obj.name = finalName;

    const doc = await Resume.create(obj);
    res.status(201).json(doc);
  } catch (err) {
    console.error('Duplicate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update a specific section of a resume
resumeRouter.patch('/:id', async (req, res) => {
  const doc = await Resume.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// Full replace
resumeRouter.put('/:id', async (req, res) => {
  const { _id, createdAt, updatedAt, ...data } = req.body;
  const doc = await Resume.findByIdAndUpdate(
    req.params.id,
    data,
    { new: true, runValidators: true, overwrite: true }
  );
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// Delete
resumeRouter.delete('/:id', async (req, res) => {
  await Resume.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});
