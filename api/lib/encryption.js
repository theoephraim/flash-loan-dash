const nconf = require('nconf');
const crypto = require('crypto');

const ENCRYPTION_KEY = nconf.get('CRYPTO:key');
const CIPHER_NAME = nconf.get('CRYPTO:cipher_name') || 'aes-256-cbc';
const IV_LENGTH = 16;

function encrypt(plaintext) {
  if (!plaintext) return null;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(CIPHER_NAME, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(plaintext);

  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(encryptedString) {
  if (!encryptedString) return null;

  const textParts = encryptedString.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(CIPHER_NAME, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);

  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}

module.exports = {
  encrypt,
  decrypt,
};
