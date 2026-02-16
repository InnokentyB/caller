
import { useEffect, useRef, useState } from 'react';

// STUN servers
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ]
};

interface CallProps {
    callId: string;
    isIncoming: boolean;
    callerName: string;
    video: boolean;
    onAccept?: () => void;
    onReject: () => void;
    onEnd: () => void;
    sendSignal: (type: string, payload: any) => void;
    incomingSignal?: any; // Signal from parent to process
}

export default function ActiveCall({
    callId, isIncoming, callerName, video, onAccept, onReject, onEnd, sendSignal, incomingSignal
}: CallProps) {
    const [status, setStatus] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>('ringing');
    // const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    // const [isCameraOff, setIsCameraOff] = useState(!video);

    const peerRef = useRef<RTCPeerConnection | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const candidatesQueue = useRef<RTCIceCandidateInit[]>([]);

    useEffect(() => {
        // Initialize Peer Connection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerRef.current = pc;

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal('ICE_CANDIDATE', { callId, candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            console.log('Got remote track', event.streams[0]);
            // setRemoteStream(event.streams[0]);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        // Start local media if outgoing or after accept
        if (!isIncoming) {
            startCall(pc);
        }

        return () => {
            // Cleanup
            localStream?.getTracks().forEach(track => track.stop());
            pc.close();
        };
    }, []);

    // Handle incoming signals via props
    useEffect(() => {
        if (!incomingSignal) return;
        handleSignal(incomingSignal);
    }, [incomingSignal]);

    const startCall = async (pc: RTCPeerConnection) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
            setLocalStream(stream);
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            sendSignal('SDP_OFFER', { callId, sdp: offer });
            setStatus('connecting');
        } catch (e) {
            console.error('Media error', e);
            onEnd();
        }
    };

    const handleAccept = async () => {
        if (onAccept) onAccept();
        setStatus('connecting');

        try {
            const pc = peerRef.current!;
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
            setLocalStream(stream);
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // If we have a pending offer (handled in handleSignal), we create answer
            if (pc.remoteDescription) {
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                sendSignal('SDP_ANSWER', { callId, sdp: answer });
                processQueue(pc);
            }
        } catch (e) {
            console.error('Accept error', e);
        }
    };

    const handleSignal = async (data: any) => {
        const pc = peerRef.current!;
        if (!pc) return;

        try {
            switch (data.type) {
                case 'SDP_OFFER':
                    if (isIncoming && status === 'ringing') {
                        // We set remote desc but wait for user accept to answer
                        await pc.setRemoteDescription(new RTCSessionDescription(data.payload.sdp));
                        processQueue(pc);
                    }
                    break;
                case 'SDP_ANSWER':
                    await pc.setRemoteDescription(new RTCSessionDescription(data.payload.sdp));
                    processQueue(pc);
                    setStatus('connected');
                    break;
                case 'ICE_CANDIDATE':
                    const candidate = new RTCIceCandidate(data.payload.candidate);
                    if (pc.remoteDescription) {
                        await pc.addIceCandidate(candidate);
                    } else {
                        candidatesQueue.current.push(data.payload.candidate);
                    }
                    break;
                case 'CALL_END':
                    onEnd();
                    break;
            }
        } catch (e) {
            console.error('Signal error', e);
        }
    };

    const processQueue = async (pc: RTCPeerConnection) => {
        while (candidatesQueue.current.length > 0) {
            const candidate = candidatesQueue.current.shift();
            if (candidate) await pc.addIceCandidate(candidate);
        }
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
            setIsMuted(!isMuted);
        }
    };

    // Render logic
    if (isIncoming && status === 'ringing') {
        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="card p-8 text-center bg-secondary w-80">
                    <div className="w-20 h-20 bg-accent rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold">
                        {callerName[0]}
                    </div>
                    <h3 className="text-xl mb-6">{callerName} is calling...</h3>
                    <div className="flex justify-center gap-4">
                        <button onClick={onReject} className="w-12 h-12 rounded-full bg-danger flex items-center justify-center transition-transform hover:scale-110">
                            <span className="text-white text-xl">✕</span>
                        </button>
                        <button onClick={handleAccept} className="w-12 h-12 rounded-full bg-success flex items-center justify-center transition-transform hover:scale-110">
                            <span className="text-white text-xl">📞</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="relative flex-1 bg-black">
                {/* Remote Video */}
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />
                {/* Local Video (PIP) */}
                {video && (
                    <div className="absolute top-4 right-4 w-32 h-48 bg-gray-900 rounded border border-white/20 overflow-hidden shadow-lg">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover mirror"
                        />
                    </div>
                )}

                {/* Status Overlay */}
                <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded text-white text-sm backdrop-blur">
                    {status === 'connected' ? 'Connected' : 'Connecting...'}
                </div>
            </div>

            {/* Controls */}
            <div className="h-20 bg-secondary flex items-center justify-center gap-6">
                <button onClick={toggleMute} className={`p-3 rounded-full ${isMuted ? 'bg-white text-black' : 'bg-tertiary text-white'}`}>
                    {isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button onClick={onEnd} className="p-4 rounded-full bg-danger text-white">
                    End Call
                </button>
            </div>
        </div>
    );
}
