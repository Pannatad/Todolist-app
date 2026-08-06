import React from 'react';
import { Sprout } from 'lucide-react';
import SeedVisualization from './SeedVisualization';

const SeedGarden = ({ seeds }) => {
    if (!seeds?.length) return null;

    return (
        <section className="seed-garden rounded-[24px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:p-5">
            <div className="flex items-center gap-2 text-slate-900">
                <Sprout size={15} className="text-emerald-600" />
                <div>
                    <div className="text-sm font-semibold">Seed garden</div>
                    <div className="text-xs text-slate-500">{seeds.length} seed habit{seeds.length === 1 ? '' : 's'}</div>
                </div>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {seeds.map(({ habit, insight }) => (
                    <SeedVisualization
                        key={habit.id}
                        insight={insight}
                        compact
                        title={habit.name}
                        subtitle={habit.seed_why || 'A small act worth protecting.'}
                    />
                ))}
            </div>
        </section>
    );
};

export default SeedGarden;
