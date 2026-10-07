import React from 'react';
import { Circle } from 'lucide-react';
import { resolveChatRenderMode } from '../services/chatRenderMode.js';
import './rich-text.css';

// Clean markdown
const cleanText = (str) => {
    if (!str) return str;
    return str
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '')
        .trim();
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

const titleCase = (value) => value.toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

// Schedule rows: title on the left, time on the right.
const ScheduleRows = ({ items }) => (
    <div className="rich-list">
        {items.map((item, idx) => {
            const timeInfo = parseScheduleTime(item.text);
            const title = item.text
                .replace(/at\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM)?)?/gi, '')
                .replace(/\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}/g, '')
                .replace(/\(passed\)/gi, '')
                .replace(/\(recurring\)/gi, '')
                .replace(/[:\s–-]+$/, '')
                .trim();
            const isPassed = item.text.toLowerCase().includes('passed');

            return (
                <div key={idx} className={`rich-list__row${isPassed ? ' is-passed' : ''}`}>
                    <span className="rich-list__copy">
                        <span className="rich-list__title">{title || item.text}</span>
                    </span>
                    {timeInfo && (
                        <span className="rich-list__value">
                            {timeInfo.start}{timeInfo.end ? `–${timeInfo.end}` : ''}
                        </span>
                    )}
                </div>
            );
        })}
    </div>
);

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
const RichTextRenderer = ({ text, renderHint }) => {
    if (!text) return null;
    const renderMode = resolveChatRenderMode(renderHint);

    // Structured cards are opt-in metadata from deterministic app queries.
    // Never infer them from ordinary model prose: a sentence mentioning
    // "habit trackers" must remain a conversational answer.
    const isDayOverview = renderMode === 'overview' && (
        (text.toUpperCase().includes('SCHEDULE') || text.includes('schedule today')) &&
        (text.toUpperCase().includes('TASK') || text.toUpperCase().includes('HABIT'))
    );

    // === DAY OVERVIEW MODE ===
    if (isDayOverview) {
        const sections = parseDayOverview(text);

        if (sections.length > 0) {
            return (
                <div>
                    {sections.map((section, idx) => {
                        const items = section.items.filter((item) => !item.isEmpty);
                        return (
                            <section key={idx} className="rich-card">
                                <h4 className="rich-card__title">{titleCase(section.header)}</h4>
                                {items.length === 0 ? (
                                    <div className="rich-list">
                                        <p className="rich-list__empty">{section.items[0]?.text || 'Nothing here.'}</p>
                                    </div>
                                ) : section.type === 'schedule' ? (
                                    <ScheduleRows items={items} />
                                ) : (
                                    <div className="rich-list">
                                        {items.map((item, iIdx) => (
                                            <div key={iIdx} className="rich-list__row">
                                                {section.type === 'habits' && <span className="rich-list__circle" aria-hidden="true" />}
                                                <span className="rich-list__copy">
                                                    <span className="rich-list__title">{item.text}</span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>
            );
        }
    }

    // === DETECT SCHEDULE ONLY ===
    const isScheduleOnly = renderMode === 'schedule' && text.toLowerCase().includes('schedule') &&
        !text.toUpperCase().includes('HABIT') &&
        !text.toUpperCase().includes('TASK DUE');
    if (isScheduleOnly) {
        const lines = text.split('\n').filter(l => l.trim());
        const scheduleItems = lines
            .filter(l => l.match(/at\s*\d{1,2}:\d{2}/i) || l.match(/\d{1,2}:\d{2}\s*[-–]/))
            .map(l => ({ text: cleanText(l.replace(/^[•\-◦]\s*/, '')) }));

        if (scheduleItems.length > 0) {
            return (
                <section className="rich-card">
                    <h4 className="rich-card__title">Today</h4>
                    <ScheduleRows items={scheduleItems} />
                </section>
            );
        }
    }

    // === DETECT PROJECTS ===
    const hasProjects = renderMode === 'projects' && text.includes('% done') && text.includes('task');
    if (hasProjects) {
        const pattern = /"([^"]+)"\s*\((\d+)%\s*done,?\s*(\d+)\s*tasks?\)/gi;
        const projects = [];
        let match;
        while ((match = pattern.exec(text)) !== null) {
            projects.push({ name: match[1], progress: parseInt(match[2]), tasks: parseInt(match[3]) });
        }

        if (projects.length > 0) {
            return (
                <section className="rich-card">
                    <h4 className="rich-card__title">Projects</h4>
                    <div className="rich-list">
                        {projects.map((project, idx) => (
                            <div key={idx} className="rich-list__row">
                                <span className="rich-list__copy">
                                    <span className="rich-list__title">{project.name}</span>
                                    <span className="rich-list__meta">{project.tasks} {project.tasks === 1 ? 'task' : 'tasks'}</span>
                                    <span className="rich-list__bar" aria-hidden="true"><i style={{ width: `${project.progress}%` }} /></span>
                                </span>
                                <span className="rich-list__value">{project.progress}%</span>
                            </div>
                        ))}
                    </div>
                </section>
            );
        }
    }

    // === DETECT TASKS ===
    const hasTasks = renderMode === 'tasks' && (
        text.toLowerCase().includes('pending task') || (text.includes('(due:') && text.includes('•'))
    );
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
                <section className="rich-card">
                    <h4 className="rich-card__title">Open Tasks</h4>
                    <div className="rich-list">
                        {tasks.map((task, idx) => (
                            <div key={idx} className="rich-list__row">
                                <span className="rich-list__circle" aria-hidden="true" />
                                <span className="rich-list__copy">
                                    <span className="rich-list__title">{task.name}</span>
                                    {task.dueDate && <span className="rich-list__meta">Due {task.dueDate}</span>}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            );
        }
    }

    // === DETECT HABITS ===
    const hasHabits = renderMode === 'habits' && text.toLowerCase().includes('habit') && !text.includes('% done');
    if (hasHabits) {
        const listMatch = text.match(/(?:complete today|left to complete|habits?:?)\s*:?\s*([^.]+)/i);
        if (listMatch) {
            const habits = listMatch[1].replace(/,?\s+and\s+/gi, ',').split(/,\s*/).map(s => s.trim()).filter(s => s.length > 0 && s.length < 50);
            if (habits.length > 0) {
                return (
                    <section className="rich-card">
                        <h4 className="rich-card__title">Habits Left Today</h4>
                        <div className="rich-list">
                            {habits.map((habit, idx) => (
                                <div key={idx} className="rich-list__row">
                                    <span className="rich-list__circle" aria-hidden="true" />
                                    <span className="rich-list__copy">
                                        <span className="rich-list__title">{habit}</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
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
        <div className="rich-text">
            {sections.map((section, sIdx) => (
                <div key={sIdx} className="rich-text__section">
                    {section.header && <h4 className="rich-text__header">{section.header}</h4>}
                    {section.items.map((item, iIdx) => (
                        item.type === 'bullet' ? (
                            <p key={iIdx} className="rich-text__bullet">
                                <Circle size={5} aria-hidden="true" />
                                <span>{item.content}</span>
                            </p>
                        ) : (
                            <p key={iIdx} className="rich-text__text">{item.content}</p>
                        )
                    ))}
                </div>
            ))}
        </div>
    );
};

export default RichTextRenderer;
