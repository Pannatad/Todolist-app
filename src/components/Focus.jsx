import React, { useMemo, useState } from 'react';
import {
    Archive,
    BadgeCheck,
    BookMarked,
    Check,
    Crosshair,
    Footprints,
    Gift,
    History,
    PackageCheck,
    Plus,
    Sparkles,
    Star,
    Target,
    TimerReset,
    Trash2,
    Trophy,
    WalletCards,
} from 'lucide-react';
import { useFocus } from '../context/FocusContext';

const inkBorder = 'border-2 border-slate-800 dark:border-bone-200/70';
const popShadow = 'shadow-[4px_4px_0_#1E293B] dark:shadow-[4px_4px_0_rgba(255,255,255,0.24)]';
const softPopShadow = 'shadow-[6px_6px_0_#E2E8F0] dark:shadow-[6px_6px_0_rgba(255,255,255,0.10)]';
const popMotion = 'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]';
const inputClass = `w-full rounded-2xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-500 focus:shadow-[4px_4px_0_#8B5CF6] dark:border-white/10 dark:bg-void-800 dark:text-bone-100`;

const sessionTypes = [
    { id: 'Focus', label: 'Focus', icon: Crosshair, tint: 'bg-violet-100 text-violet-900', iconBg: 'bg-violet-500 text-white', shape: 'rounded-full' },
    { id: 'Reading', label: 'Read', icon: BookMarked, tint: 'bg-sky-100 text-sky-900', iconBg: 'bg-sky-300 text-slate-950', shape: 'rounded-t-full rounded-b-2xl' },
    { id: 'Workout', label: 'Move', icon: Footprints, tint: 'bg-amber-100 text-amber-950', iconBg: 'bg-amber-300 text-slate-950', shape: 'rounded-[18px]' },
    { id: 'Good habit', label: 'Habit', icon: BadgeCheck, tint: 'bg-rose-100 text-rose-900', iconBg: 'bg-rose-400 text-white', shape: 'rounded-tl-3xl rounded-tr-xl rounded-br-3xl rounded-bl-xl' },
];

const rewardColors = [
    {
        id: 'mint',
        label: 'Mint',
        className: 'bg-emerald-100 text-emerald-950',
        sticker: 'bg-emerald-300',
        shadow: 'shadow-[5px_5px_0_#86EFAC]',
    },
    {
        id: 'berry',
        label: 'Berry',
        className: 'bg-rose-100 text-rose-950',
        sticker: 'bg-rose-300',
        shadow: 'shadow-[5px_5px_0_#FDA4AF]',
    },
    {
        id: 'sky',
        label: 'Sky',
        className: 'bg-sky-100 text-sky-950',
        sticker: 'bg-sky-300',
        shadow: 'shadow-[5px_5px_0_#7DD3FC]',
    },
];

const formatLocalInputValue = (date = new Date()) => {
    const localDate = new Date(date);
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    return localDate.toISOString().slice(0, 16);
};

const formatDateTime = (value) => {
    if (!value) return 'Just now';
    return new Date(value).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getRewardColor = (color) => (
    rewardColors.find((item) => item.id === color) || rewardColors[0]
);

const IconBadge = ({ children, className = 'bg-violet-500 text-white' }) => (
    <div className={`grid h-10 w-10 place-items-center rounded-2xl ${inkBorder} ${className}`}>
        {children}
    </div>
);

const Focus = () => {
    const {
        sessions,
        activeRewards,
        availableInventory,
        transactions,
        weeklyPoints,
        balance,
        lifetimeSessionPoints,
        dailySessionPoints,
        milestoneInterval,
        milestoneBonus,
        dailyMilestoneInterval,
        dailyMilestoneBonus,
        getSessionPoints,
        addSession,
        addReward,
        purchaseReward,
        useInventoryItem: markInventoryItemUsed,
        archiveReward,
        isLoaded,
    } = useFocus();

    const [sessionForm, setSessionForm] = useState({
        sessionType: 'Focus',
        startedAt: formatLocalInputValue(),
        durationMinutes: 50,
        note: '',
    });
    const [rewardForm, setRewardForm] = useState({
        name: '',
        costPoints: 3,
        color: 'mint',
    });
    const [message, setMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const previewPoints = getSessionPoints(sessionForm.durationMinutes);
    const maxWeeklyPoints = Math.max(1, ...weeklyPoints.map((day) => day.points));
    const nextMilestone = Math.max(milestoneInterval, Math.ceil((lifetimeSessionPoints + 1) / milestoneInterval) * milestoneInterval);
    const milestoneProgress = Math.min(100, Math.round((lifetimeSessionPoints / nextMilestone) * 100));
    const nextDailyMilestone = Math.max(
        dailyMilestoneInterval,
        (Math.floor(dailySessionPoints / dailyMilestoneInterval) + 1) * dailyMilestoneInterval
    );
    const dailyMilestoneProgress = Math.round(((dailySessionPoints % dailyMilestoneInterval) / dailyMilestoneInterval) * 100);
    const punchSlots = Array.from({ length: 10 }, (_, index) => index);
    const filledPunchSlots = Math.min(10, Math.floor((milestoneProgress / 100) * 10));
    const filledDailyPunchSlots = Math.min(10, Math.floor((dailyMilestoneProgress / 100) * 10));

    const recentTransactions = useMemo(() => transactions.slice(0, 8), [transactions]);
    const recentSessions = useMemo(() => sessions.slice(0, 5), [sessions]);
    const sortedRewards = useMemo(() => (
        [...activeRewards].sort((left, right) => {
            if (right.cost_points !== left.cost_points) return right.cost_points - left.cost_points;
            return new Date(left.created_at || 0) - new Date(right.created_at || 0);
        })
    ), [activeRewards]);

    const handleSessionSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        setIsSaving(true);
        try {
            await addSession({
                sessionType: sessionForm.sessionType,
                startedAt: new Date(sessionForm.startedAt).toISOString(),
                durationMinutes: Number(sessionForm.durationMinutes),
                note: sessionForm.note.trim(),
            });
            setSessionForm((prev) => ({
                ...prev,
                startedAt: formatLocalInputValue(),
                note: '',
            }));
            setMessage('Stamped. Points are in your pocket.');
        } catch (error) {
            setMessage(error.message || 'Could not log that session.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRewardSubmit = async (event) => {
        event.preventDefault();
        if (!rewardForm.name.trim()) return;
        setMessage('');
        setIsSaving(true);
        try {
            await addReward({
                name: rewardForm.name.trim(),
                costPoints: Number(rewardForm.costPoints),
                color: rewardForm.color,
            });
            setRewardForm({ name: '', costPoints: 3, color: 'mint' });
            setMessage('Prize added to the shelf.');
        } catch (error) {
            setMessage(error.message || 'Could not add that reward.');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePurchaseReward = async (rewardId) => {
        setMessage('');
        try {
            await purchaseReward(rewardId);
            setMessage('Ticket printed. Check your inventory.');
        } catch (error) {
            setMessage(error.message || 'Could not purchase that reward.');
        }
    };

    const handleUseInventoryItem = async (inventoryId) => {
        setMessage('');
        try {
            await markInventoryItemUsed(inventoryId);
            setMessage('Ticket used. Enjoy it guilt-free.');
        } catch (error) {
            setMessage(error.message || 'Could not use that reward.');
        }
    };

    return (
        <div className="relative isolate mx-auto w-full max-w-6xl pb-24 text-left">
            <div className="pointer-events-none absolute -left-5 top-12 hidden h-16 w-16 rounded-full bg-rose-300 lg:block" />
            <div className="pointer-events-none absolute right-4 top-44 hidden h-20 w-20 rotate-12 bg-[linear-gradient(135deg,#FBBF24_25%,transparent_25%,transparent_50%,#FBBF24_50%,#FBBF24_75%,transparent_75%)] bg-[length:16px_16px] lg:block" />
            <div className="pointer-events-none absolute -right-8 top-8 hidden h-28 w-28 rounded-t-full rounded-b-none bg-emerald-300/70 lg:block" />

            <section className={`relative isolate overflow-hidden rounded-[30px] bg-[#fffdf5] p-4 ${inkBorder} ${popShadow} dark:bg-void-900 sm:p-5`}>
                <div className="absolute inset-0 -z-10 opacity-60 [background-image:radial-gradient(#CBD5E1_1.2px,transparent_1.2px)] [background-size:18px_18px]" />
                <div className="pointer-events-none absolute left-5 top-5 z-0 h-9 w-9 rotate-45 bg-violet-300 opacity-70" />
                <div className="pointer-events-none absolute right-8 top-8 z-0 h-8 w-8 rounded-full bg-rose-300 opacity-70" />
                <div className="pointer-events-none absolute bottom-6 right-24 z-0 hidden h-7 w-12 rounded-full bg-amber-300 opacity-70 lg:block" />

                <div className="relative z-10 grid gap-4 xl:grid-cols-[1.16fr_0.84fr] xl:items-stretch">
                    <div className="relative min-w-0 rounded-t-[26px] rounded-br-[26px] rounded-bl-none border-2 border-slate-800 bg-white/90 p-4 dark:border-bone-200/70 dark:bg-void-800/90">
                        <div className="inline-flex rotate-[-1deg] items-center gap-2 rounded-full border-2 border-slate-800 bg-violet-500 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white dark:border-bone-200/70">
                            <Sparkles size={14} strokeWidth={2.7} />
                            Focus Arcade
                        </div>
                        <h1 className="mt-3 max-w-2xl break-words text-2xl font-black leading-tight text-slate-950 dark:text-bone-100 sm:text-3xl">
                            Trade good sessions for tiny prizes.
                        </h1>
                        <p className="mt-2 max-w-2xl break-words text-sm font-medium leading-6 text-slate-600 dark:text-bone-200/70">
                            Stamp a 25-minute block for 1 point, or a 50-minute block for 2. Reading, workouts, walks, errands, deep work - all welcome.
                        </p>

                        {message && (
                            <div className={`mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-sm font-black text-emerald-950 ${inkBorder}`}>
                                <Check size={15} strokeWidth={2.7} />
                                <span className="truncate">{message}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className={`relative overflow-hidden rounded-[24px] bg-emerald-100 p-4 text-emerald-950 ${inkBorder} ${softPopShadow}`}>
                            <div className="pointer-events-none absolute -right-4 -top-4 z-0 h-14 w-14 rounded-full bg-emerald-300/80" />
                            <div className="relative z-10 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em]">
                                <IconBadge className="h-8 w-8 rounded-full bg-emerald-400 text-slate-900">
                                    <WalletCards size={15} strokeWidth={2.7} />
                                </IconBadge>
                                Pocket
                            </div>
                            <div className="relative z-10 mt-3 text-4xl font-black leading-none">{balance}</div>
                            <div className="relative z-10 mt-1 text-xs font-black opacity-70">spendable</div>
                        </div>
                        <div className={`relative min-h-36 overflow-hidden rounded-[24px] bg-amber-100 p-4 text-amber-950 ${inkBorder} ${softPopShadow}`}>
                            <div className="pointer-events-none absolute -right-8 -top-10 z-0 h-24 w-24 rounded-full border-2 border-slate-800 bg-amber-200/70 dark:border-bone-200/70" />
                            <div className="pointer-events-none absolute left-3 top-3 z-0 h-4 w-4 rotate-45 bg-rose-300" />
                            <div className="relative z-10 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em]">
                                <IconBadge className="h-8 w-8 rounded-full bg-amber-300 text-slate-900">
                                    <Trophy size={15} strokeWidth={2.7} />
                                </IconBadge>
                                Earned
                            </div>
                            <div className="relative z-10 mt-3 text-4xl font-black leading-none">{lifetimeSessionPoints}</div>
                            <div className="relative z-10 mt-1 text-xs font-black opacity-70">lifetime</div>
                        </div>
                        <div className={`col-span-2 rounded-[24px] bg-white p-3 pr-16 text-slate-900 sm:pr-3 ${inkBorder} ${softPopShadow} dark:bg-void-800 dark:text-bone-100`}>
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2 text-sm font-black">
                                    <IconBadge className="h-8 w-8 rounded-[14px] bg-rose-400 text-white">
                                        <Star size={15} strokeWidth={2.7} />
                                    </IconBadge>
                                    <span className="truncate">Bonus at {nextMilestone}</span>
                                </div>
                                <span className="rounded-full border-2 border-slate-800 bg-amber-300 px-2 py-1 text-xs font-black text-slate-950">+{milestoneBonus}</span>
                            </div>
                            <div className="mt-3 grid grid-cols-10 place-items-center gap-1 overflow-hidden py-1">
                                {punchSlots.map((slot) => (
                                    <div
                                        key={slot}
                                        className={`aspect-square w-full max-w-9 rounded-full border-2 border-slate-800 sm:max-w-11 ${
                                            slot < filledPunchSlots ? 'bg-violet-500' : 'bg-slate-100 dark:bg-void-700'
                                        }`}
                                    />
                                ))}
                            </div>
                            <div className="mt-4 border-t-2 border-dashed border-slate-800/30 pt-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 text-sm font-black">
                                        <span className="truncate">Daily bonus at {nextDailyMilestone}</span>
                                    </div>
                                    <span className="rounded-full border-2 border-slate-800 bg-emerald-300 px-2 py-1 text-xs font-black text-slate-950">+{dailyMilestoneBonus}</span>
                                </div>
                                <div className="mt-3 grid grid-cols-10 place-items-center gap-1 overflow-hidden py-1">
                                    {punchSlots.map((slot) => (
                                        <div
                                            key={`daily-${slot}`}
                                            className={`aspect-square w-full max-w-9 rounded-full border-2 border-slate-800 sm:max-w-11 ${
                                                slot < filledDailyPunchSlots ? 'bg-emerald-300' : 'bg-slate-100 dark:bg-void-700'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <section className={`relative rounded-[28px] bg-white p-4 ${inkBorder} ${softPopShadow} dark:bg-void-900/90 sm:p-5`}>
                    <div className="absolute -top-5 right-5 grid h-11 w-11 place-items-center rounded-full border-2 border-slate-800 bg-emerald-300 text-slate-950">
                        <Target size={20} strokeWidth={2.7} />
                    </div>
                    <div className="flex items-start justify-between gap-3 pr-12">
                        <div>
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">Stamp booth</div>
                            <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-bone-100">Log what counted</h2>
                        </div>
                        <div className={`rotate-2 rounded-[18px] bg-violet-100 px-4 py-2 text-center text-violet-950 ${inkBorder}`}>
                            <div className="text-[10px] font-black uppercase tracking-[0.14em]">prints</div>
                            <div className="text-xl font-black">+{previewPoints}</div>
                        </div>
                    </div>

                    <form className="mt-4 space-y-4" onSubmit={handleSessionSubmit}>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {sessionTypes.map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setSessionForm((prev) => ({ ...prev, sessionType: type.id }))}
                                    className={`flex min-h-16 flex-col items-center justify-center gap-1 border-2 border-slate-800 px-3 py-2 text-sm font-black ${popMotion} dark:border-bone-200/70 ${
                                        sessionForm.sessionType === type.id
                                            ? `${type.shape} ${type.tint} shadow-[4px_4px_0_#1E293B]`
                                            : 'rounded-2xl bg-slate-50 text-slate-500 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-amber-100 hover:text-slate-900 dark:bg-void-800 dark:text-bone-200/70'
                                    }`}
                                >
                                    <span className={`grid h-8 w-8 place-items-center border-2 border-slate-800 ${type.iconBg} ${
                                        sessionForm.sessionType === type.id ? 'rounded-full' : 'rounded-xl'
                                    }`}>
                                        <type.icon size={16} strokeWidth={2.8} />
                                    </span>
                                    <span>{type.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[1fr_0.95fr]">
                            <label className="block">
                                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-bone-200/55">When</span>
                                <input
                                    type="datetime-local"
                                    value={sessionForm.startedAt}
                                    onChange={(event) => setSessionForm((prev) => ({ ...prev, startedAt: event.target.value }))}
                                    className={`mt-1 ${inputClass}`}
                                />
                            </label>
                            <label className="block">
                                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-bone-200/55">How long</span>
                                <div className="mt-1 grid grid-cols-[auto_auto_minmax(0,1fr)] gap-2">
                                    {[25, 50].map((minutes) => (
                                        <button
                                            key={minutes}
                                            type="button"
                                            onClick={() => setSessionForm((prev) => ({ ...prev, durationMinutes: minutes }))}
                                            className={`min-h-11 rounded-full border-2 border-slate-800 px-3 py-2 text-sm font-black ${popMotion} dark:border-bone-200/70 ${
                                                Number(sessionForm.durationMinutes) === minutes
                                                    ? 'bg-amber-300 text-slate-950 shadow-[3px_3px_0_#1E293B]'
                                                    : 'bg-white text-slate-500 hover:bg-amber-100 dark:bg-void-800 dark:text-bone-200/70'
                                            }`}
                                        >
                                            {minutes}
                                        </button>
                                    ))}
                                    <input
                                        type="number"
                                        min="25"
                                        step="5"
                                        value={sessionForm.durationMinutes}
                                        onChange={(event) => setSessionForm((prev) => ({ ...prev, durationMinutes: event.target.value }))}
                                        className={`min-w-0 ${inputClass}`}
                                        aria-label="Session duration minutes"
                                    />
                                </div>
                            </label>
                        </div>

                        <label className="block">
                            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-bone-200/55">Receipt note</span>
                            <input
                                type="text"
                                value={sessionForm.note}
                                onChange={(event) => setSessionForm((prev) => ({ ...prev, note: event.target.value }))}
                                placeholder="What did you do?"
                                className={`mt-1 py-3 ${inputClass}`}
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={isSaving || previewPoints <= 0}
                            className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-slate-800 bg-violet-500 px-5 py-3 text-sm font-black text-white shadow-[4px_4px_0_#1E293B] ${popMotion} hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#1E293B] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#1E293B] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none sm:w-auto`}
                        >
                            <Plus size={16} strokeWidth={2.7} />
                            Stamp it
                        </button>
                    </form>
                </section>

                <section className={`relative overflow-hidden rounded-[28px] bg-[#F8FBFF] p-4 ${inkBorder} ${softPopShadow} dark:bg-void-900/90 sm:p-5`}>
                    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-sky-200" />
                    <div className="relative flex items-start justify-between gap-3">
                        <div>
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">This week</div>
                            <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-bone-100">Daily stamp stack</h2>
                        </div>
                        <IconBadge className="bg-sky-400 text-slate-950">
                            <TimerReset size={20} strokeWidth={2.7} />
                        </IconBadge>
                    </div>

                    <div className="relative mt-5 grid grid-cols-7 gap-2">
                        {weeklyPoints.map((day, index) => (
                            <div key={day.key} className="flex min-w-0 flex-col items-center gap-2">
                                <div className="flex h-32 w-full max-w-10 items-end justify-center rounded-t-full rounded-b-xl border-2 border-slate-800 bg-white p-1 dark:border-bone-200/70 dark:bg-void-800">
                                    <div
                                        style={{ height: `${Math.max(10, (day.points / maxWeeklyPoints) * 100)}%` }}
                                        className={`w-full rounded-t-full rounded-b-md ${index % 3 === 0 ? 'bg-violet-400' : index % 3 === 1 ? 'bg-rose-300' : 'bg-emerald-300'}`}
                                    />
                                </div>
                                <div className="text-center">
                                    <div className="text-sm font-black text-slate-800 dark:text-bone-100">{day.points}</div>
                                    <div className="text-[10px] font-black uppercase text-slate-400">{day.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <section className={`relative rounded-[28px] bg-white p-4 ${inkBorder} ${softPopShadow} dark:bg-void-900/90 sm:p-5`}>
                    <div className="absolute -top-5 right-5">
                        <IconBadge className="bg-rose-400 text-white">
                            <Gift size={20} strokeWidth={2.7} />
                        </IconBadge>
                    </div>
                    <div className="pr-12">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">Prize shelf</div>
                        <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-bone-100">Set the treats</h2>
                    </div>

                    <form className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_86px_auto]" onSubmit={handleRewardSubmit}>
                        <input
                            type="text"
                            value={rewardForm.name}
                            onChange={(event) => setRewardForm((prev) => ({ ...prev, name: event.target.value }))}
                            placeholder="Iced coffee, game hour, snacks"
                            className={inputClass}
                        />
                        <input
                            type="number"
                            min="1"
                            value={rewardForm.costPoints}
                            onChange={(event) => setRewardForm((prev) => ({ ...prev, costPoints: event.target.value }))}
                            className={inputClass}
                            aria-label="Reward cost"
                        />
                        <button
                            type="submit"
                            disabled={isSaving || !rewardForm.name.trim()}
                            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-slate-800 bg-rose-400 px-4 py-2 text-sm font-black text-white shadow-[4px_4px_0_#1E293B] ${popMotion} hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-rose-500 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none`}
                        >
                            <Plus size={15} strokeWidth={2.7} />
                            Add
                        </button>
                    </form>

                    <div className="mt-3 flex gap-2">
                        {rewardColors.map((color) => (
                            <button
                                key={color.id}
                                type="button"
                                onClick={() => setRewardForm((prev) => ({ ...prev, color: color.id }))}
                                className={`h-9 w-9 rounded-full border-2 border-slate-800 ${color.className} ${popMotion} ${
                                    rewardForm.color === color.id ? 'shadow-[3px_3px_0_#1E293B]' : ''
                                }`}
                                title={color.label}
                                aria-label={color.label}
                            />
                        ))}
                    </div>

                    <div className="mt-5 space-y-3 border-t-4 border-dashed border-slate-800 pt-4 dark:border-bone-200/70">
                        {activeRewards.length === 0 && (
                            <div className={`rounded-[22px] border-2 border-dashed border-slate-800 bg-slate-50 p-4 text-sm font-semibold text-slate-500 dark:border-white/20 dark:bg-void-800 dark:text-bone-200/60`}>
                                The shelf is empty. Add one tiny prize.
                            </div>
                        )}
                        {sortedRewards.map((reward, index) => {
                            const color = getRewardColor(reward.color);
                            return (
                                <div
                                    key={reward.id}
                                    className={`relative overflow-hidden rounded-[22px] border-2 border-slate-800 p-3 ${color.className} ${color.shadow} ${popMotion} hover:-rotate-1 hover:scale-[1.01] dark:border-bone-200/70 ${
                                        index % 2 === 0 ? 'rotate-[-0.5deg]' : 'rotate-[0.5deg]'
                                    }`}
                                >
                                    <div className={`absolute bottom-0 left-0 top-0 w-3 ${color.sticker}`} />
                                    <div className="ml-3 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-base font-black">{reward.name}</div>
                                            <div className="text-xs font-black opacity-70">{reward.cost_points} point ticket</div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handlePurchaseReward(reward.id)}
                                                disabled={isSaving || balance < reward.cost_points}
                                                className="inline-flex min-h-10 items-center gap-1 rounded-full border-2 border-slate-800 bg-white px-3 py-2 text-xs font-black text-slate-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-45"
                                            >
                                                <WalletCards size={14} strokeWidth={2.7} />
                                                Buy
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => archiveReward(reward.id)}
                                                className="grid h-10 w-10 place-items-center rounded-full border-2 border-slate-800 bg-white text-slate-600 transition hover:bg-rose-100 hover:text-slate-900"
                                                title="Archive reward"
                                            >
                                                <Trash2 size={14} strokeWidth={2.7} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className={`relative overflow-hidden rounded-[28px] bg-[#F7FCFB] p-4 ${inkBorder} ${softPopShadow} dark:bg-void-900/90 sm:p-5`}>
                    <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full border-2 border-slate-800 bg-emerald-200" />
                    <div className="relative flex items-start justify-between gap-3">
                        <div>
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">Ticket pocket</div>
                            <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-bone-100">Inventory</h2>
                        </div>
                        <IconBadge className="bg-emerald-400 text-slate-950">
                            <PackageCheck size={20} strokeWidth={2.7} />
                        </IconBadge>
                    </div>

                    <div className="relative mt-5 space-y-3">
                        {availableInventory.length === 0 && (
                            <div className="rounded-[22px] border-2 border-dashed border-slate-800 bg-white/80 p-4 text-sm font-semibold text-slate-500 dark:border-white/20 dark:bg-void-800 dark:text-bone-200/60">
                                Bought rewards become little tickets here.
                            </div>
                        )}
                        {availableInventory.map((item) => (
                            <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-[22px] border-2 border-slate-800 bg-white text-teal-950 shadow-[5px_5px_0_#99F6E4] dark:border-bone-200/70 dark:bg-void-800 dark:text-teal-100">
                                <div className="min-w-0 border-r-2 border-dashed border-slate-800 p-3 dark:border-bone-200/70">
                                    <div className="truncate text-base font-black">{item.reward_name}</div>
                                    <div className="text-xs font-bold opacity-65">Printed {formatDateTime(item.purchased_at)}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleUseInventoryItem(item.id)}
                                    className={`flex min-h-16 min-w-20 flex-col items-center justify-center gap-1 bg-emerald-300 px-3 text-xs font-black text-slate-950 ${popMotion} hover:bg-amber-300`}
                                >
                                    <Check size={15} strokeWidth={2.7} />
                                    Use
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                <section className={`rounded-[28px] bg-white p-4 ${inkBorder} ${softPopShadow} dark:bg-void-900/90 sm:p-5`}>
                    <div className="flex items-center gap-3">
                        <IconBadge className="bg-amber-300 text-slate-950">
                            <Archive size={18} strokeWidth={2.7} />
                        </IconBadge>
                        <h2 className="text-xl font-black text-slate-950 dark:text-bone-100">Recent stamps</h2>
                    </div>
                    <div className="mt-4 space-y-2">
                        {!isLoaded && <div className="text-sm font-semibold text-slate-500">Loading sessions...</div>}
                        {isLoaded && recentSessions.length === 0 && (
                            <div className="rounded-[20px] border-2 border-dashed border-slate-800 p-4 text-sm font-semibold text-slate-500 dark:border-white/20 dark:text-bone-200/60">
                                No stamps yet.
                            </div>
                        )}
                        {recentSessions.map((session) => (
                            <div key={session.id} className="rounded-[22px] border-2 border-slate-800 bg-[#fffdf8] p-3 dark:border-bone-200/70 dark:bg-void-800">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="font-black text-slate-900 dark:text-bone-100">{session.session_type}</div>
                                        <div className="text-xs font-bold text-slate-500 dark:text-bone-200/60">
                                            {formatDateTime(session.started_at)} - {session.duration_minutes} min
                                        </div>
                                        {session.note && <div className="mt-1 truncate text-sm font-semibold text-slate-600 dark:text-bone-200/70">{session.note}</div>}
                                    </div>
                                    <div className="rounded-full border-2 border-slate-800 bg-emerald-200 px-3 py-1 text-sm font-black text-emerald-950">
                                        +{session.points_earned}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className={`rounded-[28px] bg-[#fffdf8] p-4 ${inkBorder} ${softPopShadow} dark:bg-void-900/90 sm:p-5`}>
                    <div className="flex items-center gap-3">
                        <IconBadge className="bg-violet-500 text-white">
                            <History size={18} strokeWidth={2.7} />
                        </IconBadge>
                        <h2 className="text-xl font-black text-slate-950 dark:text-bone-100">Point receipt</h2>
                    </div>
                    <div className="mt-4 overflow-hidden rounded-[22px] border-2 border-dashed border-slate-800 bg-white dark:border-bone-200/70 dark:bg-void-800">
                        {recentTransactions.length === 0 && (
                            <div className="p-4 text-sm font-semibold text-slate-500 dark:text-bone-200/60">The receipt is blank.</div>
                        )}
                        {recentTransactions.map((transaction) => (
                            <div key={transaction.id} className="flex items-center justify-between gap-3 border-b-2 border-dashed border-slate-200 px-3 py-3 last:border-b-0 dark:border-white/10">
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-black text-slate-800 dark:text-bone-100">{transaction.title}</div>
                                    <div className="text-xs font-semibold text-slate-500 dark:text-bone-200/60">{formatDateTime(transaction.created_at)}</div>
                                </div>
                                <div className={`rounded-full border-2 border-slate-800 px-2 py-1 text-sm font-black ${
                                    transaction.points > 0
                                        ? 'bg-emerald-200 text-emerald-950'
                                        : transaction.points < 0
                                            ? 'bg-rose-200 text-rose-950'
                                            : 'bg-slate-100 text-slate-600'
                                }`}>
                                    {transaction.points > 0 ? `+${transaction.points}` : transaction.points}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Focus;
