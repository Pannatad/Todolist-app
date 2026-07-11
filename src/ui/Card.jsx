export const Card = ({ className = '', children, ...props }) => (
  <section className={`ui-card ${className}`.trim()} {...props}>
    {children}
  </section>
);

export default Card;
