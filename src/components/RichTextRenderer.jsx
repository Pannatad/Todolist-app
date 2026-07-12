import React from 'react';
import { Circle, FolderKanban, Calendar, Clock, CheckCircle2 } from 'lucide-react';

// Clean markdown
const cleanText = (str) => {
    if (!str) return str;
    return str.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').trim();
};

// Get habit emoji
const getHabitEmoji = (text) => {
    const lower = (text || '').toLowerCase();
    if (lower.includes('meditat')) return '🧘';
    if (lower.includes('gym') || lower.includes('workout')) return '🏋️';
    if (lower.includes('journal')) return '📓';
    if (lower.includes('stretch') || lower.includes('yoga')) return '🤸';
    if (lower.includes('read')) return '📖';
    if (lower.includes('water')) return '💧';
    if (lower.includes('gratitude')) return '🙏';
    return '✔️';
};

// Get task emoji
const getTaskEmoji = (text) => {
    const lower = (text || '').toLowerCase();
    if (lower.includes('reflection')) return '📓';
    if (lower.includes('assignment') || lower.includes('homework')) return '📄';
    if (lower.includes('writing')) return '✍️';
    if (lower.includes('code') || lower.includes('app')) return '💻';
    return '📋';
};

// Timeline colors
const TIMELINE_COLORS = [
    { dot: 'bg-blue-500', line: 'bg-blue-200' },
    { dot: 'bg-orange-500', line: 'bg-orange-200' },
    { dot: 'bg-emerald-500', line: 'bg-emerald-200' },
    { dot: 'bg-purple-500', line: 'bg-purple-200' },
];

// Section colors for day overview
const SECTION_STYLES = {
    schedule: { bg: 'bg-gradient-to-br from-blue-50 to-indigo-50', border: 'border-blue-100', text: 'text-blue-800', icon: '🗓️' },
    tasks: { bg: 'bg-gradient-to-br from-emerald-50 to-green-50', border: 'border-emerald-100', text: 'text-emerald-800', icon: '📋' },
    habits: { bg: 'bg-gradient-to-br from-amber-50 to-orange-50', border: 'border-amber-100', text: 'text-amber-800', icon: '🔄' },
    highlights: { bg: 'bg-gradient-to-br from-purple-50 to-pink-50', border: 'border-purple-100', text: 'text-purple-800', icon: '⭐' },
};

// Get section type from header
const getSectionType = (header) => {
    const lower = (header || '').toLowerCase();
    if (lower.includes('schedule') || lower.includes('event')) return 'schedule';
    if (lower.includes('task')) return 'tasks';
    if (lower.includes('habit')) return 'habits';
    if (lower.includes('highlight')) return 'highlights';
    return null;
};

// Parse schedule item time from text like "Event at 15:00" or "15:00-17:00: Event"
const parseScheduleTime = (text) => {
    const timeMatch = text.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if (timeMatch) {
        return { start: timeMatch[1], end: timeMatch[2] };
    }
    const singleTime = text.match(/at\s*(\d{1,2}:\d{2}(?:\s*(?:AM|PM)?)?)/i);
    if (singleTime) {
        return { start: singleTime[1], end: null };
    }
    return null;
};

// Timeline Component for Schedule
const ScheduleTimeline = ({ items }) => {
    return (
        <div className="relative pl-4">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-3 bottom-3 w-0.5 bg-gray-200" />

            <div className="space-y-3">
                {items.map((item, idx) => {
                    const color = TIMELINE_COLORS[idx % TIMELINE_COLORS.length];
                    const timeInfo = parseScheduleTime(item.text);
                    const title = item.text
                        .replace(/at\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM)?)?/gi, '')
                        .replace(/\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}/g, '')
                        .replace(/\(passed\)/gi, '')
                        .replace(/\(recurring\)/gi, '')
                        .trim();
                    const isPassed = item.text.toLowerCase().includes('passed');

                    return (
                        <div key={idx} className="relative flex items-start gap-3">
                            {/* Timeline dot */}
                            <div className={`relative z-10 w-3.5 h-3.5 rounded-full ${color.dot} ring-4 ring-white/50 shadow-sm flex-shrink-0 mt-4`} />

                            {/* Event card - Glassmorphism */}
                            <div className={`flex-1 p-3 bg-white/40 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm ${isPassed ? 'opacity-60' : ''}`}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                        <p className={`font-semibold text-gray-900 ${isPassed ? 'line-through' : ''}`}>
                                            {title || item.text}
                                        </p>
                                        {timeInfo && (
                                            <div className="flex items-center gap-1.5 mt-1 text-gray-500">
                                                <Clock size={12} />
                                                <span className="text-xs">
                                                    {timeInfo.start}{timeInfo.end ? ` - ${timeInfo.end}` : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className={`w-3 h-3 rounded-full ${color.dot} flex-shrink-0 mt-1`} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Parse day overview sections
const parseDayOverview = (text) => {
    const lines = text.split('\n');
    const sections = [];
    let currentSection = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Check for section headers (all caps pattern)
        const isHeader = trimmed === trimmed.toUpperCase() && trimmed.length < 60 && !trimmed.match(/^\d/);

        if (isHeader && (trimmed.includes('SCHEDULE') || trimmed.includes('TASK') || trimmed.includes('HABIT') || trimmed.includes('HIGHLIGHT'))) {
            if (currentSection) sections.push(currentSection);
            currentSection = {
                header: cleanText(trimmed),
                type: getSectionType(trimmed),
                items: []
            };
            continue;
        }

        // Items with bullet points or emojis
        if (currentSection && (trimmed.match(/^[•\-◦]/) || trimmed.match(/^[\u{1F300}-\u{1F9FF}]/u) || !trimmed.match(/^[A-Z][A-Z\s]+$/))) {
            const itemText = cleanText(trimmed.replace(/^[•\-◦]\s*/, ''));
            if (itemText && !itemText.includes('No ') && itemText !== 'No tasks due today' && itemText !== 'No daily highlights set for today') {
                currentSection.items.push({ text: itemText, hasEmoji: trimmed.match(/^[\u{1F300}-\u{1F9FF}]/u) !== null });
            } else if (itemText.includes('No ')) {
                currentSection.items.push({ text: itemText, isEmpty: true });
            }
        }
    }

    if (currentSection) sections.push(currentSection);
    return sections;
};

// Rich Text Renderer
const RichTextRenderer = ({ text }) => {
    if (!text) return null;

    // Detect if this is a "day overview" type response
    const isDayOverview = (
        (text.toUpperCase().includes('SCHEDULE') || text.includes('schedule today')) &&
        (text.toUpperCase().includes('TASK') || text.toUpperCase().includes('HABIT'))
    );

    // === DAY OVERVIEW MODE ===
    if (isDayOverview) {
        const sections = parseDayOverview(text);

        if (sections.length > 0) {
            return (
                <div className="space-y-3">
                    {sections.map((section, idx) => {
                        const style = SECTION_STYLES[section.type] || SECTION_STYLES.schedule;
                        const isSchedule = section.type === 'schedule';

                        return (
                            <div key={idx} className={`p-4 rounded-2xl border ${style.bg} ${style.border}`}>
                                {/* Section Header */}
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg">{style.icon}</span>
                                    <h4 className={`text-sm font-bold uppercase tracking-wide ${style.text}`}>
                                        {section.header}
                                    </h4>
                                </div>

                                {/* Section Items */}
                                {section.items.length > 0 ? (
                                    isSchedule ? (
                                        <ScheduleTimeline items={section.items.filter(i => !i.isEmpty)} />
                                    ) : (
                                        <div className="space-y-2">
                                            {section.items.map((item, iIdx) => {
                                                if (item.isEmpty) {
                                                    return (
                                                        <p key={iIdx} className="text-gray-500 text-sm italic">{item.text}</p>
                                                    );
                                                }

                                                // Colors for dots
                                                const dotColors = ['bg-blue-500', 'bg-orange-500', 'bg-emerald-500', 'bg-purple-500'];
                                                const dotColor = dotColors[iIdx % dotColors.length];

                                                return (
                                                    <div key={iIdx} className="flex items-center gap-3 p-3 bg-white/40 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${dotColor} flex-shrink-0`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-gray-900 text-sm">{item.text}</p>
                                                        </div>
                                                        <div className={`w-2.5 h-2.5 rounded-full ${dotColor} flex-shrink-0`} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )
                                ) : (
                                    <p className="text-gray-500 text-sm italic">No items</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            );
        }
    }

    // === DETECT SCHEDULE ONLY ===
    const isScheduleOnly = text.toLowerCase().includes('schedule') &&
        !text.toUpperCase().includes('HABIT') &&
        !text.toUpperCase().includes('TASK DUE');
    if (isScheduleOnly) {
        const lines = text.split('\n').filter(l => l.trim());
        const scheduleItems = lines
            .filter(l => l.match(/at\s*\d{1,2}:\d{2}/i) || l.match(/\d{1,2}:\d{2}\s*[-–]/))
            .map(l => ({ text: cleanText(l.replace(/^[•\-◦]\s*/, '')) }));

        if (scheduleItems.length > 0) {
            return (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🗓️</span>
                        <h4 className="text-base font-semibold text-gray-800">Today's Schedule</h4>
                    </div>
                    <ScheduleTimeline items={scheduleItems} />
                </div>
            );
        }
    }

    // === DETECT PROJECTS ===
    const hasProjects = text.includes('% done') && text.includes('task');
    if (hasProjects) {
        const pattern = /"([^"]+)"\s*\((\d+)%\s*done,?\s*(\d+)\s*tasks?\)/gi;
        const projects = [];
        let match;
        while ((match = pattern.exec(text)) !== null) {
            projects.push({ name: match[1], progress: parseInt(match[2]), tasks: parseInt(match[3]) });
        }

        if (projects.length > 0) {
            return (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span>📊</span>
                        <h4 className="text-base font-semibold text-gray-800">Your Projects ({projects.length})</h4>
                    </div>
                    {projects.map((project, idx) => {
                        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500'];
                        const bg = ['bg-blue-50', 'bg-emerald-50', 'bg-purple-50', 'bg-amber-50'];
                        return (
                            <div key={idx} className={`p-3 ${bg[idx % 4]} rounded-xl border flex items-center gap-3`}>
                                <div className={`w-10 h-10 ${colors[idx % 4]} rounded-lg flex items-center justify-center`}>
                                    <FolderKanban size={20} className="text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm truncate">{project.name}</p>
                                    <p className="text-xs text-gray-500">{project.tasks} tasks</p>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-lg font-bold text-gray-700">{project.progress}%</span>
                                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div className={`h-full ${colors[idx % 4]} rounded-full`} style={{ width: `${project.progress}%` }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }
    }

    // === DETECT TASKS ===
    const hasTasks = text.toLowerCase().includes('pending task') || (text.includes('(due:') && text.includes('•'));
    if (hasTasks) {
        const lines = text.split('\n');
        const tasks = [];
        for (const line of lines) {
            const match = line.trim().match(/^[•◦-]\s*(.+?)(?:\s*\(due:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\))?$/i);
            if (match) {
                tasks.push({ name: cleanText(match[1].replace(/\(due:.*\)/i, '')), dueDate: match[2] || null });
            }
        }

        if (tasks.length > 0) {
            return (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">📋</span>
                        <h4 className="text-base font-semibold text-gray-800">Your Pending Tasks ({tasks.length})</h4>
                    </div>
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                        {tasks.map((task, idx) => (
                            <div key={idx} className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">{getTaskEmoji(task.name)}</span>
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900 text-sm">{task.name}</p>
                                        {task.dueDate && (
                                            <div className="flex items-center gap-1.5 mt-1 text-gray-500">
                                                <Calendar size={12} />
                                                <span className="text-xs">Due: {task.dueDate}</span>
                                            </div>
                                        )}
                                        <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Pending</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
    }

    // === DETECT HABITS ===
    const hasHabits = text.toLowerCase().includes('habit') && !text.includes('% done');
    if (hasHabits) {
        const listMatch = text.match(/(?:complete today|left to complete|habits?:?)\s*:?\s*([^.]+)/i);
        if (listMatch) {
            const habits = listMatch[1].replace(/,?\s+and\s+/gi, ',').split(/,\s*/).map(s => s.trim()).filter(s => s.length > 0 && s.length < 50);
            if (habits.length > 0) {
                return (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🔄</span>
                            <h4 className="text-base font-semibold text-gray-800">Habits to Complete ({habits.length})</h4>
                        </div>
                        <div className="space-y-2">
                            {habits.map((habit, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center">
                                        <span className="text-lg">{getHabitEmoji(habit)}</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 text-sm">{habit}</p>
                                        <p className="text-xs text-gray-500">Daily habit</p>
                                    </div>
                                    <div className="w-6 h-6 rounded-full border-2 border-gray-200" />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }
        }
    }

    // === FALLBACK ===
    const lines = text.split('\n').filter(l => l.trim());
    const sections = [];
    let currentSection = { header: null, items: [] };

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const headerMatch = trimmed.match(/^\*?\*?(.+?):\*?\*?$/);
        if (headerMatch && trimmed.length < 80) {
            if (currentSection.items.length > 0 || currentSection.header) sections.push(currentSection);
            currentSection = { header: cleanText(headerMatch[1]), items: [] };
            return;
        }
        if (trimmed.match(/^[-•◦]/)) {
            currentSection.items.push({ type: 'bullet', content: cleanText(trimmed.replace(/^[-•◦]\s*/, '')) });
            return;
        }
        currentSection.items.push({ type: 'text', content: cleanText(trimmed) });
    });

    if (currentSection.items.length > 0 || currentSection.header) sections.push(currentSection);

    return (
        <div className="space-y-4">
            {sections.map((section, sIdx) => (
                <div key={sIdx} className="space-y-2">
                    {section.header && (
                        <div className="flex items-center gap-2 mb-2">
                            <span>✨</span>
                            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide">{section.header}</h4>
                        </div>
                    )}
                    {section.items.map((item, iIdx) => {
                        if (item.type === 'bullet') {
                            return (
                                <div key={iIdx} className="flex items-start gap-2 pl-1">
                                    <Circle size={5} className="text-indigo-400 mt-1.5" />
                                    <p className="text-gray-600 text-sm">{item.content}</p>
                                </div>
                            );
                        }
                        return item.content.length > 100 ? (
                            <div key={iIdx} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-gray-700 text-sm">{item.content}</p>
                            </div>
                        ) : (
                            <p key={iIdx} className="text-gray-600 text-sm">{item.content}</p>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default RichTextRenderer;
