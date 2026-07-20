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
    'save_template',
    'apply_template',
    'delete_template',
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

// Verbs that mutate app data (tasks, schedule, habits, goals, templates).
const APP_ACTION_VERBS = 'add|create|make|schedule|book|block|set\\s+up|put|edit|update|change|modify|move|shift|push|rename|recolou?r|retag|reschedule|delete|remove|clear|cancel|drop|duplicate|copy|clone|repeat|complete|finish|mark|log|plan|apply|save|remember|remind|tag|categor(?:y|ise|ize)|colou?r|highlight|set';
// Command verbs that almost never appear in a plain question, so we can trust
// them even when they aren't the first word ("for Friday, duplicate my gym block").
const UNAMBIGUOUS_COMMAND_VERBS = 'add|create|schedule|delete|remove|cancel|duplicate|copy|move|shift|reschedule|rename|retag|recolou?r|plan|apply|save';
// Filler/polite lead-ins that can precede the real verb.
const ACTION_LEAD_IN = "(?:please\\s+|can\\s+you\\s+(?:please\\s+)?|could\\s+you\\s+(?:please\\s+)?|would\\s+you\\s+(?:please\\s+)?|hey[,!\\s]+|ok(?:ay)?[,!\\s]+|now[,!\\s]+|also[,!\\s]+|then[,!\\s]+|let'?s\\s+|i\\s+(?:want|need|would\\s+like|wanna)\\s+(?:to\\s+|you\\s+to\\s+)?)*";

const DIRECT_APP_ACTION = new RegExp(`^\\s*${ACTION_LEAD_IN}(?:${APP_ACTION_VERBS})\\b`, 'i');
const COMMAND_VERB_ANYWHERE = new RegExp(`\\b(?:${UNAMBIGUOUS_COMMAND_VERBS})\\b`, 'i');
// Interrogative / explanatory openers keep a message in conversation mode even
// if it mentions an action verb ("How do I create a task?").
const QUESTION_LEAD = /^\s*(?:how|what|whats|what's|why|when|where|who|whose|which|is|are|am|do|does|did|should|could|would|will|can\s+i|may\s+i|tell\s+me|explain|describe|give\s+me|show\s+me\s+how|help\s+me\s+understand)\b/i;
const CONVERT_TO_ACTIONS = /^\s*(?:please\s+)?(?:turn|convert)\b.*\b(?:tasks?|schedule|events?|actions?)\b/i;
const REFINE_PENDING_ACTION = /^\s*(?:please\s+)?(?:make|change|move|rename|reschedule|set|use|duplicate|repeat)\b/i;
const APP_CONTEXT_REFERENCE = /\b(?:my\s+day|my\s+week|this\s+week|next\s+week|tasks?|schedule|calendar|agenda|events?|blocks?|meetings?|appointments?|reminders?|templates?|routines?|sessions?|habits?|projects?|goals?|highlights?|priorit(?:y|ies|ize)|deadline|overdue|free\s+(?:time|slots?)|today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;

export const shouldUseAgentActionMode = (message, { hasPendingAction = false } = {}) => {
    const text = String(message || '').trim();
    if (!text) return false;

    if (DIRECT_APP_ACTION.test(text)) return true;
    if (CONVERT_TO_ACTIONS.test(text)) return true;
    if (hasPendingAction && REFINE_PENDING_ACTION.test(text)) return true;

    // A clear command verb applied to app data, even when it isn't the opening
    // word — but not when the sentence is phrased as a question.
    if (
        COMMAND_VERB_ANYWHERE.test(text)
        && APP_CONTEXT_REFERENCE.test(text)
        && !QUESTION_LEAD.test(text)
    ) {
        return true;
    }

    return false;
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
