/**
 * Strażnik e-Doręczeń — INT spike (Task 1 GATE, throwaway; not imported by the app).
 *
 * Purpose: validate, against the government INT (test) environment, the three risky
 * operations the whole feature depends on, and — most importantly — answer the
 * load-bearing legal question: does listing/reading a message via the API legally
 * *receive* it and start the fikcja-doręczenia clock?
 *
 * Prerequisites (manual, done in the gov panel — see spec §6.1):
 *   1. Register for INT access, create a test e-Doręczenia mailbox.
 *   2. Generate a keypair + PKCS#10 CSR. For the spike, openssl by hand is fine:
 *        openssl req -new -newkey rsa:2048 -nodes \
 *          -keyout edor-int.key -out edor-int.csr -subj "/CN=<your-ADE-address>"
 *   3. Upload edor-int.csr in the mailbox's "Moduł uprawnień", download the issued
 *      certificate as edor-int.crt (PEM).
 *
 * Run:
 *   cd packages/api
 *   EDOR_INT_BASE_URL=https://<int-ua-host> \
 *   EDOR_INT_CERT_PATH=./edor-int.crt \
 *   EDOR_INT_KEY_PATH=./edor-int.key \
 *   EDOR_INT_ADE=<your-ADE-address> \
 *   EDOR_INT_NIP=<optional-nip-for-SE-lookup> \
 *   EDOR_INT_SE_BASE_URL=<optional-SE-api-host> \
 *   npx tsx scripts/edoreczenia-int-spike.ts
 *
 * NOTE: exact request paths / response field names below are PLACEHOLDERS taken from
 * the plan. Confirm them against the published UA API v3 OpenAPI spec and RECORD the
 * real ones in the findings doc — they override the placeholders in ua-api-client.ts.
 */

import 'dotenv/config';
import fs from 'fs';
import https from 'https';
import axios, { AxiosInstance } from 'axios';

interface Env {
  baseUrl: string;
  certPath: string;
  keyPath: string;
  ade: string;
  nip?: string;
  seBaseUrl?: string;
}

function readEnv(): Env {
  const missing: string[] = [];
  const need = (k: string) => {
    const v = process.env[k];
    if (!v) missing.push(k);
    return v ?? '';
  };
  const env: Env = {
    baseUrl: need('EDOR_INT_BASE_URL'),
    certPath: need('EDOR_INT_CERT_PATH'),
    keyPath: need('EDOR_INT_KEY_PATH'),
    ade: need('EDOR_INT_ADE'),
    nip: process.env.EDOR_INT_NIP,
    seBaseUrl: process.env.EDOR_INT_SE_BASE_URL,
  };
  if (missing.length) {
    console.error(`\n❌ Missing required env vars: ${missing.join(', ')}`);
    console.error('   See the header of this file for the full run command.\n');
    process.exit(1);
  }
  return env;
}

function makeClient(baseURL: string, certPath: string, keyPath: string): AxiosInstance {
  const cert = fs.readFileSync(certPath);
  const key = fs.readFileSync(keyPath);
  return axios.create({
    baseURL,
    httpsAgent: new https.Agent({ cert, key }), // mTLS
    timeout: 30_000,
    // Do not throw on non-2xx — we want to inspect every status/body for the spike.
    validateStatus: () => true,
  });
}

function stamp(): string {
  return new Date().toISOString();
}

async function step<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
  console.log(`\n──────── ${label} @ ${stamp()} ────────`);
  try {
    const out = await fn();
    return out;
  } catch (e) {
    const err = e as { response?: { status?: number; data?: unknown }; message?: string };
    console.error(`✖ ${label} failed:`, err.response?.status ?? '', JSON.stringify(err.response?.data ?? err.message, null, 2));
    return undefined;
  }
}

function dump(label: string, res: { status: number; data: unknown }): void {
  console.log(`${label} → HTTP ${res.status}`);
  console.log(JSON.stringify(res.data, null, 2));
}

async function main() {
  const env = readEnv();
  console.log('e-Doręczenia INT spike');
  console.log('  base URL:', env.baseUrl);
  console.log('  ADE:', env.ade);
  console.log('  started:', stamp());

  const ua = makeClient(env.baseUrl, env.certPath, env.keyPath);

  // (A) LIST messages (envelope metadata). Question: does listing alone legally
  //     receive the messages (start the 14-day clock), or is it a safe read?
  const list = await step('(A) LIST /messages', async () => {
    const res = await ua.get('/messages');
    dump('LIST', res);
    return res;
  });

  // (B) READ / receive one message. Question: is THIS the action that starts the
  //     clock? Record the exact request/response shape (messageId, sender, subject,
  //     received date, attachments[].content encoding).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firstId = (list?.data as any)?.messages?.[0]?.messageId;
  if (firstId) {
    await step(`(B) READ /messages/${firstId}`, async () => {
      const res = await ua.get(`/messages/${encodeURIComponent(String(firstId))}`);
      dump('READ', res);
      return res;
    });
  } else {
    console.log('\n(B) skipped — no messages in the mailbox to read. Send a test letter to the ADE first.');
  }

  // (C) SE API — address lookup by NIP (optional).
  if (env.nip && env.seBaseUrl) {
    const se = makeClient(env.seBaseUrl, env.certPath, env.keyPath);
    await step(`(C) SE address lookup for NIP ${env.nip}`, async () => {
      const res = await se.get(`/addresses`, { params: { nip: env.nip } });
      dump('SE', res);
      return res;
    });
  } else {
    console.log('\n(C) skipped — set EDOR_INT_NIP and EDOR_INT_SE_BASE_URL to test SE address lookup.');
  }

  console.log(`\n════════ ANSWER THESE IN THE FINDINGS DOC ════════`);
  console.log(`  1. Can we obtain + use a certificate for API auth end-to-end?  (onboarding feasibility)`);
  console.log(`  2. Does LISTING receive messages (start the clock), or only an explicit READ?`);
  console.log(`     → decides the autoReceive default: 'off' if either listing or reading starts the clock.`);
  console.log(`  3. Exact list/read/download request+response field names (override ua-api-client.ts placeholders).`);
  console.log(`  4. Rate limits / fair-use caps that constrain a 15-min poll?`);
  console.log(`\n  Verify Q2 by observing the mailbox state / UPD timestamps in the gov panel BEFORE and`);
  console.log(`  AFTER each call above — the API body alone will not tell you the legal status.`);
  console.log(`  finished: ${stamp()}\n`);
}

main().catch((e) => {
  console.error('SPIKE CRASHED:', (e as { response?: { data?: unknown } })?.response?.data ?? e);
  process.exit(1);
});
