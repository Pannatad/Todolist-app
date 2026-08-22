import { Clock, Moon, Sunrise, Sun, Sunset } from 'lucide-react';
import { DEFAULT_SEED_DURATION_DAYS } from '../constants/habitSeeds';

const EMOJI_OPTIONS = ['💧', '🧘', '🏃', '📚', '📝', '💪', '🎯', '⏰', '🌟', '❤️', '🧠', '🎨', '🎵', '💤', '🥗', '🚶', '✨'];

const COLOR_OPTIONS = [
    { name: 'slate', swatch: 'bg-slate-500' },
    { name: 'rose', swatch: 'bg-rose-500' },
    { name: 'purple', swatch: 'bg-purple-500' },
    { name: 'pink', swatch: 'bg-pink-500' },
    { name: 'indigo', swatch: 'bg-indigo-500' },
    { name: 'blue', swatch: 'bg-blue-500' },
    { name: 'teal', swatch: 'bg-teal-500' },
    { name: 'cyan', swatch: 'bg-cyan-500' },
    { name: 'lime', swatch: 'bg-lime-500' },
    { name: 'amber', swatch: 'bg-amber-500' },
    { name: 'emerald', swatch: 'bg-emerald-500' },
];

const TIME_OF_DAY_OPTIONS = [
    { value: 'morning', label: 'Morning', icon: Sunrise, color: 'text-[var(--color-warning)]', defaultTime: '07:00' },
    { value: 'afternoon', label: 'Afternoon', icon: Sun, color: 'text-[var(--color-warning)]', defaultTime: '12:00' },
    { value: 'evening', label: 'Evening', icon: Sunset, color: 'text-[var(--color-warning)]', defaultTime: '18:00' },
    { value: 'night', label: 'Night', icon: Moon, color: 'text-[var(--color-accent)]', defaultTime: '21:00' },
    { value: 'anytime', label: 'Anytime', icon: Clock, color: 'text-[var(--color-muted)]', defaultTime: '' },
];

const DAYS = [
    { value: 0, label: 'S', full: 'Sunday' },
    { value: 1, label: 'M', full: 'Monday' },
    { value: 2, label: 'T', full: 'Tuesday' },
    { value: 3, label: 'W', full: 'Wednesday' },
    { value: 4, label: 'T', full: 'Thursday' },
    { value: 5, label: 'F', full: 'Friday' },
    { value: 6, label: 'S', full: 'Saturday' },
];

const SEED_DURATION_OPTIONS = [14, 30, 60];
const SCORE_MAX = 5;

const getInitialFormState = (habit) => ({
    name: habit?.name || '',
    icon: habit?.icon || '✨',
    type: habit?.type || 'check',
    target: habit?.target || 1,
    frequency: habit?.frequency || 'daily',
    scheduleDays: habit?.schedule_days || [0, 1, 2, 3, 4, 5, 6],
    timeOfDay: habit?.time_of_day || 'anytime',
    reminderTime: habit?.reminder_time || '',
    color: habit?.color || 'teal',
    isSeed: Boolean(habit?.is_seed),
    seedDurationDays: Number(habit?.seed_duration_days) > 0
        ? Number(habit.seed_duration_days)
        : DEFAULT_SEED_DURATION_DAYS,
    seedWhy: habit?.seed_why || '',
});

const labelClass = 'habit-form__label';
const surfaceClass = 'habit-form__surface';
const inputClass = 'habit-form__input';

export {
    COLOR_OPTIONS,
    DAYS,
    EMOJI_OPTIONS,
    getInitialFormState,
    inputClass,
    labelClass,
    SEED_DURATION_OPTIONS,
    SCORE_MAX,
    surfaceClass,
    TIME_OF_DAY_OPTIONS,
};
