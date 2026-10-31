import { getKindLabel } from './constants';

// Section title with a colored icon tile so each block on the overview reads as its own area.
export const SectionHeading = ({ id, icon, title, tone = 'accent', count, children }) => {
  const Icon = icon;
  return (
  <div className="ui-section-title uni-section-head">
    <h2 id={id}>
      <span className={`uni-section-head__icon uni-tone--${tone}`} aria-hidden="true">
        <Icon size={16} strokeWidth={2.3} />
      </span>
      <span className="uni-section-head__title">{title}</span>
      {count !== undefined && <span className="uni-section-head__count">{count}</span>}
    </h2>
    {children}
  </div>
  );
};

export const KindTag = ({ kind }) => (
  <span className={`uni-kind-tag uni-kind--${kind}`}>{getKindLabel(kind)}</span>
);
