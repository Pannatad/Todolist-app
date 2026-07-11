export const Chip = ({ children, tone = 'neutral', dot = false, className = '', ...props }) => (
  <span className={`ui-chip ui-chip--${tone} ${className}`.trim()} {...props}>
    {dot && <span className="ui-chip__dot" aria-hidden="true" />}
    {children}
  </span>
);

export default Chip;
