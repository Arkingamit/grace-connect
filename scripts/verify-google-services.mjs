#!/usr/bin/env node
/**
 * Checks android/app/google-services.json includes OAuth clients for every
 * SHA-1 registered in Firebase for com.graceconnect.app.
 *
 * Usage: node scripts/verify-google-services.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(__dirname, '../android/app/google-services.json');

/** SHA-1 fingerprints registered in Firebase (lowercase, no colons). */
const EXPECTED_SHA1 = {
  upload: 'd547bc9da72dc3a62a6d2daa50c91e6235159ba5',
  play: 'd09bffef12ae5aa8c3f4a96f201ab00ef69ed51a',
  other: '44888f50370e4e2c2166a0251c771045411f1e4a',
};

const LABELS = {
  [EXPECTED_SHA1.upload]: 'Upload key (Android Studio installs)',
  [EXPECTED_SHA1.play]: 'Play App signing (Play Store installs)',
  [EXPECTED_SHA1.other]: 'Secondary / debug key',
};

function formatSha1(hex) {
  return hex.match(/.{2}/g).join(':').toUpperCase();
}

let raw;
try {
  raw = readFileSync(jsonPath, 'utf8');
} catch {
  console.error('Missing android/app/google-services.json');
  console.error('Download it from Firebase → Project settings → grace-connect-android → google-services.json');
  process.exit(1);
}

const config = JSON.parse(raw);
const android = config.client?.find((c) => c.client_info?.android_client_info?.package_name === 'com.graceconnect.app');

if (!android) {
  console.error('No Android client for com.graceconnect.app in google-services.json');
  process.exit(1);
}

const hashes = (android.oauth_client || [])
  .filter((c) => c.client_type === 1 && c.android_info?.certificate_hash)
  .map((c) => ({
    hash: c.android_info.certificate_hash.toLowerCase(),
    clientId: c.client_id,
  }));

console.log(`Package: com.graceconnect.app`);
console.log(`Project: ${config.project_info?.project_id}`);
console.log(`Android OAuth clients in file: ${hashes.length}\n`);

let ok = true;
for (const [key, hex] of Object.entries(EXPECTED_SHA1)) {
  const found = hashes.find((h) => h.hash === hex);
  const label = LABELS[hex] || key;
  if (found) {
    console.log(`✓ ${formatSha1(hex)}  ${label}`);
    console.log(`  client_id: ${found.clientId}`);
  } else {
    ok = false;
    console.log(`✗ ${formatSha1(hex)}  ${label}  — MISSING from google-services.json`);
  }
}

const webClient = android.oauth_client?.find((c) => c.client_type === 3);
if (webClient) {
  console.log(`\n✓ Web client (serverClientId): ${webClient.client_id}`);
} else {
  ok = false;
  console.log('\n✗ Web client (client_type 3) missing');
}

if (!ok) {
  console.log(`
Fix:
  1. Firebase console → Project settings → grace-connect-android
  2. Confirm all three SHA-1 fingerprints are listed under "SHA certificate fingerprints"
  3. Click "google-services.json" to download a fresh copy
  4. Replace android/app/google-services.json
  5. Re-run: node scripts/verify-google-services.mjs
  6. npx cap sync android

If the upload key SHA-1 is in Firebase but still missing after download:
  Remove D5:47:BC:9D:… from Firebase, save, wait 1 minute, add it back, wait 5 minutes, download again.
`);
  process.exit(1);
}

console.log('\nAll expected SHA-1 clients are present.');
process.exit(0);
