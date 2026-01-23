# AI Agents Documentation

This document describes the LangGraph-based multi-agent system for the Accounting AI Agent.

## Overview

The system uses a **Router Agent** that classifies user intents and delegates requests to specialized domain agents. Each agent has access to specific tools for interacting with the wFirma accounting system.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER MESSAGE                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             ROUTER AGENT                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. Detect Language (ru/pl/en)                                       │   │
│  │  2. Route Decision (LLM or Keywords)                                 │   │
│  │     • LLM: claude-3-haiku / gpt-3.5-turbo (fast)                    │   │
│  │     • Fallback: keyword matching                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  confidence >= 0.7?                                                          │
│       │                                                                      │
│       ├── YES ──► Delegate to Specialized Agent                             │
│       │                                                                      │
│       └── NO ───► Handle directly (general accounting Q&A)                  │
└─────────────────────────────────────────────────────────────────────────────┘
           │                    │                    │                    │
           ▼                    ▼                    ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ CONTRACTOR AGENT │ │ FINANCIAL AGENT  │ │  INVOICE AGENT   │ │    TAX AGENT     │
│                  │ │                  │ │                  │ │                  │
│ • get_contractors│ │ • get_financial  │ │ • get_invoices   │ │ • calculate_pit  │
│ • create_        │ │   _summary       │ │ • create_invoice │ │ • calculate_vat  │
│   contractor     │ │ • get_company    │ │ • update_invoice │ │ • calculate_     │
│ • update_        │ │   _info          │ │ • delete_invoice │ │   ip_box         │
│   contractor     │ │ • compare_       │ │ • send_invoice   │ │ • get_tax_       │
│ • delete_        │ │   financial_     │ │ • download_      │ │   deadlines      │
│   contractor     │ │   years          │ │   invoice        │ │ • calculate_zus  │
└──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
```

## Router Agent

The main orchestrator that classifies user queries and routes them appropriately.

| Property | Value |
|----------|-------|
| File | `src/agents/router.agent.ts` |
| Routing Model | claude-3-haiku / gpt-3.5-turbo |
| General Model | claude-3-5-sonnet / gpt-4-turbo |
| Confidence Threshold | 0.7 |

### Routing Logic

1. **LLM Classification** - Returns JSON with target agent, confidence, and reasoning
2. **Keyword Fallback** - If LLM fails, use keyword matching
3. **Direct Handling** - For general queries (confidence < 0.7)

### Language Detection

Automatic language detection based on message content:

| Characters | Language |
|------------|----------|
| Cyrillic (а-яА-Я) | Russian |
| Polish diacritics (ąćęłńóśźż) | Polish |
| Default | English |

## Domain Agents

### Contractor Agent

Manages contractors/customers in wFirma.

| Property | Value |
|----------|-------|
| File | `src/agents/contractor.agent.ts` |
| Keywords | контрагент, contractor, kontrahent, customer, client, klient, dostawca |

**Tools:**

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_contractors` | List contractors | search?, nip?, limit? |
| `create_contractor` | Create new contractor | name, nip?, email?, address? |
| `update_contractor` | Update contractor | name, updates |
| `delete_contractor` | Delete contractor | name |

### Financial Agent

Financial analysis and reporting.

| Property | Value |
|----------|-------|
| File | `src/agents/financial.agent.ts` |
| Keywords | финанс, przychod, revenue, profit, company, raport, firma |

**Tools:**

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_financial_summary` | Financial data for year | year |
| `get_company_info` | Company details | - |
| `compare_financial_years` | Compare two years | year1, year2 |

### Invoice Agent

Invoice management and tracking.

| Property | Value |
|----------|-------|
| File | `src/agents/invoice.agent.ts` |
| Keywords | faktur, invoice, счет, należność, payment, rachunek |

**Tools:**

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_invoices` | List invoices | year?, month?, status? |
| `get_invoice_details` | Invoice details | invoiceNumber |
| `create_invoice` | Create invoice | contractor, items, type? |
| `update_invoice` | Update invoice | invoiceNumber, updates |
| `delete_invoice` | Delete invoice | invoiceNumber |
| `send_invoice` | Send by email | invoiceNumber, email? |
| `download_invoice` | Get PDF | invoiceNumber, page? |
| `add_invoice_note` | Add note | invoiceNumber, note |
| `get_invoice_notes` | Get notes | invoiceNumber |

### Tax Agent

Tax compliance and calculation for Polish IT businesses.

| Property | Value |
|----------|-------|
| File | `src/agents/tax.agent.ts` |
| Keywords | vat, pit, cit, zus, podatek, налог, ip box, termin |

**Tools:**

| Tool | Description | Parameters |
|------|-------------|------------|
| `calculate_pit` | PIT calculation | income, type (scale/flat/ipbox) |
| `calculate_vat` | VAT calculation | amount, rate (23/8/5/0) |
| `calculate_ip_box` | IP Box savings | income |
| `get_tax_deadlines` | Upcoming deadlines | month |
| `calculate_zus` | ZUS contributions | type (full/preferential/small) |

## LangGraph State Machine

Each agent uses a LangGraph state machine for processing:

```
┌─────────┐
│  START  │
└────┬────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                         AGENT NODE                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  System Prompt (localized pl/en/ru)                      │   │
│  │  + Previous Messages                                      │   │
│  │  + User Message                                           │   │
│  │                           ▼                               │   │
│  │  LLM (gpt-4-turbo / claude-3-5-sonnet)                   │   │
│  │  with bound tools                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────┐
│ shouldContinue? │
└────────┬────────┘
         │
 ┌───────┴───────┐
 │               │
 ▼               ▼
tool_calls?   no tools
 │               │
 ▼               ▼
┌────────┐   ┌─────────┐
│ TOOLS  │   │   END   │◄───────────────┐
│  NODE  │   └─────────┘                │
└───┬────┘                              │
    │                                   │
    │  Execute tool(s)                  │
    │  Return results (markdown)        │
    │                                   │
    └────────────► AGENT NODE ──────────┘
                   (loop back)

recursionLimit: 10 (prevents infinite loops)
```

## Usage

### Basic Usage

```typescript
import { getRouterAgent } from './agents';

const router = getRouterAgent('openai'); // or 'anthropic'

const result = await router.process(
  existingMessages,  // BaseMessage[]
  userMessage,       // string
  {
    userId: 'user-123',
    locale: 'en',    // 'pl' | 'en' | 'ru'
    conversationId: 'conv-456',
  }
);

console.log(result.response);     // Markdown formatted response
console.log(result.toolsUsed);    // ['get_invoices']
console.log(result.agentType);    // 'invoice'
```

### Direct Agent Usage

```typescript
import { getContractorAgent } from './agents';

const agent = getContractorAgent('anthropic');

const result = await agent.process(
  [],
  'Create contractor ABC Company with NIP 1234567890',
  { userId: 'user-123', locale: 'pl' }
);
```

## LLM Configuration

| Model | Provider | Use Case | Temperature |
|-------|----------|----------|-------------|
| gpt-3.5-turbo | OpenAI | Routing | 0 |
| claude-3-haiku | Anthropic | Routing | 0 |
| gpt-4-turbo-preview | OpenAI | Agent responses | 0.7 |
| claude-3-5-sonnet-20241022 | Anthropic | Agent responses | 0.7 |

**Configuration:**
- Max tokens: 4096
- Recursion limit: 10

## Tool Response Format

All tools return localized markdown responses:

```markdown
## Contractors (3)

| # | Name | NIP | Email |
|---|------|-----|-------|
| 1 | ABC Corp | 1234567890 | contact@abc.com |
| 2 | XYZ Ltd | 0987654321 | info@xyz.com |

**Total: 3 contractors**
```

## Example Flows

### Contractor Query

```
User: "Show my contractors"
        │
        ▼
Router: detectLocale("Show...") → 'en'
        │
        ▼
Router: route() → { targetAgent: 'contractor', confidence: 0.9 }
        │
        ▼
ContractorAgent.process()
        │
        ├─► AGENT: "I need to use get_contractors tool"
        │
        ├─► TOOLS: get_contractors() → markdown table
        │
        ├─► AGENT: "Here are your contractors: [table]"
        │
        ▼
Result: { response: "## Contractors (3)...", toolsUsed: ["get_contractors"] }
```

### Invoice Creation

```
User: "Create invoice for ABC Corp for 5000 PLN"
        │
        ▼
Router: route() → { targetAgent: 'invoice', confidence: 0.95 }
        │
        ▼
InvoiceAgent.process()
        │
        ├─► AGENT: "I'll create an invoice for ABC Corp"
        │
        ├─► TOOLS: get_contractors({ search: "ABC Corp" }) → found
        │
        ├─► TOOLS: create_invoice({ contractor: "ABC Corp", items: [...] })
        │
        ├─► AGENT: "Invoice FV/2026/001 created successfully"
        │
        ▼
Result: { response: "Invoice created...", toolsUsed: ["get_contractors", "create_invoice"] }
```

## Localization

### System Prompts

Each agent has localized system prompts stored in:
- `src/i18n/locales/pl.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/ru.json`

### Response Localization

Tool responses are automatically formatted in the detected language:

**English:**
```markdown
## Invoice FV/2026/001
- **Client:** ABC Corp
- **Amount:** 5,000.00 PLN
- **Due Date:** 2026-02-15
```

**Polish:**
```markdown
## Faktura FV/2026/001
- **Klient:** ABC Corp
- **Kwota:** 5 000,00 PLN
- **Termin płatności:** 15.02.2026
```

**Russian:**
```markdown
## Счёт FV/2026/001
- **Клиент:** ABC Corp
- **Сумма:** 5 000,00 PLN
- **Срок оплаты:** 15.02.2026
```

## File Structure

```
src/agents/
├── index.ts              # Exports all agents
├── types.ts              # TypeScript interfaces
├── base.agent.ts         # Abstract base class with LangGraph
├── router.agent.ts       # Main orchestrator
├── contractor.agent.ts   # Contractor management
├── financial.agent.ts    # Financial analysis
├── invoice.agent.ts      # Invoice management
└── tax.agent.ts          # Tax calculations

src/tools/
├── index.ts              # Tool exports
├── contractor.tools.ts   # Contractor CRUD tools
├── invoice.tools.ts      # Invoice tools
├── financial.tools.ts    # Financial tools
└── tax.tools.ts          # Tax calculation tools
```

## Error Handling

Agents handle errors gracefully and return user-friendly messages:

```typescript
try {
  const result = await tool.execute(params);
  return formatSuccess(result, locale);
} catch (error) {
  if (error instanceof WFirmaValidationError) {
    return formatError('validation', error.message, locale);
  }
  if (error instanceof WFirmaConnectionError) {
    return formatError('connection', locale);
  }
  throw error;
}
```

## Related Documentation

- [Architecture](./ARCHITECTURE.md)
- [wFirma Integration](./WFIRMA_INTEGRATION.md)
- [API Reference](./API_REFERENCE.md)
