import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { getLinkDraftError, getLinkHostname, normalizeLinkUrl } from '../src/components/uni-board/linkUtils.js';

test('normalizes safe website URLs and exposes a compact hostname', () => {
    assert.equal(normalizeLinkUrl('portal.example.edu'), 'https://portal.example.edu/');
    assert.equal(normalizeLinkUrl('https://www.example.edu/library'), 'https://www.example.edu/library');
    assert.equal(normalizeLinkUrl('ftp://example.edu'), '');
    assert.equal(normalizeLinkUrl('javascript:alert(1)'), '');
    assert.equal(getLinkHostname('https://www.example.edu/library'), 'example.edu');
    assert.equal(getLinkDraftError({ title: '', url: 'example.edu' }), 'Add a name for this link.');
    assert.equal(getLinkDraftError({ title: 'Library', url: 'not a website' }), 'Enter a valid website URL.');
    assert.equal(getLinkDraftError({ title: 'Library', url: 'library.example.edu' }), '');
});

test('guest Links repository preserves saved links across reload and edits', async () => {
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
        const { createLinksRepo } = await server.ssrLoadModule('/src/data/linksRepo.js');
        const repo = createLinksRepo(null);
        await repo.create({
            id: 'link-library',
            title: 'Library',
            url: 'https://library.example.edu/',
            category: 'Study',
            description: 'Search journals.',
        });

        const reloaded = await createLinksRepo(null).list();
        assert.deepEqual(reloaded[0], {
            id: 'link-library',
            title: 'Library',
            url: 'https://library.example.edu/',
            category: 'Study',
            description: 'Search journals.',
        });

        await createLinksRepo(null).update('link-library', { title: 'Digital library', category: 'Research' });
        const edited = await createLinksRepo(null).list();
        assert.equal(edited[0].title, 'Digital library');
        assert.equal(edited[0].category, 'Research');

        await createLinksRepo(null).remove('link-library');
        assert.deepEqual(await createLinksRepo(null).list(), []);
    } finally {
        if (originalLocalStorage === undefined) delete globalThis.localStorage;
        else globalThis.localStorage = originalLocalStorage;
        await server.close();
    }
});
