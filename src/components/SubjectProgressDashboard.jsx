import { motion as Motion } from 'framer-motion';
import {
    Archive,
    ArrowUpRight,
    BarChart3,
    CheckCircle2,
    ChevronRight,
    SlidersHorizontal,
    Tags,
} from 'lucide-react';
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
    const completionRate = totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0;

    if (subjects.length === 0) {
        return (
            <section className="learning-dashboard learning-dashboard--empty">
                <div className="learning-dashboard__empty-icon"><BarChart3 size={23} /></div>
                <div>
                    <h3 className="app-section-title">No progress to compare yet</h3>
                    <p>Create a learning path and add topics to see progress across your subjects.</p>
                </div>
            </section>
        );
    }

    return (
        <section className="learning-dashboard">
            <header className="learning-dashboard__header">
                <div>
                    <h3 className="app-section-title">Progress overview</h3>
                    <p>Compare momentum and choose the next subject that needs attention.</p>
                </div>
                <dl className="learning-dashboard__metrics">
                    <div><dt>Average</dt><dd>{averageProgress}%</dd></div>
                    <div><dt>Topics done</dt><dd>{completedTopics}/{totalTopics}</dd></div>
                    <div><dt>Next focus</dt><dd>{attentionSubject?.name || strongestSubject?.name || 'Ready'}</dd></div>
                </dl>
            </header>

            <div className="learning-dashboard__toolbar">
                <div>
                    <label>
                        <SlidersHorizontal size={15} />
                        <span className="sr-only">Sort subjects</span>
                        <select value={sortMode} onChange={(event) => onSortModeChange(event.target.value)}>
                            {DASHBOARD_SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <Tags size={15} />
                        <span className="sr-only">Filter by category</span>
                        <select value={selectedCategory} onChange={(event) => onCategoryChange(event.target.value)}>
                            <option value="all">All categories</option>
                            {categories.map((category) => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </label>
                </div>
                <button
                    type="button"
                    className={showArchived ? 'is-active' : ''}
                    onClick={() => onShowArchivedChange(!showArchived)}
                >
                    <Archive size={15} />
                    {showArchived ? 'Hide archived' : 'Show archived'}
                </button>
            </div>

            <div className="learning-dashboard__body">
                <div className="learning-dashboard__subjects">
                    {subjects.map((subject) => (
                        <button
                            key={subject.id}
                            type="button"
                            className={`learning-subject-row${subject.archived ? ' is-archived' : ''}`}
                            data-learning-color={subject.color || 'purple'}
                            onClick={() => onOpenSubject(subject.id)}
                        >
                            <span className="learning-subject-row__icon" aria-hidden="true">{subject.icon || '📚'}</span>
                            <span className="learning-subject-row__content">
                                <span className="learning-subject-row__title-line">
                                    <strong>{subject.name}</strong>
                                    <span className="learning-subject-row__category"><span />{subject.category}</span>
                                    {subject.archived && <span className="learning-subject-row__archived">Archived</span>}
                                </span>
                                <span className="learning-subject-row__next">
                                    {subject.topicCount > 0 ? subject.nextTopic || 'All topics completed' : 'No topics yet'}
                                </span>
                                <span className="learning-subject-row__track" aria-hidden="true">
                                    <Motion.span
                                        initial={{ width: 0 }}
                                        animate={{ width: `${subject.progress}%` }}
                                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                    />
                                </span>
                                <span className="learning-subject-row__meta">
                                    <span>{subject.completedCount}/{subject.topicCount} topics</span>
                                    <span>{formatStudyTime(subject.studiedTime)} studied</span>
                                    {subject.plannedTime > 0 && <span>{formatStudyTime(subject.plannedTime)} planned</span>}
                                    <span>{getLastStudiedLabel(subject.lastStudiedAt)}</span>
                                </span>
                            </span>
                            <span className="learning-subject-row__progress"><strong>{subject.progress}%</strong><ChevronRight size={17} /></span>
                        </button>
                    ))}
                </div>

                <aside className="learning-dashboard__insight">
                    <div className="learning-dashboard__insight-heading">
                        <ArrowUpRight size={17} />
                        <h4>Where to focus</h4>
                    </div>
                    <div>
                        <span>Strongest subject</span>
                        <strong>{strongestSubject?.name || 'No subjects yet'}</strong>
                        <small>{strongestSubject ? `${strongestSubject.progress}% complete` : 'Add topics to start tracking.'}</small>
                    </div>
                    <div>
                        <span>Next move</span>
                        <strong>{attentionSubject?.name || 'All clear'}</strong>
                        <small>{attentionSubject?.nextTopic || 'Nothing needs attention right now.'}</small>
                    </div>
                    <div>
                        <span className="learning-dashboard__completion-label"><span><CheckCircle2 size={14} /> Overall completion</span><strong>{completionRate}%</strong></span>
                        <span className="learning-dashboard__completion-track"><span style={{ width: `${completionRate}%` }} /></span>
                        <small>{completedTopics} of {totalTopics} active topics completed.</small>
                    </div>
                </aside>
            </div>
        </section>
    );
};

export default SubjectProgressDashboard;
