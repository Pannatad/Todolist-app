import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion as Motion } from 'framer-motion';
import { Loader2, Mic, MicOff, Plus, X } from 'lucide-react';
import { parseTaskInput } from '../../services/aiClient';
import { toast } from '../../ui/Toast';

const QuickAddTaskPopup = ({ addTask, isOpen, onClose, buttonRef, popupStyle }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef(null);
  const popupRef = useRef(null);
  useEffect(() => {
    const outside = (event) => { if (popupRef.current && !popupRef.current.contains(event.target) && !buttonRef?.current?.contains(event.target)) onClose(); };
    if (isOpen) document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [buttonRef, isOpen, onClose]);
  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return undefined;
    const recognition = new Recognition(); recognition.continuous = false; recognition.interimResults = true; recognition.lang = 'en-US';
    recognition.onresult = (event) => setInput(Array.from(event.results).map((result) => result[0].transcript).join(''));
    recognition.onerror = () => setIsListening(false); recognition.onend = () => setIsListening(false); recognitionRef.current = recognition;
    return () => recognition.stop();
  }, []);
  const toggleListening = () => {
    if (!recognitionRef.current) return toast('Speech recognition is not supported in your browser.', { tone: 'error' });
    if (isListening) recognitionRef.current.stop(); else { setInput(''); recognitionRef.current.start(); setIsListening(true); }
  };
  const submit = async (event) => {
    event.preventDefault(); if (!input.trim() || isProcessing) return; setIsProcessing(true);
    try { const parsed = await parseTaskInput(input); addTask({ title: parsed.title || input, deadline: parsed.deadline, subject: parsed.subject || "Today's Plan", estimatedTime: parsed.estimatedTime }); }
    catch { addTask({ title: input, subject: "Today's Plan" }); }
    finally { setInput(''); setIsProcessing(false); onClose(); }
  };
  if (!isOpen) return null;
  return createPortal(<Motion.div ref={popupRef} initial={{ opacity: 0, scale: 0.9, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -10 }} style={popupStyle} className="w-80"><div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xl"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-gray-700">Quick Add Task</h3><button type="button" onClick={onClose}><X size={16} /></button></div><form onSubmit={submit} className="space-y-2"><div className="relative"><input value={input} onChange={(event) => setInput(event.target.value)} placeholder={isListening ? 'Listening...' : 'e.g., Math homework due tomorrow'} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 pr-10 text-sm" disabled={isListening} autoFocus /><button type="button" onClick={toggleListening} className="absolute right-2 top-1/2 -translate-y-1/2">{isListening ? <MicOff size={14} /> : <Mic size={14} />}</button></div><button type="submit" disabled={isProcessing || !input.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2 text-sm font-bold text-white">{isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Add Task</button></form></div></Motion.div>, document.body);
};

export default QuickAddTaskPopup;
