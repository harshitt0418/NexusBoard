import { useRef, useEffect, useCallback, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useRoom } from '../../context/RoomContext';

const THROTTLE_MS = 16; // ~60fps

let lastEmit = 0;

export default function WhiteboardCanvas({ tool, color, strokeWidth, onUndoRef }) {
    const canvasRef = useRef(null);
    const overlayRef = useRef(null); // for remote cursors
    const ctxRef = useRef(null);
    const isDrawing = useRef(false);
    const lastPos = useRef(null);
    const strokesRef = useRef([]); // local undo stack
    const currentStroke = useRef([]);
    const { socket } = useSocket();
    const { canDraw, myUserId, myName, strokes } = useRoom();
    const [remoteCursors, setRemoteCursors] = useState({});

    // Init canvas — defer resize to rAF so the parent has laid out
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctxRef.current = ctx;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        requestAnimationFrame(() => resizeCanvas());
    }, []);

    const resizeCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const parent = canvas.parentElement;
        if (!parent) return;
        const newW = parent.clientWidth;
        const newH = parent.clientHeight;
        if (newW === 0 || newH === 0) return; // guard: skip when not yet laid out
        // Only capture existing pixels if canvas already has content
        const imageData = (canvas.width > 0 && canvas.height > 0)
            ? ctxRef.current?.getImageData(0, 0, canvas.width, canvas.height)
            : null;
        canvas.width = newW;
        canvas.height = newH;
        if (imageData) ctxRef.current.putImageData(imageData, 0, 0);
        redrawAll();
    };

    useEffect(() => {
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    // Replay strokes from room state
    useEffect(() => {
        if (strokes?.length) {
            redrawAll(strokes);
            strokesRef.current = [...strokes];
        }
    }, [strokes]);

    const redrawAll = useCallback((allStrokes = strokesRef.current) => {
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        allStrokes.forEach(s => drawStroke(ctx, s));
    }, []);

    const drawStroke = (ctx, stroke) => {
        if (!stroke?.points?.length) return;
        ctx.beginPath();
        ctx.strokeStyle = stroke.tool === 'eraser' ? '#FFFFFF' : stroke.color;
        ctx.lineWidth = stroke.tool === 'eraser' ? stroke.width * 3 : stroke.width;
        ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
        const pts = stroke.points;
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            const xc = (pts[i].x + pts[i - 1].x) / 2;
            const yc = (pts[i].y + pts[i - 1].y) / 2;
            ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, xc, yc);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    };

    const drawPoint = (ctx, x, y, prevX, prevY, strokeColor, width, t) => {
        ctx.beginPath();
        ctx.strokeStyle = t === 'eraser' ? '#FFFFFF' : strokeColor;
        ctx.lineWidth = t === 'eraser' ? width * 3 : width;
        ctx.globalCompositeOperation = t === 'eraser' ? 'destination-out' : 'source-over';
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    };

    // Socket events
    useEffect(() => {
        if (!socket) return;

        socket.on('board_draw', (data) => {
            const ctx = ctxRef.current;
            if (!ctx) return;
            if (data.type === 'move' && data.lastPos) {
                drawPoint(ctx, data.x, data.y, data.lastPos.x, data.lastPos.y, data.color, data.width, data.tool);
            } else if (data.type === 'end' && data.stroke) {
                strokesRef.current.push(data.stroke);
            }
        });

        socket.on('board_clear', () => {
            strokesRef.current = [];
            ctxRef.current?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        });

        socket.on('board_undo', ({ userId: uid }) => {
            // Remove last stroke by that user
            const idx = [...strokesRef.current].reverse().findIndex(s => s.userId === uid);
            if (idx !== -1) strokesRef.current.splice(strokesRef.current.length - 1 - idx, 1);
            redrawAll();
        });

        socket.on('cursor_move', ({ userId: uid, userName: un, x, y }) => {
            setRemoteCursors(prev => ({ ...prev, [uid]: { name: un, x, y, ts: Date.now() } }));
        });

        return () => {
            socket.off('board_draw');
            socket.off('board_clear');
            socket.off('board_undo');
            socket.off('cursor_move');
        };
    }, [socket, redrawAll]);

    // Cleanup stale cursors
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setRemoteCursors(prev => {
                const filtered = {};
                Object.entries(prev).forEach(([k, v]) => { if (now - v.ts < 4000) filtered[k] = v; });
                return filtered;
            });
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    // Expose undo via ref
    useEffect(() => {
        if (onUndoRef) {
            onUndoRef.current = () => {
                const idx = [...strokesRef.current].reverse().findIndex(s => s.userId === myUserId);
                if (idx !== -1) {
                    const strokeId = strokesRef.current[strokesRef.current.length - 1 - idx]?.id;
                    strokesRef.current.splice(strokesRef.current.length - 1 - idx, 1);
                    redrawAll();
                    socket?.emit('board_undo', { strokeId });
                }
            };
        }
    }, [myUserId, socket, redrawAll, onUndoRef]);

    const getPos = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const src = e.touches ? e.touches[0] : e;
        return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    };

    const handleDown = (e) => {
        if (!canDraw) return;
        e.preventDefault();
        const pos = getPos(e);
        isDrawing.current = true;
        lastPos.current = pos;
        currentStroke.current = [{ x: pos.x, y: pos.y }];
    };

    const handleMove = useCallback((e) => {
        if (!canDraw) return;
        const pos = getPos(e);
        const now = Date.now();

        // Emit cursor position (throttled)
        if (now - lastEmit > 50) {
            socket?.emit('cursor_move', { x: pos.x, y: pos.y });
            lastEmit = now;
        }

        if (!isDrawing.current || !lastPos.current) return;
        e.preventDefault();

        const ctx = ctxRef.current;
        drawPoint(ctx, pos.x, pos.y, lastPos.current.x, lastPos.current.y, color, strokeWidth, tool);
        currentStroke.current.push({ x: pos.x, y: pos.y });

        if (now - lastEmit > THROTTLE_MS) {
            socket?.emit('board_draw', {
                type: 'move',
                x: pos.x, y: pos.y,
                lastPos: lastPos.current,
                color, width: strokeWidth, tool,
            });
        }
        lastPos.current = pos;
    }, [canDraw, color, strokeWidth, tool, socket]);

    const handleUp = () => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        const stroke = {
            id: `${myUserId}-${Date.now()}`,
            userId: myUserId,
            points: currentStroke.current,
            color, width: strokeWidth, tool,
        };
        strokesRef.current.push(stroke);
        socket?.emit('board_draw', { type: 'end', stroke });
        lastPos.current = null;
        currentStroke.current = [];
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#fff', overflow: 'hidden' }}>
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute', inset: 0,
                    cursor: !canDraw ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair',
                    touchAction: 'none',
                }}
                onMouseDown={handleDown}
                onMouseMove={handleMove}
                onMouseUp={handleUp}
                onMouseLeave={handleUp}
                onTouchStart={handleDown}
                onTouchMove={handleMove}
                onTouchEnd={handleUp}
            />

            {/* Remote cursors overlay */}
            {Object.entries(remoteCursors).map(([uid, cur]) => (
                <div key={uid} style={{
                    position: 'absolute',
                    left: cur.x, top: cur.y,
                    pointerEvents: 'none',
                    transform: 'translate(-2px, -2px)',
                    zIndex: 10,
                }}>
                    <svg width="14" height="14" viewBox="0 0 14 14">
                        <path d="M1 1l4 11 2-4 4-2z" fill="var(--color-accent)" stroke="#fff" strokeWidth="1" />
                    </svg>
                    <div style={{ background: 'var(--color-accent)', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, marginLeft: 8, marginTop: -4, whiteSpace: 'nowrap', boxShadow: 'var(--shadow-sm)' }}>
                        {cur.name}
                    </div>
                </div>
            ))}

            {/* Viewer overlay */}
            {!canDraw && (
                <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,23,42,0.7)', color: '#fff', padding: '8px 20px', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', fontWeight: 500, backdropFilter: 'blur(4px)' }}>
                    👁 View only — request drawing access to edit
                </div>
            )}
        </div>
    );
}
