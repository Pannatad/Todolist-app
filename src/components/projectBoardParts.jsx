import React from 'react';
import {
    ArrowUpRight,
    Check,
    ChevronDown,
    ChevronRight,
    Edit3,
    Loader2,
    Map,
    MoreHorizontal,
    Pin,
    PinOff,
    Plus,
    Sparkles,
    Trash2,
    X,
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

const ProjectTreeCard = ({
    project,
    activePhaseId,
    isMenuOpen,
    onOpenBoard,
    onOpenMindMap,
    onTogglePhase,
    onToggleMenu,
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
        <article className="relative pt-8 md:pt-12">
            <div className="absolute left-1/2 top-0 hidden h-12 w-px bg-slate-300 dark:bg-white/20 md:block" />
            <div className="ios-codex-card p-4 transition-colors">
                <div className="flex items-start justify-between gap-3">
                    <button
                        onClick={() => onOpenBoard(project.id)}
                        className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
                    >
                        <span className="rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-white/10 dark:text-bone-100">
                            {React.createElement(CategoryIcon, { className: 'h-5 w-5' })}
                        </span>
                        <span className="min-w-0">
                            <span className="flex min-w-0 items-center gap-2">
                                <span className="truncate text-lg font-bold text-slate-950 dark:text-bone-100">{project.title}</span>
                                {project.isPinned && <Pin className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500" />}
                                {project.isAIGenerated !== false && <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" />}
                            </span>
                            <span className="mt-1 block truncate text-xs font-semibold text-slate-500 dark:text-bone-200/60">
                                {project.category || 'General'} / {stats.remaining} open / {formatDeadlineStatus(deadline)}
                            </span>
                        </span>
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                        <button
                            onClick={(event) => onEditProject(event, project)}
                            className="ios-codex-icon-button rounded-lg p-2"
                            title="Edit project plan"
                        >
                            <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={(event) => onToggleMenu(event, project.id)}
                            className="ios-codex-icon-button rounded-lg p-2"
                            title="Project actions"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="mt-5">
                    <div className="relative space-y-3 pl-5">
                        <div className="absolute bottom-4 left-2 top-2 w-px bg-slate-200 dark:bg-white/10" />
                        {phases.map((phase, index) => {
                            const phaseStats = getPhaseStats(project, phase);
                            const isOpen = activePhaseId === phase.id;

                            return (
                                <div key={phase.id} className="relative">
                                    <span className="absolute -left-5 top-4 h-px w-5 bg-slate-200 dark:bg-white/10" />
                                    <button
                                        onClick={(event) => onTogglePhase(event, project.id, phase.id)}
                                        className="ios-codex-tree-row flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                                    >
                                        <span className="flex min-w-0 items-center gap-2">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-xs font-bold text-slate-600 shadow-sm dark:bg-white/10 dark:text-bone-100">
                                                {index + 1}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-bold text-slate-900 dark:text-bone-100">{phase.name}</span>
                                                <span className="block truncate text-xs text-slate-500 dark:text-bone-200/60">
                                                    {phaseStats.completed}/{phaseStats.tasks.length} tasks / {formatDeadlineStatus(phase.deadline)}
                                                </span>
                                            </span>
                                        </span>
                                        <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-500 dark:text-bone-200/60">
                                            {phaseStats.progress}%
                                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        </span>
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
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                    <button
                        onClick={() => onOpenBoard(project.id)}
                        className="ios-codex-button ios-codex-button-primary inline-flex flex-1 items-center justify-center gap-2"
                    >
                        <ArrowUpRight className="h-4 w-4" />
                        Board
                    </button>
                    <button
                        onClick={() => onOpenMindMap(project.id)}
                        className="ios-codex-button inline-flex items-center justify-center p-2"
                        title="Open mind map"
                    >
                        <Map className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {isMenuOpen && (
                <div className="absolute right-4 top-14 z-20 min-w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-void-900">
                    <button
                        onClick={(event) => onCompleteProject(event, project.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-bone-100 dark:hover:bg-white/10"
                    >
                        <Check className="h-4 w-4 text-emerald-500" />
                        {project.status === 'completed' ? 'Mark Active' : 'Mark Complete'}
                    </button>
                    <button
                        onClick={(event) => onPinProject(event, project.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-bone-100 dark:hover:bg-white/10"
                    >
                        {project.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        {project.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                        onClick={(event) => onDeleteProject(event, project.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete
                    </button>
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
        <div className="ml-8 mt-2 space-y-2 border-l border-slate-200 pl-4 dark:border-white/10">
            {sortedTasks.length > 0 ? (
                sortedTasks.slice(0, 5).map((task) => {
                    const done = isTaskDone(task, project);

                    return (
                        <button
                            key={task.id}
                            onClick={() => onOpenBoard(project.id, phase.id)}
                            className="relative flex w-full items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500 dark:border-white/10 dark:bg-void-900 dark:hover:bg-void-800"
                        >
                            <span className="absolute -left-4 top-4 h-px w-4 bg-slate-200 dark:bg-white/10" />
                            <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white dark:border-white/20 dark:bg-void-800'}`}>
                                {done && <Check className="h-3 w-3" />}
                            </span>
                            <span className="min-w-0">
                                <span className={`block truncate text-sm font-semibold ${done ? 'text-slate-400 line-through dark:text-bone-200/40' : 'text-slate-800 dark:text-bone-100'}`}>
                                    {task.title}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-bone-200/60">
                                    {task.priority || 'Normal'} priority
                                </span>
                            </span>
                        </button>
                    );
                })
            ) : (
                <div className="relative rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-500 dark:border-white/10 dark:bg-void-900 dark:text-bone-200/60">
                    <span className="absolute -left-4 top-4 h-px w-4 bg-slate-200 dark:bg-white/10" />
                    No tasks in this stage yet.
                </div>
            )}
            {sortedTasks.length > 5 && (
                <button
                    onClick={() => onOpenBoard(project.id, phase.id)}
                    className="text-sm font-semibold text-sage-700 hover:text-sage-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500 dark:text-sage-300"
                >
                    Open {sortedTasks.length - 5} more tasks
                </button>
            )}
        </div>
    );
};

const EmptyProjectMap = ({ onCreateManual, onCreateAI }) => (
    <div className="mx-auto mt-4 flex min-h-[360px] max-w-xl flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center dark:border-white/10 dark:bg-void-900">
        <Sparkles className="h-10 w-10 text-slate-400" />
        <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-bone-100">No projects yet</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-bone-200/60">
            Create a project, then this page will map it into stages and tasks.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
                onClick={onCreateManual}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
            >
                <Plus className="h-4 w-4" />
                Manual
            </button>
            <button
                onClick={onCreateAI}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
            >
                <Sparkles className="h-4 w-4" />
                AI Project
            </button>
        </div>
    </div>
);

const ProjectPlanModal = ({ title, submitLabel, data, setData, onSubmit, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
        <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-void-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
                <div>
                    <h3 className="text-xl font-bold text-slate-950 dark:text-bone-100">{title}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-bone-200/60">Vision, notes, and timeline live with the project.</p>
                </div>
                <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <form onSubmit={onSubmit} className="max-h-[calc(92vh-80px)] overflow-y-auto p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Project title">
                        <input
                            type="text"
                            value={data.title}
                            onChange={(event) => setData({ ...data, title: event.target.value })}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-void-800 dark:text-bone-100"
                            placeholder="Project name"
                            autoFocus
                            required
                        />
                    </FormField>
                    <FormField label="Category">
                        <select
                            value={data.category}
                            onChange={(event) => setData({ ...data, category: event.target.value })}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-void-800 dark:text-bone-100"
                        >
                            {CATEGORIES.map((category) => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </FormField>
                </div>

                <div className="mt-4">
                    <FormField label="Vision">
                        <textarea
                            value={data.vision}
                            onChange={(event) => setData({ ...data, vision: event.target.value })}
                            className="h-28 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-void-800 dark:text-bone-100"
                            placeholder="What does done look like, and why does this matter?"
                        />
                    </FormField>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_180px]">
                    <FormField label="Notes">
                        <textarea
                            value={data.notes}
                            onChange={(event) => setData({ ...data, notes: event.target.value })}
                            className="h-28 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-void-800 dark:text-bone-100"
                            placeholder="Constraints, decisions, links, assumptions..."
                        />
                    </FormField>
                    <FormField label="Deadline">
                        <input
                            type="date"
                            value={data.deadline || ''}
                            onChange={(event) => setData({ ...data, deadline: event.target.value })}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-void-800 dark:text-bone-100"
                        />
                    </FormField>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-void-800 dark:text-bone-100 dark:hover:bg-void-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-sage-500 dark:text-void-950 dark:hover:bg-sage-400"
                    >
                        {submitLabel}
                    </button>
                </div>
            </form>
        </div>
    </div>
);

const AIProjectModal = ({ prompt, setPrompt, category, setCategory, onClose, onSubmit, isGenerating }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
        <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-void-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-950 dark:text-bone-100">AI Project Architect</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-bone-200/60">Turn a project vision into phases and tasks.</p>
                    </div>
                </div>
                <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <form onSubmit={onSubmit} className="p-5">
                <FormField label="Project vision">
                    <textarea
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        className="h-32 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-void-800 dark:text-bone-100"
                        placeholder="Example: build a stock market simulator in Python with portfolio tracking and replay mode"
                        autoFocus
                    />
                </FormField>

                <div className="mt-4">
                    <div className="mb-2 text-sm font-semibold text-slate-700 dark:text-bone-200">Category</div>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setCategory(item)}
                                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${category === item
                                    ? 'border-slate-900 bg-slate-950 text-white dark:border-sage-400 dark:bg-sage-500 dark:text-void-950'
                                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-void-800 dark:text-bone-100 dark:hover:bg-void-700'
                                    }`}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-void-800 dark:text-bone-100 dark:hover:bg-void-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!prompt.trim() || isGenerating}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sage-500 dark:text-void-950 dark:hover:bg-sage-400"
                    >
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Create Project
                    </button>
                </div>
            </form>
        </div>
    </div>
);

const FormField = ({ label, children }) => (
    <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-bone-200">{label}</span>
        {children}
    </label>
);


export { AIProjectModal, EmptyProjectMap, ProjectPlanModal, ProjectTreeCard };

