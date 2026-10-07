import React, { useState, useEffect } from 'react';
import { Check, ChevronRight, X } from 'lucide-react';
import { Sheet } from '../ui';
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

    return (
        <>
            <Sheet open={isOpen} onClose={onClose} title="Profile" className="form-sheet">
                <div className="form-stack">
                    <div className="form-group">
                        <label className="form-field form-field--value">
                            <span className="form-field__label">Name</span>
                            <input
                                type="text"
                                value={formData.nickname}
                                onChange={(e) => handleChange('nickname', e.target.value)}
                                placeholder="Your name"
                                autoComplete="nickname"
                            />
                        </label>
                        <label className="form-field form-field--value">
                            <span className="form-field__label">Role</span>
                            <input
                                type="text"
                                value={formData.role}
                                onChange={(e) => handleChange('role', e.target.value)}
                                placeholder="Student"
                            />
                        </label>
                    </div>

                    <p className="form-section-label">About you</p>
                    <div className="form-group">
                        <label className="form-field form-field--stacked">
                            <span className="sr-only">About you</span>
                            <textarea
                                value={formData.bio}
                                onChange={(e) => handleChange('bio', e.target.value)}
                                placeholder="Your routine and preferences"
                                rows={4}
                            />
                        </label>
                    </div>

                    <p className="form-section-label">Working hours</p>
                    <div className="form-group">
                        <label className="form-field form-field--value">
                            <span className="form-field__label">Start</span>
                            <input
                                type="time"
                                value={formData.workingHours.start}
                                onChange={(e) => handleChange('workingHours', { ...formData.workingHours, start: e.target.value })}
                            />
                        </label>
                        <label className="form-field form-field--value">
                            <span className="form-field__label">End</span>
                            <input
                                type="time"
                                value={formData.workingHours.end}
                                onChange={(e) => handleChange('workingHours', { ...formData.workingHours, end: e.target.value })}
                            />
                        </label>
                    </div>

                    <p className="form-section-label">Focus style</p>
                    <div className="form-group" role="radiogroup" aria-label="Focus style">
                        {FOCUS_STYLES.map((style) => (
                            <button
                                key={style.value}
                                type="button"
                                role="radio"
                                aria-checked={formData.focusStyle === style.value}
                                onClick={() => handleChange('focusStyle', style.value)}
                                className="form-field form-option"
                            >
                                <span className="form-field__label">{style.label}</span>
                                {formData.focusStyle === style.value && <Check size={18} strokeWidth={2.6} className="form-option__check" aria-hidden="true" />}
                            </button>
                        ))}
                    </div>

                    <p className="form-section-label">Goals</p>
                    <div className="form-group">
                        {formData.goals.map((goal, index) => (
                            <div key={`${goal}-${index}`} className="form-field">
                                <span className="form-field__label form-goal">{goal}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveGoal(index)}
                                    className="form-remove"
                                    aria-label={`Remove goal ${goal}`}
                                >
                                    <X size={14} strokeWidth={2.6} />
                                </button>
                            </div>
                        ))}
                        <div className="form-field">
                            <input
                                type="text"
                                value={newGoal}
                                onChange={(e) => setNewGoal(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddGoal();
                                    }
                                }}
                                placeholder="Add a goal"
                                aria-label="New goal"
                            />
                            {newGoal.trim() && (
                                <button type="button" onClick={handleAddGoal} className="ui-text-button">Add</button>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <button type="button" className="form-field form-option" onClick={() => setShowTeachModal(true)}>
                            <span className="form-field__label">Teach the Agent</span>
                            <span className="form-option__detail">{intelligence.length || ''}</span>
                            <ChevronRight size={18} className="shell-chevron" aria-hidden="true" />
                        </button>
                    </div>

                    <button type="button" onClick={handleSave} disabled={isSaving} className="ui-button ui-button--accent form-submit">
                        {saved ? <><Check size={18} strokeWidth={2.6} /> Saved</> : isSaving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </Sheet>

            <TeachAgentModal
                isOpen={showTeachModal}
                onClose={() => setShowTeachModal(false)}
            />
        </>
    );
};

export default ProfileSettings;
