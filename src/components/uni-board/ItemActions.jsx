import { Pencil, Trash2 } from 'lucide-react';

export default function ItemActions({ title, onEdit, onDelete, disabled = false }) {
  return <div className="uni-board-item-actions" aria-label={`Actions for ${title}`}>
    <button type="button" className="ui-icon-button" title="Edit" aria-label={`Edit ${title}`} disabled={disabled} onClick={onEdit}><Pencil size={16} aria-hidden="true" /></button>
    <button type="button" className="ui-icon-button uni-board-item-actions__delete" title="Delete" aria-label={`Delete ${title}`} disabled={disabled} onClick={onDelete}><Trash2 size={16} aria-hidden="true" /></button>
  </div>;
}
