import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, Check, Info, LoaderCircle, X } from 'lucide-react';

export type NoticeTone = 'success' | 'error' | 'info';

export function ToastNotice({ message, tone, onDismiss }: { message: string; tone: NoticeTone; onDismiss: () => void }) {
  const Icon = tone === 'success' ? Check : tone === 'error' ? AlertCircle : Info;
  return <div className={`app-toast app-toast-${tone}`} role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'}>
    <Icon size={17} aria-hidden="true"/><span>{message}</span><button type="button" onClick={onDismiss} aria-label="إغلاق الإشعار"><X size={16}/></button>
  </div>;
}

type DialogProps = { title: string; description: string; onClose: () => void; children?: ReactNode };

function useDialogKeys(onClose: () => void, root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const items = [...(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])') ?? [])];
      if (!items.length) return;
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, root]);
}

export function ConfirmDialog({ title, description, confirmLabel, cancelLabel = 'إلغاء', intent = 'danger', onConfirm, onClose }: DialogProps & { confirmLabel: string; cancelLabel?: string; intent?: 'danger' | 'primary'; onConfirm: () => void | Promise<void> }) {
  const root = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useDialogKeys(() => closeRef.current(), root);
  useLayoutEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    root.current?.querySelector<HTMLElement>('[data-dialog-cancel]')?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const submit = async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } };
  return <div className="app-dialog-layer" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section ref={root} className="app-dialog-card" role="alertdialog" aria-modal="true" aria-labelledby="app-dialog-title" aria-describedby="app-dialog-description">
      <button className="app-dialog-close" type="button" disabled={busy} onClick={onClose} aria-label="إغلاق النافذة"><X size={18}/></button>
      <span className="app-dialog-icon"><AlertCircle size={20}/></span><h2 id="app-dialog-title">{title}</h2><p id="app-dialog-description">{description}</p>
      {busy && <span className="app-dialog-progress" role="status"><LoaderCircle size={15}/> جارٍ التنفيذ…</span>}
      <div className="app-dialog-actions"><button className="button outline" type="button" data-dialog-cancel disabled={busy} onClick={onClose}>{cancelLabel}</button><button className={`button ${intent === 'danger' ? 'app-dialog-danger' : 'primary'}`} type="button" disabled={busy} onClick={() => void submit()}>{busy ? <LoaderCircle className="app-dialog-spinner" size={16}/> : null}{confirmLabel}</button></div>
    </section>
  </div>;
}

export function MessageDialog({ title, description, body, onClose }: DialogProps & { body: string }) {
  const root = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useDialogKeys(() => closeRef.current(), root);
  useLayoutEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    root.current?.querySelector<HTMLElement>('button')?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <div className="app-dialog-layer" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={root} className="app-dialog-card app-message-card" role="dialog" aria-modal="true" aria-labelledby="app-message-title" aria-describedby="app-message-description">
      <button className="app-dialog-close" type="button" onClick={onClose} aria-label="إغلاق النافذة"><X size={18}/></button><span className="app-dialog-icon app-info-icon"><Info size={20}/></span><h2 id="app-message-title">{title}</h2><p id="app-message-description">{description}</p><pre className="app-message-body">{body}</pre><div className="app-dialog-actions"><button className="button primary" type="button" onClick={onClose}>إغلاق</button></div>
    </section>
  </div>;
}
