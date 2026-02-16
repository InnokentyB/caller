import { Request, Response, NextFunction } from 'express';
import db from '../db/db';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const stmt = db.prepare(`
    SELECT users.id, users.display_name 
    FROM sessions 
    JOIN users ON sessions.user_id = users.id 
    WHERE sessions.token = ?
  `);

    const user = stmt.get(token);

    if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    (req as any).user = user;
    next();
};
