import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Circle, Lightbulb, List, ListChecks, ListOrdered, Plus, Search, Star, Trash2, X } from 'lucide-react';
import { IDEA_COLOR_OPTIONS, useIdeaBoard } from '../context/IdeaBoardContext';

const COLOR_STYLES = {
    slate: { dot: 'bg-slate-500', text: 'text-slate-700', ring: 'ring-slate-200', soft: 'bg-slate-100', border: 'border-slate-200' },
    sky: { dot: 'bg-sky-500', text: 'text-sky-700', ring: 'ring-sky-200', soft: 'bg-sky-50', border: 'border-sky-200' },
    teal: { dot: 'bg-teal-500', text: 'text-teal-700', ring: 'ring-teal-200', soft: 'bg-teal-50', border: 'border-teal-200' },
    emerald: { dot: 'bg-emerald-500', text: 'text-emerald-700', ring: 'ring-emerald-200', soft: 'bg-emerald-50', border: 'border-emerald-200' },
    amber: { dot: 'bg-amber-500', text: 'text-amber-700', ring: 'ring-amber-200', soft: 'bg-amber-50', border: 'border-amber-200' },
    orange: { dot: 'bg-orange-500', text: 'text-orange-700', ring: 'ring-orange-200', soft: 'bg-orange-50', border: 'border-orange-200' },
    rose: { dot: 'bg-rose-500', text: 'text-rose-700', ring: 'ring-rose-200', soft: 'bg-rose-50', border: 'border-rose-200' },
    pink: { dot: 'bg-pink-500', text: 'text-pink-700', ring: 'ring-pink-200', soft: 'bg-pink-50', border: 'border-pink-200' },
    violet: { dot: 'bg-violet-500', text: 'text-violet-700', ring: 'ring-violet-200', soft: 'bg-violet-50', border: 'border-violet-200' },
    cyan: { dot: 'bg-cyan-500', text: 'text-cyan-700', ring: 'ring-cyan-200', soft: 'bg-cyan-50', border: 'border-cyan-200' }
};

const getColors = (color) => COLOR_STYLES[color] || COLOR_STYLES.slate;

const buildLookups = (nodes) => {
    const nodesById = Object.fromEntries(nodes.map((node) => [node.id, node]));
    const childrenByParentId = {};

    nodes.forEach((node) => {
        if (!node.parentId || !nodesById[node.parentId]) return;
        if (!childrenByParentId[node.parentId]) {
            childrenByParentId[node.parentId] = [];
        }
        childrenByParentId[node.parentId].push(node);
    });

    Object.values(childrenByParentId).forEach((children) => {
        children.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    });

    const roots = nodes
        .filter((node) => !node.parentId || !nodesById[node.parentId])
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return { nodesById, childrenByParentId, roots };
};

const ideaMatchesQuery = (node, query) => {
    if (!query) return true;
    return `${node.title} ${node.details}`.toLowerCase().includes(query);
};

const getDetailLines = (value) => value.split('\n');

const parseDetailLine = (line) => {
    const checkboxMatch = line.match(/^(\s*)- \[([ xX])\]\s?(.*)$/);
    if (checkboxMatch) {
        return {
            type: 'check',
            indentation: checkboxMatch[1],
            checked: checkboxMatch[2].toLowerCase() === 'x',
            content: checkboxMatch[3]
        };
    }

    const bulletMatch = line.match(/^(\s*)[-*]\s?(.*)$/);
    if (bulletMatch) {
        return {
            type: 'bullet',
            indentation: bulletMatch[1],
            checked: false,
            content: bulletMatch[2]
        };
    }

    const numberMatch = line.match(/^(\s*)(\d+)\.\s?(.*)$/);
    if (numberMatch) {
        return {
            type: 'number',
            indentation: numberMatch[1],
            checked: false,
            content: numberMatch[3],
            number: Number(numberMatch[2])
        };
    }

    return {
        type: 'plain',
        indentation: '',
        checked: false,
        content: line
    };
};

const buildDetailLine = (line, content) => {
    if (line.type === 'check') {
        return `${line.indentation}- [${line.checked ? 'x' : ' '}] ${content}`;
    }

    if (line.type === 'bullet') {
        return `${line.indentation}- ${content}`;
    }

    if (line.type === 'number') {
        return `${line.indentation}${line.number || 1}. ${content}`;
    }

    return content;
};

const createFormattedLine = (format, content, index = 0) => {
    if (format === 'check') {
        return {
            type: 'check',
            indentation: '',
            checked: false,
            content
        };
    }

    if (format === 'number') {
        return {
            type: 'number',
            indentation: '',
            checked: false,
            content,
            number: index + 1
        };
    }

    return {
        type: 'bullet',
        indentation: '',
        checked: false,
        content
    };
};

const createContinuationLine = (line) => {
    if (line.type === 'check') {
        return buildDetailLine({ ...line, checked: false }, '');
    }

    if (line.type === 'bullet') {
        return buildDetailLine(line, '');
    }

    if (line.type === 'number') {
        return buildDetailLine({ ...line, number: (line.number || 1) + 1 }, '');
    }

    return '';
};

const resizeLineEditor = (element) => {
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${Math.max(32, element.scrollHeight)}px`;
};

const TreeItem = ({
    node,
    childrenByParentId,
    selectedId,
    query,
    onSelect,
    depth = 0
}) => {
    const children = childrenByParentId[node.id] || [];
    const visibleChildren = children.filter((child) => ideaMatchesQuery(child, query) || (childrenByParentId[child.id] || []).length > 0);
    const matches = ideaMatchesQuery(node, query);

    if (!matches && visibleChildren.length === 0) {
        return null;
    }

    const selected = selectedId === node.id;
    const colors = getColors(node.color);

    return (
        <div>
            <button
                type="button"
                onClick={() => onSelect(node.id)}
                className={`flex w-full items-start gap-2 rounded-xl px-2.5 py-2.5 text-left transition ${
                    selected ? `bg-white shadow-sm ring-1 ${colors.ring}` : 'hover:bg-white/70'
                }`}
                style={{ paddingLeft: `${8 + depth * 18}px` }}
            >
                <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${colors.dot}`} />
                <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-semibold ${node.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {node.title}
                    </span>
                    {node.details && depth === 0 && (
                        <span className="mt-1 block truncate text-xs leading-5 text-slate-500">{node.details}</span>
                    )}
                </span>
                {node.focused && <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />}
            </button>

            {visibleChildren.length > 0 && (
                <div className="mt-0.5 space-y-0.5">
                    {visibleChildren.map((child) => (
                        <TreeItem
                            key={child.id}
                            node={child}
                            childrenByParentId={childrenByParentId}
                            selectedId={selectedId}
                            query={query}
                            onSelect={onSelect}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const IdeaNoteEditor = ({ node, onSave }) => {
    const [titleDraft, setTitleDraft] = useState(node.title);
    const [detailsDraft, setDetailsDraft] = useState(node.details);
    const [activeLineIndex, setActiveLineIndex] = useState(0);
    const lineInputRefs = useRef([]);
    const saveTimerRef = useRef(null);
    const lastSavedRef = useRef({
        title: node.title,
        details: node.details
    });
    const detailLines = useMemo(() => getDetailLines(detailsDraft), [detailsDraft]);
    const parsedLines = useMemo(() => detailLines.map(parseDetailLine), [detailLines]);

    const commitDraft = useCallback(() => {
        const nextTitle = titleDraft.trim() || 'Untitled idea';
        const nextDetails = detailsDraft;
        const lastSaved = lastSavedRef.current;

        if (nextTitle === lastSaved.title && nextDetails === lastSaved.details) {
            return;
        }

        lastSavedRef.current = {
            title: nextTitle,
            details: nextDetails
        };

        onSave(node.id, {
            title: nextTitle,
            details: nextDetails
        });
    }, [detailsDraft, node.id, onSave, titleDraft]);

    const clearPendingSave = useCallback(() => {
        if (!saveTimerRef.current) return;
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
    }, []);

    const handleBlur = () => {
        clearPendingSave();
        commitDraft();
    };

    const focusLine = (index, cursorPosition) => {
        requestAnimationFrame(() => {
            const input = lineInputRefs.current[index];
            if (!input) return;
            const nextCursor = cursorPosition ?? input.value.length;
            input.focus();
            input.setSelectionRange(nextCursor, nextCursor);
        });
    };

    const replaceDetailLines = (nextLines, nextFocusIndex = activeLineIndex, cursorPosition = null) => {
        const normalizedLines = nextLines.length > 0 ? nextLines : [''];
        setDetailsDraft(normalizedLines.join('\n'));
        setActiveLineIndex(Math.min(nextFocusIndex, normalizedLines.length - 1));
        focusLine(Math.min(nextFocusIndex, normalizedLines.length - 1), cursorPosition);
    };

    const handleSaveShortcut = (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            clearPendingSave();
            commitDraft();
        }
    };

    const updateDetailLine = (index, content) => {
        const nextLines = [...detailLines];
        nextLines[index] = buildDetailLine(parsedLines[index], content);
        setDetailsDraft(nextLines.join('\n'));
    };

    const toggleChecklistLine = (index) => {
        const nextLines = [...detailLines];
        const line = parsedLines[index];
        nextLines[index] = buildDetailLine({ ...line, checked: !line.checked }, line.content);
        setDetailsDraft(nextLines.join('\n'));
    };

    const handleLineKeyDown = (event, index) => {
        handleSaveShortcut(event);
        if (event.defaultPrevented) {
            return;
        }

        const input = event.currentTarget;
        const line = parsedLines[index];

        if (event.key === 'Enter') {
            event.preventDefault();
            const nextLines = [...detailLines];

            if (line.type !== 'plain' && !line.content.trim()) {
                nextLines[index] = '';
                replaceDetailLines(nextLines, index, 0);
                return;
            }

            nextLines.splice(index + 1, 0, createContinuationLine(line));
            replaceDetailLines(nextLines, index + 1, 0);
            return;
        }

        if (
            event.key === 'Backspace'
            && input.selectionStart === 0
            && input.selectionEnd === 0
            && detailLines.length > 1
            && !line.content
        ) {
            event.preventDefault();
            const nextLines = [...detailLines];
            nextLines.splice(index, 1);
            const nextFocusIndex = Math.max(0, index - 1);
            replaceDetailLines(nextLines, nextFocusIndex);
        }
    };

    const applyListFormat = (format) => {
        const nextLines = [...detailLines];
        const index = Math.min(activeLineIndex, nextLines.length - 1);
        const formattedLine = createFormattedLine(format, parsedLines[index]?.content || '', index);
        nextLines[index] = buildDetailLine(formattedLine, formattedLine.content);
        replaceDetailLines(nextLines, index);
    };

    useEffect(() => {
        clearPendingSave();
        saveTimerRef.current = setTimeout(() => {
            saveTimerRef.current = null;
            commitDraft();
        }, 900);

        return clearPendingSave;
    }, [clearPendingSave, commitDraft]);

    useEffect(() => {
        lineInputRefs.current.forEach((element) => resizeLineEditor(element));
    }, [detailLines]);

    return (
        <>
            <input
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleSaveShortcut}
                className={`w-full bg-transparent text-2xl font-bold leading-tight outline-none sm:text-3xl ${node.completed ? 'text-slate-400 line-through' : 'text-slate-950'}`}
                placeholder="Untitled idea"
            />

            <div className="mt-6 min-h-[320px] space-y-1.5">
                {parsedLines.map((line, index) => {
                    const placeholder = index === 0 ? 'Write the idea here. Add context, questions, examples, next steps...' : '';

                    return (
                        <div key={`${index}-${line.type}`} className="flex min-h-9 items-start gap-3 rounded-lg px-1 transition-colors focus-within:bg-slate-50/80">
                            <div className="flex h-9 w-7 shrink-0 items-center justify-center pt-0.5 text-sm font-semibold text-slate-400">
                                {line.type === 'check' && (
                                    <input
                                        type="checkbox"
                                        checked={line.checked}
                                        onChange={() => toggleChecklistLine(index)}
                                        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-slate-900"
                                        title={line.checked ? 'Mark open' : 'Mark done'}
                                    />
                                )}
                                {line.type === 'bullet' && <span className="text-lg leading-6">•</span>}
                                {line.type === 'number' && <span>{line.number || index + 1}.</span>}
                            </div>

                            <textarea
                                ref={(element) => {
                                    lineInputRefs.current[index] = element;
                                    resizeLineEditor(element);
                                }}
                                rows={1}
                                value={line.content}
                                onChange={(event) => {
                                    resizeLineEditor(event.currentTarget);
                                    updateDetailLine(index, event.target.value);
                                }}
                                onFocus={() => setActiveLineIndex(index)}
                                onBlur={handleBlur}
                                onKeyDown={(event) => handleLineKeyDown(event, index)}
                                className={`min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-1 text-base leading-7 text-slate-700 outline-none placeholder:text-slate-400 ${
                                    line.type === 'check' && line.checked ? 'text-slate-400 line-through' : ''
                                }`}
                                placeholder={placeholder}
                            />
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 flex items-center gap-1 border-t border-slate-200 pt-3">
                <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyListFormat('bullet')}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    title="Bullet list"
                >
                    <List size={16} />
                </button>
                <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyListFormat('check')}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    title="Checklist"
                >
                    <ListChecks size={16} />
                </button>
                <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyListFormat('number')}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    title="Numbered list"
                >
                    <ListOrdered size={16} />
                </button>
            </div>
        </>
    );
};

const IdeasBoard = () => {
    const {
        nodes,
        loading,
        addIdea,
        addChildIdea,
        updateIdea,
        setIdeaColor,
        deleteIdea,
        unlinkIdea
    } = useIdeaBoard();

    const [selectedId, setSelectedId] = useState(null);
    const [query, setQuery] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [newChildTitle, setNewChildTitle] = useState('');

    const normalizedQuery = query.trim().toLowerCase();
    const { nodesById, childrenByParentId, roots } = useMemo(() => buildLookups(nodes), [nodes]);
    const selectedNode = selectedId ? nodesById[selectedId] : null;
    const activeNode = selectedNode || roots[0] || null;
    const activeChildren = activeNode ? childrenByParentId[activeNode.id] || [] : [];
    const activeColors = getColors(activeNode?.color);
    const focusedCount = nodes.filter((node) => node.focused).length;
    const completedCount = nodes.filter((node) => node.completed).length;

    const handleCreateIdea = async (event) => {
        event.preventDefault();
        const title = newTitle.trim();
        if (!title) return;

        const idea = await addIdea({
            title,
            details: '',
            color: 'amber'
        });

        setNewTitle('');
        if (idea?.id) {
            setSelectedId(idea.id);
        }
    };

    const handleAddChild = async (event) => {
        event.preventDefault();
        if (!activeNode) return;

        const title = newChildTitle.trim();
        if (!title) return;

        const child = await addChildIdea(activeNode.id, {
            title,
            details: '',
            color: activeNode.color || 'slate'
        });

        setNewChildTitle('');
        if (child?.id) {
            setSelectedId(child.id);
        }
    };

    const updateActive = (updates) => {
        if (!activeNode) return;
        updateIdea(activeNode.id, updates);
    };

    const handleDelete = async () => {
        if (!activeNode) return;
        await deleteIdea(activeNode.id);
        setSelectedId(null);
    };

    return (
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-1 py-2 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-void-900/80">
                <div className="mb-5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sage-700 dark:text-bone-100">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                                <Lightbulb size={20} />
                            </span>
                            <div>
                                <h1 className="text-2xl font-bold leading-tight text-slate-950 dark:text-bone-100">Ideas</h1>
                                <p className="text-xs font-semibold text-slate-400 dark:text-bone-200/50">{nodes.length} notes</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {focusedCount > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
                                    <Star size={12} />
                                    {focusedCount}
                                </span>
                            )}
                            {completedCount > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                                    <Check size={12} />
                                    {completedCount}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleCreateIdea} className="mb-4 flex items-center gap-2">
                    <input
                        value={newTitle}
                        onChange={(event) => setNewTitle(event.target.value)}
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100 dark:border-white/10 dark:bg-void-800 dark:text-bone-100"
                        placeholder="New idea..."
                    />
                    <button
                        type="submit"
                        disabled={!newTitle.trim()}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white transition hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400"
                        title="Add idea"
                    >
                        <Plus size={16} />
                    </button>
                </form>

                <div className="relative mb-4">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100 dark:border-white/10 dark:bg-void-800 dark:text-bone-100"
                        placeholder="Search"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Clear search"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="max-h-[calc(100vh-290px)] space-y-1 overflow-y-auto pr-1">
                    {loading && <div className="px-2 py-4 text-sm text-slate-500">Loading ideas...</div>}
                    {!loading && roots.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
                            No ideas yet.
                        </div>
                    )}
                    {roots.map((node) => (
                        <TreeItem
                            key={node.id}
                            node={node}
                            childrenByParentId={childrenByParentId}
                            selectedId={activeNode?.id}
                            query={normalizedQuery}
                            onSelect={setSelectedId}
                        />
                    ))}
                </div>
            </aside>

            <main className="min-w-0">
                {activeNode ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-void-900">
                        <div className={`border-b ${activeColors.border} ${activeColors.soft} px-4 py-3 sm:px-6`}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] ${activeColors.text}`}>
                                    <span className={`h-2.5 w-2.5 rounded-full ${activeColors.dot}`} />
                                    Idea note
                                    {activeNode.completed && (
                                        <span className="rounded-full bg-white/75 px-2 py-0.5 text-[10px] text-slate-500 ring-1 ring-black/5">
                                            Done
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => updateActive({ focused: !activeNode.focused })}
                                        className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                                            activeNode.focused ? 'bg-amber-500 text-white shadow-sm' : 'bg-white/70 text-slate-500 hover:bg-white hover:text-slate-800'
                                        }`}
                                        title={activeNode.focused ? 'Remove focus' : 'Focus'}
                                    >
                                        <Star size={17} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateActive({ completed: !activeNode.completed })}
                                        className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                                            activeNode.completed ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/70 text-slate-500 hover:bg-white hover:text-slate-800'
                                        }`}
                                        title={activeNode.completed ? 'Mark open' : 'Mark done'}
                                    >
                                        <Check size={17} />
                                    </button>
                                    {activeNode.parentId && (
                                        <button
                                            type="button"
                                            onClick={() => unlinkIdea(activeNode.id)}
                                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 text-slate-500 transition hover:bg-white hover:text-slate-800"
                                            title="Move to top level"
                                        >
                                            <Circle size={17} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                                        title="Delete idea and branches"
                                    >
                                        <Trash2 size={17} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="px-4 py-6 sm:px-8 sm:py-8">
                            <IdeaNoteEditor
                                key={activeNode.id}
                                node={activeNode}
                                onSave={updateIdea}
                            />
                        </div>

                        <div className="border-t border-slate-200 px-4 py-4 sm:px-8">
                            <div className="flex flex-wrap items-center gap-2">
                                {IDEA_COLOR_OPTIONS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setIdeaColor(activeNode.id, color)}
                                        className={`h-7 w-7 rounded-full border-2 transition ${getColors(color).dot} ${
                                            activeNode.color === color ? 'scale-110 border-slate-950 ring-2 ring-slate-200' : 'border-white hover:scale-105'
                                        }`}
                                        title={color}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-5 sm:px-8">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Branches</h2>
                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">{activeChildren.length}</span>
                            </div>

                            <form onSubmit={handleAddChild} className="mb-4 flex items-center gap-2">
                                <input
                                    value={newChildTitle}
                                    onChange={(event) => setNewChildTitle(event.target.value)}
                                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                                    placeholder="Add a branch..."
                                />
                                <button
                                    type="submit"
                                    disabled={!newChildTitle.trim()}
                                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-950 hover:text-white disabled:bg-slate-100 disabled:text-slate-300"
                                    title="Add branch"
                                >
                                    <Plus size={16} />
                                </button>
                            </form>

                            <div className="grid gap-2 sm:grid-cols-2">
                                {activeChildren.length === 0 && (
                                    <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-400 sm:col-span-2">No branches yet.</p>
                                )}
                                {activeChildren.map((child) => {
                                    const colors = getColors(child.color);
                                    return (
                                        <button
                                            key={child.id}
                                            type="button"
                                            onClick={() => setSelectedId(child.id)}
                                            className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                        >
                                            <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{child.title}</span>
                                            {child.focused && <Star className="h-3.5 w-3.5 text-amber-500" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mx-auto flex min-h-[520px] max-w-2xl flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 text-center">
                        <Lightbulb className="h-8 w-8 text-amber-300" />
                        <h2 className="mt-3 text-xl font-bold text-slate-900">Start with one idea</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Add a title on the left, then use this space to shape it.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default IdeasBoard;
