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

---

## Total: 29 Tools

### Breakdown by Category:
- **Company**: 3 tools
- **Contractors**: 4 tools (CRUD)
- **Invoices**: 6 tools
- **Financial**: 1 tool
- **Users**: 3 tools
- **Payments**: 5 tools (CRUD)
- **Expenses**: 2 tools (read-only)
- **Vehicles**: 5 tools (CRUD)
