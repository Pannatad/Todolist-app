import test from 'node:test';
import assert from 'node:assert/strict';

import {
  attachmentMetadata,
  buildAttachmentMessage,
  MAX_IMAGE_BYTES,
  validateChatAttachment,
} from '../src/services/chatAttachments.js';

test('chat attachments accept bounded images and PDFs', () => {
  assert.equal(validateChatAttachment({ type: 'image/png', size: 100 }), 'image');
  assert.equal(validateChatAttachment({ type: 'application/pdf', size: 100 }), 'pdf');
  assert.throws(
    () => validateChatAttachment({ type: 'image/png', size: MAX_IMAGE_BYTES + 1 }),
    /6 MB/
  );
  assert.throws(
    () => validateChatAttachment({ type: 'text/plain', size: 100 }),
    /PNG, JPEG, WebP, or PDF/
  );
});

test('image attachments become multimodal message parts without persisting base64 metadata', () => {
  const attachment = {
    kind: 'image',
    name: 'calendar.png',
    mimeType: 'image/jpeg',
    data: 'encoded-image',
    width: 1200,
    height: 800,
  };
  assert.deepEqual(buildAttachmentMessage('Describe this', attachment), [
    { text: 'Describe this' },
    { inlineData: { data: 'encoded-image', mimeType: 'image/jpeg' } },
  ]);
  assert.deepEqual(attachmentMetadata(attachment), {
    kind: 'image',
    name: 'calendar.png',
    mimeType: 'image/jpeg',
    width: 1200,
    height: 800,
  });
});

test('PDF attachments are bounded text context with a truncation notice', () => {
  const message = buildAttachmentMessage('Summarize this', {
    kind: 'pdf',
    name: 'notes.pdf',
    mimeType: 'application/pdf',
    text: 'Page 1:\nImportant notes',
    pageCount: 50,
    truncated: true,
  });
  assert.match(message, /ATTACHED PDF: notes\.pdf/);
  assert.match(message, /Important notes/);
  assert.match(message, /truncated/);
});
