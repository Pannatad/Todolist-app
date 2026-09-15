import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('shared sheets expose their title and description as the dialog name', async () => {
  const server = await createServer({
    root: process.cwd(),
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, ws: false },
  });

  try {
    const { Sheet } = await server.ssrLoadModule('/src/ui/Sheet.jsx');
    const html = renderToStaticMarkup(React.createElement(Sheet, {
      open: true,
      onClose: () => {},
      title: 'Edit university item',
      description: 'Update its details.',
      children: React.createElement('p', null, 'Editor'),
    }));

    const labelledBy = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1];
    assert.ok(labelledBy);
    assert.ok(describedBy);
    assert.match(html, new RegExp(`id="${labelledBy}"[^>]*>Edit university item<`));
    assert.match(html, new RegExp(`id="${describedBy}"[^>]*>Update its details\.<`));
  } finally {
    await server.close();
  }
});

test('segmented controls use one keyboard tab stop and expose orientation', async () => {
  const server = await createServer({
    root: process.cwd(),
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, ws: false },
  });

  try {
    const { SegmentedControl } = await server.ssrLoadModule('/src/ui/SegmentedControl.jsx');
    const html = renderToStaticMarkup(React.createElement(SegmentedControl, {
      items: [{ id: 'overview', label: 'Overview' }, { id: 'classes', label: 'Classes' }],
      value: 'overview',
      onChange: () => {},
      ariaLabel: 'University view',
    }));

    assert.match(html, /role="tablist"[^>]*aria-label="University view"[^>]*aria-orientation="horizontal"/);
    assert.equal((html.match(/tabindex="0"/g) || []).length, 1);
    assert.equal((html.match(/tabindex="-1"/g) || []).length, 1);
  } finally {
    await server.close();
  }
});
