import { Router } from 'express';
import { register, getMe } from '../controllers/authController';
import { createInvite, acceptInvite } from '../controllers/inviteController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Auth
router.post('/auth/register', register);
router.get('/auth/me', authenticate, getMe);

// Invites
router.post('/invites', authenticate, createInvite);
router.post('/invites/accept', authenticate, acceptInvite);

// Contacts
import { getContacts } from '../controllers/contactController';
router.get('/contacts', authenticate, getContacts);

// Messages
import { getMessages } from '../controllers/messageController';
router.get('/messages/:contactId', authenticate, getMessages);

export default router;
