/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { X, Sun, Pencil, Check } from 'lucide-react';
import { useTask } from '../context/TaskContext';
import { toast } from '../ui/Toast';

const TaskModal = ({ isOpen, onClose, onSave, initialData, mode = 'create' }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'Medium',
        difficulty: 'Medium',
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
            // Reset subtask editing state when modal opens
            setEditingSubtaskId(null);
            setEditingSubtaskTitle('');
            setNewSubtask('');
        }
    }, [isOpen, initialData?.id]);

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
            difficulty: formData.difficulty.toLowerCase(),
            subject: 'Project Task', // Or maybe the project name if we passed it
            estimatedTime: 30 // Default or if we had it
        });

        toast('Task added.', { tone: 'success' });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <div className="bg-white dark:bg-void-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-sage-200 dark:border-white/10 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center px-8 py-6 border-b border-sage-100 dark:border-white/5 shrink-0">
                    <h3 className="text-2xl font-bold text-sage-800 dark:text-bone-100">
                        {mode === 'create' ? 'Add New Task' : 'Edit Task'}
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-sage-100 dark:hover:bg-void-800 text-sage-400 hover:text-sage-600 dark:text-bone-400 dark:hover:text-bone-200 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Add to Today Banner (Only in Edit Mode) */}
                {mode === 'edit' && (
                    <div className="px-8 pt-6">
                        <button
                            onClick={handleAddToToday}
                            className="w-full flex items-center justify-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-2xl text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors font-semibold text-base"
                        >
                            <Sun className="w-5 h-5" />
                            Add to Today's Focus
                        </button>
                    </div>
                )}

                <div className="overflow-y-auto px-8 py-6 space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-sage-700 dark:text-bone-200 mb-2">Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-5 py-3 rounded-xl bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 focus:ring-2 focus:ring-sage-500 dark:focus:ring-magma-500 text-sage-900 dark:text-bone-100 text-base"
                            placeholder="Task title"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-sage-700 dark:text-bone-200 mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-5 py-3 rounded-xl bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 focus:ring-2 focus:ring-sage-500 dark:focus:ring-magma-500 text-sage-900 dark:text-bone-100 resize-none h-28 text-base"
                            placeholder="Task description"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-sage-700 dark:text-bone-200 mb-2">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-5 py-3 rounded-xl bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 focus:ring-2 focus:ring-sage-500 dark:focus:ring-magma-500 text-sage-900 dark:text-bone-100 text-base"
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-sage-700 dark:text-bone-200 mb-2">Difficulty</label>
                            <select
                                value={formData.difficulty}
                                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                                className="w-full px-5 py-3 rounded-xl bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 focus:ring-2 focus:ring-sage-500 dark:focus:ring-magma-500 text-sage-900 dark:text-bone-100 text-base"
                            >
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                            </select>
                        </div>
                    </div>

                    {/* Subtasks Section */}
                    <div className="pt-2">
                        <label className="block text-sm font-semibold text-sage-700 dark:text-bone-200 mb-3">Subtasks</label>

                        <div className="flex gap-3 mb-4">
                            <input
                                type="text"
                                value={newSubtask}
                                onChange={(e) => setNewSubtask(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addSubtask(e)}
                                className="flex-1 px-5 py-3 rounded-xl bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 focus:ring-2 focus:ring-sage-500 dark:focus:ring-magma-500 text-sage-900 dark:text-bone-100 text-base"
                                placeholder="Add a subtask..."
                            />
                            <button
                                type="button"
                                onClick={addSubtask}
                                className="px-5 py-3 rounded-xl bg-sage-100 dark:bg-void-700 text-sage-700 dark:text-bone-200 hover:bg-sage-200 dark:hover:bg-void-600 transition-colors text-base font-semibold"
                            >
                                Add
                            </button>
                        </div>

                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                            {formData.subtasks.map(subtask => (
                                <div key={subtask.id} className="flex items-center gap-4 p-3 rounded-xl bg-sage-50/50 dark:bg-void-800/30 hover:bg-sage-100 dark:hover:bg-void-800/60 transition-colors group border border-sage-100 dark:border-white/5">
                                    <input
                                        type="checkbox"
                                        checked={subtask.completed}
                                        onChange={() => toggleSubtask(subtask.id)}
                                        className="w-5 h-5 rounded-lg border-sage-300 text-sage-600 focus:ring-sage-500 dark:bg-void-700 dark:border-white/10"
                                    />
                                    {editingSubtaskId === subtask.id ? (
                                        <div className="flex-1 flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={editingSubtaskTitle}
                                                onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveSubtaskEdit();
                                                    if (e.key === 'Escape') cancelSubtaskEdit();
                                                }}
                                                autoFocus
                                                className="flex-1 px-2 py-1 text-sm rounded bg-sage-50 dark:bg-void-800 border border-sage-300 dark:border-white/20 focus:ring-2 focus:ring-sage-500 dark:focus:ring-magma-500 text-sage-900 dark:text-bone-100"
                                            />
                                            <button
                                                type="button"
                                                onClick={saveSubtaskEdit}
                                                className="text-emerald-500 hover:text-emerald-600"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={cancelSubtaskEdit}
                                                className="text-sage-400 hover:text-red-500"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span
                                                className={`flex-1 text-sm cursor-pointer ${subtask.completed ? 'text-sage-400 dark:text-bone-500 line-through' : 'text-sage-700 dark:text-bone-200'}`}
                                                onDoubleClick={() => startEditingSubtask(subtask)}
                                                title="Double-click to edit"
                                            >
                                                {subtask.title}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => startEditingSubtask(subtask)}
                                                className="opacity-0 group-hover:opacity-100 text-sage-400 hover:text-sage-600 dark:hover:text-bone-200 transition-all"
                                                title="Edit subtask"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteSubtask(subtask.id)}
                                                className="opacity-0 group-hover:opacity-100 text-sage-400 hover:text-red-500 transition-all"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                            {formData.subtasks.length === 0 && (
                                <p className="text-sm text-sage-400 dark:text-bone-500 italic text-center py-4">
                                    No subtasks yet
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-8 py-6 border-t border-sage-100 dark:border-white/5 shrink-0 flex gap-4 bg-white dark:bg-void-900">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-3.5 rounded-xl border-2 border-sage-200 dark:border-white/10 text-sage-600 dark:text-bone-300 hover:bg-sage-50 dark:hover:bg-void-800 transition-colors font-semibold text-base"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="flex-1 px-6 py-3.5 rounded-xl bg-sage-600 dark:bg-magma-600 text-white font-semibold hover:bg-sage-700 dark:hover:bg-magma-700 transition-colors text-base shadow-lg shadow-sage-600/20 dark:shadow-magma-600/20"
                    >
                        {mode === 'create' ? 'Create Task' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div >
    );
};

export default TaskModal;
