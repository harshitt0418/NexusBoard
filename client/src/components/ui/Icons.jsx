/**
 * Shared SVG icons — use currentColor so they inherit text/color from parent.
 * All accept optional: size (number, default 20), className, style.
 */
const defaultSize = 20;

function IconWrapper({ size = defaultSize, className, style, children, viewBox = '0 0 24 24' }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox={viewBox}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            style={{ flexShrink: 0, ...style }}
            aria-hidden
        >
            {children}
        </svg>
    );
}

export function IconClose({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M18 6L6 18M6 6l12 12" />
        </IconWrapper>
    );
}

export function IconLock({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
        </IconWrapper>
    );
}

export function IconUnlock({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 019.9-1" />
        </IconWrapper>
    );
}

export function IconCheck({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <polyline points="20 6 9 17 4 12" />
        </IconWrapper>
    );
}

export function IconCamera({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
        </IconWrapper>
    );
}

export function IconCameraOff({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M21 21H3a2 2 0 01-2-2V8a2 2 0 012-2h3m3-3h6l2 3h4a2 2 0 012 2v9.34m-7.72-2.06a4 4 0 11-5.56-5.56" />
        </IconWrapper>
    );
}

export function IconMic({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
        </IconWrapper>
    );
}

export function IconMicOff({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
            <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
        </IconWrapper>
    );
}

export function IconPeople({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </IconWrapper>
    );
}

export function IconChat({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </IconWrapper>
    );
}

export function IconLogOut({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </IconWrapper>
    );
}

export function IconCrown({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
        </IconWrapper>
    );
}

export function IconPen({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M12 19l7-7-3-3-7 7-4 1 1-4z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        </IconWrapper>
    );
}

export function IconLogo({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style} viewBox="0 0 24 24">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor" stroke="none" />
        </IconWrapper>
    );
}

export function IconFocus({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <rect x="2" y="2" width="8" height="8" rx="1" />
            <rect x="14" y="2" width="8" height="8" rx="1" />
            <rect x="2" y="14" width="8" height="8" rx="1" />
            <rect x="14" y="14" width="8" height="8" rx="1" />
        </IconWrapper>
    );
}

export function IconFocusExit({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <rect x="4" y="4" width="16" height="16" rx="2" />
        </IconWrapper>
    );
}

export function IconEraser({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M20 20H7L3 16 13 6l4 4-6 10" />
        </IconWrapper>
    );
}

export function IconSelect({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M3 3l7 7m0 0l4-4m-4 4v10l4-4" />
            <rect x="14" y="6" width="6" height="6" rx="1" />
        </IconWrapper>
    );
}

export function IconUndo({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
        </IconWrapper>
    );
}

export function IconTrash({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3-3V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
        </IconWrapper>
    );
}

export function IconInfo({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </IconWrapper>
    );
}

export function IconWarning({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </IconWrapper>
    );
}

export function IconSend({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </IconWrapper>
    );
}

export function IconArrowLeft({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
        </IconWrapper>
    );
}

export function IconArrowRight({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
        </IconWrapper>
    );
}

export function IconLoader({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
        </IconWrapper>
    );
}

export function IconLightbulb({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M9 18h6M10 22h4M15 8a3 3 0 10-4-2.83 3 3 0 002 5.66 3 3 0 013 .17 3 3 0 00.83-5.59" />
            <path d="M12 2v1" />
        </IconWrapper>
    );
}

export function IconPlay({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />
        </IconWrapper>
    );
}

export function IconEye({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </IconWrapper>
    );
}

export function IconPalette({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <circle cx="13.5" cy="6.5" r="0.5" />
            <circle cx="17.5" cy="10.5" r="0.5" />
            <circle cx="8.5" cy="7.5" r="0.5" />
            <circle cx="6.5" cy="12.5" r="0.5" />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.75-.14 2.54-.4" />
        </IconWrapper>
    );
}

export function IconVideo({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </IconWrapper>
    );
}

export function IconShield({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </IconWrapper>
    );
}

export function IconZap({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </IconWrapper>
    );
}

export function IconSmartphone({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
        </IconWrapper>
    );
}

export function IconSync({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </IconWrapper>
    );
}

export function IconRocket({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
            <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </IconWrapper>
    );
}

export function IconLink({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </IconWrapper>
    );
}

export function IconHome({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </IconWrapper>
    );
}

export function IconStar({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" stroke="none" />
        </IconWrapper>
    );
}

export function IconCopy({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </IconWrapper>
    );
}

export function IconPdf({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
        </IconWrapper>
    );
}

export function IconImage({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
        </IconWrapper>
    );
}

export function IconImageOff({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <path d="M21 3v4M3 3l4 4M16 16l4 4M21 7l-4 4" />
        </IconWrapper>
    );
}

export function IconPlus({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </IconWrapper>
    );
}

export function IconMinus({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <line x1="5" y1="12" x2="19" y2="12" />
        </IconWrapper>
    );
}

export function IconUser({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </IconWrapper>
    );
}

export function IconMail({ size, className, style }) {
    return (
        <IconWrapper size={size} className={className} style={style}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
        </IconWrapper>
    );
}
