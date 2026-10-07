/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { useTask } from '../context/TaskContext';
import { toast } from '../ui/Toast';
import { Sheet } from '../ui';

const TaskModal = ({ isOpen, onClose, onSave, initialData, mode = 'create', allowAddToToday = false }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'Medium',
        subtasks: []
    });
    const [newSubtask, setNewSubtask] = useState('');
    const [editingSubtaskId, setEditingSubtaskId] = useState(null);
    const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
    const { addTask: addToGarden } = useTask();

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    title: initialData.title || '',
                    description: initialData.description || '',
                    priority: initialData.priority || 'Medium',
                    subtasks: initialData.subtasks || []
                });
            } else {
                setFormData({
                    title: '',
                    description: '',
                    priority: 'Medium',
                    subtasks: []
                });
            }
            // Reset subtask editing state when modal opens
            setEditingSubtaskId(null);
            setEditingSubtaskTitle('');
            setNewSubtask('');
        }
    }, [isOpen, initialData?.id]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    const addSubtask = (e) => {
        e.preventDefault();
        if (!newSubtask.trim()) return;

        const subtask = {
            id: crypto.randomUUID(),
            title: newSubtask,
            completed: false
        };

        setFormData(prev => ({
            ...prev,
            subtasks: [...prev.subtasks, subtask]
        }));
        setNewSubtask('');
    };

    const toggleSubtask = (subtaskId) => {
        setFormData(prev => ({
            ...prev,
            subtasks: prev.subtasks.map(st =>
                st.id === subtaskId ? { ...st, completed: !st.completed } : st
            )
        }));
    };

    const deleteSubtask = (subtaskId) => {
        setFormData(prev => ({
            ...prev,
            subtasks: prev.subtasks.filter(st => st.id !== subtaskId)
        }));
    };

    const startEditingSubtask = (subtask) => {
        setEditingSubtaskId(subtask.id);
        setEditingSubtaskTitle(subtask.title);
    };

    const saveSubtaskEdit = () => {
        if (!editingSubtaskTitle.trim()) {
            setEditingSubtaskId(null);
            return;
        }
        setFormData(prev => ({
            ...prev,
            subtasks: prev.subtasks.map(st =>
                st.id === editingSubtaskId ? { ...st, title: editingSubtaskTitle.trim() } : st
            )
        }));
        setEditingSubtaskId(null);
        setEditingSubtaskTitle('');
    };

    const cancelSubtaskEdit = () => {
        setEditingSubtaskId(null);
        setEditingSubtaskTitle('');
    };

    const handleAddToToday = async () => {
        if (!formData.title.trim()) return;

        await addToGarden({
            title: formData.title,
            description: formData.description,
            subject: 'Project Task', // Or maybe the project name if we passed it
            estimatedTime: 30 // Default or if we had it
        });

        toast('Task added.', { tone: 'success' });
    };

    return (
        <Sheet open={isOpen} onClose={onClose} title={mode === 'create' ? 'New Task' : 'Edit Task'} className="form-sheet">
            <form onSubmit={handleSubmit} className="form-stack">
                <div className="form-group">
                    <label className="form-field">
                        <span className="sr-only">Title</span>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Title"
                            required
                        />
                    </label>
                    <label className="form-field form-field--stacked">
                        <span className="sr-only">Notes</span>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Notes"
                            rows={3}
                        />
                    </label>
                </div>

                <div className="form-group">
                    <label className="form-field form-field--value">
                        <span className="form-field__label">Priority</span>
                        <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                    </label>
                </div>

                <p className="form-section-label">Subtasks</p>
                <div className="form-group">
                    {formData.subtasks.map((subtask) => (
                        <div key={subtask.id} className="form-field form-subtask">
                            <button
                                type="button"
                                className="task-check form-subtask__check"
                                aria-pressed={subtask.completed}
                                aria-label={subtask.completed ? `Mark ${subtask.title} not done` : `Complete ${subtask.title}`}
                                onClick={() => toggleSubtask(subtask.id)}
                            >
                                <span>{subtask.completed && <Check size={12} strokeWidth={3.2} />}</span>
                            </button>
                            {editingSubtaskId === subtask.id ? (
                                <input
                                    type="text"
                                    value={editingSubtaskTitle}
                                    onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                                    onBlur={saveSubtaskEdit}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            saveSubtaskEdit();
                                        }
                                        if (e.key === 'Escape') cancelSubtaskEdit();
                                    }}
                                    autoFocus
                                    aria-label="Subtask title"
                                />
                            ) : (
                                <button
                                    type="button"
                                    className={`form-subtask__title${subtask.completed ? ' is-done' : ''}`}
                                    onClick={() => startEditingSubtask(subtask)}
                                >
                                    {subtask.title}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => deleteSubtask(subtask.id)}
                                className="form-remove"
                                aria-label={`Delete ${subtask.title}`}
                            >
                                <X size={14} strokeWidth={2.6} />
                            </button>
                        </div>
                    ))}
                    <div className="form-field">
                        <input
                            type="text"
                            value={newSubtask}
                            onChange={(e) => setNewSubtask(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addSubtask(e)}
                            placeholder="Add subtask"
                            aria-label="New subtask"
                        />
                        {newSubtask.trim() && (
                            <button type="button" onClick={addSubtask} className="ui-text-button">Add</button>
                        )}
                    </div>
                </div>

                <button type="submit" className="ui-button ui-button--accent form-submit">
                    {mode === 'create' ? 'Add Task' : 'Save'}
                </button>

                {allowAddToToday && mode === 'edit' && (
                    <div className="form-group">
                        <button type="button" onClick={handleAddToToday} className="form-field form-option form-option--tinted">
                            Add to Tasks
                        </button>
                    </div>
                )}
            </form>
        </Sheet>
    );
};

export default TaskModal;
