import test from 'node:test';
import assert from 'node:assert/strict';
import {
    askUniAgent,
    buildUniAgentInstruction,
    buildUniAgentMessage,
    draftToItemInput,
    getDraftProblems,
    getMissingQuestion,
    parseUniAgentResponse,
} from '../src/components/uni-board/uniAgent.js';

const subjects = ['Linear Algebra', 'Physics II'];

test('parses agent drafts, matches known subjects and cleans bad values', () => {
    const { reply, items } = parseUniAgentResponse('```json\n' + JSON.stringify({
        reply: 'Here is your midterm.',
        items: [
            { title: 'Midterm exam', kind: 'exam', subject: 'linear algebra', date: '2026-11-12', time: '9:00', durationMinutes: 120, notes: 'Room B201' },
            { title: 'Problem set', kind: 'homework', subject: null, date: '2026-02-31', time: null, durationMinutes: 30, notes: '' },
            { title: '   ', kind: 'task', subject: null, date: null, time: null, durationMinutes: null, notes: null },
        ],
    }) + '\n```', { subjects });

    assert.equal(reply, 'Here is your midterm.');
    assert.equal(items.length, 2);
    assert.deepEqual(
        { ...items[0], id: undefined },
        { id: undefined, title: 'Midterm exam', kind: 'exam', subject: 'Linear Algebra', date: '2026-11-12', time: '09:00', duration: 120, notes: 'Room B201' },
    );
    // Unknown kind falls back to task, an impossible date is dropped, tasks carry no duration.
    assert.equal(items[1].kind, 'task');
    assert.equal(items[1].date, null);
    assert.equal(items[1].duration, null);
    assert.ok(items[0].id && items[0].id !== items[1].id);
});

test('reads JSON wrapped in extra text and rejects unreadable replies', () => {
    const { items } = parseUniAgentResponse('Sure! {"reply":"ok","items":[{"title":"Quiz 4","kind":"quiz","subject":"Physics II","date":"2026-11-03","time":"13:00","durationMinutes":null,"notes":null}]}');
    assert.equal(items[0].duration, 60);
    assert.throws(() => parseUniAgentResponse('no json here'), /could not read/);
});

test('flags exams without a date or time so they cannot be approved yet', () => {
    assert.deepEqual(getDraftProblems({ title: 'Midterm', kind: 'exam', date: '2026-11-12', time: null }), ['time']);
    assert.deepEqual(getDraftProblems({ title: 'Midterm', kind: 'quiz', date: null, time: null }), ['date', 'time']);
    assert.deepEqual(getDraftProblems({ title: 'Read ch. 7', kind: 'task', date: null, time: null }), []);
    assert.deepEqual(getDraftProblems({ title: 'Essay', kind: 'deadline', date: '2026-11-04', time: null }), []);
});

test('approved drafts become the same records as the manual quick add', () => {
    const exam = draftToItemInput({ title: 'Midterm exam', kind: 'exam', subject: 'Linear Algebra', date: '2026-11-12', time: '09:00', duration: 120, notes: 'Room B201' });
    assert.equal(exam.source, 'schedule');
    assert.equal(exam.payload.startTime, new Date(2026, 10, 12, 9, 0).toISOString());
    assert.equal(exam.payload.duration, 120);
    assert.equal(exam.payload.category, 'Linear Algebra');
    assert.equal(exam.payload.uniKind, 'exam');
    assert.equal(exam.payload.isMilestone, true);
    assert.equal(exam.payload.workspace, 'university');

    const essay = draftToItemInput({ title: 'Essay draft', kind: 'deadline', subject: null, date: '2026-11-04', time: null, duration: null, notes: null });
    assert.equal(essay.source, 'task');
    assert.equal(essay.payload.deadline, '2026-11-04');
    assert.equal(essay.payload.subject, 'University');
    assert.equal(essay.payload.isMilestone, false);
});

test('fix requests send the current drafts so the agent edits instead of starting over', () => {
    assert.equal(buildUniAgentMessage({ message: 'Add my midterm' }), 'Student: Add my midterm');
    const message = buildUniAgentMessage({
        message: 'It starts at 10',
        drafts: [{ id: 'draft-1', title: 'Midterm exam', kind: 'exam', subject: 'Linear Algebra', date: '2026-11-12', time: '09:00', duration: 120, notes: null }],
    });
    assert.match(message, /^Current entries:\n\[\{"title":"Midterm exam","kind":"exam"/);
    assert.doesNotMatch(message, /draft-1/);
    assert.match(message, /Student: It starts at 10$/);

    const instruction = buildUniAgentInstruction({ now: new Date(2026, 9, 31, 10), subjects });
    assert.match(instruction, /Saturday, October 31, 2026 \(2026-10-31\)/);
    assert.match(instruction, /Known subjects: Linear Algebra, Physics II/);
});

test('askUniAgent sends history and drafts through the AI proxy', async () => {
    const originalFetch = globalThis.fetch;
    let sent;
    globalThis.fetch = async (url, options) => {
        sent = { url, body: JSON.parse(options.body) };
        return {
            ok: true,
            json: async () => ({ text: JSON.stringify({ reply: 'Moved it to 10:00.', items: [{ title: 'Midterm exam', kind: 'exam', subject: 'Linear Algebra', date: '2026-11-12', time: '10:00', durationMinutes: 120, notes: null }] }) }),
        };
    };
    try {
        const history = [{ role: 'user', parts: [{ text: 'Student: add midterm' }] }, { role: 'model', parts: [{ text: '{}' }] }];
        const result = await askUniAgent({
            message: 'It starts at 10',
            drafts: [{ id: 'd1', title: 'Midterm exam', kind: 'exam', subject: 'Linear Algebra', date: '2026-11-12', time: '09:00', duration: 120, notes: null }],
            history,
            subjects,
            now: new Date(2026, 9, 31),
            provider: 'gemini',
        });
        assert.equal(sent.url, '/api/ai/chat');
        assert.equal(sent.body.provider, 'gemini');
        assert.deepEqual(sent.body.history, history);
        assert.match(sent.body.message, /Current entries/);
        assert.match(sent.body.systemInstruction, /Known subjects: Linear Algebra/);
        assert.equal(sent.body.responseFormat.json_schema.name, 'university_entry_drafts');
        assert.equal(result.reply, 'Moved it to 10:00.');
        assert.equal(result.items[0].time, '10:00');
        assert.match(result.userText, /Student: It starts at 10/);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('falls back to Gemini when the local model is offline', async () => {
    const originalFetch = globalThis.fetch;
    const providers = [];
    globalThis.fetch = async (url, options) => {
        const body = JSON.parse(options.body);
        providers.push(body.provider);
        if (body.provider === 'lmstudio') {
            return { ok: false, status: 502, json: async () => ({ error: 'LM Studio is not reachable at http://127.0.0.1:1234/v1.' }) };
        }
        return { ok: true, json: async () => ({ text: '{"reply":"Added.","items":[]}' }) };
    };
    try {
        const result = await askUniAgent({ message: 'add quiz', provider: 'local' });
        assert.deepEqual(providers, ['lmstudio', 'gemini']);
        assert.equal(result.provider, 'gemini');
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('asks for the first missing detail by name', () => {
    assert.equal(getMissingQuestion([{ title: 'Midterm', kind: 'exam', subject: 'Linear Algebra', date: '2026-11-05', time: '10:00' }]), null);
    assert.equal(getMissingQuestion([{ title: 'Quiz', kind: 'quiz', subject: 'Physics', date: '2026-11-10', time: null }]), 'What time is the Physics quiz?');
    assert.equal(getMissingQuestion([{ title: 'Career fair', kind: 'event', subject: null, date: null, time: null }]), 'What date and time is the career fair?');
});
