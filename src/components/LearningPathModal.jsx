import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Calendar as CalendarIcon } from 'lucide-react';

const EMOJI_OPTIONS = ['📚', '🧠', '💻', '🎨', '🎵', '🌍', '🔬', '📐', '✍️', '🏋️', '🗣️', '📊', '🎯', '🚀', '⚡', '💡', '🔮', '🌟'];

const COLOR_OPTIONS = [
    { name: 'purple', gradient: 'from-violet-500 to-indigo-500', bg: 'bg-violet-500', soft: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    { name: 'blue', gradient: 'from-sky-500 to-blue-500', bg: 'bg-sky-500', soft: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    { name: 'teal', gradient: 'from-teal-500 to-cyan-500', bg: 'bg-teal-500', soft: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    { name: 'emerald', gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500', soft: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    { name: 'amber', gradient: 'from-amber-400 to-orange-500', bg: 'bg-amber-500', soft: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    { name: 'pink', gradient: 'from-pink-500 to-rose-500', bg: 'bg-pink-500', soft: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
    { name: 'red', gradient: 'from-rose-500 to-red-500', bg: 'bg-rose-500', soft: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    { name: 'indigo', gradient: 'from-indigo-500 to-slate-600', bg: 'bg-indigo-500', soft: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
];

const LearningPathModal = ({ isOpen, onClose, onSave, path = null, existingCategories = [] }) => {
    const [name, setName] = useState(path?.name || '');
    const [description, setDescription] = useState(path?.description || '');
    const [icon, setIcon] = useState(path?.icon || '📚');
    const [color, setColor] = useState(path?.color || 'purple');
    const [category, setCategory] = useState(path?.category || '');
    const [targetDate, setTargetDate] = useState(path?.target_completion_date || '');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

    // Reset form when path prop changes
    React.useEffect(() => {
        if (isOpen) {
            setName(path?.name || '');
            setDescription(path?.description || '');
            setIcon(path?.icon || '📚');
            setColor(path?.color || 'purple');
            setCategory(path?.category || '');
            setTargetDate(path?.target_completion_date || '');
            setShowEmojiPicker(false);
            setShowCategorySuggestions(false);
        }
    }, [path, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        onSave({
            id: path?.id,
            name: name.trim(),
            description: description.trim(),
            icon,
            color,
            category: category.trim(),
            target_completion_date: targetDate || null,
        });

        onClose();
    };

    if (!isOpen) return null;

    const selectedGradient = COLOR_OPTIONS.find(c => c.name === color)?.gradient || COLOR_OPTIONS[0].gradient;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 w-full max-w-md max-h-[90vh] rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={`bg-gradient-to-r ${selectedGradient} p-6 relative overflow-hidden flex-shrink-0`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <Sparkles className="text-white/80" size={24} />
                                <h2 className="text-xl font-bold text-white">
                                    {path ? 'Edit Learning Path' : 'New Learning Path'}
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                        {/* Name & Icon */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Path Name</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="w-12 h-12 flex items-center justify-center text-2xl bg-white/10 rounded-xl hover:bg-white/20 transition-colors border border-white/10"
                                >
                                    {icon}
                                </button>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Learning AI, Spanish Language"
                                    className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    autoFocus
                                />
                            </div>
                            {/* Emoji Picker */}
                            <AnimatePresence>
                                {showEmojiPicker && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex flex-wrap gap-2 p-3 bg-white/5 rounded-xl border border-white/10"
                                    >
                                        {EMOJI_OPTIONS.map((emoji) => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => {
                                                    setIcon(emoji);
                                                    setShowEmojiPicker(false);
                                                }}
                                                className={`w-10 h-10 flex items-center justify-center text-xl rounded-lg hover:bg-white/20 transition-colors ${icon === emoji ? 'bg-white/30 ring-2 ring-purple-400' : 'bg-white/10'}`}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What will you learn in this path?"
                                rows={3}
                                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                            />
                        </div>

                        {/* Category */}
                        <div className="space-y-2 relative">
                            <label className="text-sm font-medium text-white/70">Category</label>
                            <input
                                type="text"
                                value={category}
                                onChange={(e) => { setCategory(e.target.value); setShowCategorySuggestions(true); }}
                                onFocus={() => setShowCategorySuggestions(true)}
                                onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                                placeholder="e.g., Programming, Languages, Music"
                                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                            {showCategorySuggestions && existingCategories.length > 0 && (
                                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-slate-800 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                                    {existingCategories
                                        .filter(c => c.toLowerCase().includes(category.toLowerCase()))
                                        .map((cat) => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onMouseDown={(e) => { e.preventDefault(); setCategory(cat); setShowCategorySuggestions(false); }}
                                                className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 transition-colors"
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                </div>
                            )}
                        </div>

                        {/* Target Date */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                                <CalendarIcon size={14} />
                                Target Completion Date (Optional)
                            </label>
                            <input
                                type="date"
                                value={targetDate}
                                onChange={(e) => setTargetDate(e.target.value)}
                                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 [color-scheme:dark]"
                            />
                        </div>

                        {/* Color Theme */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Color Theme</label>
                            <div className="flex gap-3 flex-wrap">
                                {COLOR_OPTIONS.map((colorOption) => (
                                    <button
                                        key={colorOption.name}
                                        type="button"
                                        onClick={() => setColor(colorOption.name)}
                                        className={`w-10 h-10 rounded-full bg-gradient-to-r ${colorOption.gradient} transition-all ${color === colorOption.name
                                            ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                                            : 'opacity-60 hover:opacity-100'
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl font-bold text-white/60 bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r ${selectedGradient} hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2`}
                            >
                                <Sparkles size={18} />
                                {path ? 'Update Path' : 'Create Path'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default LearningPathModal;
export { COLOR_OPTIONS };
