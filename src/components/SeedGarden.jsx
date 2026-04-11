import React from 'react';
import { motion } from 'framer-motion';
import { Flower2, Skull, Sprout } from 'lucide-react';
import SeedVisualization from './SeedVisualization';

const SeedGarden = ({ seeds }) => {
    if (!seeds?.length) return null;

    const healthyCount = seeds.filter(({ insight }) => insight?.health === 'healthy' || insight?.health === 'recovering').length;
    const troubledCount = seeds.filter(({ insight }) => insight?.health === 'dry' || insight?.health === 'rotting' || insight?.health === 'dead').length;
    const avgConsistency = Math.round(
        (seeds.reduce((sum, { insight }) => sum + (insight?.consistencyRate || 0), 0) / seeds.length) * 100
    );

    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[36px] border border-emerald-100 bg-gradient-to-br from-emerald-200 via-teal-50 to-amber-100 p-6 shadow-[0_28px_60px_rgba(16,185,129,0.12)]"
        >
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-emerald-300/30 to-transparent" />
            <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-white/40 blur-3xl" />
            <div className="absolute left-8 top-10 h-12 w-24 rounded-full bg-white/50 blur-2xl" />

            <div className="relative z-10">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-2 text-emerald-700">
                            <Flower2 size={18} />
                            <span className="text-xs font-semibold uppercase tracking-[0.24em]">Overview Garden</span>
                        </div>
                        <h3 className="mt-2 font-serif text-3xl text-slate-800">Each seed now lives in its own row of labeled pots.</h3>
                        <p className="mt-2 text-sm text-slate-600">
                            Completed days grow the plant in that day's pot. Missed streaks dry the soil, then rot the seed, and long misses turn it dormant.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 lg:min-w-[360px]">
                        <div className="rounded-2xl bg-white/75 p-4 text-center shadow-sm">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Live Seeds</div>
                            <div className="mt-1 text-2xl font-semibold text-slate-800">{seeds.length}</div>
                        </div>
                        <div className="rounded-2xl bg-white/75 p-4 text-center shadow-sm">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Healthy</div>
                            <div className="mt-1 flex items-center justify-center gap-2 text-2xl font-semibold text-slate-800">
                                <Sprout size={18} className="text-emerald-600" />
                                {healthyCount}
                            </div>
                        </div>
                        <div className="rounded-2xl bg-white/75 p-4 text-center shadow-sm">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Needs Care</div>
                            <div className="mt-1 flex items-center justify-center gap-2 text-2xl font-semibold text-slate-800">
                                <Skull size={18} className="text-orange-500" />
                                {troubledCount}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-5 rounded-[28px] border border-white/60 bg-white/35 p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>Average care across all seed habits</span>
                        <span className="font-semibold text-slate-800">{avgConsistency}%</span>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/50">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${avgConsistency}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400"
                        />
                    </div>
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                    {seeds.map(({ habit, insight }, index) => (
                        <motion.div
                            key={habit.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                        >
                            <SeedVisualization
                                insight={insight}
                                compact
                                title={habit.name}
                                subtitle={habit.seed_why || 'A small act worth tending patiently.'}
                            />
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.section>
    );
};

export default SeedGarden;
