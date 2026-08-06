import { Circle } from 'lucide-react';

const timeLabel = (value) => new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
});

const TodayDueTasks = ({ tasks = [], onCompleteTask, onOpenTask }) => {
    if (tasks.length === 0) return null;

    return (
        <section aria-labelledby="today-due-tasks-heading">
            <div className="mb-1 flex items-baseline justify-between">
                <h2 id="today-due-tasks-heading" className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Tasks due today
                </h2>
                <span className="text-xs font-medium text-[var(--color-muted)]">{tasks.length}</span>
            </div>

            <div>
                {tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 border-b border-[var(--color-rule)] py-2.5 last:border-b-0">
                        <button
                            type="button"
                            onClick={() => onCompleteTask(task.id)}
                            aria-label={`Complete ${task.title}`}
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-[var(--color-muted)] transition-colors hover:bg-[var(--color-paper-2)] hover:text-[var(--color-accent)] active:scale-95"
                        >
                            <Circle size={17} aria-hidden="true" />
                        </button>

                        <button
                            type="button"
                            onClick={() => onOpenTask(task)}
                            className="flex min-w-0 flex-1 self-stretch items-center py-2 text-left"
                        >
                            <span className="min-w-0">
                                <span className="block truncate text-[0.95rem] font-semibold text-[var(--color-ink)]">{task.title || 'Untitled task'}</span>
                                {task.subject && <span className="mt-0.5 block truncate text-xs text-[var(--color-muted)]">{task.subject}</span>}
                            </span>
                        </button>

                        <time className="shrink-0 text-xs font-semibold tabular-nums text-[var(--color-muted)]" dateTime={task.deadline}>
                            {timeLabel(task.deadline)}
                        </time>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default TodayDueTasks;
