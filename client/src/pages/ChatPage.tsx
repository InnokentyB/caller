
import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { v4 as uuidv4 } from 'uuid';
import ActiveCall from '../components/ActiveCall';

interface Contact {
    id: string;
    display_name: string;
    status: string;
}

interface Message {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
    status?: 'sending' | 'sent' | 'delivered';
}

interface CallState {
    id: string;
    isActive: boolean;
    isIncoming: boolean;
    remoteUserId: string;
    video: boolean;
}

export default function ChatPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showAddContactModal, setShowAddContactModal] = useState(false);
    const [inviteCode, setInviteCode] = useState('');
    const [inputInviteCode, setInputInviteCode] = useState('');

    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');

    const [callState, setCallState] = useState<CallState | null>(null);
    const [incomingSignal, setIncomingSignal] = useState<any>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const selectedContactRef = useRef<Contact | null>(null);

    const token = localStorage.getItem('token') || '';
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => { selectedContactRef.current = selectedContact; }, [selectedContact]);

    const handleWebSocketMessage = (data: any) => {
        if (data.type === 'MSG_RECEIVE') {
            const payload = data.payload;
            // Only append if it belongs to current open chat
            if (selectedContactRef.current && payload.from === selectedContactRef.current.id) {
                setMessages(prev => {
                    if (prev.find(m => m.id === payload.id)) return prev;
                    return [...prev, {
                        id: payload.id,
                        sender_id: payload.from,
                        content: payload.content,
                        created_at: payload.timestamp,
                        status: 'sent'
                    }];
                });
            }
        }
        else if (data.type === 'INCOMING_CALL') {
            if (callState?.isActive) return;
            const { callId, from, media } = data.payload;
            setCallState({
                id: callId,
                isActive: true,
                isIncoming: true,
                remoteUserId: from,
                video: media === 'video'
            });
        }
        else if (['SDP_OFFER', 'SDP_ANSWER', 'ICE_CANDIDATE', 'CALL_END'].includes(data.type)) {
            setIncomingSignal({ type: data.type, payload: data.payload });
        }
    };

    const { isConnected, sendMessage, sendSignal } = useWebSocket(token, handleWebSocketMessage);

    useEffect(() => {
        loadContacts();
    }, []);

    useEffect(() => {
        if (selectedContact) {
            loadMessages(selectedContact.id);
        }
    }, [selectedContact]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadContacts = async () => {
        try {
            const data = await api.getContacts(token);
            setContacts(data);
        } catch (e) {
            console.error("Failed to load contacts");
        }
    };

    const loadMessages = async (contactId: string) => {
        try {
            const data = await api.getMessages(token, contactId);
            setMessages(data);
        } catch (e) {
            console.error("Failed to load messages");
        }
    };

    const handleCreateInvite = async () => {
        try {
            const data = await api.createInvite(token);
            setInviteCode(data.code);
            setShowInviteModal(true);
        } catch (e) {
            alert('Failed to generate invite');
        }
    };

    const handleAddContact = async () => {
        try {
            await api.acceptInvite(token, inputInviteCode);
            setShowAddContactModal(false);
            setInputInviteCode('');
            loadContacts();
            alert('Contact added!');
        } catch (e) {
            alert('Failed to add contact. Invalid code?');
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim() || !selectedContact) return;

        const tempId = uuidv4();
        const content = inputMessage;

        setMessages(prev => [...prev, {
            id: tempId,
            sender_id: currentUser.id,
            content: content,
            created_at: new Date().toISOString(),
            status: 'sending'
        }]);

        sendMessage(selectedContact.id, content, tempId);
        setInputMessage('');
    };

    // Call Handlers
    const startCall = (video: boolean) => {
        if (!selectedContact) return;
        const callId = uuidv4();
        setCallState({
            id: callId,
            isActive: true,
            isIncoming: false,
            remoteUserId: selectedContact.id,
            video
        });
        sendSignal('CALL_REQUEST', { callId, to: selectedContact.id, media: video ? 'video' : 'audio' });
    };

    const endCall = () => {
        if (callState) {
            sendSignal('CALL_END', { callId: callState.id });
            setCallState(null);
        }
    };

    const rejectCall = () => {
        if (callState) {
            setCallState(null);
        }
    };

    return (
        <div className="h-screen flex">
            {/* Sidebar */}
            <div className="w-80 border-r border-color-border flex flex-col bg-secondary">
                <div className="p-4 border-b border-color-border flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl">Chats <span className={`text-[10px] ${isConnected ? 'text-success' : 'text-danger'}`}>●</span></h2>
                        <div className="flex gap-2">
                            <button onClick={() => setShowAddContactModal(true)} className="btn btn-secondary text-xs p-2" title="Add Contact">
                                + Add
                            </button>
                            <button onClick={handleCreateInvite} className="btn btn-primary text-xs p-2" title="My Invite">
                                Share
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {contacts.length === 0 ? (
                        <div className="text-center text-muted mt-10 text-sm">
                            No contacts yet.<br />Share your invite code!
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {contacts.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => setSelectedContact(c)}
                                    className={`p-3 rounded cursor-pointer transition-colors ${selectedContact?.id === c.id ? 'bg-accent text-white' : 'hover:bg-tertiary'}`}
                                >
                                    <div className="font-medium">{c.display_name}</div>
                                    <div className={`text-xs capitalize ${selectedContact?.id === c.id ? 'text-white/80' : 'text-muted'}`}>{c.status}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-color-border">
                    <div className="text-sm text-muted">My Account: {currentUser.displayName}</div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-primary">
                {selectedContact ? (
                    <>
                        {/* Header */}
                        <div className="h-16 border-b border-color-border flex items-center justify-between px-6 bg-secondary/50 backdrop-blur">
                            <h2 className="text-lg font-semibold">{selectedContact.display_name}</h2>
                            <div className="flex gap-2">
                                <button onClick={() => startCall(false)} className="btn btn-secondary text-sm">Call</button>
                                <button onClick={() => startCall(true)} className="btn btn-secondary text-sm">Video</button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
                            {messages.map((msg) => {
                                const isMe = msg.sender_id === currentUser.id;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] p-3 rounded-2xl ${isMe
                                                ? 'bg-accent text-white rounded-tr-sm'
                                                : 'bg-tertiary text-text-primary rounded-tl-sm'
                                            }`}>
                                            <div>{msg.content}</div>
                                            <div className={`text-[10px] text-right mt-1 ${isMe ? 'text-white/70' : 'text-muted'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-color-border bg-secondary/30">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    className="flex-1"
                                    placeholder="Type a message..."
                                    value={inputMessage}
                                    onChange={e => setInputMessage(e.target.value)}
                                />
                                <button type="submit" className="btn btn-primary" disabled={!inputMessage.trim()}>
                                    Send
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted">
                        Select a contact to start messaging
                    </div>
                )}
            </div>

            {callState && callState.isActive && (
                <ActiveCall
                    callId={callState.id}
                    isIncoming={callState.isIncoming}
                    callerName={contacts.find(c => c.id === callState.remoteUserId)?.display_name || 'Unknown'}
                    video={callState.video}
                    onReject={rejectCall}
                    onEnd={endCall}
                    sendSignal={sendSignal}
                    incomingSignal={incomingSignal}
                />
            )}

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                    <div className="card p-6 w-96 relative bg-secondary">
                        <h3 className="text-xl mb-4">Your Invite Code</h3>
                        <p className="text-sm text-muted mb-4">Share this code with your friend:</p>
                        <div className="bg-tertiary p-4 rounded text-center font-mono text-xl select-all mb-4 border border-color-border">
                            {inviteCode}
                        </div>
                        <button onClick={() => setShowInviteModal(false)} className="btn btn-secondary w-full">
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Add Contact Modal */}
            {showAddContactModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                    <div className="card p-6 w-96 relative bg-secondary">
                        <h3 className="text-xl mb-4">Add Contact</h3>
                        <p className="text-sm text-muted mb-4">Enter your friend's invite code:</p>
                        <input
                            className="w-full mb-4"
                            placeholder="Invite Code"
                            value={inputInviteCode}
                            onChange={e => setInputInviteCode(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setShowAddContactModal(false)} className="btn btn-secondary flex-1">
                                Cancel
                            </button>
                            <button onClick={handleAddContact} className="btn btn-primary flex-1" disabled={!inputInviteCode}>
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
