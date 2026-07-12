import { motion as Motion } from 'framer-motion';
import { Archive, Award, BarChart3, CheckCircle2, ChevronRight, SlidersHorizontal, Tags, Zap } from 'lucide-react';
import { COLOR_OPTIONS } from './LearningPathModal';
import { DASHBOARD_SORT_OPTIONS, formatStudyTime, getLastStudiedLabel } from './learningTrackerUtils';

const SubjectProgressDashboard = ({
    subjects,
    categories,
    selectedCategory,
    onCategoryChange,
    sortMode,
    onSortModeChange,
    showArchived,
    onShowArchivedChange,
    onOpenSubject,
}) => {
    const activeSubjects = subjects.filter((subject) => subject.topicCount > 0);
    const averageProgress = activeSubjects.length
        ? Math.round(activeSubjects.reduce((sum, subject) => sum + subject.progress, 0) / activeSubjects.length)
        : 0;
    const completedTopics = activeSubjects.reduce((sum, subject) => sum + subject.completedCount, 0);
    const totalTopics = activeSubjects.reduce((sum, subject) => sum + subject.topicCount, 0);
    const strongestSubject = [...activeSubjects].sort((a, b) => b.progress - a.progress)[0];
    const attentionSubject = [...activeSubjects]
        .filter((subject) => subject.progress < 100)
        .sort((a, b) => {
            if (a.inProgressCount !== b.inProgressCount) return b.inProgressCount - a.inProgressCount;
            return a.progress - b.progress;
        })[0];

    if (subjects.length === 0) {
        return (
            <section className="rounded-[1.75rem] border border-sage-100 bg-white/85 p-10 text-center shadow-sm dark:border-white/10 dark:bg-void-900/80">
                <div className="w-14 h-14 rounded-2xl bg-sage-50 text-sage-600 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No subjects to visualize yet</h3>
                <p className="text-sm text-gray-400 mt-2">Create a learning path and add topics to see your dashboard.</p>
            </section>
        );
    }

    return (
        <section className="overflow-hidden rounded-[1.75rem] border border-sage-100 bg-white/85 shadow-sm dark:border-white/10 dark:bg-void-900/80">
            <div className="px-5 py-4 border-b border-sage-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sage-50 text-sage-600 flex items-center justify-center">
                        <BarChart3 size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Subjects Dashboard</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Progress, momentum, and next topic across selected subjects.</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 min-w-full lg:min-w-[360px]">
                    <div className="rounded-xl bg-sage-50 px-3 py-2">
                        <div className="text-[10px] uppercase font-bold text-sage-500 tracking-wide">Average</div>
                        <div className="text-lg font-bold text-gray-900">{averageProgress}%</div>
                    </div>
                    <div className="rounded-xl bg-emerald-50 px-3 py-2">
                        <div className="text-[10px] uppercase font-bold text-emerald-500 tracking-wide">Topics</div>
                        <div className="text-lg font-bold text-emerald-700">{completedTopics}/{totalTopics}</div>
                    </div>
                    <div className="rounded-xl bg-amber-50 px-3 py-2">
                        <div className="text-[10px] uppercase font-bold text-amber-500 tracking-wide">Focus</div>
                        <div className="text-sm font-bold text-amber-700 truncate">{attentionSubject?.name || strongestSubject?.name || 'Ready'}</div>
                    </div>
                </div>
            </div>

            <div className="px-5 py-3 border-b border-sage-100 bg-sage-50/50 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between dark:border-white/10 dark:bg-void-800/40">
                <div className="flex flex-col sm:flex-row gap-2">
                    <label className="flex items-center gap-2 rounded-xl border border-sage-100 bg-white px-3 py-2 text-sm text-gray-500">
                        <SlidersHorizontal size={15} className="text-gray-400" />
                        <select
                            value={sortMode}
                            onChange={(event) => onSortModeChange(event.target.value)}
                            className="bg-transparent font-bold text-gray-700 focus:outline-none"
                        >
                            {DASHBOARD_SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>

                    <label className="flex items-center gap-2 rounded-xl border border-sage-100 bg-white px-3 py-2 text-sm text-gray-500">
                        <Tags size={15} className="text-gray-400" />
                        <select
                            value={selectedCategory}
                            onChange={(event) => onCategoryChange(event.target.value)}
                            className="bg-transparent font-bold text-gray-700 focus:outline-none"
                        >
                            <option value="all">All categories</option>
                            {categories.map((category) => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <button
                    onClick={() => onShowArchivedChange(!showArchived)}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-all ${
                        showArchived
                            ? 'border-sage-200 bg-sage-50 text-sage-700'
                            : 'border-sage-100 bg-white text-gray-500 hover:bg-sage-50'
                    }`}
                >
                    <Archive size={15} />
                    Archived {showArchived ? 'shown' : 'hidden'}
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px]">
                <div className="space-y-3 p-3">
                    {subjects.map((subject, index) => {
                        const colorConfig = COLOR_OPTIONS.find((color) => color.name === subject.color) || COLOR_OPTIONS[0];
                        const hasTopics = subject.topicCount > 0;

                        return (
                            <Motion.button
                                key={subject.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: 'spring', stiffness: 320, damping: 32, delay: index * 0.03 }}
                                whileHover={{ x: 3 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => onOpenSubject(subject.id)}
                                className={`group w-full rounded-[1.35rem] border p-3 text-left shadow-sm transition-colors hover:bg-white/70 hover:shadow-md dark:bg-void-900/70 ${
                                    subject.archived
                                        ? 'border-slate-200 bg-slate-50/90'
                                        : `${colorConfig.soft || 'bg-sage-50'} ${colorConfig.border || 'border-sage-100'}`
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-14 h-14 rounded-full flex-shrink-0 grid place-items-center shadow-sm"
                                        style={{ background: `conic-gradient(rgb(106 158 133) ${subject.progress * 3.6}deg, rgba(255,255,255,0.72) 0deg)` }}
                                    >
                                        <div className="w-11 h-11 rounded-full bg-white grid place-items-center text-xl shadow-sm">
                                            {subject.icon || '📚'}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="truncate text-sm font-black text-slate-950">{subject.name}</h4>
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ${colorConfig.text || 'text-sage-700'} bg-white/60 ${colorConfig.border || 'border-sage-100'}`}>
                                                        {subject.category}
                                                    </span>
                                                    {subject.archived && (
                                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                                            Archived
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-0.5 truncate text-xs font-semibold text-slate-500/80">
                                                    {hasTopics ? subject.nextTopic || 'All topics completed' : 'No topics yet'}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <div className="text-lg font-black text-slate-950">{subject.progress}%</div>
                                                <div className="text-[10px] font-semibold text-slate-400">{getLastStudiedLabel(subject.lastStudiedAt)}</div>
                                            </div>
                                        </div>

                                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/65">
                                            <Motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${subject.progress}%` }}
                                                transition={{ type: 'spring', stiffness: 210, damping: 26 }}
                                                className={`h-full rounded-full bg-gradient-to-r ${colorConfig.gradient}`}
                                            />
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                                            <span className="rounded-full bg-white/60 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-100">
                                                {subject.completedCount}/{subject.topicCount} done
                                            </span>
                                            <span className="rounded-full bg-white/60 px-2 py-0.5 text-amber-700 ring-1 ring-amber-100">
                                                {subject.inProgressCount} active
                                            </span>
                                            <span className="rounded-full bg-white/60 px-2 py-0.5 text-sky-700 ring-1 ring-sky-100">
                                                {formatStudyTime(subject.studiedTime)} studied
                                            </span>
                                            {subject.plannedTime > 0 && (
                                                <span className="rounded-full bg-white/50 px-2 py-0.5 text-slate-500 ring-1 ring-white/70">
                                                    {formatStudyTime(subject.plannedTime)} planned
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <ChevronRight size={16} className="flex-shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-slate-600" />
                                </div>
                            </Motion.button>
                        );
                    })}
                </div>

                <aside className="border-t xl:border-t-0 xl:border-l border-sage-100 p-5 bg-sage-50/45 space-y-4 dark:border-white/10 dark:bg-void-800/30">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Award size={16} className="text-yellow-500" />
                            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">Strongest</h4>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{strongestSubject?.name || 'No subjects yet'}</p>
                        <p className="text-xs text-gray-400 mt-1">{strongestSubject ? `${strongestSubject.progress}% complete` : 'Create a subject to start tracking.'}</p>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Zap size={16} className="text-amber-500" />
                            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">Next Push</h4>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{attentionSubject?.name || 'All clear'}</p>
                        <p className="text-xs text-gray-400 mt-1">{attentionSubject?.nextTopic || 'Nothing urgent right now.'}</p>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 size={16} className="text-emerald-500" />
                            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">Completion</h4>
                        </div>
                        <div className="h-2 rounded-full bg-white overflow-hidden">
                            <div
                                className="h-full rounded-full bg-emerald-400"
                                style={{ width: totalTopics ? `${(completedTopics / totalTopics) * 100}%` : '0%' }}
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{completedTopics} of {totalTopics} active topics completed.</p>
                    </div>
                </aside>
            </div>
        </section>
    );
};

export default SubjectProgressDashboard;
