import test from 'node:test';
import assert from 'node:assert/strict';

import { installRandomUUIDPolyfill, uuidFromRandomBytes } from '../src/utils/installRandomUUIDPolyfill.js';

test('LAN-compatible UUID fallback produces an RFC 4122 version 4 id', () => {
  const uuid = uuidFromRandomBytes(new Uint8Array(16));
  assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('UUID fallback installs only when randomUUID is missing', () => {
  const fakeCrypto = {
    getRandomValues: (bytes) => bytes.fill(7)
  };
  assert.equal(installRandomUUIDPolyfill(fakeCrypto), true);
  assert.match(fakeCrypto.randomUUID(), /^[0-9a-f-]{36}$/);
  assert.equal(installRandomUUIDPolyfill(fakeCrypto), false);
});
