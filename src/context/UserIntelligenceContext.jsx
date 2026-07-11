/* eslint-disable react-refresh/only-export-components, react-hooks/exhaustive-deps */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { log } from '../utils/log.js';

const UserIntelligenceContext = createContext();

export const useUserIntelligence = () => {
    const context = useContext(UserIntelligenceContext);
    if (!context) {
        throw new Error('useUserIntelligence must be used within a UserIntelligenceProvider');
    }
    return context;
};

// Categories for learned information
export const INTELLIGENCE_CATEGORIES = {
    FACT: 'fact',           // Personal facts (name, occupation, location, etc.)
    PREFERENCE: 'preference', // User preferences (likes mornings, prefers short tasks, etc.)
    PATTERN: 'pattern',      // Behavioral patterns (usually busy on Mondays, etc.)
    REMINDER: 'reminder'     // Things user explicitly asked agent to remember
};

export const UserIntelligenceProvider = ({ children }) => {
    const { user } = useAuth();
    const [intelligence, setIntelligence] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load intelligence on mount or user change
    useEffect(() => {
        if (user) {
            loadFromSupabase();
        } else {
            loadFromLocalStorage();
        }
    }, [user]);

    const loadFromSupabase = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_intelligence')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading intelligence:', error);
            }
            setIntelligence(data || []);
        } catch (error) {
            console.error('Error loading intelligence:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadFromLocalStorage = () => {
        setIsLoading(true);
        try {
            const stored = localStorage.getItem('user_intelligence');
            if (stored) {
                setIntelligence(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Error loading intelligence from localStorage:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Learn a new fact/preference/pattern
    const learnFact = useCallback(async (content, category = 'fact', source = 'explicit', confidence = 1.0, metadata = {}) => {
        // Check if we already know this (avoid duplicates)
        const existing = intelligence.find(i =>
            i.content.toLowerCase().trim() === content.toLowerCase().trim()
        );
        if (existing) {
            log('Already know this:', content);
            return existing;
        }

        const newItem = {
            id: crypto.randomUUID(),
            content: content.trim(),
            category,
            source,
            confidence,
            metadata,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (user) {
            try {
                const { data, error } = await supabase
                    .from('user_intelligence')
                    .insert({
                        user_id: user.id,
                        ...newItem
                    })
                    .select()
                    .single();

                if (error) {
                    console.error('Error saving intelligence:', error);
                    return null;
                }

                setIntelligence(prev => [data, ...prev]);
                return data;
            } catch (error) {
                console.error('Error saving intelligence:', error);
                return null;
            }
        } else {
            // Guest mode - save to localStorage
            setIntelligence(prev => {
                const updated = [newItem, ...prev];
                localStorage.setItem('user_intelligence', JSON.stringify(updated));
                return updated;
            });
            return newItem;
        }
    }, [user, intelligence]);

    // Learn multiple facts at once (for batch processing)
    const learnMultipleFacts = useCallback(async (items) => {
        const results = [];
        for (const item of items) {
            const result = await learnFact(
                item.content,
                item.category || 'fact',
                item.source || 'inferred',
                item.confidence || 0.8,
                item.metadata || {}
            );
            if (result) results.push(result);
        }
        return results;
    }, [learnFact]);

    // Update existing intelligence
    const updateIntelligence = useCallback(async (id, updates) => {
        if (user) {
            try {
                const { error } = await supabase
                    .from('user_intelligence')
                    .update({ ...updates, updated_at: new Date().toISOString() })
                    .eq('id', id)
                    .eq('user_id', user.id);

                if (error) {
                    console.error('Error updating intelligence:', error);
                    return false;
                }
            } catch (error) {
                console.error('Error updating intelligence:', error);
                return false;
            }
        }

        setIntelligence(prev => {
            const updated = prev.map(item =>
                item.id === id ? { ...item, ...updates, updated_at: new Date().toISOString() } : item
            );
            if (!user) {
                localStorage.setItem('user_intelligence', JSON.stringify(updated));
            }
            return updated;
        });
        return true;
    }, [user]);

    // Delete intelligence
    const deleteIntelligence = useCallback(async (id) => {
        if (user) {
            try {
                const { error } = await supabase
                    .from('user_intelligence')
                    .delete()
                    .eq('id', id)
                    .eq('user_id', user.id);

                if (error) {
                    console.error('Error deleting intelligence:', error);
                    return false;
                }
            } catch (error) {
                console.error('Error deleting intelligence:', error);
                return false;
            }
        }

        setIntelligence(prev => {
            const updated = prev.filter(item => item.id !== id);
            if (!user) {
                localStorage.setItem('user_intelligence', JSON.stringify(updated));
            }
            return updated;
        });
        return true;
    }, [user]);

    // Get all intelligence
    const getIntelligence = useCallback(() => {
        return intelligence;
    }, [intelligence]);

    // Get intelligence by category
    const getIntelligenceByCategory = useCallback((category) => {
        return intelligence.filter(item => item.category === category);
    }, [intelligence]);

    // Get intelligence by source
    const getIntelligenceBySource = useCallback((source) => {
        return intelligence.filter(item => item.source === source);
    }, [intelligence]);

    // Generate a summary for agent prompts
    const getIntelligenceSummary = useCallback(() => {
        if (intelligence.length === 0) {
            return 'No learned information yet. The agent is still learning about this user.';
        }

        const facts = intelligence.filter(i => i.category === 'fact');
        const preferences = intelligence.filter(i => i.category === 'preference');
        const patterns = intelligence.filter(i => i.category === 'pattern');
        const reminders = intelligence.filter(i => i.category === 'reminder');

        let summary = '';

        if (facts.length > 0) {
            summary += `KNOWN FACTS ABOUT USER:\n`;
            facts.slice(0, 10).forEach(f => {
                summary += `- ${f.content}${f.source === 'inferred' ? ' (learned from conversation)' : ''}\n`;
            });
            summary += '\n';
        }

        if (preferences.length > 0) {
            summary += `USER PREFERENCES:\n`;
            preferences.slice(0, 10).forEach(p => {
                summary += `- ${p.content}\n`;
            });
            summary += '\n';
        }

        if (patterns.length > 0) {
            summary += `BEHAVIORAL PATTERNS:\n`;
            patterns.slice(0, 5).forEach(p => {
                summary += `- ${p.content}\n`;
            });
            summary += '\n';
        }

        if (reminders.length > 0) {
            summary += `USER ASKED TO REMEMBER:\n`;
            reminders.slice(0, 5).forEach(r => {
                summary += `- ${r.content}\n`;
            });
            summary += '\n';
        }

        return summary;
    }, [intelligence]);

    // Clear all intelligence (for debugging/reset)
    const clearAllIntelligence = useCallback(async () => {
        if (user) {
            try {
                await supabase
                    .from('user_intelligence')
                    .delete()
                    .eq('user_id', user.id);
            } catch (error) {
                console.error('Error clearing intelligence:', error);
            }
        } else {
            localStorage.removeItem('user_intelligence');
        }
        setIntelligence([]);
    }, [user]);

    return (
        <UserIntelligenceContext.Provider
            value={{
                intelligence,
                isLoading,
                learnFact,
                learnMultipleFacts,
                updateIntelligence,
                deleteIntelligence,
                getIntelligence,
                getIntelligenceByCategory,
                getIntelligenceBySource,
                getIntelligenceSummary,
                clearAllIntelligence,
                INTELLIGENCE_CATEGORIES
            }}
        >
            {children}
        </UserIntelligenceContext.Provider>
    );
};

export default UserIntelligenceContext;
