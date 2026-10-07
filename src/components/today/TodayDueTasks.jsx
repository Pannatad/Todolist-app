import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

const timeLabel = (value) => new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
});

/** Reminders-style list: tap the circle to complete, tap the row to open. */
const TodayDueTasks = ({ tasks = [], onCompleteTask, onOpenTask }) => {
    const [completing, setCompleting] = useState(() => new Set());
    const timers = useRef([]);

    useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

    if (tasks.length === 0) return null;

    const complete = (task) => {
        if (completing.has(task.id)) return;
        setCompleting((current) => new Set(current).add(task.id));
        // Let the filled circle register before the row leaves the list.
        timers.current.push(window.setTimeout(() => onCompleteTask(task.id), 420));
    };

    return (
        <section aria-labelledby="today-due-tasks-heading">
            <div className="ui-section-title">
                <h2 id="today-due-tasks-heading">Due Today</h2>
                <span>{tasks.length}</span>
            </div>

            <div className="ui-group">
                {tasks.map((task) => {
                    const done = completing.has(task.id);
                    return (
                        <div key={task.id} className={`today-task${done ? ' is-done' : ''}`}>
                            <button
                                type="button"
                                className="today-task__check"
                                onClick={() => complete(task)}
                                aria-label={`Complete ${task.title}`}
                                aria-pressed={done}
                            >
                                <span>{done && <Check size={14} strokeWidth={3.2} aria-hidden="true" />}</span>
                            </button>
                            <button type="button" className="today-task__body" onClick={() => onOpenTask(task)}>
                                <span className="today-task__title">{task.title || 'Untitled task'}</span>
                                {task.subject && <span className="today-task__subject">{task.subject}</span>}
                            </button>
                            <time className="today-task__time" dateTime={task.deadline}>{timeLabel(task.deadline)}</time>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default TodayDueTasks;
