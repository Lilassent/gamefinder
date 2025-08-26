import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import path from 'path';

import { db } from './db';
import likesRoutes from './likes.routes';
import accountRoutes from './account.routes';
import { admin } from './firebaseAdmin';
import { authUnless } from './auth';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const JWT_SECRET = process.env.JWT_SECRET!;
const RAWG_API = 'https://api.rawg.io/api';
const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';

if (!JWT_SECRET) throw new Error('JWT_SECRET is not set in .env');

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN?.split(',') ?? true,
    credentials: true,
  })
);
app.use(express.json());

// Mailer (SMTP)
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecureEnv = (process.env.SMTP_SECURE ?? '').toLowerCase() === 'true';
const smtpSecure = smtpSecureEnv || smtpPort === 465;

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
  connectionTimeout: 20000,
});

// SMTP
app.get('/api/debug/smtp', async (_req, res) => {
  try {
    await mailer.verify();
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ ok: false, err: e?.message, code: e?.code });
  }
});

const PUBLIC_API_WHITELIST = [
  '/signup',
  '/login',
  '/auth/google',
  '/auth/forgot',
  '/auth/forgot/verify',
  '/auth/reset',
  '/health',
  '/games',
  '/genres',
  '/youtube',
];

// Authorization for the entire /api, except whitelist
app.use('/api', authUnless(PUBLIC_API_WHITELIST));

async function ensureUniqueNickname(base: string): Promise<string> {
  const clean = (base || 'user').trim().replace(/\s+/g, '_');
  let nick = clean.slice(0, 30) || 'user';
  let i = 0;
  while (i < 1000) {
    const q = await db.query('SELECT 1 FROM users WHERE nickname = $1', [nick]);
    if (q.rowCount === 0) return nick;
    i += 1;
    nick = `${clean.slice(0, 28)}${i}`;
  }
  return `${clean}_${Date.now()}`;
}

// Auth: email/password
app.post('/api/signup', async (req: Request, res: Response) => {
  const { nickname, email, password } = req.body as {
    nickname?: string;
    email?: string;
    password?: string;
  };

  try {
    if (!nickname || !email || !password) {
      return res.status(400).json({ error: 'nickname, email, password are required' });
    }

    const existing = await db.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (existing.rowCount) return res.status(400).json({ error: 'Email already in use' });

    const password_hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (nickname, email, password_hash)
       VALUES ($1,$2,$3)
       RETURNING id, nickname, email`,
      [nickname, email, password_hash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, nickname: user.nickname, email: user.email }, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Auth: Google (Firebase ID token → JWT)
app.post('/api/auth/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body as { idToken?: string };
    if (!idToken) return res.status(400).json({ error: 'No idToken' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const googleUid = decoded.uid;
    const email = decoded.email || '';
    const displayName = (decoded.name || email.split('@')[0] || 'user').trim();

    if (!email) return res.status(400).json({ error: 'Google account has no email' });

    const found =
      (
        await db.query(
          'SELECT id, nickname, email FROM users WHERE google_uid = $1 OR email = $2 LIMIT 1',
          [googleUid, email]
        )
      ).rows[0] || null;

    let user = found;

    if (!user) {
      const nickname = await ensureUniqueNickname(displayName);
      const ins = await db.query(
        `INSERT INTO users (nickname, email, password_hash, google_uid)
         VALUES ($1, $2, $3, $4)
         RETURNING id, nickname, email`,
        [nickname, email, '<google-oauth>', googleUid]
      );
      user = ins.rows[0];
    } else {
      await db.query('UPDATE users SET google_uid = COALESCE(google_uid, $1) WHERE id = $2', [
        googleUid,
        user.id,
      ]);
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (e) {
    console.error('Google auth error:', e);
    return res.status(401).json({ error: 'Invalid Google token' });
  }
});

// Forgot password (send 4-digit code)
app.post('/api/auth/forgot', async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const u = await db.query('SELECT id, nickname FROM users WHERE email = $1 LIMIT 1', [email]);

    if (!u.rowCount) return res.json({ ok: true, sent: true });

    const user = u.rows[0];
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const hash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 1 * 60 * 1000);

    await db.query(
      `INSERT INTO password_reset_codes (user_id, code_hash, expires_at)
       VALUES ($1,$2,$3)`,
      [user.id, hash, expiresAt]
    );

    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER!,
      to: email,
      subject: 'Your GameFinder code',
      text: `Your code: ${code}\nThis code is valid for 10 minutes.`,
      html: `
        <div style="font-family:Arial,sans-serif">
          <h2>Your code</h2>
          <p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p>
          <p>This code is valid for 10 minutes.</p>
        </div>
      `,
    });

    return res.json({ ok: true, sent: true, expiresIn: 60 });
  } catch (e) {
    console.error('POST /api/auth/forgot error:', e);
    return res.status(500).json({ error: 'Unexpected error' });
  }
});

// Verify code (returns reset token)
app.post('/api/auth/forgot/verify', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body as { email?: string; code?: string };
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    const u = await db.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    if (!u.rowCount) return res.status(400).json({ error: 'Invalid code' });

    const userId = u.rows[0].id;
    const prc = await db.query(
      `SELECT id, code_hash, expires_at, used_at
       FROM password_reset_codes
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (!prc.rowCount) return res.status(400).json({ error: 'Invalid code' });

    const row = prc.rows[0];
    if (row.used_at) return res.status(400).json({ error: 'Code already used' });
    if (new Date(row.expires_at).getTime() < Date.now())
      return res.status(400).json({ error: 'Code expired' });

    const ok = await bcrypt.compare(code, row.code_hash);
    if (!ok) return res.status(400).json({ error: 'Invalid code' });

    await db.query('UPDATE password_reset_codes SET used_at = NOW() WHERE id = $1', [row.id]);

    const resetToken = jwt.sign({ sub: userId, typ: 'pwd_reset' }, JWT_SECRET, {
      expiresIn: '15m',
    });

    return res.json({ ok: true, resetToken });
  } catch (e) {
    console.error('POST /api/auth/forgot/verify error:', e);
    return res.status(500).json({ error: 'Verify failed' });
  }
});

// Reset password
app.post('/api/auth/reset', async (req: Request, res: Response) => {
  try {
    const { resetToken, newPassword } = req.body as { resetToken?: string; newPassword?: string };
    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'resetToken and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    let payload: any;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_SECRET!);
    } catch {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    if (payload?.typ !== 'pwd_reset' || !payload?.sub) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      password_hash,
      payload.sub,
    ]);

    return res.json({ ok: true });
  } catch (e) {
    console.error('POST /api/auth/reset error:', e);
    return res.status(500).json({ error: 'Reset failed' });
  }
});

// RAWG proxy
app.get('/api/games', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${RAWG_API}/games`, {
      params: { key: process.env.RAWG_API_KEY, ...req.query },
    });
    res.json(response.data);
  } catch (error) {
    console.error('RAWG games error:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

app.get('/api/games/:id', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${RAWG_API}/games/${req.params.id}`, {
      params: { key: process.env.RAWG_API_KEY },
    });
    res.json(response.data);
  } catch (error) {
    console.error('RAWG game error:', error);
    res.status(500).json({ error: 'Failed to fetch game details' });
  }
});

app.get('/api/genres', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get(`${RAWG_API}/genres`, {
      params: { key: process.env.RAWG_API_KEY },
    });
    res.json(response.data);
  } catch (error) {
    console.error('RAWG genres error:', error);
    res.status(500).json({ error: 'Failed to fetch genres' });
  }
});

// YouTube proxy
app.get('/api/youtube', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${YOUTUBE_API}/search`, {
      params: {
        ...req.query,
        key: process.env.YOUTUBE_API_KEY,
        part: 'snippet',
        type: 'video',
        maxResults: 1,
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error('YouTube error:', error);
    res.status(500).json({ error: 'Failed to fetch YouTube data' });
  }
});

// Routes
app.use('/api/likes', likesRoutes);
app.use('/api/account', accountRoutes);

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
