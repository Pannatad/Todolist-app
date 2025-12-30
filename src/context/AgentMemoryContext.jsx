import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

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

    const [isLoading, setIsLoading] = useState(true);

    // Load memory on mount or user change
    useEffect(() => {
        if (user) {
            loadMemoryFromSupabase();
        } else {
            loadMemoryFromLocalStorage();
        }
    }, [user]);

    // Auto-purge old short-term memory entries
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

    // Get recent interactions for agent context
    const getRecentInteractions = (count = 10) => {
        return shortTermMemory.slice(0, count);
    };

    // Get all insights for agent context
    const getInsights = () => {
        return longTermMemory;
    };

    // Generate a summary of memory for agent prompts
    const getMemorySummary = () => {
        const recentActions = shortTermMemory.slice(0, 5);
        const topInsights = longTermMemory.slice(0, 3);

        let summary = '';

        if (recentActions.length > 0) {
            summary += 'Recent interactions: ';
            summary += recentActions.map(a => a.input).join('; ');
            summary += '. ';
        }

        if (topInsights.length > 0) {
            summary += 'Known patterns: ';
            summary += topInsights.map(i => i.content).join('; ');
        }

        return summary || 'No memory yet.';
    };

    return (
        <AgentMemoryContext.Provider
            value={{
                shortTermMemory,
                longTermMemory,
                isLoading,
                logInteraction,
                addInsight,
                getRecentInteractions,
                getInsights,
                getMemorySummary
            }}
        >
            {children}
        </AgentMemoryContext.Provider>
    );
};

export default AgentMemoryContext;
