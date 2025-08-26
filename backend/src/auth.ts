import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

declare module 'express' {
  interface Request {
    userId?: number;
  }
}

type JwtPayload = { id: number; iat?: number; exp?: number };

function extractUserIdFromAuthHeader(header?: string): number | undefined {
  if (!header || !header.startsWith('Bearer ')) return undefined;
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    return payload.id;
  } catch {
    return undefined;
  }
}

export function auth(req: Request, res: Response, next: NextFunction) {
  const userId = extractUserIdFromAuthHeader(req.header('Authorization'));
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  req.userId = userId;
  next();
}

export function authOptional(req: Request, _res: Response, next: NextFunction) {
  const userId = extractUserIdFromAuthHeader(req.header('Authorization'));
  if (userId) req.userId = userId;
  next();
}

export function authUnless(excluded: Array<string | RegExp>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    const skip = excluded.some((p) => (typeof p === 'string' ? path.startsWith(p) : p.test(path)));
    return skip ? authOptional(req, res, next) : auth(req, res, next);
  };
}
