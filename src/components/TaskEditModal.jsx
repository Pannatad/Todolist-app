import React, { useState } from 'react';
import { toast } from '../ui/Toast';
import { Sheet } from '../ui';
import { confirmAction } from '../utils/confirm';
import { toDateInputValue, toTimeInputValue } from './weeklyPlanUtils';

const TaskEditModal = ({ task, isOpen, onClose, onDelete, onSave }) => {
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        time: '09:00',
        duration: 30,
        subject: '',
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
        });
        setIsSubmitting(false);
    }, [isOpen, task]);

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
        <Sheet open={isOpen && Boolean(task)} onClose={onClose} title="Edit Task" className="form-sheet">
            <form onSubmit={handleSubmit} className="form-stack">
                <div className="form-group">
                    <label className="form-field">
                        <span className="sr-only">Title</span>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                            placeholder="Title"
                        />
                    </label>
                </div>

                <div className="form-group">
                    <label className="form-field form-field--value">
                        <span className="form-field__label">Date</span>
                        <input type="date" value={formData.date} onChange={(event) => setFormData({ ...formData, date: event.target.value })} />
                    </label>
                    <label className="form-field form-field--value">
                        <span className="form-field__label">Time</span>
                        <input type="time" value={formData.time} onChange={(event) => setFormData({ ...formData, time: event.target.value })} />
                    </label>
                    <label className="form-field form-field--value">
                        <span className="form-field__label">Duration</span>
                        <input
                            type="number"
                            min="0"
                            value={formData.duration}
                            onChange={(event) => setFormData({ ...formData, duration: parseInt(event.target.value, 10) || 0 })}
                        />
                        <span className="form-field__suffix">min</span>
                    </label>
                    <label className="form-field form-field--value">
                        <span className="form-field__label">Category</span>
                        <input
                            type="text"
                            value={formData.subject}
                            onChange={(event) => setFormData({ ...formData, subject: event.target.value })}
                            placeholder="None"
                        />
                    </label>
                </div>

                <button type="submit" disabled={!formData.title.trim() || isSubmitting} className="ui-button ui-button--accent form-submit">
                    {isSubmitting ? 'Saving…' : 'Save'}
                </button>

                {onDelete && (
                    <div className="form-group">
                        <button
                            type="button"
                            onClick={() => {
                                if (confirmAction('Delete this task?')) {
                                    onDelete(task.id);
                                    onClose();
                                }
                            }}
                            disabled={isSubmitting}
                            className="form-field form-option form-option--destructive"
                        >
                            Delete Task
                        </button>
                    </div>
                )}
            </form>
        </Sheet>
    );
};

export default TaskEditModal;
