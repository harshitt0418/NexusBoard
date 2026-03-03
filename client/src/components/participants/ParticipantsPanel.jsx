import { useSocket } from '../../context/SocketContext';
import { useRoom } from '../../context/RoomContext';
import { IconClose, IconLock, IconUnlock, IconCheck, IconCamera, IconCameraOff, IconMic, IconMicOff, IconPen, IconCrown } from '../ui/Icons';

export default function ParticipantsPanel({ isOpen, onClose, peerMediaState = {} }) {
    const { socket } = useSocket();
    const { participants, activeEditors, pendingRequests, myRole, myUserId, boardLocked, setBoardLocked } = useRoom();

    const isHost = myRole === 'host';

    const approve = (userId) => socket?.emit('approve_draw_access', { targetUserId: userId });
    const reject = (userId) => socket?.emit('reject_draw_access', { targetUserId: userId });
    const revoke = (userId) => socket?.emit('revoke_draw_access', { targetUserId: userId });
    const requestDraw = () => socket?.emit('request_draw_access');
    const turnOffParticipantCamera = (targetUserId) => socket?.emit('host_turn_off_participant_camera', { targetUserId });
    const turnOffParticipantMic = (targetUserId) => socket?.emit('host_turn_off_participant_mic', { targetUserId });
    const toggleLock = () => {
        const next = !boardLocked;
        setBoardLocked(next);
        socket?.emit('lock_board', { locked: next });
    };

    const sameUser = (a, b) => String(a ?? '') === String(b ?? '');
    const isEditor = (uid) => (activeEditors || []).some((id) => String(id) === String(uid));
    const isPending = (uid) => (pendingRequests || []).some((r) => String(r.userId) === String(uid));

    return (
        <div className={`side-panel ${isOpen ? 'open' : ''}`} style={{
            gridArea: 'participants',
            display: 'flex', flexDirection: 'column',
            background: 'var(--color-surface)',
            borderLeft: '1px solid var(--color-border)',
            width: 'var(--panel-w)',
            position: 'relative',
            zIndex: 200,
        }}>
            {/* Header */}
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Participants</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-blue">{participants.length}</span>
                    <button className="btn-icon" onClick={onClose} type="button" aria-label="Close"><IconClose size={18} /></button>
                </div>
            </div>

            {/* Host controls */}
            {isHost && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-light)', background: 'var(--color-surface-2)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Host Controls</div>
                    <button
                        onClick={toggleLock}
                        className={`btn btn-sm w-full ${boardLocked ? 'btn-danger' : 'btn-secondary'}`}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        {boardLocked ? <><IconLock size={16} /> Board Locked</> : <><IconUnlock size={16} /> Lock Board</>}
                    </button>
                </div>
            )}

            {/* Pending requests */}
            {pendingRequests.length > 0 && (
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-border-light)', background: 'var(--color-warning-soft)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-warning)', display: 'inline-block', animation: 'pulse-ring 1.5s infinite' }} />
                        {pendingRequests.length} Draw Request{pendingRequests.length > 1 ? 's' : ''}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {pendingRequests.map(req => (
                            <div key={req.userId} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                                <div style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: 8 }}>{req.userName} wants to draw</div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button className="btn btn-success btn-sm" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => approve(req.userId)}><IconCheck size={14} /> Allow</button>
                                    <button className="btn btn-secondary btn-sm" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => reject(req.userId)}><IconClose size={14} /> Deny</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Participants list — host pinned at top */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...participants]
                    .sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0))
                    .map(p => {
                    const editor = isEditor(p.userId);
                    const pending = isPending(p.userId);
                    const meHost = p.isHost;
                    const mediaState = peerMediaState[p.userId] || {};
                    const isCameraOff = mediaState.cameraOff === true;
                    const isMicMuted = mediaState.micMuted === true;
                    return (
                        <div key={p.userId} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 12px', borderRadius: 'var(--radius-md)',
                            background: sameUser(p.userId, myUserId) ? 'var(--color-accent-soft)' : 'var(--color-surface-2)',
                            border: `1px solid ${sameUser(p.userId, myUserId) ? 'rgba(233,168,76,0.3)' : 'var(--color-border)'}`,
                            outline: editor ? '2px solid rgba(16,185,129,0.35)' : 'none',
                            transition: 'all var(--transition-fast)',
                        }}>
                            {/* Avatar */}
                            <div style={{
                                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                                background: meHost ? 'var(--color-accent)' : editor ? 'var(--color-success)' : 'var(--color-muted)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontWeight: 700, fontSize: '0.875rem',
                                animation: editor ? 'pulse-ring 2s infinite' : 'none',
                            }}>
                                {p.userName?.[0]?.toUpperCase()}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 500, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    {/* Host: revoke icon in front of name for editors */}
                                    {isHost && !sameUser(p.userId, myUserId) && editor && (
                                        <button
                                            type="button"
                                            className="btn-icon"
                                            title="Revoke draw access"
                                            onClick={() => revoke(p.userId)}
                                            style={{ width: 24, height: 24, flexShrink: 0, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                            aria-label={`Revoke draw access for ${p.userName}`}
                                        >
                                            <IconLock size={14} />
                                        </button>
                                    )}
                                    <span className="truncate">{p.userName}{sameUser(p.userId, myUserId) ? ' (you)' : ''}</span>
                                    {meHost && <IconCrown size={14} style={{ flexShrink: 0 }} />}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: meHost ? 'var(--color-accent)' : editor ? 'var(--color-success)' : 'var(--color-muted)' }}>
                                    {meHost ? 'Host' : editor ? 'Editor' : pending ? 'Requesting…' : 'Viewer'}
                                </div>
                            </div>

                            {/* Host actions: turn off camera/mic; grant (for viewers) */}
                            {isHost && !sameUser(p.userId, myUserId) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <button className="btn-icon" title={isCameraOff ? "Camera is off" : "Turn off their camera"} onClick={() => turnOffParticipantCamera(p.userId)}
                                        style={{ width: 28, height: 28, color: isCameraOff ? 'var(--color-danger)' : 'var(--color-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {isCameraOff ? <IconCameraOff size={16} /> : <IconCamera size={16} />}
                                    </button>
                                    <button className="btn-icon" title={isMicMuted ? "Mic is muted" : "Turn off their microphone"} onClick={() => turnOffParticipantMic(p.userId)}
                                        style={{ width: 28, height: 28, color: isMicMuted ? 'var(--color-danger)' : 'var(--color-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {isMicMuted ? <IconMicOff size={16} /> : <IconMic size={16} />}
                                    </button>
                                    {!editor && !pending && (
                                        <button className="btn-icon" title="Grant draw access" onClick={() => approve(p.userId)}
                                            style={{ width: 28, height: 28, color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconPen size={16} /></button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Participant: request draw */}
            {myRole === 'viewer' && (
                <div style={{ padding: '12px 14px', borderTop: '1px solid var(--color-border)' }}>
                    <button className="btn btn-secondary w-full" onClick={requestDraw}
                        style={{ fontSize: '0.875rem', border: '1.5px dashed var(--color-accent)', color: 'var(--color-accent)', background: 'var(--color-accent-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <IconPen size={18} /> Request Drawing Access
                    </button>
                </div>
            )}
        </div>
    );
}
