import { Reorder } from 'framer-motion';
import { Plus, Save, X } from 'lucide-react';
import { ChunkReorderItem } from './gardenTaskRows';

const GardenSidebar = ({ view }) => {
    const { addChunk, addNestedSubtask, chunkTotalMinutes, clearSelectedTask, completedChunks, deleteChunk, deleteNestedSubtask, existingSubjects, expandedChunkIds, formatEstimatedTime, isTaskDraftDirty, isTaskSaving, newChunkEstimate, newChunkTitle, newNestedDrafts, reorderChunks, saveChunkOrder, saveTaskDetails, selectedChunks, selectedTask, setNewChunkEstimate, setNewChunkTitle, taskDraft, toggleChunkExpanded, updateChunk, updateNestedSubtask, updateNestedDraft, updateTaskDraft, visibleChunks } = view;
    if (!selectedTask) return null;

    return <div className="task-detail-panel">
        <section className="task-detail-fields">
            <div className="task-detail-heading">
                <label><span className="sr-only">Task title</span><input value={taskDraft.title} onChange={(event) => updateTaskDraft({ title: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); saveTaskDetails(); } }} placeholder="Task title" /></label>
                <button type="button" className="task-detail-close" onClick={clearSelectedTask} aria-label="Close task details"><X size={18} /></button>
            </div>
            <div className="task-detail-grid">
                <label><span>Due date</span><input type="date" value={taskDraft.date} onChange={(event) => updateTaskDraft({ date: event.target.value })} /></label>
                <label><span>Time</span><input type="time" value={taskDraft.time} onChange={(event) => updateTaskDraft({ time: event.target.value })} disabled={!taskDraft.date} /></label>
                <label><span>Category</span><input value={taskDraft.subject} onChange={(event) => updateTaskDraft({ subject: event.target.value })} list="garden-task-categories" placeholder="Uncategorized" /><datalist id="garden-task-categories">{existingSubjects.map((subject) => <option key={subject} value={subject} />)}</datalist></label>
                <div><span>Estimate</span><output>{formatEstimatedTime(chunkTotalMinutes) || 'No estimate'}</output></div>
            </div>
            <div className="task-detail-actions">
                {isTaskDraftDirty && <button type="button" className="task-primary-button" onClick={saveTaskDetails} disabled={!taskDraft.title.trim() || isTaskSaving}><Save size={15} />{isTaskSaving ? 'Saving…' : 'Save'}</button>}
                {taskDraft.date && <button type="button" className="task-secondary-button" onClick={() => updateTaskDraft({ date: '', time: '09:00' })}>Clear due date</button>}
            </div>
        </section>
        <section className="task-subtasks">
            <header><div><h2>Subtasks</h2><p>{selectedChunks.length ? `${completedChunks}/${selectedChunks.length} complete · ${formatEstimatedTime(chunkTotalMinutes) || 'No estimate'}` : 'Break this task into a small next step.'}</p></div></header>
            <Reorder.Group axis="y" values={visibleChunks} onReorder={reorderChunks} className="task-subtask-list">
                {visibleChunks.map((chunk) => <ChunkReorderItem key={chunk.id} chunk={chunk} expandedChunkIds={expandedChunkIds} newNestedDraft={newNestedDrafts[chunk.id]} onAddNested={addNestedSubtask} onDelete={deleteChunk} onDeleteNested={deleteNestedSubtask} onDragEnd={saveChunkOrder} onToggleExpanded={toggleChunkExpanded} onUpdate={updateChunk} onUpdateNested={updateNestedSubtask} onUpdateNestedDraft={updateNestedDraft} />)}
            </Reorder.Group>
            <div className="new-subtask-row">
                <input value={newChunkTitle} onChange={(event) => setNewChunkTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addChunk(); } }} placeholder="Add a subtask" aria-label="New subtask title" />
                <input type="number" min="1" value={newChunkEstimate} onChange={(event) => setNewChunkEstimate(event.target.value)} placeholder="min" aria-label="New subtask estimate" />
                <button type="button" className="task-primary-icon" onClick={addChunk} disabled={!newChunkTitle.trim()} aria-label="Add subtask"><Plus size={18} /></button>
            </div>
        </section>
    </div>;
};

export default GardenSidebar;
