import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/db';

export const register = (req: Request, res: Response) => {
    const { displayName, deviceInfo } = req.body;
    if (!displayName) {
        return res.status(400).json({ error: 'Display name is required' });
    }

    const userId = uuidv4();
    const token = uuidv4();

    try {
        const insertUser = db.prepare('INSERT INTO users (id, display_name) VALUES (?, ?)');
        const insertSession = db.prepare('INSERT INTO sessions (token, user_id, device_info) VALUES (?, ?, ?)');

        db.transaction(() => {
            insertUser.run(userId, displayName);
            insertSession.run(token, userId, deviceInfo || 'unknown');
        })();

        res.status(201).json({ token, user: { id: userId, displayName } });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getMe = (req: Request, res: Response) => {
    // middleware will populate user
    const user = (req as any).user;
    res.json({ user });
};
