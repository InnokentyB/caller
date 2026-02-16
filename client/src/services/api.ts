
const API_URL = 'http://localhost:3000/api';

export const api = {
    async register(displayName: string, deviceInfo: string) {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName, deviceInfo }),
        });
        if (!res.ok) throw new Error('Registration failed');
        return res.json();
    },

    async getMe(token: string) {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch user');
        return res.json();
    },

    async createInvite(token: string) {
        const res = await fetch(`${API_URL}/invites`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to create invite');
        return res.json();
    },

    async acceptInvite(token: string, code: string) {
        const res = await fetch(`${API_URL}/invites/accept`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        });
        if (!res.ok) throw new Error('Failed to accept invite');
        return res.json();
    },

    async getContacts(token: string) {
        const res = await fetch(`${API_URL}/contacts`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch contacts');
        return res.json();
    },

    async getMessages(token: string, contactId: string) {
        const res = await fetch(`${API_URL}/messages/${contactId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch messages');
        return res.json();
    }
};
