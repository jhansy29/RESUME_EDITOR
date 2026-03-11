import { Router } from 'express';
import { getJobscanClient } from '../utils/jobscanClient.js';
import { Resume } from '../models/Resume.js';
import { resumeToText } from '../utils/resumeToText.js';

export const jobscanRouter = Router();

// Check if Jobscan browser session is alive
jobscanRouter.get('/status', async (req, res) => {
  try {
    const client = await getJobscanClient(req.userId);
    res.json({
      active: client.isActive(),
      onMatchReport: client.isOnMatchReport(),
    });
  } catch (err) {
    res.json({ active: false, onMatchReport: false, error: err.message });
  }
});

// Login to Jobscan (starts browser)
jobscanRouter.post('/login', async (req, res) => {
  try {
    const client = await getJobscanClient(req.userId);
    console.log('[Jobscan] Logging in...');
    const result = await client.login();
    if (result.success) {
      res.json({ ok: true });
    } else {
      res.status(401).json({ ok: false, error: result.error });
    }
  } catch (err) {
    console.error('[Jobscan] Login error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Full scan: resume + JD text
jobscanRouter.post('/scan', async (req, res) => {
  try {
    const { resumeText, jdText, resumeId } = req.body;

    let plainResume = resumeText;
    // If resumeId provided, serialize from DB
    if (!plainResume && resumeId) {
      const resume = await Resume.findOne({ _id: resumeId, userId: req.userId });
      if (!resume) return res.status(404).json({ error: 'Resume not found' });
      plainResume = resumeToText(resume.toObject(), { stripBold: true });
    }

    if (!plainResume || !jdText) {
      return res.status(400).json({ error: 'resumeText (or resumeId) and jdText are required' });
    }

    const client = await getJobscanClient(req.userId);
    console.log(`[Jobscan] Full scan: resume ${plainResume.length} chars, JD ${jdText.length} chars`);
    const report = await client.scan(plainResume, jdText);
    console.log(`[Jobscan] Scan complete: ${report.matchRate}% match`);
    res.json(report);
  } catch (err) {
    console.error('[Jobscan] Scan error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Rescan: updated resume text, keeps JD from last scan
jobscanRouter.post('/rescan', async (req, res) => {
  try {
    const { resumeText, resumeId } = req.body;

    let plainResume = resumeText;
    if (!plainResume && resumeId) {
      const resume = await Resume.findOne({ _id: resumeId, userId: req.userId });
      if (!resume) return res.status(404).json({ error: 'Resume not found' });
      plainResume = resumeToText(resume.toObject(), { stripBold: true });
    }

    if (!plainResume) {
      return res.status(400).json({ error: 'resumeText or resumeId is required' });
    }

    const client = await getJobscanClient(req.userId);

    // If not on match report, fall back to error
    if (!client.isOnMatchReport()) {
      return res.status(400).json({ error: 'Not on a match report page. Run a full scan first.' });
    }

    console.log(`[Jobscan] Rescan: ${plainResume.length} chars`);
    const report = await client.rescan(plainResume);
    console.log(`[Jobscan] Rescan complete: ${report.matchRate}% match`);
    res.json(report);
  } catch (err) {
    console.error('[Jobscan] Rescan error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Close browser session
jobscanRouter.post('/close', async (_req, res) => {
  try {
    const client = await getJobscanClient(req.userId);
    await client.close();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
