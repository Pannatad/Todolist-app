import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildUniBoardViewModel } from '../src/utils/uniBoardItems.js';
import { CalendarDays, ClipboardList, Users } from 'lucide-react';
import { formatDaysRemaining, formatTimeRemaining, getItemIcon } from '../src/components/uni-board/formatters.js';

const localDate = (year, month, day, hour = 12, minute = 0) => (
    new Date(year, month - 1, day, hour, minute, 0, 0)
);

const task = (id, overrides = {}) => ({
    id,
    title: `Task ${id}`,
    workspace: 'university',
    uniKind: 'deadline',
    deadline: null,
    status: 'growing',
    ...overrides
});

const schedule = (id, overrides = {}) => ({
    id,
    title: `Schedule ${id}`,
    workspace: 'university',
    uniKind: 'event',
    startTime: null,
    recurrenceType: 'none',
    completed: false,
    ...overrides
});

const itemTitles = (items) => items.map((item) => item.title);

test('excludes personal task and schedule records', () => {
    const now = localDate(2026, 8, 13, 10);
    const model = buildUniBoardViewModel({
        now,
        tasks: [
            task('personal-task', { workspace: 'personal', uniKind: null, deadline: localDate(2026, 8, 14) }),
            task('university-task', { deadline: localDate(2026, 8, 14) })
        ],
        scheduleItems: [
            schedule('personal-event', { workspace: 'personal', uniKind: null, startTime: localDate(2026, 8, 14, 9) }),
            schedule('university-event', { startTime: localDate(2026, 8, 14, 10) })
        ]
    });

    assert.equal(model.nextUp.some((item) => item.id === 'personal-task'), false);
    assert.equal(model.nextUp.some((item) => item.id === 'personal-event'), false);
    assert.deepEqual(itemTitles(model.nextUp), ['Schedule university-event', 'Task university-task']);
});

test('normalizes camelCase and persisted snake_case records to the locked item shape', () => {
    const now = localDate(2026, 8, 13, 10);
    const model = buildUniBoardViewModel({
        now,
        tasks: [task('camel-task', {
            title: 'Camel task',
            deadline: localDate(2026, 8, 14, 11),
            subject: 'COMP',
            isMilestone: true
        })],
        scheduleItems: [{
            id: 'snake-schedule',
            title: 'Snake quiz',
            workspace: 'university',
            uni_kind: 'quiz',
            start_time: localDate(2026, 8, 14, 12),
            category: 'COMP',
            is_milestone: true,
            recurrence_type: 'none'
        }]
    });

    const [taskItem, scheduleItem] = model.nextUp;
    const expectedKeys = ['key', 'id', 'source', 'title', 'uniKind', 'subject', 'occursAt', 'completed', 'isMilestone', 'record'];
    assert.deepEqual(Object.keys(taskItem), expectedKeys);
    assert.deepEqual(Object.keys(scheduleItem), expectedKeys);
    assert.deepEqual({
        id: taskItem.id,
        source: taskItem.source,
        title: taskItem.title,
        uniKind: taskItem.uniKind,
        subject: taskItem.subject,
        completed: taskItem.completed,
        isMilestone: taskItem.isMilestone,
        record: taskItem.record
    }, {
        id: 'camel-task',
        source: 'task',
        title: 'Camel task',
        uniKind: 'deadline',
        subject: 'COMP',
        completed: false,
        isMilestone: true,
        record: taskItem.record
    });
    assert.equal(scheduleItem.id, 'snake-schedule');
    assert.equal(scheduleItem.source, 'schedule');
    assert.equal(scheduleItem.uniKind, 'quiz');
    assert.equal(scheduleItem.subject, 'COMP');
    assert.equal(scheduleItem.isMilestone, true);
    assert.equal(scheduleItem.record.uni_kind, 'quiz');
});

test('parses YYYY-MM-DD task deadlines as local calendar dates', () => {
    const now = localDate(2026, 8, 13, 23, 30);
    const model = buildUniBoardViewModel({
        now,
        tasks: [task('local-deadline', { title: 'Local deadline', deadline: '2026-08-14' })]
    });

    assert.equal(model.nextUp[0].occursAt.getFullYear(), 2026);
    assert.equal(model.nextUp[0].occursAt.getMonth(), 7);
    assert.equal(model.nextUp[0].occursAt.getDate(), 14);
    assert.equal(model.nextUp[0].occursAt.getHours(), 23);
    assert.equal(model.agendaGroups[0].dateKey, '2026-08-14');
});

test('formats deterministic time remaining labels', () => {
    const now = localDate(2026, 8, 13, 10);

    assert.equal(formatTimeRemaining(localDate(2026, 8, 13, 10, 45), now), '45 min left');
    assert.equal(formatTimeRemaining(localDate(2026, 8, 13, 13), now), '3 hrs left');
    assert.equal(formatTimeRemaining(localDate(2026, 8, 19, 13), now), '6 days left');
    assert.equal(formatTimeRemaining(localDate(2026, 8, 19, 13), localDate(2026, 8, 13, 19)), '6 days left');
    assert.equal(formatTimeRemaining(localDate(2026, 8, 12, 10), now), 'Due now');
});

test('formats agenda day countdowns and keeps item icons unique by kind', () => {
    const now = localDate(2026, 8, 13, 10);

    assert.equal(formatDaysRemaining(localDate(2026, 8, 13, 23), now), 'Today');
    assert.equal(formatDaysRemaining(localDate(2026, 8, 15, 9), now), '2 days left');
    assert.equal(getItemIcon({ uniKind: 'task' }), ClipboardList);
    assert.equal(getItemIcon({ uniKind: 'event' }), CalendarDays);
    assert.equal(getItemIcon({ uniKind: 'meeting' }), Users);
});

test('shows every future dated incomplete entry in chronological order', () => {
    const now = localDate(2026, 8, 13, 10);
    const model = buildUniBoardViewModel({
        now,
        tasks: [
            task('four', { title: '04', deadline: localDate(2026, 8, 16, 9) }),
            task('two', { title: '02', deadline: localDate(2026, 8, 14, 9) }),
            task('seven', { title: '07', deadline: localDate(2026, 8, 19, 9) }),
            task('one', { title: '01', deadline: localDate(2026, 8, 13, 11) }),
            task('three', { title: '03', deadline: localDate(2026, 8, 15, 9) }),
            task('far', { title: 'far', deadline: localDate(2026, 12, 1, 9) }),
            task('completed', { title: 'completed', deadline: localDate(2026, 8, 13, 12), completed: true }),
            task('past', { title: 'past', deadline: localDate(2026, 8, 13, 9) })
        ]
    });

    assert.deepEqual(itemTitles(model.nextUp), ['01', '02', '03', '04', '07', 'far']);
    assert.equal(model.nextUp.length, 6);
});

test('default Agenda covers today plus thirteen days and groups only non-empty dates', () => {
    const now = localDate(2026, 8, 13, 10);
    const model = buildUniBoardViewModel({
        now,
        tasks: [
            task('today', { deadline: '2026-08-13' }),
            task('day-thirteen', { deadline: '2026-08-26' }),
            task('day-fourteen', { deadline: '2026-08-27' })
        ]
    });

    assert.deepEqual(model.agendaGroups.map((group) => group.dateKey), ['2026-08-13', '2026-08-26']);
    assert.equal(model.agendaGroups[0].items.length, 1);
    assert.equal(model.agendaGroups[1].items.length, 1);
});

test('Agenda range lengths include only upcoming dated items in the selected window', () => {
    const now = localDate(2026, 8, 13, 10);
    const tasks = [
        task('day-six', { title: 'day-six', deadline: localDate(2026, 8, 19, 9) }),
        task('day-seven', { title: 'day-seven', deadline: localDate(2026, 8, 20, 9) }),
        task('day-thirty', { title: 'day-thirty', deadline: localDate(2026, 9, 11, 9) }),
        task('day-thirty-one', { title: 'day-thirty-one', deadline: localDate(2026, 9, 13, 9) }),
    ];

    assert.deepEqual(
        buildUniBoardViewModel({ now, tasks, agendaDays: 7 }).agendaGroups.flatMap((group) => group.items).map((item) => item.title),
        ['day-six'],
    );
    assert.deepEqual(
        buildUniBoardViewModel({ now, tasks, agendaDays: 30 }).agendaGroups.flatMap((group) => group.items).map((item) => item.title),
        ['day-six', 'day-seven', 'day-thirty'],
    );
});

test('All Agenda includes future dated tasks and events beyond the default horizon', () => {
    const now = localDate(2026, 8, 13, 10);
    const model = buildUniBoardViewModel({
        now,
        agendaDays: 'all',
        tasks: [task('far-task', { title: 'Far task', deadline: localDate(2027, 12, 1, 9) })],
        scheduleItems: [schedule('far-event', { title: 'Far event', startTime: localDate(2027, 12, 2, 10) })],
    });

    assert.deepEqual(
        model.agendaGroups.flatMap((group) => group.items).map((item) => item.title),
        ['Far task', 'Far event'],
    );
});

test('excludes completed tasks and past scheduled entries from Next up and Agenda', () => {
    const now = localDate(2026, 8, 13, 10);
    const model = buildUniBoardViewModel({
        now,
        tasks: [task('completed-task', { deadline: localDate(2026, 8, 14), completed: true })],
        scheduleItems: [
            schedule('past-event', { startTime: localDate(2026, 8, 13, 9) }),
            schedule('completed-event', { startTime: localDate(2026, 8, 14, 9), completed: true }),
            schedule('future-event', { startTime: localDate(2026, 8, 14, 11) })
        ]
    });

    assert.deepEqual(itemTitles(model.nextUp), ['Schedule future-event']);
    assert.deepEqual(itemTitles(model.agendaGroups.flatMap((group) => group.items)), ['Schedule future-event']);
});

test('keeps overdue tasks out of Agenda and orders Outstanding overdue, future dated, then undated', () => {
    const now = localDate(2026, 8, 13, 10);
    const model = buildUniBoardViewModel({
        now,
        tasks: [
            task('undated', { title: 'undated', deadline: null }),
            task('future', { title: 'future', deadline: localDate(2026, 8, 14, 9) }),
            task('past-today', { title: 'past-today', deadline: localDate(2026, 8, 13, 9) }),
            task('past-day', { title: 'past-day', deadline: localDate(2026, 8, 12, 9) })
        ]
    });

    assert.deepEqual(itemTitles(model.outstandingTasks), ['past-day', 'past-today', 'future', 'undated']);
    assert.deepEqual(itemTitles(model.agendaGroups.flatMap((group) => group.items)), ['future']);
});

test('assessments contain only future university exams and quizzes', () => {
    const now = localDate(2026, 8, 13, 10);
    const model = buildUniBoardViewModel({
        now,
        scheduleItems: [
            schedule('future-exam', { title: 'future exam', uniKind: 'exam', startTime: localDate(2026, 8, 14, 9) }),
            schedule('future-quiz', { title: 'future quiz', uniKind: 'quiz', startTime: localDate(2026, 8, 15, 9) }),
            schedule('future-event', { title: 'future event', uniKind: 'event', startTime: localDate(2026, 8, 16, 9) }),
            schedule('past-quiz', { title: 'past quiz', uniKind: 'quiz', startTime: localDate(2026, 8, 12, 9) }),
            schedule('done-exam', { title: 'done exam', uniKind: 'exam', startTime: localDate(2026, 8, 14, 10), completed: true })
        ]
    });

    assert.deepEqual(itemTitles(model.assessments), ['future exam', 'future quiz']);
});

test('milestones accept flagged upcoming items, auto-accept exams, enforce 120 days, and cap at six', () => {
    const now = localDate(2026, 8, 13, 10);
    const flaggedTasks = Array.from({ length: 6 }, (_, index) => task(`flag-${index}`, {
        title: `flag-${index}`,
        deadline: localDate(2026, 8, 14 + index, 9),
        isMilestone: true
    }));
    const model = buildUniBoardViewModel({
        now,
        tasks: [
            ...flaggedTasks,
            task('unflagged', { title: 'unflagged', deadline: localDate(2026, 8, 20, 9) }),
            task('too-far', { title: 'too-far', deadline: localDate(2026, 12, 12, 9), isMilestone: true })
        ],
        scheduleItems: [schedule('auto-exam', {
            title: 'auto-exam',
            uniKind: 'exam',
            startTime: localDate(2026, 8, 14, 12)
        })]
    });

    assert.equal(model.milestones.length, 6);
    assert.deepEqual(itemTitles(model.milestones), ['flag-0', 'auto-exam', 'flag-1', 'flag-2', 'flag-3', 'flag-4']);
    assert.equal(model.milestones.some((item) => item.title === 'unflagged'), false);
    assert.equal(model.milestones.some((item) => item.title === 'too-far'), false);
});

test('invalid or missing dates do not throw, and undated incomplete tasks remain Outstanding', () => {
    const now = localDate(2026, 8, 13, 10);
    assert.doesNotThrow(() => buildUniBoardViewModel({
        now,
        tasks: [
            task('invalid', { title: 'invalid', deadline: 'not-a-date' }),
            task('missing', { title: 'missing' }),
            task('valid', { title: 'valid', deadline: localDate(2026, 8, 14) })
        ],
        scheduleItems: [schedule('invalid-schedule', { startTime: 'not-a-date' })]
    }));
    const model = buildUniBoardViewModel({
        now,
        tasks: [task('invalid', { title: 'invalid', deadline: 'not-a-date' }), task('missing', { title: 'missing' })]
    });
    assert.deepEqual(itemTitles(model.outstandingTasks), ['invalid', 'missing']);
    assert.equal(model.nextUp.length, 0);
});

test('guest repositories preserve university metadata across create, update, and reload without real localStorage', async () => {
    const server = await createServer({
        root: process.cwd(),
        appType: 'custom',
        server: { middlewareMode: true, hmr: false, ws: false }
    });
    try {
        const [{ createTasksRepo }, { createScheduleRepo }] = await Promise.all([
            server.ssrLoadModule('/src/data/tasksRepo.js'),
            server.ssrLoadModule('/src/data/scheduleRepo.js')
        ]);
        const originalLocalStorage = globalThis.localStorage;
        const values = new Map();
        globalThis.localStorage = {
            getItem: (key) => values.get(key) ?? null,
            setItem: (key, value) => values.set(key, String(value)),
            removeItem: (key) => values.delete(key)
        };
        try {
            const tasksRepo = createTasksRepo(null);
            const scheduleRepo = createScheduleRepo(null);
            await tasksRepo.create({
                id: 'guest-task',
                title: 'Guest deadline',
                workspace: 'university',
                uniKind: 'deadline',
                isMilestone: true,
                deadline: '2026-08-20'
            });
            await scheduleRepo.create({
                id: 'guest-schedule',
                title: 'Guest exam',
                workspace: 'university',
                uni_kind: 'exam',
                is_milestone: true,
                start_time: '2026-08-21T09:00:00.000Z',
                recurrence_type: 'none'
            });

            const reloadedTasks = await createTasksRepo(null).list();
            const reloadedSchedule = await createScheduleRepo(null).list();
            const taskRecord = reloadedTasks.find((record) => record.id === 'guest-task');
            const scheduleRecord = reloadedSchedule.find((record) => record.id === 'guest-schedule');
            assert.equal(taskRecord.workspace, 'university');
            assert.equal(taskRecord.uniKind, 'deadline');
            assert.equal(taskRecord.isMilestone, true);
            assert.equal(scheduleRecord.workspace, 'university');
            assert.equal(scheduleRecord.uniKind, 'exam');
            assert.equal(scheduleRecord.isMilestone, true);

            await createTasksRepo(null).update('guest-task', { uniKind: 'payment', isMilestone: false });
            await createScheduleRepo(null).update('guest-schedule', { uniKind: 'quiz', isMilestone: false });
            const afterUpdateTask = (await createTasksRepo(null).list()).find((record) => record.id === 'guest-task');
            const afterUpdateSchedule = (await createScheduleRepo(null).list()).find((record) => record.id === 'guest-schedule');
            assert.equal(afterUpdateTask.uniKind, 'payment');
            assert.equal(afterUpdateTask.isMilestone, false);
            assert.equal(afterUpdateSchedule.uniKind, 'quiz');
            assert.equal(afterUpdateSchedule.isMilestone, false);
        } finally {
            if (originalLocalStorage === undefined) delete globalThis.localStorage;
            else globalThis.localStorage = originalLocalStorage;
        }
    } finally {
        await server.close();
    }
});

test('university authenticated payload paths retain classification and never use a dropping fallback', async () => {
    const tasksSource = await readFile(new URL('../src/data/tasksRepo.js', import.meta.url), 'utf8');
    const scheduleSource = await readFile(new URL('../src/data/scheduleRepo.js', import.meta.url), 'utf8');

    assert.match(tasksSource, /dbTask\.workspace !== 'university'/);
    assert.match(tasksSource, /delete legacyTask\.workspace/);
    assert.match(tasksSource, /delete legacyTask\.uni_kind/);
    assert.match(tasksSource, /delete legacyTask\.is_milestone/);
    assert.match(scheduleSource, /normalizedItem\.workspace === 'university'\s*\n\s*\? \[buildInsertPayloads\(normalizedItem\)\[0\]\]/);
    assert.match(scheduleSource, /normalizedItem\.workspace === 'university'\s*\n\s*\? \[buildUpdatePayloads\(normalizedUpdates\)\[0\]\]/);
});

test('Agenda renders an inline Notes disclosure and prominent day countdown', async () => {
    const server = await createServer({
        root: process.cwd(),
        appType: 'custom',
        server: { middlewareMode: true, hmr: false, ws: false }
    });
    try {
        const { AgendaItemRow, default: Agenda } = await server.ssrLoadModule('/src/components/uni-board/Agenda.jsx');
        const now = localDate(2026, 8, 13, 10);
        const html = renderToStaticMarkup(React.createElement(Agenda, {
            groups: [{
                dateKey: '2026-08-16',
                date: localDate(2026, 8, 16),
                items: [{
                    key: 'task:brief',
                    id: 'brief',
                    source: 'task',
                    title: 'Read the brief',
                    uniKind: 'task',
                    subject: 'COMP',
                    occursAt: localDate(2026, 8, 16, 9),
                    completed: false,
                    isMilestone: false,
                    record: { description: 'Read it before class.' },
                }],
            }],
            onSelect: () => {},
            isLoading: false,
            now,
        }));

        assert.match(html, /3 days left/);
        assert.match(html, /aria-label="Show notes for Read the brief"/);
        assert.match(html, /uni-board-agenda-row__main/);
        assert.doesNotMatch(html, /uni-board-next-up/);

        const expandedRow = renderToStaticMarkup(React.createElement(AgendaItemRow, {
            item: {
                key: 'task:brief',
                id: 'brief',
                source: 'task',
                title: 'Read the brief',
                uniKind: 'task',
                subject: 'COMP',
                occursAt: localDate(2026, 8, 16, 9),
                completed: false,
                isMilestone: false,
                record: { description: 'Read it before class.' },
            },
            now,
            onSelect: () => {},
            isNotesOpen: true,
            onToggleNotes: () => {},
        }));
        assert.match(expandedRow, /aria-expanded="true"/);
        assert.match(expandedRow, />Notes<\/span>/);
        assert.match(expandedRow, /Read it before class\./);
    } finally {
        await server.close();
    }
});
