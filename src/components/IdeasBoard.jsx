import React, { useMemo, useState } from 'react';
import { Check, Circle, Lightbulb, Plus, Search, Star, Trash2, X } from 'lucide-react';
import { IDEA_COLOR_OPTIONS, useIdeaBoard } from '../context/IdeaBoardContext';
import { IdeaNoteEditor, TreeItem } from './ideasBoardParts';
import { buildLookups, getColors } from './ideasBoardUtils';

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
