import React from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { CalendarDays, Check, FileText, X } from 'lucide-react';

const HabitNotesModal = ({ isOpen, onClose, habit, entries = [] }) => {
    if (!isOpen || !habit) return null;

    return (
        <AnimatePresence>
            <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="habit-notes-modal fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <Motion.div
                    initial={{ scale: 0.96, opacity: 0, y: 12 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.96, opacity: 0, y: 12 }}
                    className="habit-notes-modal__surface flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="habit-notes-modal__header flex items-start justify-between border-b border-slate-200 px-5 py-4">
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Habit notes</div>
                            <h2 className="mt-1 text-xl font-semibold text-slate-900">{habit.icon} {habit.name}</h2>
                            <p className="mt-1 text-sm text-slate-500">Past daily notes for this habit.</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="habit-notes-modal__body flex-1 space-y-3 overflow-y-auto px-5 py-5">
                        {entries.length === 0 ? (
                            <div className="habit-notes-modal__empty rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                                    <FileText size={18} />
                                </div>
                                <div className="mt-3 text-sm font-medium text-slate-800">No saved notes yet</div>
                                <div className="mt-1 text-sm text-slate-500">Add notes from a daily habit card and they will appear here.</div>
                            </div>
                        ) : (
                            entries.map((entry) => (
                                <div key={`${entry.habit_id}-${entry.date}`} className="habit-notes-modal__entry rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-medium text-slate-700">
                                            <CalendarDays size={12} />
                                            {new Date(`${entry.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </span>
                                        {entry.completed && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-700">
                                                <Check size={12} />
                                                Done
                                            </span>
                                        )}
                                        {entry.value > 0 && (
                                            <span className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-700">
                                                Value {entry.value}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                        {entry.notes}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Motion.div>
            </Motion.div>
        </AnimatePresence>
    );
};

export default HabitNotesModal;
