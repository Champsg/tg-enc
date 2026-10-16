import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveRoomKey,
  encryptText,
  decryptText,
  encryptBinary,
  decryptBinary,
  generateSafetyNumber,
  generateRoomId,
  generateRandomPasskey,
  stringToArrayBuffer,
  arrayBufferToString,
} from './crypto.ts';

test('stringToArrayBuffer and arrayBufferToString roundtrip correctly', () => {
  const original = 'Hello tg-enc! 🔐';
  const buffer = stringToArrayBuffer(original);
  const result = arrayBufferToString(buffer);
  assert.equal(result, original);
});

test('deriveRoomKey derives consistent keys for matching passkey and roomId', async () => {
  const passkey = 'secret-test-passkey-123';
  const roomId = 'room-abc';

  const key1 = await deriveRoomKey(passkey, roomId);
  const key2 = await deriveRoomKey(passkey, roomId);

  const num1 = await generateSafetyNumber(key1);
  const num2 = await generateSafetyNumber(key2);

  assert.equal(num1, num2);
  assert.equal(num1.split(' ').length, 12);
});

test('deriveRoomKey derives different keys for different passkeys or roomIds', async () => {
  const keyA = await deriveRoomKey('passkey-one', 'room-abc');
  const keyB = await deriveRoomKey('passkey-two', 'room-abc');

  const numA = await generateSafetyNumber(keyA);
  const numB = await generateSafetyNumber(keyB);

  assert.notEqual(numA, numB);
});

test('encryptText and decryptText accurately protect message content', async () => {
  const key = await deriveRoomKey('quantum-shield-999', 'room-alpha');
  const secretMessage = 'Top secret private rendezvous at 21:00. Bring the keys.';

  const { ciphertext, iv } = await encryptText(secretMessage, key);

  // Ciphertext must not contain plaintext
  assert.notEqual(ciphertext, secretMessage);
  assert.ok(ciphertext.length > 20);
  assert.ok(iv.length > 5);

  const decrypted = await decryptText(ciphertext, iv, key);
  assert.equal(decrypted, secretMessage);
});

test('decryptText fails with incorrect decryption key', async () => {
  const keyValid = await deriveRoomKey('correct-passkey', 'room-alpha');
  const keyWrong = await deriveRoomKey('wrong-passkey', 'room-alpha');

  const { ciphertext, iv } = await encryptText('Sensitive data', keyValid);

  await assert.rejects(async () => {
    await decryptText(ciphertext, iv, keyWrong);
  });
});

test('encryptBinary and decryptBinary correctly encrypt file byte streams', async () => {
  const key = await deriveRoomKey('file-passkey-777', 'room-beta');
  const dummyFileData = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x01, 0x02, 0x03, 0x04]);

  const { ciphertext, iv } = await encryptBinary(dummyFileData, key);
  const decryptedData = await decryptBinary(ciphertext, iv, key);

  assert.deepEqual(decryptedData, dummyFileData);
});

test('generateRoomId and generateRandomPasskey produce non-empty unique tokens', () => {
  const roomId = generateRoomId();
  const passkey = generateRandomPasskey();

  assert.ok(roomId.length >= 6);
  assert.ok(passkey.includes('-'));
});
