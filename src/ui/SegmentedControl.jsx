export const SegmentedControl = ({
  items,
  value,
  onChange,
  ariaLabel = 'View',
  className = '',
}) => (
  <div className={`ui-segmented ${className}`.trim()} role="tablist" aria-label={ariaLabel}>
    {items.map((item) => {
      const Icon = item.icon;
      const active = item.id === value;

      return (
        <button
          key={item.id}
          type="button"
          className={`ui-segmented__item${active ? ' is-active' : ''}`}
          role="tab"
          aria-selected={active}
          aria-controls={item.controls}
          onClick={() => onChange(item.id)}
        >
          {Icon && <Icon className="ui-segmented__icon" size={18} aria-hidden="true" />}
          <span className="ui-segmented__label">{item.label}</span>
        </button>
      );
    })}
  </div>
);

export default SegmentedControl;
