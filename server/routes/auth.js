import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_DAYS = 7;

function generateAccessToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

function setTokenCookies(res, accessToken, refreshToken) {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  });
}

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    const user = await User.create({
      email,
      passwordHash,
      name,
      refreshTokens: [{ token: refreshToken, expiresAt }],
    });

    const accessToken = generateAccessToken(user);
    setTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({ user: user.toJSON() });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    user.refreshTokens.push({ token: refreshToken, expiresAt });
    await user.save();

    const accessToken = generateAccessToken(user);
    setTokenCookies(res, accessToken, refreshToken);

    res.json({ user: user.toJSON() });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/refresh
authRouter.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    const user = await User.findOne({
      'refreshTokens.token': token,
      'refreshTokens.expiresAt': { $gt: new Date() },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Rotate: remove old token, issue new one
    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== token);
    const newRefreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    user.refreshTokens.push({ token: newRefreshToken, expiresAt });
    await user.save();

    const accessToken = generateAccessToken(user);
    setTokenCookies(res, accessToken, newRefreshToken);

    res.json({ user: user.toJSON() });
  } catch (err) {
    console.error('[Auth] Refresh error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await User.updateOne(
        { 'refreshTokens.token': token },
        { $pull: { refreshTokens: { token } } }
      );
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[Auth] Logout error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
