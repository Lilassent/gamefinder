import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from './db';
import { auth } from './auth';

const router = Router();

// helpers

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/account/me
router.get('/me', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const q = await db.query('SELECT id, nickname, email FROM users WHERE id = $1 LIMIT 1', [
      userId,
    ]);
    if (!q.rowCount) return res.status(404).json({ error: 'User not found' });
    return res.json(q.rows[0]);
  } catch (e) {
    console.error('[GET /api/account/me] ERROR:', e);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
});

// POST /api/account/email/verify-current
router.post('/email/verify-current', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { email, password } = req.body as { email?: string; password?: string };

    const em = String(email || '')
      .trim()
      .toLowerCase();
    const pwd = String(password || '');

    if (!em || !pwd) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const q = await db.query('SELECT email, password_hash FROM users WHERE id = $1 LIMIT 1', [
      userId,
    ]);
    if (!q.rowCount) return res.status(404).json({ error: 'User not found' });

    const row = q.rows[0];
    if (String(row.email || '').toLowerCase() !== em) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    if (!row.password_hash) {
      return res.status(400).json({
        error: 'This account has no local password set. Use "Forgot password" to create one.',
      });
    }

    const ok = await bcrypt.compare(pwd, row.password_hash);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error('[POST /api/account/email/verify-current] ERROR:', e);
    return res.status(500).json({ error: 'Verification failed' });
  }
});

// PATCH /api/account (nickname/email)
router.patch('/', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { nickname, email } = req.body as { nickname?: string; email?: string };

    if (nickname === undefined && email === undefined) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    if (nickname !== undefined) {
      const n = String(nickname).trim();
      if (!n) return res.status(400).json({ error: 'Nickname required' });
      if (n.length > 50) return res.status(400).json({ error: 'Nickname is too long' });

      const dupe = await db.query('SELECT 1 FROM users WHERE nickname = $1 AND id <> $2', [
        n,
        userId,
      ]);
      if (dupe.rowCount) return res.status(400).json({ error: 'Nickname already in use' });

      await db.query('UPDATE users SET nickname = $1 WHERE id = $2', [n, userId]);
    }

    if (email !== undefined) {
      const e = String(email).trim();
      if (!e) return res.status(400).json({ error: 'Email required' });
      if (e.length > 100) return res.status(400).json({ error: 'Email is too long' });
      if (!emailRe.test(e)) return res.status(400).json({ error: 'Invalid email' });

      const dupe = await db.query('SELECT 1 FROM users WHERE email = $1 AND id <> $2', [e, userId]);
      if (dupe.rowCount) return res.status(400).json({ error: 'Email already in use' });

      await db.query('UPDATE users SET email = $1 WHERE id = $2', [e, userId]);
    }

    const q = await db.query('SELECT id, nickname, email FROM users WHERE id = $1', [userId]);
    return res.json(q.rows[0]);
  } catch (e) {
    console.error('[PATCH /api/account] ERROR:', e);
    return res.status(500).json({ error: 'Update failed' });
  }
});

// PATCH /api/account/password
router.patch('/password', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword) {
      return res
        .status(400)
        .json({ error: 'Current password is required', code: 'CURRENT_REQUIRED' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters', code: 'NEW_WEAK' });
    }

    const q = await db.query('SELECT password_hash FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!q.rowCount) return res.status(404).json({ error: 'User not found' });

    const { password_hash } = q.rows[0];

    if (!password_hash || password_hash === '<google-oauth>') {
      return res.status(400).json({
        error: 'This account has no local password set. Use "Forgot password" to create one.',
        code: 'NO_LOCAL_PASSWORD',
      });
    }

    const ok = await bcrypt.compare(currentPassword, password_hash);
    if (!ok) {
      return res
        .status(400)
        .json({ error: 'Current password is incorrect', code: 'CURRENT_INCORRECT' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

    return res.json({ ok: true });
  } catch (e) {
    console.error('[PATCH /api/account/password] ERROR:', e);
    return res.status(500).json({ error: 'Password update failed' });
  }
});

export default router;
