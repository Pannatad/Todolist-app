import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Moon, Sun, TrendingUp, TrendingDown, Calendar, Clock,
    ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

const SLEEP_EMOJIS = {
    1: '😴',
    2: '😔',
    3: '😊',
    4: '😄',
    5: '🌟'
};

const SLEEP_LABELS = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Great',
    5: 'Excellent'
};

const SleepTrendsDashboard = () => {
    const { user } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState(7); // days

    useEffect(() => {
        loadData();
    }, [user, timeRange]);

    const loadData = async () => {
        setLoading(true);

        if (user) {
            try {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - timeRange);

                const { data: reflections, error } = await supabase
                    .from('daily_reflections')
                    .select('*')
                    .eq('type', 'start_day')
                    .gte('date', startDate.toISOString().split('T')[0])
                    .order('date', { ascending: true });

                if (error) throw error;
                setData(reflections || []);
            } catch (err) {
                console.error('Error loading sleep data:', err);
            }
        } else {
            // Guest mode - load from localStorage
            const stored = JSON.parse(localStorage.getItem('morning-checkins') || '[]');
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - timeRange);
            const filtered = stored.filter(d => new Date(d.date) >= startDate);
            setData(filtered.map(d => ({ raw_data: d, date: d.date, mood_score: d.sleepQuality })));
        }

        setLoading(false);
    };

    // Calculate statistics
    const stats = {
        avgSleepQuality: data.length > 0
            ? (data.reduce((acc, d) => acc + (d.mood_score || d.raw_data?.sleepQuality || 0), 0) / data.length).toFixed(1)
            : 0,
        avgSleepDuration: (() => {
            const durations = data
                .map(d => d.raw_data?.sleepHours)
                .filter(h => h != null);
            if (durations.length === 0) return 0;
            return (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1);
        })(),
        avgWakeTime: (() => {
            const times = data
                .map(d => d.raw_data?.wakeUpTime)
                .filter(Boolean)
                .map(t => {
                    const [h, m] = t.split(':').map(Number);
                    return h * 60 + m;
                });
            if (times.length === 0) return '--:--';
            const avgMinutes = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
            const hours = Math.floor(avgMinutes / 60);
            const mins = avgMinutes % 60;
            return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        })(),
        totalDays: data.length,
        trend: data.length >= 2
            ? (data[data.length - 1]?.mood_score || 0) - (data[0]?.mood_score || 0)
            : 0
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Time Range Selector */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Moon className="w-6 h-6 text-indigo-500" />
                    Sleep & Wake Trends
                </h2>
                <div className="flex gap-2">
                    {[7, 14, 30].map(days => (
                        <button
                            key={days}
                            onClick={() => setTimeRange(days)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${timeRange === days
                                ? 'bg-indigo-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {days}D
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Average Sleep Quality */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-purple-500 to-indigo-600 p-5 rounded-2xl text-white"
                >
                    <p className="text-white/70 text-sm font-medium">Avg Sleep Quality</p>
                    <div className="flex items-end gap-2 mt-2">
                        <span className="text-3xl font-bold">{stats.avgSleepQuality}</span>
                        <span className="text-2xl mb-0.5">{SLEEP_EMOJIS[Math.round(stats.avgSleepQuality)] || '😊'}</span>
                    </div>
                    <p className="text-white/60 text-xs mt-1">{SLEEP_LABELS[Math.round(stats.avgSleepQuality)] || 'No data'}</p>
                </motion.div>

                {/* Average Wake Time */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-amber-500 to-orange-500 p-5 rounded-2xl text-white"
                >
                    <p className="text-white/70 text-sm font-medium">Avg Wake Time</p>
                    <div className="flex items-end gap-2 mt-2">
                        <Clock className="w-6 h-6 text-white/80" />
                        <span className="text-3xl font-bold font-mono">{stats.avgWakeTime}</span>
                    </div>
                    <p className="text-white/60 text-xs mt-1">Over {stats.totalDays} days</p>
                </motion.div>

                {/* Average Sleep Duration */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-emerald-500 to-teal-500 p-5 rounded-2xl text-white"
                >
                    <p className="text-white/70 text-sm font-medium">Avg Duration</p>
                    <div className="flex items-end gap-2 mt-2">
                        <Moon className="w-6 h-6 text-white/80" />
                        <span className="text-3xl font-bold">{stats.avgSleepDuration}</span>
                        <span className="text-xl mb-1">h</span>
                    </div>
                    <p className="text-white/60 text-xs mt-1">Goal: 8.0h</p>
                </motion.div>

                {/* Trend */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`bg-gradient-to-br ${stats.trend >= 0 ? 'from-green-500 to-emerald-500' : 'from-red-500 to-rose-500'} p-5 rounded-2xl text-white`}
                >
                    <p className="text-white/70 text-sm font-medium">Quality Trend</p>
                    <div className="flex items-end gap-2 mt-2">
                        {stats.trend >= 0 ? (
                            <TrendingUp className="w-6 h-6 text-white/80" />
                        ) : (
                            <TrendingDown className="w-6 h-6 text-white/80" />
                        )}
                        <span className="text-3xl font-bold">{stats.trend >= 0 ? '+' : ''}{stats.trend}</span>
                    </div>
                    <p className="text-white/60 text-xs mt-1">{stats.trend >= 0 ? 'Improving!' : 'Needs attention'}</p>
                </motion.div>
            </div>

            {/* Daily Log Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Daily Log</h3>
                </div>

                {data.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                        {[...data].reverse().map((entry, index) => (
                            <motion.div
                                key={entry.id || index}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.05 }}
                                className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                                        <span className="text-2xl">{SLEEP_EMOJIS[entry.mood_score || entry.raw_data?.sleepQuality] || '😊'}</span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {new Date(entry.date).toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {entry.raw_data?.morningThoughts
                                                ? entry.raw_data.morningThoughts.slice(0, 50) + (entry.raw_data.morningThoughts.length > 50 ? '...' : '')
                                                : 'No notes'
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 text-right">
                                    {entry.raw_data?.sleepHours && (
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase">Duration</p>
                                            <p className="font-mono font-medium text-gray-900">
                                                {entry.raw_data.sleepHours}h
                                            </p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase">Wake Time</p>
                                        <p className="font-mono font-medium text-gray-900">
                                            {entry.raw_data?.wakeUpTime || '--:--'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase">Quality</p>
                                        <p className="font-medium text-gray-900">
                                            {SLEEP_LABELS[entry.mood_score || entry.raw_data?.sleepQuality] || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center text-gray-400">
                        <Moon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No sleep data yet</p>
                        <p className="text-sm mt-1">Complete "Start the Day" to track your sleep!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SleepTrendsDashboard;
