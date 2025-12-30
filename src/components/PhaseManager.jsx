import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Plus, X, GripVertical, Edit2, Check, Trash2, Settings } from 'lucide-react';

const PHASE_COLORS = [
    { name: 'purple', bg: 'bg-purple-500', text: 'text-purple-500', light: 'bg-purple-100' },
    { name: 'blue', bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-100' },
    { name: 'teal', bg: 'bg-teal-500', text: 'text-teal-500', light: 'bg-teal-100' },
    { name: 'amber', bg: 'bg-amber-500', text: 'text-amber-500', light: 'bg-amber-100' },
    { name: 'pink', bg: 'bg-pink-500', text: 'text-pink-500', light: 'bg-pink-100' },
    { name: 'emerald', bg: 'bg-emerald-500', text: 'text-emerald-500', light: 'bg-emerald-100' },
    { name: 'red', bg: 'bg-red-500', text: 'text-red-500', light: 'bg-red-100' },
    { name: 'indigo', bg: 'bg-indigo-500', text: 'text-indigo-500', light: 'bg-indigo-100' },
];

const getPhaseColor = (colorName) => {
    return PHASE_COLORS.find(c => c.name === colorName) || PHASE_COLORS[0];
};

const PhaseTab = ({ phase, isActive, onClick, onEdit, onDelete, tasksCount, isEditing, onSave, canDelete }) => {
    const [editName, setEditName] = useState(phase.name);
    const inputRef = useRef(null);
    const color = getPhaseColor(phase.color);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (editName.trim()) {
            onSave(editName.trim());
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setEditName(phase.name);
            onSave(null); // Cancel
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-1 px-3 py-2 bg-white/20 rounded-xl border border-white/30">
                <input
                    ref={inputRef}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSave}
                    className="bg-transparent text-white text-sm font-medium w-24 outline-none"
                    maxLength={20}
                />
                <button
                    onClick={handleSave}
                    className="p-1 hover:bg-white/20 rounded-lg text-green-400"
                >
                    <Check size={14} />
                </button>
            </div>
        );
    }

    return (
        <motion.button
            onClick={onClick}
            className={`group relative flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${isActive
                    ? `${color.bg} text-white shadow-lg`
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <span>{phase.name}</span>
            {tasksCount > 0 && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${isActive ? 'bg-white/20' : 'bg-white/10'
                    }`}>
                    {tasksCount}
                </span>
            )}

            {/* Edit/Delete buttons on hover */}
            <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    className="p-1 bg-white/90 rounded-full text-gray-600 hover:text-blue-500 shadow-sm"
                >
                    <Edit2 size={10} />
                </button>
                {canDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="p-1 bg-white/90 rounded-full text-gray-600 hover:text-red-500 shadow-sm"
                    >
                        <Trash2 size={10} />
                    </button>
                )}
            </div>
        </motion.button>
    );
};

const PhaseManager = ({
    phases,
    activePhaseId,
    onSelectPhase,
    onAddPhase,
    onUpdatePhase,
    onDeletePhase,
    onReorderPhases,
    getTasksCountForPhase
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newPhaseName, setNewPhaseName] = useState('');
    const [editingPhaseId, setEditingPhaseId] = useState(null);
    const [showManager, setShowManager] = useState(false);
    const addInputRef = useRef(null);

    useEffect(() => {
        if (isAdding && addInputRef.current) {
            addInputRef.current.focus();
        }
    }, [isAdding]);

    const handleAddPhase = () => {
        if (newPhaseName.trim()) {
            onAddPhase(newPhaseName.trim());
            setNewPhaseName('');
            setIsAdding(false);
        }
    };

    const handleEditSave = (phaseId, newName) => {
        if (newName) {
            onUpdatePhase(phaseId, { name: newName });
        }
        setEditingPhaseId(null);
    };

    const sortedPhases = [...phases].sort((a, b) => a.order - b.order);

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Phase Tabs */}
            <AnimatePresence>
                {sortedPhases.map((phase) => (
                    <PhaseTab
                        key={phase.id}
                        phase={phase}
                        isActive={phase.id === activePhaseId}
                        onClick={() => onSelectPhase(phase.id)}
                        onEdit={() => setEditingPhaseId(phase.id)}
                        onDelete={() => onDeletePhase(phase.id)}
                        tasksCount={getTasksCountForPhase(phase.id)}
                        isEditing={editingPhaseId === phase.id}
                        onSave={(name) => handleEditSave(phase.id, name)}
                        canDelete={phases.length > 1}
                    />
                ))}
            </AnimatePresence>

            {/* Add Phase Button/Input */}
            {isAdding ? (
                <div className="flex items-center gap-1 px-3 py-2 bg-white/20 rounded-xl border border-white/30">
                    <input
                        ref={addInputRef}
                        type="text"
                        value={newPhaseName}
                        onChange={(e) => setNewPhaseName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddPhase();
                            if (e.key === 'Escape') {
                                setIsAdding(false);
                                setNewPhaseName('');
                            }
                        }}
                        placeholder="Phase name..."
                        className="bg-transparent text-white text-sm w-24 outline-none placeholder-white/50"
                        maxLength={20}
                    />
                    <button
                        onClick={handleAddPhase}
                        className="p-1 hover:bg-white/20 rounded-lg text-green-400"
                    >
                        <Check size={14} />
                    </button>
                    <button
                        onClick={() => {
                            setIsAdding(false);
                            setNewPhaseName('');
                        }}
                        className="p-1 hover:bg-white/20 rounded-lg text-red-400"
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <motion.button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Plus size={16} />
                    <span>Add Phase</span>
                </motion.button>
            )}
        </div>
    );
};

export default PhaseManager;
