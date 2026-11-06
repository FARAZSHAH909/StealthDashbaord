const https = require('https');
const fs = require('fs');

https.get('https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039/english.txt', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const words = data.trim().split(/\r?\n/);
    const content = `/**
 * STANDARD BIP-39 24-WORD RECOVERY SEED ENGINE
 */

export const WORDLIST = ${JSON.stringify(words, null, 2)};

export async function entropyToMnemonic(entropy) {
  if (entropy.length !== 32) throw new Error("Entropy must be 32 bytes (256 bits)");
  const cryptoObj = globalThis.crypto || window.crypto;
  const hashBuf = await cryptoObj.subtle.digest("SHA-256", entropy);
  const checksum = new Uint8Array(hashBuf)[0];
  const bits = [];
  for (let i = 0; i < entropy.length; i++) {
    for (let b = 7; b >= 0; b--) bits.push((entropy[i] >> b) & 1);
  }
  for (let b = 7; b >= 0; b--) bits.push((checksum >> b) & 1);
  const wordsOut = [];
  for (let i = 0; i < 24; i++) {
    let idx = 0;
    for (let j = 0; j < 11; j++) {
      idx = (idx << 1) | bits[i * 11 + j];
    }
    wordsOut.push(WORDLIST[idx]);
  }
  return wordsOut.join(" ");
}

export async function mnemonicToEntropy(mnemonic) {
  const words = mnemonic.trim().toLowerCase().split(/\\s+/);
  if (words.length !== 24) throw new Error("Recovery phrase must contain exactly 24 words.");
  const bits = [];
  for (const word of words) {
    const idx = WORDLIST.indexOf(word);
    if (idx === -1) throw new Error("Invalid BIP-39 recovery word: " + word);
    for (let b = 10; b >= 0; b--) bits.push((idx >> b) & 1);
  }
  const entropy = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i * 8 + b];
    entropy[i] = byte;
  }
  const cryptoObj = globalThis.crypto || window.crypto;
  const hashBuf = await cryptoObj.subtle.digest("SHA-256", entropy);
  const expectedChecksum = new Uint8Array(hashBuf)[0];
  let actualChecksum = 0;
  for (let b = 0; b < 8; b++) actualChecksum = (actualChecksum << 1) | bits[256 + b];
  if (actualChecksum !== expectedChecksum) throw new Error("Invalid recovery phrase checksum. Verification failed.");
  return entropy;
}
`;
    fs.writeFileSync('src/lib/encryption/bip39.js', content, 'utf8');
    console.log('✓ Successfully wrote src/lib/encryption/bip39.js with 2048 words');
  });
}).on('error', e => console.error(e));

