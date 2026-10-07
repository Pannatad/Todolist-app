import React, { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, CornerUpLeft, Plus, Search, Star, Trash2 } from 'lucide-react';
import { IDEA_COLOR_OPTIONS, useIdeaBoard } from '../context/IdeaBoardContext';
import { RowMenu, Sheet } from '../ui';
import { IdeaNoteEditor } from './ideasBoardParts';
import { buildLookups, getIdeaHex, ideaMatchesQuery } from './ideasBoardUtils';

const firstLine = (details = '') => details
    .split('\n')
    .map((line) => line.replace(/^\s*(?:- \[[ xX]\]|[-*]|\d+\.)\s?/, '').trim())
    .find(Boolean) || '';

const IdeaRow = ({ node, branchCount, onOpen }) => {
    const preview = firstLine(node.details);
    return (
        <button type="button" className={`ui-list-row idea-row${node.completed ? ' is-done' : ''}`} onClick={() => onOpen(node.id)}>
            <i className="idea-row__dot" style={{ background: getIdeaHex(node.color) }} aria-hidden="true" />
            <span className="ui-list-row__copy">
                <span className="ui-list-row__title">{node.title}</span>
                {preview && <span className="ui-list-row__subtitle">{preview}</span>}
            </span>
            {node.focused && <Star size={14} className="idea-row__star" fill="currentColor" aria-label="Focused" />}
            {branchCount > 0 && <span className="idea-row__count">{branchCount}</span>}
            <ChevronRight size={18} className="shell-chevron" aria-hidden="true" />
        </button>
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

    const [openId, setOpenId] = useState(null);
    const [query, setQuery] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [newChildTitle, setNewChildTitle] = useState('');

    const normalizedQuery = query.trim().toLowerCase();
    const { nodesById, childrenByParentId, roots } = useMemo(() => buildLookups(nodes), [nodes]);
    const listedNodes = normalizedQuery
        ? nodes.filter((node) => ideaMatchesQuery(node, normalizedQuery))
        : roots;
    const openNode = openId ? nodesById[openId] : null;
    const openChildren = openNode ? childrenByParentId[openNode.id] || [] : [];
    const openParent = openNode?.parentId ? nodesById[openNode.parentId] : null;

    const handleCreateIdea = async (event) => {
        event.preventDefault();
        const title = newTitle.trim();
        if (!title) return;

        const idea = await addIdea({ title, details: '', color: 'amber' });
        setNewTitle('');
        if (idea?.id) setOpenId(idea.id);
    };

    const handleAddChild = async (event) => {
        event.preventDefault();
        const title = newChildTitle.trim();
        if (!openNode || !title) return;

        await addChildIdea(openNode.id, { title, details: '', color: openNode.color || 'slate' });
        setNewChildTitle('');
    };

    const handleDelete = async () => {
        if (!openNode) return;
        const parentId = openNode.parentId && nodesById[openNode.parentId] ? openNode.parentId : null;
        await deleteIdea(openNode.id);
        setOpenId(parentId);
    };

    const openIdea = (id) => {
        setNewChildTitle('');
        setOpenId(id);
    };

    return (
        <div className="ideas-board">
            <label className="ui-search">
                <Search size={16} aria-hidden="true" />
                <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search"
                    aria-label="Search ideas"
                />
            </label>

            <div className="ui-group ideas-board__list">
                {!normalizedQuery && (
                    <form className="idea-new" onSubmit={handleCreateIdea}>
                        <span className="idea-new__plus" aria-hidden="true"><Plus size={14} strokeWidth={2.8} /></span>
                        <input
                            value={newTitle}
                            onChange={(event) => setNewTitle(event.target.value)}
                            placeholder="New Idea"
                            aria-label="New idea"
                            enterKeyHint="done"
                        />
                        {newTitle.trim() && <button type="submit" className="ui-text-button">Add</button>}
                    </form>
                )}
                {loading ? (
                    <p className="ideas-board__empty">Loading…</p>
                ) : listedNodes.length === 0 ? (
                    <p className="ideas-board__empty">{normalizedQuery ? 'No ideas match.' : 'No ideas yet.'}</p>
                ) : (
                    listedNodes.map((node) => (
                        <IdeaRow
                            key={node.id}
                            node={node}
                            branchCount={(childrenByParentId[node.id] || []).length}
                            onOpen={openIdea}
                        />
                    ))
                )}
            </div>

            <Sheet
                open={Boolean(openNode)}
                onClose={() => setOpenId(null)}
                title={openNode?.completed ? 'Idea · Done' : 'Idea'}
                className="form-sheet idea-sheet"
                actions={openNode ? (
                    <RowMenu
                        label="Idea actions"
                        items={[
                            { label: openNode.focused ? 'Unfocus' : 'Focus', icon: Star, onSelect: () => updateIdea(openNode.id, { focused: !openNode.focused }) },
                            { label: openNode.completed ? 'Mark Open' : 'Mark Done', icon: Check, onSelect: () => updateIdea(openNode.id, { completed: !openNode.completed }) },
                            ...(openParent ? [{ label: 'Move to Top Level', icon: CornerUpLeft, onSelect: () => unlinkIdea(openNode.id) }] : []),
                            { label: 'Delete', icon: Trash2, destructive: true, onSelect: handleDelete },
                        ]}
                    />
                ) : null}
            >
                {openNode && (
                    <div className="form-stack">
                        {openParent && (
                            <button type="button" className="ui-text-button idea-sheet__parent" onClick={() => openIdea(openParent.id)}>
                                <ChevronLeft size={18} aria-hidden="true" />
                                {openParent.title}
                            </button>
                        )}

                        <IdeaNoteEditor key={openNode.id} node={openNode} onSave={updateIdea} />

                        <div className="form-group">
                            <div className="form-swatches" role="radiogroup" aria-label="Color">
                                {IDEA_COLOR_OPTIONS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        role="radio"
                                        aria-checked={openNode.color === color}
                                        aria-label={color}
                                        onClick={() => setIdeaColor(openNode.id, color)}
                                        className={`form-swatch${openNode.color === color ? ' is-selected' : ''}`}
                                        style={{ '--swatch': getIdeaHex(color) }}
                                    />
                                ))}
                            </div>
                        </div>

                        <p className="form-section-label">Branches</p>
                        <div className="form-group">
                            {openChildren.map((child) => (
                                <button key={child.id} type="button" className="form-field form-option idea-branch" onClick={() => openIdea(child.id)}>
                                    <i className="idea-row__dot" style={{ background: getIdeaHex(child.color) }} aria-hidden="true" />
                                    <span className="form-goal">{child.title}</span>
                                    <ChevronRight size={17} className="shell-chevron" aria-hidden="true" />
                                </button>
                            ))}
                            <form className="form-field" onSubmit={handleAddChild}>
                                <input
                                    value={newChildTitle}
                                    onChange={(event) => setNewChildTitle(event.target.value)}
                                    placeholder="Add Branch"
                                    aria-label="New branch"
                                />
                                {newChildTitle.trim() && <button type="submit" className="ui-text-button idea-sheet__add">Add</button>}
                            </form>
                        </div>
                    </div>
                )}
            </Sheet>
        </div>
    );
};

export default IdeasBoard;
