import { useCallback, useEffect, useRef, useState } from 'react';
import { useRoom } from '../../context/RoomContext';
import { IconMic, IconMicOff, IconCamera, IconCameraOff } from '../../components/ui/Icons';

function VideoTile({ stream, name, isLocal, isMuted, isVideoOff, remoteMediaState, label }) {
    const videoRef = useRef(null);
    const audioRef = useRef(null);
    const [, setTrackStateTick] = useState(0);

    const hasVideoTrack = stream?.getVideoTracks?.()?.length > 0;
    const hasAudioTrack = stream?.getAudioTracks?.()?.length > 0;
    const videoEnabled = hasVideoTrack && stream.getVideoTracks().some(t => t.enabled && !t.muted);
    const audioEnabled = hasAudioTrack && stream.getAudioTracks().some(t => t.enabled && !t.muted);
    // Local: use props. Remote: use signaled state when available, else derive from stream.
    const micOff = isLocal ? isMuted : (remoteMediaState?.micMuted !== undefined ? remoteMediaState.micMuted : (!hasAudioTrack || !audioEnabled));
    const cameraOff = isLocal ? isVideoOff : (remoteMediaState?.cameraOff !== undefined ? remoteMediaState.cameraOff : (!hasVideoTrack || !videoEnabled));
    // Show video: local = respect toggle; remote = whenever we have any video track (don't require .enabled).
    const showVideo = stream && (isLocal ? hasVideoTrack && videoEnabled : hasVideoTrack);

    const playVideo = useCallback(() => {
        const v = videoRef.current;
        if (v && v.srcObject) v.play().catch(() => {});
    }, []);

    const trackCount = stream?.getTracks?.()?.length ?? 0;
    useEffect(() => {
        if (!stream) return;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        const timeouts = [
            setTimeout(playVideo, 0),
            setTimeout(playVideo, 100),
            setTimeout(playVideo, 300),
            setTimeout(playVideo, 600),
            setTimeout(playVideo, 1200),
        ];
        const onPlay = () => playVideo();
        video.addEventListener('loadedmetadata', onPlay);
        video.addEventListener('loadeddata', onPlay);
        video.addEventListener('canplay', onPlay);
        video.addEventListener('playing', onPlay);
        const onTrack = () => {
            video.srcObject = stream;
            playVideo();
        };
        stream.addEventListener('addtrack', onTrack);
        return () => {
            timeouts.forEach(clearTimeout);
            video.removeEventListener('loadedmetadata', onPlay);
            video.removeEventListener('loadeddata', onPlay);
            video.removeEventListener('canplay', onPlay);
            video.removeEventListener('playing', onPlay);
            stream.removeEventListener('addtrack', onTrack);
        };
    }, [stream, trackCount, playVideo]);

    useEffect(() => {
        if (!stream || isLocal) return;
        const audio = audioRef.current;
        if (!audio) return;
        audio.srcObject = stream;
        audio.muted = false;
        const playAudio = () => { try { audio.play().catch(() => {}); } catch (_) {} };
        playAudio();
        const ta = [50, 200, 500, 1000].map(ms => setTimeout(playAudio, ms));
        const once = () => {
            playAudio();
            document.removeEventListener('click', once);
            document.removeEventListener('touchstart', once);
        };
        audio.play().catch(() => {
            document.addEventListener('click', once, { once: true });
            document.addEventListener('touchstart', once, { once: true });
        });
        const onTrack = () => {
            audio.srcObject = stream;
            playAudio();
        };
        stream.addEventListener('addtrack', onTrack);
        return () => {
            ta.forEach(clearTimeout);
            stream.removeEventListener('addtrack', onTrack);
        };
    }, [stream, trackCount, isLocal]);

    useEffect(() => {
        if (showVideo && videoRef.current) playVideo();
    }, [showVideo, playVideo]);

    // Re-render when remote tracks mute/unmute so mic/camera-off icons update (no event for .enabled, so also poll)
    useEffect(() => {
        if (!stream || isLocal) return;
        const tracks = stream.getTracks();
        const bump = () => setTrackStateTick((t) => t + 1);
        tracks.forEach((t) => {
            t.addEventListener('mute', bump);
            t.addEventListener('unmute', bump);
        });
        const interval = setInterval(bump, 1500);
        return () => {
            clearInterval(interval);
            tracks.forEach((t) => {
                t.removeEventListener('mute', bump);
                t.removeEventListener('unmute', bump);
            });
        };
    }, [stream, isLocal]);

    return (
        <div style={{
            position: 'relative', width: 140, height: 100, borderRadius: 'var(--radius-md)',
            background: '#1E293B', flexShrink: 0, overflow: 'hidden',
            border: '2px solid var(--color-border)', transition: 'border-color var(--transition-fast)',
        }}>
            {label && (
                <span style={{ position: 'absolute', top: 4, left: 6, zIndex: 4, fontSize: '0.65rem', fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'var(--color-accent)', color: '#fff' }}>{label}</span>
            )}
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
            <div style={{ position: 'absolute', bottom: 4, left: 6, right: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, pointerEvents: 'none', zIndex: 5 }}>
                <span style={{ fontSize: '0.65rem', color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '1px 6px', borderRadius: 4, maxWidth: '60%' }} className="truncate">
                    {name}{isLocal ? ' (you)' : ''}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                    {micOff && <span style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(239,68,68,0.95)', color: '#fff', padding: '3px 5px', borderRadius: 4 }} title="Microphone off"><IconMicOff size={14} /></span>}
                    {cameraOff && <span style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(100,116,139,0.95)', color: '#fff', padding: '3px 5px', borderRadius: 4 }} title="Camera off"><IconCameraOff size={14} /></span>}
                </div>
            </div>
        </div>
    );
}

export default function VideoStrip({ localStream, peers, peerMediaState = {}, hostForcedCameraOff, hostForcedMicOff, onCameraTurnedOn, onMicTurnedOn, onMediaStateChange, onTileClick }) {
    const { myName, myUserId, hostId } = useRoom();
    const amHost = String(myUserId) === String(hostId);
    const hostPeer = peers.find((p) => String(p.userId) === String(hostId));
    const otherPeers = peers.filter((p) => String(p.userId) !== String(hostId));
    const [muted, setMuted] = useState(false);
    const [videoOff, setVideoOff] = useState(false);

    // When stream is set or changes, set buttons to match and notify others of our media state
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
        const vOff = !hasVideo;
        const m = !hasAudio;
        setVideoOff(vOff);
        setMuted(m);
        onMediaStateChange?.({ micMuted: m, cameraOff: vOff });
    }, [localStream]);

    useEffect(() => {
        if (hostForcedCameraOff) setVideoOff(true);
    }, [hostForcedCameraOff]);
    useEffect(() => {
        if (hostForcedMicOff) setMuted(true);
    }, [hostForcedMicOff]);

    // Keep others in sync when our mic/camera state changes (including host-forced)
    useEffect(() => {
        onMediaStateChange?.({ micMuted: muted || hostForcedMicOff, cameraOff: videoOff || hostForcedCameraOff });
    }, [muted, videoOff, hostForcedCameraOff, hostForcedMicOff]);

    const toggleMic = () => {
        if (!localStream) return;
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length === 0) return;
        if (muted) onMicTurnedOn?.();
        audioTracks.forEach(t => { t.enabled = !t.enabled; });
        const next = !muted;
        setMuted(next);
        onMediaStateChange?.({ micMuted: next, cameraOff: videoOff });
    };

    const toggleCamera = () => {
        if (!localStream) return;
        if (videoOff) onCameraTurnedOn?.();
        localStream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
        const next = !videoOff;
        setVideoOff(next);
        onMediaStateChange?.({ micMuted: muted, cameraOff: next });
    };

    const localVideoOff = videoOff || hostForcedCameraOff;
    const localMuted = muted || hostForcedMicOff;

    const stripRef = useRef(null);
    const handleStripClick = () => {
        stripRef.current?.querySelectorAll('audio').forEach(el => { try { el.play().catch(() => {}); } catch (_) {} });
    };

    const wrapTile = (content, payload) => (
        onTileClick && payload?.stream ? (
            <div
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onTileClick(payload); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onTileClick(payload); } }}
                style={{ cursor: 'pointer', flexShrink: 0 }}
            >
                {content}
            </div>
        ) : <div style={{ flexShrink: 0 }}>{content}</div>
    );

    return (
        <div
            ref={stripRef}
            role="button"
            tabIndex={0}
            onClick={handleStripClick}
            onKeyDown={e => e.key === 'Enter' && handleStripClick()}
            style={{
                gridArea: 'video',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '0 16px',
                background: 'var(--color-surface)',
                borderTop: '1px solid var(--color-border)',
                overflowX: 'auto',
                position: 'relative',
                zIndex: 30,
                cursor: 'default',
            }}>
            {/* Host video first (with Host label), then my video if not host, then other participants — click to zoom on right */}
            {amHost ? wrapTile(
                <VideoTile stream={localStream} name={myName} isLocal isMuted={localMuted} isVideoOff={localVideoOff} label="Host" />,
                { userId: 'local', stream: localStream, name: myName, label: 'Host' }
            ) : hostPeer ? wrapTile(
                <VideoTile
                    key={hostPeer.userId}
                    stream={hostPeer.stream}
                    name={hostPeer.name}
                    isLocal={false}
                    isMuted={peerMediaState[hostPeer.userId]?.micMuted ?? false}
                    isVideoOff={peerMediaState[hostPeer.userId]?.cameraOff ?? false}
                    remoteMediaState={peerMediaState[hostPeer.userId]}
                    label="Host"
                />,
                { userId: hostPeer.userId, stream: hostPeer.stream, name: hostPeer.name, label: 'Host' }
            ) : null}
            {!amHost && wrapTile(
                <VideoTile stream={localStream} name={myName} isLocal isMuted={localMuted} isVideoOff={localVideoOff} />,
                { userId: 'local', stream: localStream, name: myName }
            )}
            {(amHost ? peers : otherPeers).map((peer) => wrapTile(
                <VideoTile
                    key={peer.userId}
                    stream={peer.stream}
                    name={peer.name}
                    isLocal={false}
                    isMuted={peerMediaState[peer.userId]?.micMuted ?? false}
                    isVideoOff={peerMediaState[peer.userId]?.cameraOff ?? false}
                    remoteMediaState={peerMediaState[peer.userId]}
                />,
                { userId: peer.userId, stream: peer.stream, name: peer.name }
            ))}

            {/* Controls */}
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexShrink: 0 }}>
                <button onClick={toggleMic} 
                    title={!localStream ? 'Waiting for camera/microphone...' : (muted ? 'Turn microphone on' : 'Turn microphone off')}
                    className="btn btn-secondary btn-sm"
                    disabled={!localStream}
                    style={{ background: muted ? 'var(--color-danger-soft)' : undefined, color: muted ? 'var(--color-danger)' : undefined, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: !localStream ? 0.5 : 1 }}>
                    {muted ? <IconMicOff size={18} /> : <IconMic size={18} />}
                </button>
                <button onClick={toggleCamera} 
                    title={!localStream ? 'Waiting for camera/microphone...' : (videoOff ? 'Turn camera on' : 'Turn camera off')}
                    className="btn btn-secondary btn-sm"
                    disabled={!localStream}
                    style={{ background: videoOff ? 'var(--color-danger-soft)' : undefined, color: videoOff ? 'var(--color-danger)' : undefined, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: !localStream ? 0.5 : 1 }}>
                    {videoOff ? <IconCameraOff size={18} /> : <IconCamera size={18} />}
                </button>
            </div>
        </div>
    );
}
