import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Clock, BookOpen, Trash2, Edit2, ArchiveRestore, Archive, Pin, ChevronRight } from 'lucide-react';
import { COLOR_OPTIONS } from './LearningPathModal';
import { confirmAction } from '../utils/confirm';

const CARD_PALETTES = {
    purple: {
        shell: 'border-violet-200 bg-violet-50/90 shadow-violet-200/45 hover:border-violet-300',
        icon: 'border-violet-200 bg-white/75 text-violet-700',
        toolbar: 'bg-white/55 text-violet-500 ring-violet-100',
        chip: 'bg-white/60 text-violet-700 ring-violet-100',
        track: 'bg-violet-100/80',
        muted: 'text-violet-900/55',
        title: 'text-violet-950',
        chevron: 'text-violet-300 group-hover:text-violet-600',
    },
    blue: {
        shell: 'border-sky-200 bg-sky-50/90 shadow-sky-200/45 hover:border-sky-300',
        icon: 'border-sky-200 bg-white/75 text-sky-700',
        toolbar: 'bg-white/55 text-sky-500 ring-sky-100',
        chip: 'bg-white/60 text-sky-700 ring-sky-100',
        track: 'bg-sky-100/80',
        muted: 'text-sky-900/55',
        title: 'text-sky-950',
        chevron: 'text-sky-300 group-hover:text-sky-600',
    },
    teal: {
        shell: 'border-teal-200 bg-teal-50/90 shadow-teal-200/45 hover:border-teal-300',
        icon: 'border-teal-200 bg-white/75 text-teal-700',
        toolbar: 'bg-white/55 text-teal-500 ring-teal-100',
        chip: 'bg-white/60 text-teal-700 ring-teal-100',
        track: 'bg-teal-100/80',
        muted: 'text-teal-900/55',
        title: 'text-teal-950',
        chevron: 'text-teal-300 group-hover:text-teal-600',
    },
    emerald: {
        shell: 'border-emerald-200 bg-emerald-50/90 shadow-emerald-200/45 hover:border-emerald-300',
        icon: 'border-emerald-200 bg-white/75 text-emerald-700',
        toolbar: 'bg-white/55 text-emerald-500 ring-emerald-100',
        chip: 'bg-white/60 text-emerald-700 ring-emerald-100',
        track: 'bg-emerald-100/80',
        muted: 'text-emerald-900/55',
        title: 'text-emerald-950',
        chevron: 'text-emerald-300 group-hover:text-emerald-600',
    },
    amber: {
        shell: 'border-amber-200 bg-amber-50/95 shadow-amber-200/45 hover:border-amber-300',
        icon: 'border-amber-200 bg-white/75 text-amber-700',
        toolbar: 'bg-white/55 text-amber-500 ring-amber-100',
        chip: 'bg-white/60 text-amber-700 ring-amber-100',
        track: 'bg-amber-100/90',
        muted: 'text-amber-950/55',
        title: 'text-amber-950',
        chevron: 'text-amber-300 group-hover:text-amber-600',
    },
    pink: {
        shell: 'border-pink-200 bg-pink-50/90 shadow-pink-200/45 hover:border-pink-300',
        icon: 'border-pink-200 bg-white/75 text-pink-700',
        toolbar: 'bg-white/55 text-pink-500 ring-pink-100',
        chip: 'bg-white/60 text-pink-700 ring-pink-100',
        track: 'bg-pink-100/80',
        muted: 'text-pink-950/55',
        title: 'text-pink-950',
        chevron: 'text-pink-300 group-hover:text-pink-600',
    },
    red: {
        shell: 'border-rose-200 bg-rose-50/90 shadow-rose-200/45 hover:border-rose-300',
        icon: 'border-rose-200 bg-white/75 text-rose-700',
        toolbar: 'bg-white/55 text-rose-500 ring-rose-100',
        chip: 'bg-white/60 text-rose-700 ring-rose-100',
        track: 'bg-rose-100/80',
        muted: 'text-rose-950/55',
        title: 'text-rose-950',
        chevron: 'text-rose-300 group-hover:text-rose-600',
    },
    indigo: {
        shell: 'border-indigo-200 bg-indigo-50/90 shadow-indigo-200/45 hover:border-indigo-300',
        icon: 'border-indigo-200 bg-white/75 text-indigo-700',
        toolbar: 'bg-white/55 text-indigo-500 ring-indigo-100',
        chip: 'bg-white/60 text-indigo-700 ring-indigo-100',
        track: 'bg-indigo-100/80',
        muted: 'text-indigo-950/55',
        title: 'text-indigo-950',
        chevron: 'text-indigo-300 group-hover:text-indigo-600',
    },
};

const LearningPathCard = ({ path, progress, topicCount, completedCount, plannedTime, studiedTime, isPinned = false, onClick, onEdit, onDelete, onArchive, onRestore, onTogglePin }) => {
    const colorConfig = COLOR_OPTIONS.find(c => c.name === path.color) || COLOR_OPTIONS[0];
    const palette = CARD_PALETTES[path.color] || CARD_PALETTES.purple;

    const getDaysLeft = () => {
        if (!path.target_completion_date) return null;
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const [year, month, day] = path.target_completion_date.split('-').map(Number);
        const end = new Date(year, (month || 1) - 1, day || 1);
        end.setHours(0, 0, 0, 0);
        const diff = end - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days < 0) return { text: 'Overdue', urgent: true };
        if (days === 0) return { text: 'Today!', urgent: true };
        if (days === 1) return { text: '1 day left', urgent: false };
        return { text: `${days} days left`, urgent: days <= 7 };
    };

    const formatTime = (minutes) => {
        if (!minutes) return '0h';
        if (minutes < 60) return `${minutes}m`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    const deadline = getDaysLeft();

    return (
        <Motion.div
            whileHover={{ y: -4, rotate: -0.15 }}
            whileTap={{ scale: 0.985, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            onClick={onClick}
            className={`group relative cursor-pointer overflow-hidden rounded-[1.55rem] border shadow-sm transition-colors hover:shadow-lg dark:bg-void-900/85 ${palette.shell}`}
        >
            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-2xl shadow-sm ${palette.icon}`}>
                            {path.icon || '📚'}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className={`truncate text-lg font-black leading-tight dark:text-bone-100 ${palette.title}`}>{path.name}</h3>
                                {isPinned && <Pin size={13} className="shrink-0 opacity-70" fill="currentColor" />}
                            </div>
                            {path.category && (
                                <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ${palette.chip}`}>
                                    {path.category}
                                </p>
                            )}
                            {path.description && (
                                <p className={`mt-2 line-clamp-2 text-sm font-semibold leading-5 dark:text-bone-200/60 ${palette.muted}`}>{path.description}</p>
                            )}
                        </div>
                    </div>

                    <div className={`flex shrink-0 gap-1 rounded-2xl p-1 ring-1 backdrop-blur transition-opacity dark:bg-void-800 ${palette.toolbar} ${isPinned ? 'opacity-100' : 'opacity-100 sm:opacity-75 sm:group-hover:opacity-100'}`}>
                        <button
                            onClick={(e) => { e.stopPropagation(); onTogglePin?.(path.id); }}
                            className={`p-1.5 rounded-xl transition-colors ${
                                isPinned
                                    ? 'bg-white/80 dark:bg-void-700'
                                    : 'hover:bg-white/80 hover:text-amber-600 dark:hover:bg-void-700'
                            }`}
                            title={isPinned ? 'Unpin course' : 'Pin course'}
                        >
                            <Pin size={14} fill={isPinned ? 'currentColor' : 'none'} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(path); }}
                            className="p-1.5 rounded-xl transition-colors hover:bg-white/80 hover:text-slate-700 dark:hover:bg-void-700 dark:hover:text-bone-100"
                            title="Edit"
                        >
                            <Edit2 size={14} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (path.archived) {
                                    onRestore(path.id);
                                } else {
                                    onArchive(path.id);
                                }
                            }}
                            className="p-1.5 rounded-xl transition-colors hover:bg-white/80 hover:text-slate-700 dark:hover:bg-void-700 dark:hover:text-bone-100"
                            title={path.archived ? 'Restore' : 'Archive'}
                        >
                            {path.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirmAction('Delete this learning path and all its topics?')) {
                                    onDelete(path.id);
                                }
                            }}
                            className="p-1.5 rounded-xl transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                            title="Delete"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                <div className="mt-5">
                    <div className={`mb-2 flex items-center justify-between text-xs font-black ${palette.muted}`}>
                        <span>Progress</span>
                        <span className={colorConfig.text || 'text-slate-700'}>{progress}%</span>
                    </div>
                    <div className={`h-2 overflow-hidden rounded-full dark:bg-void-800 ${palette.track}`}>
                        <Motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ type: 'spring', stiffness: 210, damping: 26, mass: 0.9 }}
                            className={`h-full rounded-full bg-gradient-to-r ${colorConfig.gradient}`}
                        />
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <div className={`flex items-center gap-2 rounded-2xl px-3 py-1.5 ring-1 ${palette.chip}`}>
                            <BookOpen size={14} />
                            <span className="text-sm font-black">
                                {completedCount}<span className="font-medium opacity-50">/{topicCount}</span>
                            </span>
                        </div>

                        <div className={`flex items-center gap-1.5 text-xs font-bold dark:text-bone-200/60 ${palette.muted}`}>
                            <Clock size={13} />
                            <span>{formatTime(studiedTime)}</span>
                            {plannedTime > 0 && (
                                <span className="opacity-45">/ {formatTime(plannedTime)} planned</span>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        {deadline && (
                            <span className={`hidden rounded-full px-2 py-1 text-xs font-bold sm:inline-flex ${deadline.urgent
                                ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'
                                : 'bg-white/55 text-slate-500 ring-1 ring-white/60'
                                }`}>
                                {deadline.text}
                            </span>
                        )}
                        <ChevronRight size={17} className={`transition-transform group-hover:translate-x-0.5 ${palette.chevron}`} />
                    </div>
                </div>
            </div>
        </Motion.div>
    );
};

export default LearningPathCard;
