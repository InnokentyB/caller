import { Request, Response } from 'express';
import db from '../db/db';

export const getContacts = (req: Request, res: Response) => {
    const user = (req as any).user;

    try {
        const stmt = db.prepare(`
      SELECT users.id, users.display_name, contacts.status, contacts.created_at
      FROM contacts
      JOIN users ON contacts.contact_id = users.id
      WHERE contacts.user_id = ?
    `);

        const contacts = stmt.all(user.id);
        res.json(contacts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
};
