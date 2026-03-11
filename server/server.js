import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from './middleware/auth.js';
import { globalLimiter, authLimiter, aiLimiter } from './middleware/rateLimit.js';
import { authRouter } from './routes/auth.js';
import { resumeRouter } from './routes/resume.js';
import { templateRouter } from './routes/template.js';
import { generateRouter } from './routes/generate.js';
import { vaultRouter } from './routes/vault.js';
import { jdRouter } from './routes/jd.js';
import { suggestionsRouter } from './routes/suggestions.js';
import { applicationsRouter } from './routes/applications.js';
import { jobscanRouter } from './routes/jobscan.js';
import { settingsRouter } from './routes/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

// CORS with credentials support for httpOnly cookies
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/resume-editor';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

// Public routes (no auth required)
app.use('/api/auth', authLimiter, authRouter);

// Protected routes (auth required + global rate limit)
app.use('/api/resumes', requireAuth, globalLimiter, resumeRouter);
app.use('/api/templates', requireAuth, globalLimiter, templateRouter);
app.use('/api/generate-template', requireAuth, globalLimiter, generateRouter);
app.use('/api/vault', requireAuth, globalLimiter, vaultRouter);
app.use('/api/jd', requireAuth, globalLimiter, jdRouter);
app.use('/api/suggestions', requireAuth, globalLimiter, aiLimiter, suggestionsRouter);
app.use('/api/applications', requireAuth, globalLimiter, applicationsRouter);
app.use('/api/jobscan', requireAuth, globalLimiter, jobscanRouter);
app.use('/api/settings', requireAuth, globalLimiter, settingsRouter);

// Serve frontend build in production
const clientDist = path.join(__dirname, '..', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
