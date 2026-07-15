import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, GraduationCap, Layers, ListChecks, RotateCcw, Trash2 } from 'lucide-react';
import { useLearning } from '../context/LearningContext';
import { getScheduleItemsForDate, toLocalDateKey } from '../utils/scheduleOccurrences';
import { isTaskActive } from '../utils/taskState';
import { COLOR_OPTIONS } from './LearningPathModal';
import ScheduleEventModal from './ScheduleEventModal';
import TaskEditModal from './TaskEditModal';
import { formatDuration, formatTime, getItemColor, getMonday } from './weeklyPlanUtils';

const WeeklyPlan = ({ tasks = [], scheduleItems = [], onCompleteTask, onDeleteScheduleItem, onDeleteTask, onUpdateScheduleItem, onUpdateTask }) => {
    const [weekOffset, setWeekOffset] = useState(0);
    const [typeFilter, setTypeFilter] = useState('all');
    const [subjectFilter, setSubjectFilter] = useState('all');
    const [editingScheduleItem, setEditingScheduleItem] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const { getTimetableForDay } = useLearning();

    const weekDates = useMemo(() => {
        const start = getMonday(new Date());
        start.setDate(start.getDate() + weekOffset * 7);

        return Array.from({ length: 7 }, (_, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            return date;
        });
    }, [weekOffset]);

    const weekItems = useMemo(() => {
        return weekDates.flatMap((date) => {
            const dateKey = toLocalDateKey(date);
            const dayTasks = tasks
                .filter((task) => task.deadline && isTaskActive(task) && toLocalDateKey(task.deadline) === dateKey)
                .map((task) => ({
                    ...task,
                    type: 'task',
                    date,
                    dateKey,
                    displayTime: task.deadline,
                    duration: task.estimatedTime || task.estimated_time || 30,
                    label: task.subject || 'Other',
                }));

            const daySchedule = getScheduleItemsForDate(scheduleItems, date).map((item) => ({
                ...item,
                type: 'schedule',
                date,
                dateKey,
                displayTime: item.displayTime || item.startTime || item.start_time,
                duration: item.duration || 60,
                label: item.category || 'Schedule',
            }));

            const dayLearning = getTimetableForDay(date.getDay(), date).map((slot, index) => {
                const [startH = 9, startM = 0] = (slot.start || '09:00').split(':').map(Number);
                const [endH = startH + 1, endM = startM] = (slot.end || '10:00').split(':').map(Number);
                const startDate = new Date(date);
                startDate.setHours(startH, startM, 0, 0);
                const duration = Math.max(15, (endH * 60 + endM) - (startH * 60 + startM));

                return {
                    ...slot,
                    id: `learning-${slot.pathId}-${dateKey}-${slot.start || 'slot'}-${index}`,
                    type: 'learning',
                    title: slot.pathName,
                    date,
                    dateKey,
                    displayTime: startDate.toISOString(),
                    duration,
                    label: slot.pathName || 'Learning',
                    category: 'Learning',
                };
            });

            return [...dayTasks, ...daySchedule, ...dayLearning].sort((a, b) => (
                new Date(a.displayTime || 0) - new Date(b.displayTime || 0)
            ));
        });
    }, [getTimetableForDay, scheduleItems, tasks, weekDates]);

    const subjects = useMemo(() => {
        const labels = weekItems.map((item) => item.label).filter(Boolean);
        return [...new Set(labels)].sort();
    }, [weekItems]);

    const visibleItems = useMemo(() => (
        weekItems.filter((item) => (
            (typeFilter === 'all' || item.type === typeFilter) &&
            (subjectFilter === 'all' || item.label === subjectFilter)
        ))
    ), [subjectFilter, typeFilter, weekItems]);

    const itemsByDate = useMemo(() => {
        const grouped = Object.fromEntries(weekDates.map((date) => [toLocalDateKey(date), []]));
        visibleItems.forEach((item) => {
            if (!grouped[item.dateKey]) grouped[item.dateKey] = [];
            grouped[item.dateKey].push(item);
        });
        return grouped;
    }, [visibleItems, weekDates]);

    const weeklyStats = useMemo(() => {
        const taskCount = visibleItems.filter((item) => item.type === 'task').length;
        const scheduleCount = visibleItems.filter((item) => item.type === 'schedule').length;
        const learningCount = visibleItems.filter((item) => item.type === 'learning').length;
        const minutes = visibleItems.reduce((sum, item) => sum + (Number(item.duration) || 0), 0);
        const busiest = weekDates
            .map((date) => ({ date, count: itemsByDate[toLocalDateKey(date)]?.length || 0 }))
            .sort((a, b) => b.count - a.count)[0];

        return { taskCount, scheduleCount, learningCount, minutes, busiest };
    }, [itemsByDate, visibleItems, weekDates]);

    const weekLabel = `${weekDates[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} - ${weekDates[6].toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    const todayKey = toLocalDateKey(new Date());
    const maxDailyItems = Math.max(1, ...Object.values(itemsByDate).map((items) => items.length));

    const handleItemClick = (item) => {
        if (item.type === 'task') {
            setEditingTask(item);
            return;
        }

        if (item.type === 'schedule') {
            setEditingScheduleItem(item);
        }
    };

    const handleSaveScheduleItem = (eventData) => (
        onUpdateScheduleItem?.(eventData.id, eventData)
    );

    return (
        <div className="h-full overflow-y-auto rounded-2xl border border-[var(--color-rule)] bg-[var(--color-card)] p-4 text-[var(--color-ink)] shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-[var(--color-accent)]">
                        <CalendarDays size={18} />
                        <span className="app-eyebrow">Weekly plan</span>
                    </div>
                    <h2 className="app-page-title mt-1">{weekLabel}</h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setWeekOffset((prev) => prev - 1)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-rule)] bg-[var(--color-card-raised)] text-[var(--color-ink-2)] transition hover:bg-[var(--color-paper-2)]"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        onClick={() => setWeekOffset(0)}
                        className="flex h-10 items-center gap-2 rounded-xl border border-[var(--color-rule)] bg-[var(--color-card-raised)] px-3 text-sm font-bold text-[var(--color-ink-2)] transition hover:bg-[var(--color-paper-2)]"
                    >
                        <RotateCcw size={15} />
                        This week
                    </button>
                    <button
                        onClick={() => setWeekOffset((prev) => prev + 1)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-rule)] bg-[var(--color-card-raised)] text-[var(--color-ink-2)] transition hover:bg-[var(--color-paper-2)]"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
                        <ListChecks size={14} />
                        Tasks
                    </div>
                    <div className="mt-1 text-2xl font-bold text-[var(--color-ink)]">{weeklyStats.taskCount}</div>
                </div>
                <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
                        <Layers size={14} />
                        Schedule
                    </div>
                    <div className="mt-1 text-2xl font-bold text-[var(--color-ink)]">{weeklyStats.scheduleCount}</div>
                </div>
                <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
                        <GraduationCap size={14} />
                        Learning
                    </div>
                    <div className="mt-1 text-2xl font-bold text-[var(--color-ink)]">{weeklyStats.learningCount}</div>
                </div>
                <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
                        <Clock size={14} />
                        Load
                    </div>
                    <div className="mt-1 text-2xl font-bold text-[var(--color-ink)]">{formatDuration(weeklyStats.minutes)}</div>
                </div>
                <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">Busiest</div>
                    <div className="mt-1 truncate text-lg font-bold text-[var(--color-ink)]">
                        {weeklyStats.busiest?.count ? weeklyStats.busiest.date.toLocaleDateString([], { weekday: 'long' }) : 'Clear'}
                    </div>
                </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 md:flex-row">
                <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-card-raised)] px-3 py-2 text-sm font-bold text-[var(--color-ink-2)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
                >
                    <option value="all">Tasks + schedule + learning</option>
                    <option value="task">Tasks only</option>
                    <option value="schedule">Schedule only</option>
                    <option value="learning">Learning only</option>
                </select>
                <select
                    value={subjectFilter}
                    onChange={(event) => setSubjectFilter(event.target.value)}
                    className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-card-raised)] px-3 py-2 text-sm font-bold text-[var(--color-ink-2)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
                >
                    <option value="all">All subjects/categories</option>
                    {subjects.map((subject) => (
                        <option key={subject} value={subject}>{subject}</option>
                    ))}
                </select>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-7">
                {weekDates.map((date) => {
                    const dateKey = toLocalDateKey(date);
                    const dayItems = itemsByDate[dateKey] || [];
                    const isToday = dateKey === todayKey;
                    const loadPercent = Math.round((dayItems.length / maxDailyItems) * 100);

                    return (
                        <section
                            key={dateKey}
                            className={`rounded-2xl border p-3 ${isToday ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]' : 'border-[var(--color-rule)] bg-[var(--color-paper-2)]'}`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className={`text-xs font-bold uppercase tracking-wide ${isToday ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}>
                                        {date.toLocaleDateString([], { weekday: 'short' })}
                                    </div>
                                    <div className="text-xl font-bold text-[var(--color-ink)]">{date.getDate()}</div>
                                </div>
                                <span className="rounded-full bg-[var(--color-card-raised)] px-2 py-1 text-xs font-bold text-[var(--color-muted)] shadow-sm">
                                    {dayItems.length}
                                </span>
                            </div>

                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-rule)]">
                                <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${loadPercent}%` }} />
                            </div>

                            <div className="mt-3 space-y-2">
                                {dayItems.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-[var(--color-rule)] bg-[var(--color-card-raised)]/70 p-3 text-center text-xs text-[var(--color-muted)]">
                                        Open
                                    </div>
                                ) : (
                                    dayItems.map((item) => {
                                        const color = getItemColor(item);
                                        const isLearning = item.type === 'learning';
                                        const learningColor = COLOR_OPTIONS.find((option) => option.name === item.pathColor) || COLOR_OPTIONS[0];
                                        const typeLabel = item.type === 'task' ? 'Task' : item.type === 'learning' ? 'Learning' : 'Schedule';
                                        const typeColor = item.type === 'task' ? 'text-[var(--color-accent)]' : item.type === 'learning' ? 'text-[var(--color-success)]' : 'text-[var(--color-muted)]';
                                        return (
                                            <div
                                                key={`${item.type}-${item.id}-${item.dateKey}`}
                                                role={isLearning ? undefined : 'button'}
                                                tabIndex={isLearning ? -1 : 0}
                                                onClick={() => handleItemClick(item)}
                                                onKeyDown={(event) => {
                                                    if (isLearning) return;
                                                    if (event.key !== 'Enter' && event.key !== ' ') return;
                                                    event.preventDefault();
                                                    handleItemClick(item);
                                                }}
                                                className={`rounded-xl border bg-[var(--color-card-raised)] p-2 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] ${isLearning ? 'cursor-default' : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md'}`}
                                                style={{ borderColor: color.border, backgroundColor: color.bg }}
                                                title={isLearning ? 'Learning timetable slot' : `Edit ${item.type === 'task' ? 'task' : 'schedule item'}`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="flex min-w-0 items-center gap-1.5">
                                                            {isLearning && (
                                                                <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full bg-gradient-to-r ${learningColor.gradient}`} />
                                                            )}
                                                            <div className="truncate text-xs font-bold text-[var(--color-ink)]">
                                                                {isLearning ? `${item.pathIcon || '📚'} ${item.title}` : item.title}
                                                            </div>
                                                        </div>
                                                        <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-[var(--color-muted)]">
                                                            <Clock size={10} />
                                                            {formatTime(item.displayTime)}
                                                            {item.duration ? ` · ${formatDuration(item.duration)}` : ''}
                                                        </div>
                                                    </div>
                                                    {item.type === 'task' && (
                                                        <button
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                onCompleteTask?.(item.id);
                                                            }}
                                                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-card-raised)]/80 text-[var(--color-success)] transition hover:bg-[var(--color-success-soft)]"
                                                            title="Mark task done"
                                                        >
                                                            <CheckCircle2 size={15} />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="mt-2 flex items-center justify-between gap-2">
                                                    <span className="truncate rounded-full bg-[var(--color-paper-2)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-muted)]">
                                                        {item.label}
                                                    </span>
                                                    <span className={`text-[10px] font-bold ${typeColor}`}>
                                                        {typeLabel}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </section>
                    );
                })}
            </div>

            <ScheduleEventModal
                isOpen={Boolean(editingScheduleItem)}
                onClose={() => setEditingScheduleItem(null)}
                onSave={handleSaveScheduleItem}
                onDelete={onDeleteScheduleItem}
                event={editingScheduleItem}
            />

            <TaskEditModal
                isOpen={Boolean(editingTask)}
                onClose={() => setEditingTask(null)}
                onDelete={onDeleteTask}
                onSave={onUpdateTask}
                task={editingTask}
            />
        </div>
    );
};


export default WeeklyPlan;
