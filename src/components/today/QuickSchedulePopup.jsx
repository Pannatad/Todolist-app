import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion as Motion } from 'framer-motion';
import { Calendar, Plus, X } from 'lucide-react';

const categories = ['Work', 'Study', 'Personal', 'Health', 'Errands', 'Social', 'Other'];

const QuickSchedulePopup = ({ addScheduleItem, isOpen, onClose, buttonRef, popupStyle }) => {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [category, setCategory] = useState('Other');
  const popupRef = useRef(null);

  useEffect(() => {
    const closeWhenOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target) && !buttonRef?.current?.contains(event.target)) onClose();
    };
    if (isOpen) document.addEventListener('mousedown', closeWhenOutside);
    return () => document.removeEventListener('mousedown', closeWhenOutside);
  }, [buttonRef, isOpen, onClose]);

  const submit = (event) => {
    event.preventDefault();
    if (!title.trim() || !time) return;
    const [hours, minutes] = time.split(':');
    const now = new Date();
    now.setHours(Number(hours), Number(minutes), 0, 0);
    addScheduleItem({ title: title.trim(), startTime: now.toISOString(), duration: Number(duration), category });
    setTitle(''); setTime(''); setDuration('60'); setCategory('Other'); onClose();
  };

  if (!isOpen) return null;
  return createPortal(
    <Motion.div ref={popupRef} initial={{ opacity: 0, scale: 0.9, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -10 }} style={popupStyle} className="w-72">
      <div className="relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
        <div className="relative z-10 mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-bold text-gray-700"><Calendar size={14} />Quick Schedule</h3><button type="button" onClick={onClose}><X size={16} /></button></div>
        <form onSubmit={submit} className="relative z-10 space-y-2">
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Event name..." className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm" autoFocus />
          <div className="flex gap-2"><input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm" /><select value={duration} onChange={(event) => setDuration(event.target.value)} className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-2 text-sm"><option value="30">30m</option><option value="60">1h</option><option value="90">1.5h</option><option value="120">2h</option></select></div>
          <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Event category" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm">{categories.map((item) => <option key={item}>{item}</option>)}</select>
          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2 text-sm font-bold text-white"><Plus size={14} />Add to Schedule</button>
        </form>
      </div>
    </Motion.div>, document.body
  );
};

export default QuickSchedulePopup;
