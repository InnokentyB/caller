export interface User {
    id: string;
    display_name: string;
    created_at: string;
}

export interface Session {
    token: string;
    user_id: string;
    device_info?: string;
    created_at: string;
}

export interface Invite {
    code: string;
    creator_id: string;
    used_by?: string;
    created_at: string;
    status: 'active' | 'used' | 'expired';
}

export interface Contact {
    user_id: string;
    contact_id: string;
    status: 'pending' | 'accepted' | 'blocked';
    created_at: string;
}
