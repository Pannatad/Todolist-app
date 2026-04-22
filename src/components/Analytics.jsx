import React, { useMemo } from 'react';
import { useLog } from '../context/LogContext';
import { useTask } from '../context/TaskContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { Clock, CheckCircle, TrendingUp, Award } from 'lucide-react';
import { isTaskCompleted } from '../utils/taskState';

const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6'];

function Analytics() {
    const { activityLogs, getWeeklyStats } = useLog();
    const { tasks } = useTask();

    const stats = useMemo(() => getWeeklyStats(), [activityLogs]);

    // Prepare data for charts
    const dailyData = Object.entries(stats.dailyMinutes).map(([date, minutes]) => ({
        name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        minutes: minutes,
        fullDate: date
    })).reverse();

    const categoryData = Object.entries(stats.categoryStats).map(([name, value]) => ({
        name,
        value
    }));

    // Calculate completion stats
    const completionStats = useMemo(() => {
        const completedTasks = tasks.filter(isTaskCompleted);
        const totalTasks = tasks.length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

        return {
            total: totalTasks,
            completed: completedTasks.length,
            rate: completionRate
        };
    }, [tasks]);

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            {/* Header Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon={<Clock className="w-5 h-5 text-indigo-500" />}
                    label="Focus Time"
                    value={`${Math.round(stats.totalMinutes / 60)}h ${stats.totalMinutes % 60}m`}
                    subtext="This Week"
                />
                <StatCard
                    icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
                    label="Tasks Done"
                    value={completionStats.completed}
                    subtext={`${completionStats.rate}% Rate`}
                />
                <StatCard
                    icon={<TrendingUp className="w-5 h-5 text-amber-500" />}
                    label="Avg. Daily"
                    value={`${Math.round(stats.totalMinutes / 7)}m`}
                    subtext="Focus"
                />
                <StatCard
                    icon={<Award className="w-5 h-5 text-rose-500" />}
                    label="Streak"
                    value="3 Days"
                    subtext="Keep it up!"
                />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Weekly Activity Chart */}
                <div className="bg-white/50 dark:bg-void-800/50 backdrop-blur-md p-6 rounded-2xl border border-sage-200 dark:border-white/5 shadow-sm">
                    <h3 className="text-lg font-bold text-sage-700 dark:text-bone-200 mb-4">Weekly Focus</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyData}>
                                <XAxis
                                    dataKey="name"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                        borderRadius: '8px',
                                        border: 'none',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                    cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                                />
                                <Bar
                                    dataKey="minutes"
                                    fill="#818cf8"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Distribution */}
                <div className="bg-white/50 dark:bg-void-800/50 backdrop-blur-md p-6 rounded-2xl border border-sage-200 dark:border-white/5 shadow-sm">
                    <h3 className="text-lg font-bold text-sage-700 dark:text-bone-200 mb-4">Focus Distribution</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 mt-4">
                        {categoryData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-1.5 text-xs text-sage-600 dark:text-bone-300">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                {entry.name}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, subtext }) {
    return (
        <div className="bg-white/50 dark:bg-void-800/50 backdrop-blur-md p-4 rounded-2xl border border-sage-200 dark:border-white/5 shadow-sm hover:scale-105 transition-transform">
            <div className="flex items-start justify-between mb-2">
                <div className="p-2 bg-white dark:bg-void-900 rounded-lg shadow-sm">
                    {icon}
                </div>
            </div>
            <div>
                <p className="text-sm text-sage-500 dark:text-bone-400 font-medium">{label}</p>
                <h4 className="text-2xl font-bold text-sage-800 dark:text-bone-100">{value}</h4>
                <p className="text-xs text-sage-400 dark:text-bone-500 mt-1">{subtext}</p>
            </div>
        </div>
    );
}

export default Analytics;
