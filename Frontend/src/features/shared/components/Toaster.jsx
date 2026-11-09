// Shows the toasts from toastStore. Rendered once in App.jsx.
import { useToastStore } from '../stores/toastStore';

const COLORS = {
  success: 'border-success text-success',
  error: 'border-danger text-danger',
  info: 'border-primary text-primary',
};

export default function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    // end-4 = right in English, left in Persian (RTL)
    <div className="fixed bottom-4 end-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          onClick={() => dismiss(t.id)}
          className={`card cursor-pointer border-s-4 px-4 py-3 text-sm shadow-lg ${COLORS[t.type]}`}
        >
          <span className="text-fg">{t.message}</span>
        </div>
      ))}
    </div>
  );
}