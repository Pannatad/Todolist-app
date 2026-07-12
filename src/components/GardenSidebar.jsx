import { AnimatePresence, motion as Motion, Reorder } from 'framer-motion';
import { CalendarDays, CheckCircle2, Clock, Palette, Plus, Save, Target, X } from 'lucide-react';
import { getColorForSubject } from '../constants/subjects';
import { getTaskChunkEstimate } from '../utils/taskState';
import { ChunkReorderItem } from './gardenTaskRows';

const GardenSidebar = ({ view }) => {
    const {
        activeTasks,
        addChunk,
        addNestedSubtask,
        chooseChunkDifficulty,
        chunkDifficultyOptions,
        chunkTotalMinutes,
        clearSelectedTask,
        completedChunks,
        deleteChunk,
        deleteNestedSubtask,
        editingChunkDifficultyId,
        existingSubjects,
        expandedChunkIds,
        formatEstimatedTime,
        getChunkDifficultyStyle,
        handleSelectTask,
        isNewChunkDifficultyOpen,
        isTaskDraftDirty,
        isTaskSaving,
        newChunkDifficulty,
        newChunkEstimate,
        newChunkTitle,
        newNestedDrafts,
        onCompleteTask,
        reorderChunks,
        saveChunkOrder,
        saveTaskDetails,
        selectedChunks,
        selectedTask,
        setEditingChunkDifficultyId,
        setIsNewChunkDifficultyOpen,
        setNewChunkDifficulty,
        setNewChunkEstimate,
        setNewChunkTitle,
        taskDraft,
        todayTasks,
        toggleChunkExpanded,
        updateChunk,
        updateNestedSubtask,
        updateNestedDraft,
        updateTaskDraft,
        visibleChunks,
    } = view;

    return (
        <div className="w-full lg:w-[28rem] shrink-0 order-first lg:order-last">
            <div className="lg:sticky lg:top-6">
                <AnimatePresence mode="wait">
                    {selectedTask ? (
                        <Motion.div
                            key="selected-task"
                            initial={{ opacity: 0, x: 24, scale: 0.98 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 16, scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
                            className="overflow-hidden rounded-[2rem] border border-sage-100 bg-white/90 shadow-xl shadow-sage-900/5 backdrop-blur dark:border-white/10 dark:bg-void-900/90"
                        >
                            <div className="border-b border-sage-100 bg-sage-50/75 p-5 dark:border-white/10 dark:bg-void-800/45">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-black uppercase tracking-wide text-sage-500 ring-1 ring-sage-100 dark:bg-void-900 dark:ring-white/10">
                                            <Target size={12} />
                                            Selected task
                                        </p>
                                        <input
                                            type="text"
                                            value={taskDraft.title}
                                            onChange={(event) => updateTaskDraft({ title: event.target.value })}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                    event.preventDefault();
                                                    saveTaskDetails();
                                                }
                                            }}
                                            className="mt-3 w-full rounded-xl border border-transparent bg-transparent px-0 py-1 text-2xl font-black leading-tight text-sage-900 outline-none transition focus:border-sage-200 focus:bg-white/80 focus:px-3 focus:ring-2 focus:ring-sage-300 dark:text-bone-100 dark:focus:border-white/10 dark:focus:bg-void-800"
                                            placeholder="Task name"
                                        />
                                    </div>
                                    <button
                                        onClick={clearSelectedTask}
                                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sage-400 shadow-sm ring-1 ring-sage-100 transition-colors hover:text-sage-700 dark:bg-void-900 dark:ring-white/10 dark:hover:text-bone-200"
                                        title="Back to schedule"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-sage-400 dark:text-bone-200/50">
                                            Due date
                                        </label>
                                        <input
                                            type="date"
                                            value={taskDraft.date}
                                            onChange={(event) => updateTaskDraft({ date: event.target.value })}
                                            className="w-full border-b border-sage-200 bg-transparent px-0 py-2 text-sm font-bold text-sage-900 outline-none transition focus:border-sage-500 dark:border-white/10 dark:text-bone-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-sage-400 dark:text-bone-200/50">
                                            Time
                                        </label>
                                        <input
                                            type="time"
                                            value={taskDraft.time}
                                            onChange={(event) => updateTaskDraft({ time: event.target.value })}
                                            disabled={!taskDraft.date}
                                            className="w-full border-b border-sage-200 bg-transparent px-0 py-2 text-sm font-bold text-sage-900 outline-none transition focus:border-sage-500 disabled:opacity-50 dark:border-white/10 dark:text-bone-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-sage-400 dark:text-bone-200/50">
                                            Tag
                                        </label>
                                        <input
                                            type="text"
                                            value={taskDraft.subject}
                                            onChange={(event) => updateTaskDraft({ subject: event.target.value })}
                                            list="garden-task-tags"
                                            className="w-full border-b border-sage-200 bg-transparent px-0 py-2 text-sm font-bold text-sage-900 outline-none transition placeholder:text-sage-400 focus:border-sage-500 dark:border-white/10 dark:text-bone-100"
                                            placeholder="Tag"
                                        />
                                        <datalist id="garden-task-tags">
                                            {existingSubjects.map(subject => (
                                                <option key={subject} value={subject} />
                                            ))}
                                        </datalist>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-sage-400 dark:text-bone-200/50">
                                            Difficulty
                                        </label>
                                        <select
                                            value={taskDraft.difficulty}
                                            onChange={(event) => updateTaskDraft({ difficulty: event.target.value })}
                                            className="w-full border-b border-sage-200 bg-transparent px-0 py-2 text-sm font-bold capitalize text-sage-900 outline-none transition focus:border-sage-500 dark:border-white/10 dark:text-bone-100"
                                        >
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold">
                                    <button
                                        type="button"
                                        onClick={saveTaskDetails}
                                        disabled={!isTaskDraftDirty || !taskDraft.title.trim() || isTaskSaving}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-sage-600 px-3.5 py-2.5 text-white transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-45"
                                    >
                                        <Save size={14} />
                                        {isTaskSaving ? 'Saving...' : 'Save details'}
                                    </button>
                                    {taskDraft.date && (
                                        <button
                                            type="button"
                                            onClick={() => updateTaskDraft({ date: '', time: '09:00' })}
                                            className="rounded-xl px-3 py-2.5 text-sage-500 transition-colors hover:bg-white hover:text-sage-700 dark:text-bone-300 dark:hover:bg-void-800"
                                        >
                                            Clear due date
                                        </button>
                                    )}
                                    {chunkTotalMinutes > 0 && (
                                        <span className="px-2.5 py-1 rounded-full bg-sage-100 dark:bg-void-800 text-sage-600 dark:text-bone-300 inline-flex items-center gap-1">
                                            <Clock size={12} />
                                            {formatEstimatedTime(chunkTotalMinutes)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="p-5">
                                <div className="flex items-center justify-between gap-3 mb-4">
                                    <div>
                                        <h4 className="text-lg font-black text-sage-900 dark:text-bone-100">Task Chunks</h4>
                                        <p className="text-sm text-sage-500 dark:text-bone-200/60">
                                            {selectedChunks.length > 0
                                                ? `${completedChunks}/${selectedChunks.length} done${chunkTotalMinutes > 0 ? ` - ${formatEstimatedTime(chunkTotalMinutes)} total` : ''}`
                                                : 'Break it into one small next step.'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => onCompleteTask(selectedTask.id)}
                                        className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-sage-600 hover:bg-sage-700 text-white text-sm font-bold transition-colors shadow-md shadow-sage-600/20"
                                    >
                                        <CheckCircle2 size={16} />
                                        Done
                                    </button>
                                </div>

                                <Reorder.Group
                                    as="div"
                                    axis="y"
                                    values={visibleChunks}
                                    onReorder={reorderChunks}
                                    className="space-y-3"
                                >
                                    {visibleChunks.map((chunk) => {
                                        const difficultyStyle = getChunkDifficultyStyle(chunk.difficulty);

                                        return (
                                            <ChunkReorderItem
                                                key={chunk.id}
                                                chunk={chunk}
                                                difficultyStyle={difficultyStyle}
                                                chunkDifficultyOptions={chunkDifficultyOptions}
                                                editingChunkDifficultyId={editingChunkDifficultyId}
                                                expandedChunkIds={expandedChunkIds}
                                                getChunkDifficultyStyle={getChunkDifficultyStyle}
                                                newNestedDraft={newNestedDrafts[chunk.id]}
                                                onAddNested={addNestedSubtask}
                                                onChooseDifficulty={chooseChunkDifficulty}
                                                onDelete={deleteChunk}
                                                onDeleteNested={deleteNestedSubtask}
                                                onDragEnd={saveChunkOrder}
                                                onSetEditingDifficulty={setEditingChunkDifficultyId}
                                                onToggleExpanded={toggleChunkExpanded}
                                                onUpdate={updateChunk}
                                                onUpdateNested={updateNestedSubtask}
                                                onUpdateNestedDraft={updateNestedDraft}
                                            />
                                        );
                                    })}
                                </Reorder.Group>

                                <div className={`relative mt-4 rounded-2xl border p-3 ${getChunkDifficultyStyle(newChunkDifficulty).panel}`}>
                                    <div className="grid grid-cols-[1fr_4.5rem_auto_auto] gap-2 items-center">
                                        <input
                                            type="text"
                                            value={newChunkTitle}
                                            onChange={(event) => setNewChunkTitle(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                    event.preventDefault();
                                                    addChunk();
                                                }
                                            }}
                                            className={`min-w-0 px-1 py-2.5 rounded-lg bg-transparent border border-transparent text-sm font-semibold ${getChunkDifficultyStyle(newChunkDifficulty).text} placeholder-sage-500 focus:outline-none focus:ring-2 ${getChunkDifficultyStyle(newChunkDifficulty).focus} focus:bg-white/45 dark:focus:bg-void-900/45`}
                                            placeholder="Add a small step"
                                        />
                                        <input
                                            type="number"
                                            min="1"
                                            value={newChunkEstimate}
                                            onChange={(event) => setNewChunkEstimate(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                    event.preventDefault();
                                                    addChunk();
                                                }
                                            }}
                                            className={`px-2 py-2.5 text-right rounded-lg bg-transparent border border-transparent text-sm font-bold ${getChunkDifficultyStyle(newChunkDifficulty).text} placeholder-sage-500 focus:outline-none focus:ring-2 ${getChunkDifficultyStyle(newChunkDifficulty).focus} focus:bg-white/45 dark:focus:bg-void-900/45`}
                                            placeholder="min"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setIsNewChunkDifficultyOpen(!isNewChunkDifficultyOpen)}
                                            className={`p-2.5 rounded-xl transition-colors ${getChunkDifficultyStyle(newChunkDifficulty).icon}`}
                                            title="Edit new chunk difficulty"
                                        >
                                            <Palette size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={addChunk}
                                            disabled={!newChunkTitle.trim()}
                                            className="p-2.5 rounded-xl bg-sage-600 hover:bg-sage-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            title="Add chunk"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>

                                    {isNewChunkDifficultyOpen && (
                                        <div className="absolute right-12 top-14 z-30 flex gap-1 rounded-xl border border-white/70 dark:border-white/10 bg-white/95 dark:bg-void-900/95 p-1.5 shadow-xl">
                                            {chunkDifficultyOptions.map(option => {
                                                const optionStyle = getChunkDifficultyStyle(option.value);
                                                const isActive = newChunkDifficulty === option.value;

                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => {
                                                            setNewChunkDifficulty(option.value);
                                                            setIsNewChunkDifficultyOpen(false);
                                                        }}
                                                        className={`h-8 px-2.5 rounded-lg border text-xs font-bold transition-colors ${isActive ? optionStyle.activeButton : optionStyle.inactiveButton}`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Motion.div>
                    ) : (
                        <Motion.div
                            key="today-panel"
                            initial={{ opacity: 0, x: 24, scale: 0.98 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 16, scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
                            className="rounded-3xl border border-sage-100 bg-white/80 p-4 shadow-lg shadow-sage-900/5 backdrop-blur dark:border-white/10 dark:bg-void-900/80"
                        >
                            <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-sage-800 dark:text-bone-100">
                                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-900/30">
                                    <CalendarDays size={18} />
                                </span>
                                Today's Schedule
                            </h3>

                            <div className="space-y-3">
                                {todayTasks.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-sage-200 bg-sage-50/70 p-6 text-center text-sm font-medium text-sage-500 dark:border-white/10 dark:bg-void-800/60 dark:text-bone-200/60">
                                        Nothing scheduled today.
                                    </div>
                                ) : (
                                    todayTasks.map(task => {
                                        const subjectColor = getColorForSubject(task.subject);
                                        const time = new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        const taskChunkMinutes = getTaskChunkEstimate(task);

                                        return (
                                            <Motion.div
                                                key={task.id}
                                                whileHover={{ y: -2, scale: 1.01 }}
                                                whileTap={{ scale: 0.99 }}
                                                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/70 p-3 shadow-sm transition-shadow hover:shadow-md dark:border-white/10"
                                                style={{
                                                    backgroundColor: subjectColor.bgColor,
                                                    boxShadow: `inset 4px 0 0 ${subjectColor.color}`
                                                }}
                                                onClick={() => handleSelectTask(task.id)}
                                            >
                                                <div className="mb-2 flex justify-between items-start gap-3">
                                                    <span
                                                        className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-black dark:bg-black/20"
                                                        style={{ color: subjectColor.color }}
                                                    >
                                                        {task.subject || 'Task'}
                                                    </span>
                                                    <span className="text-xs font-black opacity-70" style={{ color: subjectColor.color }}>
                                                        {time}
                                                    </span>
                                                </div>
                                                <h4 className="mb-2 line-clamp-2 text-sm font-black text-ink-800 dark:text-ink-800">
                                                    {task.title}
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs font-bold opacity-80 text-ink-500">
                                                    <span className="capitalize">{task.difficulty}</span>
                                                    {task.status === 'growing' && <span>In Progress</span>}
                                                    {taskChunkMinutes > 0 && (
                                                        <span className="ml-auto font-medium" style={{ color: subjectColor.color }}>
                                                            {formatEstimatedTime(taskChunkMinutes)}
                                                        </span>
                                                    )}
                                                </div>
                                            </Motion.div>
                                        );
                                    })
                                )}
                                {activeTasks.length > 0 && (
                                    <p className="px-2 text-center text-xs font-medium text-sage-500 dark:text-bone-200/60">
                                        Click any task to open chunking here.
                                    </p>
                                )}
                            </div>
                        </Motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default GardenSidebar;
