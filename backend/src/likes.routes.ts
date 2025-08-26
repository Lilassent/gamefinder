import { Router, Request, Response } from 'express';
import { db } from './db';
import { auth } from './auth';

const router = Router();

router.post('/', auth, async (req: Request, res: Response) => {
  const userId = req.userId;
  const {
    rawgId,
    title,
    slug,
    imageUrl,
    genres = [],
    platforms = [],
    released = null,
  } = (req.body ?? {}) as {
    rawgId?: number | string;
    title?: string;
    slug?: string | null;
    imageUrl?: string | null;
    genres?: unknown;
    platforms?: unknown;
    released?: string | null;
  };

  try {
    if (!userId) return res.status(401).json({ error: 'No userId' });

    const rawg = Number(rawgId);
    if (!rawg || !Number.isFinite(rawg) || !title) {
      return res.status(400).json({ error: 'rawgId (number) and title are required' });
    }

    const genresArr = Array.isArray(genres) ? (genres as unknown[]).map(String) : [];
    const platformsArr = Array.isArray(platforms) ? (platforms as unknown[]).map(String) : [];

    // upsert game
    const upsertSql = `
      INSERT INTO games (rawg_id, title, slug, image_url, genres, platforms, released)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (rawg_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        slug = EXCLUDED.slug,
        image_url = EXCLUDED.image_url,
        genres = EXCLUDED.genres,
        platforms = EXCLUDED.platforms,
        released = EXCLUDED.released
      RETURNING id
    `;
    const gameRes = await db.query(upsertSql, [
      rawg,
      title,
      slug ?? null,
      imageUrl ?? null,
      genresArr,
      platformsArr,
      released ?? null,
    ]);

    const gameId: number | undefined = gameRes.rows[0]?.id;
    if (!gameId) return res.status(500).json({ error: 'Failed to upsert game' });

    // insert like
    const likeSql = `
      INSERT INTO likes (user_id, game_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, game_id) DO NOTHING
    `;
    await db.query(likeSql, [userId, gameId]);

    return res.json({ ok: true, liked: true });
  } catch (e) {
    console.error('[POST /api/likes] ERROR:', e);
    return res.status(500).json({ ok: false, error: 'DB error' });
  }
});

// DELETE /api/likes/:rawgId
router.delete('/:rawgId', auth, async (req: Request, res: Response) => {
  const userId = req.userId;
  const rawgId = Number(req.params.rawgId);

  try {
    if (!userId) return res.status(401).json({ error: 'No userId' });
    if (!rawgId || !Number.isFinite(rawgId)) {
      return res.status(400).json({ error: 'Invalid rawgId' });
    }

    const delSql = `
      DELETE FROM likes l
      USING games g
      WHERE l.user_id = $1
        AND l.game_id = g.id
        AND g.rawg_id = $2
    `;
    await db.query(delSql, [userId, rawgId]);

    return res.json({ ok: true, liked: false });
  } catch (e) {
    console.error('[DELETE /api/likes/:rawgId] ERROR:', e);
    return res.status(500).json({ ok: false, error: 'DB error' });
  }
});

// GET /api/likes
router.get('/', auth, async (req: Request, res: Response) => {
  const userId = req.userId;

  try {
    if (!userId) return res.status(401).json({ error: 'No userId' });

    const sql = `
      SELECT
        g.rawg_id,
        g.title,
        g.slug,
        g.image_url,
        g.genres,
        g.platforms,
        g.released,
        l.liked_at
      FROM likes l
      JOIN games g ON g.id = l.game_id
      WHERE l.user_id = $1
      ORDER BY l.liked_at DESC
    `;
    const q = await db.query(sql, [userId]);
    return res.json(q.rows);
  } catch (e) {
    console.error('[GET /api/likes] ERROR:', e);
    return res.status(500).json({ ok: false, error: 'DB error' });
  }
});

export default router;
