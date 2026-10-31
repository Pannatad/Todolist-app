import { getKindLabel } from './constants';

// Plain section title with an optional grey count, matching the src/ui section titles.
export const SectionHeading = ({ id, title, count, children }) => (
  <div className="ui-section-title uni-section-head">
    <h2 id={id}>
      {title}
      {count !== undefined && <span className="uni-section-head__count">{count}</span>}
    </h2>
    {children}
  </div>
);

// "● Exam · Linear Algebra": a small colored dot is the only color on the row.
export const KindMeta = ({ kind, detail, dot = true, detailClassName = '' }) => (
  <span className="uni-board-item-meta">
    {dot && <span className={`uni-kind-dot uni-kind--${kind}`} aria-hidden="true" />}
    <span className="uni-board-item-meta__text">
      {getKindLabel(kind)}
      {detail && <> · <span className={detailClassName}>{detail}</span></>}
    </span>
  </span>
);
