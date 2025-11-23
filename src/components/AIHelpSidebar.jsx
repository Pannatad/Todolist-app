import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Zap, ListChecks, BrainCircuit, Upload, FileText, Image as ImageIcon, Send } from 'lucide-react';

const AIHelpSidebar = ({ isOpen, onClose, task, aiTips, isLoading, onGenerateAdvice, isAnalyzing }) => {
    const [file, setFile] = React.useState(null);
    const [instructions, setInstructions] = React.useState('');

    // Reset state when task changes or sidebar opens
    React.useEffect(() => {
        if (isOpen) {
            setFile(null);
            setInstructions('');
        }
    }, [isOpen, task]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleGenerate = () => {
        if (onGenerateAdvice) {
            onGenerateAdvice(file, instructions);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white/90 dark:bg-void-900/95 backdrop-blur-md shadow-2xl z-[70] border-l border-white/20 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-sage-200 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-sage-50 to-transparent dark:from-void-800">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                    <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-sage-800 dark:text-bone-200">AI Assistant</h2>
                                    <p className="text-xs text-sage-500 dark:text-sage-400">Powered by Gemini</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-sage-100 dark:hover:bg-void-700 rounded-full transition-colors text-sage-500 dark:text-sage-400"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Task Context */}
                            <div className="bg-sage-50 dark:bg-void-800 rounded-xl p-4 border border-sage-100 dark:border-white/5">
                                <h3 className="text-sm font-bold text-sage-500 dark:text-sage-400 mb-1 uppercase tracking-wider">Current Mission</h3>
                                <p className="text-lg font-medium text-sage-800 dark:text-bone-200">{task?.title}</p>
                                {task?.subject && (
                                    <span className="inline-block mt-2 px-2 py-1 bg-white dark:bg-void-900 rounded text-xs font-bold text-sage-600 dark:text-sage-300 border border-sage-200 dark:border-white/10">
                                        {task.subject}
                                    </span>
                                )}
                            </div>

                            {/* Input Section (Always visible at top) */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-sage-500 dark:text-sage-400 flex items-center gap-2">
                                    <BrainCircuit size={16} />
                                    Summon Advice
                                </h3>

                                {/* Instructions */}
                                <textarea
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                    placeholder="What do you need help with? (e.g., 'Break this down', 'Explain this file')"
                                    className="w-full bg-white dark:bg-void-900 border border-sage-200 dark:border-white/10 rounded-xl p-3 text-sm text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none h-24"
                                />

                                {/* File Input */}
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="file-upload"
                                        />
                                        <label
                                            htmlFor="file-upload"
                                            className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-sage-300 dark:border-white/20 rounded-xl cursor-pointer hover:border-purple-500 dark:hover:border-purple-500 transition-colors text-sage-500 dark:text-sage-400 hover:text-purple-500"
                                        >
                                            {file ? (
                                                <>
                                                    {file.type.includes('pdf') ? <FileText size={20} /> : <ImageIcon size={20} />}
                                                    <span className="truncate max-w-[150px] text-sm font-medium">{file.name}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={20} />
                                                    <span className="text-sm font-medium">Add File (Optional)</span>
                                                </>
                                            )}
                                        </label>
                                    </div>

                                    <button
                                        onClick={handleGenerate}
                                        disabled={isLoading || isAnalyzing}
                                        className="p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[60px]"
                                    >
                                        {isLoading || isAnalyzing ? (
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            >
                                                <Sparkles size={20} />
                                            </motion.div>
                                        ) : (
                                            <Send size={20} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Results Section */}
                            {aiTips && (
                                <div className="space-y-6 pt-4 border-t border-sage-200 dark:border-white/10">
                                    {/* Analysis / Direct Answer */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                                            <Zap size={18} />
                                            <h3 className="font-bold">Analysis</h3>
                                        </div>
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-500/20 text-sm text-sage-700 dark:text-bone-300 whitespace-pre-wrap leading-relaxed"
                                        >
                                            {aiTips.analysis || aiTips.tips?.join('\n')}
                                        </motion.div>
                                    </div>

                                    {/* Action Steps */}
                                    {aiTips.steps && aiTips.steps.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                                <ListChecks size={18} />
                                                <h3 className="font-bold">Action Plan</h3>
                                            </div>
                                            <div className="space-y-0">
                                                {aiTips.steps.map((step, index) => (
                                                    <motion.div
                                                        key={index}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.1 + (index * 0.1) }}
                                                        className="flex gap-3 p-3 border-b border-sage-100 dark:border-white/5 last:border-0"
                                                    >
                                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">
                                                            {index + 1}
                                                        </div>
                                                        <p className="text-sm text-sage-700 dark:text-bone-300 pt-0.5">{step}</p>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AIHelpSidebar;
