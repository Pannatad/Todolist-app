import { useCallback, useRef } from 'react';
import { canHandleLocally, generateLocalResponse } from '../../services/localAgentHandler';
import { sendChatMessage } from '../../services/ConversationService';
import { extractInsightsFromExchange } from '../../services/InsightExtractionService';
import { toLocalDateKey } from '../../utils/scheduleOccurrences';
import { log } from '../../utils/log.js';
import { attachmentMetadata } from '../../services/chatAttachments.js';

const ACTIONS_REQUIRING_CONFIRMATION = [
    'add_task',
    'edit_task',
    'delete_task',
    'add_schedule',
    'edit_schedule',
    'delete_schedule',
    'set_goal',
];

const DISPLAY_ONLY_ACTIONS = ['info_response', 'clarify'];

const ACTION_CONFIRMATION_LABELS = {
    add_task: 'add this task',
    edit_task: 'update this task',
    delete_task: 'delete this task',
    add_schedule: 'add this schedule item',
    edit_schedule: 'update this schedule item',
    delete_schedule: 'delete this schedule item',
    set_goal: 'set this goal',
};

const buildConfirmationMessage = (actions) => {
    if (actions.length !== 1) {
        return `Ready to make ${actions.length} changes. Review the details below and confirm.`;
    }

    const label = ACTION_CONFIRMATION_LABELS[actions[0].type] || 'make this change';
    return `Ready to ${label}. Review the details below and confirm.`;
};

export const useChatActions = ({
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
}) => {
    const activeRequestRef = useRef(null);

    const stopMessage = useCallback(() => {
        activeRequestRef.current?.abort();
    }, []);

    const sendMessage = useCallback(async (text, attachment = null) => {
        if (!text.trim()) return;

        // Add user message
        const userMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: text.trim(),
            attachment: attachmentMetadata(attachment),
            timestamp: new Date().toISOString()
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setIsTyping(true);
        const requestController = new AbortController();
        activeRequestRef.current = requestController;
        let streamingMessageId = null;
        let streamedText = '';

        try {
            // Build context
            const context = buildContext();

            // Try local handling first
            const patternType = canHandleLocally(text);
            let plan;

            if (patternType) {
                log('🚀 Handling locally:', patternType);
                plan = generateLocalResponse(patternType, context);
            } else {
                // Every model turn includes live conversation/app context. Reusing a
                // response by prompt text alone makes follow-ups such as "tell me more"
                // return stale answers from another point in the conversation.
                log('🤖 Using multi-turn chat API with provider:', selectedAIProvider);
                plan = await sendChatMessage(text, newMessages, context, selectedAIProvider, {
                    attachment,
                    enableThinking: selectedAIProvider === 'local' && localThinkingEnabled,
                    signal: requestController.signal,
                    onStream: selectedAIProvider === 'local' ? (fullText) => {
                        streamedText = fullText;
                        streamingMessageId ||= crypto.randomUUID();
                        const streamingMessage = {
                            id: streamingMessageId,
                            role: 'assistant',
                            content: fullText,
                            timestamp: new Date().toISOString(),
                            isStreaming: true
                        };
                        setMessages([...newMessages, streamingMessage]);
                    } : undefined
                });
            }

            // Process the response
            // Extract the actual message content from info_response or clarify actions
            const infoAction = plan.actions?.find(a => a.type === 'info_response' || a.type === 'clarify');
            const planActions = Array.isArray(plan.actions) ? plan.actions : [];
            const executableActions = planActions.filter(action =>
                !DISPLAY_ONLY_ACTIONS.includes(action.type)
            );

            // Check if any actions require confirmation
            const needsConfirmation = executableActions.some(a =>
                ACTIONS_REQUIRING_CONFIRMATION.includes(a.type)
            );

            const modelMessage = infoAction?.params?.message || infoAction?.params?.question || plan.summary || "I'll help you with that.";
            const messageContent = needsConfirmation
                ? buildConfirmationMessage(executableActions)
                : modelMessage;

            const aiMessage = {
                id: streamingMessageId || crypto.randomUUID(),
                role: 'assistant',
                content: messageContent,
                timestamp: new Date().toISOString(),
                renderHint: infoAction?.params?.suggestedTab || null,
                actions: planActions,
                actionsExecuted: false
            };

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
            const newActiveSubject = extractActiveSubject(executableActions);
            if (newActiveSubject) {
                setActiveSubject(newActiveSubject);
            }

            // Debug logging
            log('🔍 Actions received:', planActions.map(a => ({ type: a.type, params: a.params })));
            log('🔍 Actions requiring confirmation:', ACTIONS_REQUIRING_CONFIRMATION);
            log('🔍 needsConfirmation:', needsConfirmation);

            if (needsConfirmation) {
                // Store pending actions for confirmation
                log('⏳ Storing pending actions for confirmation');
                setPendingActions({ messageId: aiMessage.id, actions: executableActions });
                aiMessage.pendingConfirmation = true;

                // Save add_schedule proposal for later recovery (survives pendingActions overwrite)
                const addScheduleAction = executableActions.find(a => a.type === 'add_schedule');
                if (addScheduleAction) {
                    log('💾 Saving lastProposedSchedule:', addScheduleAction.params);
                    setLastProposedSchedule(addScheduleAction.params);
                }
            } else if (executableActions.length > 0) {
                // Auto-execute non-destructive actions
                log('⚡ Auto-executing actions (no confirmation needed)');
                await executeActionsInternal(executableActions);
                aiMessage.actionsExecuted = true;
            }

            const priorMessages = needsConfirmation
                ? newMessages.map(message => message.pendingConfirmation
                    ? { ...message, pendingConfirmation: false, actionsCancelled: true }
                    : message)
                : newMessages;
            const updatedMessages = [...priorMessages, aiMessage];
            setMessages(updatedMessages);
            saveConversation(updatedMessages);

            // Log interaction
            logInteraction?.({
                input: text,
                actions: planActions,
                outcome: 'success'
            });

            // Extract and save insights from user message (async, non-blocking)
            extractInsightsFromExchange(text, messageContent, intelligence || [])
                .then(insights => {
                    if (insights.length > 0) {
                        log('🧠 Learned new insights:', insights);
                        learnMultipleFacts?.(insights);
                    }
                })
                .catch(err => log('Insight extraction skipped:', err.message));

        } catch (error) {
            if (error?.name === 'AbortError') {
                const stoppedMessage = {
                    id: streamingMessageId || crypto.randomUUID(),
                    role: 'assistant',
                    content: streamedText || 'Response stopped.',
                    timestamp: new Date().toISOString(),
                    isStopped: true
                };
                const updatedMessages = [...newMessages, stoppedMessage];
                setMessages(updatedMessages);
                saveConversation(updatedMessages);
                return;
            }
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
            if (activeRequestRef.current === requestController) activeRequestRef.current = null;
            setIsTyping(false);
        }
    // sendMessage preserves the original closure boundary for agent action dispatch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, buildContext, saveConversation, logInteraction, intelligence, learnMultipleFacts, selectedAIProvider, localThinkingEnabled]);

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
                                    log('🕐 Fixed schedule time:', action.params.startTime, '->', fixedStartTime);
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
                            log('🔄 edit_schedule without eventId, falling back to add_schedule');
                            log('📋 Action params:', JSON.stringify(action.params, null, 2));
                            log('📋 Active subject:', JSON.stringify(activeSubject, null, 2));
                            log('📋 Last proposed schedule:', JSON.stringify(lastProposedSchedule, null, 2));
                            log('📋 Pending actions:', JSON.stringify(pendingActions?.actions, null, 2));

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

                            log('📋 Merged params:', { title, startTime, duration });

                            // If we have a title to work with
                            if (title) {
                                // If no startTime, default to 1 hour from now
                                if (!startTime) {
                                    const defaultTime = new Date();
                                    defaultTime.setHours(defaultTime.getHours() + 1);
                                    defaultTime.setMinutes(0, 0, 0);
                                    startTime = defaultTime.toISOString();
                                    log('⏰ No startTime provided, defaulting to:', startTime);
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

                                log('✅ Creating schedule with:', { title, startTime: fixedStartTime, duration });
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
                        log('Unknown action type:', action.type);
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
    return { executeActionsInternal, sendMessage, stopMessage };
};
