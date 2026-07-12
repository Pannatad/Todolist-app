/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { toLocalDateKey } from '../utils/scheduleOccurrences';

const LogContext = createContext();

const createGuestLogs = () => {
    const today = new Date();
    return [
        {
            id: 1,
            activity: "Morning Run",
            duration: 30,
            category: "Health",
            timestamp: new Date(today.setHours(7, 30, 0, 0)).toISOString()
        },
        {
            id: 2,
            activity: "Linear Algebra Review",
            duration: 90,
            category: "Study",
            timestamp: new Date(today.setHours(9, 0, 0, 0)).toISOString()
        },
        {
            id: 3,
            activity: "React Project",
            duration: 120,
            category: "Coding",
            timestamp: new Date(today.setHours(14, 0, 0, 0)).toISOString()
        }
    ];
};

const readLocalLogs = () => {
    try {
        const saved = localStorage.getItem('daily-logs');
        if (saved) return JSON.parse(saved);
        return createGuestLogs();
    } catch (error) {
        console.error("Failed to parse activity logs:", error);
        return [];
    }
};

export const useLog = () => {
    const context = useContext(LogContext);
    if (!context) {
        throw new Error('useLog must be used within LogProvider');
    }
    return context;
};

export const LogProvider = ({ children }) => {
    const { user } = useAuth();

    const [activityLogs, setActivityLogs] = useState(() => readLocalLogs());

    // Load from Supabase
    const loadLogsFromSupabase = useCallback(async () => {
        if (!user) return;

        try {
            const { data: logsData } = await supabase
                .from('activity_logs')
                .select('*')
                .eq('user_id', user.id)
                .order('timestamp', { ascending: false });
            if (logsData) setActivityLogs(logsData);
        } catch (error) {
            console.error("Error loading logs:", error);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            // Preserve the existing user/guest branch timing while loading persisted logs.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            loadLogsFromSupabase();
        } else {
            setActivityLogs(readLocalLogs());
        }
    }, [loadLogsFromSupabase, user]);

    // Save to LocalStorage (Guest Mode)
    useEffect(() => {
        if (!user) {
            localStorage.setItem('daily-logs', JSON.stringify(activityLogs));
        }
    }, [activityLogs, user]);

    // Log Handlers
    const addActivityLog = async (logData) => {
        const newLog = {
            ...logData,
            id: user ? undefined : Date.now(),
            user_id: user?.id
        };

        const tempId = Date.now();
        setActivityLogs(prev => [...prev, { ...newLog, id: user ? tempId : newLog.id }]);

        if (user) {
            const { id: _id, ...dbLog } = newLog;
            const { data, error } = await supabase.from('activity_logs').insert([dbLog]).select().single();
            if (data) {
                setActivityLogs(prev => prev.map(l => l.id === tempId ? { ...l, ...data } : l));
            }
            if (error) console.error('Error adding activity log:', error);
        }
    };

    const deleteActivityLog = async (id) => {
        setActivityLogs(activityLogs.filter(log => log.id !== id));
        if (user) {
            await supabase.from('activity_logs').delete().eq('id', id);
        }
    };

    // Analytics Helper
    const getWeeklyStats = () => {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const weekLogs = activityLogs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate >= weekAgo && logDate <= now && !log.isPlanned;
        });

        const totalMinutes = weekLogs.reduce((sum, log) => sum + log.duration, 0);

        // Daily breakdown
        const dailyMinutes = {};
        for (let i = 0; i < 7; i++) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateKey = toLocalDateKey(date);
            dailyMinutes[dateKey] = 0;
        }

        weekLogs.forEach(log => {
            const dateKey = toLocalDateKey(log.timestamp);
            if (dailyMinutes[dateKey] !== undefined) {
                dailyMinutes[dateKey] += log.duration;
            }
        });

        // Category breakdown
        const categoryStats = {};
        weekLogs.forEach(log => {
            if (!categoryStats[log.category]) {
                categoryStats[log.category] = 0;
            }
            categoryStats[log.category] += log.duration;
        });

        return {
            totalMinutes,
            dailyMinutes,
            categoryStats,
            logCount: weekLogs.length
        };
    };

    const value = {
        activityLogs,
        addActivityLog,
        deleteActivityLog,
        getWeeklyStats
    };

    return (
        <LogContext.Provider value={value}>
            {children}
        </LogContext.Provider>
    );
};
