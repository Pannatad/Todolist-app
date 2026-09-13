import ItemActions from './ItemActions';

export default function ClassItemActions({ title, onEdit, onDelete, disabled }) {
  return <ItemActions title={title} onEdit={onEdit} onDelete={onDelete} disabled={disabled} />;
}
