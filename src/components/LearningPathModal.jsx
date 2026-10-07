/* eslint-disable react-refresh/only-export-components */
import React, { useState } from 'react';
import { Sheet } from '../ui';

const SWATCH_HEX = {
    purple: '#7c3aed',
    blue: '#0284c7',
    teal: '#0f766e',
    emerald: '#059669',
    amber: '#d97706',
    pink: '#db2777',
    red: '#e11d48',
    indigo: '#4f46e5',
};

const COLOR_OPTIONS = [
    { name: 'purple', gradient: 'from-violet-500 to-indigo-500', bg: 'bg-violet-500', soft: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    { name: 'blue', gradient: 'from-sky-500 to-blue-500', bg: 'bg-sky-500', soft: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    { name: 'teal', gradient: 'from-teal-500 to-cyan-500', bg: 'bg-teal-500', soft: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    { name: 'emerald', gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500', soft: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    { name: 'amber', gradient: 'from-amber-400 to-orange-500', bg: 'bg-amber-500', soft: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    { name: 'pink', gradient: 'from-pink-500 to-rose-500', bg: 'bg-pink-500', soft: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
    { name: 'red', gradient: 'from-rose-500 to-red-500', bg: 'bg-rose-500', soft: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    { name: 'indigo', gradient: 'from-indigo-500 to-slate-600', bg: 'bg-indigo-500', soft: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
];

const LearningPathModal = ({ isOpen, onClose, onSave, path = null, existingCategories = [] }) => {
    const [name, setName] = useState(path?.name || '');
    const [description, setDescription] = useState(path?.description || '');
    const [icon, setIcon] = useState(path?.icon || '📚');
    const [color, setColor] = useState(path?.color || 'purple');
    const [category, setCategory] = useState(path?.category || '');
    const [targetDate, setTargetDate] = useState(path?.target_completion_date || '');

    // Reset form when path prop changes
    React.useEffect(() => {
        if (isOpen) {
            setName(path?.name || '');
            setDescription(path?.description || '');
            setIcon(path?.icon || '📚');
            setColor(path?.color || 'purple');
            setCategory(path?.category || '');
            setTargetDate(path?.target_completion_date || '');
        }
    }, [path, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        onSave({
            id: path?.id,
            name: name.trim(),
            description: description.trim(),
            icon,
            color,
            category: category.trim(),
            target_completion_date: targetDate || null,
        });

        onClose();
    };

    return (
        <Sheet open={isOpen} onClose={onClose} title={path ? 'Edit Path' : 'New Path'} className="form-sheet">
            <form onSubmit={handleSubmit} className="form-stack">
                <div className="form-group">
                    <label className="form-field">
                        <span className="sr-only">Path name</span>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Name"
                            required
                        />
                    </label>
                    <label className="form-field form-field--value">
                        <span className="form-field__label">Category</span>
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            list="learning-path-categories"
                            placeholder="None"
                        />
                        <datalist id="learning-path-categories">
                            {existingCategories.map((item) => <option key={item} value={item} />)}
                        </datalist>
                    </label>
                    <label className="form-field form-field--value">
                        <span className="form-field__label">Finish by</span>
                        <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
                    </label>
                </div>

                <p className="form-section-label">Color</p>
                <div className="form-group">
                    <div className="form-swatches" role="radiogroup" aria-label="Color">
                        {COLOR_OPTIONS.map((colorOption) => (
                            <button
                                key={colorOption.name}
                                type="button"
                                role="radio"
                                aria-checked={color === colorOption.name}
                                aria-label={colorOption.name}
                                onClick={() => setColor(colorOption.name)}
                                className={`form-swatch${color === colorOption.name ? ' is-selected' : ''}`}
                                style={{ '--swatch': SWATCH_HEX[colorOption.name] }}
                            />
                        ))}
                    </div>
                </div>

                <p className="form-section-label">Description</p>
                <div className="form-group">
                    <label className="form-field form-field--stacked">
                        <span className="sr-only">Description</span>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What will you learn?"
                            rows={3}
                        />
                    </label>
                </div>

                <button type="submit" className="ui-button ui-button--accent form-submit">
                    {path ? 'Save' : 'Create Path'}
                </button>
            </form>
        </Sheet>
    );
};

export default LearningPathModal;
export { COLOR_OPTIONS, SWATCH_HEX };
