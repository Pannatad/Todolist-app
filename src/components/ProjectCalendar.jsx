import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ListFilter } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { MenuButton, PageHeader } from '../ui';

// iOS system colors, one per project in list order.
const PROJECT_TINTS = ['#ff2d55', '#af52de', '#007aff', '#30b0c7', '#34c759', '#ff9500'];
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

export const ProjectCalendar = ({ onBack }) => {
    const { projects } = useProject();
    const today = new Date();
    const [month, setMonth] = useState(() => startOfMonth(today));
    const [selectedDay, setSelectedDay] = useState(today.getDate());
    const [hiddenProjectIds, setHiddenProjectIds] = useState([]);

    const projectsWithPhases = useMemo(
        () => projects.filter((project) => project.phases && project.phases.length > 0),
        [projects]
    );

    const deadlinesByDay = useMemo(() => {
        const byDay = new Map();
        projectsWithPhases.forEach((project, projectIndex) => {
            if (hiddenProjectIds.includes(project.id)) return;
            project.phases.forEach((phase) => {
                if (!phase.deadline) return;
                const deadline = new Date(phase.deadline);
                if (deadline.getMonth() !== month.getMonth() || deadline.getFullYear() !== month.getFullYear()) return;
                const day = deadline.getDate();
                if (!byDay.has(day)) byDay.set(day, []);
                byDay.get(day).push({
                    id: `${project.id}-${phase.id || phase.name}`,
                    day,
                    phaseName: phase.name,
                    projectTitle: project.title,
                    tint: PROJECT_TINTS[projectIndex % PROJECT_TINTS.length],
                });
            });
        });
        return byDay;
    }, [projectsWithPhases, hiddenProjectIds, month]);

    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const leadingBlanks = month.getDay();
    const isCurrentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
    const monthLabel = month.toLocaleDateString([], { month: 'long', year: 'numeric' });

    const changeMonth = (offset) => {
        const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
        setMonth(next);
        const nextIsCurrent = next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth();
        setSelectedDay(nextIsCurrent ? today.getDate() : null);
    };

    const toggleProject = (projectId) => {
        setHiddenProjectIds((current) => (
            current.includes(projectId)
                ? current.filter((id) => id !== projectId)
                : [...current, projectId]
        ));
    };

    const listedDeadlines = selectedDay
        ? deadlinesByDay.get(selectedDay) || []
        : [...deadlinesByDay.values()].flat().sort((a, b) => a.day - b.day);
    const listTitle = selectedDay
        ? new Date(month.getFullYear(), month.getMonth(), selectedDay).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
        : 'This Month';

    return (
        <div className="project-calendar push-enter">
            <PageHeader
                title="Calendar"
                onBack={onBack}
                backLabel="Projects"
                showAccount={false}
                actions={projectsWithPhases.length > 1 ? (
                    <MenuButton
                        icon={ListFilter}
                        label="Show projects"
                        sections={[{
                            title: 'Show',
                            items: projectsWithPhases.map((project) => ({
                                id: project.id,
                                label: project.title,
                                checked: !hiddenProjectIds.includes(project.id),
                                onSelect: () => toggleProject(project.id),
                            })),
                        }]}
                    />
                ) : null}
            />

            <section className="ui-card project-calendar__month" aria-label={monthLabel}>
                <div className="project-calendar__nav">
                    <h2>{monthLabel}</h2>
                    <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
                        <ChevronLeft size={20} />
                    </button>
                    <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="project-calendar__weekdays" aria-hidden="true">
                    {WEEKDAY_LETTERS.map((letter, index) => <span key={index}>{letter}</span>)}
                </div>

                <div className="project-calendar__grid">
                    {Array.from({ length: leadingBlanks }, (_, index) => <span key={`blank-${index}`} />)}
                    {Array.from({ length: daysInMonth }, (_, index) => {
                        const day = index + 1;
                        const deadlines = deadlinesByDay.get(day) || [];
                        const isToday = isCurrentMonth && day === today.getDate();
                        const isSelected = day === selectedDay;
                        return (
                            <button
                                key={day}
                                type="button"
                                className={`project-calendar__day${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}`}
                                aria-pressed={isSelected}
                                aria-label={`${day}${deadlines.length ? `, ${deadlines.length} deadline${deadlines.length !== 1 ? 's' : ''}` : ''}`}
                                onClick={() => setSelectedDay(isSelected ? null : day)}
                            >
                                <span className="project-calendar__number">{day}</span>
                                <span className="project-calendar__dots" aria-hidden="true">
                                    {deadlines.slice(0, 3).map((deadline) => (
                                        <i key={deadline.id} style={{ background: deadline.tint }} />
                                    ))}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            <div className="ui-section-title">
                <h2>{listTitle}</h2>
            </div>
            {listedDeadlines.length > 0 ? (
                <div className="ui-group">
                    {listedDeadlines.map((deadline) => (
                        <div key={deadline.id} className="ui-list-row project-calendar__row">
                            <i className="project-calendar__tint" style={{ background: deadline.tint }} aria-hidden="true" />
                            <span className="ui-list-row__copy">
                                <span className="ui-list-row__title">{deadline.phaseName}</span>
                                <span className="ui-list-row__subtitle">
                                    {selectedDay
                                        ? deadline.projectTitle
                                        : `${deadline.projectTitle} · ${new Date(month.getFullYear(), month.getMonth(), deadline.day).toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
                                </span>
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="ui-empty-card">No deadlines.</p>
            )}
        </div>
    );
};
