import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Clock, Plus, X } from 'lucide-react';
import { getColorForSubject } from '../constants/subjects';

const TaskInput = ({ onAdd, existingSubjects = [] }) => {
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [difficulty, setDifficulty] = useState('easy');
    const [deadline, setDeadline] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showSubjectSuggestions, setShowSubjectSuggestions] = useState(false);
    const datePickerRef = useRef(null);
    const subjectRef = useRef(null);

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

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!title.trim()) return;

        onAdd({
            title: title.trim(),
            difficulty,
            deadline: deadline || null,
            subject: subject.trim() || null
        });

        setTitle('');
        setSubject('');
        setDifficulty('easy');
        setDeadline('');
        setShowDatePicker(false);
        setShowSubjectSuggestions(false);
    };

    const handleDateSelect = (daysToAdd) => {
        const date = new Date();
        date.setDate(date.getDate() + daysToAdd);
        date.setHours(23, 59, 59, 999);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        setDeadline(`${year}-${month}-${day}T${hours}:${minutes}`);
        setShowDatePicker(false);
    };

    const getDeadlineLabel = () => {
        if (!deadline) return null;

        const date = new Date(deadline);
        const now = new Date();
        const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    return (
        <div className="w-full max-w-3xl mx-auto mb-6 sm:mb-8 relative z-20 px-2 sm:px-0">
            <form
                onSubmit={handleSubmit}
                className="glass-panel px-3 py-2 sm:px-4 flex flex-wrap sm:flex-nowrap items-center gap-3 relative bg-white dark:bg-void-900 shadow-lg border border-sage-100 dark:border-white/10 rounded-2xl sm:rounded-full"
            >
                <div className="relative shrink-0" ref={datePickerRef}>
                    <button
                        type="button"
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className={`p-2.5 rounded-full transition-colors ${deadline ? 'text-sage-600 bg-sage-100 dark:bg-sage-900 dark:text-sage-300' : 'text-sage-400 hover:text-sage-600 hover:bg-sage-50 dark:hover:bg-void-800 dark:hover:text-sage-300'}`}
                        title="Due date"
                    >
                        {deadline ? <Clock size={20} /> : <Calendar size={20} />}
                    </button>

                    <AnimatePresence>
                        {showDatePicker && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full left-0 mt-2 w-[calc(100vw-2rem)] sm:w-72 max-w-sm bg-white dark:bg-void-900 rounded-2xl shadow-xl border border-sage-100 dark:border-white/10 p-4 z-50"
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-sm font-bold text-sage-700 dark:text-sage-300">Due Date</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowDatePicker(false)}
                                        className="text-sage-400 hover:text-sage-600 dark:hover:text-sage-300"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <button type="button" onClick={() => handleDateSelect(0)} className="px-3 py-2 text-xs font-medium bg-sage-50 dark:bg-void-800 text-sage-700 dark:text-sage-300 rounded-lg hover:bg-sage-100 dark:hover:bg-void-700 transition-colors">Today</button>
                                    <button type="button" onClick={() => handleDateSelect(1)} className="px-3 py-2 text-xs font-medium bg-sage-50 dark:bg-void-800 text-sage-700 dark:text-sage-300 rounded-lg hover:bg-sage-100 dark:hover:bg-void-700 transition-colors">Tomorrow</button>
                                    <button type="button" onClick={() => handleDateSelect(3)} className="px-3 py-2 text-xs font-medium bg-sage-50 dark:bg-void-800 text-sage-700 dark:text-sage-300 rounded-lg hover:bg-sage-100 dark:hover:bg-void-700 transition-colors">3 Days</button>
                                    <button type="button" onClick={() => handleDateSelect(7)} className="px-3 py-2 text-xs font-medium bg-sage-50 dark:bg-void-800 text-sage-700 dark:text-sage-300 rounded-lg hover:bg-sage-100 dark:hover:bg-void-700 transition-colors">1 Week</button>
                                </div>

                                <input
                                    type="datetime-local"
                                    value={deadline}
                                    onChange={(event) => setDeadline(event.target.value)}
                                    className="w-full px-3 py-2 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-lg text-sm text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-2 focus:ring-sage-400"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Summon a new task..."
                    className="flex-[1_1_10rem] bg-transparent border-none focus:ring-0 text-ink-800 dark:text-bone-100 placeholder-sage-400 text-sm sm:text-base font-medium min-w-0"
                />

                <div className="relative shrink-0" ref={subjectRef}>
                    <input
                        type="text"
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                        onFocus={() => setShowSubjectSuggestions(true)}
                        placeholder="Subject"
                        className="w-24 sm:w-28 lg:w-36 bg-sage-50 dark:bg-void-800 text-sage-700 dark:text-sage-300 placeholder-sage-400 text-xs sm:text-sm rounded-full px-3 py-2 border-none focus:ring-2 focus:ring-sage-300 font-bold"
                    />

                    <AnimatePresence>
                        {showSubjectSuggestions && existingSubjects.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                                className="absolute top-full right-0 mt-2 w-44 max-h-52 overflow-y-auto bg-white dark:bg-void-900 rounded-xl shadow-xl border border-sage-100 dark:border-white/10 p-2 z-50"
                            >
                                {existingSubjects.map((item) => {
                                    const color = getColorForSubject(item);
                                    return (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => {
                                                setSubject(item);
                                                setShowSubjectSuggestions(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs font-bold text-sage-700 dark:text-bone-200 hover:bg-sage-50 dark:hover:bg-void-800"
                                        >
                                            <span
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{ backgroundColor: color.color }}
                                            />
                                            <span className="truncate">{item}</span>
                                        </button>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <select
                    value={difficulty}
                    onChange={(event) => setDifficulty(event.target.value)}
                    className="shrink-0 bg-sage-50 dark:bg-void-800 text-sage-700 dark:text-sage-300 text-xs sm:text-sm rounded-full px-3 py-2 border-none focus:ring-2 focus:ring-sage-300 cursor-pointer font-bold hover:bg-sage-100 dark:hover:bg-void-700 transition-colors"
                >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </select>

                <button
                    type="submit"
                    disabled={!title.trim()}
                    className="bg-sage-500 hover:bg-sage-600 text-white p-2.5 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105 shrink-0"
                    title="Add task"
                >
                    <Plus size={22} />
                </button>
            </form>

            {deadline && (
                <div className="absolute -bottom-5 sm:-bottom-6 left-4 text-xs font-medium text-sage-500 flex items-center gap-1">
                    <Clock size={10} />
                    {getDeadlineLabel()}
                </div>
            )}
        </div>
    );
};

export default TaskInput;
