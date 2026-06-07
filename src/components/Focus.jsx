import React, { useMemo, useState } from 'react';
import {
    BadgeCheck,
    BookMarked,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Check,
    CircleAlert,
    Crosshair,
    Footprints,
    Gift,
    History,
    Flag,
    LockKeyhole,
    Map as MapIcon,
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
    {
        id: 'violet',
        label: 'Violet',
        className: 'bg-violet-100 text-violet-950',
        sticker: 'bg-violet-300',
        shadow: 'shadow-[5px_5px_0_#C4B5FD]',
    },
    {
        id: 'sun',
        label: 'Sun',
        className: 'bg-amber-100 text-amber-950',
        sticker: 'bg-amber-300',
        shadow: 'shadow-[5px_5px_0_#FCD34D]',
    },
];

const baseRoadmapNodes = [
    { points: 0, label: 'Gate', unlock: 'Arcade open', color: 'bg-emerald-300', shape: 'rounded-full' },
    { points: 25, label: 'Trail', unlock: 'Steady rhythm', color: 'bg-sky-300', shape: 'rounded-t-full rounded-b-2xl' },
    { points: 50, label: 'Chest', unlock: '+5 milestone', color: 'bg-amber-300', shape: 'rounded-[18px]' },
    { points: 100, label: 'Tower', unlock: '+5 tier II', color: 'bg-rose-300', shape: 'rounded-tl-3xl rounded-tr-xl rounded-br-3xl rounded-bl-xl' },
    { points: 150, label: 'Vault', unlock: 'Legend shelf', color: 'bg-violet-300', shape: 'rounded-full' },
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

const getHistoryDayKey = (value) => {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return 'unknown';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
};

const getDayStart = (date) => {
    const nextDate = new Date(date);
    nextDate.setHours(0, 0, 0, 0);
    return nextDate;
};

const parseHistoryDayKey = (key) => {
    const [year, month, day] = String(key).split('-').map(Number);
    if (!year || !month || !day) return new Date();
    return new Date(year, month - 1, day);
};

const shiftHistoryDayKey = (key, amount) => {
    const date = parseHistoryDayKey(key);
    date.setDate(date.getDate() + amount);
    return getHistoryDayKey(date);
};

const formatHistoryDayLabel = (value) => {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return 'Unknown day';

    const today = getDayStart(new Date());
    const target = getDayStart(date);
    const dayDelta = Math.round((today - target) / 86400000);
    if (dayDelta === 0) return 'Today';
    if (dayDelta === 1) return 'Yesterday';

    return date.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
};

const formatHistoryDate = (value) => (
    value
        ? new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
        : ''
);

const formatTimeOnly = (value) => (
    value
        ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : ''
);

const createEmptyHistoryDay = (key) => {
    const date = parseHistoryDayKey(key);
    return {
        key,
        dateValue: date.toISOString(),
        label: formatHistoryDayLabel(date),
        dateLabel: formatHistoryDate(date),
        stamps: [],
        transactions: [],
        earned: 0,
        spent: 0,
        net: 0,
    };
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
        activeActions,
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
        addAction,
        logAction,
        archiveAction,
        addReward,
        purchaseReward,
        useInventoryItem: markInventoryItemUsed,
        archiveReward,
        isLoaded,
        actionStorageReady,
        isCheckingActionStorage,
        checkActionStorage,
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
    const [actionForm, setActionForm] = useState({
        name: '',
        points: 1,
        color: 'mint',
    });
    const [message, setMessage] = useState('');
    const [messageTone, setMessageTone] = useState('success');
    const [isSaving, setIsSaving] = useState(false);
    const [selectedHistoryKey, setSelectedHistoryKey] = useState(getHistoryDayKey(new Date()));

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

    const sortedRewards = useMemo(() => (
        [...activeRewards].sort((left, right) => {
            if (right.cost_points !== left.cost_points) return right.cost_points - left.cost_points;
            return new Date(left.created_at || 0) - new Date(right.created_at || 0);
        })
    ), [activeRewards]);
    const dailyHistory = useMemo(() => {
        const groups = new Map();

        const ensureGroup = (value) => {
            const key = getHistoryDayKey(value);
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    dateValue: value,
                    label: formatHistoryDayLabel(value),
                    dateLabel: formatHistoryDate(value),
                    stamps: [],
                    transactions: [],
                    earned: 0,
                    spent: 0,
                    net: 0,
                });
            }
            return groups.get(key);
        };

        sessions.forEach((session) => {
            const group = ensureGroup(session.started_at || session.created_at);
            group.stamps.push(session);
        });

        transactions.forEach((transaction) => {
            const group = ensureGroup(transaction.created_at);
            group.transactions.push(transaction);
            if (transaction.points > 0) group.earned += transaction.points;
            if (transaction.points < 0) group.spent += Math.abs(transaction.points);
            group.net += transaction.points;
        });

        return [...groups.values()]
            .map((group) => ({
                ...group,
                stamps: [...group.stamps].sort((left, right) => new Date(right.started_at || 0) - new Date(left.started_at || 0)),
                transactions: [...group.transactions].sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0)),
            }))
            .sort((left, right) => new Date(right.dateValue || 0) - new Date(left.dateValue || 0));
    }, [sessions, transactions]);
    const dailyHistoryByKey = useMemo(() => (
        new Map(dailyHistory.map((day) => [day.key, day]))
    ), [dailyHistory]);
    const selectedHistoryDay = dailyHistoryByKey.get(selectedHistoryKey) || createEmptyHistoryDay(selectedHistoryKey);
    const selectedHistoryDate = parseHistoryDayKey(selectedHistoryKey);
    const isSelectedHistoryTodayOrLater = getDayStart(selectedHistoryDate) >= getDayStart(new Date());
    const selectedAddedEntries = selectedHistoryDay.transactions.filter((transaction) => transaction.points > 0);
    const selectedUsedEntries = selectedHistoryDay.transactions.filter((transaction) => transaction.points <= 0);
    const roadmapNodes = useMemo(() => {
        const nextTier = Math.max(
            200,
            Math.ceil((lifetimeSessionPoints + 1) / milestoneInterval) * milestoneInterval
        );
        return lifetimeSessionPoints >= 150
            ? [
                ...baseRoadmapNodes,
                {
                    points: nextTier,
                    label: 'Next',
                    unlock: `+${milestoneBonus} bonus`,
                    color: 'bg-emerald-300',
                    shape: 'rounded-[18px]',
                },
            ]
            : baseRoadmapNodes;
    }, [lifetimeSessionPoints, milestoneBonus, milestoneInterval]);
    const unlockedRoadmapCount = roadmapNodes.filter((node) => lifetimeSessionPoints >= node.points).length;
    const isActionFormDisabled = isSaving || isCheckingActionStorage || !actionStorageReady;
    const showMessage = (text, tone = 'success') => {
        setMessage(text);
        setMessageTone(tone);
    };
    const clearMessage = () => setMessage('');

    const handleSessionSubmit = async (event) => {
        event.preventDefault();
        clearMessage();
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
            showMessage('Stamped. Points are in your pocket.');
        } catch (error) {
            showMessage(error.message || 'Could not log that session.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRewardSubmit = async (event) => {
        event.preventDefault();
        if (!rewardForm.name.trim()) return;
        clearMessage();
        setIsSaving(true);
        try {
            await addReward({
                name: rewardForm.name.trim(),
                costPoints: Number(rewardForm.costPoints),
                color: rewardForm.color,
            });
            setRewardForm({ name: '', costPoints: 3, color: 'mint' });
            showMessage('Prize added to the shelf.');
        } catch (error) {
            showMessage(error.message || 'Could not add that reward.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleActionSubmit = async (event) => {
        event.preventDefault();
        if (!actionForm.name.trim()) return;
        clearMessage();
        setIsSaving(true);
        try {
            await addAction({
                name: actionForm.name.trim(),
                points: Number(actionForm.points),
                color: actionForm.color,
            });
            setActionForm({ name: '', points: 1, color: 'mint' });
            showMessage('Action stamp added.');
        } catch (error) {
            showMessage(error.message || 'Could not add that action.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogAction = async (actionId) => {
        clearMessage();
        try {
            await logAction(actionId);
            showMessage('Action stamped. Points added.');
        } catch (error) {
            showMessage(error.message || 'Could not log that action.', 'error');
        }
    };

    const handleCheckActionStorage = async () => {
        clearMessage();
        try {
            await checkActionStorage();
            showMessage('Custom action stamps are connected.');
        } catch (error) {
            showMessage(error.message || 'Could not connect custom action stamps yet.', 'error');
        }
    };

    const handlePurchaseReward = async (rewardId) => {
        clearMessage();
        try {
            await purchaseReward(rewardId);
            showMessage('Ticket printed. Check your inventory.');
        } catch (error) {
            showMessage(error.message || 'Could not purchase that reward.', 'error');
        }
    };

    const handleUseInventoryItem = async (inventoryId) => {
        clearMessage();
        try {
            await markInventoryItemUsed(inventoryId);
            showMessage('Ticket used. Enjoy it guilt-free.');
        } catch (error) {
            showMessage(error.message || 'Could not use that reward.', 'error');
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
                            <div className={`mt-4 inline-flex max-w-full items-center gap-2 rounded-full px-3 py-2 text-sm font-black ${inkBorder} ${
                                messageTone === 'error'
                                    ? 'bg-rose-100 text-rose-950'
                                    : 'bg-emerald-100 text-emerald-950'
                            }`}>
                                {messageTone === 'error'
                                    ? <CircleAlert size={15} strokeWidth={2.7} />
                                    : <Check size={15} strokeWidth={2.7} />}
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
                        <div className={`col-span-2 overflow-hidden rounded-[24px] bg-[#FFFDF8] p-3 text-slate-900 ${inkBorder} ${softPopShadow} dark:bg-void-800 dark:text-bone-100`}>
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2 text-sm font-black">
                                    <IconBadge className="h-8 w-8 rounded-[14px] bg-sky-300 text-slate-950">
                                        <MapIcon size={15} strokeWidth={2.7} />
                                    </IconBadge>
                                    <span className="truncate">Roadmap</span>
                                </div>
                                <span className="rounded-full border-2 border-slate-800 bg-white px-2 py-1 text-xs font-black text-slate-900">
                                    {unlockedRoadmapCount}/{roadmapNodes.length}
                                </span>
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                                {roadmapNodes.map((node, index) => {
                                    const isUnlocked = lifetimeSessionPoints >= node.points;
                                    const isNext = !isUnlocked && roadmapNodes.find((item) => lifetimeSessionPoints < item.points)?.points === node.points;
                                    return (
                                        <div key={`${node.label}-${node.points}`} className="relative min-w-0">
                                            {index > 0 && (
                                                <div className={`absolute -left-2 top-6 hidden h-1 w-4 border-y-2 border-slate-800 sm:block ${
                                                    isUnlocked ? 'bg-violet-400' : 'bg-slate-100 dark:bg-void-700'
                                                }`} />
                                            )}
                                            <div className={`relative mx-auto grid h-12 w-12 place-items-center border-2 border-slate-800 text-slate-950 ${node.shape} ${
                                                isUnlocked ? `${node.color} shadow-[3px_3px_0_#1E293B]` : 'bg-slate-100 text-slate-400 dark:bg-void-700 dark:text-bone-200/45'
                                            } ${isNext ? 'ring-4 ring-amber-200' : ''}`}>
                                                {isUnlocked
                                                    ? <Flag size={17} strokeWidth={2.8} />
                                                    : <LockKeyhole size={16} strokeWidth={2.8} />}
                                            </div>
                                            <div className="mt-2 text-center">
                                                <div className={`truncate text-[11px] font-black ${isUnlocked ? 'text-slate-900 dark:text-bone-100' : 'text-slate-400'}`}>
                                                    {node.label}
                                                </div>
                                                <div className="text-[10px] font-black text-slate-400">{node.points} pts</div>
                                                <div className="mt-1 hidden truncate text-[10px] font-bold text-slate-500 sm:block">{node.unlock}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
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

                    <div className="mt-5 border-t-4 border-dashed border-slate-800 pt-4 dark:border-bone-200/70">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">Action stamps</div>
                                <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-bone-100">Custom ways to earn</h3>
                            </div>
                            <IconBadge className="h-9 w-9 rounded-[16px] bg-violet-500 text-white">
                                <BadgeCheck size={18} strokeWidth={2.7} />
                            </IconBadge>
                        </div>

                        {isCheckingActionStorage && !actionStorageReady && (
                            <div className={`relative mt-4 rounded-[20px] bg-violet-100 px-4 py-3 text-sm font-black text-violet-950 ${inkBorder}`}>
                                Checking custom action stamps...
                            </div>
                        )}

                        {!isCheckingActionStorage && !actionStorageReady && (
                            <div className={`relative mt-4 flex flex-col gap-3 rounded-[20px] bg-amber-100 px-4 py-3 text-sm font-black text-amber-950 ${inkBorder} sm:flex-row sm:items-center sm:justify-between`}>
                                <span>Run the focus_actions SQL snippet to unlock custom action stamps.</span>
                                <button
                                    type="button"
                                    onClick={handleCheckActionStorage}
                                    className={`inline-flex min-h-9 items-center justify-center rounded-full border-2 border-slate-800 bg-white px-3 py-1 text-xs font-black text-slate-900 ${popMotion} hover:bg-amber-200`}
                                >
                                    Check again
                                </button>
                            </div>
                        )}

                        <form className="relative mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_86px_auto]" onSubmit={handleActionSubmit}>
                            <input
                                type="text"
                                value={actionForm.name}
                                onChange={(event) => setActionForm((prev) => ({ ...prev, name: event.target.value }))}
                                placeholder="Complete night routine, wake before 8, exercise"
                                disabled={!actionStorageReady}
                                className={inputClass}
                            />
                            <input
                                type="number"
                                min="1"
                                value={actionForm.points}
                                onChange={(event) => setActionForm((prev) => ({ ...prev, points: event.target.value }))}
                                disabled={!actionStorageReady}
                                className={inputClass}
                                aria-label="Action points"
                            />
                            <button
                                type="submit"
                                disabled={isActionFormDisabled || !actionForm.name.trim()}
                                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-slate-800 bg-violet-500 px-4 py-2 text-sm font-black text-white shadow-[4px_4px_0_#1E293B] ${popMotion} hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-violet-600 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none`}
                            >
                                <Plus size={15} strokeWidth={2.7} />
                                Add
                            </button>
                        </form>

                        <div className="relative mt-3 flex gap-2">
                            {rewardColors.map((color) => (
                                <button
                                    key={color.id}
                                    type="button"
                                    onClick={() => setActionForm((prev) => ({ ...prev, color: color.id }))}
                                    disabled={!actionStorageReady}
                                    className={`h-9 w-9 rounded-full border-2 border-slate-800 ${color.className} ${popMotion} ${
                                        actionForm.color === color.id ? 'shadow-[3px_3px_0_#1E293B]' : ''
                                    } disabled:cursor-not-allowed disabled:opacity-45`}
                                    title={color.label}
                                    aria-label={color.label}
                                />
                            ))}
                        </div>

                        <div className="relative mt-4 grid gap-3">
                            {activeActions.length === 0 && (
                                <div className="rounded-[20px] border-2 border-dashed border-slate-800 bg-white/80 p-4 text-sm font-semibold text-slate-500 dark:border-white/20 dark:bg-void-800 dark:text-bone-200/60">
                                    {actionStorageReady ? 'Add your first custom action stamp.' : 'Custom action stamps are waiting for the Supabase table.'}
                                </div>
                            )}
                            {activeActions.map((action, index) => {
                                const color = getRewardColor(action.color);
                                return (
                                    <div
                                        key={action.id}
                                        className={`relative overflow-hidden rounded-[22px] border-2 border-slate-800 p-3 ${color.className} ${color.shadow} ${popMotion} hover:-rotate-1 hover:scale-[1.01] dark:border-bone-200/70 ${
                                            index % 2 === 0 ? 'rotate-[-0.4deg]' : 'rotate-[0.4deg]'
                                        }`}
                                    >
                                        <div className={`absolute bottom-0 left-0 top-0 w-3 ${color.sticker}`} />
                                        <div className="ml-3 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-base font-black">{action.name}</div>
                                                <div className="text-xs font-black opacity-70">+{action.points} points</div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleLogAction(action.id)}
                                                    disabled={isSaving}
                                                    className="inline-flex min-h-10 items-center gap-1 rounded-full border-2 border-slate-800 bg-white px-3 py-2 text-xs font-black text-slate-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-45"
                                                >
                                                    <BadgeCheck size={14} strokeWidth={2.7} />
                                                    Log
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => archiveAction(action.id)}
                                                    className="grid h-10 w-10 place-items-center rounded-full border-2 border-slate-800 bg-white text-slate-600 transition hover:bg-rose-100 hover:text-slate-900"
                                                    title="Archive action"
                                                >
                                                    <Trash2 size={14} strokeWidth={2.7} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
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
                                                aria-label={`Buy ${reward.name} for ${reward.cost_points} points`}
                                                className="inline-flex min-h-10 items-center gap-1 rounded-full border-2 border-slate-800 bg-white px-3 py-2 text-xs font-black text-slate-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-45"
                                            >
                                                <WalletCards size={14} strokeWidth={2.7} />
                                                {reward.cost_points} pts
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
                        {availableInventory.map((item) => {
                            const color = getRewardColor(item.reward_color);
                            return (
                                <div key={item.id} className={`grid grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-[22px] border-2 border-slate-800 ${color.className} ${color.shadow} dark:border-bone-200/70`}>
                                    <div className="grid min-w-0 grid-cols-[12px_minmax(0,1fr)]">
                                        <div className={color.sticker} />
                                        <div className="min-w-0 border-r-2 border-dashed border-slate-800 p-3 dark:border-bone-200/70">
                                            <div className="truncate text-base font-black">{item.reward_name}</div>
                                            <div className="text-xs font-bold opacity-65">Printed {formatDateTime(item.purchased_at)}</div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleUseInventoryItem(item.id)}
                                        className={`flex min-h-16 min-w-20 flex-col items-center justify-center gap-1 bg-white/80 px-3 text-xs font-black text-slate-950 ${popMotion} hover:bg-amber-300`}
                                    >
                                        <Check size={15} strokeWidth={2.7} />
                                        Use
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>

            <section className={`mt-6 rounded-[28px] bg-[#fffdf8] p-4 ${inkBorder} ${softPopShadow} dark:bg-void-900/90 sm:p-5`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <IconBadge className="bg-violet-500 text-white">
                            <History size={18} strokeWidth={2.7} />
                        </IconBadge>
                        <div className="min-w-0">
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">Ledger</div>
                            <h2 className="text-xl font-black text-slate-950 dark:text-bone-100">Daily history</h2>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border-2 border-slate-800 bg-amber-300 px-3 py-1 text-xs font-black text-slate-950">
                            {dailyHistory.length} days
                        </span>
                        <div className="flex items-center gap-2 rounded-full border-2 border-slate-800 bg-white p-1 dark:border-bone-200/70 dark:bg-void-800">
                            <button
                                type="button"
                                onClick={() => setSelectedHistoryKey((prev) => shiftHistoryDayKey(prev, -1))}
                                className={`grid h-9 w-9 place-items-center rounded-full border-2 border-slate-800 bg-sky-100 text-slate-900 ${popMotion} hover:bg-sky-300`}
                                aria-label="Previous day"
                            >
                                <ChevronLeft size={17} strokeWidth={2.8} />
                            </button>
                            <label className="relative flex min-h-9 items-center gap-2 rounded-full border-2 border-slate-800 bg-[#fffdf8] px-3 text-xs font-black text-slate-800">
                                <CalendarDays size={15} strokeWidth={2.7} />
                                <input
                                    type="date"
                                    value={selectedHistoryKey}
                                    onChange={(event) => setSelectedHistoryKey(event.target.value || getHistoryDayKey(new Date()))}
                                    className="w-[8.25rem] bg-transparent text-xs font-black uppercase text-slate-800 outline-none"
                                    aria-label="Select history date"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={() => setSelectedHistoryKey((prev) => shiftHistoryDayKey(prev, 1))}
                                disabled={isSelectedHistoryTodayOrLater}
                                className={`grid h-9 w-9 place-items-center rounded-full border-2 border-slate-800 bg-sky-100 text-slate-900 ${popMotion} hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
                                aria-label="Next day"
                            >
                                <ChevronRight size={17} strokeWidth={2.8} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-4">
                    {!isLoaded && <div className="text-sm font-semibold text-slate-500">Loading history...</div>}
                    {isLoaded && (
                        <div
                            key={selectedHistoryDay.key}
                            className="relative overflow-hidden rounded-[24px] border-2 border-slate-800 bg-white p-3 shadow-[5px_5px_0_#C4B5FD] dark:border-bone-200/70 dark:bg-void-800 sm:p-4"
                        >
                            <div className="absolute -right-8 -top-10 h-20 w-20 rounded-full bg-emerald-200/70" />
                            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="rounded-full border-2 border-slate-800 bg-violet-500 px-3 py-1 text-sm font-black text-white">
                                            {selectedHistoryDay.label}
                                        </div>
                                        <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{selectedHistoryDay.dateLabel}</div>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <span className="rounded-full border-2 border-slate-800 bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-950">
                                            +{selectedHistoryDay.earned} earned
                                        </span>
                                        <span className="rounded-full border-2 border-slate-800 bg-rose-100 px-3 py-1 text-xs font-black text-rose-950">
                                            -{selectedHistoryDay.spent} spent
                                        </span>
                                        <span className={`rounded-full border-2 border-slate-800 px-3 py-1 text-xs font-black ${
                                            selectedHistoryDay.net >= 0 ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-700'
                                        }`}>
                                            {selectedHistoryDay.net >= 0 ? `+${selectedHistoryDay.net}` : selectedHistoryDay.net} net
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-center sm:min-w-36">
                                    <div className="rounded-[18px] border-2 border-slate-800 bg-[#fffdf8] px-3 py-2">
                                        <div className="text-lg font-black text-slate-950 dark:text-bone-100">{selectedAddedEntries.length}</div>
                                        <div className="text-[10px] font-black uppercase text-slate-400">added</div>
                                    </div>
                                    <div className="rounded-[18px] border-2 border-slate-800 bg-[#fffdf8] px-3 py-2">
                                        <div className="text-lg font-black text-slate-950 dark:text-bone-100">{selectedUsedEntries.length}</div>
                                        <div className="text-[10px] font-black uppercase text-slate-400">used</div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative mt-4 grid gap-3 lg:grid-cols-2">
                                <div className="max-h-80 overflow-y-auto rounded-[20px] border-2 border-dashed border-slate-800 bg-[#F7FFF9] p-3 dark:border-white/20 dark:bg-void-900/60">
                                    <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                                        <Plus size={14} strokeWidth={2.7} />
                                        Points added
                                    </div>
                                    <div className="space-y-2">
                                        {selectedAddedEntries.length === 0 && (
                                            <div className="text-sm font-semibold text-slate-400">No added points.</div>
                                        )}
                                        {selectedAddedEntries.map((transaction) => (
                                            <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-[16px] border-2 border-slate-800 bg-white px-3 py-2 dark:border-white/15 dark:bg-void-800">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-black text-slate-900 dark:text-bone-100">{transaction.title}</div>
                                                    <div className="text-xs font-semibold text-slate-500 dark:text-bone-200/60">{formatTimeOnly(transaction.created_at)}</div>
                                                </div>
                                                <div className="rounded-full border-2 border-slate-800 bg-emerald-200 px-2 py-1 text-xs font-black text-emerald-950">
                                                    +{transaction.points}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="max-h-80 overflow-y-auto rounded-[20px] border-2 border-dashed border-slate-800 bg-[#FFF7F9] p-3 dark:border-white/20 dark:bg-void-900/60">
                                    <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                                        <Gift size={14} strokeWidth={2.7} />
                                        Points used
                                    </div>
                                    <div className="space-y-2">
                                        {selectedUsedEntries.length === 0 && (
                                            <div className="text-sm font-semibold text-slate-400">No used points.</div>
                                        )}
                                        {selectedUsedEntries.map((transaction) => (
                                            <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-[16px] border-2 border-slate-800 bg-white px-3 py-2 dark:border-white/15 dark:bg-void-800">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-black text-slate-800 dark:text-bone-100">{transaction.title}</div>
                                                    <div className="text-xs font-semibold text-slate-500 dark:text-bone-200/60">{formatTimeOnly(transaction.created_at)}</div>
                                                </div>
                                                <div className={`rounded-full border-2 border-slate-800 px-2 py-1 text-xs font-black ${
                                                    transaction.points < 0
                                                        ? 'bg-rose-200 text-rose-950'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {transaction.points}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Focus;
