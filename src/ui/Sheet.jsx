import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.6; // px per ms
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * iOS-style sheet on a native <dialog>: slides up from the bottom edge on phones
 * (form sheet on wider screens), animates out on close, and can be dragged down
 * by its grabber or header to dismiss.
 */
export const Sheet = ({ open, onClose, title, description, children, className = '', actions = null }) => {
  // While the sheet animates out, keep showing what it showed when open:
  // callers usually clear the data that fills it at the same moment.
  const [shown, setShown] = useState({ title, description, children, actions });
  if (open && (shown.title !== title || shown.description !== description || shown.children !== children || shown.actions !== actions)) {
    setShown({ title, description, children, actions });
  }
  const view = open ? { title, description, children, actions } : shown;
  const dialogRef = useRef(null);
  const surfaceRef = useRef(null);
  const dragRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    if (open) {
      delete dialog.dataset.closing;
      if (!dialog.open) dialog.showModal();
      return undefined;
    }

    if (!dialog.open) return undefined;
    if (reducedMotion()) {
      dialog.close();
      return undefined;
    }

    // Play the exit animation before removing the dialog from the top layer.
    dialog.dataset.closing = 'true';
    const finish = () => {
      delete dialog.dataset.closing;
      if (surfaceRef.current) surfaceRef.current.style.transform = '';
      if (dialog.open) dialog.close();
    };
    const timer = window.setTimeout(finish, 320);
    return () => window.clearTimeout(timer);
  }, [open]);

  const requestClose = () => onCloseRef.current?.();

  const startDrag = (event) => {
    if (event.button !== 0 || event.target.closest('button, a, input, textarea, select')) return;
    const surface = surfaceRef.current;
    if (!surface) return;
    dragRef.current = { startY: event.clientY, lastY: event.clientY, lastTime: performance.now(), velocity: 0 };
    try {
      surface.setPointerCapture?.(event.pointerId);
    } catch {
      // The pointer is already gone (e.g. a synthetic event); dragging still works without capture.
    }
    surface.dataset.dragging = 'true';
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    const surface = surfaceRef.current;
    if (!drag || !surface) return;
    const now = performance.now();
    const delta = event.clientY - drag.startY;
    drag.velocity = (event.clientY - drag.lastY) / Math.max(1, now - drag.lastTime);
    drag.lastY = event.clientY;
    drag.lastTime = now;
    // Resist upward drags like a rubber band; follow the finger downward.
    const offset = delta > 0 ? delta : -Math.sqrt(-delta) * 2;
    surface.style.transform = `translate3d(0, ${offset}px, 0)`;
  };

  const endDrag = () => {
    const drag = dragRef.current;
    const surface = surfaceRef.current;
    dragRef.current = null;
    if (!drag || !surface) return;
    delete surface.dataset.dragging;
    const distance = drag.lastY - drag.startY;
    if (distance > DISMISS_DISTANCE || (distance > 24 && drag.velocity > DISMISS_VELOCITY)) {
      surface.dataset.flick = 'true';
      surface.style.transform = 'translate3d(0, 100%, 0)';
      window.setTimeout(() => {
        if (surface) {
          delete surface.dataset.flick;
          surface.style.transform = '';
        }
        dialogRef.current?.close();
        requestClose();
      }, 260);
      return;
    }
    surface.style.transform = '';
  };

  return (
    <dialog
      ref={dialogRef}
      className={`ui-sheet ${className}`.trim()}
      aria-labelledby={titleId}
      aria-describedby={view.description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={() => {
        // Escape or a programmatic close while the parent still thinks it is open.
        if (open) requestClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) requestClose();
      }}
    >
      <div
        ref={surfaceRef}
        className="ui-sheet__surface"
        onPointerDown={(event) => {
          if (event.target.closest('.ui-sheet__drag-zone')) startDrag(event);
        }}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="ui-sheet__drag-zone">
          <span className="ui-sheet__grabber" aria-hidden="true" />
          <header className="ui-sheet__header">
            <div className="ui-sheet__heading">
              <h2 id={titleId} className="ui-sheet__title">{view.title}</h2>
              {view.description && <p id={descriptionId} className="ui-sheet__description">{view.description}</p>}
            </div>
            <div className="ui-sheet__actions">
              {view.actions}
              <button type="button" className="ui-sheet__close" onClick={requestClose} aria-label={`Close ${view.title}`}>
                <X size={17} strokeWidth={2.4} aria-hidden="true" />
              </button>
            </div>
          </header>
        </div>
        <div className="ui-sheet__body">{view.children}</div>
      </div>
    </dialog>
  );
};

export default Sheet;
