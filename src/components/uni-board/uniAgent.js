// Turns plain-language requests ("Linear Algebra midterm Nov 12 at 9") into
// draft university entries. Drafts are never saved here: the user reviews
// them, asks for fixes, and only approved drafts become real items.
import { createGenerativeModel } from '../../services/generativeClient.js';
import { getAIProviderRequestOptions, normalizeAIProvider } from '../../services/aiProvider.js';
import { ALL_KINDS, isScheduleKind } from './constants.js';
import { buildUniversityItemInput } from './universityItemInput.js';

const KIND_VALUES = ALL_KINDS.map((kind) => kind.value);
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

const pad = (value) => String(value).padStart(2, '0');
const localDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const ITEM_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    kind: { type: 'string', enum: KIND_VALUES },
    subject: { type: ['string', 'null'] },
    date: { type: ['string', 'null'] },
    time: { type: ['string', 'null'] },
    durationMinutes: { type: ['number', 'null'] },
    notes: { type: ['string', 'null'] },
  },
  required: ['title', 'kind', 'subject', 'date', 'time', 'durationMinutes', 'notes'],
  additionalProperties: false,
};

export const UNI_AGENT_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'university_entry_drafts',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        reply: { type: 'string' },
        items: { type: 'array', items: ITEM_SCHEMA },
      },
      required: ['reply', 'items'],
      additionalProperties: false,
    },
  },
};

export const buildUniAgentInstruction = ({ now = new Date(), subjects = [] } = {}) => {
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(now);
  const knownSubjects = subjects.length ? subjects.join(', ') : 'none yet';

  return `You turn a student's plain-language request into university entries for their planner.
Today is ${today} (${localDateKey(now)}).
Known subjects: ${knownSubjects}.

Entry kinds:
- exam, quiz, event: happen at a set date and time.
- task, deadline, report, payment, registration, meeting: things to do, with an optional due date.

Rules:
- Return the FULL current list of entries every time, not only the changed ones.
- When the student asks for a fix, change only what they asked about and keep everything else exactly the same.
- If they ask to remove an entry, leave it out. If they add more, append them.
- Resolve relative dates ("next Tuesday", "tomorrow") against today. Dates are YYYY-MM-DD, times are 24-hour HH:MM.
- Never invent a date or time. Use null when it was not given.
- Match subjects to a known subject when it is clearly the same one (for example "linear" means "Linear Algebra"). Otherwise use the subject as written, or null.
- title is short and does not repeat the subject, date or time (for example "Midterm exam").
- durationMinutes only for exam, quiz or event when a length or end time was given; otherwise null.
- notes holds extra details like room or what to bring; otherwise null.
- Nothing is saved yet: these are drafts the student will review. Never say you added, saved or scheduled anything.
- reply is one or two short sentences. Say what you drafted or changed (for example "Drafted your midterm and quiz."). If an exam, quiz or event has no date or time, ask for it by name (for example "What time is the Physics quiz?").

Reply with only JSON: {"reply": string, "items": [{"title", "kind", "subject", "date", "time", "durationMinutes", "notes"}]}`;
};

const cleanText = (value, max = 160) => {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, max) : null;
};

const cleanDate = (value) => {
  const match = typeof value === 'string' ? value.trim().match(DATE_RE) : null;
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 && date.getDate() === day ? match[0] : null;
};

const cleanTime = (value) => {
  const match = typeof value === 'string' ? value.trim().match(TIME_RE) : null;
  return match ? `${pad(match[1])}:${match[2]}` : null;
};

const matchSubject = (value, subjects) => {
  const subject = cleanText(value, 80);
  if (!subject) return null;
  const known = subjects.find((name) => name.toLowerCase() === subject.toLowerCase());
  return known || subject;
};

let draftCounter = 0;
const nextDraftId = () => {
  draftCounter += 1;
  return `draft-${Date.now().toString(36)}-${draftCounter}`;
};

export const sanitizeDraft = (raw, { subjects = [] } = {}) => {
  const title = cleanText(raw?.title);
  if (!title) return null;
  const kind = KIND_VALUES.includes(raw?.kind) ? raw.kind : 'task';
  const duration = Number(raw?.durationMinutes);
  return {
    id: nextDraftId(),
    title,
    kind,
    subject: matchSubject(raw?.subject, subjects),
    date: cleanDate(raw?.date),
    time: cleanTime(raw?.time),
    duration: isScheduleKind(kind) && Number.isFinite(duration) && duration >= 5
      ? Math.min(720, Math.round(duration))
      : (isScheduleKind(kind) ? 60 : null),
    notes: cleanText(raw?.notes, 500),
  };
};

const stripFence = (text) => String(text || '').trim()
  .replace(/^```(?:json)?\s*/i, '')
  .replace(/\s*```$/, '')
  .trim();

export const parseUniAgentResponse = (text, { subjects = [] } = {}) => {
  let parsed;
  try {
    parsed = JSON.parse(stripFence(text));
  } catch {
    const body = stripFence(text);
    const start = body.indexOf('{');
    const end = body.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('The agent sent a reply I could not read. Try again.');
    parsed = JSON.parse(body.slice(start, end + 1));
  }

  const items = (Array.isArray(parsed?.items) ? parsed.items : [])
    .map((item) => sanitizeDraft(item, { subjects }))
    .filter(Boolean)
    .slice(0, 20);

  return {
    reply: cleanText(parsed?.reply, 300) || (items.length ? 'Here is what I will add.' : 'I could not find anything to add.'),
    items,
  };
};

// What still has to be filled in before a draft can be saved.
export const getDraftProblems = (draft) => {
  const problems = [];
  if (!draft?.title) problems.push('title');
  if (isScheduleKind(draft?.kind)) {
    if (!draft?.date) problems.push('date');
    if (!draft?.time) problems.push('time');
  } else if (draft?.time && !draft?.date) {
    problems.push('date');
  }
  return problems;
};

// A plain question for the first draft that can't be saved yet, e.g. "What time is the Physics quiz?"
export const getMissingQuestion = (drafts = []) => {
  const draft = drafts.find((item) => getDraftProblems(item).length > 0);
  if (!draft) return null;
  const problems = getDraftProblems(draft);
  const what = problems.includes('date') && problems.includes('time')
    ? 'date and time'
    : problems.includes('date') ? 'date' : problems.includes('time') ? 'time' : 'title';
  const name = [draft.subject, draft.title?.toLowerCase()].filter(Boolean).join(' ') || 'this entry';
  return `What ${what} is the ${name}?`;
};

export const draftToItemInput = (draft) => buildUniversityItemInput({
  title: draft.title,
  kind: draft.kind,
  when: draft.date ? (draft.time ? `${draft.date}T${draft.time}` : draft.date) : '',
  course: draft.subject || '',
  duration: draft.duration || 60,
  isMilestone: draft.kind === 'exam',
  notes: draft.notes || '',
});

// Plain JSON the model sees for the drafts it made last turn (no ids).
const draftsForModel = (drafts) => drafts.map(({ title, kind, subject, date, time, duration, notes }) => ({
  title, kind, subject, date, time, durationMinutes: isScheduleKind(kind) ? duration : null, notes,
}));

export const buildUniAgentMessage = ({ message, drafts = [] }) => (
  drafts.length
    ? `Current entries:\n${JSON.stringify(draftsForModel(drafts))}\n\nStudent: ${message}`
    : `Student: ${message}`
);

export const readSavedAIProvider = () => {
  try {
    return normalizeAIProvider(localStorage.getItem('chat_ai_provider'));
  } catch {
    return normalizeAIProvider(null);
  }
};

const isOfflineError = (error) => /not reachable|offline|ECONNREFUSED|fetch failed/i.test(error?.message || '');

// history: [{ role: 'user' | 'model', parts: [{ text }] }] from earlier turns.
export const askUniAgent = async ({ message, drafts = [], history = [], subjects = [], now = new Date(), provider = readSavedAIProvider() }) => {
  const userText = buildUniAgentMessage({ message, drafts });
  const ask = async (chosenProvider) => {
    const model = createGenerativeModel({
      ...getAIProviderRequestOptions(chosenProvider),
      systemInstruction: buildUniAgentInstruction({ now, subjects }),
      responseFormat: UNI_AGENT_RESPONSE_FORMAT,
      enableThinking: false,
    });
    const chat = model.startChat({ history, generationConfig: { temperature: 0.2 } });
    const result = await chat.sendMessage(userText);
    return result.response.text();
  };

  let raw;
  let usedProvider = normalizeAIProvider(provider);
  try {
    raw = await ask(usedProvider);
  } catch (error) {
    // Quick entry should still work when the local model isn't running.
    if (usedProvider !== 'local' || !isOfflineError(error)) throw error;
    usedProvider = 'gemini';
    raw = await ask(usedProvider);
  }
  return { ...parseUniAgentResponse(raw, { subjects }), userText, raw, provider: usedProvider };
};
