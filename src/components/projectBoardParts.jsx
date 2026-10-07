import React from 'react';
import { RowMenu, Sheet } from '../ui';
import {
    Check,
    ChevronRight,
    Edit3,
    Loader2,
    Map,
    Pin,
    PinOff,
    Trash2,
} from 'lucide-react';
import {
    CATEGORIES,
    formatDeadlineStatus,
    getCategoryIcon,
    getPhaseStats,
    getProjectDeadline,
    getProjectStats,
    getSortedPhases,
    isTaskDone,
} from './projectBoardUtils';

// Menu actions reuse handlers written for click events.
const menuEvent = { stopPropagation: () => {} };

const ProjectTreeCard = ({
    project,
    activePhaseId,
    onOpenBoard,
    onOpenMindMap,
    onTogglePhase,
    onEditProject,
    onCompleteProject,
    onPinProject,
    onDeleteProject
}) => {
    const stats = getProjectStats(project);
    const phases = getSortedPhases(project);
    const CategoryIcon = getCategoryIcon(project.category);
    const deadline = getProjectDeadline(project);

    return (
        <article className="project-card">
            <div className="project-card__header">
                <button type="button" onClick={() => onOpenBoard(project.id)} className="project-card__identity">
                    <span className="project-card__icon" aria-hidden="true">
                        {React.createElement(CategoryIcon, { size: 18 })}
                    </span>
                    <span className="project-card__copy">
                        <span className="project-card__title">
                            {project.title}
                            {project.isPinned && <Pin size={13} className="project-card__pin" aria-label="Pinned" />}
                        </span>
                        <span className="project-card__meta">
                            {project.category || 'General'} · {stats.remaining} open · {formatDeadlineStatus(deadline)}
                        </span>
                    </span>
                </button>
                <RowMenu
                    label={`Actions for ${project.title}`}
                    items={[
                        { label: 'Edit Plan', icon: Edit3, onSelect: () => onEditProject(menuEvent, project) },
                        { label: 'Mind Map', icon: Map, onSelect: () => onOpenMindMap(project.id) },
                        { label: project.status === 'completed' ? 'Mark Active' : 'Mark Complete', icon: Check, onSelect: () => onCompleteProject(menuEvent, project.id) },
                        { label: project.isPinned ? 'Unpin' : 'Pin', icon: project.isPinned ? PinOff : Pin, onSelect: () => onPinProject(menuEvent, project.id) },
                        { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => onDeleteProject(menuEvent, project.id) },
                    ]}
                />
            </div>

            {phases.length > 0 && (
                <div className="project-card__phases">
                    {phases.map((phase, index) => {
                        const phaseStats = getPhaseStats(project, phase);
                        const isOpen = activePhaseId === phase.id;

                        return (
                            <div key={phase.id} className="project-phase">
                                <button
                                    type="button"
                                    onClick={(event) => onTogglePhase(event, project.id, phase.id)}
                                    className="project-phase__row"
                                    aria-expanded={isOpen}
                                >
                                    <span className="project-phase__index">{index + 1}</span>
                                    <span className="project-phase__copy">
                                        <span className="project-phase__name">{phase.name}</span>
                                        <span className="project-phase__meta">
                                            {phaseStats.completed}/{phaseStats.tasks.length} tasks · {formatDeadlineStatus(phase.deadline)}
                                        </span>
                                    </span>
                                    <span className="project-phase__progress">{phaseStats.progress}%</span>
                                    <ChevronRight size={16} className={`project-phase__chevron${isOpen ? ' is-open' : ''}`} aria-hidden="true" />
                                </button>

                                {isOpen && (
                                    <StageTaskBranch
                                        project={project}
                                        phase={phase}
                                        tasks={phaseStats.tasks}
                                        onOpenBoard={onOpenBoard}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </article>
    );
};

const StageTaskBranch = ({ project, phase, tasks, onOpenBoard }) => {
    const sortedTasks = [...tasks].sort((left, right) => {
        if (isTaskDone(left, project) !== isTaskDone(right, project)) return isTaskDone(left, project) ? 1 : -1;
        const priorityOrder = { High: 3, Medium: 2, Low: 1 };
        return (priorityOrder[right.priority] || 0) - (priorityOrder[left.priority] || 0);
    });

    return (
        <div className="project-branch">
            {sortedTasks.length > 0 ? (
                sortedTasks.slice(0, 5).map((task) => {
                    const done = isTaskDone(task, project);

                    return (
                        <button
                            key={task.id}
                            type="button"
                            onClick={() => onOpenBoard(project.id, phase.id)}
                            className={`project-branch__task${done ? ' is-done' : ''}`}
                        >
                            <span className="project-branch__check" aria-hidden="true">{done && <Check size={11} strokeWidth={3.2} />}</span>
                            <span className="project-branch__title">{task.title}</span>
                        </button>
                    );
                })
            ) : (
                <p className="project-branch__empty">No tasks yet.</p>
            )}
            {sortedTasks.length > 5 && (
                <button type="button" onClick={() => onOpenBoard(project.id, phase.id)} className="ui-text-button project-branch__more">
                    {sortedTasks.length - 5} more
                </button>
            )}
        </div>
    );
};

const EmptyProjectMap = ({ onCreateManual, onCreateAI }) => (
    <div className="project-empty">
        <h3>No projects yet</h3>
        <button type="button" onClick={onCreateManual} className="ui-button ui-button--accent">New Project</button>
        <button type="button" onClick={onCreateAI} className="ui-text-button">Plan with the agent</button>
    </div>
);

const ProjectPlanModal = ({ open = true, title, submitLabel, data, setData, onSubmit, onClose }) => (
    <Sheet open={open} onClose={onClose} title={title} className="form-sheet">
        <form onSubmit={onSubmit} className="form-stack">
            <div className="form-group">
                <label className="form-field">
                    <span className="sr-only">Project title</span>
                    <input
                        type="text"
                        value={data.title}
                        onChange={(event) => setData({ ...data, title: event.target.value })}
                        placeholder="Title"
                        required
                    />
                </label>
                <label className="form-field form-field--value">
                    <span className="form-field__label">Category</span>
                    <select value={data.category} onChange={(event) => setData({ ...data, category: event.target.value })}>
                        {CATEGORIES.map((category) => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                </label>
                <label className="form-field form-field--value">
                    <span className="form-field__label">Deadline</span>
                    <input
                        type="date"
                        value={data.deadline || ''}
                        onChange={(event) => setData({ ...data, deadline: event.target.value })}
                    />
                </label>
            </div>

            <p className="form-section-label">Vision</p>
            <div className="form-group">
                <label className="form-field form-field--stacked">
                    <span className="sr-only">Vision</span>
                    <textarea
                        value={data.vision}
                        onChange={(event) => setData({ ...data, vision: event.target.value })}
                        placeholder="What does done look like?"
                    />
                </label>
            </div>

            <p className="form-section-label">Notes</p>
            <div className="form-group">
                <label className="form-field form-field--stacked">
                    <span className="sr-only">Notes</span>
                    <textarea
                        value={data.notes}
                        onChange={(event) => setData({ ...data, notes: event.target.value })}
                        placeholder="Constraints, links, decisions"
                    />
                </label>
            </div>

            <button type="submit" className="ui-button ui-button--accent form-submit">{submitLabel}</button>
        </form>
    </Sheet>
);

const AIProjectModal = ({ open = true, prompt, setPrompt, category, setCategory, onClose, onSubmit, isGenerating }) => (
    <Sheet open={open} onClose={onClose} title="Plan with the Agent" className="form-sheet">
        <form onSubmit={onSubmit} className="form-stack">
            <div className="form-group">
                <label className="form-field form-field--stacked">
                    <span className="sr-only">Project vision</span>
                    <textarea
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        placeholder="Describe the project, e.g. a stock market simulator with portfolio tracking"
                    />
                </label>
            </div>

            <p className="form-section-label">Category</p>
            <div className="form-group">
                <div className="form-chips">
                    {CATEGORIES.map((item) => (
                        <button
                            key={item}
                            type="button"
                            aria-pressed={category === item}
                            onClick={() => setCategory(item)}
                            className={`form-chip${category === item ? ' is-selected' : ''}`}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </div>

            <button type="submit" disabled={!prompt.trim() || isGenerating} className="ui-button ui-button--accent form-submit">
                {isGenerating ? <><Loader2 size={18} className="animate-spin" /> Planning…</> : 'Create Project'}
            </button>
        </form>
    </Sheet>
);

export { AIProjectModal, EmptyProjectMap, ProjectPlanModal, ProjectTreeCard };

