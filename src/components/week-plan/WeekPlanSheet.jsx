import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Sheet, toast } from '../../ui';
import { useHabit } from '../../context/HabitContext';
import { useWeekPlans } from '../../context/WeekPlanContext';
import {
    MAX_KEY_TASKS,
    MAX_TARGETS,
    TARGET_MINUTE_OPTIONS,
    formatMinutes,
    getWeekDays,
} from '../../utils/weekPlan';

const NEW_HABIT = '__new';
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const newId = () => globalThis.crypto?.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const rangeLabel = (weekKey) => {
    const days = getWeekDays(weekKey);
    const format = (date) => date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${format(days[0])} – ${format(days[6])}`;
};

const padTasks = (tasks) => [
    ...tasks,
    ...Array.from({ length: Math.max(0, MAX_KEY_TASKS - tasks.length) }, () => ({ id: newId(), title: '', done: false })),
];

// Build or Break row: pick an existing habit or name a new one.
const HabitPicker = ({ label, value, onChange, newName, onNewName, options, placeholder }) => (
    <>
        <label className="form-field form-field--value">
            <span className="form-field__label">{label}</span>
            <select value={value} onChange={(event) => onChange(event.target.value)}>
                <option value="">None</option>
                {options.map((habit) => <option key={habit.id} value={habit.id}>{habit.name}</option>)}
                <option value={NEW_HABIT}>New habit…</option>
            </select>
        </label>
        {value === NEW_HABIT && (
            <label className="form-field">
                <span className="sr-only">{label} habit name</span>
                <input
                    type="text"
                    value={newName}
                    onChange={(event) => onNewName(event.target.value)}
                    placeholder={placeholder}
                    maxLength={60}
                    autoFocus
                />
            </label>
        )}
    </>
);

const WeekPlanForm = ({ weekKey, initial, onDone }) => {
    const { habits, addHabit } = useHabit();
    const { savePlan } = useWeekPlans();
    const habitExists = (id) => Boolean(id) && habits.some((habit) => habit.id === id);

    const [theme, setTheme] = useState(initial.theme || '');
    const [buildChoice, setBuildChoice] = useState(habitExists(initial.buildHabitId) ? initial.buildHabitId : '');
    const [breakChoice, setBreakChoice] = useState(habitExists(initial.breakHabitId) ? initial.breakHabitId : '');
    const [buildName, setBuildName] = useState('');
    const [breakName, setBreakName] = useState('');
    const [targets, setTargets] = useState(initial.targets.length ? initial.targets : [{ id: newId(), label: '', minutes: 60 }]);
    const [keyTasks, setKeyTasks] = useState(padTasks(initial.keyTasks));
    const [saving, setSaving] = useState(false);

    const buildOptions = habits.filter((habit) => habit.type !== 'avoid');
    const breakOptions = habits.filter((habit) => habit.type === 'avoid');

    const updateTarget = (id, changes) => setTargets((current) => current.map((target) => target.id === id ? { ...target, ...changes } : target));
    const removeTarget = (id) => setTargets((current) => current.filter((target) => target.id !== id));
    const addTarget = () => setTargets((current) => [...current, { id: newId(), label: '', minutes: 60 }]);
    const updateTask = (id, title) => setKeyTasks((current) => current.map((task) => task.id === id ? { ...task, title } : task));

    const resolveHabit = async (choice, name, type) => {
        if (choice !== NEW_HABIT) return choice || null;
        const cleanName = name.trim();
        if (!cleanName) return null;
        const created = await addHabit({
            name: cleanName,
            icon: type === 'avoid' ? '🚫' : '🌱',
            type,
            target: 1,
            frequency: 'daily',
            schedule_days: ALL_DAYS,
            time_of_day: 'anytime',
            reminder_time: null,
            color: type === 'avoid' ? 'rose' : 'emerald',
            is_seed: false,
        });
        return created?.id || null;
    };

    const submit = async (event) => {
        event.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            // One at a time: new habits get temporary ids from the clock.
            const buildHabitId = await resolveHabit(buildChoice, buildName, 'check');
            const breakHabitId = await resolveHabit(breakChoice, breakName, 'avoid');
            await savePlan({
                ...initial,
                weekStart: weekKey,
                theme,
                buildHabitId,
                breakHabitId,
                targets,
                keyTasks: keyTasks.filter((task) => task.title.trim()),
            });
            toast('Week saved');
            onDone();
        } catch (error) {
            toast(error.message || 'Could not save this week.', { tone: 'error' });
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="form-stack week-plan-form">
            <p className="form-section-label">Direction</p>
            <div className="form-group">
                <label className="form-field">
                    <span className="sr-only">This week's direction</span>
                    <input
                        type="text"
                        value={theme}
                        onChange={(event) => setTheme(event.target.value)}
                        placeholder="Ship the AI side project"
                        maxLength={120}
                    />
                </label>
            </div>

            <p className="form-section-label">Habits</p>
            <div className="form-group">
                <HabitPicker
                    label="Build"
                    value={buildChoice}
                    onChange={setBuildChoice}
                    newName={buildName}
                    onNewName={setBuildName}
                    options={buildOptions}
                    placeholder="Read 20 minutes"
                />
                <HabitPicker
                    label="Break"
                    value={breakChoice}
                    onChange={setBreakChoice}
                    newName={breakName}
                    onNewName={setBreakName}
                    options={breakOptions}
                    placeholder="Phone in bed"
                />
            </div>
            <p className="form-note">New habits show up in Habits as daily habits.</p>

            <p className="form-section-label">Daily targets</p>
            <div className="form-group">
                {targets.map((target, index) => {
                    const minuteOptions = TARGET_MINUTE_OPTIONS.includes(target.minutes)
                        ? TARGET_MINUTE_OPTIONS
                        : [...TARGET_MINUTE_OPTIONS, target.minutes].sort((a, b) => a - b);
                    return (
                        <div key={target.id} className="form-field week-plan-form__target">
                            <button
                                type="button"
                                className="form-remove"
                                onClick={() => removeTarget(target.id)}
                                aria-label={`Remove ${target.label || `target ${index + 1}`}`}
                            >
                                <Minus size={14} strokeWidth={3} aria-hidden="true" />
                            </button>
                            <input
                                type="text"
                                value={target.label}
                                onChange={(event) => updateTarget(target.id, { label: event.target.value })}
                                placeholder={index === 0 ? 'AI' : 'Study'}
                                aria-label={`Target ${index + 1} name`}
                                maxLength={40}
                            />
                            <select
                                value={target.minutes}
                                onChange={(event) => updateTarget(target.id, { minutes: Number(event.target.value) })}
                                aria-label={`Minutes a day for ${target.label || `target ${index + 1}`}`}
                            >
                                {minuteOptions.map((minutes) => <option key={minutes} value={minutes}>{formatMinutes(minutes)} a day</option>)}
                            </select>
                        </div>
                    );
                })}
                {targets.length < MAX_TARGETS && (
                    <button type="button" className="form-field form-option week-plan-form__add" onClick={addTarget}>
                        <Plus size={17} strokeWidth={2.4} aria-hidden="true" />
                        <span>Add target</span>
                    </button>
                )}
            </div>
            <p className="form-note">Plan blocks count when their name or category matches, like "AI course" for AI.</p>

            <p className="form-section-label">Key tasks</p>
            <div className="form-group">
                {keyTasks.map((task, index) => (
                    <label key={task.id} className="form-field">
                        <span className="sr-only">Key task {index + 1}</span>
                        <input
                            type="text"
                            value={task.title}
                            onChange={(event) => updateTask(task.id, event.target.value)}
                            placeholder={index === 0 ? 'The one thing that would make this week a win' : 'Key task'}
                            maxLength={140}
                        />
                    </label>
                ))}
            </div>

            <button type="submit" className="ui-button ui-button--accent form-submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Week'}
            </button>
        </form>
    );
};

/** Sheet for setting a week's direction, habits, targets, and key tasks. */
const WeekPlanSheet = ({ open, onClose, weekKey, initial, isNew, formKey }) => (
    <Sheet
        open={open}
        onClose={onClose}
        title={isNew ? 'Plan this week' : 'Edit week'}
        description={weekKey ? rangeLabel(weekKey) : undefined}
        className="form-sheet week-plan-sheet"
    >
        {weekKey && <WeekPlanForm key={formKey} weekKey={weekKey} initial={initial} onDone={onClose} />}
    </Sheet>
);

export default WeekPlanSheet;
