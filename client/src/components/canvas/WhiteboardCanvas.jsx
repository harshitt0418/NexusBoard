import { useRef, useEffect, useCallback, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useRoom } from '../../context/RoomContext';
import { IconEye } from '../ui/Icons';

const THROTTLE_MS = 16; // ~60fps
const STROKE_VISIBLE_TIME = 3000; // ms before fade starts
const STROKE_FADE_TIME    = 2000; // ms fade duration

let lastEmit = 0;

const defaultPhotosTransform = { offsetX: 0, offsetY: 0, scale: 1 };

// For each stroke point, return null if any eraser point is within eraserRadius; else return the point.
// rawEraserPoints and the returned pixel coords are in canvas-pixel space;
// stroke points are normalised (0-1) and scaled by cw/ch.
function eraseStrokePoints(strokePoints, rawEraserPoints, eraserRadius, cw, ch) {
    const r2 = eraserRadius * eraserRadius;
    return strokePoints.map(sp => {
        const px = sp.x * cw;
        const py = sp.y * ch;
        for (const ep of rawEraserPoints) {
            const dx = ep.x - px;
            const dy = ep.y - py;
            if (dx * dx + dy * dy <= r2) return null;
        }
        return sp;
    });
}

// Splits a nullable-point array into groups of ≥2 consecutive non-null points.
function splitIntoSegments(nullablePoints) {
    const segments = [];
    let current = [];
    for (const pt of nullablePoints) {
        if (pt !== null) {
            current.push(pt);
        } else {
            if (current.length >= 2) segments.push([...current]);
            current = [];
        }
    }
    if (current.length >= 2) segments.push(current);
    return segments;
}

export default function WhiteboardCanvas({ tool, color, strokeWidth, onUndoRef, photos = [], photosTransform, onPhotosTransformChange, canMovePdf = false }) {
    const containerRef = useRef(null);
    const photosLayerRef = useRef(null);  // back canvas: white + photos (eraser does NOT touch this)
    const photosCtxRef = useRef(null);
    const strokeCanvasRef = useRef(null); // front canvas: strokes only (clear to transparent)
    const ctxRef = useRef(null);
    const photosTransformRef = useRef(defaultPhotosTransform);
    const isPanningBg = useRef(false);
    const panStart = useRef(null);
    const photosImagesRef = useRef({}); // id -> HTMLImageElement
    const t = photosTransform ?? defaultPhotosTransform;
    photosTransformRef.current = t;
    const isDrawing = useRef(false);
    const lastPos = useRef(null);
    const strokesRef = useRef([]);
    const currentStroke = useRef([]);
    const fadeLoopRef = useRef(null); // rAF id for temporary-stroke fade animation
    const { socket } = useSocket();
    const { canDraw, myUserId, myName, strokes } = useRoom();
    const [remoteCursors, setRemoteCursors] = useState({});
    const [isPanning, setIsPanning] = useState(false);

    // Init both canvases
    useEffect(() => {
        const photosLayer = photosLayerRef.current;
        const strokeCanvas = strokeCanvasRef.current;
        if (!photosLayer || !strokeCanvas) return;
        const pCtx = photosLayer.getContext('2d', { willReadFrequently: false });
        const sCtx = strokeCanvas.getContext('2d', { alpha: true, willReadFrequently: true });
        if (!pCtx || !sCtx) return;
        photosCtxRef.current = pCtx;
        ctxRef.current = sCtx;
        sCtx.lineCap = 'round';
        sCtx.lineJoin = 'round';
        requestAnimationFrame(() => {
            const container = containerRef.current;
            const photosLayer = photosLayerRef.current;
            const strokeCanvas = strokeCanvasRef.current;
            if (!container || !photosLayer || !strokeCanvas) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w === 0 || h === 0) return;
            photosLayer.width = w;
            photosLayer.height = h;
            strokeCanvas.width = w;
            strokeCanvas.height = h;
            const pCtx = photosCtxRef.current;
            const sCtx = ctxRef.current;
            if (pCtx) { pCtx.fillStyle = '#ffffff'; pCtx.fillRect(0, 0, w, h); }
            if (sCtx) sCtx.clearRect(0, 0, w, h);
        });
    }, []);

    const drawStroke = (ctx, stroke, canvas) => {
        if (!stroke?.points?.length || !canvas) return;
        const cw = canvas.width;
        const ch = canvas.height;
        const scaleX = (v) => (v != null && v <= 1.1 ? v * cw : v);
        const scaleY = (v) => (v != null && v <= 1.1 ? v * ch : v);
        const isEraser = stroke.tool === 'eraser';

        // Compute opacity for temporary strokes
        let alpha = 1;
        if (stroke.type === 'temporary' && stroke.createdAt) {
            const age = Date.now() - stroke.createdAt;
            if (age > STROKE_VISIBLE_TIME) {
                alpha = Math.max(0, 1 - (age - STROKE_VISIBLE_TIME) / STROKE_FADE_TIME);
            }
        }
        ctx.globalAlpha = alpha;

        ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
        ctx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : stroke.color;
        ctx.lineWidth = isEraser ? Math.max(stroke.width * 3, 12) : stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const pts = stroke.points;
        ctx.moveTo(scaleX(pts[0].x), scaleY(pts[0].y));
        for (let i = 1; i < pts.length; i++) {
            const x0 = scaleX(pts[i - 1].x);
            const y0 = scaleY(pts[i - 1].y);
            const x1 = scaleX(pts[i].x);
            const y1 = scaleY(pts[i].y);
            const xc = (x1 + x0) / 2;
            const yc = (y1 + y0) / 2;
            ctx.quadraticCurveTo(x0, y0, xc, yc);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    };

    const redrawPhotosLayer = useCallback(() => {
        const ctx = photosCtxRef.current;
        const canvas = photosLayerRef.current;
        if (!ctx || !canvas) return;
        const cw = canvas.width;
        const ch = canvas.height;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cw, ch);
        const t = photosTransformRef.current || defaultPhotosTransform;
        const userScale = t.scale || 1;
        (photos || []).forEach((photo) => {
            const img = photosImagesRef.current[photo.id];
            if (!img?.complete || !img.naturalWidth) return;
            const baseScale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
            const dw = img.naturalWidth * baseScale * userScale;
            const dh = img.naturalHeight * baseScale * userScale;
            const dx = (cw - dw) / 2 + (t.offsetX || 0);
            const dy = (ch - dh) / 2 + (t.offsetY || 0);
            ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, dx, dy, dw, dh);
        });
    }, [photos]);

    const redrawStrokesOnly = useCallback((allStrokes = strokesRef.current) => {
        const ctx = ctxRef.current;
        const canvas = strokeCanvasRef.current;
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        (allStrokes || []).forEach((s) => drawStroke(ctx, s, canvas));
    }, []);

    const resizeBoth = useCallback(() => {
        const container = containerRef.current;
        const photosLayer = photosLayerRef.current;
        const strokeCanvas = strokeCanvasRef.current;
        if (!container || !photosLayer || !strokeCanvas) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w === 0 || h === 0) return;
        photosLayer.width = w;
        photosLayer.height = h;
        strokeCanvas.width = w;
        strokeCanvas.height = h;
        redrawPhotosLayer();
        redrawStrokesOnly();
    }, [redrawPhotosLayer, redrawStrokesOnly]);

    useEffect(() => {
        window.addEventListener('resize', resizeBoth);
        return () => {
            window.removeEventListener('resize', resizeBoth);
            if (fadeLoopRef.current !== null) {
                cancelAnimationFrame(fadeLoopRef.current);
                fadeLoopRef.current = null;
            }
        };
    }, [resizeBoth]);

    useEffect(() => {
        redrawPhotosLayer();
    }, [photosTransform, redrawPhotosLayer]);

    // Load each photo into images cache and redraw photos layer
    useEffect(() => {
        if (!photos?.length) {
            photosImagesRef.current = {};
            redrawPhotosLayer();
            return;
        }
        let pending = photos.length;
        photos.forEach((photo) => {
            if (photosImagesRef.current[photo.id]?.src === photo.url) {
                pending -= 1;
                if (pending === 0) redrawPhotosLayer();
                return;
            }
            const img = new Image();
            if (!photo.url.startsWith('data:')) img.crossOrigin = 'anonymous';
            img.onload = () => {
                photosImagesRef.current[photo.id] = img;
                pending -= 1;
                if (pending === 0) redrawPhotosLayer();
            };
            img.onerror = () => { pending -= 1; if (pending === 0) redrawPhotosLayer(); };
            img.src = photo.url;
        });
        return () => { photos.forEach((p) => { const i = photosImagesRef.current[p.id]; if (i) i.src = ''; }); };
    }, [photos, redrawPhotosLayer]);

    useEffect(() => {
        if (strokes?.length) {
            redrawStrokesOnly(strokes);
            strokesRef.current = [...strokes];
        }
    }, [strokes, redrawStrokesOnly]);

    const redrawAll = useCallback((allStrokes = strokesRef.current) => {
        redrawStrokesOnly(allStrokes);
    }, [redrawStrokesOnly]);

    // Runs an rAF loop while temporary strokes are fading.
    // Prunes fully-expired strokes on each frame and redraws until none remain.
    const startFadeLoop = useCallback(() => {
        if (fadeLoopRef.current !== null) return; // already running
        const tick = () => {
            const now = Date.now();
            const hadTemporary = strokesRef.current.some(s => s.type === 'temporary');
            if (!hadTemporary) { fadeLoopRef.current = null; return; }
            // Remove strokes that have fully faded
            strokesRef.current = strokesRef.current.filter(s => {
                if (s.type !== 'temporary') return true;
                return now - s.createdAt < STROKE_VISIBLE_TIME + STROKE_FADE_TIME;
            });
            redrawStrokesOnly();
            fadeLoopRef.current = requestAnimationFrame(tick);
        };
        fadeLoopRef.current = requestAnimationFrame(tick);
    }, [redrawStrokesOnly]);

    const drawPoint = (ctx, x, y, prevX, prevY, strokeColor, width, t) => {
        if (!ctx) return;
        const isEraser = t === 'eraser';
        ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
        // destination-out: source alpha must be 1 to fully erase (0.001 erased almost nothing)
        ctx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : strokeColor;
        ctx.lineWidth = isEraser ? Math.max(width * 3, 12) : width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    };

    useEffect(() => {
        if (!socket) return;
        socket.on('board_draw', (data) => {
            const ctx = ctxRef.current;
            const canvas = strokeCanvasRef.current;
            if (!ctx || !canvas) return;
            const cw = canvas.width;
            const ch = canvas.height;
            if (cw === 0 || ch === 0) return;
            if (data.type === 'move' && data.lastPos) {
                const scaleX = (v) => (v != null && v <= 1.1 ? v * cw : v);
                const scaleY = (v) => (v != null && v <= 1.1 ? v * ch : v);
                const x = scaleX(data.x);
                const y = scaleY(data.y);
                const lx = scaleX(data.lastPos.x);
                const ly = scaleY(data.lastPos.y);
                drawPoint(ctx, x, y, lx, ly, data.color, data.width, data.tool);
            } else if (data.type === 'end' && data.stroke) {
                strokesRef.current.push(data.stroke);
                redrawAll();
                if (data.stroke.type === 'temporary') startFadeLoop();
            }
        });
        socket.on('board_clear', () => {
            strokesRef.current = [];
            redrawAll();
        });
        socket.on('board_undo', ({ userId: uid }) => {
            const idx = [...strokesRef.current].reverse().findIndex(s => s.userId === uid);
            if (idx !== -1) strokesRef.current.splice(strokesRef.current.length - 1 - idx, 1);
            redrawAll();
        });
        socket.on('erase_strokes', ({ strokeIds }) => {
            if (!Array.isArray(strokeIds) || strokeIds.length === 0) return;
            const toRemove = new Set(strokeIds);
            strokesRef.current = strokesRef.current.filter(s => !toRemove.has(s.id));
            redrawAll();
        });
        socket.on('stroke_partial_erase', ({ originalId, replacements }) => {
            strokesRef.current = strokesRef.current.filter(s => s.id !== originalId);
            if (Array.isArray(replacements) && replacements.length > 0) {
                strokesRef.current.push(...replacements);
            }
            redrawAll();
        });
        socket.on('cursor_move', ({ userId: uid, userName: un, x, y }) => {
            setRemoteCursors(prev => ({ ...prev, [uid]: { name: un, x, y, ts: Date.now() } }));
        });
        return () => {
            socket.off('board_draw');
            socket.off('board_clear');
            socket.off('board_undo');
            socket.off('erase_strokes');
            socket.off('stroke_partial_erase');
            socket.off('cursor_move');
        };
    }, [socket, redrawAll, startFadeLoop]);

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
        const canvas = strokeCanvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const src = e.touches ? e.touches[0] : e;
        const displayX = src.clientX - rect.left;
        const displayY = src.clientY - rect.top;
        if (rect.width <= 0 || rect.height <= 0 || canvas.width <= 0 || canvas.height <= 0) return { x: 0, y: 0 };
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: displayX * scaleX, y: displayY * scaleY };
    };

    const handleDown = (e) => {
        e.preventDefault();
        if (tool === 'select' && photos?.length > 0) {
            if (!canMovePdf) return; // only host can move PDFs/screenshots
            isPanningBg.current = true;
            setIsPanning(true);
            const pos = getPos(e);
            panStart.current = {
                x: pos.x,
                y: pos.y,
                offsetX: photosTransformRef.current?.offsetX || 0,
                offsetY: photosTransformRef.current?.offsetY || 0,
            };
            return;
        }
        if (tool === 'select') return;
        if (!canDraw) return;
        const pos = getPos(e);
        isDrawing.current = true;
        lastPos.current = pos;
        currentStroke.current = [{ x: pos.x, y: pos.y }];
    };

    const handleMove = useCallback((e) => {
        const pos = getPos(e);
        const now = Date.now();
        if (isPanningBg.current && panStart.current) {
            e.preventDefault();
            const dx = pos.x - panStart.current.x;
            const dy = pos.y - panStart.current.y;
            const next = {
                ...(photosTransformRef.current || defaultPhotosTransform),
                offsetX: (panStart.current.offsetX || 0) + dx,
                offsetY: (panStart.current.offsetY || 0) + dy,
            };
            photosTransformRef.current = next;
            onPhotosTransformChange?.(next);
            redrawPhotosLayer();
            return;
        }
        if (tool === 'select') return;
        if (!canDraw) return;
        if (now - lastEmit > 50) {
            socket?.emit('cursor_move', { x: pos.x, y: pos.y });
            lastEmit = now;
        }
        if (!isDrawing.current || !lastPos.current) return;
        e.preventDefault();
        currentStroke.current.push({ x: pos.x, y: pos.y });
        if (tool === 'eraser') {
            // Redraw-based preview: show partial erasure of owned strokes as the eraser moves.
            // Never apply destination-out to the canvas during drag, which would
            // temporarily erase other users' strokes.
            const canvas = strokeCanvasRef.current;
            if (canvas) {
                const cw = canvas.width || 1;
                const ch = canvas.height || 1;
                const eraserRadius = Math.max(strokeWidth * 3, 12) / 2;
                const previewStrokes = strokesRef.current.flatMap(s => {
                    if (s.userId !== myUserId || s.tool === 'eraser') return [s];
                    const nullable = eraseStrokePoints(s.points, currentStroke.current, eraserRadius, cw, ch);
                    const segs = splitIntoSegments(nullable);
                    if (segs.length === 0) return [];
                    return segs.map((pts, i) => ({ ...s, id: `${s.id}_preview_${i}`, points: pts }));
                });
                redrawStrokesOnly(previewStrokes);
            }
            // Do NOT emit board_draw 'move' for eraser; stroke_partial_erase is sent on mouseup.
        } else {
            const ctx = ctxRef.current;
            drawPoint(ctx, pos.x, pos.y, lastPos.current.x, lastPos.current.y, color, strokeWidth, tool);
            if (now - lastEmit > THROTTLE_MS) {
                const c = strokeCanvasRef.current;
                if (c?.width && c?.height) {
                    const n = (x, y) => ({ x: x / c.width, y: y / c.height });
                    socket?.emit('board_draw', {
                        type: 'move',
                        x: pos.x / c.width,
                        y: pos.y / c.height,
                        lastPos: n(lastPos.current.x, lastPos.current.y),
                        color,
                        width: strokeWidth,
                        tool,
                    });
                }
            }
        }
        lastPos.current = pos;
    }, [canDraw, color, strokeWidth, tool, socket, redrawPhotosLayer, onPhotosTransformChange, redrawStrokesOnly, myUserId]);

    const handleUp = () => {
        if (isPanningBg.current) {
            isPanningBg.current = false;
            setIsPanning(false);
            // Emit final transform after panning ends
            const finalTransform = photosTransformRef.current || defaultPhotosTransform;
            socket?.emit('board_photos_transform', { transform: finalTransform });
            panStart.current = null;
            return;
        }
        if (!isDrawing.current) return;
        isDrawing.current = false;
        const canvas = strokeCanvasRef.current;
        const cw = canvas?.width || 1;
        const ch = canvas?.height || 1;

        if (tool === 'eraser') {
            // Ownership-aware partial erase: only modify strokes the current user created.
            const eraserRadius = Math.max(strokeWidth * 3, 12) / 2;
            const newStrokes = [];
            for (const s of strokesRef.current) {
                if (s.userId !== myUserId || s.tool === 'eraser') {
                    newStrokes.push(s);
                    continue;
                }
                const nullable = eraseStrokePoints(s.points, currentStroke.current, eraserRadius, cw, ch);
                const hitAny = nullable.some(p => p === null);
                if (!hitAny) {
                    newStrokes.push(s);
                    continue;
                }
                const segs = splitIntoSegments(nullable);
                const replacements = segs.map((pts, i) => ({
                    ...s,
                    id: `${s.id}_e${Date.now()}_${i}`,
                    points: pts,
                }));
                newStrokes.push(...replacements);
                socket?.emit('stroke_partial_erase', { originalId: s.id, replacements });
            }
            strokesRef.current = newStrokes;
            // Always redraw to clear the preview and apply committed state
            redrawStrokesOnly();
        } else {
            const points = currentStroke.current.map((p) => ({ x: p.x / cw, y: p.y / ch }));
            const isTemporary = tool === 'temporaryBrush';
            const stroke = {
                id: `${myUserId}-${Date.now()}`,
                userId: myUserId,
                points,
                color,
                width: strokeWidth,
                tool: isTemporary ? 'pen' : tool, // render as pen; type flag carries the temporary info
                ...(isTemporary ? { type: 'temporary', createdAt: Date.now() } : {}),
            };
            strokesRef.current.push(stroke);
            redrawStrokesOnly();
            socket?.emit('board_draw', { type: 'end', stroke });
            if (isTemporary) startFadeLoop();
        }
        lastPos.current = null;
        currentStroke.current = [];
    };

    const hasPhotos = photos?.length > 0;

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', background: '#fff', overflow: 'hidden', isolation: 'isolate' }}>
            {/* Back layer: white + photos (eraser never touches this); must not capture pointer */}
            <canvas
                ref={photosLayerRef}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}
                aria-hidden
            />
            {/* Front layer: strokes only; canvas must receive events directly for pen/eraser */}
            <canvas
                ref={strokeCanvasRef}
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    zIndex: 2,
                    pointerEvents: 'auto',
                    touchAction: 'none',
                    cursor: isPanning ? 'grabbing'
                        : (tool === 'select' && hasPhotos) ? 'grab'
                        : !canDraw ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair',
                }}
                onMouseDown={handleDown}
                onMouseMove={handleMove}
                onMouseUp={handleUp}
                onMouseLeave={handleUp}
                onTouchStart={handleDown}
                onTouchMove={handleMove}
                onTouchEnd={handleUp}
            />

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

            {!canDraw && (
                <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,23,42,0.7)', color: '#fff', padding: '8px 20px', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', fontWeight: 500, backdropFilter: 'blur(4px)', display: 'inline-flex', alignItems: 'center', gap: 8, pointerEvents: 'none', zIndex: 3 }}>
                    <IconEye size={16} /> View only — request drawing access to edit
                </div>
            )}

            {tool === 'select' && hasPhotos && !isPanning && canDraw && (
                <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,23,42,0.75)', color: '#fff', padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 500, backdropFilter: 'blur(4px)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 3 }}>
                    Drag to move photos
                </div>
            )}
        </div>
    );
}
