import { createGenerativeModel } from './generativeClient';
import { getAIProviderRequestOptions } from './aiProvider';
import { describeDayBriefing, describeWeekBriefing } from '../components/today/secretary/secretaryData.js';

// The model reads facts the app computed and returns a fixed shape: a headline,
// how the schedule groups, the few things that matter, and what to watch. The
// UI draws the lists itself, so the reply is never a wall of text.

const DAY_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string', description: 'One short line naming the day, under 60 characters.' },
    intensityNote: { type: 'string', description: 'One sentence on how heavy the day is and why.' },
    groups: {
      type: 'array',
      description: 'Schedule blocks grouped by what they are for.',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'Group name such as Classes, Work, Study, Events, Health, Errands, Personal.' },
          blocks: { type: 'array', items: { type: 'string' }, description: 'Exact block titles from the schedule.' },
        },
        required: ['label', 'blocks'],
        additionalProperties: false,
      },
    },
    mainThings: {
      type: 'array',
      description: 'At most three things the day is really about.',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          why: { type: 'string', description: 'Under 12 words.' },
        },
        required: ['title', 'why'],
        additionalProperties: false,
      },
    },
    watchOuts: { type: 'array', items: { type: 'string' }, description: 'Conflicts, tight gaps, overdue work, unmet targets. Empty when nothing stands out.' },
    advice: { type: 'string', description: 'One practical sentence.' },
  },
  required: ['headline', 'intensityNote', 'groups', 'mainThings', 'watchOuts', 'advice'],
  additionalProperties: false,
};

const WEEK_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string', description: 'One short line naming the week ahead, under 60 characters.' },
    overview: { type: 'string', description: 'Two sentences at most on the shape of the week.' },
    dayNotes: {
      type: 'array',
      description: 'One entry per day in the range, in order, each under 12 words.',
      items: {
        type: 'object',
        properties: {
          dateKey: { type: 'string', description: 'YYYY-MM-DD exactly as given.' },
          note: { type: 'string' },
        },
        required: ['dateKey', 'note'],
        additionalProperties: false,
      },
    },
    highlights: {
      type: 'array',
      description: 'Special events worth preparing for: exams, quizzes, one-off events, big deadlines. At most five.',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Exact title from the facts.' },
          note: { type: 'string', description: 'Why it matters or how to prepare, under 14 words.' },
        },
        required: ['title', 'note'],
        additionalProperties: false,
      },
    },
    watchOuts: { type: 'array', items: { type: 'string' }, description: 'Crowded days, clashes, overdue work. Empty when nothing stands out.' },
    advice: { type: 'string', description: 'One practical sentence.' },
  },
  required: ['headline', 'overview', 'dayNotes', 'highlights', 'watchOuts', 'advice'],
  additionalProperties: false,
};

const SYSTEM = `You are a calm, precise personal secretary inside a planner app.
You receive the user's real schedule, tasks, targets and habits as facts. Never invent items, times or counts; only use titles that appear in the facts. Keep every string short and plain. No emoji, no markdown. Reply with a single JSON object that matches the requested schema and nothing else.`;

const responseFormat = (name, schema) => ({ type: 'json_schema', json_schema: { name, strict: true, schema } });

const parseJsonReply = (text) => {
  let body = String(text || '').trim();
  if (body.startsWith('```')) body = body.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('The secretary did not return a structured reply.');
  return JSON.parse(body.slice(start, end + 1));
};

const strings = (value, limit) => (Array.isArray(value) ? value : []).map((item) => String(item || '').trim()).filter(Boolean).slice(0, limit);
const text = (value, fallback = '') => (typeof value === 'string' && value.trim() ? value.trim() : fallback);

const cleanDayReport = (raw, briefing) => {
  const titles = new Set(briefing.blocks.map((block) => block.title));
  return {
    headline: text(raw.headline, `${briefing.dateLabel}`),
    intensityNote: text(raw.intensityNote),
    groups: (Array.isArray(raw.groups) ? raw.groups : [])
      .map((group) => ({ label: text(group?.label, 'Other'), blocks: strings(group?.blocks, 12).filter((title) => titles.has(title)) }))
      .filter((group) => group.blocks.length)
      .slice(0, 6),
    mainThings: (Array.isArray(raw.mainThings) ? raw.mainThings : [])
      .map((item) => ({ title: text(item?.title), why: text(item?.why) }))
      .filter((item) => item.title)
      .slice(0, 3),
    watchOuts: strings(raw.watchOuts, 5),
    advice: text(raw.advice),
  };
};

const cleanWeekReport = (raw, briefing) => {
  const notes = new Map((Array.isArray(raw.dayNotes) ? raw.dayNotes : []).map((item) => [String(item?.dateKey || ''), text(item?.note)]));
  return {
    headline: text(raw.headline, 'Your week ahead'),
    overview: text(raw.overview),
    dayNotes: Object.fromEntries(briefing.days.map((day) => [day.dateKey, notes.get(day.dateKey) || ''])),
    highlights: (Array.isArray(raw.highlights) ? raw.highlights : [])
      .map((item) => ({ title: text(item?.title), note: text(item?.note) }))
      .filter((item) => item.title)
      .slice(0, 5),
    watchOuts: strings(raw.watchOuts, 5),
    advice: text(raw.advice),
  };
};

const ask = async ({ provider, schemaName, schema, instructions, facts }) => {
  const model = createGenerativeModel({
    ...getAIProviderRequestOptions(provider),
    systemInstruction: SYSTEM,
    responseFormat: responseFormat(schemaName, schema),
    enableThinking: false,
  });
  const prompt = `${instructions}\n\nReturn JSON with this schema:\n${JSON.stringify(schema)}\n\nFACTS\n${facts}`;
  const result = await model.generateContent(prompt, { generationConfig: { temperature: 0.3, maxOutputTokens: 1400 } });
  return parseJsonReply(result.response.text());
};

/** Narrative and grouping for one day, from facts built by buildDayBriefing. */
export const summarizeDay = async (briefing, { provider } = {}) => {
  const raw = await ask({
    provider,
    schemaName: 'secretary_day_summary',
    schema: DAY_SCHEMA,
    instructions: 'Summarize this day for the user. Group every schedule block under a label that says what it is for (classes together, work together, and so on). Name the two or three things the day is really about: classes, work, events, hard deadlines. Explain the computed intensity in one sentence. In watchOuts, mention overlapping blocks, overdue tasks, tasks due tomorrow that need time today, and targets or habits still open. Keep strings short.',
    facts: describeDayBriefing(briefing),
  });
  return cleanDayReport(raw, briefing);
};

/** Narrative and highlights for the next seven days, from buildWeekBriefing. */
export const summarizeWeek = async (briefing, { provider } = {}) => {
  const raw = await ask({
    provider,
    schemaName: 'secretary_week_summary',
    schema: WEEK_SCHEMA,
    instructions: 'Summarize the week ahead for the user. Give one short note per day using its dateKey exactly as listed. Pick the special events worth preparing for: exams, quizzes, one-off university events, pinned announcements and the biggest deadlines; use their exact titles. In watchOuts, point out the most crowded days, clashes, overdue work and deadlines that stack up on one day. Keep strings short.',
    facts: describeWeekBriefing(briefing),
  });
  return cleanWeekReport(raw, briefing);
};
