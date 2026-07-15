# Strażnik e-Doręczeń Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend of Strażnik e-Doręczeń — a service that polls a user's Polish government e-Doręczenia mailbox via UA API, AI-analyses each incoming letter, tracks response deadlines, and sends escalating Telegram alerts, plus AI chat tools and REST endpoints.

**Architecture:** A new self-contained service module `packages/api/src/services/edoreczenia/` mirroring the existing `ksef/` module: a facade + adapters/clients, a `setInterval` mailbox poller cloned from `KSeFStatusPoller`, an AI letter-analysis service using LangChain structured output, a deadline+reminder engine cloned from `TaxDeadlineReminderService`, and LangGraph tools cloned from the `ksef.tools.ts` pattern. Private keys and certificates are stored AES-256-GCM encrypted via the existing `CryptoService`.

**Tech Stack:** Node 18+, Express, TypeScript, Prisma (PostgreSQL), Redis, LangChain/LangGraph, Telegraf, Zod, Winston, Jest (ts-jest). New dependency: `node-forge` (PKCS#10 CSR generation).

**Spec:** `docs/superpowers/specs/2026-07-15-edoreczenia-watcher-design.md`

**Out of scope for this plan (separate frontend plan):** the `packages/web` Skrzynka page and the onboarding wizard UI. This plan delivers the backend + REST API those will consume. Reply drafting is out of v1 entirely (per spec §11).

## Global Constraints

- **Spike gate:** Task 1 is a hard gate. Do NOT start Task 2+ product code until the INT spike passes and the `autoReceive` default is decided. If the spike fails, stop and re-plan against the hybrid fallback (spec variant C).
- **UA API version:** UA API **v3** only (v1/v2 deprecated, PROD cutoff 11.01.2026). SE API v3+.
- **Provider:** v1 supports only operator wyznaczony (Poczta Polska); other providers → waitlist, not integrated.
- **Environments:** two — `int` (test) and `prod`. Never hit `prod` from tests or the spike beyond read-only metadata.
- **Secrets:** private key + certificate stored only via `cryptoService.encryptToString()`; the private key never leaves the server and is never logged. Use `CryptoService.mask()` for any identifier logging.
- **Poll interval:** env `EDORECZENIA_POLL_INTERVAL_MINUTES`, default `15`.
- **Dedup key:** `EDoreczeniaLetter` is unique on `[userId, messageId]` where `messageId` is the government message ID.
- **Localization:** every user-facing string (tool output, Telegram alerts) localized pl/en/ru via the `i18n` accessor pattern; default/fallback locale is `pl`.
- **Prisma conventions:** `@id @default(uuid()) @db.Uuid`, snake_case `@@map`, enums lowercase, `@@index` on `userId` and query columns, `onDelete: Cascade` from `User`. Run `npx prisma generate` after every schema change to avoid stale-client `as any` casts.
- **Tool signature:** every LangGraph tool is created with `(tool as any)(handler, { name, description, schema })` and returns a localized formatter string, never a thrown error to the model.
- **Test runner:** `npm run test --filter=@accounting-ai-agent/api` (Jest). Tests live in `__tests__/` next to the code. `clearMocks`/`restoreMocks` are on.
- **Commit cadence:** one commit per task (after its tests pass). Never use `--no-verify`.

---

## Shared Types (created in Task 2, consumed everywhere)

These are the exact names/types later tasks rely on. Defined in `packages/api/src/services/edoreczenia/types.ts`.

```typescript
export type EDoreczeniaEnvironment = 'int' | 'prod';
export type SenderType = 'us' | 'zus' | 'court' | 'other' | 'unknown';
export type LetterType = 'wezwanie' | 'decyzja' | 'zawiadomienie' | 'postanowienie' | 'informacja' | 'inne';
export type LetterSeverity = 'high' | 'medium' | 'low';
export type LetterDeadlineType = 'response_deadline' | 'fikcja_doreczenia' | 'custom';

/** One message as listed by UA API (envelope metadata only, no body). */
export interface UAMessageSummary {
  messageId: string;          // government message ID — the dedup key
  senderName: string | null;
  subject: string | null;
  receivedAt: Date;
  hasAttachments: boolean;
}

export interface UAAttachment {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  content: Buffer;
}

/** Full message after a receiving read. */
export interface UAMessageContent {
  messageId: string;
  bodyText: string;
  attachments: UAAttachment[];
}

export interface LetterDeadline {
  type: LetterDeadlineType;
  dueDate: string;            // ISO 8601 date (YYYY-MM-DD)
  description: string;
}

/** Structured AI analysis result stored in EDoreczeniaLetter.analysis. */
export interface LetterAnalysis {
  summary: string;
  letterType: LetterType;
  severity: LetterSeverity;
  requiredAction: string;
  deadlines: LetterDeadline[];
}
```

---

### Task 1: INT spike — validate certificate onboarding, polling, and fikcja-doręczenia (GATE)

**This task is exploratory validation against the live government INT environment, not TDD.** Its deliverable is a throwaway script plus a written findings doc that decides go/no-go and the `autoReceive` default. No product code depends on the script; Tasks 2+ depend on its *findings*.

**Files:**
- Create: `packages/api/scripts/edoreczenia-int-spike.ts` (throwaway; not imported by app)
- Create: `docs/superpowers/specs/2026-07-15-edoreczenia-spike-findings.md`

- [ ] **Step 1: Register for INT access and obtain a test mailbox**

Follow gov.pl UA API docs (https://www.gov.pl/web/e-doreczenia/interfejsy-api). Create an INT test mailbox, generate a keypair + PKCS#10 CSR **by hand** (openssl is fine for the spike), upload the CSR in the mailbox's Moduł uprawnień, and download the issued certificate. Record each screen and blocker.

- [ ] **Step 2: Write the spike script that exercises the three risky operations**

```typescript
// packages/api/scripts/edoreczenia-int-spike.ts
// Throwaway spike. Run with: npx ts-node packages/api/scripts/edoreczenia-int-spike.ts
// Requires env: EDOR_INT_BASE_URL, EDOR_INT_CERT_PATH, EDOR_INT_KEY_PATH, EDOR_INT_ADE
import fs from 'fs';
import https from 'https';
import axios from 'axios';

async function main() {
  const cert = fs.readFileSync(process.env.EDOR_INT_CERT_PATH!);
  const key = fs.readFileSync(process.env.EDOR_INT_KEY_PATH!);
  const httpsAgent = new https.Agent({ cert, key }); // mTLS
  const client = axios.create({ baseURL: process.env.EDOR_INT_BASE_URL, httpsAgent });

  // (A) List messages (metadata only) — does this alone trigger fikcja doręczenia?
  const list = await client.get('/messages'); // exact path per UA API v3 spec
  console.log('LIST', JSON.stringify(list.data, null, 2));

  // (B) Read/receive one message — record whether THIS is what starts the clock.
  const first = list.data?.messages?.[0];
  if (first) {
    const msg = await client.get(`/messages/${first.messageId}`);
    console.log('READ', JSON.stringify(msg.data, null, 2));
  }

  // (C) Address lookup by NIP via SE API.
  // const se = await client.get(`/addresses?nip=${process.env.EDOR_INT_NIP}`);
}
main().catch((e) => { console.error(e?.response?.data ?? e); process.exit(1); });
```

- [ ] **Step 3: Run the spike and answer the load-bearing questions**

Run: `npx ts-node packages/api/scripts/edoreczenia-int-spike.ts`
Answer, with evidence from responses:
1. Can we obtain and use a certificate for API auth end-to-end? (onboarding feasibility)
2. Does **listing** messages legally receive them (start the response clock), or only an explicit **read/receive** call? (this decides `autoReceive` default)
3. What is the exact message-list/read/download request+response shape (fields for `messageId`, sender, subject, received date, attachments)?
4. Are there rate limits / fair-use caps that constrain a 15-min poll?

- [ ] **Step 4: Write the findings doc and set the gate decision**

Write `docs/superpowers/specs/2026-07-15-edoreczenia-spike-findings.md` containing: go/no-go, the `autoReceive` default (`off` if listing-or-reading starts the clock, `on` only if receipt is a distinct explicit action we control), the real UA API v3 request/response field names (these override the placeholder field names in Tasks 6/10), and any rate-limit constraints.

- [ ] **Step 5: Commit**

```bash
git add packages/api/scripts/edoreczenia-int-spike.ts docs/superpowers/specs/2026-07-15-edoreczenia-spike-findings.md
git commit -m "spike(edoreczenia): INT validation of cert onboarding, polling, fikcja doręczenia"
```

- [ ] **Step 6: GATE — stop unless go**

If no-go: stop this plan; re-plan against the hybrid fallback (spec variant C). If go: carry the findings doc's field names and `autoReceive` default into all subsequent tasks.

---

### Task 2: Prisma models, enums, and shared types

**Files:**
- Modify: `packages/api/prisma/schema.prisma` (add enums + 3 models near the KSeF models, ~line 633)
- Create: `packages/api/prisma/migrations/<timestamp>_add_edoreczenia_models/migration.sql` (generated)
- Create: `packages/api/src/services/edoreczenia/types.ts`
- Test: `packages/api/src/services/edoreczenia/__tests__/types.test.ts`

**Interfaces:**
- Produces: Prisma models `EDoreczeniaConfig`, `EDoreczeniaLetter`, `EDoreczeniaDeadline`; enums `EDoreczeniaStatus`, `EDoreczeniaLetterStatus`, `EDoreczeniaAnalysisStatus`, `EDoreczeniaSenderType`, `EDoreczeniaDeadlineType`, `EDoreczeniaDeadlineStatus`. The TS types from the "Shared Types" section above.

- [ ] **Step 1: Write the failing test for the shared types module**

```typescript
// packages/api/src/services/edoreczenia/__tests__/types.test.ts
import type { LetterAnalysis, UAMessageSummary } from '../types';

describe('edoreczenia shared types', () => {
  it('LetterAnalysis carries deadlines with ISO dueDate', () => {
    const a: LetterAnalysis = {
      summary: 's', letterType: 'wezwanie', severity: 'high', requiredAction: 'r',
      deadlines: [{ type: 'response_deadline', dueDate: '2026-10-15', description: 'd' }],
    };
    expect(a.deadlines[0].dueDate).toBe('2026-10-15');
  });
  it('UAMessageSummary uses messageId as identity', () => {
    const m: UAMessageSummary = {
      messageId: 'ABC', senderName: 'US', subject: null, receivedAt: new Date(), hasAttachments: true,
    };
    expect(m.messageId).toBe('ABC');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --filter=@accounting-ai-agent/api -- types.test`
Expected: FAIL — `Cannot find module '../types'`.

- [ ] **Step 3: Create the shared types module**

Create `packages/api/src/services/edoreczenia/types.ts` with the exact contents of the "Shared Types" section above.

- [ ] **Step 4: Add enums and models to the Prisma schema**

Insert after the KSeF block (after line ~633) in `packages/api/prisma/schema.prisma`:

```prisma
// ============================================
// E-DORĘCZENIA (Government e-Delivery mailbox)
// ============================================

enum EDoreczeniaStatus {
  pending_csr
  pending_cert
  active
  degraded
  cert_expiring
  cert_expired
}

enum EDoreczeniaLetterStatus {
  new
  needs_action
  done
}

enum EDoreczeniaAnalysisStatus {
  pending
  done
  failed
  unavailable
}

enum EDoreczeniaSenderType {
  us
  zus
  court
  other
  unknown
}

enum EDoreczeniaDeadlineType {
  response_deadline
  fikcja_doreczenia
  custom
}

enum EDoreczeniaDeadlineStatus {
  active
  met
  missed
  dismissed
}

model EDoreczeniaConfig {
  id                  String            @id @default(uuid()) @db.Uuid
  userId              String            @unique @db.Uuid
  adeAddress          String?
  status              EDoreczeniaStatus @default(pending_csr)
  privateKeyEnc       String?           @db.Text
  certificateEnc      String?           @db.Text
  certExpiresAt       DateTime?
  autoReceive         Boolean           @default(false)
  notifyEnabled       Boolean           @default(true)
  notifyLeadDays      Int               @default(3)
  environment         String            @default("int")
  provider            String            @default("poczta_polska")
  lastPolledAt        DateTime?
  lastPollError       String?           @db.Text
  consecutiveFailures Int               @default(0)
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  user                User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  letters             EDoreczeniaLetter[]

  @@map("edoreczenia_config")
}

model EDoreczeniaLetter {
  id             String                    @id @default(uuid()) @db.Uuid
  userId         String                    @db.Uuid
  configId       String                    @db.Uuid
  messageId      String
  senderName     String?
  senderType     EDoreczeniaSenderType     @default(unknown)
  subject        String?
  receivedAt     DateTime
  bodyText       String?                   @db.Text
  attachmentsMeta Json?
  analysis       Json?
  status         EDoreczeniaLetterStatus   @default(new)
  analysisStatus EDoreczeniaAnalysisStatus @default(pending)
  createdAt      DateTime                  @default(now())
  updatedAt      DateTime                  @updatedAt
  user           User                      @relation(fields: [userId], references: [id], onDelete: Cascade)
  config         EDoreczeniaConfig         @relation(fields: [configId], references: [id], onDelete: Cascade)
  deadlines      EDoreczeniaDeadline[]

  @@unique([userId, messageId])
  @@index([userId])
  @@index([userId, status])
  @@index([configId])
  @@map("edoreczenia_letters")
}

model EDoreczeniaDeadline {
  id            String                    @id @default(uuid()) @db.Uuid
  letterId      String                    @db.Uuid
  userId        String                    @db.Uuid
  type          EDoreczeniaDeadlineType
  dueDate       DateTime
  description   String?
  status        EDoreczeniaDeadlineStatus @default(active)
  remindersSent Int                       @default(0)
  lastRemindedAt DateTime?
  createdAt     DateTime                  @default(now())
  updatedAt     DateTime                  @updatedAt
  letter        EDoreczeniaLetter         @relation(fields: [letterId], references: [id], onDelete: Cascade)
  user          User                      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status, dueDate])
  @@index([letterId])
  @@map("edoreczenia_deadlines")
}
```

Also add the back-relations to the `User` model (find `model User {` and add alongside its other relations):

```prisma
  edoreczeniaConfig   EDoreczeniaConfig?
  edoreczeniaLetters  EDoreczeniaLetter[]
  edoreczeniaDeadlines EDoreczeniaDeadline[]
```

- [ ] **Step 5: Generate the migration and client**

Run:
```bash
cd packages/api
npx prisma migrate dev --name add_edoreczenia_models
npx prisma generate
```
Expected: migration created under `prisma/migrations/`, client regenerated, no errors.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test --filter=@accounting-ai-agent/api -- types.test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/api/prisma/schema.prisma packages/api/prisma/migrations packages/api/src/services/edoreczenia/types.ts packages/api/src/services/edoreczenia/__tests__/types.test.ts
git commit -m "feat(edoreczenia): Prisma models, enums, and shared types"
```

---

### Task 3: Certificate service — keypair + PKCS#10 CSR generation

**Files:**
- Create: `packages/api/src/services/edoreczenia/certificate.service.ts`
- Test: `packages/api/src/services/edoreczenia/__tests__/certificate.service.test.ts`
- Modify: `packages/api/package.json` (add `node-forge` + `@types/node-forge`)

**Interfaces:**
- Produces:
  ```typescript
  class EDoreczeniaCertificateService {
    generateKeyPairAndCsr(subject: { commonName: string; organizationName?: string }): { privateKeyPem: string; csrPem: string };
    parseCertificateExpiry(certPem: string): Date;
  }
  ```

- [ ] **Step 1: Add the dependency**

Run:
```bash
cd packages/api
npm install node-forge
npm install --save-dev @types/node-forge
```

- [ ] **Step 2: Write the failing test**

```typescript
// packages/api/src/services/edoreczenia/__tests__/certificate.service.test.ts
import { EDoreczeniaCertificateService } from '../certificate.service';
import forge from 'node-forge';

describe('EDoreczeniaCertificateService', () => {
  const svc = new EDoreczeniaCertificateService();

  it('generates a private key and a valid PKCS#10 CSR carrying the CN', () => {
    const { privateKeyPem, csrPem } = svc.generateKeyPairAndCsr({ commonName: 'ADE-PL-12345' });
    expect(privateKeyPem).toContain('BEGIN RSA PRIVATE KEY');
    expect(csrPem).toContain('BEGIN CERTIFICATE REQUEST');
    const csr = forge.pki.certificationRequestFromPem(csrPem);
    expect(csr.verify()).toBe(true);
    const cn = csr.subject.getField('CN');
    expect(cn.value).toBe('ADE-PL-12345');
  });

  it('parses certificate expiry from a PEM cert', () => {
    // Build a short-lived self-signed cert to parse.
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.validity.notBefore = new Date('2026-01-01T00:00:00Z');
    cert.validity.notAfter = new Date('2027-01-01T00:00:00Z');
    cert.setSubject([{ name: 'commonName', value: 'x' }]);
    cert.setIssuer([{ name: 'commonName', value: 'x' }]);
    cert.sign(keys.privateKey);
    const pem = forge.pki.certificateToPem(cert);
    expect(svc.parseCertificateExpiry(pem).toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test --filter=@accounting-ai-agent/api -- certificate.service`
Expected: FAIL — `Cannot find module '../certificate.service'`.

- [ ] **Step 4: Implement the certificate service**

```typescript
// packages/api/src/services/edoreczenia/certificate.service.ts
import forge from 'node-forge';

export interface CsrSubject {
  commonName: string;
  organizationName?: string;
}

/**
 * Generates the RSA keypair and PKCS#10 CSR the user uploads into the
 * e-Doręczenia mailbox Moduł uprawnień. The private key stays server-side
 * (caller encrypts it before persistence); only the CSR is downloaded.
 */
export class EDoreczeniaCertificateService {
  generateKeyPairAndCsr(subject: CsrSubject): { privateKeyPem: string; csrPem: string } {
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keys.publicKey;

    const attrs: forge.pki.CertificateField[] = [{ name: 'commonName', value: subject.commonName }];
    if (subject.organizationName) {
      attrs.push({ name: 'organizationName', value: subject.organizationName });
    }
    csr.setSubject(attrs);
    csr.sign(keys.privateKey, forge.md.sha256.create());

    return {
      privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
      csrPem: forge.pki.certificationRequestToPem(csr),
    };
  }

  parseCertificateExpiry(certPem: string): Date {
    const cert = forge.pki.certificateFromPem(certPem);
    return cert.validity.notAfter;
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test --filter=@accounting-ai-agent/api -- certificate.service`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/package.json packages/api/package-lock.json packages/api/src/services/edoreczenia/certificate.service.ts packages/api/src/services/edoreczenia/__tests__/certificate.service.test.ts
git commit -m "feat(edoreczenia): certificate service — keypair + PKCS#10 CSR generation"
```

---

### Task 4: UA API client — mTLS transport, list + receive messages

**Files:**
- Create: `packages/api/src/services/edoreczenia/ua-api-client.ts`
- Test: `packages/api/src/services/edoreczenia/__tests__/ua-api-client.test.ts`

> Replace the placeholder request paths/field names below with the exact ones from the Task 1 findings doc.

**Interfaces:**
- Consumes: `UAMessageSummary`, `UAMessageContent`, `UAAttachment` from `./types`.
- Produces:
  ```typescript
  class UAApiClient {
    constructor(opts: { baseUrl: string; certPem: string; privateKeyPem: string });
    listMessages(): Promise<UAMessageSummary[]>;
    receiveMessage(messageId: string): Promise<UAMessageContent>;
  }
  ```

- [ ] **Step 1: Write the failing test**

```typescript
// packages/api/src/services/edoreczenia/__tests__/ua-api-client.test.ts
import axios from 'axios';
import { UAApiClient } from '../ua-api-client';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('UAApiClient', () => {
  const get = jest.fn();
  beforeEach(() => {
    mockedAxios.create.mockReturnValue({ get } as never);
    get.mockReset();
  });

  const client = new UAApiClient({ baseUrl: 'https://int.example', certPem: 'C', privateKeyPem: 'K' });

  it('maps the message list into UAMessageSummary[]', async () => {
    get.mockResolvedValueOnce({
      data: { messages: [
        { messageId: 'M1', senderName: 'Urząd Skarbowy', subject: 'Wezwanie', receivedDate: '2026-10-01T08:00:00Z', hasAttachments: true },
      ] },
    });
    const out = await client.listMessages();
    expect(out).toHaveLength(1);
    expect(out[0].messageId).toBe('M1');
    expect(out[0].receivedAt.toISOString()).toBe('2026-10-01T08:00:00.000Z');
    expect(out[0].hasAttachments).toBe(true);
  });

  it('receiveMessage returns body + decoded attachments', async () => {
    get.mockResolvedValueOnce({
      data: {
        messageId: 'M1',
        body: 'Treść pisma',
        attachments: [{ filename: 'wezwanie.pdf', mimeType: 'application/pdf', contentBase64: Buffer.from('pdf').toString('base64') }],
      },
    });
    const out = await client.receiveMessage('M1');
    expect(out.bodyText).toBe('Treść pisma');
    expect(out.attachments[0].filename).toBe('wezwanie.pdf');
    expect(out.attachments[0].content.toString()).toBe('pdf');
    expect(out.attachments[0].sizeBytes).toBe(3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --filter=@accounting-ai-agent/api -- ua-api-client`
Expected: FAIL — `Cannot find module '../ua-api-client'`.

- [ ] **Step 3: Implement the UA API client**

```typescript
// packages/api/src/services/edoreczenia/ua-api-client.ts
import https from 'https';
import axios, { AxiosInstance } from 'axios';
import { UAMessageSummary, UAMessageContent } from './types';

export interface UAApiClientOptions {
  baseUrl: string;
  certPem: string;
  privateKeyPem: string;
}

/**
 * Thin REST client for UA API v3. Authenticates via mTLS using the user's
 * issued certificate + server-held private key. Field names below follow the
 * Task 1 spike findings doc — update if the real API differs.
 */
export class UAApiClient {
  private readonly http: AxiosInstance;

  constructor(opts: UAApiClientOptions) {
    this.http = axios.create({
      baseURL: opts.baseUrl,
      httpsAgent: new https.Agent({ cert: opts.certPem, key: opts.privateKeyPem }),
      timeout: 30_000,
    });
  }

  async listMessages(): Promise<UAMessageSummary[]> {
    const res = await this.http.get('/messages');
    const raw = (res.data?.messages ?? []) as Array<Record<string, unknown>>;
    return raw.map((m) => ({
      messageId: String(m.messageId),
      senderName: (m.senderName as string) ?? null,
      subject: (m.subject as string) ?? null,
      receivedAt: new Date(m.receivedDate as string),
      hasAttachments: Boolean(m.hasAttachments),
    }));
  }

  async receiveMessage(messageId: string): Promise<UAMessageContent> {
    const res = await this.http.get(`/messages/${encodeURIComponent(messageId)}`);
    const d = res.data ?? {};
    const attachments = ((d.attachments ?? []) as Array<Record<string, unknown>>).map((a) => {
      const content = Buffer.from(String(a.contentBase64 ?? ''), 'base64');
      return {
        filename: String(a.filename ?? 'attachment'),
        mimeType: String(a.mimeType ?? 'application/octet-stream'),
        sizeBytes: content.length,
        content,
      };
    });
    return { messageId: String(d.messageId ?? messageId), bodyText: String(d.body ?? ''), attachments };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --filter=@accounting-ai-agent/api -- ua-api-client`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/edoreczenia/ua-api-client.ts packages/api/src/services/edoreczenia/__tests__/ua-api-client.test.ts
git commit -m "feat(edoreczenia): UA API v3 client (mTLS, list + receive messages)"
```

---

### Task 5: Config service — encrypted cert storage + status transitions

**Files:**
- Create: `packages/api/src/services/edoreczenia/config.service.ts`
- Test: `packages/api/src/services/edoreczenia/__tests__/config.service.test.ts`

**Interfaces:**
- Consumes: `PrismaClient`; `cryptoService` (`../crypto.instance`); `EDoreczeniaCertificateService`.
- Produces:
  ```typescript
  class EDoreczeniaConfigService {
    constructor(prisma: PrismaClient, crypto: CryptoService, certService: EDoreczeniaCertificateService);
    getActiveConfigs(): Promise<Array<{ id: string; userId: string; adeAddress: string | null; certPem: string; privateKeyPem: string; environment: string }>>;
    storeCertificate(userId: string, certPem: string): Promise<void>;   // decrypts nothing; sets status active + certExpiresAt
    getDecryptedCredentials(userId: string): Promise<{ certPem: string; privateKeyPem: string } | null>;
  }
  ```

- [ ] **Step 1: Write the failing test**

```typescript
// packages/api/src/services/edoreczenia/__tests__/config.service.test.ts
import { EDoreczeniaConfigService } from '../config.service';

const crypto = {
  encryptToString: (s: string) => `enc(${s})`,
  decryptFromString: (s: string) => s.replace(/^enc\(/, '').replace(/\)$/, ''),
} as never;
const certService = { parseCertificateExpiry: () => new Date('2027-01-01T00:00:00Z') } as never;

describe('EDoreczeniaConfigService', () => {
  it('storeCertificate encrypts, sets expiry, and activates', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = { eDoreczeniaConfig: { update } } as never;
    const svc = new EDoreczeniaConfigService(prisma, crypto, certService);
    await svc.storeCertificate('u1', 'CERTPEM');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'u1' },
      data: expect.objectContaining({ certificateEnc: 'enc(CERTPEM)', status: 'active', certExpiresAt: new Date('2027-01-01T00:00:00Z') }),
    }));
  });

  it('getActiveConfigs decrypts key + cert for each active row', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'c1', userId: 'u1', adeAddress: 'ADE', environment: 'int', autoReceive: true, certificateEnc: 'enc(CERT)', privateKeyEnc: 'enc(KEY)' },
    ]);
    const prisma = { eDoreczeniaConfig: { findMany } } as never;
    const svc = new EDoreczeniaConfigService(prisma, crypto, certService);
    const out = await svc.getActiveConfigs();
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'active' } }));
    expect(out[0]).toMatchObject({ userId: 'u1', certPem: 'CERT', privateKeyPem: 'KEY', autoReceive: true });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --filter=@accounting-ai-agent/api -- config.service`
Expected: FAIL — `Cannot find module '../config.service'`.

- [ ] **Step 3: Implement the config service**

```typescript
// packages/api/src/services/edoreczenia/config.service.ts
import { PrismaClient } from '@prisma/client';
import { CryptoService } from '../crypto.service';
import { EDoreczeniaCertificateService } from './certificate.service';
import { logger } from '../../utils/logger';

export interface ActiveConfig {
  id: string;
  userId: string;
  adeAddress: string | null;
  certPem: string;
  privateKeyPem: string;
  environment: string;
  autoReceive: boolean;
}

export class EDoreczeniaConfigService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly crypto: CryptoService,
    private readonly certService: EDoreczeniaCertificateService,
  ) {}

  /** All active configs with decrypted credentials, for the poller. */
  async getActiveConfigs(): Promise<ActiveConfig[]> {
    const rows = await this.prisma.eDoreczeniaConfig.findMany({ where: { status: 'active' } });
    const out: ActiveConfig[] = [];
    for (const r of rows) {
      if (!r.certificateEnc || !r.privateKeyEnc) continue;
      try {
        out.push({
          id: r.id,
          userId: r.userId,
          adeAddress: r.adeAddress,
          environment: r.environment,
          autoReceive: r.autoReceive,
          certPem: this.crypto.decryptFromString(r.certificateEnc),
          privateKeyPem: this.crypto.decryptFromString(r.privateKeyEnc),
        });
      } catch (e) {
        logger.error('[EDoreczenia] Failed to decrypt config credentials', {
          userId: CryptoService.mask(r.userId), error: (e as Error).message,
        });
      }
    }
    return out;
  }

  /** Store the certificate the user uploaded, derive expiry, activate the config. */
  async storeCertificate(userId: string, certPem: string): Promise<void> {
    const certExpiresAt = this.certService.parseCertificateExpiry(certPem);
    await this.prisma.eDoreczeniaConfig.update({
      where: { userId },
      data: { certificateEnc: this.crypto.encryptToString(certPem), certExpiresAt, status: 'active' },
    });
  }

  async getDecryptedCredentials(userId: string): Promise<{ certPem: string; privateKeyPem: string } | null> {
    const r = await this.prisma.eDoreczeniaConfig.findUnique({ where: { userId } });
    if (!r?.certificateEnc || !r?.privateKeyEnc) return null;
    return {
      certPem: this.crypto.decryptFromString(r.certificateEnc),
      privateKeyPem: this.crypto.decryptFromString(r.privateKeyEnc),
    };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --filter=@accounting-ai-agent/api -- config.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/edoreczenia/config.service.ts packages/api/src/services/edoreczenia/__tests__/config.service.test.ts
git commit -m "feat(edoreczenia): config service — encrypted cert storage + active-config decryption"
```

---

### Task 6: Deadline service — compute + reconcile deadlines from analysis

**Files:**
- Create: `packages/api/src/services/edoreczenia/deadline.service.ts`
- Test: `packages/api/src/services/edoreczenia/__tests__/deadline.service.test.ts`

**Interfaces:**
- Consumes: `PrismaClient`; `LetterDeadline`, `LetterAnalysis` from `./types`.
- Produces:
  ```typescript
  class EDoreczeniaDeadlineService {
    constructor(prisma: PrismaClient);
    // Always add the statutory 14-day fikcja deadline from receivedAt, plus any deadlines the AI extracted.
    buildDeadlines(receivedAt: Date, analysis: LetterAnalysis): LetterDeadline[];
    persistDeadlines(letterId: string, userId: string, deadlines: LetterDeadline[]): Promise<void>;
  }
  ```

- [ ] **Step 1: Write the failing test**

```typescript
// packages/api/src/services/edoreczenia/__tests__/deadline.service.test.ts
import { EDoreczeniaDeadlineService } from '../deadline.service';
import type { LetterAnalysis } from '../types';

const analysis = (deadlines: LetterAnalysis['deadlines']): LetterAnalysis => ({
  summary: 's', letterType: 'wezwanie', severity: 'high', requiredAction: 'r', deadlines,
});

describe('EDoreczeniaDeadlineService.buildDeadlines', () => {
  const svc = new EDoreczeniaDeadlineService({} as never);

  it('always adds a 14-day fikcja_doreczenia deadline from receivedAt', () => {
    const out = svc.buildDeadlines(new Date('2026-10-01T00:00:00Z'), analysis([]));
    const fikcja = out.find((d) => d.type === 'fikcja_doreczenia');
    expect(fikcja?.dueDate).toBe('2026-10-15');
  });

  it('includes AI-extracted response deadlines alongside the fikcja one', () => {
    const out = svc.buildDeadlines(new Date('2026-10-01T00:00:00Z'), analysis([
      { type: 'response_deadline', dueDate: '2026-10-21', description: 'odpowiedź na wezwanie' },
    ]));
    expect(out.map((d) => d.type).sort()).toEqual(['fikcja_doreczenia', 'response_deadline']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --filter=@accounting-ai-agent/api -- deadline.service`
Expected: FAIL — `Cannot find module '../deadline.service'`.

- [ ] **Step 3: Implement the deadline service**

```typescript
// packages/api/src/services/edoreczenia/deadline.service.ts
import { PrismaClient } from '@prisma/client';
import { LetterAnalysis, LetterDeadline } from './types';

const FIKCJA_DAYS = 14;

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export class EDoreczeniaDeadlineService {
  constructor(private readonly prisma: PrismaClient) {}

  buildDeadlines(receivedAt: Date, analysis: LetterAnalysis): LetterDeadline[] {
    const fikcjaDate = new Date(receivedAt);
    fikcjaDate.setUTCDate(fikcjaDate.getUTCDate() + FIKCJA_DAYS);
    const fikcja: LetterDeadline = {
      type: 'fikcja_doreczenia',
      dueDate: toIsoDate(fikcjaDate),
      description: 'Termin fikcji doręczenia (14 dni)',
    };
    // AI deadlines first, statutory fikcja always appended.
    return [...analysis.deadlines, fikcja];
  }

  async persistDeadlines(letterId: string, userId: string, deadlines: LetterDeadline[]): Promise<void> {
    if (deadlines.length === 0) return;
    await this.prisma.eDoreczeniaDeadline.createMany({
      data: deadlines.map((d) => ({
        letterId,
        userId,
        type: d.type,
        dueDate: new Date(`${d.dueDate}T00:00:00Z`),
        description: d.description,
      })),
    });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --filter=@accounting-ai-agent/api -- deadline.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/edoreczenia/deadline.service.ts packages/api/src/services/edoreczenia/__tests__/deadline.service.test.ts
git commit -m "feat(edoreczenia): deadline service — statutory fikcja + AI-extracted deadlines"
```

---

### Task 7: Letter analysis service — AI structured output

**Files:**
- Create: `packages/api/src/services/edoreczenia/letter-analysis.service.ts`
- Test: `packages/api/src/services/edoreczenia/__tests__/letter-analysis.service.test.ts`

**Interfaces:**
- Consumes: a LangChain chat model with `.withStructuredOutput()`; `LetterAnalysis`, `SenderType` from `./types`; `Locale`.
- Produces:
  ```typescript
  interface LetterAnalysisInput { senderName: string | null; subject: string | null; bodyText: string; locale: Locale; }
  class LetterAnalysisService {
    constructor(modelFactory: (userId: string) => Promise<StructuredModel>);
    classifySender(senderName: string | null): SenderType;
    analyze(userId: string, input: LetterAnalysisInput): Promise<LetterAnalysis>;
  }
  ```
  where `StructuredModel` is `{ invoke(messages: unknown): Promise<LetterAnalysis> }`.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/api/src/services/edoreczenia/__tests__/letter-analysis.service.test.ts
import { LetterAnalysisService } from '../letter-analysis.service';
import type { LetterAnalysis } from '../types';

describe('LetterAnalysisService', () => {
  const result: LetterAnalysis = {
    summary: 'Urząd wzywa do złożenia wyjaśnień', letterType: 'wezwanie', severity: 'high',
    requiredAction: 'Złóż wyjaśnienia', deadlines: [{ type: 'response_deadline', dueDate: '2026-10-21', description: 'x' }],
  };
  const model = { invoke: jest.fn().mockResolvedValue(result) };
  const svc = new LetterAnalysisService(async () => model as never);

  it('classifies sender type from the sender name', () => {
    expect(svc.classifySender('Urząd Skarbowy w Warszawie')).toBe('us');
    expect(svc.classifySender('Zakład Ubezpieczeń Społecznych')).toBe('zus');
    expect(svc.classifySender('Sąd Rejonowy')).toBe('court');
    expect(svc.classifySender('Jan Kowalski')).toBe('other');
    expect(svc.classifySender(null)).toBe('unknown');
  });

  it('returns the structured analysis from the model', async () => {
    const out = await svc.analyze('u1', { senderName: 'US', subject: 'Wezwanie', bodyText: 'treść', locale: 'pl' });
    expect(out.letterType).toBe('wezwanie');
    expect(model.invoke).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --filter=@accounting-ai-agent/api -- letter-analysis.service`
Expected: FAIL — `Cannot find module '../letter-analysis.service'`.

- [ ] **Step 3: Implement the letter analysis service**

```typescript
// packages/api/src/services/edoreczenia/letter-analysis.service.ts
import { z } from 'zod';
import { Locale } from '../../i18n';
import { LetterAnalysis, SenderType } from './types';
import { sanitizeForPrompt } from '../ai-chat/tools/utils';

export interface StructuredModel {
  invoke(messages: unknown): Promise<LetterAnalysis>;
}

export interface LetterAnalysisInput {
  senderName: string | null;
  subject: string | null;
  bodyText: string;
  locale: Locale;
}

export const LetterAnalysisSchema = z.object({
  summary: z.string().describe('Plain-language summary of what the letter is about'),
  letterType: z.enum(['wezwanie', 'decyzja', 'zawiadomienie', 'postanowienie', 'informacja', 'inne']),
  severity: z.enum(['high', 'medium', 'low']).describe('high = action required, medium = to note, low = informational'),
  requiredAction: z.string().describe('What the recipient must do'),
  deadlines: z.array(z.object({
    type: z.enum(['response_deadline', 'fikcja_doreczenia', 'custom']),
    dueDate: z.string().describe('ISO date YYYY-MM-DD'),
    description: z.string(),
  })),
});

export class LetterAnalysisService {
  constructor(private readonly modelFactory: (userId: string) => Promise<StructuredModel>) {}

  classifySender(senderName: string | null): SenderType {
    if (!senderName) return 'unknown';
    const s = senderName.toLowerCase();
    if (s.includes('urząd skarbowy') || s.includes('urzad skarbowy') || s.includes('skarbow')) return 'us';
    if (s.includes('zakład ubezpieczeń') || s.includes('zus')) return 'zus';
    if (s.includes('sąd') || s.includes('sad ')) return 'court';
    return 'other';
  }

  async analyze(userId: string, input: LetterAnalysisInput): Promise<LetterAnalysis> {
    const model = await this.modelFactory(userId);
    const system = [
      'You analyse Polish official correspondence from government bodies (US, ZUS, courts).',
      `Respond in the user's language (locale: ${input.locale}).`,
      'Extract every response deadline you find. Do NOT invent deadlines.',
    ].join(' ');
    const human = [
      `Sender: ${sanitizeForPrompt(input.senderName ?? 'unknown')}`,
      `Subject: ${sanitizeForPrompt(input.subject ?? '')}`,
      `Body:\n${sanitizeForPrompt(input.bodyText)}`,
    ].join('\n');
    return model.invoke([
      { role: 'system', content: system },
      { role: 'user', content: human },
    ]);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --filter=@accounting-ai-agent/api -- letter-analysis.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/edoreczenia/letter-analysis.service.ts packages/api/src/services/edoreczenia/__tests__/letter-analysis.service.test.ts
git commit -m "feat(edoreczenia): AI letter-analysis service (structured output + sender classification)"
```

---

### Task 8: Mailbox poller — ingest, dedupe, analyse, persist deadlines

**Files:**
- Create: `packages/api/src/services/edoreczenia/mailbox-poller.service.ts`
- Test: `packages/api/src/services/edoreczenia/__tests__/mailbox-poller.service.test.ts`

**Interfaces:**
- Consumes: `PrismaClient`; `EDoreczeniaConfigService.getActiveConfigs`; a `clientFactory(cfg) => UAApiClient`; `LetterAnalysisService`; `EDoreczeniaDeadlineService`; an `onNewLetter(userId, letterId)` callback (wired to the reminder/alert sender in Task 11).
- Produces:
  ```typescript
  class MailboxPollerService {
    constructor(deps: { prisma, configService, clientFactory, analysisService, deadlineService, onNewLetter?, pollIntervalMs? });
    start(): void; stop(): void;
    pollOnce(): Promise<void>;   // exposed for tests
  }
  ```

- [ ] **Step 1: Write the failing test**

```typescript
// packages/api/src/services/edoreczenia/__tests__/mailbox-poller.service.test.ts
import { MailboxPollerService } from '../mailbox-poller.service';

describe('MailboxPollerService.pollOnce', () => {
  const activeConfig = { id: 'c1', userId: 'u1', adeAddress: 'ADE', environment: 'int', certPem: 'C', privateKeyPem: 'K', autoReceive: true };

  function makeDeps(existingMessageIds: string[] = [], configOverrides: Record<string, unknown> = {}) {
    const cfg = { ...activeConfig, ...configOverrides };
    const created: Array<Record<string, unknown>> = [];
    const prisma = {
      $queryRaw: jest.fn(),
      eDoreczeniaLetter: {
        findUnique: jest.fn(({ where }: never) =>
          existingMessageIds.includes((where as { userId_messageId: { messageId: string } }).userId_messageId.messageId)
            ? Promise.resolve({ id: 'existing' }) : Promise.resolve(null)),
        create: jest.fn((args: { data: Record<string, unknown> }) => { const row = { id: 'L1', ...args.data }; created.push(row); return Promise.resolve(row); }),
        update: jest.fn().mockResolvedValue({}),
      },
    } as never;
    const configService = { getActiveConfigs: jest.fn().mockResolvedValue([cfg]) } as never;
    const client = {
      listMessages: jest.fn().mockResolvedValue([
        { messageId: 'M1', senderName: 'Urząd Skarbowy', subject: 'Wezwanie', receivedAt: new Date('2026-10-01T00:00:00Z'), hasAttachments: false },
      ]),
      receiveMessage: jest.fn().mockResolvedValue({ messageId: 'M1', bodyText: 'treść', attachments: [] }),
    };
    const analysisService = {
      classifySender: jest.fn().mockReturnValue('us'),
      analyze: jest.fn().mockResolvedValue({ summary: 's', letterType: 'wezwanie', severity: 'high', requiredAction: 'r', deadlines: [] }),
    } as never;
    const deadlineService = {
      buildDeadlines: jest.fn().mockReturnValue([{ type: 'fikcja_doreczenia', dueDate: '2026-10-15', description: 'x' }]),
      persistDeadlines: jest.fn().mockResolvedValue(undefined),
    } as never;
    const onNewLetter = jest.fn().mockResolvedValue(undefined);
    return { prisma, configService, clientFactory: () => client, analysisService, deadlineService, onNewLetter, created, client };
  }

  it('ingests a new message: creates letter, analyses, persists deadlines, fires onNewLetter', async () => {
    const d = makeDeps([]);
    const poller = new MailboxPollerService(d as never);
    await poller.pollOnce();
    expect(d.created).toHaveLength(1);
    expect(d.created[0].messageId).toBe('M1');
    expect(d.deadlineService.persistDeadlines).toHaveBeenCalled();
    expect(d.onNewLetter).toHaveBeenCalledWith('u1', 'L1');
  });

  it('skips a message that was already ingested (dedupe by userId+messageId)', async () => {
    const d = makeDeps(['M1']);
    const poller = new MailboxPollerService(d as never);
    await poller.pollOnce();
    expect(d.created).toHaveLength(0);
    expect(d.client.receiveMessage).not.toHaveBeenCalled();
  });

  it('with autoReceive=false, records metadata only and never performs the receiving read', async () => {
    const d = makeDeps([], { autoReceive: false });
    const poller = new MailboxPollerService(d as never);
    await poller.pollOnce();
    expect(d.created).toHaveLength(1);
    expect(d.created[0].bodyText).toBeUndefined();     // no body persisted
    expect(d.client.receiveMessage).not.toHaveBeenCalled(); // no legal receipt
    expect(d.onNewLetter).toHaveBeenCalledWith('u1', 'L1'); // still alerts on metadata
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --filter=@accounting-ai-agent/api -- mailbox-poller.service`
Expected: FAIL — `Cannot find module '../mailbox-poller.service'`.

- [ ] **Step 3: Implement the mailbox poller**

```typescript
// packages/api/src/services/edoreczenia/mailbox-poller.service.ts
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { EDoreczeniaConfigService, ActiveConfig } from './config.service';
import { UAApiClient } from './ua-api-client';
import { LetterAnalysisService } from './letter-analysis.service';
import { EDoreczeniaDeadlineService } from './deadline.service';
import { Locale } from '../../i18n';

export interface MailboxPollerDeps {
  prisma: PrismaClient;
  configService: EDoreczeniaConfigService;
  clientFactory: (cfg: ActiveConfig) => UAApiClient;
  analysisService: LetterAnalysisService;
  deadlineService: EDoreczeniaDeadlineService;
  onNewLetter?: (userId: string, letterId: string) => Promise<void>;
  pollIntervalMs?: number;
}

export class MailboxPollerService {
  private intervalId?: ReturnType<typeof setInterval>;
  private dbUnavailable = false;
  private readonly intervalMs: number;

  constructor(private readonly deps: MailboxPollerDeps) {
    this.intervalMs = deps.pollIntervalMs
      ?? parseInt(process.env.EDORECZENIA_POLL_INTERVAL_MINUTES ?? '15', 10) * 60 * 1000;
  }

  start(): void {
    if (this.intervalId) { logger.warn('[EDoreczenia] Poller already running'); return; }
    logger.info('[EDoreczenia] Starting mailbox poller', { intervalMs: this.intervalMs });
    this.intervalId = setInterval(() => {
      this.pollOnce().catch((error) => {
        const msg = error instanceof Error ? error.message : 'Unknown';
        if (msg.includes("Can't reach database server")) {
          if (!this.dbUnavailable) { this.dbUnavailable = true; logger.warn('[EDoreczenia] DB unavailable, pausing polls'); }
          return;
        }
        logger.error('[EDoreczenia] Poller error', { error: msg });
      });
    }, this.intervalMs);
  }

  stop(): void {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = undefined; logger.info('[EDoreczenia] Poller stopped'); }
  }

  async pollOnce(): Promise<void> {
    if (this.dbUnavailable) {
      await this.deps.prisma.$queryRaw`SELECT 1`;
      this.dbUnavailable = false;
      logger.info('[EDoreczenia] DB reconnected, resuming polls');
    }

    const configs = await this.deps.configService.getActiveConfigs();
    for (const cfg of configs) {
      try {
        await this.pollConfig(cfg);
        await this.deps.prisma.eDoreczeniaConfig.update({
          where: { id: cfg.id },
          data: { lastPolledAt: new Date(), lastPollError: null, consecutiveFailures: 0 },
        });
      } catch (e) {
        logger.error('[EDoreczenia] Config poll failed', { configId: cfg.id, error: (e as Error).message });
        await this.deps.prisma.eDoreczeniaConfig.update({
          where: { id: cfg.id },
          data: { lastPollError: (e as Error).message, consecutiveFailures: { increment: 1 } },
        });
      }
    }
  }

  private async pollConfig(cfg: ActiveConfig): Promise<void> {
    const client = this.deps.clientFactory(cfg);
    const summaries = await client.listMessages();

    for (const s of summaries) {
      const existing = await this.deps.prisma.eDoreczeniaLetter.findUnique({
        where: { userId_messageId: { userId: cfg.userId, messageId: s.messageId } },
      });
      if (existing) continue; // dedupe

      const senderType = this.deps.analysisService.classifySender(s.senderName);

      // fikcja-doręczenia safeguard (spec §6.3): only perform the legally-receiving
      // read + AI analysis when autoReceive is on. When off, record envelope
      // metadata only and alert; the user triggers full receipt explicitly later.
      if (!cfg.autoReceive) {
        const letter = await this.deps.prisma.eDoreczeniaLetter.create({
          data: {
            userId: cfg.userId,
            configId: cfg.id,
            messageId: s.messageId,
            senderName: s.senderName,
            senderType,
            subject: s.subject,
            receivedAt: s.receivedAt,
            status: 'new',
            analysisStatus: 'pending',
          },
        });
        if (this.deps.onNewLetter) await this.deps.onNewLetter(cfg.userId, letter.id);
        continue;
      }

      const content = await client.receiveMessage(s.messageId);

      const letter = await this.deps.prisma.eDoreczeniaLetter.create({
        data: {
          userId: cfg.userId,
          configId: cfg.id,
          messageId: s.messageId,
          senderName: s.senderName,
          senderType,
          subject: s.subject,
          receivedAt: s.receivedAt,
          bodyText: content.bodyText,
          attachmentsMeta: content.attachments.map((a) => ({ filename: a.filename, mimeType: a.mimeType, sizeBytes: a.sizeBytes })),
          status: 'new',
          analysisStatus: 'pending',
        },
      });

      // Analyse (best-effort — the guardian still works if AI fails).
      try {
        const analysis = await this.deps.analysisService.analyze(cfg.userId, {
          senderName: s.senderName, subject: s.subject, bodyText: content.bodyText, locale: 'pl' as Locale,
        });
        const deadlines = this.deps.deadlineService.buildDeadlines(s.receivedAt, analysis);
        await this.deps.deadlineService.persistDeadlines(letter.id, cfg.userId, deadlines);
        await this.deps.prisma.eDoreczeniaLetter.update({
          where: { id: letter.id },
          data: { analysis: analysis as object, analysisStatus: 'done', status: analysis.severity === 'high' ? 'needs_action' : 'new' },
        });
      } catch (e) {
        logger.error('[EDoreczenia] Analysis failed', { letterId: letter.id, error: (e as Error).message });
        await this.deps.prisma.eDoreczeniaLetter.update({ where: { id: letter.id }, data: { analysisStatus: 'unavailable' } });
      }

      if (this.deps.onNewLetter) await this.deps.onNewLetter(cfg.userId, letter.id);
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --filter=@accounting-ai-agent/api -- mailbox-poller.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/edoreczenia/mailbox-poller.service.ts packages/api/src/services/edoreczenia/__tests__/mailbox-poller.service.test.ts
git commit -m "feat(edoreczenia): mailbox poller — ingest, dedupe, analyse, persist deadlines"
```

---

### Task 9: i18n — add the `edelivery` translation block (pl/en/ru)

**Files:**
- Modify: `packages/api/src/i18n/locales/pl.json`, `en.json`, `ru.json` (add `edelivery` key)
- Modify: `packages/api/src/i18n/index.ts` (add `getEDeliveryTranslations` + type)
- Test: `packages/api/src/i18n/__tests__/edelivery.i18n.test.ts`

**Interfaces:**
- Produces: `getEDeliveryTranslations(locale): EDeliveryTranslations` with keys: `alertTitle`, `newLetterFrom`, `deadlineIn`, `severityHigh`, `severityMedium`, `severityLow`, `requiredAction`, `noLetters`, `lettersListTitle`, `errorFetch`, `markedDone`, `showAnalysis`, `done`, `remindTomorrow`.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/api/src/i18n/__tests__/edelivery.i18n.test.ts
import { getEDeliveryTranslations } from '../index';

describe('edelivery i18n', () => {
  it('has the alert title in all three locales', () => {
    expect(getEDeliveryTranslations('pl').alertTitle).toBeTruthy();
    expect(getEDeliveryTranslations('en').alertTitle).toBeTruthy();
    expect(getEDeliveryTranslations('ru').alertTitle).toBeTruthy();
  });
  it('falls back to pl for unknown locale', () => {
    // @ts-expect-error testing fallback
    expect(getEDeliveryTranslations('xx').alertTitle).toBe(getEDeliveryTranslations('pl').alertTitle);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --filter=@accounting-ai-agent/api -- edelivery.i18n`
Expected: FAIL — `getEDeliveryTranslations is not a function`.

- [ ] **Step 3: Add the `edelivery` block to each locale JSON**

Add to `pl.json` (top-level key, mirror placement of the `ksef` block):
```json
"edelivery": {
  "alertTitle": "📬 Nowe pismo urzędowe",
  "newLetterFrom": "Nowe pismo od",
  "deadlineIn": "Termin za",
  "severityHigh": "🔴 Wymaga działania",
  "severityMedium": "🟡 Do wiadomości",
  "severityLow": "🟢 Informacja",
  "requiredAction": "Co zrobić",
  "noLetters": "Brak pism urzędowych.",
  "lettersListTitle": "Pisma urzędowe",
  "errorFetch": "Nie udało się pobrać pism urzędowych.",
  "markedDone": "Pismo oznaczone jako załatwione.",
  "showAnalysis": "Pokaż analizę",
  "done": "Załatwione",
  "remindTomorrow": "Przypomnij jutro"
}
```
Add the same key to `en.json`:
```json
"edelivery": {
  "alertTitle": "📬 New official letter",
  "newLetterFrom": "New letter from",
  "deadlineIn": "Deadline in",
  "severityHigh": "🔴 Action required",
  "severityMedium": "🟡 For your information",
  "severityLow": "🟢 Informational",
  "requiredAction": "What to do",
  "noLetters": "No official letters.",
  "lettersListTitle": "Official letters",
  "errorFetch": "Failed to fetch official letters.",
  "markedDone": "Letter marked as handled.",
  "showAnalysis": "Show analysis",
  "done": "Handled",
  "remindTomorrow": "Remind me tomorrow"
}
```
Add the same key to `ru.json`:
```json
"edelivery": {
  "alertTitle": "📬 Новое официальное письмо",
  "newLetterFrom": "Новое письмо от",
  "deadlineIn": "Срок через",
  "severityHigh": "🔴 Требует действия",
  "severityMedium": "🟡 К сведению",
  "severityLow": "🟢 Информация",
  "requiredAction": "Что делать",
  "noLetters": "Официальных писем нет.",
  "lettersListTitle": "Официальные письма",
  "errorFetch": "Не удалось получить официальные письма.",
  "markedDone": "Письмо отмечено как обработанное.",
  "showAnalysis": "Показать анализ",
  "done": "Обработано",
  "remindTomorrow": "Напомнить завтра"
}
```

- [ ] **Step 4: Add the accessor + type to `i18n/index.ts`**

Add near the other type exports (after line 23):
```typescript
export type EDeliveryTranslations = typeof plTranslations['edelivery'];
```
Add near the other accessors (after `getKSeFTranslations`):
```typescript
export function getEDeliveryTranslations(locale: Locale = 'pl'): EDeliveryTranslations {
  return getTranslations(locale).edelivery;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test --filter=@accounting-ai-agent/api -- edelivery.i18n`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/i18n
git commit -m "feat(edoreczenia): i18n edelivery block (pl/en/ru) + accessor"
```

---

### Task 10: Reminder + alert service — Telegram DMs with escalation

**Files:**
- Create: `packages/api/src/services/edoreczenia/edoreczenia-reminder.service.ts`
- Test: `packages/api/src/services/edoreczenia/__tests__/edoreczenia-reminder.service.test.ts`

**Interfaces:**
- Consumes: `PrismaClient`; `redis`; `TelegramBotService.sendProactiveMessage`; `getEDeliveryTranslations`.
- Produces:
  ```typescript
  class EDoreczeniaReminderService {
    constructor(telegramBotService: TelegramBotService);
    start(): void; stop(): void;
    // Alert fired immediately when a new letter is ingested (poller onNewLetter).
    alertNewLetter(userId: string, letterId: string): Promise<void>;
    // Hourly tick: escalating reminders at 7/3/1/0 days before each active deadline.
    tick(): Promise<void>;
  }
  ```
  Escalation buckets: remind when `daysUntil ∈ {7,3,1,0}`; Redis dedupe key `edor:reminded:${deadlineId}:${daysUntil}` (TTL 25h).

- [ ] **Step 1: Write the failing test**

```typescript
// packages/api/src/services/edoreczenia/__tests__/edoreczenia-reminder.service.test.ts
import { EDoreczeniaReminderService } from '../edoreczenia-reminder.service';

jest.mock('../../../lib/redis', () => ({ redis: { get: jest.fn(), setEx: jest.fn() } }));
jest.mock('../../../lib/prisma', () => ({ prisma: { eDoreczeniaLetter: { findFirst: jest.fn() }, telegramLink: { findUnique: jest.fn() }, eDoreczeniaDeadline: { findMany: jest.fn() } } }));

import { redis } from '../../../lib/redis';
import { prisma } from '../../../lib/prisma';

describe('EDoreczeniaReminderService.alertNewLetter', () => {
  const sendProactiveMessage = jest.fn().mockResolvedValue(undefined);
  const telegram = { isInitialized: () => true, sendProactiveMessage } as never;
  const svc = new EDoreczeniaReminderService(telegram);

  beforeEach(() => { jest.clearAllMocks(); });

  it('DMs the linked user a localized alert for a new letter', async () => {
    (prisma.eDoreczeniaLetter.findFirst as jest.Mock).mockResolvedValue({
      id: 'L1', senderName: 'Urząd Skarbowy', subject: 'Wezwanie',
      analysis: { severity: 'high', requiredAction: 'Złóż wyjaśnienia' },
      user: { locale: 'pl' },
    });
    (prisma.telegramLink.findUnique as jest.Mock).mockResolvedValue({ telegramUserId: 'tg1' });
    await svc.alertNewLetter('u1', 'L1');
    expect(sendProactiveMessage).toHaveBeenCalledWith('tg1', expect.stringContaining('Urząd Skarbowy'));
  });

  it('does nothing when the user has no Telegram link', async () => {
    (prisma.eDoreczeniaLetter.findFirst as jest.Mock).mockResolvedValue({ id: 'L1', user: { locale: 'pl' }, analysis: null });
    (prisma.telegramLink.findUnique as jest.Mock).mockResolvedValue(null);
    await svc.alertNewLetter('u1', 'L1');
    expect(sendProactiveMessage).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --filter=@accounting-ai-agent/api -- edoreczenia-reminder.service`
Expected: FAIL — `Cannot find module '../edoreczenia-reminder.service'`.

- [ ] **Step 3: Implement the reminder service**

```typescript
// packages/api/src/services/edoreczenia/edoreczenia-reminder.service.ts
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { logger } from '../../utils/logger';
import { Locale, getEDeliveryTranslations } from '../../i18n';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { LetterAnalysis } from './types';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly
const ESCALATION_DAYS = [7, 3, 1, 0];

export class EDoreczeniaReminderService {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly telegramBotService: TelegramBotService) {}

  start(): void {
    this.tick().catch((e) => logger.error('[EDorReminder] Tick error on start', { error: (e as Error).message }));
    this.timer = setInterval(() => {
      this.tick().catch((e) => logger.error('[EDorReminder] Tick error', { error: (e as Error).message }));
    }, CHECK_INTERVAL_MS);
    logger.info('[EDorReminder] E-Doręczenia reminder service started');
  }

  stop(): void { if (this.timer) { clearInterval(this.timer); this.timer = null; } }

  async alertNewLetter(userId: string, letterId: string): Promise<void> {
    if (!this.telegramBotService.isInitialized()) return;

    const letter = await prisma.eDoreczeniaLetter.findFirst({
      where: { id: letterId, userId },
      include: { user: { select: { locale: true } } },
    });
    if (!letter) return;

    const link = await prisma.telegramLink.findUnique({ where: { userId } });
    if (!link) return;

    const locale = ((letter.user?.locale as Locale) || 'pl');
    const t = getEDeliveryTranslations(locale);
    const analysis = letter.analysis as unknown as LetterAnalysis | null;

    const lines = [
      t.alertTitle,
      '',
      `${t.newLetterFrom}: ${letter.senderName ?? '—'}`,
      letter.subject ? `📄 ${letter.subject}` : '',
    ];
    if (analysis) {
      const sev = analysis.severity === 'high' ? t.severityHigh : analysis.severity === 'medium' ? t.severityMedium : t.severityLow;
      lines.push('', sev, '', `${t.requiredAction}: ${analysis.requiredAction}`);
    }
    await this.telegramBotService.sendProactiveMessage(link.telegramUserId, lines.filter((l) => l !== '').join('\n'));
    logger.info('[EDorReminder] New-letter alert sent', { userId, letterId });
  }

  async tick(): Promise<void> {
    if (!this.telegramBotService.isInitialized()) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const active = await prisma.eDoreczeniaDeadline.findMany({
      where: { status: 'active' },
      include: { letter: { select: { senderName: true, subject: true } }, user: { select: { locale: true } } },
    });

    for (const d of active) {
      const due = new Date(d.dueDate); due.setHours(0, 0, 0, 0);
      const daysUntil = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      if (!ESCALATION_DAYS.includes(daysUntil)) continue;

      const key = `edor:reminded:${d.id}:${daysUntil}`;
      if (await redis.get(key)) continue;
      await redis.setEx(key, 25 * 60 * 60, '1');

      const link = await prisma.telegramLink.findUnique({ where: { userId: d.userId } });
      if (!link) continue;

      const locale = ((d.user?.locale as Locale) || 'pl');
      const t = getEDeliveryTranslations(locale);
      const msg = [t.alertTitle, '', `${d.letter?.senderName ?? '—'}: ${d.letter?.subject ?? ''}`, '', `${t.deadlineIn}: ${daysUntil} d`].join('\n');
      try {
        await this.telegramBotService.sendProactiveMessage(link.telegramUserId, msg);
        await prisma.eDoreczeniaDeadline.update({ where: { id: d.id }, data: { remindersSent: { increment: 1 }, lastRemindedAt: new Date() } });
      } catch (e) {
        logger.error('[EDorReminder] Failed to send deadline reminder', { deadlineId: d.id, error: (e as Error).message });
      }
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --filter=@accounting-ai-agent/api -- edoreczenia-reminder.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/edoreczenia/edoreczenia-reminder.service.ts packages/api/src/services/edoreczenia/__tests__/edoreczenia-reminder.service.test.ts
git commit -m "feat(edoreczenia): Telegram alert + escalating deadline reminder service"
```

---

### Task 11: Facade, singleton wiring, and index.ts lifecycle

**Files:**
- Create: `packages/api/src/services/edoreczenia/edoreczenia.service.ts`
- Create: `packages/api/src/services/edoreczenia/edoreczenia.instance.ts`
- Create: `packages/api/src/services/edoreczenia/index.ts` (barrel)
- Modify: `packages/api/src/index.ts` (import + start/stop)
- Test: `packages/api/src/services/edoreczenia/__tests__/edoreczenia.service.test.ts`

**Interfaces:**
- Consumes: all prior services.
- Produces:
  ```typescript
  class EDoreczeniaService {
    constructor(deps: { prisma, configService, certService, deadlineService });
    getLetters(userId: string, filter?: 'all'|'needs_action'|'done'): Promise<EDoreczeniaLetterRow[]>;
    getLetterById(userId: string, letterId: string): Promise<EDoreczeniaLetterRow | null>;
    markLetterDone(userId: string, letterId: string): Promise<void>;
    getActiveDeadlines(userId: string): Promise<EDoreczeniaDeadlineRow[]>;
    beginOnboarding(userId: string, commonName: string): Promise<{ csrPem: string }>;
    completeOnboarding(userId: string, certPem: string): Promise<void>;
  }
  ```
  Singletons exported from `edoreczenia.instance.ts`: `edoreczeniaService`, `mailboxPoller`, `edoreczeniaReminderService`.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/api/src/services/edoreczenia/__tests__/edoreczenia.service.test.ts
import { EDoreczeniaService } from '../edoreczenia.service';

describe('EDoreczeniaService', () => {
  it('beginOnboarding generates a CSR and stores the encrypted private key', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const configService = { storePrivateKeyAndAddress: jest.fn().mockResolvedValue(undefined) } as never;
    const certService = { generateKeyPairAndCsr: jest.fn().mockReturnValue({ privateKeyPem: 'KEY', csrPem: 'CSR' }) } as never;
    const svc = new EDoreczeniaService({ configService, certService, deadlineService: {} as never, prisma: { eDoreczeniaConfig: { upsert } } as never });
    const out = await svc.beginOnboarding('u1', 'ADE-PL-1');
    expect(out.csrPem).toBe('CSR');
    expect(certService.generateKeyPairAndCsr).toHaveBeenCalledWith({ commonName: 'ADE-PL-1' });
  });

  it('markLetterDone updates the row scoped to the user', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const svc = new EDoreczeniaService({ configService: {} as never, certService: {} as never, deadlineService: {} as never, prisma: { eDoreczeniaLetter: { updateMany } } as never });
    await svc.markLetterDone('u1', 'L1');
    expect(updateMany).toHaveBeenCalledWith({ where: { id: 'L1', userId: 'u1' }, data: { status: 'done' } });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --filter=@accounting-ai-agent/api -- edoreczenia.service`
Expected: FAIL — `Cannot find module '../edoreczenia.service'`.

- [ ] **Step 3: Add `storePrivateKeyAndAddress` to the config service**

In `packages/api/src/services/edoreczenia/config.service.ts`, add this method to the class (used by `beginOnboarding`):
```typescript
  async storePrivateKeyAndAddress(userId: string, adeAddress: string, privateKeyPem: string): Promise<void> {
    await this.prisma.eDoreczeniaConfig.upsert({
      where: { userId },
      create: { userId, adeAddress, privateKeyEnc: this.crypto.encryptToString(privateKeyPem), status: 'pending_cert' },
      update: { adeAddress, privateKeyEnc: this.crypto.encryptToString(privateKeyPem), status: 'pending_cert' },
    });
  }
```

- [ ] **Step 4: Implement the facade**

```typescript
// packages/api/src/services/edoreczenia/edoreczenia.service.ts
import { PrismaClient } from '@prisma/client';
import { EDoreczeniaConfigService } from './config.service';
import { EDoreczeniaCertificateService } from './certificate.service';
import { EDoreczeniaDeadlineService } from './deadline.service';

export type LetterFilter = 'all' | 'needs_action' | 'done';

export interface EDoreczeniaServiceDeps {
  prisma: PrismaClient;
  configService: EDoreczeniaConfigService;
  certService: EDoreczeniaCertificateService;
  deadlineService: EDoreczeniaDeadlineService;
}

export class EDoreczeniaService {
  constructor(private readonly deps: EDoreczeniaServiceDeps) {}

  getLetters(userId: string, filter: LetterFilter = 'all') {
    const where: Record<string, unknown> = { userId };
    if (filter === 'needs_action') where.status = 'needs_action';
    else if (filter === 'done') where.status = 'done';
    return this.deps.prisma.eDoreczeniaLetter.findMany({
      where, orderBy: { receivedAt: 'desc' }, include: { deadlines: true },
    });
  }

  getLetterById(userId: string, letterId: string) {
    return this.deps.prisma.eDoreczeniaLetter.findFirst({ where: { id: letterId, userId }, include: { deadlines: true } });
  }

  async markLetterDone(userId: string, letterId: string): Promise<void> {
    await this.deps.prisma.eDoreczeniaLetter.updateMany({ where: { id: letterId, userId }, data: { status: 'done' } });
  }

  getActiveDeadlines(userId: string) {
    return this.deps.prisma.eDoreczeniaDeadline.findMany({
      where: { userId, status: 'active' }, orderBy: { dueDate: 'asc' }, include: { letter: { select: { senderName: true, subject: true } } },
    });
  }

  async beginOnboarding(userId: string, commonName: string): Promise<{ csrPem: string }> {
    const { privateKeyPem, csrPem } = this.deps.certService.generateKeyPairAndCsr({ commonName });
    await this.deps.configService.storePrivateKeyAndAddress(userId, commonName, privateKeyPem);
    return { csrPem };
  }

  async completeOnboarding(userId: string, certPem: string): Promise<void> {
    await this.deps.configService.storeCertificate(userId, certPem);
  }
}
```

- [ ] **Step 5: Create the singleton instance file**

```typescript
// packages/api/src/services/edoreczenia/edoreczenia.instance.ts
import { prisma } from '../../lib/prisma';
import { cryptoService } from '../crypto.instance';
import { telegramBotService } from '../telegram-bot/telegram-bot.instance';
import { EDoreczeniaCertificateService } from './certificate.service';
import { EDoreczeniaConfigService } from './config.service';
import { EDoreczeniaDeadlineService } from './deadline.service';
import { LetterAnalysisService } from './letter-analysis.service';
import { MailboxPollerService } from './mailbox-poller.service';
import { EDoreczeniaReminderService } from './edoreczenia-reminder.service';
import { EDoreczeniaService } from './edoreczenia.service';
import { UAApiClient } from './ua-api-client';
import { ActiveConfig } from './config.service';
import { LetterAnalysisSchema } from './letter-analysis.service';

const certService = new EDoreczeniaCertificateService();
const configService = new EDoreczeniaConfigService(prisma, cryptoService, certService);
const deadlineService = new EDoreczeniaDeadlineService(prisma);

// Structured-output model factory. Reuses the runner's public static
// `LangGraphAgentRunner.createModel` + the user's stored LLM credentials.
// Both dependencies are pulled in with a DYNAMIC import (resolved at call
// time, not module load) to break the load-time cycle
// runner → edoreczenia.instance → telegram-bot.instance → ai-chat.instance → runner.
const analysisService = new LetterAnalysisService(async (userId: string) => {
  const { credentialsService } = await import('../credentials.instance');
  const { LangGraphAgentRunner } = await import('../ai-chat/langgraph-agent-runner');
  const creds = await credentialsService.getLLMCredentials(userId);
  if (!creds?.apiKey) throw new Error('No LLM API key configured');
  const model = LangGraphAgentRunner.createModel(creds.provider, creds.apiKey, creds.model);
  return (model as unknown as { withStructuredOutput: (s: unknown) => { invoke: (m: unknown) => Promise<never> } })
    .withStructuredOutput(LetterAnalysisSchema);
});

export const edoreczeniaReminderService = new EDoreczeniaReminderService(telegramBotService);

const UA_BASE_URL = process.env.EDORECZENIA_UA_BASE_URL ?? 'https://int-ua.edoreczenia.gov.pl';

export const mailboxPoller = new MailboxPollerService({
  prisma,
  configService,
  clientFactory: (cfg: ActiveConfig) => new UAApiClient({ baseUrl: UA_BASE_URL, certPem: cfg.certPem, privateKeyPem: cfg.privateKeyPem }),
  analysisService,
  deadlineService,
  onNewLetter: (userId, letterId) => edoreczeniaReminderService.alertNewLetter(userId, letterId),
});

export const edoreczeniaService = new EDoreczeniaService({ prisma, configService, certService, deadlineService });
```

> Uses `LangGraphAgentRunner.createModel(provider, apiKey, model?)` — a **public static** method that already exists (langgraph-agent-runner.ts:178). Do NOT create a second model-selection path. The dynamic `import()` calls are deliberate: they defer resolution to runtime so the static module graph stays acyclic. Do not convert them to top-level `import` statements.

- [ ] **Step 6: Create the barrel**

```typescript
// packages/api/src/services/edoreczenia/index.ts
export { EDoreczeniaService } from './edoreczenia.service';
export { edoreczeniaService, mailboxPoller, edoreczeniaReminderService } from './edoreczenia.instance';
export * from './types';
```

- [ ] **Step 7: Wire lifecycle into `index.ts`**

In `packages/api/src/index.ts`, add the import near line 39:
```typescript
import { mailboxPoller, edoreczeniaReminderService } from './services/edoreczenia';
```
In the `app.listen` callback, after `taxDeadlineReminderService.start();` (line ~177):
```typescript
  // Start e-Doręczenia mailbox poller + reminders
  mailboxPoller.start();
  edoreczeniaReminderService.start();
```
In `shutdown()`, after `taxDeadlineReminderService.stop();` (line ~205):
```typescript
  mailboxPoller.stop();
  edoreczeniaReminderService.stop();
```

- [ ] **Step 8: Run the test + typecheck to verify green**

Run: `npm run test --filter=@accounting-ai-agent/api -- edoreczenia.service`
Expected: PASS.
Run: `npm run build --filter=@accounting-ai-agent/api`
Expected: typecheck passes (no unresolved imports; `createChatModel` resolves).

- [ ] **Step 9: Commit**

```bash
git add packages/api/src/services/edoreczenia packages/api/src/index.ts
git commit -m "feat(edoreczenia): facade, singleton wiring, and app lifecycle (poller + reminders)"
```

---

### Task 12: AI chat tools + formatter + registration

**Files:**
- Create: `packages/api/src/services/edoreczenia/formatters/edelivery.formatter.ts`
- Create: `packages/api/src/services/ai-chat/tools/edelivery.tools.ts`
- Modify: `packages/api/src/services/ai-chat/tools/index.ts` (import, re-export, register with conditional spread)
- Modify: `packages/api/src/services/ai-chat/langgraph-agent-runner.ts` (pass `edoreczeniaService` into `createAllTools`)
- Test: `packages/api/src/services/ai-chat/tools/__tests__/edelivery.tools.test.ts`

**Interfaces:**
- Consumes: `EDoreczeniaService`; `getEDeliveryTranslations`; `Locale`.
- Produces: `createGetOfficialLettersTool`, `createExplainOfficialLetterTool`, `createGetLetterDeadlinesTool`, `createMarkLetterDoneTool` — each `(service, userId, locale) => StructuredToolInterface`.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/api/src/services/ai-chat/tools/__tests__/edelivery.tools.test.ts
import { createGetOfficialLettersTool, createMarkLetterDoneTool } from '../edelivery.tools';

describe('edelivery tools', () => {
  it('get_official_letters returns a localized list string', async () => {
    const service = { getLetters: jest.fn().mockResolvedValue([
      { id: 'L1', senderName: 'Urząd Skarbowy', subject: 'Wezwanie', receivedAt: new Date('2026-10-01'), status: 'needs_action', analysis: { severity: 'high' }, deadlines: [] },
    ]) } as never;
    const tool = createGetOfficialLettersTool(service, 'u1', 'pl') as never as { invoke: (a: unknown) => Promise<string> };
    const out = await tool.invoke({ filter: 'needs_action' });
    expect(out).toContain('Urząd Skarbowy');
  });

  it('mark_letter_done calls the service and confirms', async () => {
    const service = { markLetterDone: jest.fn().mockResolvedValue(undefined) } as never;
    const tool = createMarkLetterDoneTool(service, 'u1', 'pl') as never as { invoke: (a: unknown) => Promise<string> };
    const out = await tool.invoke({ letterId: 'L1' });
    expect((service as { markLetterDone: jest.Mock }).markLetterDone).toHaveBeenCalledWith('u1', 'L1');
    expect(out).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --filter=@accounting-ai-agent/api -- edelivery.tools`
Expected: FAIL — `Cannot find module '../edelivery.tools'`.

- [ ] **Step 3: Implement the formatter**

```typescript
// packages/api/src/services/edoreczenia/formatters/edelivery.formatter.ts
import { Locale, getEDeliveryTranslations } from '../../../i18n';

interface LetterRow {
  id: string;
  senderName: string | null;
  subject: string | null;
  receivedAt: Date;
  status: string;
  analysis: { severity?: string } | null;
  deadlines?: Array<{ dueDate: Date; type: string }>;
}

function severityLabel(sev: string | undefined, t: ReturnType<typeof getEDeliveryTranslations>): string {
  if (sev === 'high') return t.severityHigh;
  if (sev === 'medium') return t.severityMedium;
  return t.severityLow;
}

export function formatLettersList(letters: LetterRow[], locale: Locale): string {
  const t = getEDeliveryTranslations(locale);
  if (letters.length === 0) return t.noLetters;
  const lines = [`## ${t.lettersListTitle}`, ''];
  for (const l of letters) {
    lines.push(`- **${l.senderName ?? '—'}** — ${l.subject ?? ''}`);
    lines.push(`  ${severityLabel(l.analysis?.severity, t)} · ${l.receivedAt.toISOString().slice(0, 10)}`);
  }
  return lines.join('\n');
}

export function formatMarkedDone(locale: Locale): string {
  return `✅ ${getEDeliveryTranslations(locale).markedDone}`;
}
```

- [ ] **Step 4: Implement the tools**

```typescript
// packages/api/src/services/ai-chat/tools/edelivery.tools.ts
import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { Locale, getEDeliveryTranslations } from '../../../i18n';
// Import the CLASS from its direct module, NOT the barrel (`../../edoreczenia`),
// because the barrel re-exports the singleton instance and would pull the whole
// instance graph (telegram, ai-chat, runner) into the tool module → import cycle.
import type { EDoreczeniaService } from '../../edoreczenia/edoreczenia.service';
import { formatLettersList, formatMarkedDone } from '../../edoreczenia/formatters/edelivery.formatter';

export function createGetOfficialLettersTool(service: EDoreczeniaService, userId: string, locale: Locale): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ filter }: { filter?: 'all' | 'needs_action' | 'done' }) => {
      try {
        const letters = await service.getLetters(userId, filter ?? 'all');
        return formatLettersList(letters as never, locale);
      } catch (error) {
        logger.error('Failed to get official letters', { error });
        return `Error: ${getEDeliveryTranslations(locale).errorFetch}`;
      }
    },
    {
      name: 'get_official_letters',
      description: 'List official letters received in the user\'s e-Doręczenia government mailbox. Optionally filter to those needing action. Use when the user asks what arrived from the urząd / US / ZUS / court.',
      schema: z.object({
        filter: z.enum(['all', 'needs_action', 'done']).nullable().optional().describe('Filter letters (default all)'),
      }),
    },
  );
}

export function createExplainOfficialLetterTool(service: EDoreczeniaService, userId: string, locale: Locale): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ letterId }: { letterId: string }) => {
      try {
        const letter = await service.getLetterById(userId, letterId);
        if (!letter) return getEDeliveryTranslations(locale).noLetters;
        const a = (letter as { analysis: { summary?: string; requiredAction?: string } | null }).analysis;
        const t = getEDeliveryTranslations(locale);
        if (!a) return `${letter.senderName ?? '—'}: ${letter.subject ?? ''}`;
        return [`## ${letter.senderName ?? '—'}`, '', a.summary ?? '', '', `**${t.requiredAction}:** ${a.requiredAction ?? ''}`].join('\n');
      } catch (error) {
        logger.error('Failed to explain official letter', { error });
        return `Error: ${getEDeliveryTranslations(locale).errorFetch}`;
      }
    },
    {
      name: 'explain_official_letter',
      description: 'Explain a specific official letter in plain language: what it is, what it means, what to do, by when. Provide the letterId from get_official_letters.',
      schema: z.object({ letterId: z.string().describe('The letter id') }),
    },
  );
}

export function createGetLetterDeadlinesTool(service: EDoreczeniaService, userId: string, locale: Locale): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async () => {
      try {
        const deadlines = await service.getActiveDeadlines(userId);
        const t = getEDeliveryTranslations(locale);
        if (deadlines.length === 0) return t.noLetters;
        return deadlines.map((d) => {
          const row = d as { dueDate: Date; letter?: { senderName?: string | null } };
          return `- ${row.letter?.senderName ?? '—'} — ${row.dueDate.toISOString().slice(0, 10)}`;
        }).join('\n');
      } catch (error) {
        logger.error('Failed to get letter deadlines', { error });
        return `Error: ${getEDeliveryTranslations(locale).errorFetch}`;
      }
    },
    {
      name: 'get_letter_deadlines',
      description: 'List active response deadlines across all official letters in the e-Doręczenia mailbox.',
      schema: z.object({}),
    },
  );
}

export function createMarkLetterDoneTool(service: EDoreczeniaService, userId: string, locale: Locale): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ letterId }: { letterId: string }) => {
      try {
        await service.markLetterDone(userId, letterId);
        return formatMarkedDone(locale);
      } catch (error) {
        logger.error('Failed to mark letter done', { error });
        return `Error: ${getEDeliveryTranslations(locale).errorFetch}`;
      }
    },
    {
      name: 'mark_letter_done',
      description: 'Mark an official letter as handled/done. Provide the letterId.',
      schema: z.object({ letterId: z.string().describe('The letter id to close') }),
    },
  );
}
```

- [ ] **Step 5: Register the tools in `tools/index.ts`**

Add the import (after the ksef import block, ~line 128):
```typescript
import {
  createGetOfficialLettersTool,
  createExplainOfficialLetterTool,
  createGetLetterDeadlinesTool,
  createMarkLetterDoneTool,
} from './edelivery.tools';
```
Add the re-export (after the ksef re-export block, ~line 240):
```typescript
export {
  createGetOfficialLettersTool,
  createExplainOfficialLetterTool,
  createGetLetterDeadlinesTool,
  createMarkLetterDoneTool,
} from './edelivery.tools';
```
Add a new optional parameter to `createAllTools` (after `ksefContractorService`). Import the type from the direct module (not the barrel) to keep `tools/index.ts` free of the instance graph:
```typescript
  edoreczeniaService?: import('../../edoreczenia/edoreczenia.service').EDoreczeniaService,
```
Add the conditional spread at the end of the returned array (after the KSeF spread, before the closing `]`):
```typescript
    // E-Doręczenia tools (if edoreczeniaService is available)
    ...(edoreczeniaService ? [
      createGetOfficialLettersTool(edoreczeniaService, userId, locale),
      createExplainOfficialLetterTool(edoreczeniaService, userId, locale),
      createGetLetterDeadlinesTool(edoreczeniaService, userId, locale),
      createMarkLetterDoneTool(edoreczeniaService, userId, locale),
    ] : []),
```

- [ ] **Step 6: Pass the service in from the runner (via dynamic import to avoid a cycle)**

In `packages/api/src/services/ai-chat/langgraph-agent-runner.ts`, do NOT add a top-level `import { edoreczeniaService }` — that would create the load-time cycle runner → edoreczenia.instance → telegram-bot.instance → ai-chat.instance → runner. Instead resolve the singleton at call time. Inside `run()`, just before the `createAllTools(...)` call (~line 80), add:
```typescript
    const { edoreczeniaService } = await import('../edoreczenia');
```
Then pass `edoreczeniaService` as the final argument to the `createAllTools(...)` call (after `ksefContractorService` at ~line 90).

- [ ] **Step 7: Run the test + typecheck to verify green**

Run: `npm run test --filter=@accounting-ai-agent/api -- edelivery.tools`
Expected: PASS.
Run: `npm run build --filter=@accounting-ai-agent/api`
Expected: typecheck passes.

- [ ] **Step 8: Commit**

```bash
git add packages/api/src/services/edoreczenia/formatters packages/api/src/services/ai-chat/tools/edelivery.tools.ts packages/api/src/services/ai-chat/tools/index.ts packages/api/src/services/ai-chat/tools/__tests__/edelivery.tools.test.ts packages/api/src/services/ai-chat/langgraph-agent-runner.ts
git commit -m "feat(edoreczenia): AI chat tools + formatter, registered in the LangGraph tool set"
```

---

### Task 13: REST routes + onboarding endpoints

**Files:**
- Create: `packages/api/src/routes/edoreczenia.routes.ts`
- Modify: `packages/api/src/index.ts` (mount the router)
- Test: `packages/api/src/routes/__tests__/edoreczenia.routes.test.ts`

**Interfaces:**
- Consumes: `edoreczeniaService`; `authenticate` middleware.
- Produces: `GET /api/edoreczenia/letters`, `GET /api/edoreczenia/letters/:id`, `POST /api/edoreczenia/letters/:id/done`, `GET /api/edoreczenia/deadlines`, `POST /api/edoreczenia/onboarding/csr`, `POST /api/edoreczenia/onboarding/certificate`.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/api/src/routes/__tests__/edoreczenia.routes.test.ts
import express from 'express';
import request from 'supertest';

jest.mock('../../middleware/auth.middleware', () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => { (req as { user: unknown }).user = { id: 'u1' }; next(); },
}));
jest.mock('../../services/edoreczenia', () => ({
  edoreczeniaService: {
    getLetters: jest.fn().mockResolvedValue([{ id: 'L1', senderName: 'US' }]),
    beginOnboarding: jest.fn().mockResolvedValue({ csrPem: 'CSR' }),
  },
}));

import edoreczeniaRoutes from '../edoreczenia.routes';
import { edoreczeniaService } from '../../services/edoreczenia';

const app = express();
app.use(express.json());
app.use('/api/edoreczenia', edoreczeniaRoutes);

describe('edoreczenia routes', () => {
  it('GET /letters returns the user\'s letters', async () => {
    const res = await request(app).get('/api/edoreczenia/letters');
    expect(res.status).toBe(200);
    expect(res.body.letters[0].id).toBe('L1');
    expect((edoreczeniaService.getLetters as jest.Mock)).toHaveBeenCalledWith('u1', 'all');
  });

  it('POST /onboarding/csr returns a CSR for download', async () => {
    const res = await request(app).post('/api/edoreczenia/onboarding/csr').send({ commonName: 'ADE-PL-1' });
    expect(res.status).toBe(200);
    expect(res.body.csrPem).toBe('CSR');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --filter=@accounting-ai-agent/api -- edoreczenia.routes`
Expected: FAIL — `Cannot find module '../edoreczenia.routes'`.

- [ ] **Step 3: Implement the routes**

```typescript
// packages/api/src/routes/edoreczenia.routes.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { edoreczeniaService } from '../services/edoreczenia';
import { logger } from '../utils/logger';

const router = Router();
router.use(authenticate);

function userId(req: Request): string {
  return (req as unknown as { user: { id: string } }).user.id;
}

router.get('/letters', async (req: Request, res: Response) => {
  try {
    const filter = (req.query.filter as 'all' | 'needs_action' | 'done') ?? 'all';
    const letters = await edoreczeniaService.getLetters(userId(req), filter);
    res.json({ letters });
  } catch (e) {
    logger.error('[edoreczenia] GET /letters failed', { error: (e as Error).message });
    res.status(500).json({ error: 'Failed to fetch letters' });
  }
});

router.get('/letters/:id', async (req: Request, res: Response) => {
  const letter = await edoreczeniaService.getLetterById(userId(req), req.params.id);
  if (!letter) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ letter });
});

router.post('/letters/:id/done', async (req: Request, res: Response) => {
  await edoreczeniaService.markLetterDone(userId(req), req.params.id);
  res.json({ ok: true });
});

router.get('/deadlines', async (req: Request, res: Response) => {
  const deadlines = await edoreczeniaService.getActiveDeadlines(userId(req));
  res.json({ deadlines });
});

const CsrSchema = z.object({ commonName: z.string().min(1) });
router.post('/onboarding/csr', async (req: Request, res: Response) => {
  const parsed = CsrSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'commonName required' }); return; }
  const out = await edoreczeniaService.beginOnboarding(userId(req), parsed.data.commonName);
  res.json({ csrPem: out.csrPem });
});

const CertSchema = z.object({ certPem: z.string().min(1) });
router.post('/onboarding/certificate', async (req: Request, res: Response) => {
  const parsed = CertSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'certPem required' }); return; }
  await edoreczeniaService.completeOnboarding(userId(req), parsed.data.certPem);
  res.json({ ok: true });
});

export default router;
```

- [ ] **Step 4: Mount the router in `index.ts`**

In `packages/api/src/index.ts`, add the import with the other route imports (near line 24):
```typescript
import edoreczeniaRoutes from './routes/edoreczenia.routes';
```
Mount it with the other `app.use('/api/...')` lines (near line 150):
```typescript
app.use('/api/edoreczenia', edoreczeniaRoutes);
```

- [ ] **Step 5: Run the test + typecheck to verify green**

Run: `npm run test --filter=@accounting-ai-agent/api -- edoreczenia.routes`
Expected: PASS.
Run: `npm run build --filter=@accounting-ai-agent/api`
Expected: typecheck passes.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/edoreczenia.routes.ts packages/api/src/routes/__tests__/edoreczenia.routes.test.ts packages/api/src/index.ts
git commit -m "feat(edoreczenia): REST routes for letters, deadlines, and onboarding"
```

---

### Task 14: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole API test suite**

Run: `npm run test --filter=@accounting-ai-agent/api`
Expected: all tests pass, including the 11 new edoreczenia/edelivery suites.

- [ ] **Step 2: Typecheck + build the API package**

Run: `npm run build --filter=@accounting-ai-agent/api`
Expected: clean build, no unresolved imports.

- [ ] **Step 3: Lint**

Run: `npm run lint --filter=@accounting-ai-agent/api`
Expected: no new lint errors in `services/edoreczenia/**` or `tools/edelivery.tools.ts`.

- [ ] **Step 4: Confirm lifecycle wiring by inspection**

Verify `packages/api/src/index.ts` starts `mailboxPoller` + `edoreczeniaReminderService` in the `listen` callback and stops both in `shutdown()`, and mounts `/api/edoreczenia`.

- [ ] **Step 5: Commit any lint fixes**

```bash
git add -A
git commit -m "chore(edoreczenia): full-suite verification fixes" || echo "nothing to commit"
```

---

## Next plan (not in scope here)

Frontend subsystem — separate spec-to-plan cycle:
- `packages/web` Skrzynka page (`app/skrzynka/`): letters list with severity chips + deadline countdowns, detail view with AI summary + attachment downloads, "Zapytaj AI" hand-off to chat.
- Onboarding wizard UI (4 steps from spec §6.1) consuming `/api/edoreczenia/onboarding/*`, with the heavily-illustrated Moduł uprawnień instructions.
- Settings toggle for `autoReceive` / `notifyEnabled` / `notifyLeadDays`.

Deferred to a later version (spec §11): reply drafting (czynny żal, odpowiedź na wezwanie); commercial e-Doręczenia providers; weekly email digest.
