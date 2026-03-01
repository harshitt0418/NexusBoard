import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useRoom } from '../../context/RoomContext';

function VideoTile({ stream, name, isLocal, isMuted, isVideoOff }) {
    const videoRef = useRef(null);
    const audioRef = useRef(null);
    const hasVideoTrack = stream?.getVideoTracks?.()?.length > 0;
    const showVideo = stream && !isVideoOff && hasVideoTrack;

    useEffect(() => {
        if (!stream) return;
        const video = videoRef.current;
        const audio = audioRef.current;
        if (video) {
            video.srcObject = stream;
            const playVideo = () => video.play().catch(() => {});
            playVideo();
            const t = setTimeout(playVideo, 300);
            return () => clearTimeout(t);
        }
        if (audio) {
            audio.srcObject = stream;
            audio.play().catch(() => {});
        }
    }, [stream]);

    useEffect(() => {
        if (showVideo && videoRef.current) {
            videoRef.current.play().catch(() => {});
        }
    }, [showVideo]);

    return (
        <div style={{
            position: 'relative', width: 140, height: 100, borderRadius: 'var(--radius-md)',
            background: '#1E293B', flexShrink: 0, overflow: 'hidden',
            border: '2px solid var(--color-border)', transition: 'border-color var(--transition-fast)',
        }}>
            {stream && (
                <>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%', height: '100%', minWidth: '100%', minHeight: '100%',
                            objectFit: 'cover',
                            transform: isLocal ? 'scaleX(-1)' : 'none',
                            opacity: showVideo ? 1 : 0,
                            pointerEvents: showVideo ? 'auto' : 'none',
                        }}
                    />
                    {!isLocal && <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />}
                </>
            )}
            {(!stream || !showVideo) && (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: stream ? 'absolute' : 'relative', inset: 0 }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--color-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>
                        {name?.[0]?.toUpperCase()}
                    </div>
                </div>
            )}
            <div style={{ position: 'absolute', bottom: 4, left: 6, right: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pointerEvents: 'none' }}>
                <span style={{ fontSize: '0.65rem', color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '1px 6px', borderRadius: 4, maxWidth: '80%' }} className="truncate">
                    {name}{isLocal ? ' (you)' : ''}
                </span>
                {isMuted && <span style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.85)', color: '#fff', padding: '1px 5px', borderRadius: 3 }}>🔇</span>}
            </div>
        </div>
    );
}

export default function VideoStrip({ localStream, peers }) {
    const { participants, myName } = useRoom();
    const [muted, setMuted] = useState(false);
    const [videoOff, setVideoOff] = useState(false);
    const { socket } = useSocket();

    // When stream is set or changes, set buttons to match: camera on and mic on if we have those tracks
    const prevStreamRef = useRef(null);
    useEffect(() => {
        if (!localStream) {
            prevStreamRef.current = null;
            return;
        }
        if (prevStreamRef.current === localStream) return;
        prevStreamRef.current = localStream;
        const hasVideo = localStream.getVideoTracks().length > 0;
        const hasAudio = localStream.getAudioTracks().length > 0;
        setVideoOff(!hasVideo);
        setMuted(!hasAudio);
    }, [localStream]);

    const toggleMic = () => {
        if (!localStream) return;
        localStream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
        setMuted(m => !m);
    };

    const toggleCamera = () => {
        if (!localStream) return;
        localStream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
        setVideoOff(v => !v);
    };

    return (
        <div style={{
            gridArea: 'video',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '0 16px',
            background: 'var(--color-surface)',
            borderTop: '1px solid var(--color-border)',
            overflowX: 'auto',
            position: 'relative',
            zIndex: 30,
        }}>
            {/* Local video */}
            <VideoTile stream={localStream} name={myName} isLocal isMuted={muted} isVideoOff={videoOff} />

            {/* Remote peers */}
            {peers.map(peer => (
                <VideoTile key={peer.userId} stream={peer.stream} name={peer.name} isMuted={false} isVideoOff={false} />
            ))}

            {/* Controls */}
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexShrink: 0 }}>
                <button onClick={toggleMic} title={muted ? 'Turn microphone on' : 'Turn microphone off'}
                    className="btn btn-secondary btn-sm"
                    style={{ background: muted ? 'var(--color-danger-soft)' : undefined, color: muted ? 'var(--color-danger)' : undefined }}>
                    {muted ? '🔇' : '🎤'}
                </button>
                <button onClick={toggleCamera} title={videoOff ? 'Turn camera on' : 'Turn camera off'}
                    className="btn btn-secondary btn-sm"
                    style={{ background: videoOff ? 'var(--color-danger-soft)' : undefined, color: videoOff ? 'var(--color-danger)' : undefined }}>
                    {videoOff ? '📵' : '📷'}
                </button>
            </div>
        </div>
    );
}
