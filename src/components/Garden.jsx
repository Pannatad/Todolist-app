import React, { useEffect, useRef, useState } from 'react';
import { getColorForSubject } from '../constants/subjects';
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
    const [showSort, setShowSort] = useState(false);
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
    const [newChunkDifficulty, setNewChunkDifficulty] = useState('easy');
    const [editingChunkDifficultyId, setEditingChunkDifficultyId] = useState(null);
    const [isNewChunkDifficultyOpen, setIsNewChunkDifficultyOpen] = useState(false);
    const [orderedChunks, setOrderedChunks] = useState([]);
    const [expandedChunkIds, setExpandedChunkIds] = useState(() => new Set());
    const [newNestedDrafts, setNewNestedDrafts] = useState({});
    const [taskDraft, setTaskDraft] = useState({
        title: '',
        date: '',
        time: '09:00',
        subject: '',
        difficulty: 'easy'
    });
    const [isTaskDraftDirty, setIsTaskDraftDirty] = useState(false);
    const [isTaskSaving, setIsTaskSaving] = useState(false);
    const [focusTask, setFocusTask] = useState(null);
    const sortRef = useRef(null);

    const chunkDifficultyOptions = [
        { value: 'easy', label: 'Easy', dot: 'bg-emerald-500' },
        { value: 'medium', label: 'Medium', dot: 'bg-amber-500' },
        { value: 'hard', label: 'Hard', dot: 'bg-rose-500' },
    ];

    const getChunkDifficultyStyle = (difficulty = 'easy') => {
        const styles = {
            easy: {
                panel: 'bg-emerald-50/75 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-800/40',
                text: 'text-emerald-900 dark:text-emerald-100',
                icon: 'text-emerald-600 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/40 hover:bg-emerald-200/80 dark:hover:bg-emerald-800/60',
                activeButton: 'bg-emerald-500 text-white border-emerald-500',
                inactiveButton: 'bg-white/80 dark:bg-void-900/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
                focus: 'focus:ring-emerald-400'
            },
            medium: {
                panel: 'bg-amber-50/75 dark:bg-amber-950/20 border-amber-100 dark:border-amber-800/40',
                text: 'text-amber-950 dark:text-amber-100',
                icon: 'text-amber-600 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/40 hover:bg-amber-200/80 dark:hover:bg-amber-800/60',
                activeButton: 'bg-amber-500 text-white border-amber-500',
                inactiveButton: 'bg-white/80 dark:bg-void-900/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/40',
                focus: 'focus:ring-amber-400'
            },
            hard: {
                panel: 'bg-rose-50/75 dark:bg-rose-950/20 border-rose-100 dark:border-rose-800/40',
                text: 'text-rose-950 dark:text-rose-100',
                icon: 'text-rose-600 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-900/40 hover:bg-rose-200/80 dark:hover:bg-rose-800/60',
                activeButton: 'bg-rose-500 text-white border-rose-500',
                inactiveButton: 'bg-white/80 dark:bg-void-900/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/40',
                focus: 'focus:ring-rose-400'
            }
        };

        return styles[difficulty] || styles.easy;
    };

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
    const selectedTaskDifficulty = selectedTask?.difficulty || 'easy';
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

    // Close sort menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sortRef.current && !sortRef.current.contains(event.target)) {
                setShowSort(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (selectedTaskId && !tasks.some(task => String(task.id) === String(selectedTaskId) && isTaskActive(task))) {
            setSelectedTaskId(null);
            setNewChunkTitle('');
            setNewChunkEstimate('');
            setNewChunkDifficulty('easy');
            setEditingChunkDifficultyId(null);
            setIsNewChunkDifficultyOpen(false);
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
                subject: '',
                difficulty: 'easy'
            });
            setIsTaskDraftDirty(false);
            setIsTaskSaving(false);
            return;
        }

        setTaskDraft({
            title: selectedTaskTitle,
            date: toDateInputValue(selectedTaskDeadline),
            time: toTimeInputValue(selectedTaskDeadline),
            subject: selectedTaskSubject,
            difficulty: selectedTaskDifficulty
        });
        setIsTaskDraftDirty(false);
        setIsTaskSaving(false);
    // selectedTask fields below are the values that should refresh this draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTask?.id, selectedTaskDeadline, selectedTaskDifficulty, selectedTaskSubject, selectedTaskTitle]);

    const updateTaskDraft = (updates) => {
        setTaskDraft(prev => ({ ...prev, ...updates }));
        setIsTaskDraftDirty(true);
    };

    const handleSelectTask = (taskId) => {
        setSelectedTaskId(taskId);
        setNewChunkTitle('');
        setNewChunkEstimate('');
        setNewChunkDifficulty('easy');
        setEditingChunkDifficultyId(null);
        setIsNewChunkDifficultyOpen(false);
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
                difficulty: newChunkDifficulty,
                completed: false
            }
        ]);
        setNewChunkTitle('');
        setNewChunkEstimate('');
        setNewChunkDifficulty('easy');
        setIsNewChunkDifficultyOpen(false);
    };

    const updateChunk = (chunkId, updates) => {
        updateSelectedChunks(visibleChunks.map(chunk => (
            chunk.id === chunkId ? { ...chunk, ...updates } : chunk
        )));
    };

    const chooseChunkDifficulty = (chunkId, difficulty) => {
        updateChunk(chunkId, { difficulty });
        setEditingChunkDifficultyId(null);
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
                    completed: false,
                    difficulty: chunk.difficulty || 'easy'
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
        setEditingChunkDifficultyId(null);
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
                subject: taskDraft.subject.trim() || null,
                difficulty: taskDraft.difficulty
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
        setNewChunkDifficulty('easy');
        setEditingChunkDifficultyId(null);
        setIsNewChunkDifficultyOpen(false);
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
        if (sortBy === 'difficulty') {
            const diffOrder = { hard: 3, medium: 2, easy: 1 };
            return diffOrder[b.difficulty] - diffOrder[a.difficulty];
        }
        if (sortBy === 'chunkTime') {
            const timeA = getTaskChunkEstimate(a) || Infinity;
            const timeB = getTaskChunkEstimate(b) || Infinity;
            return timeA - timeB;
        }
        return b.id - a.id;
    });

    // Get unique subjects
    const uniqueSubjects = [...new Set(tasks.map(t => t.subject).filter(Boolean))];
    const subjectCounts = uniqueSubjects.map(subject => ({
        name: subject,
        color: getColorForSubject(subject),
        count: tasks.filter(t => t.subject === subject && isTaskActive(t)).length
    }));
    const allCount = tasks.filter(isTaskActive).length;

    // Today's Tasks Logic
    const todayTasks = tasks.filter(task => {
        if (!task.deadline || !isTaskActive(task)) return false;
        const date = new Date(task.deadline);
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    const overdueCount = tasks.filter(task => task.deadline && isTaskActive(task) && new Date(task.deadline) < new Date()).length;
    const chunkedCount = tasks.filter(task => isTaskActive(task) && normalizeTaskSubtasks(task.subtasks).length > 0).length;

    return (
        <GardenContent
            view={{
                activeTasks, allCount, addChunk, addNestedSubtask, chooseChunkDifficulty, chunkDifficultyOptions, chunkedCount,
                chunkTotalMinutes, clearSelectedTask, completedChunks, completedTasks, deleteChunk, deleteNestedSubtask,
                editingChunkDifficultyId, existingSubjects, expandedChunkIds, focusTask, formatEstimatedTime, getChunkDifficultyStyle,
                handleSelectTask, isNewChunkDifficultyOpen, isTaskDraftDirty, isTaskSaving, newChunkDifficulty, newChunkEstimate,
                newChunkTitle, newNestedDrafts, onCompleteTask, onDeleteTask, onRequestAIHelp, onRestoreTask,
                onUpdateTask, orderedChunks, overdueCount, reorderChunks, saveChunkOrder, selectedChunks,
                selectedSubject, selectedTask, selectedTaskId, setEditingChunkDifficultyId, setFocusTask,
                setIsNewChunkDifficultyOpen, setNewChunkDifficulty, setNewChunkEstimate, setNewChunkTitle, setSelectedSubject,
                setShowSort, setSortBy, sortedTasks, sortBy, sortRef, subjectCounts,
                saveTaskDetails, taskDraft, todayTasks, toggleChunkExpanded, uniqueSubjects, updateChunk, updateNestedSubtask, updateNestedDraft,
                updateTaskDraft, visibleChunks, showSort,
            }}
        />
    );
};

export default Garden;
