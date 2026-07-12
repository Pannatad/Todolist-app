import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Circle, List, ListChecks, ListOrdered, Star } from 'lucide-react';
import {
    buildDetailLine,
    createContinuationLine,
    createFormattedLine,
    getColors,
    getDetailLines,
    ideaMatchesQuery,
    parseDetailLine,
    resizeLineEditor,
} from './ideasBoardUtils';

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

export { IdeaNoteEditor, TreeItem };
