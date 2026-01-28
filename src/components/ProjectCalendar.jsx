import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, ArrowLeft } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

export const ProjectCalendar = ({ onBack }) => {
    const { projects } = useProject();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedProjects, setSelectedProjects] = useState([]);
    const [showFilter, setShowFilter] = useState(false);

    // Get all projects with phases
    const projectsWithPhases = useMemo(() => {
        return projects.filter(p => p.phases && p.phases.length > 0);
    }, [projects]);

    // Navigate months
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Get calendar data
    const { monthName, year, daysInMonth, firstDayOfMonth } = useMemo(() => {
        const monthName = currentDate.toLocaleString('default', { month: 'long' });
        const year = currentDate.getFullYear();
        const daysInMonth = new Date(year, currentDate.getMonth() + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, currentDate.getMonth(), 1).getDay();

        return { monthName, year, daysInMonth, firstDayOfMonth };
    }, [currentDate]);

    // Project color mapping - uses project index to ensure same project = same color
    const projectColors = [
        'from-pink-400/40 to-rose-400/30',
        'from-purple-400/40 to-violet-400/30',
        'from-blue-400/40 to-indigo-400/30',
        'from-cyan-400/40 to-teal-400/30',
        'from-emerald-400/40 to-green-400/30',
        'from-amber-400/40 to-orange-400/30',
    ];

    const getProjectColor = (projectId) => {
        const projectIndex = projectsWithPhases.findIndex(p => p.id === projectId);
        return projectColors[projectIndex % projectColors.length];
    };

    // Get phase deadlines for the current month
    const phaseDeadlines = useMemo(() => {
        const deadlines = new Map();

        const filteredProjects = selectedProjects.length > 0
            ? projectsWithPhases.filter(p => selectedProjects.includes(p.id))
            : projectsWithPhases;

        filteredProjects.forEach(project => {
            project.phases.forEach((phase, index) => {
                if (!phase.deadline) return;

                const deadlineDate = new Date(phase.deadline);
                if (deadlineDate.getMonth() === currentDate.getMonth() &&
                    deadlineDate.getFullYear() === currentDate.getFullYear()) {

                    const day = deadlineDate.getDate();
                    if (!deadlines.has(day)) {
                        deadlines.set(day, []);
                    }

                    deadlines.get(day).push({
                        projectTitle: project.title,
                        projectId: project.id,
                        phaseName: phase.name,
                        phaseIndex: index,
                        color: getProjectColor(project.id)
                    });
                }
            });
        });

        return deadlines;
    }, [currentDate, projectsWithPhases, selectedProjects]);

    // Toggle project filter
    const toggleProjectFilter = (projectId) => {
        setSelectedProjects(prev => {
            if (prev.includes(projectId)) {
                return prev.filter(id => id !== projectId);
            } else {
                return [...prev, projectId];
            }
        });
    };

    // Generate calendar grid
    const calendarDays = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(<div key={`empty-${i}`} className="min-h-24" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayDeadlines = phaseDeadlines.get(day) || [];
        const isToday = new Date().getDate() === day &&
            new Date().getMonth() === currentDate.getMonth() &&
            new Date().getFullYear() === currentDate.getFullYear();

        calendarDays.push(
            <div
                key={day}
                className={`min-h-24 p-2 bg-white/20 backdrop-blur-xl rounded-xl border transition-all ${isToday ? 'border-white/60 ring-2 ring-white/40' : 'border-white/30'
                    } hover:bg-white/30`}
            >
                <div className={`text-sm font-bold mb-1 ${isToday ? 'text-white' : 'text-white/90'}`}>
                    {day}
                </div>
                <div className="space-y-1">
                    {dayDeadlines.slice(0, 3).map((deadline, idx) => (
                        <div
                            key={idx}
                            className={`text-[10px] px-2 py-1 rounded-lg bg-gradient-to-r ${deadline.color} backdrop-blur-md border border-white/30 text-white font-medium truncate`}
                            title={`${deadline.projectTitle} - ${deadline.phaseName}`}
                        >
                            {deadline.phaseName}
                        </div>
                    ))}
                    {dayDeadlines.length > 3 && (
                        <div className="text-[9px] text-white/70 text-center">
                            +{dayDeadlines.length - 3} more
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-4 md:p-8 overflow-y-auto custom-scrollbar bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 rounded-2xl">
            {/* Header */}
            <div className="relative z-10 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {/* Back Button */}
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-2 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl hover:bg-white/30 transition-all"
                                title="Back to Projects"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <CalendarIcon className="w-8 h-8 text-white" />
                        <h1 className="text-3xl font-bold text-white">Project Calendar</h1>
                    </div>

                    <button
                        onClick={() => setShowFilter(!showFilter)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl hover:bg-white/30 transition-all"
                    >
                        <Filter className="w-4 h-4" />
                        Filter Projects
                    </button>
                </div>

                {/* Month Navigation */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={goToPreviousMonth}
                        className="p-2 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl hover:bg-white/30 transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <h2 className="text-2xl font-bold text-white">
                        {monthName} {year}
                    </h2>

                    <button
                        onClick={goToNextMonth}
                        className="p-2 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl hover:bg-white/30 transition-all"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Project Filter */}
                {showFilter && (
                    <div className="mt-4 p-4 bg-white/20 backdrop-blur-xl rounded-xl border border-white/30">
                        <p className="text-white font-medium mb-2">Select Projects:</p>
                        <div className="flex flex-wrap gap-2">
                            {projectsWithPhases.map(project => (
                                <button
                                    key={project.id}
                                    onClick={() => toggleProjectFilter(project.id)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${selectedProjects.includes(project.id) || selectedProjects.length === 0
                                        ? 'bg-white/40 border-white/50 text-white'
                                        : 'bg-white/10 border-white/20 text-white/60'
                                        }`}
                                >
                                    {project.title}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 relative z-10">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-white font-bold text-sm py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-2">
                    {calendarDays}
                </div>
            </div>

            {/* Legend */}
            {projectsWithPhases.length > 0 && (
                <div className="mt-6 p-4 bg-white/20 backdrop-blur-xl rounded-xl border border-white/30 relative z-10">
                    <p className="text-white font-bold mb-2 text-sm">Projects:</p>
                    <div className="flex flex-wrap gap-3">
                        {projectsWithPhases.map((project, index) => (
                            <div key={project.id} className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${projectColors[index % projectColors.length]}`} />
                                <span className="text-white text-xs">{project.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
