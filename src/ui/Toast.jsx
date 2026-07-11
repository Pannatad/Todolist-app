import { useCallback, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { ToastContext } from './toast-context';

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(({ message, tone = 'neutral', action = null, duration = 5000 }) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, tone, action }]);
    if (duration) window.setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const value = useMemo(() => ({ toast, dismiss }), [dismiss, toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toast-region" aria-live="polite" aria-relevant="additions">
        {toasts.map((item) => {
          const Icon = item.tone === 'error' ? AlertCircle : CheckCircle2;
          return (
            <div key={item.id} className={`ui-toast ui-toast--${item.tone}`} role="status">
              <Icon size={18} aria-hidden="true" />
              <span className="ui-toast__message">{item.message}</span>
              {item.action && (
                <button type="button" className="ui-toast__action" onClick={item.action.onClick}>
                  {item.action.label}
                </button>
              )}
              <button type="button" className="ui-toast__close" onClick={() => dismiss(item.id)} aria-label="Dismiss notification">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
