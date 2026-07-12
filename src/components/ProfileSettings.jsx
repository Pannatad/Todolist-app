import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { User, Save, Clock, Target, Sparkles, X, Check, ChevronDown, FileText, Brain } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';
import { useUserIntelligence } from '../context/UserIntelligenceContext';
import TeachAgentModal from './TeachAgentModal';

const FOCUS_STYLES = [
    { value: 'deep_work', label: 'Deep Work', description: 'Long uninterrupted focus sessions' },
    { value: 'pomodoro', label: 'Pomodoro', description: '25 min work, 5 min break cycles' },
    { value: 'flexible', label: 'Flexible', description: 'Adapt as needed throughout the day' }
];

const ProfileSettings = ({ isOpen, onClose }) => {
    const { profile, updateProfile } = useUserProfile();
    const { intelligence } = useUserIntelligence();
    const [formData, setFormData] = useState({
        nickname: '',
        role: '',
        bio: '',
        workingHours: { start: '09:00', end: '17:00' },
        focusStyle: 'flexible',
        goals: []
    });
    const [newGoal, setNewGoal] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showTeachModal, setShowTeachModal] = useState(false);

    // Load profile data when modal opens
    useEffect(() => {
        if (isOpen && profile) {
            setFormData({
                nickname: profile.nickname || profile.name || '',
                role: profile.role || '',
                bio: profile.bio || '',
                workingHours: typeof profile.workingHours === 'object'
                    ? profile.workingHours
                    : { start: '09:00', end: '17:00' },
                focusStyle: profile.focusStyle || 'flexible',
                goals: Array.isArray(profile.goals) ? profile.goals : []
            });
        }
    }, [isOpen, profile]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const handleAddGoal = () => {
        if (!newGoal.trim()) return;
        setFormData(prev => ({
            ...prev,
            goals: [...prev.goals, newGoal.trim()]
        }));
        setNewGoal('');
        setSaved(false);
    };

    const handleRemoveGoal = (index) => {
        setFormData(prev => ({
            ...prev,
            goals: prev.goals.filter((_, i) => i !== index)
        }));
        setSaved(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateProfile({
                nickname: formData.nickname,
                name: formData.nickname, // Keep name in sync with nickname
                role: formData.role,
                bio: formData.bio,
                workingHours: formData.workingHours,
                focusStyle: formData.focusStyle,
                goals: formData.goals
            });
            setSaved(true);
            setTimeout(() => onClose(), 1000);
        } catch (error) {
            console.error('Error saving profile:', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <Motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <Motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
                    >
                        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                            {/* Header */}
                            <div className="p-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                                            <User size={28} className="text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">Your Profile</h2>
                                            <p className="text-white/80 text-sm mt-1">Personalize your experience</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                                    >
                                        <X size={20} className="text-white" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                                {/* Nickname */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <User size={14} className="inline mr-2" />
                                        Nickname
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.nickname}
                                        onChange={(e) => handleChange('nickname', e.target.value)}
                                        placeholder="What should I call you?"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">This will be used in greetings</p>
                                </div>

                                {/* Role */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Role / Occupation
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.role}
                                        onChange={(e) => handleChange('role', e.target.value)}
                                        placeholder="e.g., Student, Developer, Designer"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>

                                {/* About Me / Bio */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <FileText size={14} className="inline mr-2" />
                                        About Me
                                    </label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => handleChange('bio', e.target.value)}
                                        placeholder="Tell the agent about yourself... e.g., 'I'm a high school student. I have intense schedule on Monday and Tuesday, then more free time Wednesday to Friday. I usually wake up at 7am and sleep around 11pm.'"
                                        rows={4}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">This helps the agent personalize recommendations based on your schedule and lifestyle</p>
                                </div>

                                {/* Working Hours */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <Clock size={14} className="inline mr-2" />
                                        Working Hours
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="time"
                                            value={formData.workingHours.start}
                                            onChange={(e) => handleChange('workingHours', { ...formData.workingHours, start: e.target.value })}
                                            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        />
                                        <span className="text-gray-500">to</span>
                                        <input
                                            type="time"
                                            value={formData.workingHours.end}
                                            onChange={(e) => handleChange('workingHours', { ...formData.workingHours, end: e.target.value })}
                                            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                {/* Focus Style */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <Sparkles size={14} className="inline mr-2" />
                                        Focus Style
                                    </label>
                                    <div className="space-y-2">
                                        {FOCUS_STYLES.map(style => (
                                            <button
                                                key={style.value}
                                                onClick={() => handleChange('focusStyle', style.value)}
                                                className={`w-full p-3 rounded-xl border-2 text-left transition-all ${formData.focusStyle === style.value
                                                    ? 'border-indigo-500 bg-indigo-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <p className="font-medium text-gray-900">{style.label}</p>
                                                <p className="text-xs text-gray-500">{style.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Goals */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <Target size={14} className="inline mr-2" />
                                        Personal Goals
                                    </label>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={newGoal}
                                            onChange={(e) => setNewGoal(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                                            placeholder="Add a goal..."
                                            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        />
                                        <button
                                            onClick={handleAddGoal}
                                            disabled={!newGoal.trim()}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl font-medium transition-colors"
                                        >
                                            Add
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.goals.map((goal, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                                            >
                                                {goal}
                                                <button
                                                    onClick={() => handleRemoveGoal(index)}
                                                    className="p-0.5 hover:bg-indigo-200 rounded-full transition-colors"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                        {formData.goals.length === 0 && (
                                            <p className="text-gray-400 text-sm">No goals added yet</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                <button
                                    onClick={() => setShowTeachModal(true)}
                                    className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                                >
                                    <Brain size={16} />
                                    Teach Agent
                                    {intelligence.length > 0 && (
                                        <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                                            {intelligence.length}
                                        </span>
                                    )}
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        onClick={onClose}
                                        className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 shadow-md hover:shadow-lg flex items-center gap-2"
                                    >
                                        {saved ? (
                                            <>
                                                <Check size={16} /> Saved!
                                            </>
                                        ) : isSaving ? (
                                            'Saving...'
                                        ) : (
                                            <>
                                                <Save size={16} /> Save Profile
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Motion.div>

                    {/* Teach Agent Modal */}
                    <TeachAgentModal
                        isOpen={showTeachModal}
                        onClose={() => setShowTeachModal(false)}
                    />
                </>
            )}
        </AnimatePresence>
    );
};

export default ProfileSettings;
