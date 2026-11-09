import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message, type = 'error') => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  return { toasts, toast, dismiss };
}

export function ToastList({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[340px]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start justify-between rounded-lg border px-4 py-3 shadow-lg text-sm font-medium ${
            t.type === 'success'
              ? 'bg-emerald-900/40 border-emerald-700/60 text-emerald-100'
              : 'bg-red-950/60 border-red-800/60 text-red-100'
          }`}
        >
          <span>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="ml-3 opacity-70 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  );
}

export default useToast;
