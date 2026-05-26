import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { toLocalDateKey } from '../utils/scheduleOccurrences';

const FocusContext = createContext();

const STORAGE_KEY = 'focus-game-guest';
const MILESTONE_INTERVAL = 50;
const MILESTONE_BONUS = 5;
const DAILY_MILESTONE_INTERVAL = 10;
const DAILY_MILESTONE_BONUS = 2;

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

const normalizeInventoryItem = (item) => ({
    ...item,
    cost_points: Number(item?.cost_points) || 0,
    used_at: item?.used_at || null,
});

const normalizeTransaction = (transaction) => ({
    ...transaction,
    points: Number(transaction?.points) || 0,
    metadata: transaction?.metadata || {},
});

const getSessionPoints = (durationMinutes) => Math.max(0, Math.floor((Number(durationMinutes) || 0) / 25));

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
    const [sessions, setSessions] = useState([]);
    const [rewards, setRewards] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);

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
    }, [user]);

    useEffect(() => {
        setIsLoaded(false);

        if (user && supabase) {
            refreshFocusData()
                .catch((error) => console.error('Error loading focus data:', error))
                .finally(() => setIsLoaded(true));
            return;
        }

        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setSessions((parsed.sessions || []).map(normalizeSession));
                setRewards((parsed.rewards || []).map(normalizeReward));
                setInventory((parsed.inventory || []).map(normalizeInventoryItem));
                setTransactions((parsed.transactions || []).map(normalizeTransaction));
            } else {
                setSessions([]);
                setRewards([]);
                setInventory([]);
                setTransactions([]);
            }
        } catch (error) {
            console.error('Failed to load focus data from localStorage:', error);
            setSessions([]);
            setRewards([]);
            setInventory([]);
            setTransactions([]);
        } finally {
            setIsLoaded(true);
        }
    }, [refreshFocusData, user]);

    useEffect(() => {
        if (user || !isLoaded) return;

        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            sessions,
            rewards,
            inventory,
            transactions,
        }));
    }, [inventory, isLoaded, rewards, sessions, transactions, user]);

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
        () => sessions.reduce((total, session) => total + session.points_earned, 0),
        [sessions]
    );

    const dailySessionPoints = useMemo(() => {
        const todayKey = toLocalDateKey(new Date());
        return sessions.reduce((total, session) => (
            toLocalDateKey(session.started_at) === todayKey
                ? total + session.points_earned
                : total
        ), 0);
    }, [sessions]);

    const activeRewards = useMemo(
        () => rewards.filter((reward) => !reward.archived),
        [rewards]
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
        const previousDailyPoints = sessions.reduce((total, item) => (
            toLocalDateKey(item.started_at) === sessionDateKey
                ? total + item.points_earned
                : total
        ), 0);
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
        getSessionPoints,
        addSession,
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
