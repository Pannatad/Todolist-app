import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, UserRound } from 'lucide-react';
import { useShell } from './shell-context';
import { useMediaQuery } from './useMediaQuery';

/**
 * iOS navigation bar with a large title. The bar stays transparent while the
 * large title is on screen; once the title scrolls beneath it, the bar gains
 * its material and hairline and the compact title fades in.
 *
 * Render it as the first child of a page's root element: the bar is sticky
 * within that element, so the root must span the page's full height.
 */
export const PageHeader = ({ title, eyebrow, subtitle, actions = null, showAccount = true, onBack = null, backLabel = 'Back' }) => {
  const { openAccount, account } = useShell();
  const barRef = useRef(null);
  const titleRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  // With the sidebar (iPad landscape, laptops) the buttons sit on the title's
  // row instead of up in the window corner.
  const actionsBesideTitle = useMediaQuery('(min-width: 64rem)');

  useEffect(() => {
    const heading = titleRef.current;
    const bar = barRef.current;
    if (!heading || !bar || typeof IntersectionObserver === 'undefined') return undefined;

    const barHeight = Math.round(bar.getBoundingClientRect().height);
    const observer = new IntersectionObserver(([entry]) => {
      setCollapsed(!entry.isIntersecting && entry.boundingClientRect.top < barHeight);
    }, { rootMargin: `-${barHeight}px 0px 0px 0px` });

    observer.observe(heading);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={barRef} className="nav-bar" data-collapsed={collapsed ? 'true' : undefined}>
        <div className="nav-bar__inner">
          {onBack && (
            <button type="button" className="nav-bar__back" onClick={onBack}>
              <ChevronLeft size={24} strokeWidth={2.4} aria-hidden="true" />
              <span>{backLabel}</span>
            </button>
          )}
          <span className="nav-bar__title" aria-hidden="true">{title}</span>
          <div className="nav-bar__trailing">
            {!actionsBesideTitle && actions}
            {showAccount && (
              <button
                type="button"
                className="nav-avatar"
                onClick={openAccount}
                aria-label={account?.label || 'Account'}
                title={account?.label || 'Account'}
              >
                {account?.initials
                  ? <span aria-hidden="true">{account.initials}</span>
                  : <UserRound size={18} strokeWidth={2.2} aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </div>
      <header className="large-title">
        {eyebrow && <p className="large-title__eyebrow">{eyebrow}</p>}
        <div className="large-title__row">
          <h1 ref={titleRef} className="large-title__text">{title}</h1>
          {actionsBesideTitle && actions && <div className="large-title__actions">{actions}</div>}
        </div>
        {subtitle && <p className="large-title__subtitle">{subtitle}</p>}
      </header>
    </>
  );
};

/** Circular bar button (iOS 26 style) for navigation-bar actions. */
export const BarButton = ({ icon, label, onClick, tone = 'plain', className = '', ...props }) => {
  const Icon = icon;
  return (
    <button
      type="button"
      className={`bar-button bar-button--${tone} ${className}`.trim()}
      onClick={onClick}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon size={19} strokeWidth={2.3} aria-hidden="true" />
    </button>
  );
};

export default PageHeader;
