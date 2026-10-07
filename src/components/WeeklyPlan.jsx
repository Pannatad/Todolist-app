import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLearning } from '../context/LearningContext';
import { getScheduleItemsForDate, toLocalDateKey } from '../utils/scheduleOccurrences';
import { isTaskActive } from '../utils/taskState';
import ScheduleEventModal from './ScheduleEventModal';
import TaskEditModal from './TaskEditModal';
import { formatDuration, formatTime, getItemColor, getMonday } from './weeklyPlanUtils';

const WeeklyPlan = ({ tasks = [], scheduleItems = [], onCompleteTask, onDeleteScheduleItem, onDeleteTask, onUpdateScheduleItem, onUpdateTask }) => {
    const [weekOffset, setWeekOffset] = useState(0);
    const [typeFilter, setTypeFilter] = useState('all');
    const [subjectFilter, setSubjectFilter] = useState('all');
    const [editingScheduleItem, setEditingScheduleItem] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [completingIds, setCompletingIds] = useState(() => new Set());
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

    const weekLabel = `${weekDates[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    const todayKey = toLocalDateKey(new Date());

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

    const completeTask = (item) => {
        setCompletingIds((current) => new Set(current).add(item.id));
        window.setTimeout(() => onCompleteTask?.(item.id), 380);
    };

    return (
        <div className="week-list">
            <div className="week-list__toolbar">
                <div>
                    <h2 className="week-list__title">{weekLabel}</h2>
                    <p className="week-list__summary">
                        {visibleItems.length} {visibleItems.length === 1 ? 'item' : 'items'} · {formatDuration(weeklyStats.minutes)} planned
                    </p>
                </div>
                <div className="week-list__nav">
                    {weekOffset !== 0 && (
                        <button type="button" className="ui-text-button" onClick={() => setWeekOffset(0)}>Today</button>
                    )}
                    <button type="button" className="ui-round-button" onClick={() => setWeekOffset((prev) => prev - 1)} aria-label="Previous week">
                        <ChevronLeft size={19} strokeWidth={2.3} />
                    </button>
                    <button type="button" className="ui-round-button" onClick={() => setWeekOffset((prev) => prev + 1)} aria-label="Next week">
                        <ChevronRight size={19} strokeWidth={2.3} />
                    </button>
                </div>
            </div>

            <div className="week-list__filters">
                <label className="pill-select">
                    <span className="sr-only">Show</span>
                    <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                        <option value="all">Everything</option>
                        <option value="task">Tasks</option>
                        <option value="schedule">Events</option>
                        <option value="learning">Learning</option>
                    </select>
                    <ChevronDown size={14} strokeWidth={2.4} aria-hidden="true" />
                </label>
                {subjects.length > 1 && (
                    <label className="pill-select">
                        <span className="sr-only">Category</span>
                        <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
                            <option value="all">All categories</option>
                            {subjects.map((subject) => (
                                <option key={subject} value={subject}>{subject}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} strokeWidth={2.4} aria-hidden="true" />
                    </label>
                )}
            </div>

            {weekDates.map((date) => {
                const dateKey = toLocalDateKey(date);
                const dayItems = itemsByDate[dateKey] || [];
                const isToday = dateKey === todayKey;
                const dayLabel = isToday
                    ? `Today, ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                    : date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

                return (
                    <section key={dateKey} className="week-list__day" aria-label={dayLabel}>
                        <div className={`ui-section-title week-list__day-title${isToday ? ' is-today' : ''}`}>
                            <h3>{dayLabel}</h3>
                            {dayItems.length > 0 && <span>{dayItems.length}</span>}
                        </div>

                        {dayItems.length === 0 ? (
                            <p className="week-list__free">Free</p>
                        ) : (
                            <div className="ui-group">
                                {dayItems.map((item) => {
                                    const color = getItemColor(item).color;
                                    const isTask = item.type === 'task';
                                    const isLearning = item.type === 'learning';
                                    const meta = [
                                        formatTime(item.displayTime),
                                        item.duration ? formatDuration(item.duration) : null,
                                        item.label,
                                    ].filter(Boolean).join(' · ');

                                    return (
                                        <div
                                            key={`${item.type}-${item.id}-${item.dateKey}`}
                                            className={`week-row${completingIds.has(item.id) ? ' is-done' : ''}`}
                                            style={{ '--event': color }}
                                        >
                                            {isTask ? (
                                                <button
                                                    type="button"
                                                    className="week-row__check"
                                                    onClick={() => completeTask(item)}
                                                    aria-label={`Complete ${item.title}`}
                                                >
                                                    <span><Check size={13} strokeWidth={3.2} aria-hidden="true" /></span>
                                                </button>
                                            ) : (
                                                <span className="week-row__bar" aria-hidden="true" />
                                            )}
                                            {isLearning ? (
                                                <div className="week-row__body">
                                                    <span className="week-row__title">{item.title}</span>
                                                    <span className="week-row__meta">{meta}</span>
                                                </div>
                                            ) : (
                                                <button type="button" className="week-row__body" onClick={() => handleItemClick(item)}>
                                                    <span className="week-row__title">{item.title}</span>
                                                    <span className="week-row__meta">{meta}</span>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                );
            })}

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
