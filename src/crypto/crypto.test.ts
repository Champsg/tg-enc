import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stringToArrayBuffer,
  arrayBufferToString,
  buildChatId,
  normalizeUsername,
  generateUserId,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from './crypto.ts';

test('text encoding round-trips', () => {
  const original = 'Hello tg-enc! Simple messaging app';
  assert.equal(arrayBufferToString(stringToArrayBuffer(original)), original);
});

test('base64 helpers round-trip binary bytes', () => {
  const bytes = new Uint8Array([0, 1, 2, 250, 251, 255]);
  assert.deepEqual(base64ToUint8Array(uint8ArrayToBase64(bytes)), bytes);
});

test('chat ids are stable and independent of participant order', () => {
  const ab = buildChatId('u_alice', 'u_bob');
  const ba = buildChatId('u_bob', 'u_alice');

  assert.equal(ab, ba);
  assert.equal(ab, 'chat_u_alice_u_bob');
  assert.notEqual(ab, buildChatId('u_alice', 'u_charlie'));
});

test('usernames normalise and ids look sane', () => {
  assert.equal(normalizeUsername('  @@Alex_99 '), 'alex_99');
  assert.equal(normalizeUsername('Sam Doe!'), 'samdoe');
  assert.ok(generateUserId().startsWith('u_'));
});
