import React, { useState, useRef, useEffect } from 'react';
import { Plus, Calendar, X, Clock, Sparkles, Loader2, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { suggestDifficulty, breakDownTask } from '../services/gemini';
import { getColorForSubject } from '../constants/subjects';

const TaskInput = ({ onAdd, existingSubjects = [] }) => {
    const [title, setTitle] = useState('');
    const [difficulty, setDifficulty] = useState('easy');
    const [subject, setSubject] = useState('');
    const [deadline, setDeadline] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showSubjectSuggestions, setShowSubjectSuggestions] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const datePickerRef = useRef(null);
    const subjectRef = useRef(null);

    // Close date picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
                setShowDatePicker(false);
            }
            if (subjectRef.current && !subjectRef.current.contains(event.target)) {
                setShowSubjectSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter suggestions based on input
    const subjectSuggestions = existingSubjects
        .filter(s => s.toLowerCase().includes(subject.toLowerCase()))
        .slice(0, 5);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        onAdd({ title, difficulty, deadline: deadline || null, subject: subject.trim() || null });
        setTitle('');
        setDifficulty('easy');
        setSubject('');
        setDeadline('');
        setShowDatePicker(false);
    };

    const handleAiMagic = async () => {
        if (!title.trim()) return;

        setIsAiLoading(true);
        try {
            const [suggestedDiff, subtasks] = await Promise.all([
                suggestDifficulty(title),
                breakDownTask(title)
            ]);

            setDifficulty(suggestedDiff);
            console.log("AI Suggestions:", { suggestedDiff, subtasks });

        } catch (error) {
            console.error("AI Error:", error);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleDateSelect = (daysToAdd) => {
        const date = new Date();
        date.setDate(date.getDate() + daysToAdd);
        date.setHours(23, 59, 0, 0);
        const formatted = date.toISOString().slice(0, 16);
        setDeadline(formatted);
        setShowDatePicker(false);
    };

    const getDeadlineLabel = () => {
        if (!deadline) return 'No Deadline';
        const date = new Date(deadline);
        const now = new Date();
        const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const subjectColor = getColorForSubject(subject);

    return (
        <div className="w-full max-w-md mx-auto mb-8 relative z-20">
            <form onSubmit={handleSubmit} className="glass-panel p-2 flex items-center gap-2 relative bg-white shadow-lg border border-sage-100 rounded-full pl-4">

                {/* Date Picker Trigger */}
                <div className="relative" ref={datePickerRef}>
                    <button
                        type="button"
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className={`p-2 rounded-full transition-colors ${deadline ? 'text-sage-600 bg-sage-100' : 'text-sage-400 hover:text-sage-600 hover:bg-sage-50'
                            }`}
                    >
                        {deadline ? <Clock size={20} /> : <Calendar size={20} />}
                    </button>

                    {/* Date Picker Popover */}
                    <AnimatePresence>
                        {showDatePicker && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-sage-100 p-4 z-50"
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-sm font-bold text-sage-700">Summon By...</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowDatePicker(false)}
                                        className="text-sage-400 hover:text-sage-600"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <button type="button" onClick={() => handleDateSelect(0)} className="px-3 py-2 text-xs font-medium bg-sage-50 text-sage-700 rounded-lg hover:bg-sage-100 transition-colors">Today</button>
                                    <button type="button" onClick={() => handleDateSelect(1)} className="px-3 py-2 text-xs font-medium bg-sage-50 text-sage-700 rounded-lg hover:bg-sage-100 transition-colors">Tomorrow</button>
                                    <button type="button" onClick={() => handleDateSelect(3)} className="px-3 py-2 text-xs font-medium bg-sage-50 text-sage-700 rounded-lg hover:bg-sage-100 transition-colors">3 Days</button>
                                    <button type="button" onClick={() => handleDateSelect(7)} className="px-3 py-2 text-xs font-medium bg-sage-50 text-sage-700 rounded-lg hover:bg-sage-100 transition-colors">1 Week</button>
                                </div>

                                <div className="relative">
                                    <input
                                        type="datetime-local"
                                        value={deadline}
                                        onChange={(e) => setDeadline(e.target.value)}
                                        className="w-full px-3 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Summon a new task..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-ink-800 placeholder-sage-400 text-base font-medium"
                />

                {/* AI Magic Button */}
                <button
                    type="button"
                    onClick={handleAiMagic}
                    disabled={!title.trim() || isAiLoading}
                    className={`p-2 rounded-full transition-all ${isAiLoading ? 'text-sage-400 bg-sage-50' : 'text-purple-400 hover:text-purple-600 hover:bg-purple-50'
                        }`}
                    title="Auto-detect Difficulty"
                >
                    {isAiLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                </button>

                {/* Subject Input */}
                <div className="relative" ref={subjectRef}>
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => {
                            setSubject(e.target.value);
                            setShowSubjectSuggestions(true);
                        }}
                        onFocus={() => setShowSubjectSuggestions(true)}
                        placeholder="Subject"
                        className="text-sm rounded-full px-3 py-1 border-none focus:ring-2 focus:ring-sage-300 cursor-text font-medium w-24 transition-all"
                        style={{
                            backgroundColor: subject ? subjectColor.bgColor : '#F9FAFB',
                            color: subject ? subjectColor.color : '#6B7280'
                        }}
                    />

                    {/* Subject Suggestions */}
                    <AnimatePresence>
                        {showSubjectSuggestions && subjectSuggestions.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-sage-100 overflow-hidden z-50"
                            >
                                {subjectSuggestions.map((s, i) => {
                                    const color = getColorForSubject(s);
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => {
                                                setSubject(s);
                                                setShowSubjectSuggestions(false);
                                            }}
                                            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-sage-50 transition-colors"
                                            style={{ color: color.color }}
                                        >
                                            {s}
                                        </button>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="bg-sage-50 text-sage-700 text-sm rounded-full px-3 py-1 border-none focus:ring-0 cursor-pointer font-medium hover:bg-sage-100 transition-colors ml-2"
                >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </select>

                <button
                    type="submit"
                    disabled={!title.trim()}
                    className="bg-sage-500 hover:bg-sage-600 text-white p-2 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105"
                >
                    <Plus size={24} />
                </button>
            </form>

            {/* Deadline Label */}
            {deadline && (
                <div className="absolute -bottom-6 left-4 text-xs font-medium text-sage-500 flex items-center gap-1">
                    <Clock size={10} />
                    {getDeadlineLabel(deadline)}
                </div>
            )}
        </div>
    );
};

export default TaskInput;
