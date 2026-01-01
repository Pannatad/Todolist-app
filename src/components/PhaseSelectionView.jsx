import React, { useState } from 'react';
import { ArrowLeft, Check, Calendar, ListTodo, Plus, MoreVertical, Trash2, Edit2, X } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const PhaseSelectionView = ({ project, onBack, onSelectPhase }) => {
    const { addPhase, updatePhase, deletePhase } = useProject();
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingPhase, setEditingPhase] = useState(null);
    const [newPhaseName, setNewPhaseName] = useState('');
    const [newPhaseDeadline, setNewPhaseDeadline] = useState('');
    const [phaseMenuOpen, setPhaseMenuOpen] = useState(null);

    const sortedPhases = [...(project.phases || [])].sort((a, b) => a.order - b.order);

    // Calculate phase completion
    const getPhaseCompletion = (phaseId) => {
        const phaseTasks = project.tasks.filter(t => t.phaseId === phaseId);
        if (phaseTasks.length === 0) return { total: 0, done: 0, percent: 0 };

        const doneColumn = project.columns.find(c => c.title.toLowerCase() === 'done');
        const doneTasks = doneColumn ? phaseTasks.filter(t => t.columnId === doneColumn.id).length : 0;

        return {
            total: phaseTasks.length,
            done: doneTasks,
            percent: Math.round((doneTasks / phaseTasks.length) * 100)
        };
    };

    const isPhaseComplete = (phaseId) => {
        const { total, done } = getPhaseCompletion(phaseId);
        return total > 0 && done === total;
    };

    const getPhaseColor = (color) => {
        const colors = {
            purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/40 hover:border-purple-400',
            blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/40 hover:border-blue-400',
            amber: 'from-amber-500/20 to-amber-600/20 border-amber-500/40 hover:border-amber-400',
            emerald: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/40 hover:border-emerald-400',
            teal: 'from-teal-500/20 to-teal-600/20 border-teal-500/40 hover:border-teal-400',
            pink: 'from-pink-500/20 to-pink-600/20 border-pink-500/40 hover:border-pink-400',
        };
        return colors[color] || colors.purple;
    };

    const formatDeadline = (deadline) => {
        if (!deadline) return null;
        const date = new Date(deadline);
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    };

    const handleAddPhase = async (e) => {
        e.preventDefault();
        if (!newPhaseName.trim()) return;

        // Pass deadline directly to addPhase
        await addPhase(project.id, newPhaseName, newPhaseDeadline || null);

        setNewPhaseName('');
        setNewPhaseDeadline('');
        setShowAddModal(false);
    };

    const handleEditPhase = async (e) => {
        e.preventDefault();
        if (!editingPhase || !newPhaseName.trim()) return;

        await updatePhase(project.id, editingPhase.id, {
            name: newPhaseName,
            deadline: newPhaseDeadline || null
        });

        setEditingPhase(null);
        setNewPhaseName('');
        setNewPhaseDeadline('');
        setShowEditModal(false);
    };

    const handleDeletePhase = async (phaseId) => {
        if (sortedPhases.length <= 1) {
            alert('You must have at least one phase.');
            return;
        }
        if (window.confirm('Delete this phase? Tasks will be moved to the first remaining phase.')) {
            await deletePhase(project.id, phaseId);
        }
        setPhaseMenuOpen(null);
    };

    const openEditModal = (phase) => {
        setEditingPhase(phase);
        setNewPhaseName(phase.name);
        setNewPhaseDeadline(phase.deadline || '');
        setShowEditModal(true);
        setPhaseMenuOpen(null);
    };

    const togglePhaseMenu = (e, phaseId) => {
        e.stopPropagation();
        setPhaseMenuOpen(phaseMenuOpen === phaseId ? null : phaseId);
    };

    return (
        <div className="h-full flex flex-col relative overflow-hidden bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 rounded-2xl">
            {/* Header */}
            <div className="relative z-10 flex items-center justify-between p-6 border-b border-white/20 bg-white/10 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{project.title}</h2>
                        <p className="text-sm text-white/80 font-medium">Select a phase to view tasks</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-indigo-500/30 transition-all font-semibold"
                >
                    <Plus className="w-4 h-4" />
                    Add Phase
                </button>
            </div>

            {/* Phase Grid */}
            <div className="relative z-10 flex-1 p-8 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {sortedPhases.map((phase, index) => {
                        const completion = getPhaseCompletion(phase.id);
                        const isComplete = isPhaseComplete(phase.id);
                        const deadline = formatDeadline(phase.deadline);

                        // Cycle through colors for each phase
                        const phaseColors = [
                            'from-pink-400/30 to-rose-400/20',      // Pink
                            'from-purple-400/30 to-violet-400/20',  // Purple
                            'from-blue-400/30 to-indigo-400/20',    // Blue
                            'from-cyan-400/30 to-teal-400/20',      // Cyan
                            'from-emerald-400/30 to-green-400/20',  // Green
                            'from-amber-400/30 to-orange-400/20',   // Amber
                        ];
                        const colorGradient = phaseColors[index % phaseColors.length];

                        return (
                            <div
                                key={phase.id}
                                className={`relative p-6 rounded-2xl border border-white/30 bg-gradient-to-br ${colorGradient} backdrop-blur-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-white/20 text-left group cursor-pointer`}
                                onClick={() => onSelectPhase(phase.id)}
                            >
                                {/* Phase Menu Button */}
                                <button
                                    onClick={(e) => togglePhaseMenu(e, phase.id)}
                                    className="absolute top-4 right-4 p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-10 backdrop-blur-md"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>

                                {/* Phase Menu Dropdown */}
                                {phaseMenuOpen === phase.id && (
                                    <div
                                        className="absolute top-12 right-4 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-xl shadow-2xl z-20 min-w-[140px] overflow-hidden"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={() => openEditModal(phase)}
                                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/20 flex items-center gap-2 text-white font-medium"
                                        >
                                            <Edit2 className="w-4 h-4" /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeletePhase(phase.id)}
                                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-500/20 flex items-center gap-2 text-red-300 font-medium"
                                        >
                                            <Trash2 className="w-4 h-4" /> Delete
                                        </button>
                                    </div>
                                )}

                                {/* Completion Checkmark */}
                                {isComplete && (
                                    <div className="absolute top-4 right-4 p-2 bg-emerald-400/30 backdrop-blur-md rounded-xl border border-emerald-300/50">
                                        <Check className="w-5 h-5 text-white" />
                                    </div>
                                )}

                                {/* Phase Number */}
                                <div className="text-sm font-bold text-white/70 uppercase tracking-wider mb-1">
                                    Phase {index + 1}
                                </div>

                                {/* Phase Name */}
                                <h3 className="text-xl font-bold text-white mb-4">
                                    {phase.name}
                                </h3>

                                {/* Stats Row */}
                                <div className="flex items-center gap-4 text-sm text-white/80 font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <ListTodo className="w-4 h-4" />
                                        <span>{completion.total} Tasks</span>
                                    </div>
                                    {deadline && (
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4" />
                                            <span>{deadline}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-4">
                                    <div className="flex justify-between text-xs text-white/70 font-medium mb-1">
                                        <span>Progress</span>
                                        <span>{completion.percent}%</span>
                                    </div>
                                    <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                                        <div
                                            className={`h-full transition-all duration-500 rounded-full ${isComplete
                                                ? 'bg-gradient-to-r from-emerald-400 to-emerald-300'
                                                : 'bg-gradient-to-r from-white to-white/80'
                                                }`}
                                            style={{ width: `${completion.percent}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Hover Arrow */}
                                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="p-2 bg-white/20 backdrop-blur-md rounded-full">
                                        <ArrowLeft className="w-4 h-4 text-white rotate-180" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Add Phase Card */}
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="p-6 rounded-2xl border border-dashed border-white/30 hover:border-white/50 bg-white/10 hover:bg-white/20 backdrop-blur-xl transition-all duration-300 flex flex-col items-center justify-center gap-3 min-h-[200px]"
                    >
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
                            <Plus className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-white font-semibold">Add New Phase</span>
                    </button>
                </div>
            </div>

            {/* Add Phase Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Add New Phase</h3>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleAddPhase}>
                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Phase Name
                                        </label>
                                        <input
                                            type="text"
                                            value={newPhaseName}
                                            onChange={(e) => setNewPhaseName(e.target.value)}
                                            placeholder="e.g., Research, Development, Launch"
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-gray-900 placeholder-gray-400 outline-none"
                                            autoFocus
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Deadline (Optional)
                                        </label>
                                        <input
                                            type="date"
                                            value={newPhaseDeadline}
                                            onChange={(e) => setNewPhaseDeadline(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-gray-900 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
                                    >
                                        Add Phase
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Phase Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Edit Phase</h3>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleEditPhase}>
                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Phase Name
                                        </label>
                                        <input
                                            type="text"
                                            value={newPhaseName}
                                            onChange={(e) => setNewPhaseName(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-gray-900 outline-none"
                                            autoFocus
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Deadline
                                        </label>
                                        <input
                                            type="date"
                                            value={newPhaseDeadline}
                                            onChange={(e) => setNewPhaseDeadline(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-gray-900 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhaseSelectionView;
