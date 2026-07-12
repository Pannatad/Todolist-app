/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import patternLearningService from '../services/PatternLearningService';

const AgentMemoryContext = createContext();

export const useAgentMemory = () => {
    const context = useContext(AgentMemoryContext);
    if (!context) {
        throw new Error('useAgentMemory must be used within an AgentMemoryProvider');
    }
    return context;
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const AgentMemoryProvider = ({ children }) => {
    const { user } = useAuth();

    // Short-term memory: detailed interaction logs (7-day rolling)
    const [shortTermMemory, setShortTermMemory] = useState([]);

    // Long-term memory: persistent patterns and insights
    const [longTermMemory, setLongTermMemory] = useState([]);

    // Auto-generated pattern insights
    const [patternInsights, setPatternInsights] = useState([]);

    const [isLoading, setIsLoading] = useState(true);

    // Load memory on mount or user change
    // These loaders are intentionally re-created with the provider's current user state.
    useEffect(() => {
        if (user) {
            loadMemoryFromSupabase();
        } else {
            loadMemoryFromLocalStorage();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Auto-purge old short-term memory entries
    // Purging uses the current save handler and is intentionally tied to memory updates.
    useEffect(() => {
        const now = Date.now();
        const filtered = shortTermMemory.filter(entry => {
            const entryTime = new Date(entry.timestamp).getTime();
            return now - entryTime < SEVEN_DAYS_MS;
        });

        if (filtered.length !== shortTermMemory.length) {
            setShortTermMemory(filtered);
            saveMemory('short', filtered);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shortTermMemory]);

    const loadMemoryFromSupabase = async () => {
        setIsLoading(true);
        try {
            // Load short-term memory
            const { data: shortData, error: shortError } = await supabase
                .from('agent_memory_short')
                .select('*')
                .eq('user_id', user.id)
                .gte('timestamp', new Date(Date.now() - SEVEN_DAYS_MS).toISOString())
                .order('timestamp', { ascending: false });

            if (shortError && shortError.code !== 'PGRST116') {
                console.error('Error loading short-term memory:', shortError);
            }
            setShortTermMemory(shortData || []);

            // Load long-term memory
            const { data: longData, error: longError } = await supabase
                .from('agent_memory_long')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (longError && longError.code !== 'PGRST116') {
                console.error('Error loading long-term memory:', longError);
            }
            setLongTermMemory(longData || []);

        } catch (error) {
            console.error('Error loading memory:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMemoryFromLocalStorage = () => {
        setIsLoading(true);
        try {
            const shortStored = localStorage.getItem('agent_memory_short');
            const longStored = localStorage.getItem('agent_memory_long');

            if (shortStored) {
                const parsed = JSON.parse(shortStored);
                // Filter out entries older than 7 days
                const now = Date.now();
                const filtered = parsed.filter(e => now - new Date(e.timestamp).getTime() < SEVEN_DAYS_MS);
                setShortTermMemory(filtered);
            }

            if (longStored) {
                setLongTermMemory(JSON.parse(longStored));
            }
        } catch (error) {
            console.error('Error loading memory from localStorage:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveMemory = async (type, data) => {
        if (user) {
            // Supabase saves happen in individual functions
        } else {
            // Save to localStorage
            const key = type === 'short' ? 'agent_memory_short' : 'agent_memory_long';
            localStorage.setItem(key, JSON.stringify(data));
        }
    };

    // Log an agent interaction (short-term memory)
    const logInteraction = useCallback(async (interaction) => {
        const entry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            input: interaction.input,
            actions: interaction.actions || [],
            outcome: interaction.outcome || 'success',
            context: interaction.context || {}
        };

        if (user) {
            try {
                await supabase.from('agent_memory_short').insert({
                    user_id: user.id,
                    ...entry
                });
            } catch (error) {
                console.error('Error saving interaction:', error);
            }
        }

        setShortTermMemory(prev => {
            const updated = [entry, ...prev].slice(0, 100); // Keep last 100 entries
            if (!user) {
                localStorage.setItem('agent_memory_short', JSON.stringify(updated));
            }
            return updated;
        });
    }, [user]);

    // Add or update a long-term pattern/insight
    const addInsight = useCallback(async (insight) => {
        const entry = {
            id: crypto.randomUUID(),
            type: insight.type || 'pattern', // pattern | preference | insight
            content: insight.content,
            confidence: insight.confidence || 0.5,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (user) {
            try {
                await supabase.from('agent_memory_long').insert({
                    user_id: user.id,
                    ...entry
                });
            } catch (error) {
                console.error('Error saving insight:', error);
            }
        }

        setLongTermMemory(prev => {
            const updated = [entry, ...prev];
            if (!user) {
                localStorage.setItem('agent_memory_long', JSON.stringify(updated));
            }
            return updated;
        });
    }, [user]);

    // Remember a note from user request (explicit memory storage)
    const rememberNote = useCallback(async (note) => {
        const entry = {
            id: crypto.randomUUID(),
            type: 'user_memory', // Explicit user-requested memory
            content: note,
            confidence: 1.0, // User-provided = full confidence
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (user) {
            try {
                await supabase.from('agent_memory_long').insert({
                    user_id: user.id,
                    ...entry
                });
            } catch (error) {
                console.error('Error saving user memory:', error);
            }
        }

        setLongTermMemory(prev => {
            const updated = [entry, ...prev];
            if (!user) {
                localStorage.setItem('agent_memory_long', JSON.stringify(updated));
            }
            return updated;
        });

        return entry;
    }, [user]);

    // Get recent interactions for agent context
    const getRecentInteractions = (count = 10) => {
        return shortTermMemory.slice(0, count);
    };

    // Get all insights for agent context
    const getInsights = () => {
        return longTermMemory;
    };

    // Generate a summary of memory for agent prompts
    const getMemorySummary = (userProfile = null) => {
        const recentActions = shortTermMemory.slice(0, 5);
        const topInsights = [...longTermMemory, ...patternInsights].slice(0, 6);

        let summary = '';

        // Add user profile context
        if (userProfile?.nickname) {
            summary += `User: ${userProfile.nickname}. `;
        }

        if (recentActions.length > 0) {
            summary += 'Recent: ';
            summary += recentActions.map(a => a.input).join('; ');
            summary += '. ';
        }

        if (topInsights.length > 0) {
            const patterns = topInsights.filter(i => i.type === 'pattern');
            const preferences = topInsights.filter(i => i.type === 'preference');
            const insights = topInsights.filter(i => i.type === 'insight');

            if (patterns.length > 0) {
                summary += 'Patterns: ' + patterns.map(p => p.content).join('. ') + '. ';
            }
            if (preferences.length > 0) {
                summary += 'Preferences: ' + preferences.map(p => p.content).join('. ') + '. ';
            }
            if (insights.length > 0) {
                summary += 'Insights: ' + insights.map(i => i.content).join('. ') + '. ';
            }

            // Include user-provided memories (explicit "remember this")
            const userMemories = topInsights.filter(i => i.type === 'user_memory');
            if (userMemories.length > 0) {
                summary += 'User notes to remember: ' + userMemories.map(m => m.content).join('. ') + '. ';
            }
        }

        return summary || 'No memory yet. Learning user patterns...';
    };

    // Generate pattern insights from user data
    const generatePatternInsights = useCallback((userData) => {
        const insights = patternLearningService.analyzeAndGenerateInsights(userData);
        setPatternInsights(insights);
        return insights;
    }, []);

    return (
        <AgentMemoryContext.Provider
            value={{
                shortTermMemory,
                longTermMemory,
                patternInsights,
                isLoading,
                logInteraction,
                addInsight,
                rememberNote,
                getRecentInteractions,
                getInsights,
                getMemorySummary,
                generatePatternInsights
            }}
        >
            {children}
        </AgentMemoryContext.Provider>
    );
};

export default AgentMemoryContext;
