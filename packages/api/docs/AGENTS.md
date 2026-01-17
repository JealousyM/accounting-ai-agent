# Multi-Agent Architecture

This document describes the LangGraph-based multi-agent architecture for the Accounting AI Agent.

## Overview

The system uses a Router Agent that delegates requests to specialized agents based on user intent. Each agent has access to domain-specific tools and localized prompts.

## Architecture Diagram

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
│ Keywords:        │ │ Keywords:        │ │ Keywords:        │ │ Keywords:        │
│ контрагент       │ │ финанс, przychod │ │ faktur, счет     │ │ vat, pit, zus    │
│ contractor       │ │ revenue, profit  │ │ invoice, payment │ │ podatek, налог   │
│ kontrahent       │ │ company, raport  │ │ należność        │ │ ip box, termin   │
└──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
           │                    │                    │                    │
           └────────────────────┴────────────────────┴────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LANGGRAPH STATE MACHINE                               │
│                         (Inside Each Agent)                                  │
│                                                                              │
│    ┌─────────┐                                                              │
│    │  START  │                                                              │
│    └────┬────┘                                                              │
│         │                                                                    │
│         ▼                                                                    │
│    ┌─────────────────────────────────────────────────────────────────┐      │
│    │                         AGENT NODE                               │      │
│    │  ┌─────────────────────────────────────────────────────────┐   │      │
│    │  │  System Prompt (localized pl/en/ru)                      │   │      │
│    │  │  + Previous Messages                                      │   │      │
│    │  │  + User Message                                           │   │      │
│    │  │                           ▼                               │   │      │
│    │  │  LLM (gpt-4-turbo / claude-3-5-sonnet)                   │   │      │
│    │  │  with bound tools                                         │   │      │
│    │  └─────────────────────────────────────────────────────────┘   │      │
│    └─────────────────────────────────────────────────────────────────┘      │
│         │                                                                    │
│         ▼                                                                    │
│    ┌─────────────────┐                                                      │
│    │ shouldContinue? │                                                      │
│    └────────┬────────┘                                                      │
│             │                                                                │
│     ┌───────┴───────┐                                                       │
│     │               │                                                        │
│     ▼               ▼                                                        │
│  tool_calls?     no tools                                                   │
│     │               │                                                        │
│     ▼               ▼                                                        │
│ ┌────────┐     ┌─────────┐                                                  │
│ │ TOOLS  │     │   END   │◄─────────────────────────────────────────────┐  │
│ │  NODE  │     └─────────┘                                               │  │
│ └───┬────┘                                                               │  │
│     │                                                                    │  │
│     │  Execute tool(s)                                                   │  │
│     │  ┌─────────────────────────────────────────────────────────────┐  │  │
│     │  │ Tool Results (localized markdown)                            │  │  │
│     │  └─────────────────────────────────────────────────────────────┘  │  │
│     │                                                                    │  │
│     └────────────────────► AGENT NODE ──────────────────────────────────┘  │
│                            (loop back)                                      │
│                                                                              │
│    recursionLimit: 10 (prevents infinite loops)                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AGENT RESULT                                    │
│  {                                                                           │
│    response: "Markdown formatted response",                                  │
│    toolsUsed: ["get_contractors", "create_contractor"],                     │
│    agentType: "contractor",                                                  │
│    metadata: { duration: 1234, provider: "openai" }                         │
│  }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Agents

### Router Agent

The main orchestrator that classifies user queries and routes them to specialized agents.

| Property | Value |
|----------|-------|
| File | `src/agents/router.agent.ts` |
| Routing Model | claude-3-haiku / gpt-3.5-turbo (fast) |
| General Model | claude-3-5-sonnet / gpt-4-turbo |
| Confidence Threshold | 0.7 |

**Routing Logic:**
1. LLM-based classification (returns JSON with targetAgent, confidence, reasoning)
2. Keyword-based fallback if LLM fails
3. Direct handling for general queries (confidence < 0.7)

### Contractor Agent

Manages contractors/customers in wFirma.

| Property | Value |
|----------|-------|
| File | `src/agents/contractor.agent.ts` |
| Keywords | контрагент, contractor, kontrahent, customer, client |

**Tools:**
- `get_contractors` - List contractors with optional search/NIP filter
- `create_contractor` - Create new contractor (required: name)
- `update_contractor` - Update contractor by exact name match
- `delete_contractor` - Delete contractor by exact name match

### Financial Agent

Financial analysis and reporting specialist.

| Property | Value |
|----------|-------|
| File | `src/agents/financial.agent.ts` |
| Keywords | финанс, przychod, revenue, profit, company, raport |

**Tools:**
- `get_financial_summary` - Financial data for a specific year
- `get_company_info` - Company information (name, NIP, address, bank accounts)
- `compare_financial_years` - Compare two years side by side

### Invoice Agent

Invoice management and tracking specialist.

| Property | Value |
|----------|-------|
| File | `src/agents/invoice.agent.ts` |
| Keywords | faktur, invoice, счет, należność, payment |

**Tools:**
- `get_invoices` - List invoices with year/month/status filter
- `get_unpaid_invoices` - Get all unpaid invoices with overdue warnings
- `get_invoice_summary` - Invoice statistics for a period

### Tax Agent

Tax compliance and calculation expert for Polish IT businesses.

| Property | Value |
|----------|-------|
| File | `src/agents/tax.agent.ts` |
| Keywords | vat, pit, cit, zus, podatek, налог, ip box, termin |

**Tools:**
- `calculate_pit` - Calculate PIT (scale 12%/32%, flat 19%, IP Box 5%)
- `calculate_vat` - Calculate VAT (23%, 8%, 5%, 0%)
- `calculate_ip_box` - IP Box tax savings calculator
- `get_tax_deadlines` - Upcoming tax deadlines for a month
- `calculate_zus` - ZUS contributions (full, preferential, small, ulga na start)

## Available Tools Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AVAILABLE TOOLS                                    │
├──────────────────┬──────────────────────────────────────────────────────────┤
│ ContractorAgent  │ • get_contractors                                        │
│                  │ • create_contractor                                       │
│                  │ • update_contractor                                       │
│                  │ • delete_contractor                                       │
├──────────────────┼──────────────────────────────────────────────────────────┤
│ FinancialAgent   │ • get_financial_summary                                  │
│                  │ • get_company_info                                        │
│                  │ • compare_financial_years                                 │
├──────────────────┼──────────────────────────────────────────────────────────┤
│ InvoiceAgent     │ • get_invoices                                           │
│                  │ • get_unpaid_invoices                                     │
│                  │ • get_invoice_summary                                     │
├──────────────────┼──────────────────────────────────────────────────────────┤
│ TaxAgent         │ • calculate_pit                                          │
│                  │ • calculate_vat                                           │
│                  │ • calculate_ip_box                                        │
│                  │ • get_tax_deadlines                                       │
│                  │ • calculate_zus                                           │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

## Example Flow

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

## Usage

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
console.log(result.toolsUsed);    // ['get_contractors']
console.log(result.agentType);    // 'contractor'
```

## File Structure

```
src/agents/
├── index.ts              # Exports all agents
├── types.ts              # TypeScript interfaces and types
├── base.agent.ts         # Abstract base class with LangGraph
├── router.agent.ts       # Main orchestrator
├── contractor.agent.ts   # Contractor management
├── financial.agent.ts    # Financial analysis
├── invoice.agent.ts      # Invoice management
└── tax.agent.ts          # Tax calculations
```

## Localization

All agents support three languages:
- **Polish (pl)** - Default
- **English (en)**
- **Russian (ru)**

Language is auto-detected from user message:
- Cyrillic characters → Russian
- Polish diacritics (ąćęłńóśźż) → Polish
- Otherwise → English

Translations are stored in:
- `src/i18n/locales/pl.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/ru.json`

## LLM Configuration

| Model | Use Case | Provider |
|-------|----------|----------|
| gpt-3.5-turbo | Routing decisions | OpenAI |
| claude-3-haiku | Routing decisions | Anthropic |
| gpt-4-turbo-preview | Agent responses | OpenAI |
| claude-3-5-sonnet-20241022 | Agent responses | Anthropic |

Configuration:
- Max tokens: 4096
- Temperature: 0.7 (agents), 0 (router)
- Recursion limit: 10
