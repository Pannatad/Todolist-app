import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Filter, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { useLearning } from '../context/LearningContext';
import { COLOR_OPTIONS } from './LearningPathModal';

const DAYS = [
    { value: 1, short: 'Mon', label: 'Monday' },
    { value: 2, short: 'Tue', label: 'Tuesday' },
    { value: 3, short: 'Wed', label: 'Wednesday' },
    { value: 4, short: 'Thu', label: 'Thursday' },
    { value: 5, short: 'Fri', label: 'Friday' },
    { value: 6, short: 'Sat', label: 'Saturday' },
    { value: 0, short: 'Sun', label: 'Sunday' },
];

const formatDuration = (minutes) => {
    if (minutes <= 0) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};

const formatHour = (h) => {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
};

// Get Monday of the week containing the given date
const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
};

const formatShortDate = (date) => {
    return `${date.getDate()} ${date.toLocaleString('en', { month: 'short' })}`;
};

const TimetableSummary = () => {
    const { learningPaths, getAllTimetableEntries, getTimetableForDay } = useLearning();
    const [hiddenPaths, setHiddenPaths] = useState(new Set());
    const [showFilter, setShowFilter] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, -1 = last week, +1 = next week

    const allEntries = useMemo(() => getAllTimetableEntries(), [getAllTimetableEntries]);

    // Current week dates
    const weekDates = useMemo(() => {
        const monday = getMonday(new Date());
        monday.setDate(monday.getDate() + weekOffset * 7);
        return DAYS.map((day, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            return d;
        });
    }, [weekOffset]);

    const weekLabel = useMemo(() => {
        const start = weekDates[0];
        const end = weekDates[6];
        if (weekOffset === 0) return `This Week · ${formatShortDate(start)} – ${formatShortDate(end)}`;
        return `${formatShortDate(start)} – ${formatShortDate(end)}`;
    }, [weekDates, weekOffset]);

    // Paths with slots (unfiltered)
    const pathsWithSlots = useMemo(() => {
        const pathMap = new Map();
        allEntries.forEach(entry => {
            if (!pathMap.has(entry.pathId)) {
                pathMap.set(entry.pathId, {
                    id: entry.pathId,
                    name: entry.pathName,
                    icon: entry.pathIcon,
                    color: entry.pathColor,
                });
            }
        });
        return Array.from(pathMap.values());
    }, [allEntries]);

    // Get entries for this specific week, filtered by date range + hidden paths
    const weekEntries = useMemo(() => {
        const entries = [];
        weekDates.forEach(date => {
            const dayOfWeek = date.getDay();
            const dayEntries = getTimetableForDay(dayOfWeek, date);
            dayEntries.forEach(e => {
                if (!hiddenPaths.has(e.pathId)) {
                    entries.push({ ...e, date });
                }
            });
        });
        return entries;
    }, [weekDates, getTimetableForDay, hiddenPaths]);

    // Build slots per day index (0=Mon ... 6=Sun for display)
    const daySlots = useMemo(() => {
        const map = {};
        DAYS.forEach((d, idx) => {
            const date = weekDates[idx];
            map[idx] = weekEntries
                .filter(e => e.day === d.value && e.date.getTime() === date.getTime())
                .sort((a, b) => {
                    const [ah, am] = a.start.split(':').map(Number);
                    const [bh, bm] = b.start.split(':').map(Number);
                    return (ah * 60 + am) - (bh * 60 + bm);
                });
        });
        return map;
    }, [weekEntries, weekDates]);

    const togglePath = (pathId) => {
        setHiddenPaths(prev => {
            const next = new Set(prev);
            if (next.has(pathId)) next.delete(pathId);
            else next.add(pathId);
            return next;
        });
    };

    // Determine the time range to display
    const { startHour, endHour } = useMemo(() => {
        if (weekEntries.length === 0) return { startHour: 8, endHour: 18 };
        let minH = 24, maxH = 0;
        weekEntries.forEach(e => {
            const [sh] = e.start.split(':').map(Number);
            const [eh, em] = e.end.split(':').map(Number);
            minH = Math.min(minH, sh);
            maxH = Math.max(maxH, em > 0 ? eh + 1 : eh);
        });
        return { startHour: Math.max(0, minH - 1), endHour: Math.min(24, maxH + 1) };
    }, [weekEntries]);

    const totalHours = endHour - startHour;
    const CELL_HEIGHT = 56;

    // Weekly total for this week
    const totalWeeklyMinutes = useMemo(() => {
        return weekEntries.reduce((sum, e) => {
            const [sh, sm] = e.start.split(':').map(Number);
            const [eh, em] = e.end.split(':').map(Number);
            return sum + ((eh * 60 + em) - (sh * 60 + sm));
        }, 0);
    }, [weekEntries]);

    if (allEntries.length === 0) {
        return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-sm">
                        <Calendar size={16} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-800">Weekly Study Schedule</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {weekEntries.length} slot{weekEntries.length !== 1 ? 's' : ''} · {formatDuration(totalWeeklyMinutes)} this week
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilter(!showFilter)}
                        className={`text-sm px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5
                            ${showFilter
                                ? 'bg-purple-50 text-purple-600 border border-purple-200 shadow-sm shadow-purple-100'
                                : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-100'
                            }`}
                    >
                        <Filter size={12} />
                        Courses
                        {hiddenPaths.size > 0 && (
                            <span className="w-4 h-4 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center font-bold">
                                {hiddenPaths.size}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all border border-gray-100"
                        title={collapsed ? 'Show timetable' : 'Hide timetable'}
                    >
                        {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {!collapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        {/* Filter Panel */}
                        <AnimatePresence>
                            {showFilter && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden border-b border-gray-100"
                                >
                                    <div className="px-5 py-3 bg-gray-50/60">
                                        <div className="flex flex-wrap gap-2">
                                            {pathsWithSlots.map(path => {
                                                const colorConfig = COLOR_OPTIONS.find(c => c.name === path.color) || COLOR_OPTIONS[0];
                                                const isVisible = !hiddenPaths.has(path.id);
                                                const slotCount = allEntries.filter(e => e.pathId === path.id).length;
                                                return (
                                                    <button
                                                        key={path.id}
                                                        onClick={() => togglePath(path.id)}
                                                        className={`text-xs px-3 py-2 rounded-xl font-medium transition-all flex items-center gap-2 border ${
                                                            isVisible
                                                                ? 'bg-white border-gray-200 text-gray-700 shadow-sm hover:shadow-md'
                                                                : 'bg-gray-100/80 border-transparent text-gray-400 opacity-50 hover:opacity-70'
                                                        }`}
                                                    >
                                                        <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-r ${colorConfig.gradient} shadow-sm ${!isVisible ? 'opacity-30' : ''}`} />
                                                        <span>{path.icon} {path.name}</span>
                                                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">{slotCount}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Week Navigation */}
                        <div className="flex items-center justify-center gap-4 px-5 py-3 border-b border-gray-50 bg-gray-50/30">
                            <button
                                onClick={() => setWeekOffset(w => w - 1)}
                                className="p-1.5 rounded-lg hover:bg-gray-200/60 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={() => setWeekOffset(0)}
                                className={`text-sm font-semibold px-3 py-1 rounded-lg transition-colors ${
                                    weekOffset === 0 ? 'text-purple-600 bg-purple-50' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {weekLabel}
                            </button>
                            <button
                                onClick={() => setWeekOffset(w => w + 1)}
                                className="p-1.5 rounded-lg hover:bg-gray-200/60 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>

                        {/* Timetable Grid */}
                        <div className="p-4 overflow-x-auto">
                            {weekEntries.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <Calendar size={28} className="mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm font-medium">No study slots this week</p>
                                    <p className="text-xs text-gray-300 mt-1">Navigate to another week or add timetable entries to your paths.</p>
                                </div>
                            ) : (
                                <div className="min-w-[600px]">
                                    {/* Day Headers with Dates */}
                                    <div className="grid gap-1" style={{ gridTemplateColumns: '50px repeat(7, 1fr)' }}>
                                        <div /> {/* Empty corner */}
                                        {DAYS.map((day, dayIdx) => {
                                            const slots = daySlots[dayIdx] || [];
                                            const date = weekDates[dayIdx];
                                            const isToday = date.getTime() === today.getTime();
                                            const dayMins = slots.reduce((s, e) => {
                                                const [sh, sm] = e.start.split(':').map(Number);
                                                const [eh, em] = e.end.split(':').map(Number);
                                                return s + ((eh * 60 + em) - (sh * 60 + sm));
                                            }, 0);
                                            return (
                                                <div key={day.value} className="text-center pb-2">
                                                    <span className={`text-sm font-bold block ${isToday ? 'text-purple-600' : slots.length > 0 ? 'text-gray-700' : 'text-gray-300'}`}>
                                                        {day.short}
                                                    </span>
                                                    <span className={`text-[11px] block ${isToday ? 'bg-purple-500 text-white rounded-md px-1.5 py-0.5 inline-block mt-0.5 font-bold' : 'text-gray-400'}`}>
                                                        {date.getDate()}
                                                    </span>
                                                    {dayMins > 0 && (
                                                        <span className="text-xs text-gray-400 font-medium">{formatDuration(dayMins)}</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Time Grid */}
                                    <div
                                        className="grid gap-1 relative"
                                        style={{
                                            gridTemplateColumns: '50px repeat(7, 1fr)',
                                            gridTemplateRows: `repeat(${totalHours}, ${CELL_HEIGHT}px)`,
                                        }}
                                    >
                                        {/* Hour Labels + Lines */}
                                        {Array.from({ length: totalHours }, (_, i) => {
                                            const hour = startHour + i;
                                            return (
                                                <React.Fragment key={hour}>
                                                    <div
                                                        className="text-xs text-gray-300 font-medium text-right pr-2 flex items-start justify-end pt-0"
                                                        style={{ gridColumn: 1, gridRow: i + 1 }}
                                                    >
                                                        {formatHour(hour)}
                                                    </div>
                                                    <div
                                                        className="border-t border-gray-100"
                                                        style={{ gridColumn: '2 / -1', gridRow: i + 1 }}
                                                    />
                                                </React.Fragment>
                                            );
                                        })}

                                        {/* Vertical separators */}
                                        {DAYS.map((day, colIdx) => (
                                            <div
                                                key={`col-${day.value}`}
                                                className="border-l border-gray-50"
                                                style={{
                                                    gridColumn: colIdx + 2,
                                                    gridRow: `1 / ${totalHours + 1}`,
                                                }}
                                            />
                                        ))}

                                        {/* Slot Blocks */}
                                        {DAYS.map((day, colIdx) => {
                                            const slots = daySlots[colIdx] || [];
                                            return slots.map((slot, idx) => {
                                                const colorConfig = COLOR_OPTIONS.find(c => c.name === slot.pathColor) || COLOR_OPTIONS[0];
                                                const [sh, sm] = slot.start.split(':').map(Number);
                                                const [eh, em] = slot.end.split(':').map(Number);
                                                const startOffset = (sh - startHour) + sm / 60;
                                                const duration = (eh * 60 + em) - (sh * 60 + sm);
                                                const blockHeight = (duration / 60) * CELL_HEIGHT;

                                                return (
                                                    <motion.div
                                                        key={`${slot.pathId}-${day.value}-${idx}`}
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: colIdx * 0.03 + idx * 0.05 }}
                                                        className={`bg-gradient-to-br ${colorConfig.gradient} rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all cursor-default relative overflow-hidden group`}
                                                        style={{
                                                            gridColumn: colIdx + 2,
                                                            gridRow: 1,
                                                            marginTop: startOffset * CELL_HEIGHT,
                                                            height: Math.max(blockHeight, 28),
                                                            marginLeft: 2,
                                                            marginRight: 2,
                                                            position: 'relative',
                                                            alignSelf: 'start',
                                                        }}
                                                        title={`${slot.pathName}\n${slot.start} – ${slot.end} (${formatDuration(duration)})`}
                                                    >
                                                        <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full blur-lg -mr-4 -mt-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <div className="p-1.5 h-full flex flex-col justify-center relative z-10">
                                                            <div className="text-xs font-bold text-white truncate leading-tight">
                                                                {slot.pathIcon} {slot.pathName}
                                                            </div>
                                                            {blockHeight >= 48 && (
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <Clock size={10} className="text-white/60 flex-shrink-0" />
                                                                    <span className="text-[11px] text-white/70 truncate">
                                                                        {slot.start} – {slot.end}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                );
                                            });
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Legend */}
                        {weekEntries.length > 0 && (
                            <div className="px-5 py-3 border-t border-gray-100 bg-gradient-to-r from-gray-50/80 to-white">
                                <div className="flex flex-wrap gap-x-5 gap-y-2">
                                    {pathsWithSlots
                                        .filter(p => !hiddenPaths.has(p.id))
                                        .map(path => {
                                            const colorConfig = COLOR_OPTIONS.find(c => c.name === path.color) || COLOR_OPTIONS[0];
                                            const pathSlots = weekEntries.filter(e => e.pathId === path.id);
                                            const pathMins = pathSlots.reduce((sum, s) => {
                                                const [sh, sm] = s.start.split(':').map(Number);
                                                const [eh, em] = s.end.split(':').map(Number);
                                                return sum + ((eh * 60 + em) - (sh * 60 + sm));
                                            }, 0);
                                            if (pathSlots.length === 0) return null;
                                            const uniqueDays = [...new Set(pathSlots.map(s => s.day))].length;

                                            return (
                                                <div key={path.id} className="flex items-center gap-2 text-sm">
                                                    <div className={`w-3.5 h-3.5 rounded-sm bg-gradient-to-r ${colorConfig.gradient} shadow-sm`} />
                                                    <span className="font-semibold text-gray-700">{path.icon} {path.name}</span>
                                                    <span className="text-gray-300">·</span>
                                                    <span className="text-gray-400">{uniqueDays} day{uniqueDays !== 1 ? 's' : ''}</span>
                                                    <span className="text-gray-300">·</span>
                                                    <span className="font-medium text-purple-500">{formatDuration(pathMins)}</span>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default TimetableSummary;
