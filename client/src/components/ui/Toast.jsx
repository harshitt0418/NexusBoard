import { useState, useCallback, createContext, useContext } from 'react';
import { IconCheck, IconClose, IconInfo, IconWarning } from './Icons';

const ToastContext = createContext(null);
let toastId = 0;

const TOAST_ICONS = { success: IconCheck, error: IconClose, info: IconInfo, warning: IconWarning };

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const toast = useCallback((message, type = 'info', duration = 3500) => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }, []);

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="toast-container">
                {toasts.map(t => {
                    const Icon = TOAST_ICONS[t.type];
                    return (
                        <div key={t.id} className={`toast toast-${t.type}`}>
                            {Icon && <span style={{ flexShrink: 0, display: 'inline-flex' }}><Icon size={18} /></span>}
                            <span className="toast-msg">{t.message}</span>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
