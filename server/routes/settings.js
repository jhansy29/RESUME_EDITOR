import { Router } from 'express';
import { User } from '../models/User.js';

export const settingsRouter = Router();

// GET /api/settings/jobscan-credentials - check if configured
settingsRouter.get('/jobscan-credentials', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      configured: !!(user.jobscanCredentials?.email && user.jobscanCredentials?.password),
      email: user.jobscanCredentials?.email || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/jobscan-credentials - save credentials
settingsRouter.put('/jobscan-credentials', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    await User.findByIdAndUpdate(req.userId, {
      $set: {
        'jobscanCredentials.email': email,
        'jobscanCredentials.password': password,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
