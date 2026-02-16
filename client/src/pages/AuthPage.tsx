
import { useState } from 'react';
import { api } from '../services/api';

interface AuthPageProps {
    onLogin: (token: string, user: any) => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        setError('');

        try {
            const deviceInfo = navigator.userAgent;
            const data = await api.register(name, deviceInfo);
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            onLogin(data.token, data.user);
        } catch (err) {
            setError('Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen flex items-center justify-center bg-secondary">
            <div className="card p-8 w-full max-w-md">
                <h1 className="text-2xl text-center mb-6">Welcome</h1>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm text-muted mb-1">Display Name</label>
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full"
                            placeholder="e.g. Alice"
                            maxLength={20}
                        />
                    </div>

                    {error && <p className="text-danger text-sm text-center">{error}</p>}

                    <button
                        type="submit"
                        className="btn btn-primary w-full py-3"
                        disabled={loading || !name.trim()}
                    >
                        {loading ? 'Creating Account...' : 'Get Started'}
                    </button>
                </form>
            </div>
        </div>
    );
}
