import { useEffect, useRef } from 'react';
import { IconClose } from '../ui/Icons';

export default function VideoFocusPanel({ stream, name, isLocal, label, onClose }) {
    const videoRef = useRef(null);
    const audioRef = useRef(null);
    const hasVideoTrack = stream?.getVideoTracks?.()?.length > 0;
    const showVideo = stream && hasVideoTrack;

    useEffect(() => {
        if (!stream) return;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        const play = () => video.play().catch(() => {});
        play();
        [100, 300].forEach((ms) => setTimeout(play, ms));
        const onTrack = () => { video.srcObject = stream; play(); };
        stream.addEventListener('addtrack', onTrack);
        return () => stream.removeEventListener('addtrack', onTrack);
    }, [stream]);

    useEffect(() => {
        if (!stream || isLocal) return;
        const audio = audioRef.current;
        if (!audio) return;
        audio.srcObject = stream;
        audio.muted = false;
        const playAudio = () => { try { audio.play().catch(() => {}); } catch (_) {} };
        playAudio();
        setTimeout(playAudio, 200);
        stream.addEventListener('addtrack', playAudio);
        return () => stream.removeEventListener('addtrack', playAudio);
    }, [stream, isLocal]);

    return (
        <div className="side-panel open" style={{
            gridArea: 'participants',
            display: 'flex', flexDirection: 'column',
            background: 'var(--color-surface)',
            borderLeft: '1px solid var(--color-border)',
            width: 'var(--panel-w)',
            position: 'relative',
            zIndex: 200,
        }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="truncate">{name}{isLocal ? ' (you)' : ''}</span>
                    {label && <span className="badge badge-blue" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{label}</span>}
                </div>
                <button className="btn-icon" onClick={onClose} type="button" aria-label="Close"><IconClose size={18} /></button>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1E293B', position: 'relative' }}>
                {stream && (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{
                                width: '100%', height: '100%', maxHeight: '100%',
                                objectFit: 'contain',
                                transform: isLocal ? 'scaleX(-1)' : 'none',
                                opacity: showVideo ? 1 : 0,
                            }}
                        />
                        {!isLocal && <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />}
                    </>
                )}
                {(!stream || !showVideo) && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#fff', fontWeight: 700 }}>
                            {name?.[0]?.toUpperCase()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
