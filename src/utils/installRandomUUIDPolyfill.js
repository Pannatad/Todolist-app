export const uuidFromRandomBytes = (sourceBytes) => {
  const bytes = Uint8Array.from(sourceBytes);
  if (bytes.length !== 16) throw new Error('UUID generation requires exactly 16 random bytes.');

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0'));

  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
};

export const installRandomUUIDPolyfill = (cryptoApi = globalThis.crypto) => {
  if (!cryptoApi || typeof cryptoApi.randomUUID === 'function') return false;
  if (typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('This browser does not provide secure random values.');
  }

  Object.defineProperty(cryptoApi, 'randomUUID', {
    configurable: true,
    value: () => uuidFromRandomBytes(cryptoApi.getRandomValues(new Uint8Array(16)))
  });
  return true;
};

installRandomUUIDPolyfill();
