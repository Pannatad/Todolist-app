import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { useTask } from './TaskContext';
import { useHabit } from './HabitContext';
import { useProject } from './ProjectContext';
import { useGoal } from './GoalContext';
import { useUserProfile } from './UserProfileContext';
import { useAgentMemory } from './AgentMemoryContext';
import { useUserIntelligence } from './UserIntelligenceContext';
import { canHandleLocally, generateLocalResponse, getCachedResponse, cacheResponse, generateCacheKey } from '../services/localAgentHandler';
import { sendChatMessage, clearChatSession } from '../services/ConversationService';
import { AI_PROVIDER_OPTIONS, DEFAULT_AI_PROVIDER, normalizeAIProvider } from '../services/aiProvider';
import { extractInsightsFromExchange } from '../services/InsightExtractionService';
import { isTaskActive } from '../utils/taskState';
import { toLocalDateKey } from '../utils/scheduleOccurrences';

const ChatContext = createContext();

export const useChatContext = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChatContext must be used within a ChatProvider');
    }
    return context;
};

// Actions that require user confirmation before execution
const ACTIONS_REQUIRING_CONFIRMATION = [
    'add_task',
    'edit_task',
    'delete_task',
    'add_schedule',
    'edit_schedule',
    'delete_schedule',
    'set_goal'
];

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

    // Active subject tracking - remembers what item user is currently discussing
    // Format: { type: 'schedule'|'task', id: string, title: string } or null
    const [activeSubject, setActiveSubject] = useState(null);

    // Last proposed schedule/task - persists even when pendingActions changes
    // Used by fallback to recover original proposal data when user modifies before confirming
    const [lastProposedSchedule, setLastProposedSchedule] = useState(null);

    // Load conversation from storage on mount
    useEffect(() => {
        loadConversation();
    }, [user]);

    const setSelectedAIProvider = useCallback((provider) => {
        const normalized = normalizeAIProvider(provider);
        setSelectedAIProviderState(normalized);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('chat_ai_provider', normalized);
        }
        clearChatSession();
    }, []);

    const loadConversation = async () => {
        try {
            if (user) {
                // Load from Supabase for logged-in users
                const { data, error } = await supabase
                    .from('agent_conversations')
                    .select('messages')
                    .eq('user_id', user.id)
                    .single();

                if (data?.messages) {
                    setMessages(data.messages);
                }
            } else {
                // Load from localStorage for guests
                const stored = localStorage.getItem('chat_messages');
                if (stored) {
                    setMessages(JSON.parse(stored));
                }
            }
        } catch (error) {
            console.log('No previous conversation found');
        }
    };

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
    const sendMessage = useCallback(async (text) => {
        if (!text.trim()) return;

        // Add user message
        const userMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: text.trim(),
            timestamp: new Date().toISOString()
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setIsTyping(true);

        try {
            // Build context
            const context = buildContext();

            // Try local handling first
            const patternType = canHandleLocally(text);
            let plan;

            if (patternType) {
                console.log('🚀 Handling locally:', patternType);
                plan = generateLocalResponse(patternType, context);
            } else {
                // Check cache for simple repeated queries
                const cacheKey = generateCacheKey(`${selectedAIProvider}:${text}`);
                const cachedPlan = getCachedResponse(cacheKey);

                if (cachedPlan) {
                    console.log('📦 Using cached response');
                    plan = cachedPlan;
                } else {
                    // Use multi-turn chat API for better context retention
                    console.log('🤖 Using multi-turn chat API with provider:', selectedAIProvider);
                    plan = await sendChatMessage(text, newMessages, context, selectedAIProvider);

                    // Only cache non-conversational responses
                    if (!text.toLowerCase().includes('earlier') &&
                        !text.toLowerCase().includes('you said') &&
                        !text.toLowerCase().includes('remember')) {
                        cacheResponse(cacheKey, plan);
                    }
                }
            }

            // Process the response
            // Extract the actual message content from info_response or clarify actions
            const infoAction = plan.actions?.find(a => a.type === 'info_response' || a.type === 'clarify');
            const messageContent = infoAction?.params?.message || infoAction?.params?.question || plan.summary || "I'll help you with that.";

            const aiMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: messageContent,
                timestamp: new Date().toISOString(),
                actions: plan.actions || [],
                actionsExecuted: false
            };

            // Check if any actions require confirmation
            const needsConfirmation = plan.actions?.some(a =>
                ACTIONS_REQUIRING_CONFIRMATION.includes(a.type)
            );

            // Extract active subject from actions for follow-up context
            const extractActiveSubject = (actions) => {
                if (!actions || actions.length === 0) return null;

                // Look for schedule actions first
                const scheduleAction = actions.find(a =>
                    ['add_schedule', 'edit_schedule'].includes(a.type)
                );
                if (scheduleAction?.params) {
                    return {
                        type: 'schedule',
                        id: scheduleAction.params.eventId || null, // Will be set after creation
                        title: scheduleAction.params.title || scheduleAction.params.updates?.title || 'Schedule Event',
                        action: scheduleAction.type
                    };
                }

                // Look for task actions
                const taskAction = actions.find(a =>
                    ['add_task', 'edit_task'].includes(a.type)
                );
                if (taskAction?.params) {
                    return {
                        type: 'task',
                        id: taskAction.params.taskId || null,
                        title: taskAction.params.title || taskAction.params.updates?.title || 'Task',
                        action: taskAction.type
                    };
                }

                return null;
            };

            // Set active subject for follow-up messages
            const newActiveSubject = extractActiveSubject(plan.actions);
            if (newActiveSubject) {
                setActiveSubject(newActiveSubject);
            }

            // Debug logging
            console.log('🔍 Actions received:', plan.actions?.map(a => ({ type: a.type, params: a.params })));
            console.log('🔍 Actions requiring confirmation:', ACTIONS_REQUIRING_CONFIRMATION);
            console.log('🔍 needsConfirmation:', needsConfirmation);

            if (needsConfirmation) {
                // Store pending actions for confirmation
                console.log('⏳ Storing pending actions for confirmation');
                setPendingActions({ messageId: aiMessage.id, actions: plan.actions });
                aiMessage.pendingConfirmation = true;

                // Save add_schedule proposal for later recovery (survives pendingActions overwrite)
                const addScheduleAction = plan.actions.find(a => a.type === 'add_schedule');
                if (addScheduleAction) {
                    console.log('💾 Saving lastProposedSchedule:', addScheduleAction.params);
                    setLastProposedSchedule(addScheduleAction.params);
                }
            } else {
                // Auto-execute non-destructive actions
                console.log('⚡ Auto-executing actions (no confirmation needed)');
                await executeActionsInternal(plan.actions);
                aiMessage.actionsExecuted = true;
            }

            const updatedMessages = [...newMessages, aiMessage];
            setMessages(updatedMessages);
            saveConversation(updatedMessages);

            // Log interaction
            logInteraction?.({
                input: text,
                actions: plan.actions,
                outcome: 'success'
            });

            // Extract and save insights from user message (async, non-blocking)
            extractInsightsFromExchange(text, messageContent, intelligence || [])
                .then(insights => {
                    if (insights.length > 0) {
                        console.log('🧠 Learned new insights:', insights);
                        learnMultipleFacts?.(insights);
                    }
                })
                .catch(err => console.log('Insight extraction skipped:', err.message));

        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: "I had trouble processing that. Could you try again?",
                timestamp: new Date().toISOString(),
                isError: true
            };
            const updatedMessages = [...newMessages, errorMessage];
            setMessages(updatedMessages);
            saveConversation(updatedMessages);
        } finally {
            setIsTyping(false);
        }
    }, [messages, buildContext, saveConversation, logInteraction, intelligence, learnMultipleFacts, selectedAIProvider]);

    // Execute actions internally (for auto-execution)
    const executeActionsInternal = async (actions) => {
        if (!actions || actions.length === 0) return [];

        const failures = [];

        for (const action of actions) {
            try {
                switch (action.type) {
                    case 'add_task':
                        await addTask({
                            title: action.params.title,
                            difficulty: action.params.difficulty || 'easy',
                            deadline: action.params.deadline,
                            subject: action.params.subject,
                            estimatedTime: action.params.estimatedTime
                        });
                        break;
                    case 'edit_task':
                        if (action.params.taskId && action.params.updates) {
                            await updateTask(action.params.taskId, action.params.updates);
                        }
                        break;
                    case 'delete_task':
                        if (action.params.taskId) {
                            await deleteTask(action.params.taskId);
                        }
                        break;
                    case 'complete_task':
                        if (action.params.taskId) {
                            await completeTask(action.params.taskId);
                        }
                        break;
                    case 'add_schedule': {
                        // Parse and fix timezone for startTime
                        let fixedStartTime = action.params.startTime;
                        if (fixedStartTime) {
                            // If the time doesn't include timezone info (no Z or +/-), treat it as local time
                            // JavaScript Date parsing of "2026-01-08T13:00:00" treats it as UTC
                            // We need to interpret it as local time instead
                            if (!fixedStartTime.includes('Z') && !fixedStartTime.match(/[+-]\d{2}:\d{2}$/)) {
                                // Parse as local time components and create a local Date
                                const match = fixedStartTime.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
                                if (match) {
                                    const [, year, month, day, hour, minute] = match;
                                    const localDate = new Date(
                                        parseInt(year),
                                        parseInt(month) - 1, // months are 0-indexed
                                        parseInt(day),
                                        parseInt(hour),
                                        parseInt(minute)
                                    );
                                    fixedStartTime = localDate.toISOString();
                                    console.log('🕐 Fixed schedule time:', action.params.startTime, '->', fixedStartTime);
                                }
                            }
                        }
                        await addScheduleItem({
                            title: action.params.title,
                            startTime: fixedStartTime,
                            duration: action.params.duration || 60,
                            category: action.params.category || 'Other'
                        });
                        break;
                    }
                    case 'edit_schedule':
                        if (action.params.eventId && action.params.updates) {
                            await updateScheduleItem(action.params.eventId, action.params.updates);
                        } else if (!action.params.eventId) {
                            // Fallback: If no eventId, try to create the schedule using saved proposal data
                            console.log('🔄 edit_schedule without eventId, falling back to add_schedule');
                            console.log('📋 Action params:', JSON.stringify(action.params, null, 2));
                            console.log('📋 Active subject:', JSON.stringify(activeSubject, null, 2));
                            console.log('📋 Last proposed schedule:', JSON.stringify(lastProposedSchedule, null, 2));
                            console.log('📋 Pending actions:', JSON.stringify(pendingActions?.actions, null, 2));

                            // Get the pending add_schedule action if it exists
                            const pendingScheduleAction = pendingActions?.actions?.find(a => a.type === 'add_schedule');

                            // Try to extract/merge params from action, lastProposedSchedule, activeSubject, and pending action
                            // Priority: action params > lastProposedSchedule > activeSubject > pendingScheduleAction
                            const title = action.params.title ||
                                action.params.updates?.title ||
                                lastProposedSchedule?.title ||
                                pendingScheduleAction?.params?.title ||
                                activeSubject?.title;

                            let startTime = action.params.startTime ||
                                action.params.updates?.startTime ||
                                action.params.updates?.start_time ||
                                lastProposedSchedule?.startTime ||
                                pendingScheduleAction?.params?.startTime;

                            const duration = action.params.duration ||
                                action.params.updates?.duration ||
                                lastProposedSchedule?.duration ||
                                pendingScheduleAction?.params?.duration ||
                                60;

                            console.log('📋 Merged params:', { title, startTime, duration });

                            // If we have a title to work with
                            if (title) {
                                // If no startTime, default to 1 hour from now
                                if (!startTime) {
                                    const defaultTime = new Date();
                                    defaultTime.setHours(defaultTime.getHours() + 1);
                                    defaultTime.setMinutes(0, 0, 0);
                                    startTime = defaultTime.toISOString();
                                    console.log('⏰ No startTime provided, defaulting to:', startTime);
                                }

                                // Apply timezone fix
                                let fixedStartTime = startTime;
                                if (!fixedStartTime.includes('Z') && !fixedStartTime.match(/[+-]\d{2}:\d{2}$/)) {
                                    const match = fixedStartTime.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
                                    if (match) {
                                        const [, year, month, day, hour, minute] = match;
                                        const localDate = new Date(
                                            parseInt(year),
                                            parseInt(month) - 1,
                                            parseInt(day),
                                            parseInt(hour),
                                            parseInt(minute)
                                        );
                                        fixedStartTime = localDate.toISOString();
                                    }
                                }

                                console.log('✅ Creating schedule with:', { title, startTime: fixedStartTime, duration });
                                await addScheduleItem({
                                    title,
                                    startTime: fixedStartTime,
                                    duration,
                                    category: action.params.category || action.params.updates?.category || lastProposedSchedule?.category || pendingScheduleAction?.params?.category || 'Other'
                                });
                                // Clear the saved proposal after successful creation
                                setLastProposedSchedule(null);
                            } else {
                                console.warn('⚠️ edit_schedule fallback failed: no title found in action, lastProposedSchedule, activeSubject, or pending actions');
                            }
                        }
                        break;
                    case 'delete_schedule':
                        if (action.params.eventId) {
                            await deleteScheduleItem(action.params.eventId);
                        }
                        break;
                    case 'complete_habit':
                        if (action.params.habitId) {
                            const today = toLocalDateKey(new Date());
                            await logHabit?.(action.params.habitId, today, 1, true);
                        }
                        break;
                    case 'info_response':
                    case 'clarify':
                    case 'navigate':
                        // These don't need execution, just display
                        break;
                    case 'remember':
                        if (action.params.note) {
                            await rememberNote(action.params.note);
                        }
                        break;
                    default:
                        console.log('Unknown action type:', action.type);
                }
            } catch (error) {
                console.error('Error executing action:', action.type, error);
                failures.push({
                    actionType: action.type,
                    message: error?.message || 'Unknown error'
                });
            }
        }

        return failures;
    };

    // Confirm and execute pending actions
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
                .then(() => console.log('Conversation cleared'));
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
                aiProviderOptions: AI_PROVIDER_OPTIONS,
                toggleSidebar,
                openSidebar,
                closeSidebar,
                sendMessage,
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
