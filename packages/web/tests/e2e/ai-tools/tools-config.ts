/**
 * AI Tools Test Configuration
 * Defines all 44 tools with queries in 3 languages (EN, PL, RU)
 */

export type Language = 'en' | 'pl' | 'ru';

export interface ToolTestQuery {
  tool: string;
  en: string;
  pl: string;
  ru: string;
  expectedKeywords: {
    en: RegExp;
    pl: RegExp;
    ru: RegExp;
  };
}

// Contractor Tools (4 tools)
export const contractorTools: ToolTestQuery[] = [
  {
    tool: 'get_contractors',
    en: 'Show my contractors',
    pl: 'Pokaż moich kontrahentów',
    ru: 'Покажи моих контрагентов',
    expectedKeywords: {
      en: /contractor|client|customer|no.*found|list/i,
      pl: /kontrahent|klient|nie.*znaleziono|lista/i,
      ru: /контрагент|клиент|не.*найдено|список/i,
    },
  },
  {
    tool: 'create_contractor',
    en: 'Create a new contractor named Test Company with NIP 1234567890',
    pl: 'Utwórz nowego kontrahenta Test Company z NIP 1234567890',
    ru: 'Создай нового контрагента Test Company с NIP 1234567890',
    expectedKeywords: {
      en: /created|contractor|success|error/i,
      pl: /utworzono|kontrahent|sukces|błąd/i,
      ru: /создан|контрагент|успешно|ошибка/i,
    },
  },
  {
    tool: 'update_contractor',
    en: 'Update contractor email for Test Company',
    pl: 'Zmień email kontrahenta Test Company',
    ru: 'Обнови email контрагента Test Company',
    expectedKeywords: {
      en: /updated|contractor|email|not.*found/i,
      pl: /zaktualizowano|kontrahent|email|nie.*znaleziono/i,
      ru: /обновлен|контрагент|email|не.*найден/i,
    },
  },
  {
    tool: 'delete_contractor',
    en: 'Delete contractor Test Company',
    pl: 'Usuń kontrahenta Test Company',
    ru: 'Удали контрагента Test Company',
    expectedKeywords: {
      en: /deleted|removed|contractor|not.*found|confirm/i,
      pl: /usunięto|kontrahent|nie.*znaleziono|potwierdź/i,
      ru: /удален|контрагент|не.*найден|подтверд/i,
    },
  },
];

// Invoice Tools (10 tools)
export const invoiceTools: ToolTestQuery[] = [
  {
    tool: 'get_invoices',
    en: 'Show all invoices for 2024',
    pl: 'Pokaż wszystkie faktury za 2024 rok',
    ru: 'Покажи все счета за 2024 год',
    expectedKeywords: {
      en: /invoice|FV|no.*found|list/i,
      pl: /faktura|FV|nie.*znaleziono|lista/i,
      ru: /счёт|фактура|не.*найдено|список/i,
    },
  },
  {
    tool: 'get_invoice_details',
    en: 'Show details of invoice FV/1/2024',
    pl: 'Pokaż szczegóły faktury FV/1/2024',
    ru: 'Покажи детали счёта FV/1/2024',
    expectedKeywords: {
      en: /invoice|details|amount|not.*found/i,
      pl: /faktura|szczegóły|kwota|nie.*znaleziono/i,
      ru: /счёт|детали|сумма|не.*найден/i,
    },
  },
  {
    tool: 'create_invoice',
    en: 'Create an invoice for Test Company for consulting services, 1000 PLN',
    pl: 'Wystaw fakturę dla Test Company za usługi konsultingowe, 1000 PLN',
    ru: 'Выстави счёт для Test Company за консалтинговые услуги, 1000 PLN',
    expectedKeywords: {
      en: /created|invoice|FV|error/i,
      pl: /utworzono|faktura|FV|błąd/i,
      ru: /создан|счёт|FV|ошибка/i,
    },
  },
  {
    tool: 'update_invoice',
    en: 'Update the due date of invoice FV/1/2024',
    pl: 'Zmień termin płatności faktury FV/1/2024',
    ru: 'Измени срок оплаты счёта FV/1/2024',
    expectedKeywords: {
      en: /updated|invoice|due.*date|not.*found/i,
      pl: /zaktualizowano|faktura|termin|nie.*znaleziono/i,
      ru: /обновлен|счёт|срок|не.*найден/i,
    },
  },
  {
    tool: 'delete_invoice',
    en: 'Delete invoice FV/1/2024',
    pl: 'Usuń fakturę FV/1/2024',
    ru: 'Удали счёт FV/1/2024',
    expectedKeywords: {
      en: /deleted|invoice|not.*found|cannot/i,
      pl: /usunięto|faktura|nie.*znaleziono|nie.*można/i,
      ru: /удален|счёт|не.*найден|невозможно/i,
    },
  },
  {
    tool: 'send_invoice',
    en: 'Send invoice FV/1/2024 to client via email',
    pl: 'Wyślij fakturę FV/1/2024 do klienta emailem',
    ru: 'Отправь счёт FV/1/2024 клиенту по email',
    expectedKeywords: {
      en: /sent|email|invoice|not.*found/i,
      pl: /wysłano|email|faktura|nie.*znaleziono/i,
      ru: /отправлен|email|счёт|не.*найден/i,
    },
  },
  {
    tool: 'download_invoice',
    en: 'Download invoice FV/1/2024 as PDF',
    pl: 'Pobierz fakturę FV/1/2024 jako PDF',
    ru: 'Скачай счёт FV/1/2024 в PDF',
    expectedKeywords: {
      en: /download|pdf|link|not.*found/i,
      pl: /pobierz|pdf|link|nie.*znaleziono/i,
      ru: /скачать|pdf|ссылка|не.*найден/i,
    },
  },
  {
    tool: 'add_invoice_note',
    en: 'Add a note to invoice FV/1/2024: Important payment deadline',
    pl: 'Dodaj notatkę do faktury FV/1/2024: Ważny termin płatności',
    ru: 'Добавь заметку к счёту FV/1/2024: Важный срок оплаты',
    expectedKeywords: {
      en: /added|note|invoice|error/i,
      pl: /dodano|notatka|faktura|błąd/i,
      ru: /добавлена|заметка|счёт|ошибка/i,
    },
  },
  {
    tool: 'get_invoice_notes',
    en: 'Show all notes for invoice FV/1/2024',
    pl: 'Pokaż wszystkie notatki do faktury FV/1/2024',
    ru: 'Покажи все заметки к счёту FV/1/2024',
    expectedKeywords: {
      en: /notes|invoice|no.*notes|list/i,
      pl: /notatki|faktura|brak.*notatek|lista/i,
      ru: /заметки|счёт|нет.*заметок|список/i,
    },
  },
  {
    tool: 'delete_invoice_note',
    en: 'Delete the first note from invoice FV/1/2024',
    pl: 'Usuń pierwszą notatkę z faktury FV/1/2024',
    ru: 'Удали первую заметку со счёта FV/1/2024',
    expectedKeywords: {
      en: /deleted|note|not.*found/i,
      pl: /usunięto|notatka|nie.*znaleziono/i,
      ru: /удалена|заметка|не.*найдена/i,
    },
  },
];

// Company Tools (3 tools)
export const companyTools: ToolTestQuery[] = [
  {
    tool: 'get_company_info',
    en: 'Show my company information',
    pl: 'Pokaż dane mojej firmy',
    ru: 'Покажи данные моей компании',
    expectedKeywords: {
      en: /company|name|nip|address|info/i,
      pl: /firma|nazwa|nip|adres|dane/i,
      ru: /компания|название|nip|адрес|данные/i,
    },
  },
  {
    tool: 'get_company_accounts',
    en: 'Show company bank accounts',
    pl: 'Pokaż konta bankowe firmy',
    ru: 'Покажи банковские счета компании',
    expectedKeywords: {
      en: /bank|account|iban|no.*accounts/i,
      pl: /bank|konto|iban|brak.*kont/i,
      ru: /банк|счёт|iban|нет.*счетов/i,
    },
  },
  {
    tool: 'get_company_addresses',
    en: 'Show company addresses',
    pl: 'Pokaż adresy firmy',
    ru: 'Покажи адреса компании',
    expectedKeywords: {
      en: /address|street|city|postal/i,
      pl: /adres|ulica|miasto|kod/i,
      ru: /адрес|улица|город|индекс/i,
    },
  },
];

// Document Tools (4 tools)
export const documentTools: ToolTestQuery[] = [
  {
    tool: 'get_documents',
    en: 'Show my documents',
    pl: 'Pokaż moje dokumenty',
    ru: 'Покажи мои документы',
    expectedKeywords: {
      en: /document|file|no.*documents|list/i,
      pl: /dokument|plik|brak.*dokumentów|lista/i,
      ru: /документ|файл|нет.*документов|список/i,
    },
  },
  {
    tool: 'get_document_details',
    en: 'Show details of document ID 123',
    pl: 'Pokaż szczegóły dokumentu ID 123',
    ru: 'Покажи детали документа ID 123',
    expectedKeywords: {
      en: /document|details|not.*found/i,
      pl: /dokument|szczegóły|nie.*znaleziono/i,
      ru: /документ|детали|не.*найден/i,
    },
  },
  {
    tool: 'download_document',
    en: 'Download document ID 123',
    pl: 'Pobierz dokument ID 123',
    ru: 'Скачай документ ID 123',
    expectedKeywords: {
      en: /download|link|document|not.*found/i,
      pl: /pobierz|link|dokument|nie.*znaleziono/i,
      ru: /скачать|ссылка|документ|не.*найден/i,
    },
  },
  {
    tool: 'delete_document',
    en: 'Delete document ID 123',
    pl: 'Usuń dokument ID 123',
    ru: 'Удали документ ID 123',
    expectedKeywords: {
      en: /deleted|document|not.*found/i,
      pl: /usunięto|dokument|nie.*znaleziono/i,
      ru: /удален|документ|не.*найден/i,
    },
  },
];

// Payment Tools (5 tools)
export const paymentTools: ToolTestQuery[] = [
  {
    tool: 'get_payments',
    en: 'Show payments for January 2024',
    pl: 'Pokaż płatności za styczeń 2024',
    ru: 'Покажи платежи за январь 2024',
    expectedKeywords: {
      en: /payment|amount|no.*payments|list/i,
      pl: /płatność|kwota|brak.*płatności|lista/i,
      ru: /платёж|сумма|нет.*платежей|список/i,
    },
  },
  {
    tool: 'get_payment_details',
    en: 'Show details of payment ID 456',
    pl: 'Pokaż szczegóły płatności ID 456',
    ru: 'Покажи детали платежа ID 456',
    expectedKeywords: {
      en: /payment|details|amount|not.*found/i,
      pl: /płatność|szczegóły|kwota|nie.*znaleziono/i,
      ru: /платёж|детали|сумма|не.*найден/i,
    },
  },
  {
    tool: 'add_payment',
    en: 'Add a payment of 1000 PLN for invoice FV/1/2024',
    pl: 'Dodaj płatność 1000 PLN do faktury FV/1/2024',
    ru: 'Добавь платёж 1000 PLN к счёту FV/1/2024',
    expectedKeywords: {
      en: /added|payment|success|error/i,
      pl: /dodano|płatność|sukces|błąd/i,
      ru: /добавлен|платёж|успешно|ошибка/i,
    },
  },
  {
    tool: 'update_payment',
    en: 'Update payment amount for ID 456',
    pl: 'Zmień kwotę płatności ID 456',
    ru: 'Измени сумму платежа ID 456',
    expectedKeywords: {
      en: /updated|payment|not.*found/i,
      pl: /zaktualizowano|płatność|nie.*znaleziono/i,
      ru: /обновлен|платёж|не.*найден/i,
    },
  },
  {
    tool: 'delete_payment',
    en: 'Delete payment ID 456',
    pl: 'Usuń płatność ID 456',
    ru: 'Удали платёж ID 456',
    expectedKeywords: {
      en: /deleted|payment|not.*found/i,
      pl: /usunięto|płatność|nie.*znaleziono/i,
      ru: /удален|платёж|не.*найден/i,
    },
  },
];

// Expense Tools (2 tools)
export const expenseTools: ToolTestQuery[] = [
  {
    tool: 'get_expenses',
    en: 'Show expenses for 2024',
    pl: 'Pokaż wydatki za 2024 rok',
    ru: 'Покажи расходы за 2024 год',
    expectedKeywords: {
      en: /expense|cost|no.*expenses|list/i,
      pl: /wydatek|koszt|brak.*wydatków|lista/i,
      ru: /расход|затрат|нет.*расходов|список/i,
    },
  },
  {
    tool: 'get_expense_details',
    en: 'Show details of expense ID 789',
    pl: 'Pokaż szczegóły wydatku ID 789',
    ru: 'Покажи детали расхода ID 789',
    expectedKeywords: {
      en: /expense|details|amount|not.*found/i,
      pl: /wydatek|szczegóły|kwota|nie.*znaleziono/i,
      ru: /расход|детали|сумма|не.*найден/i,
    },
  },
];

// Financial Tools (1 tool)
export const financialTools: ToolTestQuery[] = [
  {
    tool: 'get_financial_summary',
    en: 'Show financial summary for 2024',
    pl: 'Pokaż podsumowanie finansowe za 2024',
    ru: 'Покажи финансовую сводку за 2024',
    expectedKeywords: {
      en: /revenue|income|expense|profit|summary/i,
      pl: /przychód|dochód|wydatek|zysk|podsumowanie/i,
      ru: /доход|выручка|расход|прибыль|сводка/i,
    },
  },
];

// Declaration Tools (2 tools)
export const declarationTools: ToolTestQuery[] = [
  {
    tool: 'get_jpk_vat_declaration',
    en: 'Show JPK VAT declaration for January 2024',
    pl: 'Pokaż deklarację JPK VAT za styczeń 2024',
    ru: 'Покажи декларацию JPK VAT за январь 2024',
    expectedKeywords: {
      en: /jpk|vat|declaration|not.*found/i,
      pl: /jpk|vat|deklaracja|nie.*znaleziono/i,
      ru: /jpk|ндс|декларация|не.*найден/i,
    },
  },
  {
    tool: 'get_pit_declaration',
    en: 'Show PIT declaration for 2024',
    pl: 'Pokaż deklarację PIT za 2024',
    ru: 'Покажи декларацию PIT за 2024',
    expectedKeywords: {
      en: /pit|tax|declaration|not.*found/i,
      pl: /pit|podatek|deklaracja|nie.*znaleziono/i,
      ru: /pit|налог|декларация|не.*найден/i,
    },
  },
];

// Ledger Tools (4 tools)
export const ledgerTools: ToolTestQuery[] = [
  {
    tool: 'get_fiscal_years',
    en: 'Show all fiscal years',
    pl: 'Pokaż wszystkie lata obrachunkowe',
    ru: 'Покажи все финансовые годы',
    expectedKeywords: {
      en: /fiscal|year|2024|2023|no.*years/i,
      pl: /rok.*obrachunkow|2024|2023|brak.*lat/i,
      ru: /финансов.*год|2024|2023|нет.*годов/i,
    },
  },
  {
    tool: 'get_fiscal_year_details',
    en: 'Show fiscal year 2024 details',
    pl: 'Pokaż szczegóły roku obrachunkowego 2024',
    ru: 'Покажи детали финансового года 2024',
    expectedKeywords: {
      en: /fiscal|year|details|not.*found/i,
      pl: /rok.*obrachunkow|szczegóły|nie.*znaleziono/i,
      ru: /финансов.*год|детали|не.*найден/i,
    },
  },
  {
    tool: 'get_accounting_schemas',
    en: 'Show all accounting schemas',
    pl: 'Pokaż schematy księgowe',
    ru: 'Покажи схемы учёта',
    expectedKeywords: {
      en: /schema|accounting|chart|no.*schemas/i,
      pl: /schemat|księgow|plan.*kont|brak.*schematów/i,
      ru: /схем|учёт|план.*счетов|нет.*схем/i,
    },
  },
  {
    tool: 'get_accounting_schema_details',
    en: 'Show accounting schema details',
    pl: 'Pokaż szczegóły schematu księgowego',
    ru: 'Покажи детали схемы учёта',
    expectedKeywords: {
      en: /schema|details|account|not.*found/i,
      pl: /schemat|szczegóły|konto|nie.*znaleziono/i,
      ru: /схем|детали|счёт|не.*найден/i,
    },
  },
];

// Term Tools (8 tools)
export const termTools: ToolTestQuery[] = [
  {
    tool: 'get_terms',
    en: 'Show all payment terms',
    pl: 'Pokaż wszystkie terminy płatności',
    ru: 'Покажи все сроки оплаты',
    expectedKeywords: {
      en: /term|deadline|payment|no.*terms/i,
      pl: /termin|płatność|brak.*terminów/i,
      ru: /срок|платёж|нет.*сроков/i,
    },
  },
  {
    tool: 'get_term_details',
    en: 'Show term details',
    pl: 'Pokaż szczegóły terminu',
    ru: 'Покажи детали срока',
    expectedKeywords: {
      en: /term|details|date|not.*found/i,
      pl: /termin|szczegóły|data|nie.*znaleziono/i,
      ru: /срок|детали|дата|не.*найден/i,
    },
  },
  {
    tool: 'add_term',
    en: 'Add a new payment term for next week',
    pl: 'Dodaj nowy termin płatności na przyszły tydzień',
    ru: 'Добавь новый срок оплаты на следующую неделю',
    expectedKeywords: {
      en: /added|term|success|error/i,
      pl: /dodano|termin|sukces|błąd/i,
      ru: /добавлен|срок|успешно|ошибка/i,
    },
  },
  {
    tool: 'update_term',
    en: 'Update payment term date',
    pl: 'Zmień datę terminu płatności',
    ru: 'Обнови дату срока оплаты',
    expectedKeywords: {
      en: /updated|term|not.*found/i,
      pl: /zaktualizowano|termin|nie.*znaleziono/i,
      ru: /обновлен|срок|не.*найден/i,
    },
  },
  {
    tool: 'delete_term',
    en: 'Delete payment term',
    pl: 'Usuń termin płatności',
    ru: 'Удали срок оплаты',
    expectedKeywords: {
      en: /deleted|term|not.*found/i,
      pl: /usunięto|termin|nie.*znaleziono/i,
      ru: /удален|срок|не.*найден/i,
    },
  },
  {
    tool: 'get_term_groups',
    en: 'Show all term groups',
    pl: 'Pokaż grupy terminów',
    ru: 'Покажи группы сроков',
    expectedKeywords: {
      en: /group|term|no.*groups/i,
      pl: /grupa|termin|brak.*grup/i,
      ru: /группа|срок|нет.*групп/i,
    },
  },
  {
    tool: 'add_term_group',
    en: 'Add a new term group called "Q1 Deadlines"',
    pl: 'Dodaj nową grupę terminów "Terminy Q1"',
    ru: 'Добавь новую группу сроков "Сроки Q1"',
    expectedKeywords: {
      en: /added|group|success|error/i,
      pl: /dodano|grupa|sukces|błąd/i,
      ru: /добавлена|группа|успешно|ошибка/i,
    },
  },
  {
    tool: 'delete_term_group',
    en: 'Delete term group',
    pl: 'Usuń grupę terminów',
    ru: 'Удали группу сроков',
    expectedKeywords: {
      en: /deleted|group|not.*found/i,
      pl: /usunięto|grupa|nie.*znaleziono/i,
      ru: /удалена|группа|не.*найдена/i,
    },
  },
];

// User Tools (3 tools)
export const userTools: ToolTestQuery[] = [
  {
    tool: 'get_users',
    en: 'Show company users',
    pl: 'Pokaż użytkowników firmy',
    ru: 'Покажи пользователей компании',
    expectedKeywords: {
      en: /user|email|name|no.*users/i,
      pl: /użytkownik|email|imię|brak.*użytkowników/i,
      ru: /пользователь|email|имя|нет.*пользователей/i,
    },
  },
  {
    tool: 'get_user_companies',
    en: 'Show user company relationships',
    pl: 'Pokaż powiązania użytkownik-firma',
    ru: 'Покажи связи пользователь-компания',
    expectedKeywords: {
      en: /user|company|role|permission/i,
      pl: /użytkownik|firma|rola|uprawnienia/i,
      ru: /пользователь|компания|роль|права/i,
    },
  },
  {
    tool: 'get_user_company_by_id',
    en: 'Show user-company relationship details',
    pl: 'Pokaż szczegóły powiązania użytkownik-firma',
    ru: 'Покажи детали связи пользователь-компания',
    expectedKeywords: {
      en: /user|company|details|not.*found/i,
      pl: /użytkownik|firma|szczegóły|nie.*znaleziono/i,
      ru: /пользователь|компания|детали|не.*найден/i,
    },
  },
];

// Vehicle Tools (4 tools)
export const vehicleTools: ToolTestQuery[] = [
  {
    tool: 'get_vehicles',
    en: 'Show company vehicles',
    pl: 'Pokaż pojazdy firmy',
    ru: 'Покажи транспорт компании',
    expectedKeywords: {
      en: /vehicle|car|registration|no.*vehicles/i,
      pl: /pojazd|samochód|rejestracja|brak.*pojazdów/i,
      ru: /транспорт|автомобиль|регистрация|нет.*транспорта/i,
    },
  },
  {
    tool: 'get_vehicle_details',
    en: 'Show vehicle details',
    pl: 'Pokaż szczegóły pojazdu',
    ru: 'Покажи детали транспорта',
    expectedKeywords: {
      en: /vehicle|details|registration|not.*found/i,
      pl: /pojazd|szczegóły|rejestracja|nie.*znaleziono/i,
      ru: /транспорт|детали|регистрация|не.*найден/i,
    },
  },
  {
    tool: 'add_vehicle',
    en: 'Add a new vehicle with registration ABC123',
    pl: 'Dodaj nowy pojazd z rejestracją ABC123',
    ru: 'Добавь новый транспорт с регистрацией ABC123',
    expectedKeywords: {
      en: /added|vehicle|success|error/i,
      pl: /dodano|pojazd|sukces|błąd/i,
      ru: /добавлен|транспорт|успешно|ошибка/i,
    },
  },
  {
    tool: 'delete_vehicle',
    en: 'Delete vehicle ABC123',
    pl: 'Usuń pojazd ABC123',
    ru: 'Удали транспорт ABC123',
    expectedKeywords: {
      en: /deleted|vehicle|not.*found/i,
      pl: /usunięto|pojazd|nie.*znaleziono/i,
      ru: /удален|транспорт|не.*найден/i,
    },
  },
];

// Export all tools
export const allTools = [
  ...contractorTools,
  ...invoiceTools,
  ...companyTools,
  ...documentTools,
  ...paymentTools,
  ...expenseTools,
  ...financialTools,
  ...declarationTools,
  ...ledgerTools,
  ...termTools,
  ...userTools,
  ...vehicleTools,
];

// Group by category
export const toolsByCategory = {
  contractors: contractorTools,
  invoices: invoiceTools,
  company: companyTools,
  documents: documentTools,
  payments: paymentTools,
  expenses: expenseTools,
  financial: financialTools,
  declarations: declarationTools,
  ledger: ledgerTools,
  terms: termTools,
  users: userTools,
  vehicles: vehicleTools,
};
