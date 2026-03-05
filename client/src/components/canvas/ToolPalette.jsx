import { IconPen, IconEraser, IconSelect, IconUndo, IconTrash, IconPdf, IconImage, IconImageOff, IconArrowLeft, IconArrowRight, IconPlus, IconMinus, IconSync } from '../ui/Icons';

const TOOLS = [
    { id: 'pen',    Icon: IconPen,    label: 'Draw',   tooltip: 'Draw on board',          ariaLabel: 'Draw on board' },
    { id: 'eraser', Icon: IconEraser, label: 'Erase',  tooltip: 'Erase drawings',         ariaLabel: 'Erase drawings' },
    { id: 'select', Icon: IconSelect, label: 'Select',  tooltip: 'Select / Move',          ariaLabel: 'Select or move PDF / screenshot' },
];

const COLORS = ['#0F172A', '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#F97316', '#FFFFFF'];

const WIDTHS = [2, 4, 8, 14];

export default function ToolPalette({ tool, setTool, color, setColor, strokeWidth, setStrokeWidth, onUndo, onClear, canClear, isHost = false, onOpenPdfClick, onPasteImage, onClearPhotos, photosCount = 0, pdfPage, pdfTotalPages, onPrevPdfPage, onNextPdfPage, bgScale, onBgZoomIn, onBgZoomOut, onBgReset }) {
    return (
        <div style={{
            width: 'var(--tool-panel-w)',
            minWidth: 'var(--tool-panel-w)',
            background: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '14px 8px', gap: 6, overflowY: 'auto', overflowX: 'hidden',
            boxShadow: 'var(--shadow-sm)',
            zIndex: 50,
            gridArea: 'tools',
        }}>
            {/* Tool buttons */}
            {TOOLS.map(t => {
                const Icon = t.Icon;
                return (
                    <button key={t.id}
                        className={`btn-icon ${tool === t.id ? 'active' : ''}`}
                        title={t.tooltip}
                        aria-label={t.ariaLabel}
                        onClick={() => setTool(t.id)}
                        style={{
                            width: 44, height: 48, borderRadius: 'var(--radius-sm)',
                            background: tool === t.id ? 'var(--color-accent-soft)' : 'transparent',
                            color: tool === t.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                            boxShadow: tool === t.id ? '0 0 0 2px var(--color-accent-ring)' : 'none',
                            transition: 'all var(--transition-fast)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2
                        }}>
                        <Icon size={20} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 500, letterSpacing: '0.01em', lineHeight: 1 }}>{t.label}</span>
                    </button>
                );
            })}

            {/* Divider */}
            <div style={{ width: 32, height: 1, background: 'var(--color-border)', margin: '4px 0' }} />

            {/* Color palette */}
            {COLORS.map(c => (
                <button key={c} title={c}
                    onClick={() => { setColor(c); setTool('pen'); }}
                    style={{
                        width: 22, height: 22, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                        outline: color === c ? '2px solid var(--color-accent)' : c === '#FFFFFF' ? '1.5px solid var(--color-border)' : '2px solid transparent',
                        outlineOffset: 2,
                        transition: 'transform var(--transition-fast)',
                        transform: color === c ? 'scale(1.2)' : 'scale(1)',
                    }} />
            ))}

            {/* Divider */}
            <div style={{ width: 32, height: 1, background: 'var(--color-border)', margin: '4px 0' }} />

            {/* Stroke widths */}
            {WIDTHS.map(w => (
                <button key={w} title={`${w}px`}
                    onClick={() => setStrokeWidth(w)}
                    style={{
                        width: 38, height: 28, borderRadius: 'var(--radius-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: strokeWidth === w ? 'var(--color-accent-soft)' : 'transparent',
                        border: 'none', cursor: 'pointer',
                        outline: strokeWidth === w ? '2px solid var(--color-accent-ring)' : 'none',
                        transition: 'all var(--transition-fast)',
                    }}>
                    <div style={{ width: w === 2 ? 14 : w === 4 ? 18 : w === 8 ? 24 : 30, height: w, borderRadius: w, background: strokeWidth === w ? 'var(--color-accent)' : 'var(--color-text-secondary)' }} />
                </button>
            ))}

            {/* Divider */}
            <div style={{ width: 32, height: 1, background: 'var(--color-border)', margin: '4px 0' }} />

            {/* Insert: PDF & paste image (host only) */}
            {(isHost && (onOpenPdfClick || onPasteImage)) && (
                <>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)', fontWeight: 600, marginTop: 4 }}>Insert</div>
                    {onOpenPdfClick && (
                        <button className="btn-icon" title="Open PDF" onClick={onOpenPdfClick}
                            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconPdf size={20} />
                        </button>
                    )}
                    {onPasteImage && (
                        <button className="btn-icon" title="Paste image (screenshot)" onClick={onPasteImage}
                            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconImage size={20} />
                        </button>
                    )}
                    {photosCount > 0 && onClearPhotos && (
                        <button className="btn-icon" title="Remove all photos / screenshots from board" aria-label="Remove all photos from board" onClick={onClearPhotos}
                            style={{ width: 40, height: 40, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconImageOff size={20} />
                        </button>
                    )}

                    {/* Photos move/resize (eraser does not touch photos) */}
                    {photosCount > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 2, flexShrink: 0 }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)' }}>Move: Select tool</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                <button className="btn-icon" title="Zoom out (-)" onClick={onBgZoomOut}
                                    style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <IconMinus size={16} />
                                </button>
                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', minWidth: 48, textAlign: 'center' }}>
                                    {Math.round((bgScale || 1) * 100)}%
                                </span>
                                <button className="btn-icon" title="Zoom in (+)" onClick={onBgZoomIn}
                                    style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <IconPlus size={16} />
                                </button>
                            </div>
                            <button className="btn-icon" title="Reset background position/size" onClick={onBgReset}
                                style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconSync size={16} />
                            </button>
                        </div>
                    )}

                    {/* PDF page: host can change page, participants see read-only */}
                    {pdfTotalPages >= 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)' }}>PDF page</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                {isHost && onPrevPdfPage && (
                                    <button className="btn-icon" title="Previous page" onClick={onPrevPdfPage} disabled={pdfPage <= 1}
                                        style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: pdfPage <= 1 ? 0.5 : 1 }}>
                                        <IconArrowLeft size={16} />
                                    </button>
                                )}
                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', minWidth: 48, textAlign: 'center' }}>
                                    {pdfPage} / {pdfTotalPages}
                                </span>
                                {isHost && onNextPdfPage && (
                                    <button className="btn-icon" title="Next page" onClick={onNextPdfPage} disabled={pdfPage >= pdfTotalPages}
                                        style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: pdfPage >= pdfTotalPages ? 0.5 : 1 }}>
                                        <IconArrowRight size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                    <div style={{ width: 32, height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
                </>
            )}
            {/* Read-only PDF page info for participants (zoom/move controls are host-only) */}
            {!isHost && (photosCount > 0 || pdfTotalPages >= 1) && (
                <>
                    {pdfTotalPages >= 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)' }}>PDF page</div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>{pdfPage} / {pdfTotalPages}</span>
                        </div>
                    )}
                    <div style={{ width: 32, height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
                </>
            )}

            {/* Undo */}
            <button className="btn-icon" title="Undo last drawing (Ctrl+Z)" aria-label="Undo last drawing" onClick={onUndo} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconUndo size={20} /></button>

            {/* Clear (host only) */}
            {canClear && (
                <button className="btn-icon" title="Clear all drawings from board" aria-label="Clear all drawings from board" onClick={onClear}
                    style={{ width: 40, height: 40, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconTrash size={20} /></button>
            )}
        </div>
    );
}
