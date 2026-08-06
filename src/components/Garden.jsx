import React, { useEffect, useState } from 'react';
import { getTaskChunkEstimate, isTaskActive, isTaskCompleted, normalizeTaskSubtasks } from '../utils/taskState';
import { toast } from '../ui/Toast';
import GardenContent from './GardenContent';

const toDateInputValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const toTimeInputValue = (value) => {
    if (!value) return '09:00';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '09:00';
    return date.toTimeString().slice(0, 5);
};

const Garden = ({ tasks, onCompleteTask, onDeleteTask, onUpdateTask, onRestoreTask, onRequestAIHelp, existingSubjects = [] }) => {
    const [sortBy, setSortBy] = useState('deadline');
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [selectedTaskId, setSelectedTaskId] = useState(() => {
        try {
            return localStorage.getItem('growth-selected-task-id');
        } catch {
            return null;
        }
    });
    const [newChunkTitle, setNewChunkTitle] = useState('');
    const [newChunkEstimate, setNewChunkEstimate] = useState('');
    const [orderedChunks, setOrderedChunks] = useState([]);
    const [expandedChunkIds, setExpandedChunkIds] = useState(() => new Set());
    const [newNestedDrafts, setNewNestedDrafts] = useState({});
    const [taskDraft, setTaskDraft] = useState({
        title: '',
        date: '',
        time: '09:00',
        subject: ''
    });
    const [isTaskDraftDirty, setIsTaskDraftDirty] = useState(false);
    const [isTaskSaving, setIsTaskSaving] = useState(false);
    const [focusTask, setFocusTask] = useState(null);
    const [showRelativeDue, setShowRelativeDue] = useState(false);

    // Filter tasks by subject
    const filteredTasks = selectedSubject === 'all'
        ? tasks
        : tasks.filter(task => task.subject === selectedSubject);

    const activeTasks = filteredTasks.filter(isTaskActive);
    const completedTasks = filteredTasks.filter(isTaskCompleted);
    const selectedTask = tasks.find(task => String(task.id) === String(selectedTaskId) && isTaskActive(task));
    const selectedTaskTitle = selectedTask?.title || '';
    const selectedTaskDeadline = selectedTask?.deadline || null;
    const selectedTaskSubject = selectedTask?.subject || '';
    const selectedChunks = normalizeTaskSubtasks(selectedTask?.subtasks);
    const selectedChunkKey = JSON.stringify(selectedChunks);
    const hasMatchingOrderedChunks = orderedChunks.length === selectedChunks.length
        && orderedChunks.every(chunk => selectedChunks.some(selectedChunk => selectedChunk.id === chunk.id));
    const visibleChunks = hasMatchingOrderedChunks ? orderedChunks : selectedChunks;
    const completedChunks = selectedChunks.filter(chunk => chunk.completed).length;
    const chunkTotalMinutes = getTaskChunkEstimate(selectedTask);

    const formatEstimatedTime = (minutes) => {
        if (!minutes) return null;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
        if (hours > 0) return `${hours}h`;
        return `${mins}m`;
    };

    useEffect(() => {
        if (selectedTaskId && !tasks.some(task => String(task.id) === String(selectedTaskId) && isTaskActive(task))) {
            setSelectedTaskId(null);
            setNewChunkTitle('');
            setNewChunkEstimate('');
            setExpandedChunkIds(new Set());
            setNewNestedDrafts({});
            localStorage.removeItem('growth-selected-task-id');
        }
    }, [selectedTaskId, tasks]);

    useEffect(() => {
        if (selectedTaskId) {
            localStorage.setItem('growth-selected-task-id', selectedTaskId);
        } else {
            localStorage.removeItem('growth-selected-task-id');
        }
    }, [selectedTaskId]);

    useEffect(() => {
        setOrderedChunks(selectedChunks);
    // selectedChunks is derived anew each render; selectedChunkKey tracks its meaningful changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTask?.id, selectedChunkKey]);

    useEffect(() => {
        if (!selectedTask) {
            setTaskDraft({
                title: '',
                date: '',
                time: '09:00',
                subject: ''
            });
            setIsTaskDraftDirty(false);
            setIsTaskSaving(false);
            return;
        }

        setTaskDraft({
            title: selectedTaskTitle,
            date: toDateInputValue(selectedTaskDeadline),
            time: toTimeInputValue(selectedTaskDeadline),
            subject: selectedTaskSubject
        });
        setIsTaskDraftDirty(false);
        setIsTaskSaving(false);
    // selectedTask fields below are the values that should refresh this draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTask?.id, selectedTaskDeadline, selectedTaskSubject, selectedTaskTitle]);

    const updateTaskDraft = (updates) => {
        setTaskDraft(prev => ({ ...prev, ...updates }));
        setIsTaskDraftDirty(true);
    };

    const handleSelectTask = (taskId) => {
        setSelectedTaskId(taskId);
        setNewChunkTitle('');
        setNewChunkEstimate('');
        setExpandedChunkIds(new Set());
        setNewNestedDrafts({});
    };

    const updateSelectedChunks = (chunks) => {
        if (!selectedTask) return;
        onUpdateTask(selectedTask.id, { subtasks: normalizeTaskSubtasks(chunks) });
    };

    const addChunk = () => {
        if (!selectedTask || !newChunkTitle.trim()) return;
        const estimate = parseInt(newChunkEstimate, 10);
        updateSelectedChunks([
            ...visibleChunks,
            {
                id: crypto.randomUUID(),
                title: newChunkTitle.trim(),
                estimatedTime: Number.isFinite(estimate) && estimate > 0 ? estimate : 0,
                completed: false
            }
        ]);
        setNewChunkTitle('');
        setNewChunkEstimate('');
    };

    const updateChunk = (chunkId, updates) => {
        updateSelectedChunks(visibleChunks.map(chunk => (
            chunk.id === chunkId ? { ...chunk, ...updates } : chunk
        )));
    };

    const toggleChunkExpanded = (chunkId) => {
        setExpandedChunkIds(prev => {
            const next = new Set(prev);
            if (next.has(chunkId)) next.delete(chunkId);
            else next.add(chunkId);
            return next;
        });
    };

    const updateNestedDraft = (chunkId, updates) => {
        setNewNestedDrafts(prev => ({
            ...prev,
            [chunkId]: {
                title: '',
                estimatedTime: '',
                ...(prev[chunkId] || {}),
                ...updates
            }
        }));
    };

    const addNestedSubtask = (chunkId) => {
        const draft = newNestedDrafts[chunkId] || { title: '', estimatedTime: '' };
        if (!draft.title?.trim()) return;

        const estimate = parseInt(draft.estimatedTime, 10);
        updateSelectedChunks(visibleChunks.map(chunk => {
            if (chunk.id !== chunkId) return chunk;
            const nextNestedSubtasks = [
                ...normalizeTaskSubtasks(chunk.subtasks),
                {
                    id: crypto.randomUUID(),
                    title: draft.title.trim(),
                    estimatedTime: Number.isFinite(estimate) && estimate > 0 ? estimate : 0,
                    completed: false
                }
            ];

            return {
                ...chunk,
                estimatedTime: nextNestedSubtasks.reduce((total, nestedSubtask) => total + nestedSubtask.estimatedTime, 0),
                subtasks: nextNestedSubtasks
            };
        }));
        setNewNestedDrafts(prev => ({
            ...prev,
            [chunkId]: { title: '', estimatedTime: '' }
        }));
        setExpandedChunkIds(prev => new Set(prev).add(chunkId));
    };

    const updateNestedSubtask = (chunkId, nestedSubtaskId, updates) => {
        updateSelectedChunks(visibleChunks.map(chunk => {
            if (chunk.id !== chunkId) return chunk;
            const nextNestedSubtasks = normalizeTaskSubtasks(
                normalizeTaskSubtasks(chunk.subtasks).map(nestedSubtask => (
                    nestedSubtask.id === nestedSubtaskId ? { ...nestedSubtask, ...updates } : nestedSubtask
                ))
            );

            return {
                ...chunk,
                estimatedTime: nextNestedSubtasks.length > 0
                    ? nextNestedSubtasks.reduce((total, nestedSubtask) => total + nestedSubtask.estimatedTime, 0)
                    : 0,
                subtasks: nextNestedSubtasks
            };
        }));
    };

    const deleteNestedSubtask = (chunkId, nestedSubtaskId) => {
        updateSelectedChunks(visibleChunks.map(chunk => {
            if (chunk.id !== chunkId) return chunk;
            const nextNestedSubtasks = normalizeTaskSubtasks(chunk.subtasks)
                .filter(nestedSubtask => nestedSubtask.id !== nestedSubtaskId);

            return {
                ...chunk,
                estimatedTime: nextNestedSubtasks.length > 0
                    ? nextNestedSubtasks.reduce((total, nestedSubtask) => total + nestedSubtask.estimatedTime, 0)
                    : 0,
                subtasks: nextNestedSubtasks
            };
        }));
    };

    const reorderChunks = (chunks) => {
        setOrderedChunks(chunks);
        updateSelectedChunks(chunks);
    };

    const saveChunkOrder = () => {
        updateSelectedChunks(visibleChunks);
    };

    const deleteChunk = (chunkId) => {
        updateSelectedChunks(visibleChunks.filter(chunk => chunk.id !== chunkId));
    };

    const saveTaskDetails = async () => {
        if (!selectedTask || !taskDraft.title.trim() || isTaskSaving) return;

        const deadline = taskDraft.date
            ? new Date(`${taskDraft.date}T${taskDraft.time || '09:00'}`).toISOString()
            : null;

        setIsTaskSaving(true);
        try {
            await onUpdateTask(selectedTask.id, {
                title: taskDraft.title.trim(),
                deadline,
                subject: taskDraft.subject.trim() || null
            });
            setIsTaskDraftDirty(false);
        } catch (error) {
            console.error('Failed to save task details:', error);
            toast(error?.message || 'Could not save this task.', { tone: 'error' });
        } finally {
            setIsTaskSaving(false);
        }
    };

    const clearSelectedTask = () => {
        setSelectedTaskId(null);
        setNewChunkTitle('');
        setNewChunkEstimate('');
        setExpandedChunkIds(new Set());
        setNewNestedDrafts({});
        localStorage.removeItem('growth-selected-task-id');
    };

    // Sorting Logic
    const sortedTasks = [...activeTasks].sort((a, b) => {
        if (sortBy === 'deadline') {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
        }
        if (sortBy === 'chunkTime') {
            const timeA = getTaskChunkEstimate(a) || Infinity;
            const timeB = getTaskChunkEstimate(b) || Infinity;
            return timeA - timeB;
        }
        return new Date(b.created_at || Number(b.id) || 0) - new Date(a.created_at || Number(a.id) || 0);
    });

    // Get unique subjects
    const uniqueSubjects = [...new Set(tasks.map(t => t.subject).filter(Boolean))];
    return (
        <GardenContent
            view={{
                activeTasks, addChunk, addNestedSubtask,
                chunkTotalMinutes, clearSelectedTask, completedChunks, completedTasks, deleteChunk, deleteNestedSubtask,
                existingSubjects, expandedChunkIds, focusTask, formatEstimatedTime,
                handleSelectTask, isTaskDraftDirty, isTaskSaving, newChunkEstimate,
                newChunkTitle, newNestedDrafts, onCompleteTask, onDeleteTask, onRequestAIHelp, onRestoreTask,
                onUpdateTask, orderedChunks, reorderChunks, saveChunkOrder, selectedChunks,
                selectedSubject, selectedTask, selectedTaskId, setFocusTask,
                setNewChunkEstimate, setNewChunkTitle, setSelectedSubject,
                setSortBy, showRelativeDue, sortedTasks, sortBy,
                saveTaskDetails, taskDraft, toggleChunkExpanded, uniqueSubjects, updateChunk, updateNestedSubtask, updateNestedDraft,
                updateTaskDraft, visibleChunks, toggleDueMode: () => setShowRelativeDue((shown) => !shown),
            }}
        />
    );
};

export default Garden;
