import { Check, Star } from 'lucide-react';

const SUBTASK_SPREAD = (Math.PI * 2) / 3; // 120° fan around each task
const SUBTASK_RADIUS = 18; // % from the task node

const getSubtaskPosition = (pos, count, index) => {
    const angle = count === 1
        ? pos.angle
        : pos.angle - SUBTASK_SPREAD / 2 + (SUBTASK_SPREAD * index) / (count - 1);
    return {
        x: pos.x + SUBTASK_RADIUS * Math.cos(angle),
        y: pos.y + SUBTASK_RADIUS * Math.sin(angle),
    };
};

const ProjectMindMapGraph = ({ view }) => {
    const {
        expandedTasks,
        handleDragEnd,
        handleDragOver,
        handleDragStart,
        highlightedSubtasks,
        highlightedTasks,
        onOpenTask,
        project,
        progress,
        showHighlightedOnly,
        taskPositions,
        tasks,
        toggleSubtaskComplete,
        toggleTaskComplete,
        zoom,
    } = view;

    return (
        <div className="mindmap-graph" style={{ transform: `scale(${zoom})` }}>
            <svg className="mindmap-graph__lines" aria-hidden="true">
                {tasks.map((task, index) => {
                    const pos = taskPositions[index];
                    const subtasks = task.subtasks || [];
                    const isExpanded = expandedTasks[task.id] !== false;
                    return (
                        <g key={task.id}>
                            <line
                                x1="50%"
                                y1="50%"
                                x2={`${pos.x}%`}
                                y2={`${pos.y}%`}
                                className={task.completed ? 'is-done' : undefined}
                            />
                            {isExpanded && subtasks.map((subtask, subtaskIndex) => {
                                const leaf = getSubtaskPosition(pos, subtasks.length, subtaskIndex);
                                return (
                                    <line
                                        key={subtask.id}
                                        x1={`${pos.x}%`}
                                        y1={`${pos.y}%`}
                                        x2={`${leaf.x}%`}
                                        y2={`${leaf.y}%`}
                                        className={`is-leaf${subtask.completed ? ' is-done' : ''}`}
                                    />
                                );
                            })}
                        </g>
                    );
                })}
            </svg>

            <div className="mindmap-center">
                <strong>{progress}%</strong>
                <span>{project?.title}</span>
            </div>

            {tasks.map((task, index) => {
                const pos = taskPositions[index];
                const subtasks = task.subtasks || [];
                const isExpanded = expandedTasks[task.id] !== false;
                const isStarred = highlightedTasks.has(task.id);
                const hasStarredSubtask = subtasks.some((subtask) => highlightedSubtasks.has(`${task.id}-${subtask.id}`));
                const dimTask = showHighlightedOnly && !isStarred && !hasStarredSubtask;
                const doneSubtasks = subtasks.filter((subtask) => subtask.completed).length;

                return (
                    <div key={task.id}>
                        {subtasks.map((subtask, subtaskIndex) => {
                            const leaf = getSubtaskPosition(pos, subtasks.length, subtaskIndex);
                            const isLeafStarred = highlightedSubtasks.has(`${task.id}-${subtask.id}`);
                            const dimLeaf = showHighlightedOnly && !isLeafStarred && !isStarred;
                            return (
                                <button
                                    key={subtask.id}
                                    type="button"
                                    className={`mindmap-leaf${subtask.completed ? ' is-done' : ''}${isExpanded ? '' : ' is-collapsed'}${dimLeaf ? ' is-dim' : ''}`}
                                    style={{ left: `${leaf.x}%`, top: `${leaf.y}%` }}
                                    aria-pressed={Boolean(subtask.completed)}
                                    aria-label={`${subtask.title}${subtask.completed ? ', done' : ''}`}
                                    tabIndex={isExpanded ? 0 : -1}
                                    onClick={() => toggleSubtaskComplete(project.id, task.id, subtask.id)}
                                >
                                    <span className="mindmap-leaf__check" aria-hidden="true">
                                        {subtask.completed && <Check size={9} strokeWidth={3.4} />}
                                    </span>
                                    {subtask.title}
                                    {isLeafStarred && <Star size={10} fill="currentColor" className="mindmap-star" aria-hidden="true" />}
                                </button>
                            );
                        })}

                        <div
                            className={`mindmap-node${task.completed ? ' is-done' : ''}${dimTask ? ' is-dim' : ''}`}
                            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                            draggable
                            onDragStart={(event) => handleDragStart(event, index)}
                            onDragOver={(event) => handleDragOver(event, index)}
                            onDragEnd={handleDragEnd}
                        >
                            <button
                                type="button"
                                className="task-check mindmap-node__check"
                                aria-pressed={Boolean(task.completed)}
                                aria-label={task.completed ? `Mark ${task.title} open` : `Complete ${task.title}`}
                                onClick={() => toggleTaskComplete(project.id, task.id)}
                            >
                                <span>{task.completed && <Check size={11} strokeWidth={3.2} />}</span>
                            </button>
                            <button type="button" className="mindmap-node__body" onClick={() => onOpenTask(task.id)}>
                                <span className="mindmap-node__title">{task.title}</span>
                                {subtasks.length > 0 && <span className="mindmap-node__meta">{doneSubtasks}/{subtasks.length}</span>}
                            </button>
                            {isStarred && <Star size={12} fill="currentColor" className="mindmap-star mindmap-node__star" aria-label="Starred" />}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ProjectMindMapGraph;
