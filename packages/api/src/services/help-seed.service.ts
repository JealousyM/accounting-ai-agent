/**
 * Help Topics Auto-Seed Service
 * Seeds help_topics table on API startup if empty.
 * Uses upsert so re-runs are safe (no duplicates).
 */

import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

const helpTopics = [
  {
    slug: 'getting-started-welcome',
    category: 'gettingStarted',
    titlePl: 'Witamy w Accounting AI Agent',
    titleEn: 'Welcome to Accounting AI Agent',
    titleRu: 'Добро пожаловать в Accounting AI Agent',
    contentPl: `Accounting AI Agent to inteligentny asystent księgowy, który pomaga w zarządzaniu finansami i podatkami dla firm IT w Polsce.

**Co możesz zrobić:**
- Zadawać pytania o podatki (VAT, PIT, CIT, ZUS)
- Zarządzać fakturami i kontrahentami przez wFirma
- Otrzymywać personalizowane porady podatkowe
- Automatyzować obliczenia księgowe

**Jak zacząć:**
1. Połącz swoje konto wFirma w Ustawieniach
2. Zadaj pierwsze pytanie w czacie AI
3. Eksploruj dostępne funkcje i możliwości`,
    contentEn: `Accounting AI Agent is an intelligent accounting assistant that helps with financial and tax management for IT companies in Poland.

**What you can do:**
- Ask questions about taxes (VAT, PIT, CIT, ZUS)
- Manage invoices and contractors through wFirma
- Get personalized tax advice
- Automate accounting calculations

**Getting started:**
1. Connect your wFirma account in Settings
2. Ask your first question in AI chat
3. Explore available features and capabilities`,
    contentRu: `Accounting AI Agent - это интеллектуальный бухгалтерский ассистент, который помогает в управлении финансами и налогами для IT-компаний в Польше.

**Что вы можете делать:**
- Задавать вопросы о налогах (VAT, PIT, CIT, ZUS)
- Управлять счетами и контрагентами через wFirma
- Получать персонализированные налоговые советы
- Автоматизировать бухгалтерские расчеты

**Начало работы:**
1. Подключите аккаунт wFirma в Настройках
2. Задайте первый вопрос в AI чате
3. Изучите доступные функции и возможности`,
    searchKeywordsPl: ['start', 'wprowadzenie', 'początek', 'pierwsze kroki', 'witaj'],
    searchKeywordsEn: ['start', 'introduction', 'beginning', 'first steps', 'welcome'],
    searchKeywordsRu: ['старт', 'введение', 'начало', 'первые шаги', 'приветствие'],
    order: 1,
    isFeatured: true,
  },
  {
    slug: 'ai-chat-how-to-use',
    category: 'aiChat',
    titlePl: 'Jak korzystać z czatu AI',
    titleEn: 'How to use AI Chat',
    titleRu: 'Как использовать AI чат',
    contentPl: `Czat AI rozumie pytania w języku naturalnym po polsku, angielsku i rosyjsku.

**Przykłady pytań:**
- "Ile wynosi VAT od 1000 PLN?"
- "Pokaż faktury z grudnia 2025"
- "Jakie są terminy płatności ZUS?"
- "Dodaj nowego kontrahenta ABC Sp. z o.o."

**Wskazówki:**
- Zadawaj konkretne pytania
- Możesz łączyć pytania (np. "pokaż faktury i oblicz VAT")
- AI automatycznie wykrywa twój język
- Możesz prosić o szczegóły lub wyjaśnienia
- AI ma dostęp do twoich danych z wFirma (faktury, kontrahenci, płatności)`,
    contentEn: `AI Chat understands natural language questions in Polish, English, and Russian.

**Example questions:**
- "How much is VAT on 1000 PLN?"
- "Show invoices from December 2025"
- "What are ZUS payment deadlines?"
- "Add new contractor ABC Sp. z o.o."

**Tips:**
- Ask specific questions
- You can combine questions (e.g. "show invoices and calculate VAT")
- AI automatically detects your language
- You can ask for details or explanations
- AI has access to your wFirma data (invoices, contractors, payments)`,
    contentRu: `AI чат понимает вопросы на естественном языке на польском, английском и русском.

**Примеры вопросов:**
- "Сколько составляет НДС от 1000 PLN?"
- "Покажи счета за декабрь 2025"
- "Какие сроки оплаты ZUS?"
- "Добавь нового контрагента ABC Sp. z o.o."

**Советы:**
- Задавайте конкретные вопросы
- Можно комбинировать вопросы (напр. "покажи счета и рассчитай НДС")
- AI автоматически определяет ваш язык
- Можете просить детали или объяснения
- AI имеет доступ к вашим данным wFirma (счета, контрагенты, платежи)`,
    searchKeywordsPl: ['czat', 'pytania', 'jak używać', 'przykłady', 'rozmowa'],
    searchKeywordsEn: ['chat', 'questions', 'how to use', 'examples', 'conversation'],
    searchKeywordsRu: ['чат', 'вопросы', 'как использовать', 'примеры', 'разговор'],
    order: 1,
    isFeatured: true,
  },
  {
    slug: 'faq-wfirma-connection',
    category: 'faq',
    titlePl: 'Jak połączyć konto wFirma?',
    titleEn: 'How to connect wFirma account?',
    titleRu: 'Как подключить аккаунт wFirma?',
    contentPl: `Aby połączyć konto wFirma:

1. Kliknij **ikonę użytkownika** w prawym górnym rogu
2. W oknie profilu kliknij przycisk **API Keys**
3. W sekcji wFirma wpisz:
   - **Access Key** - klucz dostępu z wFirma
   - **Secret Key** - klucz tajny z wFirma
   - **Company ID** - ID Twojej firmy
4. Kliknij **Zapisz**

**Gdzie znaleźć klucze w wFirma:**
- Zaloguj się na wFirma.pl
- Przejdź do Ustawienia → API
- Wygeneruj nowe klucze dostępu

Po połączeniu AI będzie miał dostęp do:
- Faktur sprzedaży i zakupu
- Kontrahentów
- Płatności i należności
- Dokumentów księgowych`,
    contentEn: `To connect your wFirma account:

1. Click the **user icon** in the top right corner
2. In the profile window, click **API Keys** button
3. In the wFirma section enter:
   - **Access Key** - access key from wFirma
   - **Secret Key** - secret key from wFirma
   - **Company ID** - your company ID
4. Click **Save**

**Where to find keys in wFirma:**
- Log in to wFirma.pl
- Go to Settings → API
- Generate new access keys

After connecting, AI will have access to:
- Sales and purchase invoices
- Contractors
- Payments and receivables
- Accounting documents`,
    contentRu: `Чтобы подключить аккаунт wFirma:

1. Нажмите на **иконку пользователя** в правом верхнем углу
2. В окне профиля нажмите кнопку **API Keys**
3. В секции wFirma введите:
   - **Access Key** - ключ доступа из wFirma
   - **Secret Key** - секретный ключ из wFirma
   - **Company ID** - ID вашей компании
4. Нажмите **Сохранить**

**Где найти ключи в wFirma:**
- Войдите на wFirma.pl
- Перейдите в Настройки → API
- Сгенерируйте новые ключи доступа

После подключения AI получит доступ к:
- Счетам продаж и покупок
- Контрагентам
- Платежам и задолженностям
- Бухгалтерским документам`,
    searchKeywordsPl: ['wfirma', 'połączenie', 'integracja', 'konfiguracja', 'api'],
    searchKeywordsEn: ['wfirma', 'connection', 'integration', 'setup', 'api'],
    searchKeywordsRu: ['wfirma', 'подключение', 'интеграция', 'настройка', 'api'],
    order: 1,
    isFeatured: true,
  },
  {
    slug: 'wfirma-query-examples',
    category: 'wfirma',
    titlePl: 'Przykładowe pytania o dane wFirma',
    titleEn: 'Example wFirma Data Queries',
    titleRu: 'Примеры запросов к данным wFirma',
    contentPl: `Możesz zadawać AI pytania o swoje dane z wFirma w naturalnym języku. Oto przykłady:

## Faktury (Invoices)

**Wyświetlanie faktur:**
- "Pokaż wszystkie faktury z grudnia 2025"
- "Pokaż faktury wystawione w tym miesiącu"
- "Jakie faktury są nieopłacone?"
- "Pokaż fakturę numer FV/2025/12/001"
- "Ile faktur wystawiłem w tym roku?"

**Filtrowanie faktur:**
- "Pokaż faktury dla kontrahenta ABC Sp. z o.o."
- "Pokaż faktury powyżej 10 000 PLN"
- "Które faktury są przeterminowane?"
- "Pokaż faktury ze statusem 'zapłacona'"

**Analiza faktur:**
- "Jaka jest suma wszystkich faktur z grudnia?"
- "Oblicz VAT z faktur z tego miesiąca"
- "Która faktura ma najwyższą wartość?"
- "Ile wynosi średnia wartość faktury?"

## Kontrahenci (Contractors)

**Wyszukiwanie kontrahentów:**
- "Pokaż wszystkich kontrahentów"
- "Znajdź kontrahenta o nazwie XYZ"
- "Pokaż kontrahenta z NIP 1234567890"
- "Ile kontrahentów mam w bazie?"

**Informacje o kontrahencie:**
- "Pokaż szczegóły kontrahenta ABC"
- "Jakie faktury wystawiłem dla kontrahenta XYZ?"
- "Jakie są dane kontaktowe kontrahenta ABC?"

**Operacje na kontrahentach:**
- "Dodaj nowego kontrahenta: nazwa 'Test Sp. z o.o.', NIP 1234567890"
- "Zaktualizuj email kontrahenta ABC na nowy@email.com"

## Płatności (Payments)

**Statusy płatności:**
- "Które faktury czekają na płatność?"
- "Pokaż opłacone faktury z ostatniego miesiąca"
- "Jakie płatności otrzymałem w tym tygodniu?"

**Kwoty i terminy:**
- "Ile pieniędzy oczekuję na wpływy?"
- "Które faktury są po terminie płatności?"
- "Kiedy przypada termin płatności faktury FV/2025/12/001?"

## Wydatki (Expenses)

- "Pokaż wszystkie wydatki z grudnia"
- "Jakie wydatki poniosłem w kategorii 'Oprogramowanie'?"
- "Jaka jest suma wydatków w tym roku?"
- "Dodaj nowy wydatek: opis 'Hosting', kwota 100 PLN, data 2025-12-15"

## Informacje o firmie (Company Info)

- "Jakie są dane mojej firmy?"
- "Jaki mam NIP?"
- "Pokaż mój adres firmy"
- "Jakie mam ustawienia wFirma?"

## Wskazówki:
- Używaj języka naturalnego - AI zrozumie Twoje pytanie
- Możesz łączyć pytania: "Pokaż faktury z grudnia i oblicz VAT"
- Możesz prosić o szczegóły: "Wyjaśnij co to znaczy", "Pokaż więcej informacji"
- AI automatycznie wykrywa Twój język (polski, angielski, rosyjski)
- Jeśli nie jesteś pewien jak zadać pytanie, po prostu spróbuj - AI jest bardzo elastyczny!`,
    contentEn: `You can ask AI questions about your wFirma data in natural language. Here are examples:

## Invoices

**Displaying invoices:**
- "Show all invoices from December 2025"
- "Show invoices issued this month"
- "Which invoices are unpaid?"
- "Show invoice number FV/2025/12/001"
- "How many invoices did I issue this year?"

**Filtering invoices:**
- "Show invoices for contractor ABC Ltd."
- "Show invoices above 10,000 PLN"
- "Which invoices are overdue?"
- "Show invoices with status 'paid'"

**Invoice analysis:**
- "What's the total of all invoices from December?"
- "Calculate VAT from this month's invoices"
- "Which invoice has the highest value?"
- "What's the average invoice value?"

## Contractors

**Searching contractors:**
- "Show all contractors"
- "Find contractor named XYZ"
- "Show contractor with NIP 1234567890"
- "How many contractors do I have?"

**Contractor information:**
- "Show details for contractor ABC"
- "What invoices did I issue for contractor XYZ?"
- "What are the contact details for contractor ABC?"

**Contractor operations:**
- "Add new contractor: name 'Test Ltd.', NIP 1234567890"
- "Update contractor ABC email to new@email.com"

## Payments

**Payment statuses:**
- "Which invoices are awaiting payment?"
- "Show paid invoices from last month"
- "What payments did I receive this week?"

**Amounts and deadlines:**
- "How much money am I expecting in receivables?"
- "Which invoices are past due?"
- "When is the payment deadline for invoice FV/2025/12/001?"

## Expenses

- "Show all expenses from December"
- "What expenses did I have in category 'Software'?"
- "What's the total expenses this year?"
- "Add new expense: description 'Hosting', amount 100 PLN, date 2025-12-15"

## Company Information

- "What are my company details?"
- "What's my NIP?"
- "Show my company address"
- "What are my wFirma settings?"

## Tips:
- Use natural language - AI will understand your question
- You can combine questions: "Show December invoices and calculate VAT"
- You can ask for details: "Explain what this means", "Show more information"
- AI automatically detects your language (Polish, English, Russian)
- If you're not sure how to ask, just try - AI is very flexible!`,
    contentRu: `Вы можете задавать AI вопросы о ваших данных wFirma на естественном языке. Вот примеры:

## Счета-фактуры (Invoices)

**Отображение счетов:**
- "Покажи все счета за декабрь 2025"
- "Покажи счета выставленные в этом месяце"
- "Какие счета неоплачены?"
- "Покажи счет номер FV/2025/12/001"
- "Сколько счетов я выставил в этом году?"

**Фильтрация счетов:**
- "Покажи счета для контрагента ABC Sp. z o.o."
- "Покажи счета больше 10 000 PLN"
- "Какие счета просрочены?"
- "Покажи счета со статусом 'оплачен'"

**Анализ счетов:**
- "Какая общая сумма всех счетов за декабрь?"
- "Рассчитай НДС со счетов этого месяца"
- "Какой счет имеет наибольшую стоимость?"
- "Какова средняя стоимость счета?"

## Контрагенты (Contractors)

**Поиск контрагентов:**
- "Покажи всех контрагентов"
- "Найди контрагента с названием XYZ"
- "Покажи контрагента с NIP 1234567890"
- "Сколько контрагентов у меня в базе?"

**Информация о контрагенте:**
- "Покажи детали контрагента ABC"
- "Какие счета я выставил для контрагента XYZ?"
- "Какие контактные данные у контрагента ABC?"

**Операции с контрагентами:**
- "Добавь нового контрагента: название 'Test Sp. z o.o.', NIP 1234567890"
- "Обнови email контрагента ABC на new@email.com"

## Платежи (Payments)

**Статусы платежей:**
- "Какие счета ждут оплаты?"
- "Покажи оплаченные счета за последний месяц"
- "Какие платежи я получил на этой неделе?"

**Суммы и сроки:**
- "Сколько денег я жду в поступлениях?"
- "Какие счета просрочены?"
- "Когда срок оплаты счета FV/2025/12/001?"

## Расходы (Expenses)

- "Покажи все расходы за декабрь"
- "Какие расходы были в категории 'Программное обеспечение'?"
- "Какова общая сумма расходов в этом году?"
- "Добавь новый расход: описание 'Хостинг', сумма 100 PLN, дата 2025-12-15"

## Информация о компании (Company Info)

- "Какие данные моей компании?"
- "Какой у меня NIP?"
- "Покажи адрес моей компании"
- "Какие у меня настройки wFirma?"

## Советы:
- Используйте естественный язык - AI поймет ваш вопрос
- Можно комбинировать вопросы: "Покажи счета за декабрь и рассчитай НДС"
- Можно просить детали: "Объясни что это значит", "Покажи больше информации"
- AI автоматически определяет ваш язык (польский, английский, русский)
- Если не уверены как спросить, просто попробуйте - AI очень гибкий!`,
    searchKeywordsPl: ['pytania', 'przykłady', 'zapytania', 'komendy', 'faktury', 'kontrahenci', 'dane', 'wfirma'],
    searchKeywordsEn: ['questions', 'examples', 'queries', 'commands', 'invoices', 'contractors', 'data', 'wfirma'],
    searchKeywordsRu: ['вопросы', 'примеры', 'запросы', 'команды', 'счета', 'контрагенты', 'данные', 'wfirma'],
    order: 1,
    isFeatured: true,
  },
  {
    slug: 'invoices-overview',
    category: 'invoices',
    titlePl: 'Zarządzanie fakturami',
    titleEn: 'Invoice Management',
    titleRu: 'Управление счетами',
    contentPl: `System pozwala na pełne zarządzanie fakturami poprzez integrację z wFirma.

## Typy faktur

- **Faktury sprzedaży** - wystawiane dla klientów
- **Faktury zakupu** - otrzymane od dostawców
- **Faktury korygujące** - korekty do wcześniejszych faktur
- **Faktury proforma** - dokumenty przedpłatowe

## Statusy faktur

- **Wystawiona** - faktura utworzona
- **Wysłana** - faktura wysłana do klienta
- **Opłacona** - płatność otrzymana
- **Przeterminowana** - po terminie płatności
- **Anulowana** - faktura unieważniona

## Co możesz zrobić z AI:

- "Pokaż wszystkie faktury z tego miesiąca"
- "Ile mam nieopłaconych faktur?"
- "Pokaż faktury dla kontrahenta ABC"
- "Jaka jest suma faktur z grudnia?"
- "Które faktury są przeterminowane?"`,
    contentEn: `The system allows full invoice management through wFirma integration.

## Invoice Types

- **Sales invoices** - issued to customers
- **Purchase invoices** - received from suppliers
- **Corrective invoices** - corrections to previous invoices
- **Proforma invoices** - prepayment documents

## Invoice Statuses

- **Issued** - invoice created
- **Sent** - invoice sent to customer
- **Paid** - payment received
- **Overdue** - past payment deadline
- **Cancelled** - invoice voided

## What you can do with AI:

- "Show all invoices from this month"
- "How many unpaid invoices do I have?"
- "Show invoices for contractor ABC"
- "What's the total of invoices from December?"
- "Which invoices are overdue?"`,
    contentRu: `Система позволяет полностью управлять счетами через интеграцию с wFirma.

## Типы счетов

- **Счета продаж** - выставляемые клиентам
- **Счета покупок** - полученные от поставщиков
- **Корректировочные счета** - исправления к предыдущим счетам
- **Проформа-счета** - документы предоплаты

## Статусы счетов

- **Выставлен** - счет создан
- **Отправлен** - счет отправлен клиенту
- **Оплачен** - платеж получен
- **Просрочен** - после срока оплаты
- **Аннулирован** - счет отменен

## Что можно сделать с AI:

- "Покажи все счета за этот месяц"
- "Сколько у меня неоплаченных счетов?"
- "Покажи счета для контрагента ABC"
- "Какая сумма счетов за декабрь?"
- "Какие счета просрочены?"`,
    searchKeywordsPl: ['faktury', 'sprzedaż', 'zakup', 'płatności', 'vat', 'fv'],
    searchKeywordsEn: ['invoices', 'sales', 'purchase', 'payments', 'vat', 'billing'],
    searchKeywordsRu: ['счета', 'продажи', 'покупки', 'платежи', 'ндс', 'фактуры'],
    order: 1,
    isFeatured: true,
  },
  {
    slug: 'contractors-overview',
    category: 'contractors',
    titlePl: 'Zarządzanie kontrahentami',
    titleEn: 'Contractor Management',
    titleRu: 'Управление контрагентами',
    contentPl: `Kontrahenci to firmy i osoby, z którymi prowadzisz współpracę biznesową.

## Dane kontrahenta

- **Nazwa firmy** - pełna nazwa lub imię i nazwisko
- **NIP** - numer identyfikacji podatkowej
- **Adres** - adres siedziby lub zamieszkania
- **Email/Telefon** - dane kontaktowe
- **Numer konta** - do przelewów

## Typy kontrahentów

- **Klienci** - odbiorcy Twoich usług/produktów
- **Dostawcy** - firmy od których kupujesz
- **Partnerzy** - współpracownicy biznesowi

## Co możesz zrobić z AI:

- "Pokaż wszystkich kontrahentów"
- "Znajdź kontrahenta z NIP 1234567890"
- "Jakie faktury wystawiłem dla firmy XYZ?"
- "Dodaj nowego kontrahenta: nazwa ABC, NIP 9876543210"
- "Pokaż dane kontaktowe kontrahenta ABC"
- "Ile mam kontrahentów w bazie?"`,
    contentEn: `Contractors are companies and individuals you do business with.

## Contractor Data

- **Company name** - full name or personal name
- **NIP** - tax identification number
- **Address** - registered or residential address
- **Email/Phone** - contact details
- **Bank account** - for transfers

## Contractor Types

- **Customers** - recipients of your services/products
- **Suppliers** - companies you buy from
- **Partners** - business collaborators

## What you can do with AI:

- "Show all contractors"
- "Find contractor with NIP 1234567890"
- "What invoices did I issue for company XYZ?"
- "Add new contractor: name ABC, NIP 9876543210"
- "Show contact details for contractor ABC"
- "How many contractors do I have?"`,
    contentRu: `Контрагенты - это компании и лица, с которыми вы ведете бизнес.

## Данные контрагента

- **Название компании** - полное название или ФИО
- **NIP** - налоговый идентификационный номер
- **Адрес** - юридический или фактический адрес
- **Email/Телефон** - контактные данные
- **Номер счета** - для переводов

## Типы контрагентов

- **Клиенты** - получатели ваших услуг/товаров
- **Поставщики** - компании, у которых покупаете
- **Партнеры** - деловые партнеры

## Что можно сделать с AI:

- "Покажи всех контрагентов"
- "Найди контрагента с NIP 1234567890"
- "Какие счета я выставил для компании XYZ?"
- "Добавь нового контрагента: название ABC, NIP 9876543210"
- "Покажи контактные данные контрагента ABC"
- "Сколько у меня контрагентов?"`,
    searchKeywordsPl: ['kontrahenci', 'klienci', 'dostawcy', 'nip', 'firma', 'dane'],
    searchKeywordsEn: ['contractors', 'customers', 'suppliers', 'nip', 'company', 'data'],
    searchKeywordsRu: ['контрагенты', 'клиенты', 'поставщики', 'нип', 'компания', 'данные'],
    order: 1,
    isFeatured: true,
  },
  {
    slug: 'taxes-overview',
    category: 'taxes',
    titlePl: 'Podatki w Polsce',
    titleEn: 'Taxes in Poland',
    titleRu: 'Налоги в Польше',
    contentPl: `Przegląd głównych podatków dla firm IT w Polsce.

## VAT (Podatek od towarów i usług)

- **Stawka podstawowa**: 23%
- **Stawka obniżona**: 8%, 5%, 0%
- **Terminy**: Rozliczenie miesięczne do 25. dnia następnego miesiąca
- **JPK_VAT**: Obowiązkowy plik kontrolny

## PIT (Podatek dochodowy od osób fizycznych)

- **Skala podatkowa**: 12% do 120 000 PLN, 32% powyżej
- **Podatek liniowy**: 19% (dla działalności gospodarczej)
- **Ryczałt**: 12% dla usług IT
- **Zaliczki**: Miesięczne lub kwartalne

## CIT (Podatek dochodowy od osób prawnych)

- **Stawka podstawowa**: 19%
- **Stawka preferencyjna**: 9% (dla małych podatników)

## ZUS (Składki społeczne)

- **Preferencyjny ZUS**: Pierwsze 24 miesiące działalności
- **Mały ZUS Plus**: Dla przychodów do 120 000 PLN/rok
- **Pełny ZUS**: Około 1600 PLN/miesiąc (2025)

## Co możesz zapytać AI:

- "Ile wynosi VAT od kwoty 1000 PLN?"
- "Jakie są terminy płatności ZUS?"
- "Oblicz podatek liniowy od 50 000 PLN"
- "Kiedy muszę złożyć JPK_VAT?"`,
    contentEn: `Overview of main taxes for IT companies in Poland.

## VAT (Value Added Tax)

- **Standard rate**: 23%
- **Reduced rates**: 8%, 5%, 0%
- **Deadlines**: Monthly settlement by 25th of next month
- **JPK_VAT**: Mandatory control file

## PIT (Personal Income Tax)

- **Tax scale**: 12% up to 120,000 PLN, 32% above
- **Flat tax**: 19% (for business activity)
- **Lump sum**: 12% for IT services
- **Advances**: Monthly or quarterly

## CIT (Corporate Income Tax)

- **Standard rate**: 19%
- **Preferential rate**: 9% (for small taxpayers)

## ZUS (Social Security)

- **Preferential ZUS**: First 24 months of business
- **Small ZUS Plus**: For income up to 120,000 PLN/year
- **Full ZUS**: About 1,600 PLN/month (2025)

## What you can ask AI:

- "How much is VAT on 1000 PLN?"
- "What are ZUS payment deadlines?"
- "Calculate flat tax on 50,000 PLN"
- "When do I need to submit JPK_VAT?"`,
    contentRu: `Обзор основных налогов для IT-компаний в Польше.

## VAT (НДС)

- **Базовая ставка**: 23%
- **Пониженные ставки**: 8%, 5%, 0%
- **Сроки**: Ежемесячный расчет до 25-го числа следующего месяца
- **JPK_VAT**: Обязательный контрольный файл

## PIT (Подоходный налог)

- **Налоговая шкала**: 12% до 120 000 PLN, 32% выше
- **Линейный налог**: 19% (для бизнеса)
- **Рычалт**: 12% для IT-услуг
- **Авансы**: Ежемесячно или ежеквартально

## CIT (Налог на прибыль)

- **Базовая ставка**: 19%
- **Льготная ставка**: 9% (для малых налогоплательщиков)

## ZUS (Социальное страхование)

- **Льготный ZUS**: Первые 24 месяца бизнеса
- **Малый ZUS Plus**: Для дохода до 120 000 PLN/год
- **Полный ZUS**: Около 1600 PLN/месяц (2025)

## Что можно спросить у AI:

- "Сколько НДС от 1000 PLN?"
- "Какие сроки оплаты ZUS?"
- "Рассчитай линейный налог от 50 000 PLN"
- "Когда нужно подать JPK_VAT?"`,
    searchKeywordsPl: ['podatki', 'vat', 'pit', 'cit', 'zus', 'jpk', 'stawki', 'terminy'],
    searchKeywordsEn: ['taxes', 'vat', 'pit', 'cit', 'zus', 'jpk', 'rates', 'deadlines'],
    searchKeywordsRu: ['налоги', 'ндс', 'пит', 'цит', 'зус', 'жпк', 'ставки', 'сроки'],
    order: 1,
    isFeatured: true,
  },
  {
    slug: 'settings-overview',
    category: 'settings',
    titlePl: 'Ustawienia konta',
    titleEn: 'Account Settings',
    titleRu: 'Настройки аккаунта',
    contentPl: `Zarządzaj swoim kontem i integracjami.

## Profil użytkownika

Kliknij **ikonę użytkownika** w prawym górnym rogu, aby:

- Edytować imię i nazwisko
- Zmienić język interfejsu (polski, angielski, rosyjski)
- Wylogować się

## Konfiguracja wFirma

Aby połączyć konto wFirma:

1. Kliknij **ikonę użytkownika** w prawym górnym rogu
2. W oknie profilu kliknij przycisk **API Keys** / **Klucze API**
3. W sekcji wFirma wprowadź:
   - **Access Key** - klucz dostępu
   - **Secret Key** - klucz tajny
   - **Company ID** - ID firmy
4. Kliknij **Zapisz**

**Gdzie znaleźć klucze wFirma:**
- Zaloguj się na wFirma.pl
- Przejdź do Ustawienia → API
- Wygeneruj nowe klucze dostępu

## Konfiguracja AI (opcjonalne)

Możesz użyć własnego klucza API dla AI:

1. W oknie **API Keys** wybierz sekcję LLM
2. Wybierz dostawcę: **OpenAI** lub **Anthropic**
3. Wprowadź swój klucz API
4. Kliknij **Zapisz**`,
    contentEn: `Manage your account and integrations.

## User Profile

Click the **user icon** in the top right corner to:

- Edit your name
- Change interface language (Polish, English, Russian)
- Log out

## wFirma Configuration

To connect your wFirma account:

1. Click the **user icon** in the top right corner
2. In the profile window, click **API Keys** button
3. In the wFirma section enter:
   - **Access Key** - access key
   - **Secret Key** - secret key
   - **Company ID** - company ID
4. Click **Save**

**Where to find wFirma keys:**
- Log in to wFirma.pl
- Go to Settings → API
- Generate new access keys

## AI Configuration (optional)

You can use your own AI API key:

1. In the **API Keys** window, select LLM section
2. Choose provider: **OpenAI** or **Anthropic**
3. Enter your API key
4. Click **Save**`,
    contentRu: `Управляйте аккаунтом и интеграциями.

## Профиль пользователя

Нажмите на **иконку пользователя** в правом верхнем углу, чтобы:

- Редактировать имя
- Сменить язык интерфейса (польский, английский, русский)
- Выйти из системы

## Настройка wFirma

Чтобы подключить аккаунт wFirma:

1. Нажмите на **иконку пользователя** в правом верхнем углу
2. В окне профиля нажмите кнопку **API Keys** / **API ключи**
3. В секции wFirma введите:
   - **Access Key** - ключ доступа
   - **Secret Key** - секретный ключ
   - **Company ID** - ID компании
4. Нажмите **Сохранить**

**Где найти ключи wFirma:**
- Войдите на wFirma.pl
- Перейдите в Настройки → API
- Сгенерируйте новые ключи доступа

## Настройка AI (опционально)

Вы можете использовать собственный API ключ для AI:

1. В окне **API Keys** выберите секцию LLM
2. Выберите провайдера: **OpenAI** или **Anthropic**
3. Введите ваш API ключ
4. Нажмите **Сохранить**`,
    searchKeywordsPl: ['ustawienia', 'profil', 'konto', 'integracja', 'wfirma', 'hasło', 'bezpieczeństwo'],
    searchKeywordsEn: ['settings', 'profile', 'account', 'integration', 'wfirma', 'password', 'security'],
    searchKeywordsRu: ['настройки', 'профиль', 'аккаунт', 'интеграция', 'wfirma', 'пароль', 'безопасность'],
    order: 1,
    isFeatured: true,
  },
  {
    slug: 'ai-chat-text-to-speech',
    category: 'aiChat',
    titlePl: 'Odczyt głosowy (Text-to-Speech)',
    titleEn: 'Voice Readout (Text-to-Speech)',
    titleRu: 'Голосовое воспроизведение (Text-to-Speech)',
    contentPl: `Funkcja odczytu głosowego pozwala słuchać odpowiedzi AI zamiast je czytać.

## Jak włączyć

1. Kliknij **ikonę głośnika** w pasku narzędzi czatu
2. W ustawieniach włącz **"Odczyt głosowy"**

## Opcje

- **Automatyczne czytanie** - nowe odpowiedzi AI są automatycznie czytane na głos
- **Szybkość** - regulacja prędkości odczytu (wolno/normalnie/szybko)

## Głos AI (OpenAI TTS)

Jeśli masz skonfigurowany klucz OpenAI, możesz włączyć **"Użyj głosu AI"** dla wyższej jakości:

- **Nova** - kobiecy, naturalny głos
- **Alloy** - neutralny głos
- **Echo** - męski głos
- **Fable** - brytyjski akcent
- **Onyx** - niski głos
- **Shimmer** - delikatny głos

Głos AI wymaga klucza OpenAI w ustawieniach lub planu Pro.

## Wskazówki

- Kliknij **ikonę głośnika** przy wiadomości, aby ją przeczytać
- Kliknij ponownie, aby zatrzymać odczyt
- Ikona pulsuje podczas odczytu`,
    contentEn: `Voice readout feature allows you to listen to AI responses instead of reading them.

## How to enable

1. Click the **speaker icon** in the chat toolbar
2. In settings, enable **"Voice readout"**

## Options

- **Auto-read new messages** - new AI responses are automatically read aloud
- **Speed** - adjust reading speed (slow/normal/fast)

## AI Voice (OpenAI TTS)

If you have an OpenAI key configured, you can enable **"Use AI voice"** for higher quality:

- **Nova** - female, natural voice
- **Alloy** - neutral voice
- **Echo** - male voice
- **Fable** - British accent
- **Onyx** - deep voice
- **Shimmer** - soft voice

AI voice requires OpenAI key in settings or Pro plan.

## Tips

- Click the **speaker icon** next to a message to read it
- Click again to stop reading
- Icon pulses during playback`,
    contentRu: `Функция голосового воспроизведения позволяет слушать ответы AI вместо чтения.

## Как включить

1. Нажмите **иконку динамика** в панели инструментов чата
2. В настройках включите **"Голосовое воспроизведение"**

## Опции

- **Автоматическое чтение** - новые ответы AI автоматически читаются вслух
- **Скорость** - регулировка скорости чтения (медленно/нормально/быстро)

## Голос AI (OpenAI TTS)

Если у вас настроен ключ OpenAI, можете включить **"Использовать голос AI"** для более высокого качества:

- **Nova** - женский, естественный голос
- **Alloy** - нейтральный голос
- **Echo** - мужской голос
- **Fable** - британский акцент
- **Onyx** - низкий голос
- **Shimmer** - мягкий голос

Голос AI требует ключ OpenAI в настройках или план Pro.

## Советы

- Нажмите **иконку динамика** рядом с сообщением, чтобы его прочитать
- Нажмите снова, чтобы остановить чтение
- Иконка пульсирует во время воспроизведения`,
    searchKeywordsPl: ['głos', 'czytanie', 'tts', 'mowa', 'audio', 'dźwięk', 'słuchaj', 'nova', 'openai'],
    searchKeywordsEn: ['voice', 'speech', 'tts', 'audio', 'sound', 'listen', 'readout', 'nova', 'openai'],
    searchKeywordsRu: ['голос', 'речь', 'ттс', 'аудио', 'звук', 'слушать', 'озвучка', 'nova', 'openai'],
    order: 2,
    isFeatured: false,
  },
  {
    slug: 'dashboard-overview',
    category: 'dashboard',
    titlePl: 'Panel KPI - przegląd wskaźników',
    titleEn: 'KPI Dashboard Overview',
    titleRu: 'Обзор KPI-панели',
    contentPl: `Panel KPI wyświetla najważniejsze wskaźniki finansowe i operacyjne Twojej firmy w jednym miejscu.

## Co pokazuje panel?

### Podsumowanie finansowe
- **Przychody, koszty i zysk** za bieżący rok
- **Zapłacony VAT, PIT i ZUS**
- **Wykres miesięczny** przychodów i kosztów

### Faktury
- Liczba i wartość faktur **nieopłaconych**
- Liczba i wartość faktur **przeterminowanych**

### Terminy podatkowe i ZUS
- Najbliższe terminy płatności z kodowaniem kolorami:
  - Czerwony — po terminie
  - Pomarańczowy — do 3 dni
  - Żółty — do 7 dni
  - Zielony — powyżej 7 dni

### Pracownicy (HR)
- Liczba aktywnych pracowników
- Aktywne umowy według typu
- Łączny koszt pracodawcy za ostatni okres

### KSeF
- Faktury wysłane, zaakceptowane, odrzucone i oczekujące
- Wskaźnik akceptacji (%)

## Źródła danych

Panel agreguje dane z wFirma, modułu HR i KSeF. Sekcje bez skonfigurowanej integracji wyświetlają "Brak danych".

## Odświeżanie

Dane są automatycznie odświeżane co 10 minut. Możesz też odświeżyć ręcznie klikając ikonę odświeżania.`,
    contentEn: `The KPI Dashboard displays the most important financial and operational metrics for your company in one place.

## What does the dashboard show?

### Financial Summary
- **Revenue, expenses, and profit** for the current year
- **VAT, PIT, and ZUS paid**
- **Monthly chart** of revenue and expenses

### Invoices
- Count and total of **unpaid** invoices
- Count and total of **overdue** invoices

### Tax and ZUS Deadlines
- Upcoming payment deadlines with color coding:
  - Red — past due
  - Orange — within 3 days
  - Yellow — within 7 days
  - Green — more than 7 days away

### Employees (HR)
- Number of active employees
- Active contracts by type
- Total employer cost for the last payroll period

### KSeF
- Invoices sent, accepted, rejected, and pending
- Acceptance rate (%)

## Data Sources

The dashboard aggregates data from wFirma, the HR module, and KSeF. Sections without a configured integration show "No data".

## Refresh

Data is automatically refreshed every 10 minutes. You can also refresh manually by clicking the refresh icon.`,
    contentRu: `KPI-панель отображает наиболее важные финансовые и операционные показатели вашей компании в одном месте.

## Что показывает панель?

### Финансовая сводка
- **Доходы, расходы и прибыль** за текущий год
- **Уплаченные VAT, PIT и ZUS**
- **Помесячный график** доходов и расходов

### Счета
- Количество и сумма **неоплаченных** счетов
- Количество и сумма **просроченных** счетов

### Налоговые сроки и ZUS
- Ближайшие сроки платежей с цветовой кодировкой:
  - Красный — просрочено
  - Оранжевый — в течение 3 дней
  - Жёлтый — в течение 7 дней
  - Зелёный — более 7 дней

### Сотрудники (HR)
- Количество активных сотрудников
- Активные договоры по типу
- Общие затраты работодателя за последний период

### KSeF
- Счета отправленные, принятые, отклонённые и ожидающие
- Процент принятия (%)

## Источники данных

Панель агрегирует данные из wFirma, модуля HR и KSeF. Секции без настроенной интеграции отображают "Нет данных".

## Обновление

Данные автоматически обновляются каждые 10 минут. Можно также обновить вручную, нажав значок обновления.`,
    searchKeywordsPl: ['dashboard', 'panel', 'kpi', 'wskaźniki', 'podsumowanie', 'przychody', 'koszty'],
    searchKeywordsEn: ['dashboard', 'panel', 'kpi', 'metrics', 'summary', 'revenue', 'expenses'],
    searchKeywordsRu: ['дашборд', 'панель', 'кпи', 'показатели', 'сводка', 'доходы', 'расходы'],
    order: 1,
    isFeatured: true,
  },
];

export async function seedHelpTopicsIfEmpty(): Promise<void> {
  try {
    const existingCount = await prisma.helpTopic.count();

    logger.info(`Syncing help topics (existing: ${existingCount}, defined: ${helpTopics.length})...`);

    let created = 0;
    let updated = 0;

    for (const topic of helpTopics) {
      const existing = await prisma.helpTopic.findUnique({
        where: { slug: topic.slug },
      });

      await prisma.helpTopic.upsert({
        where: { slug: topic.slug },
        update: topic,
        create: topic,
      });

      if (existing) {
        updated++;
      } else {
        created++;
      }
    }

    if (created > 0 || updated > 0) {
      logger.info(`Help topics synced: ${created} created, ${updated} updated`);
    } else {
      logger.info('Help topics already up to date');
    }
  } catch (error) {
    logger.error('Failed to seed help topics:', error);
  }
}
