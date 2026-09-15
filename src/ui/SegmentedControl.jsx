export const SegmentedControl = ({
  items,
  value,
  onChange,
  ariaLabel = 'View',
  className = '',
}) => (
  <div className={`ui-segmented ${className}`.trim()} role="tablist" aria-label={ariaLabel} aria-orientation="horizontal">
    {items.map((item, index) => {
      const Icon = item.icon;
      const active = item.id === value;

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
          {Icon && <Icon className="ui-segmented__icon" size={18} aria-hidden="true" />}
          <span className="ui-segmented__label">{item.label}</span>
        </button>
      );
    })}
  </div>
);

export default SegmentedControl;
