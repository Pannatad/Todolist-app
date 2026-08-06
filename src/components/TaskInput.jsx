import React, { useState } from 'react';
import { Calendar, Plus, Tag } from 'lucide-react';

const TaskInput = ({ onAdd, existingSubjects = [] }) => {
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [deadline, setDeadline] = useState('');

    const submit = (event) => {
        event.preventDefault();
        if (!title.trim()) return;
        onAdd({ title: title.trim(), deadline: deadline || null, subject: subject.trim() || null });
        setTitle('');
        setSubject('');
        setDeadline('');
    };

    return (
        <form onSubmit={submit} className="task-composer" aria-label="Add a task">
            <label className="task-composer-field task-composer-date">
                <span className="sr-only">Due date</span>
                <Calendar size={17} aria-hidden="true" />
                <input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} title="Due date" />
            </label>
            <label className="task-composer-field task-composer-title">
                <span className="sr-only">Task title</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Task title" />
            </label>
            <label className="task-composer-field task-composer-category">
                <Tag size={16} aria-hidden="true" />
                <span className="sr-only">Category</span>
                <input value={subject} onChange={(event) => setSubject(event.target.value)} list="task-categories" placeholder="Category" />
                <datalist id="task-categories">{existingSubjects.map((item) => <option key={item} value={item} />)}</datalist>
            </label>
            <button type="submit" className="task-add-button" disabled={!title.trim()} aria-label="Add task"><Plus size={19} /></button>
        </form>
    );
};

export default TaskInput;
