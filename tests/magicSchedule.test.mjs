import test from 'node:test';
import assert from 'node:assert/strict';
import {
    autoFitTemplateItems,
    buildFutureTemplateUpdateSteps,
    buildDayPlanSchedulePayloads,
    buildTemplateSchedulePayloads,
    detectScheduleConflicts,
    getScheduleOverlapLayout,
    getTimelinePreviewGeometry,
    normalizeTemplateRecord,
    occurrencesToMagicTemplateBlocks,
    sanitizeMagicTemplateBlocks,
    SCHEDULE_ITEM_KINDS
} from '../src/services/magicSchedule.js';
import {
    buildScheduleAssistantMutationPlan,
    isScheduleAssistantWriteAction,
    normalizeScheduleAssistantActions
} from '../src/services/agentScheduleActions.js';
import { hasExceededDragThreshold } from '../src/utils/pointerGestures.js';

const localIso = (date, time) => new Date(`${date}T${time}:00`).toISOString();

test('schedule block drag waits for deliberate pointer movement', () => {
    assert.equal(hasExceededDragThreshold(100, 100, 103, 104), false);
    assert.equal(hasExceededDragThreshold(100, 100, 106, 100), true);
    assert.equal(hasExceededDragThreshold(100, 100, 104, 105), true);
});

test('template timeline geometry matches the 07:00–22:00 scale and clips edge blocks', () => {
    const morning = getTimelinePreviewGeometry({ startTime: '07:00', duration: 300 });
    assert.equal(morning.left, 0);
    assert.ok(Math.abs(morning.width - (100 / 3)) < 1e-9);

    const afternoon = getTimelinePreviewGeometry({ startTime: '12:00', duration: 300 });
    assert.ok(Math.abs(afternoon.left - (100 / 3)) < 1e-9);
    assert.ok(Math.abs(afternoon.width - (100 / 3)) < 1e-9);

    const clipped = getTimelinePreviewGeometry({ startTime: '06:00', duration: 120 });
    assert.equal(clipped.left, 0);
    assert.ok(Math.abs(clipped.width - (100 / 15)) < 1e-9);

    assert.equal(getTimelinePreviewGeometry({ startTime: '22:00', duration: 60 }), null);
});

test('V1 templates normalize to V2 fixed blocks with stable ids', () => {
    const normalized = normalizeTemplateRecord({
        id: 'template-1',
        name: 'Classic day',
        blocks: [{ title: 'Focus', startTime: '8:30', duration: 120 }]
    });

    assert.equal(normalized.schemaVersion, 2);
    assert.equal(normalized.version, 1);
    assert.equal(normalized.blocks[0].kind, SCHEDULE_ITEM_KINDS.EVENT);
    assert.equal(normalized.blocks[0].id, 'legacy-block-1-0830-focus');
    assert.equal(normalizeTemplateRecord(normalized).blocks[0].id, normalized.blocks[0].id);
    assert.equal(normalized.blocks[0].startTime, '08:30');
});

test('flexible shells keep gaps but drop children outside or overlapping the parent', () => {
    const [shell] = sanitizeMagicTemplateBlocks([{
        id: 'shell',
        kind: SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL,
        title: 'Deep work',
        startTime: '08:30',
        duration: 240,
        children: [
            { id: 'a', title: 'Work 1', startTime: '08:30', duration: 90 },
            { id: 'overlap', title: 'Overlap', startTime: '09:30', duration: 60 },
            { id: 'b', title: 'Work 2', startTime: '10:30', duration: 60 },
            { id: 'outside', title: 'Outside', startTime: '12:00', duration: 90 }
        ]
    }]);

    assert.deepEqual(shell.children.map((child) => child.id), ['a', 'b']);
});

test('template application generates a database-safe UUID for cloud persistence', () => {
    const [payload] = buildTemplateSchedulePayloads({
        id: '550e8400-e29b-41d4-a716-446655440000',
        version: 1,
        name: 'Colored day',
        blocks: [{
            id: 'focus',
            title: 'Focus',
            startTime: '09:00',
            duration: 60,
            color: '#ec4899'
        }]
    }, { date: '2026-07-27' });

    assert.match(payload.templateApplicationId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(payload.color, '#ec4899');
});

test('template application without repeat days stays a one-day schedule', () => {
    const [payload] = buildTemplateSchedulePayloads({
        id: 'template',
        version: 1,
        name: 'One day',
        blocks: [{ id: 'focus', title: 'Focus', startTime: '09:00', duration: 60 }]
    }, { date: '2026-07-27', repeatDays: [] });

    assert.equal(payload.recurrenceType, undefined);
    assert.equal(payload.recurrenceDaysOfWeek, undefined);
    assert.equal(new Date(payload.startTime).getDate(), 27);
});

test('crafting a day creates one-time payloads and preserves flexible children', () => {
    const payloads = buildDayPlanSchedulePayloads({
        date: '2026-07-27',
        blocks: [{
            id: 'shell',
            kind: SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL,
            title: 'Deep work',
            startTime: '09:00',
            duration: 180,
            children: [{ id: 'draft', title: 'Draft', startTime: '09:30', duration: 60 }]
        }]
    });

    assert.equal(payloads.length, 2);
    assert.equal(payloads[0].itemKind, SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL);
    assert.equal(payloads[1].parentClientKey, payloads[0].clientKey);
    assert.equal(payloads[0].recurrenceType, undefined);
    assert.equal(payloads[0].sourceTemplateId, undefined);
    assert.equal(new Date(payloads[0].startTime).getDate(), 27);
});

test('copying a recurring occurrence flattens it to the displayed day', () => {
    const blocks = occurrencesToMagicTemplateBlocks([{
        id: 'series',
        title: 'Study',
        start_time: localIso('2026-07-20', '08:30'),
        displayTime: new Date('2026-07-27T10:00:00'),
        duration: 90,
        item_kind: SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL,
        recurrence_type: 'weekly',
        children: []
    }, {
        id: 'child',
        title: 'Read',
        start_time: localIso('2026-07-20', '09:00'),
        displayTime: new Date('2026-07-27T10:30:00'),
        duration: 30,
        parent_item_id: 'series'
    }]);

    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].startTime, '10:00');
    assert.equal(blocks[0].children[0].startTime, '10:30');
    assert.equal(blocks[0].kind, SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL);
});

test('template application links child events to the shell and inherits recurrence', () => {
    const payloads = buildTemplateSchedulePayloads({
        id: 'template-1',
        version: 3,
        name: 'Deep work day',
        blocks: [{
            id: 'shell',
            kind: SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL,
            title: 'Deep work',
            startTime: '08:30',
            duration: 240,
            children: [{ id: 'child', title: 'Draft', startTime: '09:00', duration: 60 }]
        }]
    }, {
        date: '2026-07-27',
        repeatDays: [1, 3, 5],
        endDate: '2026-08-28',
        applicationId: 'application-1'
    });

    assert.equal(payloads.length, 2);
    assert.equal(payloads[0].itemKind, SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL);
    assert.equal(payloads[1].parentClientKey, payloads[0].clientKey);
    assert.deepEqual(payloads[1].recurrenceDaysOfWeek, [1, 3, 5]);
    assert.equal(payloads[1].sourceTemplateVersion, 3);
    assert.equal(payloads[1].templateApplicationId, 'application-1');
});

test('conflicts allow touching endpoints and protect timed tasks', () => {
    const template = {
        id: 'template',
        version: 1,
        blocks: [{ id: 'focus', title: 'Focus', startTime: '09:00', duration: 60 }]
    };
    const proposedItems = buildTemplateSchedulePayloads(template, { date: '2026-07-27' });
    const adjacent = {
        id: 'adjacent',
        title: 'Before',
        start_time: localIso('2026-07-27', '08:00'),
        duration: 60,
        recurrence_type: 'none'
    };
    const task = {
        id: 'task',
        title: 'Deadline',
        deadline: localIso('2026-07-27', '09:30'),
        estimatedTime: 30
    };
    const conflicts = detectScheduleConflicts({
        proposedItems,
        scheduleItems: [adjacent],
        tasks: [task],
        startDate: '2026-07-27',
        endDate: '2026-07-27'
    });

    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].existing.source, 'task');
    assert.equal(conflicts[0].canReplace, false);
});

test('intentional parent-child overlap is ignored while a shell blocks external events', () => {
    const shell = {
        id: 'shell',
        title: 'Flexible focus',
        start_time: localIso('2026-07-27', '09:00'),
        duration: 180,
        item_kind: SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL,
        recurrence_type: 'none'
    };
    const child = {
        id: 'child',
        title: 'Draft',
        start_time: localIso('2026-07-27', '09:30'),
        duration: 60,
        parent_item_id: 'shell',
        item_kind: SCHEDULE_ITEM_KINDS.EVENT,
        recurrence_type: 'none'
    };
    const proposedItems = buildTemplateSchedulePayloads({
        id: 'template',
        blocks: [{ id: 'external', title: 'External', startTime: '10:00', duration: 30 }]
    }, { date: '2026-07-27' });
    const conflicts = detectScheduleConflicts({
        proposedItems,
        scheduleItems: [shell, child],
        startDate: '2026-07-27',
        endDate: '2026-07-27'
    });

    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].existing.item.id, 'shell');
});

test('independent overlaps receive side-by-side lanes while touching events reuse the lane', () => {
    const items = [
        { id: 'a', startTime: localIso('2026-07-27', '09:00'), duration: 120 },
        { id: 'b', startTime: localIso('2026-07-27', '10:00'), duration: 120 },
        { id: 'c', startTime: localIso('2026-07-27', '12:00'), duration: 60 }
    ];
    const layout = getScheduleOverlapLayout(items);

    assert.equal(layout.a.laneCount, 2);
    assert.equal(layout.b.laneCount, 2);
    assert.notEqual(layout.a.laneIndex, layout.b.laneIndex);
    assert.deepEqual(layout.c, { laneIndex: 0, laneCount: 1 });
});

test('nested events inherit the flexible shell lane instead of competing with their parent', () => {
    const items = [
        {
            id: 'shell',
            startTime: localIso('2026-07-27', '09:00'),
            duration: 180,
            itemKind: SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL
        },
        {
            id: 'child',
            parentItemId: 'shell',
            startTime: localIso('2026-07-27', '10:00'),
            duration: 60
        },
        {
            id: 'external',
            startTime: localIso('2026-07-27', '10:00'),
            duration: 60
        }
    ];
    const layout = getScheduleOverlapLayout(items);

    assert.deepEqual(layout.child, layout.shell);
    assert.equal(layout.shell.laneCount, 2);
    assert.notEqual(layout.shell.laneIndex, layout.external.laneIndex);
});

test('auto-fit rechecks later schedule blocks before presenting the final placement', () => {
    const template = {
        id: 'template',
        blocks: [{ id: 'focus', title: 'Focus', startTime: '09:00', duration: 60 }]
    };
    const proposedItems = buildTemplateSchedulePayloads(template, { date: '2026-07-27' });
    const scheduleItems = [
        { id: 'first', start_time: localIso('2026-07-27', '09:00'), duration: 60 },
        { id: 'second', start_time: localIso('2026-07-27', '10:00'), duration: 60 }
    ];
    const conflicts = detectScheduleConflicts({
        proposedItems,
        scheduleItems,
        startDate: '2026-07-27',
        endDate: '2026-07-27'
    });
    const fitted = autoFitTemplateItems(proposedItems, conflicts, 15, {
        scheduleItems,
        startDate: '2026-07-27',
        endDate: '2026-07-27'
    });

    assert.equal(new Date(fitted[0].startTime).getHours(), 11);
    assert.equal(detectScheduleConflicts({
        proposedItems: fitted,
        scheduleItems,
        startDate: '2026-07-27',
        endDate: '2026-07-27'
    }).length, 0);
});

test('future template updates split recurring series and preserve overrides and detached children', () => {
    const template = {
        id: 'template',
        version: 2,
        blocks: [{
            id: 'shell-block',
            kind: SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL,
            title: 'Updated focus',
            startTime: '08:30',
            duration: 180,
            children: [{ id: 'child-block', title: 'Updated draft', startTime: '09:00', duration: 60 }]
        }]
    };
    const base = {
        startTime: localIso('2026-07-01', '08:30'),
        recurrenceType: 'weekly',
        recurrenceDaysOfWeek: [1, 3, 5],
        recurrenceEndDate: '2026-09-01',
        sourceTemplateId: 'template',
        sourceTemplateVersion: 1,
        templateApplicationId: 'application',
        recurrenceOverrides: { '2026-08-03': { title: 'Custom Monday' } }
    };
    const shell = {
        ...base,
        id: 'shell',
        title: 'Old focus',
        itemKind: SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL,
        templateBlockId: 'shell-block'
    };
    const child = {
        ...base,
        id: 'child',
        title: 'Old draft',
        parentItemId: 'shell',
        templateBlockId: 'child-block'
    };
    const detached = {
        ...base,
        id: 'detached',
        title: 'My renamed draft',
        parentItemId: null,
        templateBlockId: 'child-block'
    };
    const steps = buildFutureTemplateUpdateSteps({
        template,
        applicationItems: [shell, child, detached],
        cutoffDate: '2026-08-01'
    });

    assert.equal(steps.filter((step) => step.type === 'update').length, 2);
    assert.equal(steps.filter((step) => step.type === 'create').length, 2);
    assert.equal(steps.some((step) => step.id === 'detached'), false);
    assert.equal(steps.find((step) => step.type === 'update').updates.recurrenceEndDate, '2026-07-31');
    assert.deepEqual(
        steps.find((step) => step.type === 'create' && step.payload.templateBlockId === 'shell-block').payload.recurrenceOverrides,
        base.recurrenceOverrides
    );
});

test('schedule assistant allowlist rejects task, habit, and project mutations', () => {
    assert.equal(isScheduleAssistantWriteAction('add_schedule'), true);
    assert.equal(isScheduleAssistantWriteAction('save_template'), true);
    assert.equal(isScheduleAssistantWriteAction('add_task'), false);
    assert.equal(isScheduleAssistantWriteAction('complete_habit'), false);
    assert.equal(isScheduleAssistantWriteAction('edit_project'), false);
});

test('assistant multi-date overwrite merges overrides on one recurring series', () => {
    const series = {
        id: 42,
        title: 'Light work',
        start_time: localIso('2026-07-27', '13:30'),
        duration: 120,
        recurrence_type: 'weekly',
        recurrence_days_of_week: [2, 3],
        recurrence_overrides: {}
    };
    const action = {
        type: 'override_schedule_day',
        params: {
            eventId: 42,
            dates: ['2026-07-28', '2026-07-29'],
            updates: {
                title: 'Tutoring (POSN)',
                startTime: '13:00:00',
                duration: 120
            }
        }
    };

    const plan = buildScheduleAssistantMutationPlan([action], [series]);
    assert.equal(plan.unresolved.length, 0);
    assert.equal(plan.steps.length, 2);
    assert.deepEqual(plan.steps[1].updates.recurrenceOverrides, {
        '2026-07-28': {
            title: 'Tutoring (POSN)',
            startTime: '13:00',
            duration: 120
        },
        '2026-07-29': {
            title: 'Tutoring (POSN)',
            startTime: '13:00',
            duration: 120
        }
    });
});

test('assistant overwrite can resolve an existing block by title when the model id is wrong', () => {
    const series = {
        id: 42,
        title: 'Light work',
        start_time: localIso('2026-07-27', '13:30'),
        duration: 120,
        recurrence_type: 'daily',
        recurrence_overrides: {}
    };
    const plan = buildScheduleAssistantMutationPlan([{
        type: 'override_schedule_day',
        params: {
            eventId: 'not-a-real-id',
            existingTitle: 'Light work',
            date: '2026-07-28',
            updates: { title: 'Tutoring', startTime: '13:00', duration: 120 }
        }
    }], [series]);

    assert.equal(plan.unresolved.length, 0);
    assert.equal(plan.steps[0].id, 42);
    assert.equal(plan.steps[0].updates.recurrenceOverrides['2026-07-28'].title, 'Tutoring');
});

test('assistant delete by date removes recurring occurrences without renaming the series', () => {
    const items = [
        {
            id: 'morning',
            title: 'Deep work',
            start_time: localIso('2026-07-27', '09:00'),
            duration: 180,
            recurrence_type: 'weekly',
            recurrence_days_of_week: [1, 2, 3, 4, 5]
        },
        {
            id: 'afternoon',
            title: 'Light work',
            start_time: localIso('2026-07-27', '13:00'),
            duration: 120,
            recurrence_type: 'weekly',
            recurrence_days_of_week: [1, 2, 3, 4, 5]
        }
    ];
    const plan = buildScheduleAssistantMutationPlan([{
        type: 'delete_schedule',
        params: { date: '2026-07-28' }
    }], items);

    assert.equal(plan.unresolved.length, 0);
    assert.equal(plan.steps.length, 2);
    assert.ok(plan.steps.every((step) => step.type === 'delete'));
    assert.deepEqual(
        plan.steps.map((step) => step.options),
        [{ occurrenceDate: '2026-07-28' }, { occurrenceDate: '2026-07-28' }]
    );
    assert.deepEqual(plan.steps.map((step) => step.item.title), ['Deep work', 'Light work']);
});

test('assistant delete can target one recurring block on one date', () => {
    const series = {
        id: 'light-work',
        title: 'Light work',
        start_time: localIso('2026-07-27', '13:00'),
        duration: 120,
        recurrence_type: 'weekly',
        recurrence_days_of_week: [1, 2, 3, 4, 5]
    };
    const plan = buildScheduleAssistantMutationPlan([{
        type: 'delete_schedule',
        params: { title: 'Light work', date: '2026-07-28' }
    }], [series]);

    assert.equal(plan.unresolved.length, 0);
    assert.equal(plan.steps.length, 1);
    assert.equal(plan.steps[0].item.id, 'light-work');
    assert.deepEqual(plan.steps[0].options, { occurrenceDate: '2026-07-28' });
});

test('assistant removal never turns a schedule into a Cancelled title', () => {
    const [action] = normalizeScheduleAssistantActions([{
        type: 'edit_schedule',
        params: { eventId: 'series-1', updates: { title: 'Cancelled' } },
        explanation: 'Cancel the schedule'
    }], 'remove my schedule for tomorrow');

    assert.equal(action.type, 'delete_schedule');
    assert.equal(action.params.eventId, 'series-1');
    assert.match(action.params.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(action.params.updates, undefined);
});

test('assistant delete normalizes relative date words before resolving occurrences', () => {
    const [action] = normalizeScheduleAssistantActions([{
        type: 'delete_schedule',
        params: {}
    }], 'remove every schedule tomorrow');

    assert.match(action.params.date, /^\d{4}-\d{2}-\d{2}$/);
});

test('assistant mutations fail closed instead of reporting success for an unknown target', () => {
    const plan = buildScheduleAssistantMutationPlan([{
        type: 'override_schedule_day',
        params: {
            eventId: 'missing',
            date: '2026-07-28',
            updates: { title: 'Tutoring' }
        }
    }], []);

    assert.equal(plan.steps.length, 0);
    assert.equal(plan.unresolved.length, 1);
    assert.match(plan.unresolved[0].reason, /could not be found/i);
});
