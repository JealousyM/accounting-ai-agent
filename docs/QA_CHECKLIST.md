# QA Checklist — Accounting AI Agent

Comprehensive test checklist for pre-deployment verification.

---

## 1. Authentication & Registration

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 1.1 | Register new user (Free plan) with valid data | Account created, redirect to /chat, welcome modal shown | |
| 1.2 | Register new user (Pro Monthly plan) | Redirect to Stripe Checkout, Pro account active after payment | |
| 1.3 | Register new user (Pro Yearly plan) | Redirect to Stripe Checkout, annual subscription active | |
| 1.4 | Register with existing email address | Error: "Email already exists" | |
| 1.5 | Register with weak password (no uppercase, digit, special char) | Password validation error | |
| 1.6 | Register without accepting terms of service | Form submission blocked | |
| 1.7 | Register Free without selecting LLM provider | Validation error — LLM provider required | |
| 1.8 | Login with valid credentials (email/password) | Redirect to /chat, conversations loaded | |
| 1.9 | Login with incorrect password | Error: "Invalid credentials" | |
| 1.10 | Login with non-existent email | Error: "Invalid credentials" | |
| 1.11 | Login via Google OAuth | Account created/linked, redirect to /chat or /auth/complete-profile | |
| 1.12 | Complete profile after OAuth | LLM provider selection, optional wFirma data, redirect to /chat | |
| 1.14 | Logout | Session ended, redirect to /login | |
| 1.15 | Password recovery — send email | Reset link email sent | |
| 1.16 | Reset password with valid token | Password changed, login with new password works | |
| 1.17 | Reset password with expired token | Error: "Token expired" | |
| 1.18 | JWT token refresh | New access token issued | |
| 1.19 | Access protected page without login | Redirect to /login | |
| 1.20 | Login rate limiting (>10 attempts / 15 min) | Error 429: "Too many attempts" | |

---

## 2. AI Chat

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 2.1 | Create new conversation | New conversation in list, title auto-generated | |
| 2.2 | Send text message | User message displayed, AI response streamed | |
| 2.3 | AI response with Markdown formatting | Correct rendering of headings, lists, code, tables | |
| 2.4 | AI response with syntax highlighting | Code blocks with syntax coloring | |
| 2.5 | Voice input (Web Speech API) | Microphone button active, speech recognized, text in field | |
| 2.6 | Switch between conversations | Correct history loaded for selected conversation | |
| 2.7 | Delete conversation | Conversation removed from list, messages deleted | |
| 2.8 | Send empty message | Send button disabled or validation error | |
| 2.9 | Message rate limiting (>60 / 15 min) | Error 429 with limit info | |
| 2.10 | Subscription message limit (Free/Pro) | Message shown about limit reached with upgrade option | |
| 2.11 | AI invokes wFirma tool | AI uses tool, displays formatted result | |
| 2.12 | LLM API error during conversation | User-friendly error message shown | |
| 2.13 | No LLM key configured (Free plan) | Message about needing to configure API key | |
| 2.14 | wFirma connection error during tool use | User-friendly integration error message | |
| 2.15 | Long conversation (>50 messages) | Smooth scrolling, no performance issues | |

---

## 3. AI Tools — wFirma (45 tools)

### 3.1 Company

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 3.1.1 | „Pokaż dane mojej firmy" | Company data from wFirma displayed | |
| 3.1.2 | „Pokaż konta bankowe firmy" | List of bank accounts | |
| 3.1.3 | „Pokaż adresy firmy" | List of company addresses | |

### 3.2 Contractors

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 3.2.1 | „Pokaż listę kontrahentów" | Contractor list from wFirma | |
| 3.2.2 | „Dodaj nowego kontrahenta [dane]" | Contractor created in wFirma | |
| 3.2.3 | „Zaktualizuj kontrahenta [dane]" | Contractor data updated | |
| 3.2.4 | „Usuń kontrahenta [nazwa]" | Contractor deleted from wFirma | |

### 3.3 Invoices

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 3.3.1 | „Pokaż listę faktur" | Invoice list from wFirma | |
| 3.3.2 | „Pokaż szczegóły faktury [numer]" | Full invoice data | |
| 3.3.3 | „Utwórz nową fakturę [dane]" | Invoice created in wFirma | |
| 3.3.4 | „Zaktualizuj fakturę [dane]" | Invoice updated | |
| 3.3.5 | „Usuń fakturę [numer]" | Invoice deleted | |
| 3.3.6 | „Wyślij fakturę emailem [numer]" | Invoice sent to specified address | |
| 3.3.7 | „Pobierz PDF faktury [numer]" | PDF file available for download | |
| 3.3.8 | „Dodaj notatkę do faktury [numer]" | Note added | |
| 3.3.9 | „Pokaż notatki faktury [numer]" | Notes list displayed | |
| 3.3.10 | „Usuń notatkę z faktury" | Note deleted | |

### 3.4 Payments

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 3.4.1 | „Pokaż listę płatności" | Payments list | |
| 3.4.2 | „Pokaż szczegóły płatności [id]" | Payment data | |
| 3.4.3 | „Dodaj płatność [dane]" | Payment registered | |
| 3.4.4 | „Zaktualizuj płatność [dane]" | Payment updated | |
| 3.4.5 | „Usuń płatność [id]" | Payment deleted | |

### 3.5 Expenses

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 3.5.1 | „Pokaż listę wydatków" | Expenses list | |
| 3.5.2 | „Pokaż szczegóły wydatku [id]" | Expense data | |

### 3.6 Vehicles

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 3.6.1 | „Pokaż listę pojazdów" | Vehicle list | |
| 3.6.2 | „Pokaż szczegóły pojazdu [id]" | Vehicle data | |
| 3.6.3 | „Dodaj pojazd [dane]" | Vehicle added | |
| 3.6.4 | „Zaktualizuj pojazd [dane]" | Vehicle updated | |
| 3.6.5 | „Usuń pojazd [id]" | Vehicle deleted | |

### 3.7 Payment Terms

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 3.7.1 | „Pokaż terminy płatności" | Terms list | |
| 3.7.2 | „Dodaj termin płatności [dane]" | Term created | |
| 3.7.3 | „Zaktualizuj termin [dane]" | Term updated | |
| 3.7.4 | „Usuń termin [id]" | Term deleted | |
| 3.7.5 | „Pokaż grupy terminów" | Term groups list | |
| 3.7.6 | „Dodaj grupę terminów [dane]" | Group created | |

### 3.8 Tax Declarations

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 3.8.1 | „Pokaż deklaracje JPK VAT" | VAT declaration list | |
| 3.8.2 | „Pokaż deklaracje PIT" | PIT declaration list | |

### 3.9 Tax Register (KPiR)

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 3.9.1 | „Pokaż wpisy KPiR za marzec 2026" | KPiR entries for March 2026 displayed with sums | |
| 3.9.2 | „Покажи книгу доходов и расходов за 2026 год" | Yearly KPiR summary with cumulative sums | |

### 3.10 Documents

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 3.10.1 | „Pokaż listę dokumentów" | Document list | |
| 3.10.2 | „Pokaż szczegóły dokumentu [id]" | Document data | |
| 3.10.3 | „Pobierz dokument [id]" | File downloaded | |
| 3.10.4 | „Usuń dokument [id]" | Document deleted | |

### 3.11 Accounting

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 3.11.1 | „Pokaż lata podatkowe" | Fiscal year list | |
| 3.11.2 | „Pokaż szczegóły roku podatkowego [id]" | Fiscal year data | |
| 3.11.3 | „Pokaż schematy księgowe" | Schema list | |
| 3.11.4 | „Pokaż szczegóły schematu [id]" | Accounting schema data | |

### 3.12 Financial Summary

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 3.12.1 | „Pokaż podsumowanie finansowe" | Company financial overview | |

### 3.13 wFirma Users

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 3.13.1 | „Pokaż użytkowników wFirma" | User list | |
| 3.13.2 | „Pokaż firmy użytkownika" | Company list | |
| 3.13.3 | „Pokaż szczegóły firmy [id]" | Company data | |

---

## 4. AI Tools — KSeF (9 tools)

### 4.1 Invoice Submission

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 4.1.1 | „Wyślij fakturę [ID wFirma] do KSeF" | Invoice submitted, reference number returned | |
| 4.1.2 | „Utwórz i wyślij fakturę KSeF: [pełne dane]" | FA(3) XML generated and submitted to KSeF | |
| 4.1.3 | Create KSeF invoice with company name only (no NIP) | NIP and address auto-filled from contractor DB | |
| 4.1.4 | Create KSeF invoice — company name not in contractor DB | Error asking user to provide NIP manually | |
| 4.1.5 | Send KSeF invoice with invalid NIP format | Error: TNrNIP pattern constraint failed | |
| 4.1.6 | „Wyślij od razu faktury nr [X, Y, Z] do KSeF" | All invoices submitted, result summary shown | |

### 4.2 Status & UPO

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 4.2.1 | „Sprawdź status KSeF [numer referencyjny]" | Status returned (pending/accepted/rejected) | |
| 4.2.2 | Status check for accepted invoice | Status: accepted, upoAvailable: true | |
| 4.2.3 | Status check for rejected invoice | Status: rejected, errorCode and errorMessage shown | |
| 4.2.4 | „Pobierz UPO [numer referencyjny]" | UPO XML file downloaded | |
| 4.2.5 | Download UPO for non-accepted invoice | Error: UPO not available | |
| 4.2.6 | Background status poller updates invoice | Status auto-updated, email notification sent | |

### 4.3 Invoice List & Statistics

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 4.3.1 | „Pokaż faktury KSeF" | List of sent invoices | |
| 4.3.2 | „Pokaż przychodzące faktury KSeF" | Incoming invoices fetched from KSeF API | |
| 4.3.3 | Filter KSeF invoices by date range | Filtered results returned | |
| 4.3.4 | Filter KSeF invoices by status | Only matching invoices shown | |
| 4.3.5 | „Pokaż statystyki KSeF za ten miesiąc" | Totals by status, monthly breakdown | |
| 4.3.6 | „Dopasuj przychodzącą fakturę KSeF [numer referencyjny]" | Match found in wFirma records | |

### 4.4 Contractor Auto-fill

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 4.4.1 | Sync contractors from wFirma | KSeFContractor table populated with wFirma data | |
| 4.4.2 | Sync populates own company (source='company') | Company NIP, address stored in KSeFContractor | |
| 4.4.3 | Create KSeF invoice — seller name matches company record | NIP and address resolved from source='company' | |
| 4.4.4 | Create KSeF invoice — buyer name matches wFirma contractor | NIP and address resolved from source='wfirma' | |
| 4.4.5 | Create KSeF invoice — buyer name matches local contractor | NIP and address resolved from source='local' | |
| 4.4.6 | Partial match: buyer name contains contractor name | Fuzzy match resolves contractor data | |

### 4.5 KSeF Configuration

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 4.5.1 | Set KSeF token and NIP via config | Config saved, direct adapter enabled | |
| 4.5.2 | Send invoice without KSeF token configured | Returns pending status with configuration instruction | |
| 4.5.3 | Enable auto-send on invoice creation | Invoice auto-submitted to KSeF after wFirma creation | |
| 4.5.4 | Change KSeF environment (test/production) | Requests routed to correct KSeF endpoint | |
| 4.5.5 | Enable email notifications (accepted/rejected) | Email sent on status change | |

---

## 5. Subscriptions & Payments

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 5.1 | View pricing page (/pricing) | Free and Pro plans shown with PLN prices | |
| 5.2 | Toggle billing period (monthly/yearly) | Prices update, 17% savings visible | |
| 5.3 | Upgrade from Free to Pro Monthly | Stripe Checkout, activation after payment | |
| 5.4 | Upgrade from Free to Pro Yearly | Stripe Checkout, annual subscription active | |
| 5.5 | Cancel Pro subscription | Subscription cancelled at end of billing period | |
| 5.6 | Payment declined (card rejected) | Error message, subscription inactive | |
| 5.7 | Access Stripe billing portal | Redirect to Stripe Customer Portal | |
| 5.8 | View current usage (AI messages, wFirma queries) | Correct usage counters | |
| 5.9 | Switch LLM key preference (own/app) — Pro | Preference saved, LLM source changed | |
| 5.10 | Stripe webhook: checkout.session.completed | Subscription activated in database | |
| 5.11 | Stripe webhook: customer.subscription.deleted | Subscription deactivated | |
| 5.12 | Stripe webhook: invoice.payment_failed | User notified about payment failure | |

---

## 6. Credential Management

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 6.1 | Configure wFirma credentials (Access Key, Secret Key, Company ID) | Data encrypted and saved, validation passed | |
| 6.2 | Update wFirma credentials | New credentials replace old ones | |
| 6.3 | Delete wFirma credentials | Data deleted, status "Not configured" | |
| 6.4 | Configure LLM key (OpenAI) | Key encrypted, model list loaded | |
| 6.5 | Configure LLM key (Google/Gemini) | Key encrypted, model list loaded | |
| 6.6 | Select LLM model from list | Model saved in profile | |
| 6.7 | Delete LLM key | Key deleted, fall back to default | |
| 6.8 | Provide invalid wFirma key | Validation error on save | |
| 6.9 | Provide invalid LLM key | Validation error on save | |
| 6.10 | View masked credentials (GET /credentials) | Keys masked (e.g. sk-...xxxx) | |

---

## 7. User Profile

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 7.1 | Edit first and last name | Data updated | |
| 7.2 | Edit company name | Company name updated | |
| 7.3 | Change language (en/pl/ru) | UI language changed immediately | |
| 7.4 | View profile data (/dashboard) | Correct user data displayed | |
| 7.5 | Welcome modal — first visit | Modal shown | |
| 7.6 | Welcome modal — close | Modal does not reappear (firstLoginComplete) | |

---

## 8. Admin Panel

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 8.1 | Access /admin as administrator | Dashboard with statistics | |
| 8.2 | Access /admin as regular user | Error 403 or redirect | |
| 8.3 | View statistics (users, conversations, costs) | Correct numbers shown | |
| 8.4 | User list with pagination | Table with users, pagination works | |
| 8.5 | Search user by email/name | Filtered results | |
| 8.6 | Change user role (user <-> admin) | Role changed, badge updated | |
| 8.7 | View detailed user data | Profile, subscription, usage, conversations | |

---

## 9. AI Cost Tracking

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 9.1 | Cost dashboard (/dashboard/costs) | Summary cards, daily chart, model breakdown | |
| 9.2 | Filter costs by date range | Data filtered correctly | |
| 9.3 | Cost breakdown by model | Chart with model split (GPT-4, etc.) | |
| 9.4 | Conversation list with costs | Table with per-conversation costs | |
| 9.5 | Conversation cost details | Runs table, tokens, costs | |
| 9.6 | User cost summary | Total cost, current month, last 30 days | |

---

## 10. Help System

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 10.1 | Open help panel (? button) | Panel slides in from right | |
| 10.2 | Browse help categories | Category list with topics | |
| 10.3 | Search help topics | Filtered results | |
| 10.4 | View help topic | Content in Markdown format | |
| 10.5 | Help content in selected language (pl/en/ru) | Content in correct language | |

---

## 11. Internationalization (i18n)

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 11.1 | Interface in Polish | All labels, messages, buttons in Polish | |
| 11.2 | Interface in English | All labels in English | |
| 11.3 | Interface in Russian | All labels in Russian | |
| 11.4 | Switch language in settings | Immediate change without page reload | |
| 11.5 | AI responses in user's language | AI responds in detected language | |
| 11.6 | Error messages in selected language | Errors translated | |

---

## 12. Dark / Light Mode

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 12.1 | Switch to dark mode | All elements in dark colors | |
| 12.2 | Switch to light mode | All elements in light colors | |
| 12.3 | System preference detection | Theme auto-selected | |
| 12.4 | Preference preserved after refresh | Theme restored from localStorage | |
| 12.5 | Text contrast in both modes | Readability maintained (WCAG AA) | |

---

## 13. Files & Downloads

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 13.1 | Download invoice PDF (wFirma) | PDF file downloaded correctly | |
| 13.2 | Download document from wFirma | File downloaded with correct MIME type | |
| 13.3 | Download file with expired link (>15 min) | Error: "Link expired" | |
| 13.4 | Download without authorization | Error 401 | |
| 13.5 | Download KSeF invoice as PDF | PDF with KSeF QR code downloaded | |
| 13.6 | Download KSeF invoice as XML | FA(3) XML file downloaded | |
| 13.7 | Download KSeF UPO | UPO XML file downloaded | |

---

## 14. Privacy & Cookies (GDPR)

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 14.1 | Cookie banner on first visit | Banner with consent options | |
| 14.2 | Accept all cookies | Banner disappears, preferences saved | |
| 14.3 | Reject optional cookies | Only essential cookies active | |
| 14.4 | Change cookie preferences (settings) | Modal with options, change saved | |
| 14.5 | Privacy policy link | Page/modal with policy content | |
| 14.6 | Terms of service link | Page/modal with terms content | |

---

## 15. Responsiveness (RWD)

| # | Test Scenario | Device | Expected Result | Status |
|---|---|---|---|---|
| 15.1 | Login page | Mobile (320px) | Form readable, touch buttons | |
| 15.2 | Registration page | Mobile (320px) | Scrollable form, all fields accessible | |
| 15.3 | AI chat — sidebar | Mobile (320px) | Sidebar collapsible, hamburger button | |
| 15.4 | AI chat — messages | Mobile (320px) | Messages full width, scrollable | |
| 15.5 | Admin panel — table | Tablet (768px) | Table horizontally scrollable | |
| 15.6 | Pricing page | Mobile (320px) | Plan cards stacked vertically | |
| 15.7 | Cost dashboard — charts | Tablet (768px) | Charts scale to container | |
| 15.8 | Credentials form | Mobile (320px) | Fields full width | |

---

## 16. Performance

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 16.1 | Home page load time | < 3 seconds (First Contentful Paint) | |
| 16.2 | API response time (CRUD endpoints) | < 500ms (p95) | |
| 16.3 | First AI response time (streaming) | < 3 seconds to start of stream | |
| 16.4 | wFirma cache hit | Response < 100ms | |
| 16.5 | wFirma cache miss | Response < 2 seconds | |
| 16.6 | Conversation list (>100 conversations) | Load < 1 second | |
| 16.7 | Concurrent users (10/50/100) | No degradation below 50 users | |

---

## 17. Security

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 17.1 | JWT token validation (tampered token) | Error 401: "Invalid token" | |
| 17.2 | Access another user's conversations | Error 403 or 404 | |
| 17.3 | Access admin endpoints without admin role | Error 403 | |
| 17.4 | SQL injection in form fields | Query rejected, no data leak | |
| 17.5 | XSS in chat messages | Scripts not executed | |
| 17.6 | CSRF on mutating endpoints | CSRF protection active | |
| 17.7 | API key encryption in DB (AES-256-GCM) | Keys not readable in database | |
| 17.8 | Password hashing (bcrypt) | Passwords not readable in database | |
| 17.9 | Rate limiting — bypass attempt | Limits enforced per IP | |
| 17.10 | API key leak in logs | No keys present in logs | |
| 17.11 | HTTPS enforced in production | HTTP → HTTPS redirect | |
| 17.12 | User data isolation | User sees only their own data | |
| 17.13 | KSeF token stored securely in DB | Token not exposed in API responses | |
| 17.14 | KSeF invoice payload isolation | User can only access their own invoices | |

---

## 18. Error Handling

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 18.1 | Error 400 — invalid input | Readable validation message | |
| 18.2 | Error 401 — expired session | Redirect to login | |
| 18.3 | Error 403 — no permission | Access denied message | |
| 18.4 | Error 404 — resource not found | "Not found" page | |
| 18.5 | Error 429 — rate limit | Message "Too many requests, try later" | |
| 18.6 | Error 500 — server error | Generic error message (no details in production) | |
| 18.7 | Network error (no internet) | Connection problem message | |
| 18.8 | API timeout (>30s) | Timeout message | |
| 18.9 | KSeF NIP validation failure | Clear error: TNrNIP pattern constraint | |
| 18.10 | KSeF authentication failure | Error: KSeF token invalid or expired | |
| 18.11 | KSeF invoice rejected | Rejection reason displayed | |

---

## 19. Accessibility (a11y)

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 19.1 | Keyboard navigation (Tab/Enter/Escape) | All interactive elements accessible | |
| 19.2 | Screen reader — forms | Correct ARIA labels | |
| 19.3 | Screen reader — AI chat | Messages read correctly | |
| 19.4 | Color contrast (WCAG AA) | Minimum ratio 4.5:1 for text | |
| 19.5 | Visible focus indicator | Border/highlight on active element | |
| 19.6 | Alt text for images | Alt attributes present | |

---

## 20. Browser Compatibility

| # | Browser | Feature | Status |
|---|---|---|---|
| 20.1 | Chrome (latest) | Full functionality | |
| 20.2 | Firefox (latest) | Full functionality | |
| 20.3 | Safari (latest) | Full functionality | |
| 20.4 | Edge (latest) | Full functionality | |
| 20.5 | Chrome — Web Speech API | Voice input | |
| 20.6 | Safari — Web Speech API | Voice input (limited) | |
| 20.7 | Firefox — SSE streaming | AI response streaming | |

---

## 21. Database & Cache

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 21.1 | Prisma migrations — current version | All migrations applied | |
| 21.2 | Database seeding | Initial data loaded | |
| 21.3 | Cascade delete (User → Conversations → Messages) | Related records deleted | |
| 21.4 | Database indexes | Queries using indexes | |
| 21.5 | Redis connection | Redis accessible and responding | |
| 21.6 | Cache TTL — expiry | Data refreshed after TTL expires | |
| 21.7 | Cache invalidation after mutation | Cache cleared after data change | |
| 21.8 | KSeF invoice payload stored as JSON | invoicePayload field saved correctly in DB | |
| 21.9 | KSeF contractor sync — upsert | Existing records updated, no duplicates | |
| 21.10 | KSeF status poller — DB updates | Invoice statuses updated automatically | |

---

## 22. CI/CD & Deployment

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 22.1 | Code linting (npm run lint) | No ESLint errors | |
| 22.2 | Unit tests (npm run test) | All tests pass | |
| 22.3 | Project build (npm run build) | Build completes without errors | |
| 22.4 | E2E tests (npm run test:e2e) | All scenarios pass | |
| 22.5 | Docker Compose — startup | PostgreSQL and Redis available | |
| 22.6 | Environment variables — completeness | All required variables set | |
| 22.7 | Prisma client generation | Client generated without errors | |

---

## 23. Referral Program

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| 23.1 | User has unique referral code after registration | Referral code present in profile | |
| 23.2 | Share link format: `{URL}/register?ref={code}` | Correct link displayed | |
| 23.3 | Registration with `?ref=` shows "Invited by" badge | Badge with referrer's first name initial | |
| 23.4 | Registration with invalid code — no badge, no error | Form works normally without badge | |
| 23.5 | Self-referral prevention (can't use own code) | Own referral code ignored | |
| 23.6 | POST /api/referral/validate rate limited (10/15min) | Error 429 after exceeding limit | |
| 23.7 | Referral dashboard shows code, link, stats, table | All elements rendered correctly | |
| 23.8 | Copy link button works | Link copied to clipboard | |
| 23.9 | When referred user subscribes: referral status -> converted | Status updated in dashboard | |
| 23.10 | Referrer receives Stripe credit (PLN 14.99) | Credit applied to Stripe account | |
| 23.11 | Annual reward cap: max 10 credits per year | 11th referral does not grant credit | |
| 23.12 | Referred user gets 20% off first month (Stripe coupon) | Discount applied at checkout | |
| 23.13 | Cancellation within 7 days -> referral revoked, credit reversed | Referral status revoked, credit removed | |
| 23.14 | Cancellation after 7 days -> no revocation | Referral remains converted | |
| 23.15 | Nav link to /referral visible | Link in navigation menu | |
| 23.16 | Subscription page shows referral banner | Banner with referral link displayed | |
| 23.17 | i18n: all referral strings in en, pl, ru | Strings translated in all languages | |

---

## Summary

| Category | Test Count |
|---|---|
| Authentication & Registration | 20 |
| AI Chat | 15 |
| AI Tools — wFirma | 46 |
| AI Tools — KSeF | 28 |
| Subscriptions & Payments | 12 |
| Credential Management | 10 |
| User Profile | 6 |
| Admin Panel | 7 |
| AI Cost Tracking | 6 |
| Help System | 5 |
| Internationalization | 6 |
| Dark / Light Mode | 5 |
| Files & Downloads | 7 |
| Privacy & Cookies | 6 |
| Responsiveness | 8 |
| Performance | 7 |
| Security | 14 |
| Error Handling | 11 |
| Accessibility | 6 |
| Browser Compatibility | 7 |
| Database & Cache | 10 |
| CI/CD & Deployment | 7 |
| Referral Program | 17 |
| **TOTAL** | **267** |

---

*Last updated: 2026-04-16*
