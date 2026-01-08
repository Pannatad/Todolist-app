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
import { routeAgentCommand } from '../services/gemini';
import { canHandleLocally, generateLocalResponse, getCachedResponse, cacheResponse, generateCacheKey } from '../services/localAgentHandler';
import { sendChatMessage, clearChatSession } from '../services/ConversationService';
import { extractInsightsFromExchange } from '../services/InsightExtractionService';

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
    const { tasks, scheduleItems, addTask, updateTask, deleteTask, addScheduleItem, updateScheduleItem, deleteScheduleItem } = useTask();
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

    // Load conversation from storage on mount
    useEffect(() => {
        loadConversation();
    }, [user]);

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
        const todayStr = today.toISOString().split('T')[0];

        // Filter today's schedule
        const todaySchedule = scheduleItems?.filter(item => {
            if (!item.startTime && !item.start_time) return false;
            const itemDate = new Date(item.startTime || item.start_time);
            return itemDate.toISOString().split('T')[0] === todayStr;
        }) || [];

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
            recentTasks: tasks?.filter(t => !t.archived && !t.completed).slice(0, 15) || [],
            tasksDueToday: tasks?.filter(t => {
                if (t.archived || t.completed || !t.deadline) return false;
                return new Date(t.deadline).toDateString() === today.toDateString();
            }) || [],
            recentSchedule: todaySchedule,
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
                completedToday: h.completedDates?.includes(todayStr)
            })) || [],
            visionGoals: Array.isArray(goals) ? goals.slice(0, 10) : [],
            dailyHighlights: Array.isArray(dailyHighlights) ? dailyHighlights.slice(0, 5) : [],
            memorySummary: getMemorySummary?.(profile) || '',
            intelligenceSummary: getIntelligenceSummary?.() || '',
            recentInteractions: getRecentInteractions?.(5) || [],
            conversationHistory: conversationHistory || null
        };
    }, [tasks, scheduleItems, habits, projects, goals, dailyHighlights, profile, user, messages, getProfileSummary, getMemorySummary, getRecentInteractions, getIntelligenceSummary]);

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
                const cacheKey = generateCacheKey(text);
                const cachedPlan = getCachedResponse(cacheKey);

                if (cachedPlan) {
                    console.log('📦 Using cached response');
                    plan = cachedPlan;
                } else {
                    // Use multi-turn chat API for better context retention
                    console.log('🤖 Using multi-turn chat API...');
                    plan = await sendChatMessage(text, newMessages, context);

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

            if (needsConfirmation) {
                // Store pending actions for confirmation
                setPendingActions({ messageId: aiMessage.id, actions: plan.actions });
                aiMessage.pendingConfirmation = true;
            } else {
                // Auto-execute non-destructive actions
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
    }, [messages, buildContext, saveConversation, logInteraction, intelligence, learnMultipleFacts]);

    // Execute actions internally (for auto-execution)
    const executeActionsInternal = async (actions) => {
        if (!actions || actions.length === 0) return;

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
                            await updateTask(action.params.taskId, {
                                completed: true,
                                completedAt: new Date().toISOString()
                            });
                        }
                        break;
                    case 'add_schedule':
                        await addScheduleItem({
                            title: action.params.title,
                            startTime: action.params.startTime,
                            duration: action.params.duration || 60,
                            category: action.params.category || 'Other'
                        });
                        break;
                    case 'edit_schedule':
                        if (action.params.eventId && action.params.updates) {
                            await updateScheduleItem(action.params.eventId, action.params.updates);
                        }
                        break;
                    case 'delete_schedule':
                        if (action.params.eventId) {
                            await deleteScheduleItem(action.params.eventId);
                        }
                        break;
                    case 'complete_habit':
                        if (action.params.habitId) {
                            const today = new Date().toISOString().split('T')[0];
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
            }
        }
    };

    // Confirm and execute pending actions
    const confirmActions = useCallback(async (messageId) => {
        if (!pendingActions || pendingActions.messageId !== messageId) return;

        await executeActionsInternal(pendingActions.actions);

        // Update message to mark as executed
        setMessages(prev => prev.map(m =>
            m.id === messageId
                ? { ...m, actionsExecuted: true, pendingConfirmation: false }
                : m
        ));
        setPendingActions(null);

        // Add confirmation message
        const confirmMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: "✅ Done! Actions completed successfully.",
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
