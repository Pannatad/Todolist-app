import React, { useRef, useState } from 'react';
import { Calendar, Plus, Tag } from 'lucide-react';

/**
 * Reminders-style quick add: one row that reads "New Task". Date and
 * category appear only while the row is in use.
 */
const TaskInput = ({ onAdd, existingSubjects = [] }) => {
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [deadline, setDeadline] = useState('');
    const [active, setActive] = useState(false);
    const formRef = useRef(null);

    const submit = (event) => {
        event.preventDefault();
        if (!title.trim()) return;
        onAdd({ title: title.trim(), deadline: deadline || null, subject: subject.trim() || null });
        setTitle('');
        setSubject('');
        setDeadline('');
    };

    const expanded = active || title || deadline || subject;

    return (
        <form
            ref={formRef}
            onSubmit={submit}
            className={`task-quick-add${expanded ? ' is-expanded' : ''}`}
            aria-label="Add a task"
            onFocus={() => setActive(true)}
            onBlur={(event) => {
                if (!formRef.current?.contains(event.relatedTarget)) setActive(false);
            }}
        >
            <div className="task-quick-add__row">
                <button type="submit" className="task-quick-add__plus" disabled={!title.trim()} aria-label="Add task">
                    <Plus size={18} strokeWidth={2.6} aria-hidden="true" />
                </button>
                <label className="task-quick-add__title">
                    <span className="sr-only">Task title</span>
                    <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="New Task" enterKeyHint="done" />
                </label>
            </div>
            {expanded && (
                <div className="task-quick-add__options">
                    <label className="pill-field">
                        <Calendar size={15} aria-hidden="true" />
                        <span className="sr-only">Due date</span>
                        <input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} aria-label="Due date" />
                    </label>
                    <label className="pill-field">
                        <Tag size={15} aria-hidden="true" />
                        <span className="sr-only">Category</span>
                        <input value={subject} onChange={(event) => setSubject(event.target.value)} list="task-categories" placeholder="Category" />
                        <datalist id="task-categories">{existingSubjects.map((item) => <option key={item} value={item} />)}</datalist>
                    </label>
                </div>
            )}
        </form>
    );
};

export default TaskInput;
