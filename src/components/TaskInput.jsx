import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { Calendar, Clock, Plus, Tag, X } from 'lucide-react';
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
        <div className="relative z-20 mx-auto mb-5 w-full max-w-5xl px-2 sm:px-0">
            <Motion.form
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                onSubmit={handleSubmit}
                className="relative flex flex-wrap items-center gap-3 overflow-visible rounded-3xl border border-sage-100 bg-white/90 px-3 py-3 shadow-lg shadow-sage-900/5 backdrop-blur sm:flex-nowrap sm:px-4 dark:border-white/10 dark:bg-void-900/90"
            >
                <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-sage-300 to-transparent" />

                <div className="relative shrink-0" ref={datePickerRef}>
                    <Motion.button
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${deadline ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-900/30' : 'text-sage-400 hover:bg-sage-50 hover:text-sage-700 dark:hover:bg-void-800 dark:hover:text-sage-300'}`}
                        title="Due date"
                    >
                        {deadline ? <Clock size={20} /> : <Calendar size={20} />}
                    </Motion.button>

                    <AnimatePresence>
                        {showDatePicker && (
                            <Motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full left-0 mt-2 w-[calc(100vw-2rem)] sm:w-72 max-w-sm bg-white dark:bg-void-900 rounded-2xl shadow-2xl border border-sage-100 dark:border-white/10 p-4 z-50"
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
                            </Motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Add a task..."
                    className="min-w-0 flex-[1_1_14rem] rounded-2xl border border-transparent bg-sage-50/70 px-4 py-3 text-base font-bold text-ink-800 outline-none transition placeholder:text-sage-400 focus:border-sage-200 focus:bg-white focus:ring-2 focus:ring-sage-100 dark:bg-void-800 dark:text-bone-100 dark:focus:border-white/10 dark:focus:bg-void-800"
                />

                <div className="relative shrink-0" ref={subjectRef}>
                    <Tag className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sage-400" />
                    <input
                        type="text"
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                        onFocus={() => setShowSubjectSuggestions(true)}
                        placeholder="Tag"
                        className="w-28 rounded-2xl border border-transparent bg-sage-50 py-3 pl-8 pr-3 text-xs font-black text-sage-700 outline-none transition placeholder:text-sage-400 focus:border-sage-200 focus:bg-white focus:ring-2 focus:ring-sage-100 dark:bg-void-800 dark:text-sage-300 sm:w-32 lg:w-40"
                    />

                    <AnimatePresence>
                        {showSubjectSuggestions && existingSubjects.length > 0 && (
                            <Motion.div
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
                            </Motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <select
                    value={difficulty}
                    onChange={(event) => setDifficulty(event.target.value)}
                    className="shrink-0 cursor-pointer rounded-2xl border border-transparent bg-sage-50 px-3 py-3 text-xs font-black text-sage-700 outline-none transition hover:bg-sage-100 focus:border-sage-200 focus:ring-2 focus:ring-sage-100 dark:bg-void-800 dark:text-sage-300 dark:hover:bg-void-700 sm:text-sm"
                >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </select>

                <Motion.button
                    type="submit"
                    disabled={!title.trim()}
                    whileTap={{ scale: 0.92 }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sage-600 text-white shadow-lg shadow-sage-600/20 transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:bg-sage-200 disabled:text-sage-400"
                    title="Add task"
                >
                    <Plus size={22} />
                </Motion.button>
            </Motion.form>

            {deadline && (
                <Motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-5 left-5 flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-100 sm:-bottom-6"
                >
                    <Clock size={11} />
                    {getDeadlineLabel()}
                </Motion.div>
            )}
        </div>
    );
};

export default TaskInput;
