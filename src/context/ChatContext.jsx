/* eslint-disable react-refresh/only-export-components, react-hooks/exhaustive-deps */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { useTask } from './TaskContext';
import { useHabit } from './HabitContext';
import { useProject } from './ProjectContext';
import { useGoal } from './GoalContext';
import { useUserProfile } from './UserProfileContext';
import { useAgentMemory } from './AgentMemoryContext';
import { useUserIntelligence } from './UserIntelligenceContext';
import { clearChatSession } from '../services/ConversationService';
import { AI_PROVIDER_OPTIONS, DEFAULT_AI_PROVIDER, normalizeAIProvider } from '../services/aiProvider';
import { isTaskActive } from '../utils/taskState';
import { log } from '../utils/log.js';
import { useChatActions } from './chat/useChatActions';

const ChatContext = createContext();

export const useChatContext = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChatContext must be used within a ChatProvider');
    }
    return context;
};

export const ChatProvider = ({ children }) => {
    const { user } = useAuth();
    const { tasks, scheduleItems, addTask, updateTask, deleteTask, completeTask, addScheduleItem, updateScheduleItem, deleteScheduleItem } = useTask();
    const { habits, logHabit } = useHabit();
    const { projects } = useProject();
    const { goals, dailyHighlights } = useGoal();
    const { profile, getProfileSummary } = useUserProfile();
    const { logInteraction, getMemorySummary, getRecentInteractions, rememberNote } = useAgentMemory();
    const { intelligence, learnMultipleFacts, getIntelligenceSummary } = useUserIntelligence();

    // Chat state
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [pendingActions, setPendingActions] = useState(null); // { messageId, actions }
    const [selectedAIProvider, setSelectedAIProviderState] = useState(() => {
        if (typeof localStorage === 'undefined') return DEFAULT_AI_PROVIDER;
        return normalizeAIProvider(localStorage.getItem('chat_ai_provider'));
    });
    const [localThinkingEnabled, setLocalThinkingEnabledState] = useState(() => {
        if (typeof localStorage === 'undefined') return false;
        return localStorage.getItem('chat_local_thinking_enabled') === 'true';
    });

    // Active subject tracking - remembers what item user is currently discussing
    // Format: { type: 'schedule'|'task', id: string, title: string } or null
    const [activeSubject, setActiveSubject] = useState(null);

    // Last proposed schedule/task - persists even when pendingActions changes
    // Used by fallback to recover original proposal data when user modifies before confirming
    const [lastProposedSchedule, setLastProposedSchedule] = useState(null);

    const setSelectedAIProvider = useCallback((provider) => {
        const normalized = normalizeAIProvider(provider);
        setSelectedAIProviderState(normalized);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('chat_ai_provider', normalized);
        }
        clearChatSession();
    }, []);

    const setLocalThinkingEnabled = useCallback((enabled) => {
        const normalized = Boolean(enabled);
        setLocalThinkingEnabledState(normalized);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('chat_local_thinking_enabled', String(normalized));
        }
        clearChatSession();
    }, []);

    const restoreConversation = (storedMessages) => {
        const restoredMessages = Array.isArray(storedMessages) ? storedMessages : [];
        let latestPendingIndex = -1;

        restoredMessages.forEach((message, index) => {
            if (message?.pendingConfirmation) latestPendingIndex = index;
        });

        const normalizedMessages = restoredMessages.map((message, index) => (
            message?.pendingConfirmation && index !== latestPendingIndex
                ? { ...message, pendingConfirmation: false, actionsCancelled: true }
                : message
        ));

        const latestPendingMessage = normalizedMessages[latestPendingIndex];
        const restoredActions = latestPendingMessage?.actions?.filter(action =>
            !['info_response', 'clarify'].includes(action.type)
        ) || [];

        setMessages(normalizedMessages);
        setPendingActions(restoredActions.length > 0
            ? { messageId: latestPendingMessage.id, actions: restoredActions }
            : null);

        const pendingSchedule = restoredActions.find(action => action.type === 'add_schedule');
        setLastProposedSchedule(pendingSchedule?.params || null);
    };

    async function loadConversation() {
        try {
            if (user) {
                // Load from Supabase for logged-in users
                const { data } = await supabase
                    .from('agent_conversations')
                    .select('messages')
                    .eq('user_id', user.id)
                    .single();

                if (data?.messages) {
                    restoreConversation(data.messages);
                }
            } else {
                // Load from localStorage for guests
                const stored = localStorage.getItem('chat_messages');
                if (stored) {
                    restoreConversation(JSON.parse(stored));
                }
            }
        } catch {
            log('No previous conversation found');
        }
    }

    // Load conversation from storage on mount
    useEffect(() => {
        // The async read restores persisted guest/cloud conversation after provider setup.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadConversation();
    }, [user]);

    const saveConversation = useCallback(async (newMessages) => {
        try {
            if (user) {
                // Upsert to Supabase
                await supabase
                    .from('agent_conversations')
                    .upsert({
                        user_id: user.id,
                        messages: newMessages,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });
            } else {
                // Save to localStorage
                localStorage.setItem('chat_messages', JSON.stringify(newMessages));
            }
        } catch (error) {
            console.error('Error saving conversation:', error);
        }
    }, [user]);

    const toggleSidebar = useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);

    const openSidebar = useCallback(() => {
        setIsOpen(true);
    }, []);

    const closeSidebar = useCallback(() => {
        setIsOpen(false);
    }, []);

    // Build context for AI
    const buildContext = useCallback(() => {
        const today = new Date();
        const recentScheduleWindowStart = new Date(today);
        recentScheduleWindowStart.setDate(recentScheduleWindowStart.getDate() - 1);
        recentScheduleWindowStart.setHours(0, 0, 0, 0);

        // Keep a broader schedule window so the AI has real IDs for nearby events, not just today's.
        const recentSchedule = (scheduleItems?.filter(item => {
            if (!item.startTime && !item.start_time) return false;
            const itemDate = new Date(item.startTime || item.start_time);
            return itemDate >= recentScheduleWindowStart;
        }) || [])
            .sort((a, b) => new Date(a.startTime || a.start_time) - new Date(b.startTime || b.start_time))
            .slice(0, 20);

        // Get conversation history for context
        const conversationHistory = messages.slice(-10).map(m =>
            `${m.role === 'user' ? 'User' : 'Agent'}: ${m.content}`
        ).join('\n');

        return {
            userProfile: {
                name: profile?.nickname || profile?.name || user?.email?.split('@')[0] || 'User',
                role: profile?.role,
                bio: profile?.bio, // User's personal description (schedule patterns, lifestyle, etc.)
                workingHours: profile?.workingHours, // { start: '09:00', end: '17:00' }
                focusStyle: profile?.focusStyle, // 'deep_work', 'pomodoro', 'flexible'
                routines: profile?.routines, // { morning: '...', evening: '...' }
                goals: profile?.goals,
                preferences: profile?.preferences, // { timezone, proactiveSuggestions }
                summary: getProfileSummary?.() || ''
            },
            recentTasks: tasks?.filter(isTaskActive).slice(0, 15) || [],
            tasksDueToday: tasks?.filter(t => {
                if (!isTaskActive(t) || !t.deadline) return false;
                return new Date(t.deadline).toDateString() === today.toDateString();
            }) || [],
            recentSchedule,
            projects: projects?.map(p => ({
                id: p.id,
                title: p.title,
                status: p.status,
                progress: p.progress,
                taskCount: p.tasks?.length || 0
            })) || [],
            habits: habits?.map(h => ({
                id: h.id,
                name: h.name,
                frequency: h.frequency,
                streak: h.streak || 0,
                completedToday: h.completedToday === true
            })) || [],
            visionGoals: Array.isArray(goals) ? goals.slice(0, 10) : [],
            dailyHighlights: Array.isArray(dailyHighlights) ? dailyHighlights.slice(0, 5) : [],
            memorySummary: getMemorySummary?.(profile) || '',
            intelligenceSummary: getIntelligenceSummary?.() || '',
            recentInteractions: getRecentInteractions?.(5) || [],
            conversationHistory: conversationHistory || null,
            // Active subject - the item user is currently discussing (for follow-up edits)
            activeSubject: activeSubject,
            // Pending actions - actions awaiting user confirmation (not yet executed)
            pendingActions: pendingActions?.actions || null
        };
    }, [tasks, scheduleItems, habits, projects, goals, dailyHighlights, profile, user, messages, activeSubject, pendingActions, getProfileSummary, getMemorySummary, getRecentInteractions, getIntelligenceSummary]);

    // Send a message
    const { executeActionsInternal, sendMessage, stopMessage } = useChatActions({
        activeSubject,
        addScheduleItem,
        addTask,
        buildContext,
        completeTask,
        deleteScheduleItem,
        deleteTask,
        intelligence,
        lastProposedSchedule,
        learnMultipleFacts,
        localThinkingEnabled,
        logHabit,
        logInteraction,
        messages,
        pendingActions,
        rememberNote,
        saveConversation,
        selectedAIProvider,
        setActiveSubject,
        setIsTyping,
        setLastProposedSchedule,
        setMessages,
        setPendingActions,
        updateScheduleItem,
        updateTask,
    });

    // executeActionsInternal is intentionally recreated with the latest action dependencies.
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const confirmActions = useCallback(async (messageId) => {
        if (!pendingActions || pendingActions.messageId !== messageId) return;

        const failures = await executeActionsInternal(pendingActions.actions);
        const allSucceeded = failures.length === 0;

        // Update message to mark as executed
        setMessages(prev => prev.map(m =>
            m.id === messageId
                ? { ...m, actionsExecuted: allSucceeded, pendingConfirmation: false }
                : m
        ));
        setPendingActions(null);

        // Add confirmation message
        const confirmMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: allSucceeded
                ? "✅ Done! Actions completed successfully."
                : `I couldn't save everything to Supabase.\n${failures.map(f => `- ${f.actionType}: ${f.message}`).join('\n')}`,
            timestamp: new Date().toISOString()
        };
        setMessages(prev => {
            const updated = [...prev, confirmMessage];
            saveConversation(updated);
            return updated;
        });
    }, [pendingActions, saveConversation]);

    // Cancel pending actions
    const cancelActions = useCallback((messageId) => {
        if (!pendingActions || pendingActions.messageId !== messageId) return;

        // Update message to mark as cancelled
        setMessages(prev => prev.map(m =>
            m.id === messageId
                ? { ...m, actionsCancelled: true, pendingConfirmation: false }
                : m
        ));
        setPendingActions(null);

        // Add cancellation message
        const cancelMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: "Okay, I cancelled that. Is there something else you'd like me to do?",
            timestamp: new Date().toISOString()
        };
        setMessages(prev => {
            const updated = [...prev, cancelMessage];
            saveConversation(updated);
            return updated;
        });
    }, [pendingActions, saveConversation]);

    // Clear conversation
    const clearConversation = useCallback(() => {
        setMessages([]);
        setPendingActions(null);
        setActiveSubject(null); // Clear active subject tracking
        setLastProposedSchedule(null); // Clear saved schedule proposal
        clearChatSession(); // Clear the multi-turn chat session
        if (user) {
            supabase
                .from('agent_conversations')
                .delete()
                .eq('user_id', user.id)
                .then(() => log('Conversation cleared'));
        } else {
            localStorage.removeItem('chat_messages');
        }
    }, [user]);

    return (
        <ChatContext.Provider
            value={{
                isOpen,
                messages,
                isTyping,
                pendingActions,
                selectedAIProvider,
                setSelectedAIProvider,
                localThinkingEnabled,
                setLocalThinkingEnabled,
                aiProviderOptions: AI_PROVIDER_OPTIONS,
                toggleSidebar,
                openSidebar,
                closeSidebar,
                sendMessage,
                stopMessage,
                confirmActions,
                cancelActions,
                clearConversation
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};

export default ChatContext;
