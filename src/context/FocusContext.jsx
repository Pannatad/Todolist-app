import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { toLocalDateKey } from '../utils/scheduleOccurrences';

const FocusContext = createContext();

const STORAGE_KEY = 'focus-game-guest';
const STORAGE_BACKUP_KEY = `${STORAGE_KEY}:backup`;
const ACTION_STORAGE_READY_KEY = 'focus-actions-table-ready';
const FOCUS_DATA_KEYS = ['sessions', 'actions', 'rewards', 'inventory', 'transactions'];
const FOCUS_ACTIONS_MISSING_MESSAGE = 'Run the focus_actions SQL snippet to enable custom action stamps.';
const FOCUS_TRANSACTION_KIND_MESSAGE = 'Run the focus_point_transactions kind SQL snippet to save custom action points.';
const MILESTONE_INTERVAL = 50;
const MILESTONE_BONUS = 5;
const DAILY_MILESTONE_INTERVAL = 10;
const DAILY_MILESTONE_BONUS = 2;
const BASE_EARNING_KINDS = new Set(['session', 'custom_action']);

const normalizeSession = (session) => ({
    ...session,
    duration_minutes: Number(session?.duration_minutes) || 0,
    points_earned: Number(session?.points_earned) || 0,
    note: session?.note || '',
});

const normalizeReward = (reward) => ({
    ...reward,
    cost_points: Number(reward?.cost_points) || 1,
    color: reward?.color || 'mint',
    archived: reward?.archived === true,
});

const normalizeAction = (action) => ({
    ...action,
    points: Number(action?.points) || 1,
    color: action?.color || 'mint',
    archived: action?.archived === true,
});

const normalizeInventoryItem = (item) => ({
    ...item,
    cost_points: Number(item?.cost_points) || 0,
    reward_color: item?.reward_color || item?.rewardColor || 'mint',
    used_at: item?.used_at || null,
});

const normalizeTransaction = (transaction) => ({
    ...transaction,
    points: Number(transaction?.points) || 0,
    metadata: transaction?.metadata || {},
});

const getSessionPoints = (durationMinutes) => Math.max(0, Math.floor((Number(durationMinutes) || 0) / 25));

const sumBaseEarnedPoints = (transactions, dateKey = null) => (
    transactions.reduce((total, transaction) => {
        if (!BASE_EARNING_KINDS.has(transaction.kind) || transaction.points <= 0) return total;
        if (dateKey && toLocalDateKey(transaction.created_at) !== dateKey) return total;
        return total + transaction.points;
    }, 0)
);

const getNewMilestoneBonuses = (previousLifetimePoints, nextLifetimePoints, transactions) => {
    const claimedMilestones = new Set(
        transactions
            .filter((transaction) => transaction.kind === 'milestone_bonus')
            .filter((transaction) => transaction.metadata?.scope !== 'daily')
            .map((transaction) => Number(transaction.metadata?.milestone))
            .filter(Boolean)
    );

    const bonuses = [];
    for (let milestone = MILESTONE_INTERVAL; milestone <= nextLifetimePoints; milestone += MILESTONE_INTERVAL) {
        if (milestone > previousLifetimePoints && !claimedMilestones.has(milestone)) {
            bonuses.push(milestone);
        }
    }

    return bonuses;
};

const getNewDailyMilestoneBonuses = (previousDailyPoints, nextDailyPoints, dateKey, transactions) => {
    const claimedDailyMilestones = new Set(
        transactions
            .filter((transaction) => transaction.kind === 'milestone_bonus')
            .filter((transaction) => transaction.metadata?.scope === 'daily')
            .filter((transaction) => transaction.metadata?.date === dateKey)
            .map((transaction) => Number(transaction.metadata?.milestone))
            .filter(Boolean)
    );

    const bonuses = [];
    for (let milestone = DAILY_MILESTONE_INTERVAL; milestone <= nextDailyPoints; milestone += DAILY_MILESTONE_INTERVAL) {
        if (milestone > previousDailyPoints && !claimedDailyMilestones.has(milestone)) {
            bonuses.push(milestone);
        }
    }

    return bonuses;
};

const sortNewestFirst = (items) => (
    [...items].sort((left, right) => {
        const rightDate = right.created_at || right.started_at || right.purchased_at || 0;
        const leftDate = left.created_at || left.started_at || left.purchased_at || 0;
        return new Date(rightDate) - new Date(leftDate);
    })
);

const parseStoredFocusData = (raw) => {
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const hasFocusData = (payload) => (
    payload && FOCUS_DATA_KEYS.some((key) => Array.isArray(payload[key]) && payload[key].length > 0)
);

const getStoredFocusData = () => {
    const current = parseStoredFocusData(localStorage.getItem(STORAGE_KEY));
    if (hasFocusData(current)) return current;

    const backup = parseStoredFocusData(localStorage.getItem(STORAGE_BACKUP_KEY));
    if (hasFocusData(backup)) return backup;

    return current;
};

const isMissingFocusActionsTable = (error) => (
    error?.code === 'PGRST205' || error?.message?.includes('focus_actions')
);

const isTransactionKindConstraintError = (error) => (
    error?.code === '23514'
    && (
        error?.message?.includes('focus_point_transactions')
        || error?.message?.includes('focus_point_transactions_kind')
        || error?.message?.includes('check constraint')
    )
);

const isActionStorageMarkedReady = () => localStorage.getItem(ACTION_STORAGE_READY_KEY) === 'true';
const markActionStorageReady = (isReady) => {
    if (isReady) {
        localStorage.setItem(ACTION_STORAGE_READY_KEY, 'true');
    } else {
        localStorage.removeItem(ACTION_STORAGE_READY_KEY);
    }
};

// Matches the existing context pattern used throughout this app.
// eslint-disable-next-line react-refresh/only-export-components
export const useFocus = () => {
    const context = useContext(FocusContext);
    if (!context) {
        throw new Error('useFocus must be used within FocusProvider');
    }
    return context;
};

export const FocusProvider = ({ children }) => {
    const { user } = useAuth();
    const hasHydratedGuestData = useRef(false);
    const [sessions, setSessions] = useState([]);
    const [actions, setActions] = useState([]);
    const [rewards, setRewards] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [actionStorageReady, setActionStorageReady] = useState(false);
    const [isCheckingActionStorage, setIsCheckingActionStorage] = useState(false);

    const refreshFocusData = useCallback(async () => {
        if (!user || !supabase) return;

        const [
            sessionsResult,
            rewardsResult,
            inventoryResult,
            transactionsResult,
        ] = await Promise.all([
            supabase.from('focus_sessions').select('*').eq('user_id', user.id).order('started_at', { ascending: false }),
            supabase.from('focus_rewards').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
            supabase.from('focus_inventory').select('*').eq('user_id', user.id).order('purchased_at', { ascending: false }),
            supabase.from('focus_point_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        ]);

        const error = sessionsResult.error || rewardsResult.error || inventoryResult.error || transactionsResult.error;
        if (error) throw error;

        setSessions((sessionsResult.data || []).map(normalizeSession));
        setRewards((rewardsResult.data || []).map(normalizeReward));
        setInventory((inventoryResult.data || []).map(normalizeInventoryItem));
        setTransactions((transactionsResult.data || []).map(normalizeTransaction));

        if (!isActionStorageMarkedReady()) {
            setActions([]);
            setActionStorageReady(false);
            return;
        }

        const actionsResult = await supabase
            .from('focus_actions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (actionsResult.error) {
            setActions([]);
            setActionStorageReady(false);
            markActionStorageReady(false);
            if (!isMissingFocusActionsTable(actionsResult.error)) {
                console.warn('Focus actions could not be loaded.', actionsResult.error);
            }
            return;
        }

        setActionStorageReady(true);
        setActions((actionsResult.data || []).map(normalizeAction));
    }, [user]);

    const checkActionStorage = useCallback(async ({ silent = false } = {}) => {
        if (!user || !supabase) {
            setActionStorageReady(true);
            return true;
        }

        setIsCheckingActionStorage(true);
        const { data, error } = await supabase
            .from('focus_actions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) {
            setActions([]);
            setActionStorageReady(false);
            markActionStorageReady(false);
            setIsCheckingActionStorage(false);
            if (isMissingFocusActionsTable(error)) {
                if (silent) return false;
                throw new Error(FOCUS_ACTIONS_MISSING_MESSAGE);
            }
            if (silent) {
                console.warn('Focus actions could not be checked.', error);
                return false;
            }
            throw error;
        }

        setActionStorageReady(true);
        markActionStorageReady(true);
        setActions((data || []).map(normalizeAction));
        setIsCheckingActionStorage(false);
        return true;
    }, [user]);

    useEffect(() => {
        setIsLoaded(false);
        hasHydratedGuestData.current = false;

        if (user && supabase) {
            setActions([]);
            setActionStorageReady(isActionStorageMarkedReady());
            setIsCheckingActionStorage(true);
            refreshFocusData()
                .then(() => checkActionStorage({ silent: true }))
                .catch((error) => console.error('Error loading focus data:', error))
                .finally(() => setIsCheckingActionStorage(false))
                .finally(() => setIsLoaded(true));
            return;
        }

        setActionStorageReady(true);
        setIsCheckingActionStorage(false);
        try {
            const parsed = getStoredFocusData();
            const saved = Boolean(parsed);
            if (saved) {
                setSessions((parsed.sessions || []).map(normalizeSession));
                setActions((parsed.actions || []).map(normalizeAction));
                setRewards((parsed.rewards || []).map(normalizeReward));
                setInventory((parsed.inventory || []).map(normalizeInventoryItem));
                setTransactions((parsed.transactions || []).map(normalizeTransaction));
            } else {
                setSessions([]);
                setActions([]);
                setRewards([]);
                setInventory([]);
                setTransactions([]);
            }
        } catch (error) {
            console.error('Failed to load focus data from localStorage:', error);
            setSessions([]);
            setActions([]);
            setRewards([]);
            setInventory([]);
            setTransactions([]);
        } finally {
            hasHydratedGuestData.current = true;
            setIsLoaded(true);
        }
    }, [checkActionStorage, refreshFocusData, user]);

    useEffect(() => {
        if (user || !isLoaded || !hasHydratedGuestData.current) return;

        const nextData = {
            sessions,
            actions,
            rewards,
            inventory,
            transactions,
        };
        const existingRaw = localStorage.getItem(STORAGE_KEY);
        const existing = parseStoredFocusData(existingRaw);

        if (!hasFocusData(nextData) && hasFocusData(existing)) return;
        if (existingRaw && hasFocusData(existing)) {
            localStorage.setItem(STORAGE_BACKUP_KEY, existingRaw);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
    }, [actions, inventory, isLoaded, rewards, sessions, transactions, user]);

    useEffect(() => {
        if (!user || !supabase) return undefined;

        const channel = supabase
            .channel(`focus-game-${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_sessions', filter: `user_id=eq.${user.id}` }, () => {
                refreshFocusData().catch((error) => console.error('Error refreshing focus sessions:', error));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_rewards', filter: `user_id=eq.${user.id}` }, () => {
                refreshFocusData().catch((error) => console.error('Error refreshing focus rewards:', error));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_inventory', filter: `user_id=eq.${user.id}` }, () => {
                refreshFocusData().catch((error) => console.error('Error refreshing focus inventory:', error));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_point_transactions', filter: `user_id=eq.${user.id}` }, () => {
                refreshFocusData().catch((error) => console.error('Error refreshing focus point history:', error));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [refreshFocusData, user]);

    const balance = useMemo(
        () => transactions.reduce((total, transaction) => total + transaction.points, 0),
        [transactions]
    );

    const lifetimeSessionPoints = useMemo(
        () => sumBaseEarnedPoints(transactions),
        [transactions]
    );

    const dailySessionPoints = useMemo(() => {
        const todayKey = toLocalDateKey(new Date());
        return sumBaseEarnedPoints(transactions, todayKey);
    }, [transactions]);

    const activeRewards = useMemo(
        () => rewards.filter((reward) => !reward.archived),
        [rewards]
    );

    const activeActions = useMemo(
        () => actions.filter((action) => !action.archived),
        [actions]
    );

    const availableInventory = useMemo(
        () => inventory.filter((item) => !item.used_at),
        [inventory]
    );

    const weeklyPoints = useMemo(() => {
        const days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const monday = new Date(today);
        const daysSinceMonday = (today.getDay() + 6) % 7;
        monday.setDate(today.getDate() - daysSinceMonday);

        for (let index = 0; index < 7; index += 1) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + index);
            const key = toLocalDateKey(date);
            days.push({
                key,
                label: date.toLocaleDateString([], { weekday: 'short' }),
                points: 0,
            });
        }

        const dayMap = Object.fromEntries(days.map((day) => [day.key, day]));
        transactions.forEach((transaction) => {
            if (transaction.points <= 0) return;
            const key = toLocalDateKey(transaction.created_at);
            if (dayMap[key]) dayMap[key].points += transaction.points;
        });

        return days;
    }, [transactions]);

    const addSession = async ({ sessionType, startedAt, durationMinutes, note }) => {
        const points = getSessionPoints(durationMinutes);
        if (points <= 0) {
            throw new Error('A focus session needs at least 25 minutes to earn points.');
        }

        const now = new Date().toISOString();
        const sessionId = user ? `session_${Date.now()}` : `session_${Date.now()}`;
        const transactionId = `transaction_${Date.now()}`;
        const session = normalizeSession({
            id: sessionId,
            user_id: user?.id,
            session_type: sessionType,
            started_at: startedAt,
            duration_minutes: Number(durationMinutes),
            points_earned: points,
            note: note || '',
            created_at: now,
        });

        const sessionTransaction = normalizeTransaction({
            id: transactionId,
            user_id: user?.id,
            kind: 'session',
            points,
            title: `${sessionType} session`,
            metadata: { session_id: sessionId, duration_minutes: Number(durationMinutes) },
            created_at: now,
        });

        const previousLifetimePoints = lifetimeSessionPoints;
        const nextLifetimePoints = previousLifetimePoints + points;
        const sessionDateKey = toLocalDateKey(startedAt);
        const previousDailyPoints = sumBaseEarnedPoints(transactions, sessionDateKey);
        const nextDailyPoints = previousDailyPoints + points;
        const lifetimeMilestoneTransactions = getNewMilestoneBonuses(previousLifetimePoints, nextLifetimePoints, transactions)
            .map((milestone, index) => normalizeTransaction({
                id: `milestone_${Date.now()}_${index}`,
                user_id: user?.id,
                kind: 'milestone_bonus',
                points: MILESTONE_BONUS,
                title: `${milestone} point milestone`,
                metadata: { milestone, scope: 'lifetime' },
                created_at: now,
            }));
        const dailyMilestoneTransactions = getNewDailyMilestoneBonuses(previousDailyPoints, nextDailyPoints, sessionDateKey, transactions)
            .map((milestone, index) => normalizeTransaction({
                id: `daily_milestone_${Date.now()}_${index}`,
                user_id: user?.id,
                kind: 'milestone_bonus',
                points: DAILY_MILESTONE_BONUS,
                title: `Daily ${milestone} point bonus`,
                metadata: { milestone, scope: 'daily', date: sessionDateKey },
                created_at: now,
            }));
        const milestoneTransactions = [...lifetimeMilestoneTransactions, ...dailyMilestoneTransactions];

        setSessions((prev) => sortNewestFirst([session, ...prev]));
        setTransactions((prev) => sortNewestFirst([sessionTransaction, ...milestoneTransactions, ...prev]));

        if (!user || !supabase) return session;

        try {
            const sessionPayload = {
                user_id: user.id,
                session_type: session.session_type,
                started_at: session.started_at,
                duration_minutes: session.duration_minutes,
                points_earned: session.points_earned,
                note: session.note,
                created_at: session.created_at,
            };

            const { data: savedSession, error: sessionError } = await supabase
                .from('focus_sessions')
                .insert([sessionPayload])
                .select()
                .single();
            if (sessionError) throw sessionError;

            const transactionPayloads = [sessionTransaction, ...milestoneTransactions].map((transaction) => ({
                user_id: user.id,
                kind: transaction.kind,
                points: transaction.points,
                title: transaction.title,
                metadata: {
                    ...transaction.metadata,
                    session_id: savedSession?.id || transaction.metadata.session_id,
                },
                created_at: transaction.created_at,
            }));

            const { data: savedTransactions, error: transactionError } = await supabase
                .from('focus_point_transactions')
                .insert(transactionPayloads)
                .select();
            if (transactionError) throw transactionError;

            setSessions((prev) => prev.map((item) => (
                item.id === sessionId ? normalizeSession(savedSession) : item
            )));
            setTransactions((prev) => {
                const temporaryIds = new Set([sessionTransaction.id, ...milestoneTransactions.map((transaction) => transaction.id)]);
                return sortNewestFirst([
                    ...(savedTransactions || []).map(normalizeTransaction),
                    ...prev.filter((transaction) => !temporaryIds.has(transaction.id)),
                ]);
            });

            return normalizeSession(savedSession);
        } catch (error) {
            console.error('Error saving focus session:', error);
            const temporaryIds = new Set([sessionTransaction.id, ...milestoneTransactions.map((transaction) => transaction.id)]);
            setSessions((prev) => prev.filter((item) => item.id !== sessionId));
            setTransactions((prev) => prev.filter((transaction) => !temporaryIds.has(transaction.id)));
            throw error;
        }
    };

    const addAction = async ({ name, points, color = 'mint' }) => {
        if (user && supabase && !actionStorageReady) {
            throw new Error(FOCUS_ACTIONS_MISSING_MESSAGE);
        }

        const now = new Date().toISOString();
        const actionId = `action_${Date.now()}`;
        const action = normalizeAction({
            id: actionId,
            user_id: user?.id,
            name,
            points: Number(points),
            color,
            archived: false,
            created_at: now,
        });

        setActions((prev) => [...prev, action]);

        if (!user || !supabase) return action;

        try {
            const { data, error } = await supabase
                .from('focus_actions')
                .insert([{
                    user_id: user.id,
                    name: action.name,
                    points: action.points,
                    color: action.color,
                    archived: false,
                    created_at: action.created_at,
                }])
                .select()
                .single();
            if (error) throw error;
            setActionStorageReady(true);
            markActionStorageReady(true);
            setActions((prev) => prev.map((item) => (item.id === actionId ? normalizeAction(data) : item)));
            return normalizeAction(data);
        } catch (error) {
            console.error('Error saving focus action:', error);
            setActions((prev) => prev.filter((item) => item.id !== actionId));
            if (isMissingFocusActionsTable(error)) {
                setActionStorageReady(false);
                markActionStorageReady(false);
                throw new Error(FOCUS_ACTIONS_MISSING_MESSAGE);
            }
            throw error;
        }
    };

    const logAction = async (actionId) => {
        const action = activeActions.find((item) => item.id === actionId);
        if (!action) throw new Error('Action not found.');

        const now = new Date().toISOString();
        const dateKey = toLocalDateKey(now);
        const transactionId = `transaction_${Date.now()}`;
        const points = Math.max(1, Number(action.points) || 1);
        const transaction = normalizeTransaction({
            id: transactionId,
            user_id: user?.id,
            kind: 'custom_action',
            points,
            title: action.name,
            metadata: { action_id: action.id, action_name: action.name },
            created_at: now,
        });

        const previousLifetimePoints = lifetimeSessionPoints;
        const nextLifetimePoints = previousLifetimePoints + points;
        const previousDailyPoints = sumBaseEarnedPoints(transactions, dateKey);
        const nextDailyPoints = previousDailyPoints + points;
        const lifetimeMilestoneTransactions = getNewMilestoneBonuses(previousLifetimePoints, nextLifetimePoints, transactions)
            .map((milestone, index) => normalizeTransaction({
                id: `action_milestone_${Date.now()}_${index}`,
                user_id: user?.id,
                kind: 'milestone_bonus',
                points: MILESTONE_BONUS,
                title: `${milestone} point milestone`,
                metadata: { milestone, scope: 'lifetime' },
                created_at: now,
            }));
        const dailyMilestoneTransactions = getNewDailyMilestoneBonuses(previousDailyPoints, nextDailyPoints, dateKey, transactions)
            .map((milestone, index) => normalizeTransaction({
                id: `action_daily_milestone_${Date.now()}_${index}`,
                user_id: user?.id,
                kind: 'milestone_bonus',
                points: DAILY_MILESTONE_BONUS,
                title: `Daily ${milestone} point bonus`,
                metadata: { milestone, scope: 'daily', date: dateKey },
                created_at: now,
            }));
        const milestoneTransactions = [...lifetimeMilestoneTransactions, ...dailyMilestoneTransactions];

        setTransactions((prev) => sortNewestFirst([transaction, ...milestoneTransactions, ...prev]));

        if (!user || !supabase) return transaction;

        try {
            const { data, error } = await supabase
                .from('focus_point_transactions')
                .insert([transaction, ...milestoneTransactions].map((item) => ({
                    user_id: user.id,
                    kind: item.kind,
                    points: item.points,
                    title: item.title,
                    metadata: item.metadata,
                    created_at: item.created_at,
                })))
                .select();
            if (error) throw error;

            const temporaryIds = new Set([transaction.id, ...milestoneTransactions.map((item) => item.id)]);
            setTransactions((prev) => sortNewestFirst([
                ...(data || []).map(normalizeTransaction),
                ...prev.filter((item) => !temporaryIds.has(item.id)),
            ]));
            return normalizeTransaction(data?.[0] || transaction);
        } catch (error) {
            console.error('Error logging focus action:', error);
            const temporaryIds = new Set([transaction.id, ...milestoneTransactions.map((item) => item.id)]);
            setTransactions((prev) => prev.filter((item) => !temporaryIds.has(item.id)));
            if (isTransactionKindConstraintError(error)) {
                throw new Error(FOCUS_TRANSACTION_KIND_MESSAGE);
            }
            throw error;
        }
    };

    const archiveAction = async (actionId) => {
        const action = actions.find((item) => item.id === actionId);
        if (!action) return;
        if (user && supabase && !actionStorageReady) {
            throw new Error(FOCUS_ACTIONS_MISSING_MESSAGE);
        }
        setActions((prev) => prev.map((item) => (
            item.id === actionId ? normalizeAction({ ...item, archived: true }) : item
        )));

        if (!user || !supabase) return;

        try {
            const { error } = await supabase
                .from('focus_actions')
                .update({ archived: true })
                .eq('id', actionId);
            if (error) throw error;
        } catch (error) {
            console.error('Error archiving focus action:', error);
            setActions((prev) => prev.map((item) => (item.id === actionId ? action : item)));
            if (isMissingFocusActionsTable(error)) {
                setActionStorageReady(false);
                markActionStorageReady(false);
                throw new Error(FOCUS_ACTIONS_MISSING_MESSAGE);
            }
            throw error;
        }
    };

    const addReward = async ({ name, costPoints, color = 'mint' }) => {
        const now = new Date().toISOString();
        const rewardId = `reward_${Date.now()}`;
        const reward = normalizeReward({
            id: rewardId,
            user_id: user?.id,
            name,
            cost_points: Number(costPoints),
            color,
            archived: false,
            created_at: now,
        });

        setRewards((prev) => [...prev, reward]);

        if (!user || !supabase) return reward;

        try {
            const { data, error } = await supabase
                .from('focus_rewards')
                .insert([{
                    user_id: user.id,
                    name: reward.name,
                    cost_points: reward.cost_points,
                    color: reward.color,
                    archived: false,
                    created_at: reward.created_at,
                }])
                .select()
                .single();
            if (error) throw error;
            setRewards((prev) => prev.map((item) => (item.id === rewardId ? normalizeReward(data) : item)));
            return normalizeReward(data);
        } catch (error) {
            console.error('Error saving focus reward:', error);
            setRewards((prev) => prev.filter((item) => item.id !== rewardId));
            throw error;
        }
    };

    const purchaseReward = async (rewardId) => {
        const reward = activeRewards.find((item) => item.id === rewardId);
        if (!reward) throw new Error('Reward not found.');
        if (balance < reward.cost_points) throw new Error('Not enough focus points yet.');

        const now = new Date().toISOString();
        const inventoryId = `inventory_${Date.now()}`;
        const transactionId = `transaction_${Date.now()}`;
        const inventoryItem = normalizeInventoryItem({
            id: inventoryId,
            user_id: user?.id,
            reward_id: reward.id,
            reward_name: reward.name,
            cost_points: reward.cost_points,
            reward_color: reward.color,
            purchased_at: now,
            used_at: null,
        });
        const transaction = normalizeTransaction({
            id: transactionId,
            user_id: user?.id,
            kind: 'purchase',
            points: -reward.cost_points,
            title: `Purchased ${reward.name}`,
            metadata: { reward_id: reward.id, inventory_id: inventoryId },
            created_at: now,
        });

        setInventory((prev) => sortNewestFirst([inventoryItem, ...prev]));
        setTransactions((prev) => sortNewestFirst([transaction, ...prev]));

        if (!user || !supabase) return inventoryItem;

        try {
            const { data: savedInventoryItem, error: inventoryError } = await supabase
                .from('focus_inventory')
                .insert([{
                    user_id: user.id,
                    reward_id: reward.id,
                    reward_name: reward.name,
                    cost_points: reward.cost_points,
                    reward_color: reward.color,
                    purchased_at: now,
                    used_at: null,
                }])
                .select()
                .single();
            if (inventoryError) throw inventoryError;

            const { data: savedTransaction, error: transactionError } = await supabase
                .from('focus_point_transactions')
                .insert([{
                    user_id: user.id,
                    kind: 'purchase',
                    points: -reward.cost_points,
                    title: `Purchased ${reward.name}`,
                    metadata: { reward_id: reward.id, inventory_id: savedInventoryItem.id },
                    created_at: now,
                }])
                .select()
                .single();
            if (transactionError) throw transactionError;

            setInventory((prev) => prev.map((item) => (
                item.id === inventoryId ? normalizeInventoryItem(savedInventoryItem) : item
            )));
            setTransactions((prev) => prev.map((item) => (
                item.id === transactionId ? normalizeTransaction(savedTransaction) : item
            )));

            return normalizeInventoryItem(savedInventoryItem);
        } catch (error) {
            console.error('Error purchasing focus reward:', error);
            setInventory((prev) => prev.filter((item) => item.id !== inventoryId));
            setTransactions((prev) => prev.filter((item) => item.id !== transactionId));
            throw error;
        }
    };

    const useInventoryItem = async (inventoryId) => {
        const item = inventory.find((inventoryItem) => inventoryItem.id === inventoryId);
        if (!item || item.used_at) return null;

        const now = new Date().toISOString();
        const transactionId = `transaction_${Date.now()}`;
        const usedItem = normalizeInventoryItem({ ...item, used_at: now });
        const transaction = normalizeTransaction({
            id: transactionId,
            user_id: user?.id,
            kind: 'use_reward',
            points: 0,
            title: `Used ${item.reward_name}`,
            metadata: { inventory_id: inventoryId, reward_id: item.reward_id },
            created_at: now,
        });

        setInventory((prev) => prev.map((inventoryItem) => (
            inventoryItem.id === inventoryId ? usedItem : inventoryItem
        )));
        setTransactions((prev) => sortNewestFirst([transaction, ...prev]));

        if (!user || !supabase) return usedItem;

        try {
            const { data: savedInventoryItem, error: inventoryError } = await supabase
                .from('focus_inventory')
                .update({ used_at: now })
                .eq('id', inventoryId)
                .select()
                .single();
            if (inventoryError) throw inventoryError;

            const { data: savedTransaction, error: transactionError } = await supabase
                .from('focus_point_transactions')
                .insert([{
                    user_id: user.id,
                    kind: 'use_reward',
                    points: 0,
                    title: `Used ${item.reward_name}`,
                    metadata: { inventory_id: inventoryId, reward_id: item.reward_id },
                    created_at: now,
                }])
                .select()
                .single();
            if (transactionError) throw transactionError;

            setInventory((prev) => prev.map((inventoryItem) => (
                inventoryItem.id === inventoryId ? normalizeInventoryItem(savedInventoryItem) : inventoryItem
            )));
            setTransactions((prev) => prev.map((historyItem) => (
                historyItem.id === transactionId ? normalizeTransaction(savedTransaction) : historyItem
            )));

            return normalizeInventoryItem(savedInventoryItem);
        } catch (error) {
            console.error('Error using focus reward:', error);
            setInventory((prev) => prev.map((inventoryItem) => (
                inventoryItem.id === inventoryId ? item : inventoryItem
            )));
            setTransactions((prev) => prev.filter((historyItem) => historyItem.id !== transactionId));
            throw error;
        }
    };

    const archiveReward = async (rewardId) => {
        const reward = rewards.find((item) => item.id === rewardId);
        if (!reward) return;
        setRewards((prev) => prev.map((item) => (
            item.id === rewardId ? normalizeReward({ ...item, archived: true }) : item
        )));

        if (!user || !supabase) return;

        try {
            const { error } = await supabase
                .from('focus_rewards')
                .update({ archived: true })
                .eq('id', rewardId);
            if (error) throw error;
        } catch (error) {
            console.error('Error archiving focus reward:', error);
            setRewards((prev) => prev.map((item) => (item.id === rewardId ? reward : item)));
            throw error;
        }
    };

    const value = {
        sessions,
        actions,
        activeActions,
        rewards,
        activeRewards,
        inventory,
        availableInventory,
        transactions,
        weeklyPoints,
        balance,
        lifetimeSessionPoints,
        dailySessionPoints,
        milestoneInterval: MILESTONE_INTERVAL,
        milestoneBonus: MILESTONE_BONUS,
        dailyMilestoneInterval: DAILY_MILESTONE_INTERVAL,
        dailyMilestoneBonus: DAILY_MILESTONE_BONUS,
        isLoaded,
        actionStorageReady,
        isCheckingActionStorage,
        checkActionStorage,
        getSessionPoints,
        addSession,
        addAction,
        logAction,
        archiveAction,
        addReward,
        purchaseReward,
        useInventoryItem,
        archiveReward,
    };

    return (
        <FocusContext.Provider value={value}>
            {children}
        </FocusContext.Provider>
    );
};
