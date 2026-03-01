const TOOLS = [
    { id: 'pen', icon: '✏️', label: 'Pen' },
    { id: 'eraser', icon: '◻', label: 'Eraser' },
    { id: 'select', icon: '⊹', label: 'Select' },
];

const COLORS = ['#0F172A', '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#F97316', '#FFFFFF'];

const WIDTHS = [2, 4, 8, 14];

export default function ToolPalette({ tool, setTool, color, setColor, strokeWidth, setStrokeWidth, onUndo, onClear, canClear }) {
    return (
        <div style={{
            width: 'var(--tool-panel-w)',
            background: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '14px 0', gap: 6, overflowY: 'auto',
            boxShadow: 'var(--shadow-sm)',
            zIndex: 50,
            gridArea: 'tools',
        }}>
            {/* Tool buttons */}
            {TOOLS.map(t => (
                <button key={t.id}
                    className={`btn-icon ${tool === t.id ? 'active' : ''}`}
                    title={t.label}
                    onClick={() => setTool(t.id)}
                    style={{
                        width: 40, height: 40, fontSize: '1.1rem', borderRadius: 'var(--radius-sm)',
                        background: tool === t.id ? 'var(--color-accent-soft)' : 'transparent',
                        color: tool === t.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                        boxShadow: tool === t.id ? '0 0 0 2px var(--color-accent-ring)' : 'none',
                        transition: 'all var(--transition-fast)'
                    }}>
                    {t.icon}
                </button>
            ))}

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

            {/* Undo */}
            <button className="btn-icon" title="Undo (Ctrl+Z)" onClick={onUndo} style={{ width: 40, height: 40, fontSize: '1rem' }}>↩</button>

            {/* Clear (host only) */}
            {canClear && (
                <button className="btn-icon" title="Clear board" onClick={onClear}
                    style={{ width: 40, height: 40, fontSize: '0.95rem', color: 'var(--color-danger)' }}>🗑</button>
            )}
        </div>
    );
}
