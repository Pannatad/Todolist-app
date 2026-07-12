import React, { useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { Calendar, Clock, Trash2, X } from 'lucide-react';
import { toast } from '../ui/Toast';
import { confirmAction } from '../utils/confirm';
import { toDateInputValue, toTimeInputValue } from './weeklyPlanUtils';

const TaskEditModal = ({ task, isOpen, onClose, onDelete, onSave }) => {
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        time: '09:00',
        duration: 30,
        subject: '',
        difficulty: 'easy',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    React.useEffect(() => {
        if (!isOpen || !task) return;
        setFormData({
            title: task.title || '',
            date: toDateInputValue(task.deadline),
            time: toTimeInputValue(task.deadline),
            duration: Number(task.estimatedTime ?? task.estimated_time ?? task.duration ?? 30) || 30,
            subject: task.subject || '',
            difficulty: task.difficulty || 'easy',
        });
        setIsSubmitting(false);
    }, [isOpen, task]);

    if (!isOpen || !task) return null;

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!formData.title.trim() || isSubmitting) return;

        const deadline = formData.date
            ? new Date(`${formData.date}T${formData.time || '09:00'}`).toISOString()
            : null;

        setIsSubmitting(true);
        try {
            await onSave?.(task.id, {
                title: formData.title.trim(),
                deadline,
                estimatedTime: Number(formData.duration) || 0,
                estimated_time: Number(formData.duration) || 0,
                subject: formData.subject.trim() || null,
                difficulty: formData.difficulty,
            });
            onClose();
        } catch (error) {
            console.error('Failed to save task:', error);
            toast(error?.message || 'Could not save this task.', { tone: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                onClick={onClose}
            >
                <Motion.div
                    initial={{ scale: 0.94, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.94, y: 20 }}
                    className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="flex items-center justify-between border-b border-slate-100 p-4">
                        <h2 className="text-xl font-bold text-slate-900">Edit Task</h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
                        <div>
                            <label className="mb-1 block text-sm font-bold text-slate-600">Task title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                placeholder="Task title"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-sm font-bold text-slate-600">
                                    <Calendar size={14} className="mr-1 inline" /> Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-bold text-slate-600">
                                    <Clock size={14} className="mr-1 inline" /> Time
                                </label>
                                <input
                                    type="time"
                                    value={formData.time}
                                    onChange={(event) => setFormData({ ...formData, time: event.target.value })}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-sm font-bold text-slate-600">Duration</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.duration}
                                        onChange={(event) => setFormData({ ...formData, duration: parseInt(event.target.value, 10) || 0 })}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    />
                                    <span className="text-sm font-semibold text-slate-500">min</span>
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-bold text-slate-600">Difficulty</label>
                                <select
                                    value={formData.difficulty}
                                    onChange={(event) => setFormData({ ...formData, difficulty: event.target.value })}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-bold text-slate-600">Subject</label>
                            <input
                                type="text"
                                value={formData.subject}
                                onChange={(event) => setFormData({ ...formData, subject: event.target.value })}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                placeholder="Subject"
                            />
                        </div>
                    </form>

                    <div className="flex gap-3 border-t border-slate-100 bg-slate-50 p-4">
                        {onDelete && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirmAction('Delete this task?')) {
                                        onDelete(task.id);
                                        onClose();
                                    }
                                }}
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-bold text-red-500 transition hover:bg-red-50"
                            >
                                <Trash2 size={16} />
                                Delete
                            </button>
                        )}
                        <div className="flex-1" />
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="rounded-lg bg-slate-200 px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!formData.title.trim() || isSubmitting}
                            className={`rounded-lg px-5 py-2 font-bold transition ${formData.title.trim() ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-slate-300 text-slate-500'}`}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </Motion.div>
            </Motion.div>
        </AnimatePresence>
    );
};

export default TaskEditModal;

