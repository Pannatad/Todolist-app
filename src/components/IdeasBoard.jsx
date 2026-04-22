import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, GripVertical, Lightbulb, Minus, Palette, Plus, Sparkles, Target, Trash2, Unlink2 } from 'lucide-react';
import { IDEA_COLOR_OPTIONS, useIdeaBoard } from '../context/IdeaBoardContext';

const CARD_WIDTH = 250;
const CARD_HEIGHT = 188;
const CARD_PADDING = 160;
const MIN_CANVAS_WIDTH = 1600;
const MIN_CANVAS_HEIGHT = 1100;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.6;
const ZOOM_STEP = 0.1;
const GESTURE_ZOOM_SENSITIVITY = 0.004;
const BRANCH_FILTER_MODES = {
    direct: {
        maxDepth: 1,
        buttonLabel: 'Focus here + children',
        chipLabel: 'Direct'
    },
    full: {
        maxDepth: Number.POSITIVE_INFINITY,
        buttonLabel: 'Focus full branch',
        chipLabel: 'Full'
    }
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getNodeDepth = (node, nodesById) => {
    let depth = 0;
    let current = node;

    while (current?.parentId && nodesById[current.parentId] && depth < 10) {
        depth += 1;
        current = nodesById[current.parentId];
    }

    return depth;
};

const collectSubtreeIds = (rootId, childrenByParentId, maxDepth = Number.POSITIVE_INFINITY) => {
    if (!rootId) {
        return new Set();
    }

    const ids = new Set();
    const queue = [{ id: rootId, depth: 0 }];

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current || current.depth > maxDepth || ids.has(current.id)) {
            continue;
        }

        ids.add(current.id);
        const children = childrenByParentId[current.id] || [];
        children.forEach((childId) => {
            queue.push({ id: childId, depth: current.depth + 1 });
        });
    }

    return ids;
};

const collectUnionSubtreeIds = (filters, childrenByParentId) => {
    const union = new Set();
    filters.forEach((filter) => {
        const maxDepth = BRANCH_FILTER_MODES[filter.mode]?.maxDepth ?? Number.POSITIVE_INFINITY;
        collectSubtreeIds(filter.rootId, childrenByParentId, maxDepth).forEach((id) => union.add(id));
    });
    return union;
};

const getCardDimensions = (depth = 0, isExpanded = false) => {
    if (depth <= 0) {
        return isExpanded
            ? { width: 308, height: 320 }
            : { width: 266, height: 200 };
    }

    if (depth === 1) {
        return isExpanded
            ? { width: 268, height: 286 }
            : { width: 222, height: 166 };
    }

    return isExpanded
        ? { width: 236, height: 254 }
        : { width: 188, height: 142 };
};

const getNodeTypeLabel = (depth = 0) => {
    if (depth <= 0) {
        return 'Idea';
    }

    if (depth === 1) {
        return 'Subidea';
    }

    return 'Sub-subidea';
};

const getHierarchyClasses = (depth = 0) => {
    if (depth <= 0) {
        return {
            shell: 'rounded-[30px] border-2',
            header: 'px-4 py-3.5',
            body: 'px-4 py-3.5',
            footer: 'px-4 py-2.5',
            icon: 'h-9 w-9 rounded-2xl',
            label: 'text-[13px] tracking-[0.24em]',
            title: 'text-[18px]',
            details: 'text-[11px]'
        };
    }

    if (depth === 1) {
        return {
            shell: 'rounded-[24px] border-2',
            header: 'px-3.5 py-3',
            body: 'px-3.5 py-3',
            footer: 'px-3.5 py-2.5',
            icon: 'h-8 w-8 rounded-[14px]',
            label: 'text-[12px] tracking-[0.22em]',
            title: 'text-[17px]',
            details: 'text-[11px]'
        };
    }

    return {
        shell: 'rounded-[18px] border border-dashed',
        header: 'px-3 py-2.5',
        body: 'px-3 py-2.5',
        footer: 'px-3 py-2',
        icon: 'h-7 w-7 rounded-xl',
        label: 'text-[10px] tracking-[0.18em]',
        title: 'text-[15px]',
        details: 'text-[10px]'
    };
};

const getConnectorGeometry = (fromNode, toNode) => {
    const fromDimensions = fromNode.dimensions || getCardDimensions(fromNode.depth || 0);
    const toDimensions = toNode.dimensions || getCardDimensions(toNode.depth || 0);

    const fromCenterX = fromNode.x + fromDimensions.width / 2;
    const fromCenterY = fromNode.y + fromDimensions.height / 2;
    const toCenterX = toNode.x + toDimensions.width / 2;
    const toCenterY = toNode.y + toDimensions.height / 2;

    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;
    const prefersHorizontal = Math.abs(dx) >= Math.abs(dy) * 1.1;

    if (prefersHorizontal) {
        const childOnRight = dx >= 0;
        const startX = childOnRight ? fromNode.x + fromDimensions.width : fromNode.x;
        const startY = fromCenterY;
        const endX = childOnRight ? toNode.x : toNode.x + toDimensions.width;
        const endY = toCenterY;
        const distance = Math.abs(endX - startX);
        const controlOffset = Math.max(52, Math.min(150, distance * 0.45));
        const control1X = childOnRight ? startX + controlOffset : startX - controlOffset;
        const control2X = childOnRight ? endX - controlOffset : endX + controlOffset;

        return {
            startX,
            startY,
            endX,
            endY,
            control1X,
            control1Y: startY,
            control2X,
            control2Y: endY
        };
    }

    const childBelow = dy >= 0;
    const startX = fromCenterX;
    const startY = childBelow ? fromNode.y + fromDimensions.height : fromNode.y;
    const endX = toCenterX;
    const endY = childBelow ? toNode.y : toNode.y + toDimensions.height;
    const distance = Math.abs(endY - startY);
    const controlOffset = Math.max(44, Math.min(140, distance * 0.45));
    const control1Y = childBelow ? startY + controlOffset : startY - controlOffset;
    const control2Y = childBelow ? endY - controlOffset : endY + controlOffset;

    return {
        startX,
        startY,
        endX,
        endY,
        control1X: startX,
        control1Y,
        control2X: endX,
        control2Y
    };
};

const COLOR_STYLES = {
    slate: {
        card: 'border-slate-300 bg-slate-50/96',
        accent: 'bg-slate-600',
        text: 'text-slate-700',
        ring: 'ring-slate-300',
        stroke: 'rgba(71, 85, 105, 0.28)'
    },
    sky: {
        card: 'border-sky-300 bg-sky-50/96',
        accent: 'bg-sky-500',
        text: 'text-sky-700',
        ring: 'ring-sky-300',
        stroke: 'rgba(14, 165, 233, 0.28)'
    },
    teal: {
        card: 'border-teal-300 bg-teal-50/96',
        accent: 'bg-teal-500',
        text: 'text-teal-700',
        ring: 'ring-teal-300',
        stroke: 'rgba(20, 184, 166, 0.3)'
    },
    emerald: {
        card: 'border-emerald-300 bg-emerald-50/96',
        accent: 'bg-emerald-500',
        text: 'text-emerald-700',
        ring: 'ring-emerald-300',
        stroke: 'rgba(16, 185, 129, 0.3)'
    },
    amber: {
        card: 'border-amber-300 bg-amber-50/96',
        accent: 'bg-amber-500',
        text: 'text-amber-700',
        ring: 'ring-amber-300',
        stroke: 'rgba(245, 158, 11, 0.3)'
    },
    orange: {
        card: 'border-orange-300 bg-orange-50/96',
        accent: 'bg-orange-500',
        text: 'text-orange-700',
        ring: 'ring-orange-300',
        stroke: 'rgba(249, 115, 22, 0.3)'
    },
    rose: {
        card: 'border-rose-300 bg-rose-50/96',
        accent: 'bg-rose-500',
        text: 'text-rose-700',
        ring: 'ring-rose-300',
        stroke: 'rgba(244, 63, 94, 0.3)'
    },
    pink: {
        card: 'border-pink-300 bg-pink-50/96',
        accent: 'bg-pink-500',
        text: 'text-pink-700',
        ring: 'ring-pink-300',
        stroke: 'rgba(236, 72, 153, 0.3)'
    },
    violet: {
        card: 'border-violet-300 bg-violet-50/96',
        accent: 'bg-violet-500',
        text: 'text-violet-700',
        ring: 'ring-violet-300',
        stroke: 'rgba(139, 92, 246, 0.3)'
    },
    cyan: {
        card: 'border-cyan-300 bg-cyan-50/96',
        accent: 'bg-cyan-500',
        text: 'text-cyan-700',
        ring: 'ring-cyan-300',
        stroke: 'rgba(6, 182, 212, 0.3)'
    }
};

const TOOLBAR_BUTTON_CLASS = 'inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900';
const VIEW_TOGGLE_BUTTON_CLASS = 'inline-flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition';

const IdeaCard = ({
    node,
    dimensions,
    childCount,
    isSelected,
    isRelated,
    isDragging,
    isDimmed,
    activeBranchMode,
    onSelect,
    onAddChild,
    onDelete,
    onSave,
    onToggleComplete,
    onToggleFocus,
    onDragStart,
    onToggleBranchFilter
}) => {
    const [title, setTitle] = useState(node.title);
    const [details, setDetails] = useState(node.details);
    const colors = COLOR_STYLES[node.color] || COLOR_STYLES.slate;
    const depth = node.depth || 0;
    const hierarchy = getHierarchyClasses(depth);
    const typeLabel = getNodeTypeLabel(depth);
    const detailHeightClass = depth <= 0 ? 'h-20' : depth === 1 ? 'h-16' : 'h-14';
    const showStatusRow = node.focused || node.completed || (isSelected && node.parentId);

    const actionButtons = isSelected ? (
        <div className="flex w-full flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onAddChild(node.id);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"
                title="Add subidea"
            >
                <Plus size={12} />
                Add
            </button>
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onDelete(node.id);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-700 transition hover:bg-rose-100"
                title="Delete idea"
            >
                <Trash2 size={12} />
                Delete
            </button>
        </div>
    ) : null;

    const statusBadges = showStatusRow ? (
        <div className="flex w-full flex-wrap items-center gap-2">
            {node.focused && (
                <span className="rounded-full bg-amber-200 px-2.5 py-1 font-semibold text-amber-800">Focus</span>
            )}
            {node.completed && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">Done</span>
            )}
            {isSelected && node.parentId && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500">Connected</span>
            )}
        </div>
    ) : null;

    useEffect(() => {
        setTitle(node.title);
        setDetails(node.details);
    }, [node.details, node.title]);

    const commitChanges = () => {
        const nextTitle = title.trim() || 'Untitled idea';
        const nextDetails = details.trim();

        if (nextTitle !== node.title || nextDetails !== node.details) {
            onSave(node.id, {
                title: nextTitle,
                details: nextDetails
            });
        }
    };

    return (
        <div
            className="group absolute"
            style={{
                left: 0,
                top: 0,
                width: dimensions.width,
                height: dimensions.height,
                opacity: isDimmed ? 0.08 : node.completed ? 0.8 : isSelected || isRelated ? 1 : 0.92,
                transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
                willChange: 'transform',
                pointerEvents: 'auto',
                filter: isDimmed ? 'grayscale(0.5) saturate(0.6)' : 'none',
                zIndex: isSelected ? 3 : isDimmed ? 0 : 1
            }}
        >
            <div
                onClick={() => onSelect(node.id)}
                className={`relative h-full overflow-hidden shadow-[0_18px_46px_rgba(15,23,42,0.08)] ${
                    hierarchy.shell
                } ${
                    colors.card
                } ${
                    isSelected ? `ring-2 ${colors.ring}` : ''
                } ${
                    node.focused
                        ? 'ring-4 ring-amber-300/80 ring-offset-2 ring-offset-white shadow-[0_26px_70px_rgba(245,158,11,0.32)]'
                        : ''
                } ${
                    !isSelected ? 'group-hover:shadow-[0_22px_58px_rgba(15,23,42,0.12)]' : ''
                } ${
                    isDragging ? 'transition-none' : 'transition-[box-shadow,border-color,background-color,opacity] duration-150'
                }`}
            >
                <div className={`flex items-center justify-between gap-3 border-b border-white/70 ${hierarchy.header}`}>
                    <div className="flex min-w-0 items-center gap-2">
                        <span className={`inline-flex items-center justify-center text-white ${hierarchy.icon} ${colors.accent}`}>
                            <Lightbulb size={15} />
                        </span>
                        <div className="min-w-0">
                            <p className={`font-semibold uppercase ${hierarchy.label} ${colors.text}`}>
                                {typeLabel}
                            </p>
                            <p className="text-[11px] text-slate-500">
                                {childCount} {childCount === 1 ? 'branch' : 'branches'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onToggleComplete(node);
                            }}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-2xl border transition ${
                                node.completed
                                    ? 'border-emerald-300 bg-emerald-500 text-white'
                                    : 'border-white/80 bg-white/85 text-slate-500 hover:text-slate-800'
                            }`}
                            title="Check off idea"
                        >
                            <Check size={14} />
                        </button>

                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onToggleFocus(node);
                            }}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-2xl border transition ${
                                node.focused
                                    ? 'border-amber-300 bg-amber-500 text-white'
                                    : 'border-white/80 bg-white/85 text-slate-500 hover:text-slate-800'
                            }`}
                            title="Mark as focus"
                        >
                            <Target size={14} />
                        </button>

                        <button
                            type="button"
                            onPointerDown={(event) => onDragStart(event, node)}
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex h-8 w-8 cursor-grab touch-none select-none items-center justify-center rounded-2xl border border-white/80 bg-white/85 text-slate-500 transition hover:text-slate-800 active:cursor-grabbing"
                            title="Move idea"
                        >
                            <GripVertical size={14} />
                        </button>
                    </div>
                </div>

                <div className={`space-y-3 ${hierarchy.body}`}>
                    <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        onFocus={() => onSelect(node.id)}
                        onBlur={commitChanges}
                        className={`w-full border-0 bg-transparent p-0 font-semibold placeholder:text-slate-400 focus:outline-none ${
                            hierarchy.title
                        } ${
                            node.completed ? 'text-slate-500 line-through' : 'text-slate-900'
                        }`}
                        placeholder="Idea title"
                    />

                    {isSelected ? (
                        <textarea
                            value={details}
                            onChange={(event) => setDetails(event.target.value)}
                            onFocus={() => onSelect(node.id)}
                            onBlur={commitChanges}
                            className={`${detailHeightClass} w-full resize-none rounded-2xl border border-white/80 bg-white/80 px-3 py-2 leading-5 text-slate-600 outline-none transition focus:border-white focus:bg-white ${hierarchy.details}`}
                            placeholder="Short note, next step, or question..."
                        />
                    ) : node.details ? (
                        <p className={`line-clamp-4 leading-5 text-slate-600 ${hierarchy.details}`}>
                            {node.details}
                        </p>
                    ) : null}

                    {isSelected && (
                        <div className="flex flex-wrap gap-2 rounded-2xl border border-white/70 bg-white/60 p-2">
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onToggleBranchFilter(node.id, 'direct');
                                }}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                                    activeBranchMode === 'direct'
                                        ? 'bg-amber-100 text-amber-900'
                                        : 'bg-white/90 text-slate-600 hover:bg-white hover:text-slate-900'
                                }`}
                                title="Focus this idea and direct subideas"
                            >
                                <Sparkles size={11} />
                                Direct
                            </button>
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onToggleBranchFilter(node.id, 'full');
                                }}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                                    activeBranchMode === 'full'
                                        ? 'bg-amber-100 text-amber-900'
                                        : 'bg-white/90 text-slate-600 hover:bg-white hover:text-slate-900'
                                }`}
                                title="Focus the full subtree"
                            >
                                <Sparkles size={11} />
                                Full
                            </button>
                            <span className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white">
                                Pinned
                            </span>
                        </div>
                    )}
                </div>

                <div className={`border-t border-white/70 text-[11px] text-slate-500 ${hierarchy.footer}`}>
                    <div className={`flex w-full ${isSelected ? 'flex-col items-start gap-2' : 'items-center justify-between gap-2'}`}>
                        {actionButtons}
                        {statusBadges}
                    </div>
                </div>

                {!isSelected && (
                    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 translate-y-1 opacity-0 transition duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                        <div className="flex flex-wrap gap-2 rounded-2xl border border-white/75 bg-white/88 p-2 shadow-[0_16px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm">
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onToggleBranchFilter(node.id, 'direct');
                                }}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                                    activeBranchMode === 'direct'
                                        ? 'bg-amber-100 text-amber-900'
                                        : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                                title="Focus this idea and direct subideas"
                            >
                                <Sparkles size={11} />
                                Direct
                            </button>
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onToggleBranchFilter(node.id, 'full');
                                }}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                                    activeBranchMode === 'full'
                                        ? 'bg-amber-100 text-amber-900'
                                        : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                                title="Focus the full subtree"
                            >
                                <Sparkles size={11} />
                                Full
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const IdeaTreeNode = ({
    node,
    nodesById,
    childrenByParentId,
    childCountById,
    expandedTreeIds,
    selectedNodeId,
    onToggleExpand,
    onSelect,
    onAddChild,
    onToggleComplete,
    onToggleFocus,
    depth = 0
}) => {
    const childIds = childrenByParentId[node.id] || [];
    const hasChildren = childIds.length > 0;
    const isExpanded = expandedTreeIds.has(node.id);
    const isSelected = selectedNodeId === node.id;
    const typeLabel = getNodeTypeLabel(node.depth || depth);
    const colors = COLOR_STYLES[node.color] || COLOR_STYLES.slate;

    return (
        <div className="space-y-2">
            <div
                className={`group flex items-start gap-2 rounded-[22px] border px-3 py-3 shadow-sm transition ${
                    isSelected
                        ? `border-slate-300 bg-white ring-2 ${colors.ring}`
                        : 'border-slate-200/80 bg-white/92 hover:border-slate-300 hover:bg-white'
                }`}
            >
                <button
                    type="button"
                    onClick={() => hasChildren && onToggleExpand(node.id)}
                    className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl border transition ${
                        hasChildren
                            ? 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-800'
                            : 'border-transparent bg-transparent text-slate-300'
                    }`}
                    title={hasChildren ? (isExpanded ? 'Collapse branch' : 'Expand branch') : 'No children'}
                >
                    {hasChildren ? (
                        isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />
                    ) : (
                        <span className="h-3 w-3 rounded-full bg-slate-200" />
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => onSelect(node.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                >
                    <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-white ${colors.accent}`}>
                        <Lightbulb size={14} />
                    </span>

                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${colors.text}`}>
                                {typeLabel}
                            </span>
                            <span className="text-xs text-slate-400">
                                {childCountById[node.id] || 0} {(childCountById[node.id] || 0) === 1 ? 'branch' : 'branches'}
                            </span>
                            {node.focused && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                    Focus
                                </span>
                            )}
                            {node.completed && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                    Done
                                </span>
                            )}
                        </div>

                        <p className={`mt-1 text-base font-semibold ${node.completed ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                            {node.title}
                        </p>

                        {node.details ? (
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                {node.details}
                            </p>
                        ) : null}
                    </div>
                </button>

                <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                        type="button"
                        onClick={() => onToggleComplete(node)}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition ${
                            node.completed
                                ? 'border-emerald-300 bg-emerald-500 text-white'
                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'
                        }`}
                        title="Check off idea"
                    >
                        <Check size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onToggleFocus(node)}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition ${
                            node.focused
                                ? 'border-amber-300 bg-amber-500 text-white'
                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'
                        }`}
                        title="Mark as focus"
                    >
                        <Target size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onAddChild(node.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                        title="Add subidea"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div className="ml-4 border-l border-slate-200 pl-4">
                    <div className="space-y-2">
                        {childIds.map((childId) => {
                            const childNode = nodesById[childId];
                            if (!childNode) {
                                return null;
                            }

                            return (
                                <IdeaTreeNode
                                    key={childId}
                                    node={childNode}
                                    nodesById={nodesById}
                                    childrenByParentId={childrenByParentId}
                                    childCountById={childCountById}
                                    expandedTreeIds={expandedTreeIds}
                                    selectedNodeId={selectedNodeId}
                                    onToggleExpand={onToggleExpand}
                                    onSelect={onSelect}
                                    onAddChild={onAddChild}
                                    onToggleComplete={onToggleComplete}
                                    onToggleFocus={onToggleFocus}
                                    depth={(node.depth || depth) + 1}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
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

    const boardRef = useRef(null);
    const viewportRef = useRef(null);
    const draftPositionRef = useRef(null);
    const dragRafRef = useRef(null);
    const pendingDragPositionRef = useRef(null);
    const zoomRef = useRef(1);
    const zoomTargetRef = useRef(1);
    const zoomAnchorRef = useRef(null);
    const zoomAnimationRef = useRef(null);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [branchFilters, setBranchFilters] = useState([]);
    const [dragState, setDragState] = useState(null);
    const [draftPositions, setDraftPositions] = useState({});
    const [viewMode, setViewMode] = useState('canvas');
    const [expandedTreeIds, setExpandedTreeIds] = useState(() => new Set());
    const [zoom, setZoom] = useState(1);
    const draggingNodeId = dragState?.id || null;

    useEffect(() => {
        zoomRef.current = zoom;
    }, [zoom]);

    useEffect(() => {
        zoomTargetRef.current = zoom;
    }, [zoom]);

    useEffect(() => {
        if (selectedNodeId && !nodes.some((node) => node.id === selectedNodeId)) {
            setSelectedNodeId(null);
        }
    }, [nodes, selectedNodeId]);

    useEffect(() => {
        setExpandedTreeIds((previous) => {
            const validIds = new Set(nodes.map((node) => node.id));
            const next = new Set([...previous].filter((id) => validIds.has(id)));

            nodes.forEach((node) => {
                if (!node.parentId) {
                    next.add(node.id);
                }
            });

            return next;
        });
    }, [nodes]);

    useEffect(() => {
        setBranchFilters((previous) => previous.filter((filter) => nodes.some((node) => node.id === filter.rootId)));
    }, [nodes]);

    const rawPositionedNodes = useMemo(() => (
        nodes.map((node) => ({
            ...node,
            ...(draftPositions[node.id] || {})
        }))
    ), [draftPositions, nodes]);

    const positionedNodes = useMemo(() => {
        const rawLookup = Object.fromEntries(rawPositionedNodes.map((node) => [node.id, node]));

        return rawPositionedNodes.map((node) => {
            const depth = getNodeDepth(node, rawLookup);
            const isExpanded = node.id === selectedNodeId;
            return {
                ...node,
                depth,
                dimensions: getCardDimensions(depth, isExpanded)
            };
        });
    }, [rawPositionedNodes, selectedNodeId]);

    const nodesById = useMemo(() => (
        Object.fromEntries(positionedNodes.map((node) => [node.id, node]))
    ), [positionedNodes]);

    const childCountById = useMemo(() => {
        const counts = {};
        positionedNodes.forEach((node) => {
            counts[node.id] = 0;
        });
        positionedNodes.forEach((node) => {
            if (node.parentId && counts[node.parentId] !== undefined) {
                counts[node.parentId] += 1;
            }
        });
        return counts;
    }, [positionedNodes]);

    const childrenByParentId = useMemo(() => {
        const lookup = {};
        positionedNodes.forEach((node) => {
            if (!node.parentId) {
                return;
            }

            if (!lookup[node.parentId]) {
                lookup[node.parentId] = [];
            }

            lookup[node.parentId].push(node.id);
        });

        return lookup;
    }, [positionedNodes]);

    const rootNodes = useMemo(() => (
        positionedNodes
            .filter((node) => !node.parentId)
            .sort((a, b) => (a.y - b.y) || (a.x - b.x))
    ), [positionedNodes]);

    const selectedNode = selectedNodeId ? nodesById[selectedNodeId] : null;
    const selectedBranchFilter = selectedNode ? branchFilters.find((filter) => filter.rootId === selectedNode.id) : null;
    const branchFocusNodes = useMemo(() => (
        branchFilters
            .map((filter) => ({
                ...filter,
                node: nodesById[filter.rootId],
                meta: BRANCH_FILTER_MODES[filter.mode]
            }))
            .filter((entry) => entry.node && entry.meta)
    ), [branchFilters, nodesById]);
    const branchFocusedIds = useMemo(() => (
        branchFilters.length > 0 ? collectUnionSubtreeIds(branchFilters, childrenByParentId) : null
    ), [branchFilters, childrenByParentId]);

    const relatedNodeIds = useMemo(() => {
        const activeNode = selectedNode;

        if (!activeNode) {
            return new Set(positionedNodes.map((node) => node.id));
        }

        const related = new Set([activeNode.id]);
        let parent = activeNode.parentId ? nodesById[activeNode.parentId] : null;

        while (parent) {
            related.add(parent.id);
            parent = parent.parentId ? nodesById[parent.parentId] : null;
        }

        let foundMore = true;
        while (foundMore) {
            foundMore = false;
            positionedNodes.forEach((node) => {
                if (node.parentId && related.has(node.parentId) && !related.has(node.id)) {
                    related.add(node.id);
                    foundMore = true;
                }
            });
        }

        return related;
    }, [nodesById, positionedNodes, selectedNode]);

    const highlightedNodeIds = branchFocusedIds || relatedNodeIds;

    const connections = useMemo(() => (
        positionedNodes
            .filter((node) => node.parentId && nodesById[node.parentId])
            .map((node) => {
                const parent = nodesById[node.parentId];
                const parentColors = COLOR_STYLES[parent.color] || COLOR_STYLES.slate;
                const inFocusedBranch = !branchFocusedIds || (branchFocusedIds.has(node.id) && branchFocusedIds.has(parent.id));
                return {
                    id: `${node.parentId}-${node.id}`,
                    from: parent,
                    to: node,
                    emphasized: inFocusedBranch && relatedNodeIds.has(node.id) && relatedNodeIds.has(parent.id),
                    muted: !inFocusedBranch,
                    stroke: parentColors.stroke
                };
            })
    ), [branchFocusedIds, nodesById, positionedNodes, relatedNodeIds]);

    const canvasWidth = useMemo(() => {
        const furthestX = positionedNodes.reduce((max, node) => Math.max(max, node.x + (node.dimensions?.width || CARD_WIDTH)), 0);
        return Math.max(MIN_CANVAS_WIDTH, furthestX + CARD_PADDING);
    }, [positionedNodes]);

    const canvasHeight = useMemo(() => {
        const furthestY = positionedNodes.reduce((max, node) => Math.max(max, node.y + (node.dimensions?.height || CARD_HEIGHT)), 0);
        return Math.max(MIN_CANVAS_HEIGHT, furthestY + CARD_PADDING);
    }, [positionedNodes]);

    const stats = useMemo(() => ({
        total: positionedNodes.length,
        focused: positionedNodes.filter((node) => node.focused).length,
        completed: positionedNodes.filter((node) => node.completed).length
    }), [positionedNodes]);

    const handleAddIdea = useCallback(async (positionOverrides = {}) => {
        const newIdea = await addIdea(positionOverrides);
        if (newIdea?.id) {
            setSelectedNodeId(newIdea.id);
        }
    }, [addIdea]);

    const handleAddChild = useCallback(async (parentId = selectedNodeId) => {
        if (!parentId) {
            return;
        }

        const parentNode = nodesById[parentId];
        const parentDimensions = parentNode?.dimensions || getCardDimensions(0);
        const childDimensions = getCardDimensions((parentNode?.depth || 0) + 1);
        const siblingCount = positionedNodes.filter((node) => node.parentId === parentId).length;

        const newIdea = await addChildIdea(parentId, {
            x: (parentNode?.x || 48) + parentDimensions.width + 44,
            y: (parentNode?.y || 72) + siblingCount * (childDimensions.height + 24)
        });
        if (newIdea?.id) {
            setSelectedNodeId(newIdea.id);
        }
    }, [addChildIdea, nodesById, positionedNodes, selectedNodeId]);

    const handleBoardDoubleClick = useCallback(async (event) => {
        if (event.target !== event.currentTarget) {
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const localX = (event.clientX - rect.left) / zoom;
        const localY = (event.clientY - rect.top) / zoom;
        const nextX = clamp(localX - CARD_WIDTH / 2, 24, Math.max(24, canvasWidth - CARD_WIDTH - 24));
        const nextY = clamp(localY - CARD_HEIGHT / 2, 24, Math.max(24, canvasHeight - CARD_HEIGHT - 24));
        await handleAddIdea({ x: nextX, y: nextY });
    }, [canvasHeight, canvasWidth, handleAddIdea, zoom]);

    const handleDragStart = useCallback((event, node) => {
        const boardElement = boardRef.current;
        if (!boardElement) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setSelectedNodeId(node.id);

        setDragState({
            id: node.id,
            pointerId: event.pointerId,
            startPointerX: event.clientX,
            startPointerY: event.clientY,
            startX: node.x,
            startY: node.y
        });
    }, []);

    useEffect(() => {
        if (!dragState) {
            return undefined;
        }

        const handlePointerMove = (event) => {
            const boardElement = boardRef.current;
            if (!boardElement) {
                return;
            }

            const currentNode = nodesById[dragState.id];
            const currentDimensions = currentNode?.dimensions || getCardDimensions(0);
            const nextX = dragState.startX + (event.clientX - dragState.startPointerX) / zoom;
            const nextY = dragState.startY + (event.clientY - dragState.startPointerY) / zoom;
            const clampedX = clamp(nextX, 24, Math.max(24, canvasWidth - currentDimensions.width - 24));
            const clampedY = clamp(nextY, 24, Math.max(24, canvasHeight - currentDimensions.height - 24));

            draftPositionRef.current = { x: clampedX, y: clampedY };
            pendingDragPositionRef.current = { x: clampedX, y: clampedY };

            if (!dragRafRef.current) {
                dragRafRef.current = window.requestAnimationFrame(() => {
                    dragRafRef.current = null;
                    const nextPosition = pendingDragPositionRef.current;
                    if (!nextPosition) {
                        return;
                    }

                    setDraftPositions((previous) => ({
                        ...previous,
                        [dragState.id]: nextPosition
                    }));
                });
            }
        };

        const handlePointerUp = async () => {
            const finalPosition = draftPositionRef.current;

            if (dragRafRef.current) {
                window.cancelAnimationFrame(dragRafRef.current);
                dragRafRef.current = null;
            }

            if (finalPosition) {
                await updateIdea(dragState.id, finalPosition);
            }

            draftPositionRef.current = null;
            pendingDragPositionRef.current = null;
            setDraftPositions((previous) => {
                const next = { ...previous };
                delete next[dragState.id];
                return next;
            });
            setDragState(null);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp, { once: true });

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            if (dragRafRef.current) {
                window.cancelAnimationFrame(dragRafRef.current);
                dragRafRef.current = null;
            }
        };
    }, [canvasHeight, canvasWidth, dragState, nodesById, updateIdea, zoom]);

    const applySelectedUpdate = async (updates) => {
        if (!selectedNode) {
            return;
        }

        await updateIdea(selectedNode.id, updates);
    };

    const toggleBranchFilter = useCallback((rootId, mode) => {
        if (!rootId || !BRANCH_FILTER_MODES[mode]) {
            return;
        }

        setBranchFilters((previous) => {
            const existing = previous.find((filter) => filter.rootId === rootId);

            if (existing?.mode === mode) {
                return previous.filter((filter) => filter.rootId !== rootId);
            }

            if (existing) {
                return previous.map((filter) => (
                    filter.rootId === rootId ? { ...filter, mode } : filter
                ));
            }

            return [...previous, { rootId, mode }];
        });
    }, []);

    const removeBranchFilter = useCallback((rootId) => {
        setBranchFilters((previous) => previous.filter((filter) => filter.rootId !== rootId));
    }, []);

    const handleSelectNode = useCallback((nodeId) => {
        setSelectedNodeId((current) => current === nodeId ? null : nodeId);
    }, []);

    const toggleTreeExpand = useCallback((nodeId) => {
        setExpandedTreeIds((previous) => {
            const next = new Set(previous);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }, []);

    useEffect(() => {
        if (!selectedNodeId) {
            return;
        }

        setExpandedTreeIds((previous) => {
            const next = new Set(previous);
            let current = nodesById[selectedNodeId];

            while (current?.parentId && nodesById[current.parentId]) {
                next.add(current.parentId);
                current = nodesById[current.parentId];
            }

            return next;
        });
    }, [nodesById, selectedNodeId]);

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return undefined;
        }

        const animateZoom = () => {
            const viewportElement = viewportRef.current;
            const anchor = zoomAnchorRef.current;
            if (!viewportElement || !anchor) {
                zoomAnimationRef.current = null;
                return;
            }

            const current = zoomRef.current;
            const target = zoomTargetRef.current;
            const difference = target - current;

            if (Math.abs(difference) < 0.001) {
                zoomRef.current = target;
                setZoom(target);
                viewportElement.scrollLeft = anchor.pointX * target - anchor.offsetX;
                viewportElement.scrollTop = anchor.pointY * target - anchor.offsetY;
                zoomAnimationRef.current = null;
                return;
            }

            const nextZoom = Number((current + difference * 0.11).toFixed(4));
            zoomRef.current = nextZoom;
            setZoom(nextZoom);
            viewportElement.scrollLeft = anchor.pointX * nextZoom - anchor.offsetX;
            viewportElement.scrollTop = anchor.pointY * nextZoom - anchor.offsetY;
            zoomAnimationRef.current = window.requestAnimationFrame(animateZoom);
        };

        const handleWheel = (event) => {
            if (!(event.ctrlKey || event.metaKey)) {
                return;
            }

            event.preventDefault();

            const rect = viewport.getBoundingClientRect();
            const offsetX = event.clientX - rect.left;
            const offsetY = event.clientY - rect.top;
            const pointX = (viewport.scrollLeft + offsetX) / zoomRef.current;
            const pointY = (viewport.scrollTop + offsetY) / zoomRef.current;
            const delta = -event.deltaY * GESTURE_ZOOM_SENSITIVITY;
            const nextZoom = clamp(Number((zoomTargetRef.current + delta).toFixed(3)), MIN_ZOOM, MAX_ZOOM);

            if (nextZoom === zoomTargetRef.current) {
                return;
            }

            zoomTargetRef.current = nextZoom;
            zoomAnchorRef.current = {
                pointX,
                pointY,
                offsetX,
                offsetY
            };

            if (!zoomAnimationRef.current) {
                zoomAnimationRef.current = window.requestAnimationFrame(animateZoom);
            }
        };

        viewport.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            viewport.removeEventListener('wheel', handleWheel);
            if (zoomAnimationRef.current) {
                window.cancelAnimationFrame(zoomAnimationRef.current);
                zoomAnimationRef.current = null;
            }
        };
    }, []);

    return (
        <div className="mx-auto w-full max-w-7xl space-y-4">
            <section className="rounded-[24px] border border-slate-200/80 bg-white/90 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:px-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-amber-700">
                            <Sparkles size={14} />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">Ideas Mind Map</span>
                        </div>
                        <h1 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">Drag boxes around and branch thoughts naturally</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Click a box to edit it, use the icons to check or focus it, and double-click empty space to drop a new idea anywhere.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleAddIdea()}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                        >
                            <Plus size={16} />
                            New idea
                        </button>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            {stats.total} ideas • {stats.focused} focused • {stats.completed} checked
                        </div>

                        <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1">
                            <button
                                type="button"
                                onClick={() => setViewMode('canvas')}
                                className={`${VIEW_TOGGLE_BUTTON_CLASS} ${
                                    viewMode === 'canvas'
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                Canvas
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('tree')}
                                className={`${VIEW_TOGGLE_BUTTON_CLASS} ${
                                    viewMode === 'tree'
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                Tree
                            </button>
                        </div>

                        <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1">
                            <button
                                type="button"
                                onClick={() => setZoom((current) => Math.max(MIN_ZOOM, Number((current - ZOOM_STEP).toFixed(2))))}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                                title="Zoom out"
                            >
                                <Minus size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setZoom(1)}
                                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                                title="Reset zoom"
                            >
                                {Math.round(zoom * 100)}%
                            </button>
                            <button
                                type="button"
                                onClick={() => setZoom((current) => Math.min(MAX_ZOOM, Number((current + ZOOM_STEP).toFixed(2))))}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                                title="Zoom in"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {selectedNode && (
                <section className="rounded-[24px] border border-slate-200/80 bg-white/92 px-4 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:px-5">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Selected idea</p>
                                <h2 className="mt-1 text-lg font-semibold text-slate-900">{selectedNode.title}</h2>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedNodeId(null)}
                                    className={TOOLBAR_BUTTON_CLASS}
                                >
                                    <Unlink2 size={15} />
                                    Unpin
                                </button>

                                <button
                                    type="button"
                                    onClick={() => applySelectedUpdate({ completed: !selectedNode.completed })}
                                    className={TOOLBAR_BUTTON_CLASS}
                                >
                                    <Check size={15} />
                                    {selectedNode.completed ? 'Uncheck' : 'Check'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => applySelectedUpdate({ focused: !selectedNode.focused })}
                                    className={TOOLBAR_BUTTON_CLASS}
                                >
                                    <Target size={15} />
                                    {selectedNode.focused ? 'Unfocus' : 'Focus'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleAddChild}
                                    className={TOOLBAR_BUTTON_CLASS}
                                >
                                    <Plus size={15} />
                                    Add subidea
                                </button>

                                <button
                                    type="button"
                                    onClick={() => toggleBranchFilter(selectedNode.id, 'direct')}
                                    className={selectedBranchFilter?.mode === 'direct'
                                        ? 'inline-flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-900'
                                        : TOOLBAR_BUTTON_CLASS}
                                >
                                    <Sparkles size={15} />
                                    {BRANCH_FILTER_MODES.direct.buttonLabel}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => toggleBranchFilter(selectedNode.id, 'full')}
                                    className={selectedBranchFilter?.mode === 'full'
                                        ? 'inline-flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-900'
                                        : TOOLBAR_BUTTON_CLASS}
                                >
                                    <Sparkles size={15} />
                                    {BRANCH_FILTER_MODES.full.buttonLabel}
                                </button>

                                {branchFilters.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setBranchFilters([])}
                                        className={TOOLBAR_BUTTON_CLASS}
                                    >
                                        <Unlink2 size={15} />
                                        Show all
                                    </button>
                                )}

                                {selectedNode.parentId && (
                                    <button
                                        type="button"
                                        onClick={() => unlinkIdea(selectedNode.id)}
                                        className={TOOLBAR_BUTTON_CLASS}
                                    >
                                        <Unlink2 size={15} />
                                        Detach
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => deleteIdea(selectedNode.id)}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                                >
                                    <Trash2 size={15} />
                                    Delete
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                                <Palette size={14} />
                                Color
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {IDEA_COLOR_OPTIONS.map((color) => {
                                    const colorStyle = COLOR_STYLES[color];
                                    const selected = selectedNode.color === color;

                                    return (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setIdeaColor(selectedNode.id, color)}
                                            className={`h-8 w-8 rounded-full border-2 transition ${
                                                selected ? 'border-slate-900 scale-105' : 'border-white'
                                            } ${colorStyle.accent}`}
                                            title={color}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {branchFocusNodes.length > 0 && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                                <p className="font-medium">Focused branches</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {branchFocusNodes.map((entry) => (
                                        <button
                                            key={`${entry.rootId}-${entry.mode}`}
                                            type="button"
                                            onClick={() => setSelectedNodeId(entry.rootId)}
                                            className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm text-amber-900 shadow-sm transition hover:bg-white"
                                        >
                                            <span>{entry.node.title}</span>
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                                {entry.meta.chipLabel}
                                            </span>
                                            <span
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    removeBranchFilter(entry.rootId);
                                                }}
                                                className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700"
                                            >
                                                x
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            <section className="rounded-[28px] border border-slate-200/80 bg-white/94 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                <div className="mb-3 flex flex-wrap items-center gap-2 px-2 pt-1 text-xs text-slate-500">
                    {viewMode === 'canvas' ? (
                        <>
                            <span className="rounded-full bg-slate-100 px-3 py-1">Double-click empty space to add a box</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1">Drag with the handle</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1">Use Add subidea to connect ideas</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1">Use zoom controls for bigger maps</span>
                        </>
                    ) : (
                        <>
                            <span className="rounded-full bg-slate-100 px-3 py-1">Expand only the branches you want to read</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1">Click a row to select that idea</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1">Use the + button to add nested subideas fast</span>
                        </>
                    )}
                </div>

                {viewMode === 'canvas' ? (
                    <div
                        ref={viewportRef}
                        className="overflow-auto rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.99))]"
                    >
                        <div
                            style={{
                                width: canvasWidth * zoom,
                                height: canvasHeight * zoom
                            }}
                        >
                            <div
                                ref={boardRef}
                                onDoubleClick={handleBoardDoubleClick}
                                onClick={(event) => {
                                    if (event.target === event.currentTarget) {
                                        setSelectedNodeId(null);
                                    }
                                }}
                                className="relative origin-top-left"
                                style={{
                                    width: canvasWidth,
                                    height: canvasHeight,
                                    transform: `scale(${zoom})`,
                                    backgroundImage: 'linear-gradient(rgba(148,163,184,0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.11) 1px, transparent 1px)',
                                    backgroundSize: '32px 32px'
                                }}
                            >
                                <svg className="pointer-events-none absolute inset-0 h-full w-full">
                                    {connections.map((connection) => {
                                        const geometry = getConnectorGeometry(connection.from, connection.to);

                                        return (
                                            <path
                                                key={connection.id}
                                                d={`M ${geometry.startX} ${geometry.startY} C ${geometry.control1X} ${geometry.control1Y}, ${geometry.control2X} ${geometry.control2Y}, ${geometry.endX} ${geometry.endY}`}
                                                fill="none"
                                                stroke={
                                                    connection.muted
                                                        ? 'rgba(148, 163, 184, 0.12)'
                                                        : connection.emphasized
                                                            ? connection.stroke.replace('0.28', '0.9').replace('0.3', '0.9')
                                                            : connection.stroke
                                                }
                                                strokeWidth={connection.emphasized ? '3.5' : connection.muted ? '1.5' : '2.5'}
                                                strokeLinecap="round"
                                                strokeDasharray={connection.emphasized ? '0' : connection.muted ? '4 10' : '7 8'}
                                                vectorEffect="non-scaling-stroke"
                                            />
                                        );
                                    })}
                                </svg>

                                {loading && (
                                    <div className="absolute inset-x-0 top-6 mx-auto w-fit rounded-full border border-slate-200 bg-white/92 px-4 py-2 text-sm text-slate-500 shadow-sm">
                                        Loading your ideas...
                                    </div>
                                )}

                                {positionedNodes.map((node) => (
                                    <IdeaCard
                                        key={node.id}
                                        node={node}
                                        dimensions={node.dimensions || getCardDimensions(node.depth || 0)}
                                        childCount={childCountById[node.id] || 0}
                                        isSelected={selectedNodeId === node.id}
                                        isRelated={highlightedNodeIds.has(node.id)}
                                        isDragging={draggingNodeId === node.id}
                                        isDimmed={Boolean(branchFocusedIds && !branchFocusedIds.has(node.id) && selectedNodeId !== node.id)}
                                        activeBranchMode={branchFilters.find((filter) => filter.rootId === node.id)?.mode || null}
                                        onSelect={handleSelectNode}
                                        onAddChild={handleAddChild}
                                        onDelete={deleteIdea}
                                        onSave={updateIdea}
                                        onToggleComplete={(idea) => updateIdea(idea.id, { completed: !idea.completed })}
                                        onToggleFocus={(idea) => updateIdea(idea.id, { focused: !idea.focused })}
                                        onDragStart={handleDragStart}
                                        onToggleBranchFilter={toggleBranchFilter}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.99))] p-4">
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setExpandedTreeIds(new Set(positionedNodes.map((node) => node.id)))}
                                className={TOOLBAR_BUTTON_CLASS}
                            >
                                Expand all
                            </button>
                            <button
                                type="button"
                                onClick={() => setExpandedTreeIds(new Set(rootNodes.map((node) => node.id)))}
                                className={TOOLBAR_BUTTON_CLASS}
                            >
                                Collapse to top level
                            </button>
                        </div>

                        {rootNodes.length > 0 ? (
                            <div className="space-y-3">
                                {rootNodes.map((node) => (
                                    <IdeaTreeNode
                                        key={node.id}
                                        node={node}
                                        nodesById={nodesById}
                                        childrenByParentId={childrenByParentId}
                                        childCountById={childCountById}
                                        expandedTreeIds={expandedTreeIds}
                                        selectedNodeId={selectedNodeId}
                                        onToggleExpand={toggleTreeExpand}
                                        onSelect={(nodeId) => setSelectedNodeId(nodeId)}
                                        onAddChild={handleAddChild}
                                        onToggleComplete={(idea) => updateIdea(idea.id, { completed: !idea.completed })}
                                        onToggleFocus={(idea) => updateIdea(idea.id, { focused: !idea.focused })}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                                No ideas yet. Create one and the tree will appear here.
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
};

export default IdeasBoard;
