import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const TaskModal = ({ isOpen, onClose, onSave, initialData, mode = 'create' }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'Medium',
        difficulty: 'Medium'
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title || '',
                description: initialData.description || '',
                priority: initialData.priority || 'Medium',
                difficulty: initialData.difficulty || 'Medium'
            });
        } else {
            setFormData({
                title: '',
                description: '',
                priority: 'Medium',
                difficulty: 'Medium'
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-void-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-sage-200 dark:border-white/10">
                <div className="flex justify-between items-center p-6 border-b border-sage-100 dark:border-white/5">
                    <h3 className="text-xl font-bold text-sage-800 dark:text-bone-100">
                        {mode === 'create' ? 'Add New Task' : 'Edit Task'}
                    </h3>
                    <button onClick={onClose} className="text-sage-400 hover:text-sage-600 dark:text-bone-400 dark:hover:text-bone-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg border border-sage-200 dark:border-white/10 text-sage-600 dark:text-bone-300 hover:bg-sage-50 dark:hover:bg-void-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 rounded-lg bg-sage-600 dark:bg-magma-600 text-white font-medium hover:bg-sage-700 dark:hover:bg-magma-700 transition-colors"
                        >
                            {mode === 'create' ? 'Create Task' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskModal;
