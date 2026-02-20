# KSeF Integration

KSeF (Krajowy System e-Faktur) is Poland's National e-Invoice System. This module provides full integration: creating and submitting FA(3) XML invoices, tracking statuses, downloading UPO (official confirmation), receiving incoming invoices, and managing contractors.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Database Schema](#database-schema)
3. [Backend Services](#backend-services)
4. [AI Tools](#ai-tools)
5. [REST API](#rest-api)
6. [Configuration](#configuration)
7. [Frontend](#frontend)
8. [Error Handling](#error-handling)
9. [Contractor Auto-fill](#contractor-auto-fill)
10. [Type Definitions](#type-definitions)
11. [Data Flows](#data-flows)

---

## Architecture

The module is built on the **Adapter Pattern** — a single `KSeFService` facade routes through swappable adapters:

```
AI Chat / REST API
        │
        ▼
   KSeFService  (facade)
        │
   ┌────┴────┐
   ▼         ▼
WFirmaKSeFAdapter     DirectKSeFAdapter
(proxy via wFirma     (direct KSeF 2.0 API
— in progress)        with XML generation)
        │
        ▼
 KSeFXMLGenerator  (FA3 XML)
 DirectKSeFClient  (HTTP)
 KSeFCertificateService
```

**Background services:**
- `KSeFStatusPoller` — periodically polls statuses of submitted invoices
- `KSeFAutoSendService` — automatically sends invoices when created in wFirma

**File structure:**
```
packages/api/src/services/ksef/
├── ksef.service.ts            # Main facade
├── ksef.instance.ts           # Singleton instance
├── contractor.service.ts      # KSeF contractor management
├── contractor.instance.ts     # Contractor singleton
├── certificate.service.ts     # Digital certificates
├── xml-generator.ts           # FA(3) XML generation
├── status-poller.service.ts   # Background status polling
├── status-poller.instance.ts
├── auto-send.service.ts       # Auto-send on invoice creation
├── auto-send.instance.ts
├── invoice-pdf-generator.ts   # PDF generation from FA(3)
├── crypto.ts                  # KSeF API encryption
├── errors.ts                  # Error class hierarchy
├── index.ts                   # Public exports
└── adapters/
    ├── adapter.interface.ts   # IKSeFAdapter interface
    ├── wfirma-adapter.ts      # wFirma adapter
    ├── direct-adapter.ts      # Direct KSeF 2.0 adapter
    └── direct-ksef-client.ts  # KSeF API HTTP client

packages/api/src/routes/ksef.routes.ts
packages/api/src/types/ksef.types.ts
packages/api/src/services/ai-chat/tools/ksef.tools.ts
packages/api/src/services/ai-chat/formatters/ksef.formatter.ts
```

---

## Database Schema

### KSeFConfig

Per-user KSeF settings. One record per user.

```prisma
model KSeFConfig {
  id                String   @id @default(uuid())
  userId            String   @unique @db.Uuid
  preferredAdapter  String   @default("wfirma")   // 'wfirma' | 'direct'
  autoSendEnabled   Boolean  @default(false)
  autoSendOnCreate  Boolean  @default(false)
  environment       String   @default("test")      // 'test' | 'demo' | 'production'
  defaultCertId     String?  @db.Uuid
  notifyOnAccepted  Boolean  @default(true)
  notifyOnRejected  Boolean  @default(true)
  notificationEmail String?
  ksefToken         String?  // KSeF authorization token
  ksefNip           String?  // User's NIP for direct API sessions
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### KSeFCertificate

Digital certificates for direct KSeF authentication.

```prisma
model KSeFCertificate {
  id              String    @id @default(uuid())
  userId          String    @db.Uuid
  certificateData String    // base64-encoded certificate data
  password        String?
  subject         String
  issuer          String
  serialNumber    String
  validFrom       DateTime
  validUntil      DateTime
  isActive        Boolean   @default(true)  // soft-delete flag
  isDefault       Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### KSeFSession

Active KSeF API sessions.

```prisma
model KSeFSession {
  id             String    @id @default(uuid())
  userId         String    @db.Uuid
  sessionToken   String
  certificateId  String?   @db.Uuid
  status         String    // 'active' | 'expired' | 'terminated' | 'failed'
  initiatedAt    DateTime  @default(now())
  expiresAt      DateTime
  terminatedAt   DateTime?
  environment    String    @default("test")
  lastUsedAt     DateTime  @updatedAt
}
```

### KSeFInvoiceStatus

Tracks all submitted and received KSeF invoices.

```prisma
model KSeFInvoiceStatus {
  id                   String    @id @default(uuid())
  userId               String    @db.Uuid
  wfirmaInvoiceId      String?
  ksefReferenceNumber  String?   @unique   // canonical: NIP-YYYYMMDD-hash
  ksefInvoiceNumber    String?             // invoice number within KSeF
  ksefSessionRef       String?             // session reference for status polling
  contractorName       String?
  contractorNip        String?
  totalGross           Decimal?  @db.Decimal(12, 2)
  currency             String    @default("PLN")
  invoiceDate          DateTime?
  status               String    @default("pending")
  // 'pending' | 'sending' | 'sent' | 'accepted' | 'rejected' | 'completed' | 'failed'
  adapter              String    @default("wfirma")  // 'wfirma' | 'direct'
  direction            String    @default("sent")    // 'sent' | 'received'
  sessionId            String?   @db.Uuid
  upoDownloaded        Boolean   @default(false)
  upoContent           Bytes?
  upoDownloadedAt      DateTime?
  sentAt               DateTime?
  acceptedAt           DateTime?
  rejectedAt           DateTime?
  invoicePayload       Json?     // full FA(3) data — used for copy/duplicate feature
  errorCode            String?
  errorMessage         String?
  retryCount           Int       @default(0)
  lastRetryAt          DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  @@index([userId, status])
  @@index([userId, direction])
  @@index([userId, sentAt])
}
```

**`invoicePayload` field:** stores the full `FA3InvoiceData` object (JSON) — used for:
- Invoice copy / duplicate feature
- Re-generating PDF/XML without external API calls
- Audit history

### KSeFContractor

Local contractor database for invoice party auto-fill.

```prisma
model KSeFContractor {
  id        String   @id @default(uuid())
  userId    String   @db.Uuid
  name      String
  nip       String?
  email     String?
  street    String?
  city      String?
  zip       String?
  country   String   @default("PL")
  source    String   @default("local")  // 'local' | 'wfirma' | 'company'
  wfirmaId  String?  // ID in wFirma (null for local-only)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, wfirmaId])
  @@index([userId, source])
}
```

**`source` values:**
- `company` — user's own company (synced from wFirma company profile)
- `wfirma` — contractors from wFirma (auto-synced)
- `local` — created manually in the app (full CRUD access)

---

## Backend Services

### KSeFService (`ksef.service.ts`)

Main facade. Accepts all requests and routes to the appropriate adapter.

#### Methods

**`sendInvoiceToKSeF(userId, options)`**
```typescript
options: {
  invoiceId?: string        // wFirma invoice ID (for wFirma adapter)
  adapter?: 'wfirma' | 'direct'
  invoiceData?: FA3InvoiceData  // direct data (for direct adapter without wFirma)
}
returns: Promise<SendToKSeFResult>
```
Resolves the adapter from `KSeFConfig.preferredAdapter` when not explicitly specified.

**`getInvoiceStatus(userId, referenceNumber)`**
Returns status from the database; if status is `sent`/`sending`, refreshes via live API call.

**`downloadUPO(userId, referenceNumber)`**
Returns cached UPO or downloads from KSeF. Cached in `KSeFInvoiceStatus.upoContent`.

**`queryInvoices(userId, options)`**
Filters from local DB. When `direction='received'`, first fetches new invoices from KSeF API.

**`bulkSendInvoices(userId, options)`**
Batch submission. `continueOnError` flag controls behavior on individual failures.

**`downloadInvoice(userId, referenceNumber, format)`**
- `format='xml'` — returns FA(3) XML from KSeF
- `format='pdf'` — generates PDF via `invoice-pdf-generator.ts` with KSeF QR code; falls back to simplified PDF from DB metadata

**`matchIncomingInvoice(userId, referenceNumber)`**
Searches for a match between an incoming KSeF invoice and wFirma records by: invoice number, contractor NIP, gross amount.

**`getStatistics(userId)`**
Aggregates `KSeFInvoiceStatus`: totals by status, monthly breakdown.

---

### KSeFXMLGenerator (`xml-generator.ts`)

Generates XML conforming to the FA(3) v1-0E standard, compatible with KSeF 2.0.

#### Generated XML Structure

```xml
<Faktura xmlns="http://crd.gov.pl/wzor/2025/06/25/13775/"
         xmlns:etd="http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2022/01/05/eD/DefinicjeTypy/">
  <Naglowek>
    <KodFormularza>FA (3)</KodFormularza>
    <DataWytworzeniaFa>...</DataWytworzeniaFa>
    <SystemInfo>AccountingAIAgent</SystemInfo>
  </Naglowek>
  <Podmiot1>             <!-- Seller -->
    <DaneIdentyfikacyjne>
      <NIP>...</NIP>     <!-- 10 digits, no dashes -->
      <PelnaNazwa>...</PelnaNazwa>
    </DaneIdentyfikacyjne>
    <Adres><AdresL1>...</AdresL1><AdresL2>...</AdresL2></Adres>
  </Podmiot1>
  <Podmiot2>             <!-- Buyer -->
    ...
  </Podmiot2>
  <Fa>
    <KodWaluty>PLN</KodWaluty>
    <P_1>2026-02-19</P_1>       <!-- Data wystawienia (issue date) -->
    <P_2>FV/2026/02/001</P_2>   <!-- Invoice number -->
    <P_6>2026-02-19</P_6>       <!-- Data sprzedaży (sale date) -->
    <!-- P_13_*/P_14_* — VAT amounts by rate -->
    <P_15>12300.00</P_15>       <!-- Total gross (REQUIRED) -->
    <Adnotacje>                 <!-- P_16..P_23 annotation flags -->
      <P_16>2</P_16> ... <P_23>2</P_23>
    </Adnotacje>
    <RodzajFaktury>VAT</RodzajFaktury>
    <FaWiersz>...</FaWiersz>   <!-- Line items (0..10000) -->
    <Platnosc>
      <Termin>2026-03-05</Termin>
      <FormaPlatnosci>6</FormaPlatnosci>  <!-- 6 = bank transfer -->
    </Platnosc>
  </Fa>
</Faktura>
```

#### Supported VAT Rates (`vatRate`)

| Value | Description |
|-------|-------------|
| `"23"` / `23` | Standard rate 23% |
| `"8"` / `8` | Reduced rate 8% |
| `"5"` / `5` | Reduced rate 5% |
| `"0 KR"` | 0% domestic |
| `"0 WDT"` | 0% intra-EU supply |
| `"0 EX"` | 0% export |
| `"zw"` | VAT-exempt |
| `"oo"` | Reverse charge |
| `"np I"` | Outside scope (I) |
| `"np II"` | Outside scope (II) |

> **Note:** `vatRate` in `FA3InvoiceItem` is typed as `string`. When passed via AI tool as a number, it is automatically converted via `String(vatRate)`.

#### Payment Method Codes

| Code | Method |
|------|--------|
| 1 | Cash (Gotówka) |
| 2 | Card (Karta) |
| 3 | Voucher (Bon) |
| 4 | Cheque (Czek) |
| 5 | Credit (Kredyt) |
| 6 | Bank transfer (Przelew) |
| 7 | Mobile payment (Mobilna) |

---

### DirectKSeFAdapter (`adapters/direct-adapter.ts`)

Direct integration with the KSeF 2.0 API.

#### Invoice Submission Workflow

```
sendInvoice(userId, options)
  │
  ├─ options.invoiceData provided → use as-is
  └─ options.invoiceId provided → load from wFirma
        │
        ▼
  generateFA3XML(invoiceData)
        │
        ▼
  KSeFInvoiceStatus.create(status='pending', invoicePayload=fa3Data)
        │
        ├─ no ksefToken/ksefNip → return {status:'pending', message:'Configure KSeF token'}
        └─ credentials available →
              DirectKSeFClient.openSession()
              DirectKSeFClient.submitInvoice(xml)
              DirectKSeFClient.checkStatus()  → 200=accepted, >=400=rejected
              DirectKSeFClient.closeSession()
              KSeFInvoiceStatus.update(status, ksefReferenceNumber)
              return {success, referenceNumber, status}
```

#### Canonical Reference Resolution

KSeF returns two types of references:
- **Canonical:** `NIP-YYYYMMDD-HASH` — permanent identifier
- **Element ref:** temporary reference for a specific session element

The adapter stores both and can resolve an element ref to canonical for UPO download and XML retrieval.

---

### KSeFContractorService (`contractor.service.ts`)

Manages the local contractor database for invoice party auto-fill.

#### Methods

**`listContractors(userId, search?)`**
Returns contractors ordered by priority: `company` → `wfirma` → `local`. Searches by name (ILIKE) or NIP.

**`syncFromWFirma(userId)`**
Syncs contractors from wFirma into `KSeFContractor`:
- wFirma contractors → `source='wfirma'`
- User's company data → `source='company'`, `wfirmaId='company-{id}'`
- Upsert by `(userId, wfirmaId)`

**`createLocalContractor / updateLocalContractor / deleteLocalContractor`**
CRUD available only for `source='local'`. Attempting to modify `wfirma`/`company` records throws a 403 error.

**`getCompanyEntry(userId)`**
Returns the user's own company record (`source='company'`). Used to pre-fill seller details.

---

### KSeFStatusPoller (`status-poller.service.ts`)

Background service that checks invoice statuses every minute.

**Poll logic:**
1. Finds invoices with status `sent`/`sending`, `sentAt > 1 minute ago`, and a non-null `ksefReferenceNumber`
2. Fetches live status via `ksefService.getInvoiceStatus()`
3. On status change:
   - Updates `KSeFInvoiceStatus` in DB
   - If `accepted` → sends email notification, auto-downloads UPO
   - If UPO downloaded → transitions to `completed`
   - If `rejected` → sends email with error code
4. Per-invoice errors do not interrupt the polling cycle

---

### KSeFAutoSendService (`auto-send.service.ts`)

Called by the wFirma invoice creation hook.

```typescript
async onInvoiceCreated(userId: string, invoiceId: string): Promise<void>
```

- Checks `KSeFConfig.autoSendEnabled && autoSendOnCreate`
- Calls `ksefService.sendInvoiceToKSeF()`
- Never throws: invoice creation must succeed regardless of KSeF availability

---

## AI Tools

Located in `packages/api/src/services/ai-chat/tools/ksef.tools.ts`.

### Available Tools

| Tool | Description |
|------|-------------|
| `create_and_send_to_ksef` | Create an invoice from chat and send to KSeF (with contractor DB auto-fill) |
| `send_invoice_to_ksef` | Send an existing wFirma invoice to KSeF by ID |
| `check_ksef_status` | Check invoice status by reference number |
| `download_ksef_upo` | Download UPO for an accepted invoice |
| `query_ksef_invoices` | Query invoice list with filters |
| `get_incoming_ksef_invoices` | Retrieve incoming invoices from KSeF |
| `match_incoming_ksef_invoice` | Match an incoming invoice against wFirma records |
| `get_ksef_statistics` | KSeF statistics (totals by status, monthly breakdown) |
| `bulk_send_to_ksef` | Batch-send multiple invoices |

### Tool `create_and_send_to_ksef`

The primary tool for creating invoices from chat. Parameter schema:

```typescript
{
  // Required
  invoiceNumber: string       // "FV/2026/02/001"
  issueDate: string           // ISO: "2026-02-19"
  sellDate: string            // ISO: "2026-02-19"
  dueDate: string             // ISO: "2026-03-05"
  sellerName: string          // seller company name
  buyerName: string           // buyer company name
  items: FA3ItemSchema[]      // line items (at least 1 required)
  totalNet: number
  totalVat: number
  totalGross: number

  // Optional — auto-filled from contractor DB if missing
  sellerNip?: string
  sellerStreet?: string
  sellerCity?: string
  sellerZip?: string
  sellerCountry?: string      // default: "PL"
  buyerNip?: string
  buyerStreet?: string
  buyerCity?: string
  buyerZip?: string
  buyerCountry?: string       // default: "PL"

  // Optional — payment
  currency?: string           // default: "PLN"
  paymentMethod?: string      // default: "transfer"
  paymentAccount?: string     // IBAN
}
```

**Line item (`FA3ItemSchema`):**
```typescript
{
  name: string
  quantity: number
  unit?: string               // default: "szt."
  priceNet: number
  vatRate: string | number    // "23", "8", "zw", 23, 8, 0
  totalNet: number
  totalVat: number
  totalGross: number
}
```

---

## Contractor Auto-fill

> Implemented in [ksef.tools.ts](../packages/api/src/services/ai-chat/tools/ksef.tools.ts).

### Problem

When creating an invoice through chat, the user provides only the company name (e.g. "Micode Sp. z o. o.") without NIP or address. KSeF rejects invoices with an invalid NIP (`0000000000`):

```
"The 'NIP' element is invalid - The value '0000000000' is invalid according
to its datatype 'TNrNIP' - The Pattern constraint failed."
```

### Solution

`createDirectSendToKSeFTool` accepts a `KSeFContractorService` instance and automatically fills in missing party details from the local contractor database.

### Auto-fill Algorithm

```
For each party (seller, buyer):

1. If NIP / address not provided by the AI model:
   contractorService.listContractors(userId, partyName)
        │
        ▼
   Find match by name:
     match = results.find(c =>
       c.name.includes(partyName) || partyName.includes(c.name)
     )
        │
        ├─ match found → fill missing fields from match
        └─ not found  → fields remain undefined

2. After lookup:
   ├─ NIP still null → return error asking user to provide NIP explicitly
   └─ address still null → use placeholder ('-', '00-000')
      (FA3 XML requires non-empty address fields)
```

### Source Priority

```
Explicitly provided parameters (from AI)
         > source='company'  (own company record)
         > source='wfirma'   (synced from wFirma)
         > source='local'    (created manually)
         > placeholder ('-', '00-000')
```

### Example

**User message:**
```
Utwórz i wyślij fakturę w KSeF:
Sprzedawca: Micode Sp. z o. o.
Nabywca: Micode Sp. z o. o.
```

**Behavior:**
1. AI passes only `sellerName="Micode Sp. z o. o."` — no NIP or address
2. Tool searches `KSeFContractor` by name
3. Finds `source='company'` record with NIP=`1234567890` and full address
4. Fills the resolved data into `FA3InvoiceData`
5. Generates valid XML and submits to KSeF

### Dependency Wiring

```
createDirectSendToKSeFTool
  └─ contractorService: KSeFContractorService  (from contractor.instance.ts)

createAllTools (tools/index.ts)
  └─ ksefContractorService?: KSeFContractorService  (8th parameter)

AIChatService.processMessage (ai-chat.service.ts)
  └─ import { ksefContractorService } from '../ksef/contractor.instance'
  └─ createAllTools(..., ksefContractorService)
```

---

## REST API

All routes require JWT authentication (`Authorization: Bearer <token>`).

### Send Invoices

**`POST /api/ksef/send`**
```json
// Request
{ "invoiceId": "wfirma-invoice-id", "adapter": "direct" }

// Response
{
  "success": true,
  "referenceNumber": "1234567890-20260219-ABCD1234",
  "status": "accepted",
  "adapter": "direct",
  "message": "Faktura wysłana do KSeF",
  "timestamp": "2026-02-19T10:00:00.000Z"
}
```

**`POST /api/ksef/send-raw`**
Submits `FA3InvoiceData` directly without wFirma. Used by the KSeF frontend form.

### Status & UPO

**`GET /api/ksef/status/:referenceNumber`**
```json
{
  "referenceNumber": "1234567890-20260219-ABCD1234",
  "invoiceNumber": "FV/2026/02/001",
  "status": "accepted",
  "adapter": "direct",
  "sentAt": "2026-02-19T10:00:00.000Z",
  "acceptedAt": "2026-02-19T10:00:05.000Z",
  "upoAvailable": true
}
```

**`GET /api/ksef/upo/:referenceNumber`**
Returns UPO XML (`Content-Type: application/xml`, `Content-Disposition: attachment`).

### Invoice List

**`GET /api/ksef/invoices`**

| Parameter | Type | Description |
|-----------|------|-------------|
| `dateFrom` | ISO string | Filter from date |
| `dateTo` | ISO string | Filter to date |
| `status` | string | pending / sent / accepted / rejected / completed / failed |
| `direction` | string | `sent` or `received` (received = fetches fresh from KSeF) |
| `limit` | number | Default: 50 |
| `offset` | number | For pagination |

**`GET /api/ksef/invoices/:referenceNumber`**
Invoice details including `invoicePayload` (full `FA3InvoiceData` for copy feature).

**`GET /api/ksef/invoices/:referenceNumber/download?format=pdf|xml`**
Download invoice as PDF (with KSeF QR code) or XML.

### Bulk Send

**`POST /api/ksef/bulk/send`**
```json
// Request
{ "invoiceIds": ["id1", "id2", "id3"], "continueOnError": true }

// Response
{
  "total": 3, "successful": 2, "failed": 1,
  "results": [
    { "success": true, "referenceNumber": "...", "status": "accepted" },
    { "success": false, "status": "failed", "message": "..." }
  ]
}
```

### Statistics & Config

**`GET /api/ksef/statistics`**
```json
{
  "totalSent": 45,
  "totalReceived": 12,
  "acceptedCount": 42,
  "rejectedCount": 2,
  "pendingCount": 1,
  "completedCount": 40,
  "byMonth": [
    { "month": "2026-02", "sent": 10, "received": 3, "accepted": 9, "rejected": 1 }
  ]
}
```

**`GET /api/ksef/config`** / **`PATCH /api/ksef/config`**
```json
{
  "preferredAdapter": "direct",
  "autoSendEnabled": true,
  "autoSendOnCreate": false,
  "environment": "production",
  "notifyOnAccepted": true,
  "notifyOnRejected": true,
  "notificationEmail": "user@company.pl",
  "ksefToken": "eyJ...",
  "ksefNip": "1234567890"
}
```

### Contractors

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/ksef/contractors?search=...` | List with optional search |
| `POST` | `/api/ksef/contractors/sync` | Sync from wFirma (202 Accepted, non-blocking) |
| `POST` | `/api/ksef/contractors` | Create a local contractor |
| `PUT` | `/api/ksef/contractors/:id` | Update (only `source='local'`) |
| `DELETE` | `/api/ksef/contractors/:id` | Delete (only `source='local'`) |
| `GET` | `/api/ksef/company` | Own company entry (`source='company'`) or 404 |

---

## Configuration

### Environment Variables

KSeF credentials are stored in `KSeFConfig` (per-user, in the database), not in `.env`. For server-level settings:

```env
# Status polling interval in ms (default: 60000)
KSEF_POLL_INTERVAL_MS=60000
```

### Setup via API

```bash
# Set KSeF token and NIP for direct authentication
PATCH /api/ksef/config
{
  "ksefToken": "eyJhbGciOiJSUzI1NiJ9...",
  "ksefNip": "1234567890",
  "preferredAdapter": "direct",
  "environment": "production"
}
```

### Contractor Sync

Before first use, sync contractors from wFirma to populate the auto-fill database:

```bash
POST /api/ksef/contractors/sync
```

This fills the `KSeFContractor` table with wFirma data (NIP, addresses) — required for party auto-fill when creating invoices via chat.

---

## Frontend

### `useKSeF` Hook

**File:** `packages/web/src/hooks/useKSeF.ts`

```typescript
const {
  // Data (React Query)
  invoices,         // KSeFInvoiceListItem[]
  statistics,       // KSeFStatistics
  config,           // KSeFConfig

  // Loading states
  isLoadingInvoices, isLoadingStatistics, isLoadingConfig,
  isSending,

  // Actions (mutations)
  sendInvoice(invoiceId, adapter?),
  bulkSend(invoiceIds, continueOnError?),
  updateConfig(updates),

  // Imperative queries
  checkStatus(referenceNumber),  // → Promise<KSeFStatusInfo>
  downloadUPO(referenceNumber),  // → Promise<Blob>
  downloadInvoice(referenceNumber, format?), // → Promise<Blob>

  // Refetch
  refetchInvoices(),
  refetchStatistics(),

  // Mutation results
  lastSendResult,
  lastBulkResult,
} = useKSeF()
```

### `useKSeFContractors` Hook

```typescript
const {
  contractors,     // KSeFContractor[]
  isLoading, error,
  createContractor(data),    isCreating,
  updateContractor(id, data), isUpdating,
  deleteContractor(id),      isDeleting,
  syncContractors(),         isSyncing,
} = useKSeFContractors()
```

### API Client

**File:** `packages/web/src/lib/api/ksef.ts`

```typescript
import {
  sendInvoiceToKSeF,     // POST /api/ksef/send
  sendRawInvoiceToKSeF,  // POST /api/ksef/send-raw
  getKSeFStatus,         // GET  /api/ksef/status/:ref
  getKSeFInvoices,       // GET  /api/ksef/invoices
  downloadKSeFUPO,       // GET  /api/ksef/upo/:ref         → Blob
  downloadKSeFInvoice,   // GET  /api/ksef/invoices/:ref/download → Blob
  bulkSendToKSeF,        // POST /api/ksef/bulk/send
  getKSeFStatistics,     // GET  /api/ksef/statistics
  getKSeFConfig,         // GET  /api/ksef/config
  updateKSeFConfig,      // PATCH /api/ksef/config
  getKSeFContractors,    // GET  /api/ksef/contractors
  syncKSeFContractors,   // POST /api/ksef/contractors/sync
} from '@/lib/api/ksef'
```

---

## Error Handling

### Error Class Hierarchy

```
KSeFError (base, HTTP 500)
├── KSeFAuthenticationError     (401) — invalid token or certificate
├── KSeFSessionExpiredError      (401) — session has expired
├── KSeFConnectionError          (503) — KSeF API unreachable
├── KSeFValidationError          (400) — invalid invoice data
├── KSeFInvoiceRejectedError     (422) — invoice rejected by KSeF
│     └─ field: rejectionReason
├── KSeFCertificateError         (500) — certificate operation failed
├── KSeFXMLGenerationError       (500) — FA(3) XML generation failed
└── KSeFEncryptionError          (500) — encryption operation failed
```

### Common Errors and Resolutions

| Error | Cause | Resolution |
|-------|-------|------------|
| `TNrNIP - The Pattern constraint failed` | NIP is `0000000000` or invalid format | Sync contractors (`POST /api/ksef/contractors/sync`), then retry |
| `KSeFAuthenticationError` | Expired or invalid `ksefToken` | Update token in KSeF settings |
| `KSeFConnectionError` | KSeF API unavailable | Verify environment (`'test'` vs `'production'`) |
| `KSeFInvoiceRejectedError` | Invalid FA(3) XML content | Check: NIP is 10 digits, amounts without rounding, required fields present |
| `KSeFXMLGenerationError` | Invalid invoice data structure | Verify date formats (ISO), `vatRate` as string, `totalGross > 0` |

---

## Type Definitions

### `FA3InvoiceData`

```typescript
interface FA3InvoiceData {
  invoiceNumber: string      // "FV/2026/02/001"
  issueDate: Date
  sellDate: Date
  dueDate: Date
  sellerName: string
  sellerNip: string          // 10 digits, no separators
  sellerAddress: FA3Address
  buyerName: string
  buyerNip: string
  buyerAddress: FA3Address
  items: FA3InvoiceItem[]
  totalNet: number
  totalVat: number
  totalGross: number
  currency: string           // "PLN", "EUR", "USD", ...
  paymentMethod: string      // "transfer", "cash", "card", ...
  paymentAccount?: string    // IBAN
  invoiceType?: 'VAT' | 'KOR' | 'ZAL' | 'ROZ'
  isPaid?: boolean
  annotations?: FA3Annotations
}

interface FA3Address {
  street: string   // "ul. Marszałkowska 1"
  city: string     // "Warszawa"
  zip: string      // "00-001"
  country: string  // "PL"
}

interface FA3InvoiceItem {
  name: string
  quantity: number
  unit: string     // "szt.", "godz.", "kg", "m2", ...
  priceNet: number
  vatRate: string  // "23", "8", "5", "0 KR", "zw", "np I", ...
  totalNet: number
  totalVat: number
  totalGross: number
}
```

### `SendToKSeFResult`

```typescript
interface SendToKSeFResult {
  success: boolean
  referenceNumber?: string   // null when status is 'pending'
  status: KSeFInvoiceStatus
  adapter: KSeFAdapterType
  message: string
  timestamp: Date
}
```

### `KSeFStatistics`

```typescript
interface KSeFStatistics {
  totalSent: number
  totalReceived: number
  acceptedCount: number
  rejectedCount: number
  pendingCount: number
  completedCount: number
  lastSentAt?: Date
  lastReceivedAt?: Date
  byMonth: Array<{
    month: string   // "YYYY-MM"
    sent: number
    received: number
    accepted: number
    rejected: number
  }>
}
```

---

## Data Flows

### Sending an Invoice via Chat

```
User: "Wyślij fakturę: Micode Sp. z o. o. ..."
      │
      ▼
AIChatService.processMessage()
      │
      ▼
LangGraph → tool call: create_and_send_to_ksef
      │
      ▼
createDirectSendToKSeFTool()
  ├─ sellerNip missing → KSeFContractorService.listContractors(userId, "Micode")
  │     └─ found source='company' record → NIP=1234567890, address
  ├─ buyerNip missing  → same lookup
  ├─ compose FA3InvoiceData with resolved party details
  └─ KSeFService.sendInvoiceToKSeF(userId, { invoiceData })
        │
        ▼
  DirectKSeFAdapter.sendInvoice()
    ├─ KSeFXMLGenerator.generateFA3XML(data) → XML string
    ├─ KSeFInvoiceStatus.create(payload=fa3Data, status='pending')
    ├─ DirectKSeFClient.openSession(ksefToken, ksefNip)
    ├─ DirectKSeFClient.submitInvoice(xml)
    ├─ DirectKSeFClient.checkStatus() → 200 = accepted
    └─ KSeFInvoiceStatus.update(status='accepted', referenceNumber='...')
        │
        ▼
  formatKSeFSendResult() → markdown response to user
```

### Background Status Updates

```
KSeFStatusPoller (every 60 sec)
      │
      ▼
findMany({ status: ['sent','sending'], ksefReferenceNumber: { not: null } })
      │
      ▼
for each invoice:
  getInvoiceStatus(userId, referenceNumber)
      │
      ├─ status changed →
      │     update(KSeFInvoiceStatus)
      │     if accepted → downloadUPO() + EmailService.sendNotification()
      │     if upoDownloaded → update(status='completed')
      │     if rejected → EmailService.sendNotification(errorCode)
      └─ error → logger.warn(), continue
```

### Contractor Sync

```
POST /api/ksef/contractors/sync  (202 Accepted — non-blocking)
      │
      ▼
KSeFContractorService.syncFromWFirma(userId)
      │
      ├─ WFirmaIntegrationService.getContractors()
      │     └─ upsert KSeFContractor (source='wfirma') by wfirmaId
      └─ WFirmaIntegrationService.getCompanyData()
            └─ upsert KSeFContractor (source='company') wfirmaId='company-{id}'
```

---

## Related Files

| File | Purpose |
|------|---------|
| [ksef.service.ts](../packages/api/src/services/ksef/ksef.service.ts) | Main KSeF facade |
| [direct-adapter.ts](../packages/api/src/services/ksef/adapters/direct-adapter.ts) | Direct KSeF 2.0 adapter |
| [xml-generator.ts](../packages/api/src/services/ksef/xml-generator.ts) | FA(3) XML generation |
| [contractor.service.ts](../packages/api/src/services/ksef/contractor.service.ts) | Contractor management |
| [ksef.tools.ts](../packages/api/src/services/ai-chat/tools/ksef.tools.ts) | LangChain AI tools |
| [ksef.formatter.ts](../packages/api/src/services/ai-chat/formatters/ksef.formatter.ts) | AI response formatters |
| [ksef.routes.ts](../packages/api/src/routes/ksef.routes.ts) | REST API routes |
| [ksef.types.ts](../packages/api/src/types/ksef.types.ts) | TypeScript type definitions |
| [useKSeF.ts](../packages/web/src/hooks/useKSeF.ts) | React hook |
| [ksef.ts (api client)](../packages/web/src/lib/api/ksef.ts) | Frontend API client |
| [schema.prisma](../packages/api/prisma/schema.prisma) | Database schema (KSeF* models) |
