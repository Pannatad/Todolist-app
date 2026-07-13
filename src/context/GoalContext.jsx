/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { createGoalsRepo } from '../data/goalsRepo';

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
    const userId = user?.id;
    const goalsRepo = useMemo(() => createGoalsRepo(userId ? { id: userId } : null), [userId]);

    // Goals State
    const [goals, setGoals] = useState([]);

    // Daily Highlights State
    const [dailyHighlights, setDailyHighlights] = useState({});

    const loadGoalsFromLocalStorage = useCallback(async () => {
        setGoals(await goalsRepo.list());
        setDailyHighlights(await goalsRepo.listHighlights());
    }, [goalsRepo]);

    // Load from Supabase
    const loadGoalsFromSupabase = useCallback(async () => {
        try {
            const goalsData = await goalsRepo.list();
            setGoals(goalsData);
            const highlightsData = await goalsRepo.listHighlights();

            if (Array.isArray(highlightsData)) {
                const highlightsMap = {};
                highlightsData.forEach(h => {
                    highlightsMap[h.key] = {
                        text: h.text,
                        completed: h.completed,
                        status: h.status || (h.completed ? 'completed' : 'pending') // Backwards compatibility
                    };
                });
                setDailyHighlights(highlightsMap);
            } else {
                setDailyHighlights(highlightsData);
            }
        } catch (error) {
            console.error("Error loading goals:", error);
        }
    }, [goalsRepo]);

    useEffect(() => {
        if (user) {
            loadGoalsFromSupabase();
        } else {
            loadGoalsFromLocalStorage();
        }
    }, [loadGoalsFromLocalStorage, loadGoalsFromSupabase, user]);

    useEffect(() => {
        if (!user || !supabase) return undefined;

        const channel = supabase
            .channel(`goals-${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'goals', filter: `user_id=eq.${user.id}` },
                () => {
                    loadGoalsFromSupabase().catch((error) => {
                        console.error('Error refreshing goals in realtime:', error);
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'daily_highlights', filter: `user_id=eq.${user.id}` },
                () => {
                    loadGoalsFromSupabase().catch((error) => {
                        console.error('Error refreshing highlights in realtime:', error);
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [loadGoalsFromSupabase, user]);

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

        try {
            const data = await goalsRepo.create(newGoal);
            if (user && data) {
                setGoals(prev => prev.map(g => g.id === tempId ? { ...g, ...data, colorTheme: data.color_theme } : g));
            }
        } catch (error) {
            console.error('Error saving goal:', error);
        }
    };

    const updateGoal = async (id, updates) => {
        setGoals(goals.map(g => g.id === id ? { ...g, ...updates } : g));
        try { await goalsRepo.update(id, updates); }
        catch (error) { console.error('Error updating goal:', error); }
    };

    const deleteGoal = async (id) => {
        setGoals(goals.filter(g => g.id !== id));
        try { await goalsRepo.remove(id); }
        catch (error) { console.error('Error deleting goal:', error); }
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

        try { await goalsRepo.upsertHighlight(key, { text, completed, status: finalStatus }); }
        catch (error) { console.error('Error syncing highlight:', error); }
    };

    // Delete Highlight Handler
    const deleteHighlight = async (key) => {
        setDailyHighlights(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
        });

        try { await goalsRepo.removeHighlight(key); }
        catch (error) { console.error('Error deleting highlight:', error); }
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
