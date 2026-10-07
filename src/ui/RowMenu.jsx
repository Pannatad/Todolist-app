import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { BarButton } from './PageHeader';

/**
 * Trailing "…" button on a list row that opens a small iOS menu of actions.
 * With variant="bar" the trigger is a primary bar button showing `icon`;
 * variant="plain" uses a plain bar button.
 */
export const RowMenu = ({ label, items = [], disabled = false, variant = 'row', icon = null }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePress = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className={`row-menu row-menu--${variant}`} ref={wrapRef}>
      {variant !== 'row' ? (
        <BarButton
          icon={icon || MoreHorizontal}
          tone={variant === 'bar' ? 'primary' : 'plain'}
          label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((value) => !value)}
        />
      ) : (
        <button
          type="button"
          className="row-menu__trigger"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((value) => !value)}
        >
          <MoreHorizontal size={19} aria-hidden="true" />
        </button>
      )}
      {open && (
        <div className="ios-menu row-menu__menu" role="menu" aria-label={label}>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={item.destructive ? 'danger' : undefined}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.label}
                {Icon && <Icon size={17} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RowMenu;
