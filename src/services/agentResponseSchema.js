export const AGENT_ACTION_TYPES = [
    'add_task',
    'edit_task',
    'delete_task',
    'complete_task',
    'add_schedule',
    'edit_schedule',
    'delete_schedule',
    'duplicate_schedule',
    'override_schedule_day',
    'plan_day',
    'complete_habit',
    'navigate',
    'info_response',
    'clarify',
    'analyze',
    'remember',
    'set_goal',
];

export const AGENT_PLAN_SCHEMA = {
    type: 'object',
    properties: {
        actions: {
            type: 'array',
            minItems: 1,
            items: {
                type: 'object',
                properties: {
                    type: { type: 'string', enum: AGENT_ACTION_TYPES },
                    params: { type: 'object', additionalProperties: true },
                    explanation: { type: 'string' },
                },
                required: ['type', 'params', 'explanation'],
                additionalProperties: false,
            },
        },
        summary: { type: 'string' },
    },
    required: ['actions', 'summary'],
    additionalProperties: false,
};

export const AGENT_PLAN_RESPONSE_FORMAT = {
    type: 'json_schema',
    json_schema: {
        name: 'productivity_agent_plan',
        strict: true,
        schema: AGENT_PLAN_SCHEMA,
    },
};

const DIRECT_APP_ACTION = /^\s*(?:please\s+)?(?:add|create|schedule|book|block|edit|update|change|move|rename|reschedule|delete|remove|cancel|complete|mark|log|remember|set|remind)\b/i;
const POLITE_APP_ACTION = /^\s*(?:can|could|would)\s+you\s+(?:please\s+)?(?:add|create|schedule|book|block|edit|update|change|move|rename|reschedule|delete|remove|cancel|complete|mark|log|remember|set|remind)\b/i;
const CONVERT_TO_ACTIONS = /^\s*(?:please\s+)?(?:turn|convert)\b.*\b(?:tasks?|schedule|events?|actions?)\b/i;
const REFINE_PENDING_ACTION = /^\s*(?:please\s+)?(?:make|change|move|rename|reschedule|set|use)\b/i;
const APP_CONTEXT_REFERENCE = /\b(?:my\s+day|my\s+week|tasks?|schedule|calendar|agenda|events?|habits?|projects?|goals?|highlights?|priorit(?:y|ies|ize)|deadline|overdue|free\s+(?:time|slots?)|today|tomorrow)\b/i;

export const shouldUseAgentActionMode = (message, { hasPendingAction = false } = {}) => {
    const text = String(message || '').trim();
    if (!text) return false;

    return DIRECT_APP_ACTION.test(text)
        || POLITE_APP_ACTION.test(text)
        || CONVERT_TO_ACTIONS.test(text)
        || (hasPendingAction && REFINE_PENDING_ACTION.test(text));
};

export const shouldIncludeAgentState = (message) => APP_CONTEXT_REFERENCE.test(
    String(message || '')
);

export const extractConversationText = (responseText) => {
    const trimmed = String(responseText || '').trim();
    if (!trimmed) return '';

    const jsonCandidate = trimmed.startsWith('```')
        ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
        : trimmed;

    try {
        const parsed = JSON.parse(jsonCandidate);
        const infoAction = Array.isArray(parsed?.actions)
            ? parsed.actions.find(action => ['info_response', 'clarify'].includes(action?.type))
            : null;

        return infoAction?.params?.message
            || infoAction?.params?.question
            || parsed?.summary
            || trimmed;
    } catch {
        return trimmed;
    }
};

export default AGENT_PLAN_RESPONSE_FORMAT;
