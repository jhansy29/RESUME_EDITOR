import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { resumeRouter } from './routes/resume.js';
import { templateRouter } from './routes/template.js';
import { generateRouter } from './routes/generate.js';
import { vaultRouter } from './routes/vault.js';
import { jdRouter } from './routes/jd.js';
import { suggestionsRouter } from './routes/suggestions.js';
import { applicationsRouter } from './routes/applications.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/resume-editor';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

app.use('/api/resumes', resumeRouter);
app.use('/api/templates', templateRouter);
app.use('/api/generate-template', generateRouter);
app.use('/api/vault', vaultRouter);
app.use('/api/jd', jdRouter);
app.use('/api/suggestions', suggestionsRouter);
app.use('/api/applications', applicationsRouter);

// Serve frontend build in production
const clientDist = path.join(__dirname, '..', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
