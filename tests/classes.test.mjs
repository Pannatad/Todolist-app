import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { checklistFor, classNameKey, sortAnnouncements, announcementInput, discoverClasses } from '../src/components/uni-board/classItems.js';
import { buildUniBoardViewModel } from '../src/utils/uniBoardItems.js';

const task = (id, extra = {}) => ({ id, title: id, workspace: 'university', uniKind: 'task', classId: 'comp', classItemKind: 'revision', ...extra });
test('checklist isolates courses, kind, archived and personal records and sorts dated entries first', () => {
  const view = checklistFor([
    task('undated'), task('later', { deadline: '2026-09-10' }), task('earlier', { deadline: '2026-09-09' }),
    task('done', { status: 'harvested' }), task('archived', { archived: true }),
    task('personal', { workspace: 'personal' }), task('other', { classId: 'math' }),
    task('homework', { classItemKind: 'homework' }), task('legacy', { classId: null, classItemKind: null }),
  ], 'comp', 'revision');
  assert.deepEqual(view.active.map((item) => item.id), ['earlier', 'later', 'undated']);
  assert.deepEqual(view.completed.map((item) => item.id), ['done']);
  assert.equal(view.total, 4);
});
test('persisted metadata, progress and reopening agree with shared Overview', () => {
  const record = { id: 'r', title: 'Recursion', workspace: 'university', uni_kind: 'task', class_id: 'comp', class_item_kind: 'revision', deadline: '2026-09-09T09:00:00Z' };
  const now = new Date('2026-09-08T09:00:00Z');
  for (const completed of [false, true, false]) {
    const items = [{ ...record, completed, status: completed ? 'harvested' : 'growing', completed_at: completed ? now.toISOString() : null }];
    assert.equal(checklistFor(items, 'comp', 'revision').completed.length, Number(completed));
    assert.equal(buildUniBoardViewModel({ tasks: items, scheduleItems: [], now }).outstandingTasks.length, completed ? 0 : 1);
  }
});
test('announcement links reject executable protocols and pinned notices sort first', () => {
  assert.throws(() => announcementInput({ title: 'Link', url: 'javascript:alert(1)' }));
  assert.throws(() => announcementInput({ title: '   ' }));
  assert.equal(announcementInput({ title: ' Notice ', url: 'example.edu/room' }).url, 'https://example.edu/room');
  assert.deepEqual(sortAnnouncements([
    { id: 'new', created_at: '2026-09-08' }, { id: 'old', created_at: '2026-09-01' },
    { id: 'pin', pinned: true, created_at: '2026-08-01' },
  ]).map((item) => item.id), ['pin', 'new', 'old']);
});

test('guest classes, discovery, tasks and announcements persist without duplicates', async () => {
  const server = await createServer({ appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false } });
  const previous = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) };
  try {
    const { createClassesRepo } = await server.ssrLoadModule('/src/data/classesRepo.js');
    const { createTasksRepo } = await server.ssrLoadModule('/src/data/tasksRepo.js');
    const { createScheduleRepo } = await server.ssrLoadModule('/src/data/scheduleRepo.js');
    const repo = createClassesRepo(null);
    const course = await repo.ensureClass(' COMP 1023 ');
    assert.equal((await repo.ensureClass('comp 1023')).id, course.id);
    assert.equal(classNameKey(course.name), 'comp 1023');
    const schedule = createScheduleRepo(null);
    await schedule.create({ id: 'lecture', category: 'COMP 1023', workspace: 'university', uniKind: 'event' });
    await schedule.create({ id: 'lab', category: 'comp 1023 ', workspace: 'university', uniKind: 'event' });
    await schedule.create({ id: 'math', category: 'MATH 1012', workspace: 'university', uniKind: 'event' });
    await schedule.create({ id: 'personal', category: 'Personal' });
    let links = 0;
    const discover = async () => discoverClasses(await schedule.list(), repo, async (item, classId) => { links++; await schedule.update(item.id, { classId }); });
    await discover(); await discover();
    assert.equal(links, 3);
    assert.equal((await createClassesRepo(null).listClasses()).length, 2);
    assert.equal((await schedule.list()).find((item) => item.id === 'lab').classId, course.id);
    assert.equal((await schedule.list()).find((item) => item.id === 'personal').classId, null);
    const tasks = createTasksRepo(null);
    await tasks.create(task('revision', { classId: course.id }));
    await tasks.update('revision', { completed: true, status: 'harvested' });
    let saved = (await createTasksRepo(null).list())[0];
    assert.equal(saved.class_item_kind, 'revision');
    assert.equal(checklistFor([saved], course.id, 'revision').completed.length, 1);
    await tasks.update('revision', { completed: false, status: 'growing', completed_at: null, completedAt: null });
    assert.equal(checklistFor(await tasks.list(), course.id, 'revision').active.length, 1);
    await tasks.update('revision', { classId: null, classItemKind: null });
    saved = (await tasks.list())[0];
    assert.equal(saved.class_id, null);
    assert.equal(saved.class_item_kind, null);
    await assert.rejects(tasks.create(task('bad', { workspace: 'personal', uniKind: null })));
    const notice = await repo.saveAnnouncement(course.id, { title: 'Room changed', body: 'Room 204', url: 'example.edu' });
    await repo.saveAnnouncement(course.id, { ...notice, pinned: true }, notice.id);
    assert.equal((await createClassesRepo(null).listAnnouncements())[0].pinned, true);
    await repo.deleteAnnouncement(notice.id);
    assert.equal((await repo.listAnnouncements()).length, 0);
    await assert.rejects(repo.saveAnnouncement('missing', { title: 'Invalid class' }));
    const originalWrite = globalThis.localStorage.setItem;
    globalThis.localStorage.setItem = () => { throw new Error('Storage is full'); };
    await assert.rejects(repo.ensureClass('PHYS 1000'), /Storage is full/);
    globalThis.localStorage.setItem = originalWrite;
    assert.equal((await repo.listClasses()).length, 2);
  } finally { globalThis.localStorage = previous; await server.close(); }
});

test('cloud class repository scopes reads and writes to the current user and never falls back to guest storage', async () => {
  const server = await createServer({ appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false } });
  try {
    const { createClassesRepo } = await server.ssrLoadModule('/src/data/classesRepo.js');
    const calls = [];
    let fail = false;
    const client = { from(table) {
      const record = { table, filters: [], payload: null }; calls.push(record);
      const query = {
        select() { return query; }, order() { return query; }, single() { return query; },
        eq(key, value) { record.filters.push([key, value]); return query; },
        upsert(payload, options) { record.payload = payload; record.options = options; return query; },
        insert(payload) { record.payload = payload; return query; },
        update(payload) { record.payload = payload; return query; }, delete() { return query; },
        then(resolve, reject) { return Promise.resolve({ data: { id: 'class' }, error: fail ? new Error('Offline') : null }).then(resolve, reject); },
      }; return query;
    } };
    const repo = createClassesRepo({ id: 'user-a' }, client);
    await repo.listClasses(); await repo.listAnnouncements(); await repo.ensureClass('COMP 1023');
    await repo.saveAnnouncement('class', { title: 'Notice' });
    await repo.saveAnnouncement('class', { title: 'Edit' }, 'notice');
    await repo.deleteAnnouncement('notice');
    for (const call of calls) assert.ok(call.payload?.user_id === 'user-a' || call.filters.some(([key, value]) => key === 'user_id' && value === 'user-a'));
    assert.equal(calls.find((call) => call.options)?.options.ignoreDuplicates, true);
    fail = true;
    await assert.rejects(repo.listClasses(), /Offline/);
    await assert.rejects(repo.saveAnnouncement('class', { title: 'Retain draft' }), /Offline/);
  } finally { await server.close(); }
});

test('cloud task and timetable payloads persist class metadata and clear task assignment', async () => {
  const server = await createServer({ appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false } });
  try {
    const { createTasksRepo } = await server.ssrLoadModule('/src/data/tasksRepo.js');
    const { createScheduleRepo } = await server.ssrLoadModule('/src/data/scheduleRepo.js');
    const calls = [];
    const client = { from(table) {
      const call = { table }; calls.push(call);
      const query = {
        insert(payload) { call.payload = payload[0]; return query; },
        update(payload) { call.payload = payload; return query; },
        select() { return query; }, eq() { return query; }, single() { return query; }, maybeSingle() { return query; },
        then(resolve, reject) { return Promise.resolve({ data: { id: 'saved', ...call.payload }, error: null }).then(resolve, reject); },
      }; return query;
    } };
    const tasks = createTasksRepo({ id: 'owner' }, client);
    const saved = await tasks.create(task('original', { user_id: 'owner' }));
    assert.equal(calls[0].payload.class_id, 'comp');
    assert.equal(calls[0].payload.class_item_kind, 'revision');
    assert.equal('classId' in calls[0].payload, false);
    assert.equal(saved.classId, 'comp');
    await tasks.update('saved', { classId: null, classItemKind: null }, { ...saved, classId: null, classItemKind: null });
    assert.equal(calls[1].payload.class_id, null);
    assert.equal(calls[1].payload.class_item_kind, null);
    const schedules = createScheduleRepo({ id: 'owner' }, client);
    const session = await schedules.create({ workspace: 'university', uniKind: 'event', classId: 'comp', user_id: 'owner', title: 'Lecture' });
    assert.equal(calls[2].payload.class_id, 'comp');
    assert.equal(session.classId, 'comp');
    await schedules.update('saved', { classId: 'math' }, session);
    assert.equal(calls[3].payload.class_id, 'math');
  } finally { await server.close(); }
});

test('renaming and deleting a class updates only its linked records and survives reload', async () => {
  const server = await createServer({ appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false } });
  const previous = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
  try {
    const { createClassesRepo } = await server.ssrLoadModule('/src/data/classesRepo.js');
    const { createTasksRepo } = await server.ssrLoadModule('/src/data/tasksRepo.js');
    const { createScheduleRepo } = await server.ssrLoadModule('/src/data/scheduleRepo.js');
    const repo = createClassesRepo(null), tasks = createTasksRepo(null), schedules = createScheduleRepo(null);
    const course = await repo.ensureClass('COMP 1023');
    const other = await repo.ensureClass('MATH 1012');
    await tasks.create(task('linked', { classId: course.id }));
    await tasks.create(task('other', { classId: other.id }));
    await tasks.create({ id: 'personal', title: 'Personal' });
    await schedules.create({ id: 'session', title: 'COMP 1023 Lecture', category: course.name, classId: course.id, workspace: 'university', uniKind: 'event' });
    await schedules.create({ id: 'custom', title: 'Guest speaker', category: course.name, classId: course.id, workspace: 'university', uniKind: 'event' });
    await schedules.create({ id: 'other-session', title: 'Math', classId: other.id, workspace: 'university', uniKind: 'event' });
    await repo.saveAnnouncement(course.id, { title: 'Course notice' });
    await repo.saveAnnouncement(other.id, { title: 'Other notice' });
    await assert.rejects(repo.renameClass(course.id, ' math 1012 '), /already exists/);
    await assert.rejects(repo.renameClass(course.id, '  '), /Enter a class name/);
    const renamed = await repo.renameClass(course.id, ' COMP 2011 ');
    assert.equal(renamed.id, course.id);
    assert.equal((await tasks.list()).find((item) => item.id === 'linked').subject, 'COMP 2011');
    assert.equal((await schedules.list()).find((item) => item.id === 'session').title, 'COMP 2011 Lecture');
    assert.equal((await schedules.list()).find((item) => item.id === 'custom').title, 'Guest speaker');
    assert.equal((await createClassesRepo(null).listClasses()).find((item) => item.id === course.id).name, 'COMP 2011');
    const before = new Map(values);
    const realWrite = globalThis.localStorage.setItem;
    let writes = 0;
    globalThis.localStorage.setItem = (key, value) => { if (++writes === 2) throw new Error('Storage full'); realWrite(key, value); };
    await assert.rejects(repo.deleteClass(course.id), /Storage full/);
    assert.deepEqual(values, before, 'partial guest mutation rolls back');
    globalThis.localStorage.setItem = realWrite;
    await repo.deleteClass(course.id);
    assert.deepEqual((await tasks.list()).map((item) => item.id), ['other', 'personal']);
    assert.deepEqual((await schedules.list()).map((item) => item.id), ['other-session']);
    assert.deepEqual((await repo.listAnnouncements()).map((item) => item.title), ['Other notice']);
    await discoverClasses(await schedules.list(), repo, () => { throw new Error('No relinking expected'); });
    assert.deepEqual((await createClassesRepo(null).listClasses()).map((item) => item.id), [other.id]);
  } finally { globalThis.localStorage = previous; await server.close(); }
});

test('cloud class actions use atomic RPCs and propagate failures', async () => {
  const server = await createServer({ appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false } });
  try {
    const { createClassesRepo } = await server.ssrLoadModule('/src/data/classesRepo.js');
    const calls = [];
    const client = { rpc: async (name, args) => { calls.push({ name, args }); return { data: { id: 'course', name: args.new_name }, error: null }; } };
    const repo = createClassesRepo({ id: 'owner' }, client);
    assert.equal((await repo.renameClass('course', ' New name ')).name, 'New name');
    await repo.deleteClass('course');
    assert.deepEqual(calls, [
      { name: 'rename_uni_board_class', args: { target_class_id: 'course', new_name: 'New name' } },
      { name: 'delete_uni_board_class', args: { target_class_id: 'course' } },
    ]);
    client.rpc = async () => ({ error: new Error('Class not found') });
    await assert.rejects(repo.deleteClass('another-owner'), /Class not found/);
  } finally { await server.close(); }
});
