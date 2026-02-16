import { Request, Response } from 'express';
import db from '../db/db';

export const getMessages = (req: Request, res: Response) => {
    const user = (req as any).user;
    const { contactId } = req.params;

    try {
        const stmt = db.prepare(`
      SELECT * FROM messages 
      WHERE (sender_id = ? AND recipient_id = ?) 
         OR (sender_id = ? AND recipient_id = ?)
      ORDER BY created_at ASC
    `);

        const messages = stmt.all(user.id, contactId, contactId, user.id);
        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};
