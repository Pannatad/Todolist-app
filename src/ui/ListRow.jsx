export const ListRow = ({
  icon: Icon,
  title,
  subtitle,
  trailing,
  className = '',
  ...props
}) => (
  <div className={`ui-list-row ${className}`.trim()} {...props}>
    {Icon && (
      <span className="ui-list-row__icon" aria-hidden="true">
        <Icon size={18} />
      </span>
    )}
    <span className="ui-list-row__copy">
      <span className="ui-list-row__title">{title}</span>
      {subtitle && <span className="ui-list-row__subtitle">{subtitle}</span>}
    </span>
    {trailing && <span className="ui-list-row__trailing">{trailing}</span>}
  </div>
);

export default ListRow;
