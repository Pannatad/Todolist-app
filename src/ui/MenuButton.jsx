import { Fragment, useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { BarButton } from './PageHeader';

/**
 * Bar button that opens an iOS pull-down menu. Sections hold radio-style
 * items; the selected item shows a leading checkmark.
 */
export const MenuButton = ({ icon, label, sections = [], active = false, buttonClassName = '', align = 'right' }) => {
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
    <div className="menu-button" ref={wrapRef}>
      <BarButton
        icon={icon}
        label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${active ? 'is-active' : ''} ${buttonClassName}`.trim()}
        onClick={() => setOpen((value) => !value)}
      />
      {open && (
        <div className={`ios-menu menu-button__menu menu-button__menu--${align}`} role="menu" aria-label={label}>
          {sections.map((section, index) => (
            <Fragment key={section.title || index}>
              {index > 0 && <span className="ios-menu__divider" aria-hidden="true" />}
              {section.title && <p className="ios-menu__title">{section.title}</p>}
              {section.items.map((item) => {
                const checkable = item.checked !== undefined;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role={checkable ? 'menuitemradio' : 'menuitem'}
                    aria-checked={checkable ? Boolean(item.checked) : undefined}
                    disabled={item.disabled}
                    className={`ios-menu__item${checkable ? ' ios-menu__item--check' : ''}${item.destructive ? ' is-destructive' : ''}`}
                    onClick={() => {
                      item.onSelect();
                      setOpen(false);
                    }}
                  >
                    {checkable && (
                      <span className="ios-menu__check" aria-hidden="true">
                        {item.checked && <Check size={16} strokeWidth={2.6} />}
                      </span>
                    )}
                    <span className="ios-menu__label">{item.label}</span>
                    {Icon && <Icon size={17} aria-hidden="true" className="ios-menu__icon" />}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuButton;
