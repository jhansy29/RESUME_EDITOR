import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { resumeRouter } from './routes/resume.js';
import { templateRouter } from './routes/template.js';
import { generateRouter } from './routes/generate.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

mongoose.connect('mongodb://127.0.0.1:27017/resume-editor')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

app.use('/api/resumes', resumeRouter);
app.use('/api/templates', templateRouter);
app.use('/api/generate-template', generateRouter);

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
