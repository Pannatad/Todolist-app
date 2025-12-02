import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const TaskModal = ({ isOpen, onClose, onSave, initialData, mode = 'create' }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'Medium',
        difficulty: 'Medium',
        subtasks: []
    });
    const [newSubtask, setNewSubtask] = useState('');

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title || '',
                description: initialData.description || '',
                priority: initialData.priority || 'Medium',
                difficulty: initialData.difficulty || 'Medium',
                subtasks: initialData.subtasks || []
            });
        } else {
            setFormData({
                title: '',
                description: '',
                priority: 'Medium',
                difficulty: 'Medium',
                subtasks: []
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

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

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-void-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-sage-200 dark:border-white/10 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-sage-100 dark:border-white/5 shrink-0">
                    <h3 className="text-xl font-bold text-sage-800 dark:text-bone-100">
                        {mode === 'create' ? 'Add New Task' : 'Edit Task'}
                    </h3>
                    <button onClick={onClose} className="text-sage-400 hover:text-sage-600 dark:text-bone-400 dark:hover:text-bone-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-sage-700 dark:text-bone-200 mb-1">Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 focus:ring-2 focus:ring-sage-500 dark:focus:ring-magma-500 text-sage-900 dark:text-bone-100"
                            placeholder="Task title"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-sage-700 dark:text-bone-200 mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 focus:ring-2 focus:ring-sage-500 dark:focus:ring-magma-500 text-sage-900 dark:text-bone-100 resize-none h-24"
                            placeholder="Task description"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-sage-700 dark:text-bone-200 mb-1">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 focus:ring-2 focus:ring-sage-500 dark:focus:ring-magma-500 text-sage-900 dark:text-bone-100"
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-sage-700 dark:text-bone-200 mb-1">Difficulty</label>
                            <select
                                value={formData.difficulty}
                                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 focus:ring-2 focus:ring-sage-500 dark:focus:ring-magma-500 text-sage-900 dark:text-bone-100"
                            >
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                            </select>
                        </div>
                    </div>

                    {/* Subtasks Section */}
                    <div>
                        <label className="block text-sm font-medium text-sage-700 dark:text-bone-200 mb-2">Subtasks</label>

                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={newSubtask}
                                onChange={(e) => setNewSubtask(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addSubtask(e)}
                                className="flex-1 px-4 py-2 rounded-lg bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 focus:ring-2 focus:ring-sage-500 dark:focus:ring-magma-500 text-sage-900 dark:text-bone-100 text-sm"
                                placeholder="Add a subtask..."
                            />
                            <button
                                type="button"
                                onClick={addSubtask}
                                className="px-3 py-2 rounded-lg bg-sage-100 dark:bg-void-700 text-sage-700 dark:text-bone-200 hover:bg-sage-200 dark:hover:bg-void-600 transition-colors text-sm font-medium"
                            >
                                Add
                            </button>
                        </div>

                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {formData.subtasks.map(subtask => (
                                <div key={subtask.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-sage-50 dark:hover:bg-void-800/50 group">
                                    <input
                                        type="checkbox"
                                        checked={subtask.completed}
                                        onChange={() => toggleSubtask(subtask.id)}
                                        className="w-4 h-4 rounded border-sage-300 text-sage-600 focus:ring-sage-500 dark:bg-void-700 dark:border-white/10"
                                    />
                                    <span className={`flex-1 text-sm ${subtask.completed ? 'text-sage-400 dark:text-bone-500 line-through' : 'text-sage-700 dark:text-bone-200'}`}>
                                        {subtask.title}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => deleteSubtask(subtask.id)}
                                        className="opacity-0 group-hover:opacity-100 text-sage-400 hover:text-red-500 transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {formData.subtasks.length === 0 && (
                                <p className="text-xs text-sage-400 dark:text-bone-500 italic text-center py-2">
                                    No subtasks yet
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-sage-100 dark:border-white/5 shrink-0 flex gap-3 bg-white dark:bg-void-900">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 rounded-lg border border-sage-200 dark:border-white/10 text-sage-600 dark:text-bone-300 hover:bg-sage-50 dark:hover:bg-void-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="flex-1 px-4 py-2 rounded-lg bg-sage-600 dark:bg-magma-600 text-white font-medium hover:bg-sage-700 dark:hover:bg-magma-700 transition-colors"
                    >
                        {mode === 'create' ? 'Create Task' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskModal;
