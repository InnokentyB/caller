import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/db';

export const createInvite = (req: Request, res: Response) => {
    const user = (req as any).user;
    const code = uuidv4().substring(0, 8); // Short code for MVP

    try {
        const stmt = db.prepare('INSERT INTO invites (code, creator_id) VALUES (?, ?)');
        stmt.run(code, user.id);
        res.json({ code });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create invite' });
    }
};

export const acceptInvite = (req: Request, res: Response) => {
    const { code } = req.body;
    const user = (req as any).user;

    try {
        const inviteStmt = db.prepare('SELECT creator_id, used_by FROM invites WHERE code = ?');
        const invite = inviteStmt.get(code) as any;

        if (!invite) {
            return res.status(404).json({ error: 'Invite not found' });
        }

        if (invite.creator_id === user.id) {
            return res.status(400).json({ error: 'Cannot accept your own invite' });
        }

        // MVP: One-time use? Spec says "Trust model: Default: contacts are mutual".
        // Let's just create the contact connection.

        const contactStmt = db.prepare(`
      INSERT INTO contacts (user_id, contact_id, status) VALUES (?, ?, 'accepted'), (?, ?, 'accepted')
    `);

        // Add both ways
        db.transaction(() => {
            // check if exists first to avoid constraint error or use INSERT OR IGNORE
            // For MVP, simplistic
            contactStmt.run(user.id, invite.creator_id, invite.creator_id, user.id);
        })();

        res.json({ success: true, contactId: invite.creator_id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to accept invite' });
    }
};
