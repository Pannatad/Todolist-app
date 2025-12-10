import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

const GoalContext = createContext();

export const useGoal = () => {
    const context = useContext(GoalContext);
    if (!context) {
        throw new Error('useGoal must be used within GoalProvider');
    }
    return context;
};

export const GoalProvider = ({ children }) => {
    const { user } = useAuth();

    // Goals State
    const [goals, setGoals] = useState(() => {
        try {
            const saved = localStorage.getItem('vision-goals');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to parse goals:", e);
            return [];
        }
    });

    // Daily Highlights State
    const [dailyHighlights, setDailyHighlights] = useState(() => {
        try {
            const saved = localStorage.getItem('daily-highlights');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error("Failed to parse daily highlights:", e);
            return {};
        }
    });

    // Load from Supabase
    const loadGoalsFromSupabase = async () => {
        if (!user) return;

        try {
            // Load Goals
            const { data: goalsData } = await supabase
                .from('goals')
                .select('*')
                .order('created_at', { ascending: true });
            if (goalsData) setGoals(goalsData);

            // Load Daily Highlights
            const { data: highlightsData } = await supabase
                .from('daily_highlights')
                .select('*');

            if (highlightsData) {
                const highlightsMap = {};
                highlightsData.forEach(h => {
                    highlightsMap[h.key] = {
                        text: h.text,
                        completed: h.completed,
                        status: h.status || (h.completed ? 'completed' : 'pending') // Backwards compatibility
                    };
                });
                setDailyHighlights(highlightsMap);
            }
        } catch (error) {
            console.error("Error loading goals:", error);
        }
    };

    useEffect(() => {
        if (user) {
            loadGoalsFromSupabase();
        }
    }, [user]);

    // Save to LocalStorage (Guest Mode)
    useEffect(() => {
        if (!user) {
            localStorage.setItem('vision-goals', JSON.stringify(goals));
            localStorage.setItem('daily-highlights', JSON.stringify(dailyHighlights));
        }
    }, [goals, dailyHighlights, user]);

    // Goal Handlers
    const addGoal = async (goalData) => {
        const newGoal = {
            ...goalData,
            id: user ? undefined : Date.now(),
            user_id: user?.id,
            color_theme: goalData.colorTheme,
            created_at: new Date().toISOString()
        };

        const tempId = Date.now();
        setGoals(prev => [...prev, { ...newGoal, id: user ? tempId : newGoal.id }]);

        if (user) {
            const { id, colorTheme, ...dbGoal } = newGoal;
            const { data, error } = await supabase.from('goals').insert([dbGoal]).select().single();
            if (data) {
                setGoals(prev => prev.map(g => g.id === tempId ? { ...g, ...data, colorTheme: data.color_theme } : g));
            }
        }
    };

    const updateGoal = async (id, updates) => {
        setGoals(goals.map(g => g.id === id ? { ...g, ...updates } : g));
        if (user) {
            const dbUpdates = { ...updates };
            if (dbUpdates.colorTheme) {
                dbUpdates.color_theme = dbUpdates.colorTheme;
                delete dbUpdates.colorTheme;
            }
            await supabase.from('goals').update(dbUpdates).eq('id', id);
        }
    };

    const deleteGoal = async (id) => {
        setGoals(goals.filter(g => g.id !== id));
        if (user) {
            await supabase.from('goals').delete().eq('id', id);
        }
    };

    // Daily Highlight Handler
    const updateHighlight = async (key, text, completed = false, status = 'pending') => {
        // Auto-derive status if not explicitly provided but completed is true
        let finalStatus = status;
        if (completed && status === 'pending') finalStatus = 'completed';
        if (!completed && status === 'completed') finalStatus = 'pending';

        setDailyHighlights(prev => ({
            ...prev,
            [key]: { text, completed, status: finalStatus }
        }));

        if (user) {
            const { error } = await supabase
                .from('daily_highlights')
                .upsert({
                    user_id: user.id,
                    key,
                    text,
                    completed,
                    status: finalStatus,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, key' });

            if (error) console.error("Error syncing highlight:", error);
        }
    };

    // Delete Highlight Handler
    const deleteHighlight = async (key) => {
        setDailyHighlights(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
        });

        if (user) {
            const { error } = await supabase
                .from('daily_highlights')
                .delete()
                .eq('user_id', user.id)
                .eq('key', key);

            if (error) console.error("Error deleting highlight:", error);
        }
    };

    const value = {
        goals,
        dailyHighlights,
        addGoal,
        updateGoal,
        deleteGoal,
        updateHighlight,
        deleteHighlight
    };

    return (
        <GoalContext.Provider value={value}>
            {children}
        </GoalContext.Provider>
    );
};
