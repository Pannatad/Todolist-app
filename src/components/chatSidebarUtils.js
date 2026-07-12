import { CalendarClock, ListChecks, RefreshCw, Target, Timer } from 'lucide-react';

const GUIDE_MODES = [
    {
        id: 'plan',
        label: 'Plan',
        icon: CalendarClock,
        title: 'Build a plan',
        fields: [
            { id: 'horizon', label: 'Plan for', options: ['Rest of today', 'Tomorrow', 'This week'] },
            { id: 'priority', label: 'Optimize for', options: ['Finish urgent work', 'Balanced day', 'Deep focus'] },
            { id: 'detail', label: 'Output', options: ['Short plan', 'Time blocks', 'Tasks + schedule'] }
        ],
        prompt: ({ horizon, priority, detail, notes }) => `Help me plan ${horizon}. Optimize for ${priority}. Output as ${detail}. ${notes ? `Extra context: ${notes}.` : ''} If one important detail is missing, ask me one focused follow-up question before finalizing.`
    },
    {
        id: 'prioritize',
        label: 'Prioritize',
        icon: ListChecks,
        title: 'Choose what matters',
        fields: [
            { id: 'scope', label: 'Scope', options: ['Today only', 'Next 48 hours', 'All active tasks'] },
            { id: 'energy', label: 'Energy', options: ['Low', 'Normal', 'High'] },
            { id: 'detail', label: 'Output', options: ['Top 3 only', 'Ranked list', 'Next action plan'] }
        ],
        prompt: ({ scope, energy, detail, notes }) => `Prioritize my tasks for ${scope}. Assume my energy is ${energy}. Output: ${detail}. ${notes ? `Extra context: ${notes}.` : ''} Explain tradeoffs briefly and give one recommended next action.`
    },
    {
        id: 'slots',
        label: 'Free slots',
        icon: Timer,
        title: 'Use open time',
        fields: [
            { id: 'duration', label: 'Slot size', options: ['25 min', '45 min', '90 min'] },
            { id: 'workType', label: 'Best for', options: ['Quick wins', 'Deep work', 'Recovery'] },
            { id: 'detail', label: 'Output', options: ['Best slot', 'All slots', 'Schedule proposal'] }
        ],
        prompt: ({ duration, workType, detail, notes }) => `Find free time slots today. Prefer ${duration} blocks for ${workType}. Output: ${detail}. ${notes ? `Extra context: ${notes}.` : ''} Avoid schedule conflicts and suggest what to do in the best slot.`
    },
    {
        id: 'habits',
        label: 'Habits',
        icon: Target,
        title: 'Recover habits',
        fields: [
            { id: 'effort', label: 'Effort', options: ['Tiny version', 'Normal effort', 'Push today'] },
            { id: 'tone', label: 'Tone', options: ['Gentle', 'Direct', 'Coach me'] },
            { id: 'detail', label: 'Output', options: ['One habit', 'Habit order', 'Habit + schedule'] }
        ],
        prompt: ({ effort, tone, detail, notes }) => `Help me recover my unfinished habits today. Use ${effort}. Tone: ${tone}. Output: ${detail}. ${notes ? `Extra context: ${notes}.` : ''} Make it realistic and not guilt-heavy.`
    },
    {
        id: 'review',
        label: 'Review',
        icon: RefreshCw,
        title: 'Review the day',
        fields: [
            { id: 'focus', label: 'Check for', options: ['Overload', 'Conflicts', 'Missed priorities'] },
            { id: 'depth', label: 'Depth', options: ['Fast scan', 'Detailed', 'Fix it'] },
            { id: 'detail', label: 'Output', options: ['Risks only', 'Fix list', 'Revised plan'] }
        ],
        prompt: ({ focus, depth, detail, notes }) => `Review my day for ${focus}. Depth: ${depth}. Output: ${detail}. ${notes ? `Extra context: ${notes}.` : ''} If there is a conflict or overload, propose the smallest useful fix.`
    }
];

const buildInitialGuideAnswers = (mode) => {
    const answers = {};
    mode.fields.forEach((field) => {
        answers[field.id] = field.options[0];
    });
    answers.notes = '';
    return answers;
};

const TOMORROW_PLANNER_STEPS = [
    {
        id: 'theme',
        label: 'Theme',
        title: '1. What should tomorrow feel like?',
        helper: 'Pick the flow before picking exact times.',
        placeholder: 'Example: calm study day, errands first then deep work, recovery day...',
        chips: ['Deep focus', 'Balanced reset', 'Catch-up day', 'Light recovery', 'Errands first']
    },
    {
        id: 'context',
        label: 'Mind',
        title: '2. What is already in your head?',
        helper: 'Tasks, appointments, constraints, worries, must-dos. Messy is fine.',
        placeholder: 'Example: class at 10, finish essay, gym, call parents, low energy...',
        chips: ['Fixed appointments', 'Urgent task', 'Low energy', 'Need exercise', 'Avoid late night']
    },
    {
        id: 'morning',
        label: 'Morning',
        title: '3. Shape the morning',
        helper: 'What kind of morning would make the rest easier?',
        placeholder: 'Example: wake slow, breakfast, review notes, first focus block...',
        chips: ['Slow start', 'Hardest task first', 'Exercise first', 'Admin first', 'Class prep']
    },
    {
        id: 'afternoon',
        label: 'Afternoon',
        title: '4. Shape the afternoon',
        helper: 'This is usually where the plan needs realism and buffers.',
        placeholder: 'Example: deep work after lunch, errands, study block, meeting buffer...',
        chips: ['Deep work', 'Errands', 'Study block', 'Break buffer', 'Social/meeting']
    },
    {
        id: 'evening',
        label: 'Evening',
        title: '5. Shape the evening',
        helper: 'Choose between finishing, recovery, or setup for the next day.',
        placeholder: 'Example: gym, light review, dinner, clean room, prepare tomorrow...',
        chips: ['Wind down', 'Exercise', 'Light work', 'House reset', 'Prep tomorrow']
    },
    {
        id: 'night',
        label: 'Night',
        title: '6. Shape the night',
        helper: 'Protect sleep and decide what should not happen late.',
        placeholder: 'Example: no heavy work after 9, journal, screen off, sleep by 11...',
        chips: ['Early sleep', 'No heavy work', 'Journal', 'Plan next day', 'Flexible']
    },
    {
        id: 'review',
        label: 'Review',
        title: '7. Review before drafting',
        helper: 'Send this to the agent only when the shape feels close enough.',
        placeholder: '',
        chips: []
    }
];

const createPlannerState = (seed = {}) => ({
    stepIndex: 0,
    answers: {
        theme: seed.theme || '',
        context: seed.context || '',
        morning: '',
        afternoon: '',
        evening: '',
        night: ''
    }
});

const plannerSummaryLines = (answers) => (
    TOMORROW_PLANNER_STEPS
        .filter(step => step.id !== 'review')
        .map(step => `${step.label}: ${answers[step.id]?.trim() || 'Not specified'}`)
);

const buildTomorrowPlannerPrompt = (answers) => `We are slowly crafting my plan for tomorrow. Do not jump to a rigid final schedule.

Use this draft shape:
${plannerSummaryLines(answers).map(line => `- ${line}`).join('\n')}

Please respond in this structure:
Recommendation: give a compact tomorrow flow divided into Morning, Afternoon, Evening, Night.
Why: explain 2-3 tradeoffs you used.
Next step: ask me which single section I want to refine first.

Rules:
- Keep it specific to what I wrote.
- Keep buffers and recovery realistic.
- Do not create tasks or schedule events yet unless I explicitly confirm.`;

const isTomorrowPlanningRequest = (text) => {
    const lower = text.toLowerCase();
    return /\b(plan|schedule|craft|organize)\b/.test(lower) && /\btomorrow\b/.test(lower);
};

export {
    buildInitialGuideAnswers,
    buildTomorrowPlannerPrompt,
    createPlannerState,
    GUIDE_MODES,
    isTomorrowPlanningRequest,
    plannerSummaryLines,
    TOMORROW_PLANNER_STEPS,
};

