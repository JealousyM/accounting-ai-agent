# Contract: Clickable Chat Starter Chips

## Purpose
Suggestion chips on the empty-conversation screen are clickable buttons that immediately submit a preset query, lowering the barrier to first interaction.

## Component: `MessageList`

### Props added
| Prop | Type | Required | Description |
|---|---|---|---|
| `onSuggestionClick` | `(text: string) => void` | No | Called with the chip's display text when the user clicks it. When omitted, chips still render but are non-interactive (graceful degradation). |

### Chip set (6 items, static per locale)
| Key | EN | PL | RU |
|---|---|---|---|
| `vatRates` | "What are VAT rates?" | "Jakie są stawki VAT?" | "Какие ставки НДС?" |
| `companyData` | "Show my company data" | "Pokaż dane mojej firmy" | "Покажи данные моей компании" |
| `ipBox` | "What is IP Box?" | "Co to jest IP Box?" | "Что такое IP Box?" |
| `zusPayment` | "When to pay ZUS?" | "Kiedy płacić ZUS?" | "Когда платить ZUS?" |
| `unpaidInvoices` | "List my unpaid invoices" | "Pokaż nieopłacone faktury" | "Список неоплаченных счетов" |
| `taxDeadlines` | "Show upcoming tax deadlines" | "Pokaż nadchodzące terminy podatkowe" | "Покажи предстоящие налоговые сроки" |

### Visibility
Chips render only when `messages.length === 0` (unchanged).

## Component: `ChatContainer`

Passes `onSuggestionClick={handleSendMessage}` to `MessageList`.  
`handleSendMessage` calls `sendMessage(content, undefined, ttsEnabled)`.

## i18n changes
Two new keys added under `chat.suggestions` in all three locale files:
- `unpaidInvoices`
- `taxDeadlines`
