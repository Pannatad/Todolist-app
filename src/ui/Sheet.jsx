import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export const Sheet = ({ open, onClose, title, description, children, className = '' }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={`ui-sheet ${className}`.trim()}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="ui-sheet__surface">
        <header className="ui-sheet__header">
          <div>
            <h2 className="ui-sheet__title">{title}</h2>
            {description && <p className="ui-sheet__description">{description}</p>}
          </div>
          <button type="button" className="ui-icon-button" onClick={onClose} aria-label={`Close ${title}`}>
            <X size={19} aria-hidden="true" />
          </button>
        </header>
        <div className="ui-sheet__body">{children}</div>
      </div>
    </dialog>
  );
};

export default Sheet;
