# AI Chat Tools - wFirma Integration

This document describes all available AI tools and example questions that trigger them.

---

## Company Tools

### `get_company_info`
Get company basic information (name, NIP, REGON, KRS, address, email, phone).

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż dane mojej firmy", "Jakie są dane firmy?", "Jaki mam NIP?", "Podaj adres firmy" |
| **EN** | "Show my company data", "What is my company info?", "What is my NIP?", "Show company address" |
| **RU** | "Покажи данные моей компании", "Какие данные у моей фирмы?", "Какой у меня NIP?", "Покажи адрес компании" |

---

### `get_company_accounts`
Get company bank accounts (account numbers, bank names, SWIFT codes).

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Jakie mam konta bankowe?", "Pokaż numery kont", "Na jakie konto mogę przyjąć przelew?" |
| **EN** | "What are my bank accounts?", "Show account numbers", "What bank accounts do I have?" |
| **RU** | "Какие у меня банковские счета?", "Покажи номера счетов", "На какой счёт можно перевести деньги?" |

---

### `get_company_addresses`
Get company addresses (main registration address, correspondence address).

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż adresy firmy", "Jaki jest adres korespondencyjny?", "Gdzie jest siedziba firmy?" |
| **EN** | "Show company addresses", "What is the correspondence address?", "Where is the company located?" |
| **RU** | "Покажи адреса компании", "Какой адрес для корреспонденции?", "Где находится офис компании?" |

---

## Contractor Tools

### `get_contractors`
Search and list contractors (customers, suppliers).

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż moich kontrahentów", "Znajdź klienta Jan Kowalski", "Lista dostawców", "Szukaj firmy ABC" |
| **EN** | "Show my contractors", "Find customer John Smith", "List suppliers", "Search for company ABC" |
| **RU** | "Покажи моих контрагентов", "Найди клиента Иван Иванов", "Список поставщиков", "Найди фирму ABC" |

---

### `create_contractor`
Create a new contractor in wFirma.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Dodaj nowego kontrahenta", "Utwórz klienta Firma XYZ, NIP 1234567890", "Zarejestruj dostawcę" |
| **EN** | "Add new contractor", "Create customer Company XYZ, NIP 1234567890", "Register a supplier" |
| **RU** | "Добавь нового контрагента", "Создай клиента Фирма XYZ, NIP 1234567890", "Зарегистрируй поставщика" |

---

### `update_contractor`
Update existing contractor information.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Zmień email kontrahenta ABC na nowy@email.pl", "Zaktualizuj adres firmy XYZ", "Popraw dane klienta" |
| **EN** | "Change contractor ABC email to new@email.com", "Update company XYZ address", "Fix customer data" |
| **RU** | "Измени email контрагента ABC на new@email.pl", "Обнови адрес фирмы XYZ", "Исправь данные клиента" |

---

### `delete_contractor`
Delete a contractor from wFirma.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Usuń kontrahenta ABC", "Skasuj klienta o NIP 1234567890", "Usuń dostawcę XYZ" |
| **EN** | "Delete contractor ABC", "Remove customer with NIP 1234567890", "Delete supplier XYZ" |
| **RU** | "Удали контрагента ABC", "Удали клиента с NIP 1234567890", "Убери поставщика XYZ" |

---

## Invoice Tools

### `get_invoices`
List invoices with optional filters (year, month, status).

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż moje faktury", "Faktury z stycznia 2024", "Nieopłacone faktury", "Lista faktur za ten rok" |
| **EN** | "Show my invoices", "Invoices from January 2024", "Unpaid invoices", "List invoices for this year" |
| **RU** | "Покажи мои счета", "Счета за январь 2024", "Неоплаченные счета", "Список счетов за этот год" |

---

### `get_invoice_details`
Get detailed information about a specific invoice.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż szczegóły faktury FV/2024/001", "Ile wynosi faktura 123?", "Kto jest odbiorcą faktury?" |
| **EN** | "Show invoice details FV/2024/001", "How much is invoice 123?", "Who is the invoice recipient?" |
| **RU** | "Покажи детали счёта FV/2024/001", "Сколько составляет счёт 123?", "Кто получатель счёта?" |

---

### `send_invoice`
Send an invoice by email.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Wyślij fakturę FV/2024/001", "Wyślij fakturę 123 na email klient@firma.pl" |
| **EN** | "Send invoice FV/2024/001", "Send invoice 123 to email client@company.com" |
| **RU** | "Отправь счёт FV/2024/001", "Отправь счёт 123 на email client@firma.pl" |

---

### `add_invoice_note`
Add a note/comment to an invoice.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Dodaj notatkę do faktury 123: Klient prosi o przedłużenie terminu", "Dodaj komentarz do faktury" |
| **EN** | "Add note to invoice 123: Customer requests extension", "Add comment to invoice" |
| **RU** | "Добавь заметку к счёту 123: Клиент просит продлить срок", "Добавь комментарий к счёту" |

---

### `get_invoice_notes`
Get all notes/comments for an invoice.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż notatki do faktury 123", "Jakie są komentarze do tej faktury?" |
| **EN** | "Show notes for invoice 123", "What are the comments for this invoice?" |
| **RU** | "Покажи заметки к счёту 123", "Какие комментарии к этому счёту?" |

---

### `delete_invoice_note`
Delete a note from an invoice.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Usuń notatkę z faktury 123", "Skasuj komentarz do faktury" |
| **EN** | "Delete note from invoice 123", "Remove comment from invoice" |
| **RU** | "Удали заметку со счёта 123", "Убери комментарий к счёту" |

---

### `download_invoice`
Download invoice as PDF file. Returns a temporary download link (valid for 15 minutes).

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pobierz fakturę FV/2024/001", "Ściągnij PDF faktury", "Daj link do pobrania faktury" |
| **EN** | "Download invoice FV/2024/001", "Get invoice PDF", "Give me download link for invoice" |
| **RU** | "Скачай счёт FV/2024/001", "Скачай PDF счёта", "Дай ссылку на скачивание счёта" |

**Parameters:**
- invoiceNumber - Invoice number (required)
- page - PDF content: "all" (original+copy), "invoice" (original only), "invoicecopy" (copy only). Default: invoice

---

### `create_invoice`
Create a new invoice in wFirma.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Wystaw fakturę dla Firma ABC na 5000 zł", "Utwórz fakturę bez VAT za usługi IT", "Dodaj fakturę pro forma" |
| **EN** | "Issue invoice for Company ABC for 5000 PLN", "Create non-VAT invoice for IT services", "Add proforma invoice" |
| **RU** | "Выстави счёт для Фирма ABC на 5000 zł", "Создай счёт без НДС за услуги IT", "Добавь счёт про форма" |

**Required fields:**
- contractorName or contractorId - Contractor identification
- items - Array of line items (name, quantity, unit, priceNet)

**Optional fields:**
- type - Invoice type:
  - `bill` - Invoice without VAT (bez VAT/без НДС) - **DEFAULT**
  - `normal` - VAT invoice (requires company to be VAT payer)
  - `proforma` - Pro-forma invoice
  - `receipt_normal` - Receipt
  - `margin` - Margin invoice
- vatRate - VAT rate per item: 23, 8, 5, 0, zw (default: 23)
- paymentMethod - transfer/cash/card/compensation
- issueDate - Invoice issue date (YYYY-MM-DD)
- dueDate - Payment due date (YYYY-MM-DD)
- currency - Currency code (default: PLN)
- description - Invoice notes/description

**Important:** Use `type="bill"` for non-VAT invoices. Use `type="normal"` only if company is registered as VAT payer.

---

### `update_invoice`
Update an existing invoice (due date, payment method, description, already paid amount).

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Zmień termin płatności faktury FV/2024/001 na 2024-03-15", "Zaktualizuj opis faktury", "Oznacz fakturę jako częściowo opłaconą" |
| **EN** | "Change invoice FV/2024/001 due date to 2024-03-15", "Update invoice description", "Mark invoice as partially paid" |
| **RU** | "Измени срок оплаты счёта FV/2024/001 на 2024-03-15", "Обнови описание счёта", "Отметь счёт как частично оплаченный" |

**Required:** invoiceNumber

**Optional fields:**
- dueDate - New due date (YYYY-MM-DD)
- paymentMethod - transfer/cash/card/compensation
- description - Invoice notes/description
- alreadypaid - Amount already paid

---

### `delete_invoice`
Delete an invoice from wFirma. **WARNING: Cannot be undone!**

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Usuń fakturę FV/2024/001", "Skasuj fakturę", "Wymaż fakturę" |
| **EN** | "Delete invoice FV/2024/001", "Remove invoice", "Erase invoice" |
| **RU** | "Удали счёт FV/2024/001", "Убери счёт", "Удали счёт" |

---

## Financial Tools

### `get_financial_summary`
Get financial summary (revenue, expenses, profit).

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż podsumowanie finansowe", "Ile zarobiłem w tym miesiącu?", "Jaki mam przychód?", "Pokaż wydatki" |
| **EN** | "Show financial summary", "How much did I earn this month?", "What is my revenue?", "Show expenses" |
| **RU** | "Покажи финансовое резюме", "Сколько я заработал в этом месяце?", "Какой у меня доход?", "Покажи расходы" |

---

## User Tools

### `get_users`
Get list of users with access to the wFirma company account.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Kto ma dostęp do wFirma?", "Pokaż użytkowników", "Lista pracowników z dostępem", "Kto pracuje w firmie?" |
| **EN** | "Who has access to wFirma?", "Show users", "List employees with access", "Who works in the company?" |
| **RU** | "Кто имеет доступ к wFirma?", "Покажи пользователей", "Список сотрудников с доступом", "Кто работает в компании?" |

---

### `get_user_companies`
Get user-company relationships showing access and permissions.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Jakie uprawnienia mają użytkownicy?", "Kto ma dostęp do jakich firm?", "Pokaż powiązania użytkowników" |
| **EN** | "What permissions do users have?", "Who has access to which companies?", "Show user relationships" |
| **RU** | "Какие права у пользователей?", "Кто имеет доступ к каким компаниям?", "Покажи связи пользователей" |

---

### `get_user_company_by_id`
Get specific user-company relationship details by ID.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż szczegóły powiązania użytkownika 123", "Jakie uprawnienia ma użytkownik w firmie?" |
| **EN** | "Show user-company relationship details 123", "What permissions does the user have in the company?" |
| **RU** | "Покажи детали связи пользователя 123", "Какие права у пользователя в компании?" |

---

## Payment Tools

### `get_payments`
List payments for invoices and expenses with optional filters.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż płatności", "Płatności dla faktury FV 1/2026", "Płatności przelewem", "Płatności z stycznia 2026" |
| **EN** | "Show payments", "Payments for invoice FV 1/2026", "Bank transfer payments", "Payments from January 2026" |
| **RU** | "Покажи платежи", "Платежи для счёта FV 1/2026", "Платежи переводом", "Платежи за январь 2026" |

---

### `get_payment_details`
Get detailed information about a specific payment by ID.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż szczegóły płatności 123", "Jakie są dane płatności?", "Info o płatności" |
| **EN** | "Show payment details 123", "What are payment details?", "Payment info" |
| **RU** | "Покажи детали платежа 123", "Какие данные платежа?", "Инфо о платеже" |

---

### `add_payment`
Add/create/register a new payment to an invoice.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Dodaj płatność 100 EUR dla faktury FV 1/2026", "Zarejestruj wpłatę 500 PLN przelewem", "Utwórz płatność" |
| **EN** | "Add payment 100 EUR for invoice FV 1/2026", "Register payment 500 PLN by transfer", "Create payment" |
| **RU** | "Добавь оплату 100 EUR для счёта FV 1/2026", "Зарегистрируй платёж 500 PLN переводом", "Создай платёж" |

---

### `update_payment`
Update an existing payment (amount, date, or method).

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Zmień kwotę płatności 123 na 150", "Zaktualizuj datę płatności", "Popraw metodę płatności na gotówka" |
| **EN** | "Change payment 123 amount to 150", "Update payment date", "Fix payment method to cash" |
| **RU** | "Измени сумму платежа 123 на 150", "Обнови дату платежа", "Исправь метод платежа на наличные" |

---

### `delete_payment`
Delete a payment by ID (WARNING: cannot be undone).

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Usuń płatność 123", "Skasuj płatność", "Wymaż wpłatę" |
| **EN** | "Delete payment 123", "Remove payment", "Erase payment" |
| **RU** | "Удали платёж 123", "Убери платёж", "Удали оплату" |

---

## Expense Tools

### `get_expenses`
List expenses (business costs, bills, purchases) with optional filters.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż wydatki", "Wydatki z stycznia 2026", "Nieopłacone wydatki", "Wydatki od kontrahenta ABC", "Rachunki za energię" |
| **EN** | "Show expenses", "Expenses from January 2026", "Unpaid expenses", "Expenses from contractor ABC", "Electricity bills" |
| **RU** | "Покажи расходы", "Расходы за январь 2026", "Неоплаченные расходы", "Расходы от контрагента ABC", "Счета за электричество" |

**Filters:**
- Date range (from/to)
- Contractor name
- Payment status (paid/unpaid)
- Expense type (invoice/bill/vat_exempt)

---

### `get_expense_details`
Get detailed information about a specific expense, including all items/parts.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż szczegóły wydatku 181703896", "Jakie pozycje ma wydatek?", "Info o rachunku", "Co zawiera ten wydatek?" |
| **EN** | "Show expense details 181703896", "What items does the expense have?", "Bill info", "What does this expense contain?" |
| **RU** | "Покажи детали расхода 181703896", "Какие позиции в расходе?", "Инфо о счёте", "Что содержит этот расход?" |

**Shows:**
- Basic information (type, date, contractor, status)
- Payment information (due date, method, KPiR posting date)
- Expense items/parts with quantities, prices, VAT rates
- Totals (net, VAT, gross)
- Additional flags (WNT, split payment, import types, draft)

---

## Vehicle Tools

### `get_vehicles`
List vehicles (cars, trucks, motorcycles) with optional filters.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż pojazdy", "Lista samochodów firmowych", "Pojazdy w leasingu", "Samochody osobowe", "Pojazdy z rejestracją WA" |
| **EN** | "Show vehicles", "List company cars", "Leased vehicles", "Personal cars", "Vehicles with registration WA" |
| **RU** | "Покажи транспорт", "Список служебных машин", "Транспорт в лизинге", "Легковые автомобили", "Транспорт с регистрацией WA" |

**Filters:**
- Vehicle type (truck/car/motor/motor-bike)
- Ownership form (leasing/private/other)
- Search by name or registration number
- Limit results

---

### `get_vehicle_details`
Get detailed information about a specific vehicle by ID or registration number.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż szczegóły pojazdu DW435457", "Info o samochodzie z rejestracją WA12345", "Dane pojazdu 123", "Czy auto w leasingu?" |
| **EN** | "Show vehicle details DW435457", "Info about car with registration WA12345", "Vehicle data 123", "Is car leased?" |
| **RU** | "Покажи детали транспорта DW435457", "Инфо о машине с регистрацией WA12345", "Данные транспорта 123", "Машина в лизинге?" |

**Shows:**
- Basic info (ID, name, registration number, type, ownership)
- Truck type (for trucks: normal >3.5t or quasi <3.5t)
- Tax purpose (mixed use or company only)
- Leasing information (if applicable):
  - Value below 150k PLN
  - Lease agreement date
  - Vehicle value

---

### `add_vehicle`
Create a new vehicle in wFirma.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Dodaj pojazd Toyota Corolla, rejestracja WA12345, osobowy, własny", "Utwórz samochód ciężarowy w leasingu", "Zarejestruj motocykl" |
| **EN** | "Add vehicle Toyota Corolla, registration WA12345, car, private", "Create leased truck", "Register motorcycle" |
| **RU** | "Добавь транспорт Toyota Corolla, регистрация WA12345, легковой, собственный", "Создай грузовик в лизинге", "Зарегистрируй мотоцикл" |

**Required fields:**
- name - Vehicle name/description
- register - Registration number (e.g., WA12345)
- type - truck/car/motor/motor-bike
- ownership - leasing/private/other

**Optional fields:**
- truckType - normal (>3.5t) or quasi (<3.5t) for trucks
- taxPurpose - mixed or company (usage purpose)
- vatLeasingBelowLimit - Is value below 150k PLN? (boolean)
- vatLeasingDate - Lease agreement date (YYYY-MM-DD)
- vatLeasingValue - Vehicle value (number)

---

### `update_vehicle`
Update an existing vehicle in wFirma.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Zmień pojazd DW435457 na leasing", "Zaktualizuj wartość samochodu WA12345 na 80000", "Popraw nazwę pojazdu", "Zmień rejestrację na nową" |
| **EN** | "Change vehicle DW435457 to leasing", "Update car WA12345 value to 80000", "Fix vehicle name", "Change registration to new one" |
| **RU** | "Измени транспорт DW435457 на лизинг", "Обнови стоимость машины WA12345 на 80000", "Исправь название транспорта", "Измени регистрацию на новую" |

**Identification:**
- By vehicleId (if known)
- By registration number (searches and finds exact match)

**All fields are optional** - only provided fields will be updated.

---

### `delete_vehicle`
Delete a vehicle from wFirma. **WARNING: Cannot be undone!**

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Usuń pojazd DW435457", "Skasuj samochód z rejestracją WA12345", "Wymaż pojazd 123" |
| **EN** | "Delete vehicle DW435457", "Remove car with registration WA12345", "Erase vehicle 123" |
| **RU** | "Удали транспорт DW435457", "Убери машину с регистрацией WA12345", "Удали транспорт 123" |

**Identification:**
- By vehicleId (if known)
- By registration number (searches and finds exact match)

---

## Term Tools

### `get_terms`
List terms (appointments/deadlines) with optional filters.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż terminy", "Terminy na styczeń 2026", "Cykliczne terminy", "Terminy z grupy Spotkania", "Szukaj termin ABC" |
| **EN** | "Show terms", "Terms for January 2026", "Cyclic terms", "Terms from Meetings group", "Search term ABC" |
| **RU** | "Покажи сроки", "Сроки на январь 2026", "Циклические сроки", "Сроки из группы Встречи", "Найди срок ABC" |

**Filters:**
- Date range (from/to in YYYY-MM-DD format)
- Type (normal/cycle_day_of_week/cycle_day_of_month)
- Term group ID
- Search by description
- Limit results

---

### `get_term_details`
Get detailed information about a specific term by ID.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż szczegóły terminu 123", "Info o terminie", "Dane terminu" |
| **EN** | "Show term details 123", "Term info", "Term data" |
| **RU** | "Покажи детали срока 123", "Инфо о сроке", "Данные срока" |

**Shows:**
- ID, date, hour
- Description
- Type (normal, cyclic by week day, cyclic by month day)
- Group ID, Contractor, Contact

---

### `add_term`
Create a new term (appointment/deadline) in wFirma.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Dodaj termin na 2026-02-15", "Utwórz termin spotkanie z klientem o 14:00", "Zarejestruj termin cykliczny w poniedziałki" |
| **EN** | "Add term for 2026-02-15", "Create term meeting with client at 14:00", "Register cyclic term on Mondays" |
| **RU** | "Добавь срок на 2026-02-15", "Создай срок встреча с клиентом в 14:00", "Зарегистрируй циклический срок по понедельникам" |

**Required fields:**
- date - Term date (YYYY-MM-DD format)

**Optional fields:**
- hour - Time (HH:MM:SS format)
- description - Term description/note
- termGroupId - Term group ID
- type - normal/cycle_day_of_week/cycle_day_of_month (default: normal)
- contractorId - Associated contractor ID
- contactId - Associated contact ID

---

### `update_term`
Update an existing term in wFirma.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Zmień datę terminu 123 na 2026-03-01", "Zaktualizuj opis terminu", "Przenieś termin na 15:00" |
| **EN** | "Change term 123 date to 2026-03-01", "Update term description", "Move term to 15:00" |
| **RU** | "Измени дату срока 123 на 2026-03-01", "Обнови описание срока", "Перенеси срок на 15:00" |

**Required:** termId
**All other fields are optional** - only provided fields will be updated.

---

### `delete_term`
Delete a term from wFirma. **WARNING: Cannot be undone!**

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Usuń termin 123", "Skasuj termin", "Wymaż termin" |
| **EN** | "Delete term 123", "Remove term", "Erase term" |
| **RU** | "Удали срок 123", "Убери срок", "Удали срок" |

---

## Term Group Tools

### `get_term_groups`
List term groups with optional search.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż grupy terminów", "Lista grup", "Szukaj grupę Spotkania" |
| **EN** | "Show term groups", "List groups", "Search group Meetings" |
| **RU** | "Покажи группы сроков", "Список групп", "Найди группу Встречи" |

**Filters:**
- Search by name
- Limit results

---

### `get_term_group_details`
Get detailed information about a specific term group by ID.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż szczegóły grupy terminów 13", "Info o grupie", "Dane grupy" |
| **EN** | "Show term group details 13", "Group info", "Group data" |
| **RU** | "Покажи детали группы сроков 13", "Инфо о группе", "Данные группы" |

---

### `add_term_group`
Create a new term group in wFirma.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Dodaj grupę terminów Spotkania", "Utwórz grupę tylko do odczytu", "Zarejestruj grupę Projekty" |
| **EN** | "Add term group Meetings", "Create read-only group", "Register group Projects" |
| **RU** | "Добавь группу сроков Встречи", "Создай группу только для чтения", "Зарегистрируй группу Проекты" |

**Required fields:**
- name - Group name

**Optional fields:**
- isReadonly - If true, group and its terms cannot be modified via wFirma.pl website

---

### `update_term_group`
Update an existing term group in wFirma.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Zmień nazwę grupy 13 na Ważne", "Ustaw grupę jako tylko do odczytu", "Zaktualizuj grupę terminów" |
| **EN** | "Change group 13 name to Important", "Set group as read-only", "Update term group" |
| **RU** | "Измени название группы 13 на Важные", "Установи группу только для чтения", "Обнови группу сроков" |

**Required:** termGroupId
**Optional:** name, isReadonly

---

### `delete_term_group`
Delete a term group from wFirma. **WARNING: Cannot be undone!**

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Usuń grupę terminów 13", "Skasuj grupę", "Wymaż grupę Spotkania" |
| **EN** | "Delete term group 13", "Remove group", "Erase group Meetings" |
| **RU** | "Удали группу сроков 13", "Убери группу", "Удали группу Встречи" |

**Note:** Make sure to reassign any terms in this group first.

---

## Declaration Tools

### `get_jpk_vat_declaration`
Get JPK VAT declaration in XML format for a specific year and month. Returns a downloadable XML file.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pobierz JPK VAT za styczeń 2026", "Daj mi deklarację VAT za grudzień", "Wygeneruj JPK za 12/2025" |
| **EN** | "Download JPK VAT for January 2026", "Give me VAT declaration for December", "Generate JPK for 12/2025" |
| **RU** | "Скачай JPK VAT за январь 2026", "Дай мне декларацию VAT за декабрь", "Сгенерируй JPK за 12/2025" |

**Required fields:**
- year - Year (2020-2030)
- month - Month (1-12)

---

### `get_pit_declaration`
Get PIT declaration in XML format for a specific year and type. Returns a downloadable XML file.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pobierz PIT-36 za 2025", "Daj mi deklarację PIT-36L", "Wygeneruj PIT-28 za rok 2024" |
| **EN** | "Download PIT-36 for 2025", "Give me PIT-36L declaration", "Generate PIT-28 for year 2024" |
| **RU** | "Скачай PIT-36 за 2025", "Дай мне декларацию PIT-36L", "Сгенерируй PIT-28 за 2024 год" |

**Required fields:**
- year - Year (2020-2030)
- type - pit36, pit36l, or pit28

---

## Document Tools

### `get_documents`
List documents from wFirma with optional filters.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż dokumenty", "Dokumenty z kategorii CRM", "Pliki do faktury", "Szukaj dokument umowa" |
| **EN** | "Show documents", "Documents from CRM category", "Files for invoice", "Search document contract" |
| **RU** | "Покажи документы", "Документы из категории CRM", "Файлы к счёту", "Найди документ договор" |

**Filters:**
- objectName - Related object type (invoice, expense, contractor)
- objectId - Related object ID
- type - file, document_template, url
- set - book (accounting), crm, declaration, staff, warehouse
- search - Search in document name
- limit - Max results (default 50)

---

### `get_document_details`
Get detailed information about a specific document. Can optionally prepare file for download.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż szczegóły dokumentu 123", "Info o dokumencie", "Dane pliku" |
| **EN** | "Show document details 123", "Document info", "File data" |
| **RU** | "Покажи детали документа 123", "Инфо о документе", "Данные файла" |

**Parameters:**
- documentId - Document ID (required)
- prepareDownload - Set to true to get download link (optional)

---

### `download_document`
Download a document file and get a temporary download link.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pobierz dokument 123", "Скачай plik umowa.pdf", "Daj link do pobrania dokumentu" |
| **EN** | "Download document 123", "Download file contract.pdf", "Give me download link for document" |
| **RU** | "Скачай документ 123", "Скачай файл договор.pdf", "Дай ссылку на скачивание документа" |

**Note:** Only works for documents with type=file. Returns a temporary download link (valid for 15 minutes).

---

### `delete_document`
Delete a document from wFirma. **WARNING: Cannot be undone!**

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Usuń dokument 123", "Skasuj plik", "Wymaż dokument" |
| **EN** | "Delete document 123", "Remove file", "Erase document" |
| **RU** | "Удали документ 123", "Убери файл", "Удали документ" |

---

## Ledger Tools

### `get_fiscal_years`
Get list of fiscal years (accounting periods) from wFirma.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż lata obrachunkowe", "Jakie mam okresy rozliczeniowe?", "Lista lat podatkowych" |
| **EN** | "Show fiscal years", "What accounting periods do I have?", "List tax years" |
| **RU** | "Покажи финансовые годы", "Какие у меня учётные периоды?", "Список налоговых годов" |

**Filters:**
- limit - Max results (default 100)
- page - Page number for pagination

---

### `get_fiscal_year_details`
Get detailed information about a specific fiscal year by ID.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż szczegóły roku obrachunkowego 123", "Info o okresie rozliczeniowym" |
| **EN** | "Show fiscal year details 123", "Accounting period info" |
| **RU** | "Покажи детали финансового года 123", "Инфо об учётном периоде" |

**Shows:**
- ID, Symbol (name)
- Start date, End date

---

### `get_accounting_schemas`
Get list of accounting schemas (operation schemas) from wFirma.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż schematy księgowe", "Jakie mam schematy operacji?", "Lista schematów dla roku 2024" |
| **EN** | "Show accounting schemas", "What operation schemas do I have?", "List schemas for year 2024" |
| **RU** | "Покажи схемы учёта", "Какие у меня схемы операций?", "Список схем за 2024 год" |

**Filters:**
- fiscalYearId - Filter by fiscal year
- category - Filter by schema category
- limit - Max results (default 100)
- page - Page number for pagination

---

### `get_accounting_schema_details`
Get detailed information about a specific accounting schema by ID.

| Language | Example Questions |
|----------|-------------------|
| **PL** | "Pokaż szczegóły schematu księgowego 123", "Info o schemacie operacji" |
| **EN** | "Show accounting schema details 123", "Operation schema info" |
| **RU** | "Покажи детали схемы учёта 123", "Инфо о схеме операции" |

**Shows:**
- ID, Name
- Category, Visibility
- Related fiscal year (if available)

---

## Tools Summary Table

| Tool Name | Category | Description |
|-----------|----------|-------------|
| `get_company_info` | Company | Basic company data |
| `get_company_accounts` | Company | Bank accounts |
| `get_company_addresses` | Company | Company addresses |
| `get_contractors` | Contractors | List/search contractors |
| `create_contractor` | Contractors | Create new contractor |
| `update_contractor` | Contractors | Update contractor |
| `delete_contractor` | Contractors | Delete contractor |
| `get_invoices` | Invoices | List invoices |
| `get_invoice_details` | Invoices | Invoice details |
| `send_invoice` | Invoices | Send invoice by email |
| `add_invoice_note` | Invoices | Add note to invoice |
| `get_invoice_notes` | Invoices | Get invoice notes |
| `delete_invoice_note` | Invoices | Delete invoice note |
| `download_invoice` | Invoices | Download invoice as PDF |
| `create_invoice` | Invoices | Create new invoice |
| `update_invoice` | Invoices | Update existing invoice |
| `delete_invoice` | Invoices | Delete invoice |
| `get_financial_summary` | Financial | Financial summary |
| `get_users` | Users | List company users |
| `get_user_companies` | Users | User-company relationships |
| `get_user_company_by_id` | Users | User-company details by ID |
| `get_payments` | Payments | List payments with filters |
| `get_payment_details` | Payments | Payment details by ID |
| `add_payment` | Payments | Add new payment to invoice |
| `update_payment` | Payments | Update existing payment |
| `delete_payment` | Payments | Delete payment |
| `get_expenses` | Expenses | List expenses with filters |
| `get_expense_details` | Expenses | Expense details with items |
| `get_vehicles` | Vehicles | List vehicles with filters |
| `get_vehicle_details` | Vehicles | Vehicle details by ID or registration |
| `add_vehicle` | Vehicles | Create new vehicle |
| `update_vehicle` | Vehicles | Update existing vehicle |
| `delete_vehicle` | Vehicles | Delete vehicle |
| `get_terms` | Terms | List terms (appointments/deadlines) with filters |
| `get_term_details` | Terms | Term details by ID |
| `add_term` | Terms | Create new term |
| `update_term` | Terms | Update existing term |
| `delete_term` | Terms | Delete term |
| `get_term_groups` | Term Groups | List term groups |
| `get_term_group_details` | Term Groups | Term group details by ID |
| `add_term_group` | Term Groups | Create new term group |
| `update_term_group` | Term Groups | Update existing term group |
| `delete_term_group` | Term Groups | Delete term group |
| `get_jpk_vat_declaration` | Declarations | JPK VAT declaration (XML download) |
| `get_pit_declaration` | Declarations | PIT declaration (XML download) |
| `get_documents` | Documents | List documents with filters |
| `get_document_details` | Documents | Document details by ID |
| `download_document` | Documents | Download document file |
| `delete_document` | Documents | Delete document |
| `get_fiscal_years` | Ledger | List fiscal years |
| `get_fiscal_year_details` | Ledger | Fiscal year details by ID |
| `get_accounting_schemas` | Ledger | List accounting schemas |
| `get_accounting_schema_details` | Ledger | Accounting schema details by ID |

---

## Total: 53 Tools

### Breakdown by Category:
- **Company**: 3 tools
- **Contractors**: 4 tools (CRUD)
- **Invoices**: 10 tools (CRUD + notes + send + download)
- **Financial**: 1 tool
- **Users**: 3 tools
- **Payments**: 5 tools (CRUD)
- **Expenses**: 2 tools (read-only)
- **Vehicles**: 5 tools (CRUD)
- **Terms**: 5 tools (CRUD)
- **Term Groups**: 5 tools (CRUD)
- **Declarations**: 2 tools (JPK VAT, PIT)
- **Documents**: 4 tools (list, details, download, delete)
- **Ledger**: 4 tools (fiscal years, accounting schemas - read-only)
