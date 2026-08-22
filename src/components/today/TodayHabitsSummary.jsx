import { Sprout } from 'lucide-react';

const goalLabel = (habit) => {
    if (habit.type === 'time') return 'Wake-up time';
    if (habit.type === 'score') return '1–5 score';
    if (habit.type === 'duration') return `${habit.target || 1} min`;
    if (habit.type === 'count') return `${habit.target || 1} times`;
    return 'Daily';
};

const TodayHabitsSummary = ({ habits = [], completedCount = 0, onComplete }) => (
    <section aria-labelledby="today-habits-heading">
        <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
                <h2 id="today-habits-heading" className="text-base font-semibold tracking-tight text-[var(--color-ink)]">Habits</h2>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">Small actions for today</p>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--color-paper-2)] px-2.5 py-1 text-xs font-semibold tabular-nums text-[var(--color-muted)]">
                {completedCount} of {habits.length}
            </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {habits.map((habit) => (
                <div
                    key={habit.id}
                    role="group"
                    aria-label={habit.name}
                    className={`grid min-h-[84px] min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-xl border px-3 py-3 text-left ${
                        habit.completed
                            ? 'border-[var(--color-success-soft)] bg-[var(--color-success-soft)]'
                            : 'border-[var(--color-rule)] bg-[var(--color-paper-2)]'
                    }`}
                >
                    <button
                        type="button"
                        onClick={() => onComplete(habit)}
                        disabled={habit.completed}
                        aria-label={habit.completed ? `${habit.name} completed` : `Complete ${habit.name}`}
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg transition-colors ${
                        habit.completed
                            ? 'bg-[var(--color-success)] text-white'
                            : 'bg-[var(--color-card-raised)] text-[var(--color-ink)] ring-1 ring-[var(--color-rule)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]'
                    }`}>
                        <Sprout size={19} strokeWidth={2.4} aria-hidden="true" />
                    </button>
                    <span className="min-w-0 overflow-hidden">
                        <span title={habit.name} className={`block break-words text-sm font-semibold leading-5 ${habit.completed ? 'text-[var(--color-muted)]' : 'text-[var(--color-ink)]'}`}>
                            {habit.name}
                        </span>
                        <span className="mt-1 block text-xs text-[var(--color-muted)]">{goalLabel(habit)}</span>
                    </span>
                </div>
            ))}
        </div>
    </section>
);

export default TodayHabitsSummary;
