import { Check } from 'lucide-react';
import { HABIT_COLORS } from '../habitModalUtils';

const goalLabel = (habit) => {
    if (habit.type === 'time') return 'Log the time';
    if (habit.type === 'score') return 'Rate 1–5';
    if (habit.type === 'duration') return `${habit.target || 1} min`;
    if (habit.type === 'count') return `${habit.target || 1} times`;
    return 'Daily';
};

/** Habit tiles: the whole tile is the button, one tap marks it done. */
const TodayHabitsSummary = ({ habits = [], completedCount = 0, onComplete }) => (
    <section aria-labelledby="today-habits-heading">
        <div className="ui-section-title">
            <h2 id="today-habits-heading">Habits</h2>
            <span>{completedCount} of {habits.length}</span>
        </div>

        <div className="today-habits">
            {habits.map((habit) => (
                <button
                    key={habit.id}
                    type="button"
                    className={`today-habit${habit.completed ? ' is-done' : ''}`}
                    style={{ '--habit': HABIT_COLORS[habit.color] || 'var(--color-accent)' }}
                    onClick={() => onComplete(habit)}
                    disabled={habit.completed}
                    aria-label={habit.completed ? `${habit.name}, done` : `Mark ${habit.name} done`}
                >
                    <span className="today-habit__ring" aria-hidden="true">
                        {habit.completed && <Check size={15} strokeWidth={3.2} />}
                    </span>
                    <span className="today-habit__name">{habit.name}</span>
                    <span className="today-habit__goal">{habit.completed ? 'Done' : goalLabel(habit)}</span>
                </button>
            ))}
        </div>
    </section>
);

export default TodayHabitsSummary;
