import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const createClient = () => {
  const calls = [];
  let responseData = { id: 'saved' };
  let responseError = null;
  return {
    calls,
    setResponse(data, error = null) {
      responseData = data;
      responseError = error;
    },
    from(table) {
      const call = { table, action: null, filters: [] };
      calls.push(call);
      const query = {
        update(payload) { call.action = 'update'; call.payload = payload; return query; },
        delete() { call.action = 'delete'; return query; },
        select() { return query; },
        eq(key, value) { call.filters.push([key, value]); return query; },
        maybeSingle() { return query; },
        then(resolve, reject) {
          return Promise.resolve({ data: responseData, error: responseError }).then(resolve, reject);
        },
      };
      return query;
    },
  };
};

test('cloud Uni-board mutations are owner-scoped and fail when no row changes', async () => {
  const server = await createServer({
    root: process.cwd(),
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, ws: false },
  });

  try {
    const [{ createTasksRepo }, { createScheduleRepo }, { createTemplatesRepo }] = await Promise.all([
      server.ssrLoadModule('/src/data/tasksRepo.js'),
      server.ssrLoadModule('/src/data/scheduleRepo.js'),
      server.ssrLoadModule('/src/data/templatesRepo.js'),
    ]);
    const client = createClient();
    const taskRepo = createTasksRepo({ id: 'owner' }, client);
    const scheduleRepo = createScheduleRepo({ id: 'owner' }, client);
    const templateRepo = createTemplatesRepo({ id: 'owner' }, client);
    const task = { id: 'task', title: 'Task', workspace: 'university', uniKind: 'task', status: 'growing' };
    const schedule = { id: 'event', title: 'Event', workspace: 'university', uniKind: 'event', startTime: '2026-09-14T09:00:00.000Z' };

    await taskRepo.update('task', { title: 'Updated task' }, { ...task, title: 'Updated task' });
    await taskRepo.remove('task');
    await scheduleRepo.update('event', { title: 'Updated event' }, { ...schedule, title: 'Updated event' });
    await scheduleRepo.remove('event');
    await templateRepo.update('template', { name: 'Updated', blocks: [], schemaVersion: 2, version: 2 });
    await templateRepo.remove('template');

    assert.equal(client.calls.length, 6);
    for (const call of client.calls) {
      assert.ok(call.filters.some(([key, value]) => key === 'user_id' && value === 'owner'), `${call.table} ${call.action} must be owner-scoped`);
    }

    client.setResponse(null);
    await assert.rejects(taskRepo.update('missing', { title: 'Missing' }, { ...task, id: 'missing' }), /could not be updated/i);
    await assert.rejects(taskRepo.remove('missing'), /could not be deleted/i);
    await assert.rejects(scheduleRepo.update('missing', { title: 'Missing' }, { ...schedule, id: 'missing' }), /could not be updated/i);
    await assert.rejects(scheduleRepo.remove('missing'), /could not be deleted/i);
    await assert.rejects(templateRepo.update('missing', { name: 'Missing', blocks: [], schemaVersion: 2, version: 2 }), /could not be updated/i);
    await assert.rejects(templateRepo.remove('missing'), /could not be deleted/i);
  } finally {
    await server.close();
  }
});

test('guest schedule templates create, edit, delete, and survive repository reloads', async () => {
  const server = await createServer({
    root: process.cwd(),
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, ws: false },
  });
  const originalLocalStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };

  try {
    const { createTemplatesRepo } = await server.ssrLoadModule('/src/data/templatesRepo.js');
    const template = { id: 'template', name: 'Study day', blocks: [{ title: 'Review', startTime: '09:00', duration: 60 }] };
    await createTemplatesRepo(null).create(template);
    assert.equal((await createTemplatesRepo(null).list())[0].name, 'Study day');
    await createTemplatesRepo(null).update('template', { name: 'Exam study day' });
    assert.equal((await createTemplatesRepo(null).list())[0].name, 'Exam study day');
    await createTemplatesRepo(null).remove('template');
    assert.deepEqual(await createTemplatesRepo(null).list(), []);
  } finally {
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalLocalStorage;
    await server.close();
  }
});
