import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, List, ListChecks, ListOrdered } from 'lucide-react';
import {
    buildDetailLine,
    createContinuationLine,
    createFormattedLine,
    getDetailLines,
    parseDetailLine,
    resizeLineEditor,
} from './ideasBoardUtils';

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

    // The sheet opens after this mounts, so measure again once it is on screen.
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            lineInputRefs.current.forEach((element) => resizeLineEditor(element));
        });
        return () => cancelAnimationFrame(frame);
    }, []);

    // Save whatever is pending when the sheet closes, even without a blur first.
    const commitRef = useRef(commitDraft);
    useEffect(() => {
        commitRef.current = commitDraft;
    }, [commitDraft]);
    useEffect(() => () => commitRef.current(), []);

    return (
        <div className="idea-editor">
            <input
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleSaveShortcut}
                className={`idea-editor__title${node.completed ? ' is-done' : ''}`}
                placeholder="Title"
                aria-label="Idea title"
            />

            <div className="idea-editor__lines">
                {parsedLines.map((line, index) => (
                    <div key={`${index}-${line.type}`} className={`idea-editor__line is-${line.type}`}>
                        {line.type !== 'plain' && (
                            <span className="idea-editor__marker">
                                {line.type === 'check' && (
                                    <button
                                        type="button"
                                        className="task-check"
                                        aria-pressed={line.checked}
                                        aria-label={line.checked ? 'Mark open' : 'Mark done'}
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => toggleChecklistLine(index)}
                                    >
                                        <span>{line.checked && <Check size={11} strokeWidth={3.2} />}</span>
                                    </button>
                                )}
                                {line.type === 'bullet' && '•'}
                                {line.type === 'number' && `${line.number || index + 1}.`}
                            </span>
                        )}
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
                            className={line.type === 'check' && line.checked ? 'is-checked' : undefined}
                            placeholder={index === 0 ? 'Note' : ''}
                            aria-label={`Line ${index + 1}`}
                        />
                    </div>
                ))}
            </div>

            <div className="idea-editor__toolbar" role="toolbar" aria-label="Format">
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyListFormat('check')} aria-label="Checklist">
                    <ListChecks size={19} />
                </button>
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyListFormat('bullet')} aria-label="Bulleted list">
                    <List size={19} />
                </button>
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyListFormat('number')} aria-label="Numbered list">
                    <ListOrdered size={19} />
                </button>
            </div>
        </div>
    );
};

export { IdeaNoteEditor };
