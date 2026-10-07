import { useLayoutEffect, useRef, useState } from 'react';

/**
 * iOS segmented control: a gray track with a raised thumb that slides to the
 * selected segment. Segments are text-only, like UISegmentedControl.
 */
export const SegmentedControl = ({
  items,
  value,
  onChange,
  ariaLabel = 'View',
  className = '',
  withIcons = false,
}) => {
  const trackRef = useRef(null);
  const [thumb, setThumb] = useState(null);
  const activeIndex = Math.max(0, items.findIndex((item) => item.id === value));

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const measure = () => {
      const segment = track.querySelectorAll('[role="tab"]')[activeIndex];
      if (!segment) return;
      setThumb((current) => {
        const next = { left: segment.offsetLeft, width: segment.offsetWidth };
        return current && current.left === next.left && current.width === next.width ? current : next;
      });
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [activeIndex, items.length]);

  return (
    <div
      ref={trackRef}
      className={`ui-segmented ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
    >
      {thumb && (
        <span
          className="ui-segmented__thumb"
          aria-hidden="true"
          style={{ width: thumb.width, transform: `translate3d(${thumb.left}px, 0, 0)` }}
        />
      )}
      {items.map((item, index) => {
        const Icon = item.icon;
        const active = index === activeIndex;

        const moveFocus = (event) => {
          const lastIndex = items.length - 1;
          let nextIndex = null;
          if (event.key === 'ArrowRight') nextIndex = index === lastIndex ? 0 : index + 1;
          if (event.key === 'ArrowLeft') nextIndex = index === 0 ? lastIndex : index - 1;
          if (event.key === 'Home') nextIndex = 0;
          if (event.key === 'End') nextIndex = lastIndex;
          if (nextIndex === null) return;
          event.preventDefault();
          onChange(items[nextIndex].id);
          event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')[nextIndex]?.focus();
        };

        return (
          <button
            key={item.id}
            type="button"
            className={`ui-segmented__item${active ? ' is-active' : ''}`}
            role="tab"
            aria-selected={active}
            aria-controls={item.controls}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={moveFocus}
          >
            {withIcons && Icon && <Icon className="ui-segmented__icon" size={16} aria-hidden="true" />}
            <span className="ui-segmented__label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
