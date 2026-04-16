import plTranslations from './locales/pl.json';
import enTranslations from './locales/en.json';
import ruTranslations from './locales/ru.json';

export type Locale = 'pl' | 'en' | 'ru';

export interface ContractorTranslations {
  notFound: string;
  contractorsTitle: string;
  tableHeaders: string;
  updateDeleteHint: string;
  contractorTitle: string;
  field: string;
  value: string;
  id: string;
  name: string;
  nip: string;
  regon: string;
  email: string;
  phone: string;
  address: string;
  bankAccount: string;
  notes: string;
  created: string;
  createdHint: string;
  updated: string;
  updatedHint: string;
  deleted: string;
  deletedWarning: string;
  errorCreateTitle: string;
  errorReason: string;
  requiredFields: string;
  recommendedFields: string;
  tryAgain: string;
  errorFetch: string;
  errorCreate: string;
  errorUpdate: string;
  errorDelete: string;
  notFoundByName: string;
  didYouMean: string;
  exactNotFound: string;
  similarContractors: string;
  specifyNameUpdate: string;
  specifyNameDelete: string;
}

export interface InvoiceTranslations {
  invoices: string;
  invoiceNumber: string;
  contractor: string;
  date: string;
  dueDate: string;
  grossAmount: string;
  status: string;
  total: string;
  items: string;
  quantity: string;
  unit: string;
  priceNet: string;
  vatRate: string;
  netAmount: string;
  vatAmount: string;
  notesTitle: string;
  noteText: string;
  noteDate: string;
  field: string;
  value: string;
  nip: string;
  currency: string;
  paid: string;
  unpaid: string;
  overdue: string;
  draft: string;
  issued: string;
  sent: string;
  cancelled: string;
  notFound: string;
  notFoundPeriod: string;
  noNotes: string;
  invoiceSent: string;
  noteAdded: string;
  noteDeleted: string;
  overdueWarning: string;
  // New invoice operations
  invoiceCreated: string;
  invoiceCreatedHint: string;
  invoiceUpdated: string;
  invoiceUpdatedHint: string;
  invoiceDeleted: string;
  invoiceDeletedWarning: string;
  // Download
  downloadInvoice: string;
  downloadPdf: string;
  clickToDownload: string;
  fileExpiresIn15Minutes: string;
  pdfOriginal: string;
  pdfCopy: string;
  pdfBoth: string;
  // Invoice types
  typeNormal: string;
  typeMargin: string;
  typeProforma: string;
  typeOffer: string;
  typeReceiptNormal: string;
  typeReceiptFiscal: string;
  typeIncomeNormal: string;
  typeBill: string;
  // Fiscalization
  fiscalized: string;
  unfiscalized: string;
  fiscalizedHint: string;
  unfiscalizedHint: string;
  // Errors
  errorFetch: string;
  errorFetchDetails: string;
  errorSend: string;
  errorAddNote: string;
  errorFetchNotes: string;
  errorDeleteNote: string;
  errorCreate: string;
  errorUpdate: string;
  errorDelete: string;
  errorDownload: string;
  errorFiscalize: string;
  errorUnfiscalize: string;
  // Validation
  contractorRequired: string;
  itemsRequired: string;
  requiredFields: string;
  tryAgain: string;
  // Error details
  errorCreateTitle: string;
  errorReason: string;
}

export interface CompanyTranslations {
  // Titles
  companyTitle: string;
  companyInfo: string;
  accountsTitle: string;
  addressesTitle: string;
  subscriptionTitle: string;

  // Fields
  name: string;
  nip: string;
  regon: string;
  krs: string;
  address: string;
  email: string;
  phone: string;
  website: string;

  // Accounts
  accountNumber: string;
  bankName: string;
  swift: string;
  isDefault: string;
  yes: string;
  no: string;

  // Addresses
  mainAddress: string;
  correspondenceAddress: string;
  street: string;
  city: string;
  zip: string;
  country: string;

  // Subscription/Pack
  packType: string;
  packTrade: string;
  packTradeW: string;
  packBook: string;
  packBookW: string;
  expirationDate: string;
  status: string;
  active: string;
  inactive: string;
  months: string;

  // Empty states
  noAccounts: string;
  noAddresses: string;
  noPack: string;

  // Errors
  errorFetch: string;
  errorFetchAccounts: string;
  errorFetchAddresses: string;
  errorFetchPack: string;

  // Public registry
  publicRegistryTitle: string;
  vatStatus: string;
  vatStatusCzynny: string;
  vatStatusZwolniony: string;
  vatStatusNiezarejestrowany: string;
  verifiedAccounts: string;
  legalForm: string;
  shareCapital: string;
  boardMembers: string;
  registrationDate: string;
  altname: string;
  vatPayer: string;
  taxType: string;
  bookStartDate: string;
  buildingNumber: string;
  flatNumber: string;
  commune: string;
  district: string;
  voivodeship: string;
  errorFetchPublicRegistry: string;
  invalidNip: string;
  nipNotFound: string;
}

export interface UserTranslations {
  // Titles
  usersTitle: string;
  userCompaniesTitle: string;
  detailsTitle: string;

  // Empty states
  noUsers: string;
  noUserCompanies: string;
  userCompanyNotFound: string;

  // Errors
  errorFetchUsers: string;
  errorFetchUserCompanies: string;
  errorFetchUserCompany: string;

  // Fields
  id: string;
  name: string;
  email: string;
  login: string;
  role: string;
  status: string;
  active: string;
  inactive: string;
  userId: string;
  companyId: string;
  permissions: string;
  field: string;
  value: string;
}

export interface PaymentTranslations {
  // Titles
  paymentsTitle: string;
  paymentDetails: string;

  // Fields
  id: string;
  paymentId: string;
  objectType: string;
  objectId: string;
  invoice: string;
  expense: string;
  amount: string;
  amountPln: string;
  account: string;
  date: string;
  method: string;
  paymentType: string;
  initial: string;
  field: string;
  value: string;
  total: string;

  // Payment methods
  methodTransfer: string;
  methodCash: string;
  methodCard: string;
  methodCompensation: string;
  methodOther: string;

  // Common
  yes: string;
  no: string;

  // Messages
  created: string;
  createdHint: string;
  updated: string;
  updatedHint: string;
  deleted: string;
  deletedWarning: string;
  notFound: string;
  notFoundById: string;
  invoiceNotFound: string;
  noFieldsToUpdate: string;

  // Errors
  errorFetch: string;
  errorFetchDetails: string;
  errorCreate: string;
  errorUpdate: string;
  errorDelete: string;
}

export interface ExpenseTranslations {
  // Titles
  expensesTitle: string;
  expenseDetails: string;
  basicInfo: string;
  paymentInfo: string;
  expenseParts: string;
  totals: string;
  additionalFlags: string;

  // Fields
  id: string;
  type: string;
  date: string;
  contractor: string;
  total: string;
  currency: string;
  status: string;
  paid: string;
  unpaid: string;
  paymentDate: string;
  paymentMethod: string;
  taxregisterDate: string;
  accountingEffect: string;
  field: string;
  value: string;
  totalSum: string;

  // Expense types
  typeInvoice: string;
  typeBill: string;
  typeVatExempt: string;

  // Accounting effects
  effectKpirAndVat: string;
  effectKpir: string;
  effectVat: string;
  effectNothing: string;

  // Payment methods
  methodTransfer: string;
  methodCash: string;
  methodCard: string;
  methodCompensation: string;
  methodOther: string;

  // Expense parts
  name: string;
  quantity: string;
  unit: string;
  priceNet: string;
  vatRate: string;
  totalNet: string;
  totalVat: string;
  totalGross: string;

  // Flags
  splitPayment: string;
  wnt: string;
  serviceImport: string;
  serviceImport2: string;
  cargoImport: string;
  draft: string;

  // Messages
  notFound: string;
  notFoundById: string;
  contractorNotFound: string;

  // Errors
  errorFetch: string;
  errorFetchDetails: string;
}

export interface VehicleTranslations {
  // Titles
  vehiclesTitle: string;
  vehicleDetails: string;
  leasingInfo: string;

  // Fields
  id: string;
  name: string;
  register: string;
  type: string;
  ownership: string;
  truckType: string;
  taxPurpose: string;
  vatLeasingBelowLimit: string;
  vatLeasingDate: string;
  vatLeasingValue: string;
  field: string;
  value: string;

  // Vehicle types
  typeTruck: string;
  typeCar: string;
  typeMotor: string;
  typeMotorBike: string;

  // Ownership types
  ownershipLeasing: string;
  ownershipPrivate: string;
  ownershipOther: string;

  // Truck types
  truckTypeNormal: string;
  truckTypeQuasi: string;

  // Tax purpose
  taxPurposeMixed: string;
  taxPurposeCompany: string;

  // Messages
  notFound: string;
  notFoundById: string;
  notFoundByRegister: string;
  created: string;
  createdHint: string;
  updated: string;
  updatedHint: string;
  deleted: string;
  deletedWarning: string;
  updateDeleteHint: string;

  // Common
  yes: string;
  no: string;

  // Errors
  errorFetch: string;
  errorFetchDetails: string;
  errorCreate: string;
  errorUpdate: string;
  errorDelete: string;
  requiredFields: string;
  tryAgain: string;
  errorCreateTitle: string;
  errorReason: string;
}

export interface TermTranslations {
  // Titles
  termsTitle: string;
  termDetails: string;
  termGroupsTitle: string;
  termGroupDetails: string;

  // Fields
  id: string;
  date: string;
  hour: string;
  description: string;
  group: string;
  groupId: string;
  type: string;
  contractor: string;
  contact: string;
  field: string;
  value: string;
  name: string;
  isReadonly: string;

  // Term types
  typeNormal: string;
  typeCycleDayOfWeek: string;
  typeCycleDayOfMonth: string;

  // Messages - Terms
  notFound: string;
  notFoundById: string;
  created: string;
  createdHint: string;
  updated: string;
  updatedHint: string;
  deleted: string;
  deletedWarning: string;
  updateDeleteHint: string;

  // Messages - Term Groups
  groupNotFound: string;
  groupNotFoundById: string;
  groupCreated: string;
  groupCreatedHint: string;
  groupUpdated: string;
  groupUpdatedHint: string;
  groupDeleted: string;
  groupDeletedWarning: string;
  groupUpdateDeleteHint: string;

  // Common
  yes: string;
  no: string;

  // Errors
  errorFetch: string;
  errorFetchDetails: string;
  errorCreate: string;
  errorUpdate: string;
  errorDelete: string;
  errorFetchGroups: string;
  errorFetchGroupDetails: string;
  errorCreateGroup: string;
  errorUpdateGroup: string;
  errorDeleteGroup: string;
  requiredFields: string;
  tryAgain: string;
  errorCreateTitle: string;
  errorReason: string;
}

export interface DeclarationTranslations {
  jpkVatTitle: string;
  pitTitle: string;
  field: string;
  value: string;
  filename: string;
  generatedAt: string;
  fileSize: string;
  downloadFile: string;
  clickToDownload: string;
  fileExpiresIn15Minutes: string;
  errorFetchJpkVat: string;
  errorFetchPit: string;
}

export interface LedgerTranslations {
  // Fiscal Years
  fiscalYearsTitle: string;
  fiscalYearDetails: string;
  fiscalYearNotFound: string;
  fiscalYearNotFoundById: string;

  // Schemas
  operationSchemasTitle: string;
  operationSchemaDetails: string;
  operationSchemaNotFound: string;
  operationSchemaNotFoundById: string;

  // Fields
  id: string;
  symbol: string;
  name: string;
  category: string;
  visibility: string;
  startDate: string;
  endDate: string;
  fiscalYear: string;
  field: string;
  value: string;

  // Errors
  errorFetchFiscalYears: string;
  errorFetchFiscalYearDetails: string;
  errorFetchSchemas: string;
  errorFetchSchemaDetails: string;
}

export interface DocumentTranslations {
  // Titles
  documentsTitle: string;
  documentDetails: string;

  // Fields
  id: string;
  name: string;
  type: string;
  set: string;
  filename: string;
  mimeType: string;
  size: string;
  description: string;
  url: string;
  tags: string;
  relatedObject: string;
  created: string;
  modified: string;
  field: string;
  value: string;
  download: string;

  // Document types
  typeFile: string;
  typeTemplate: string;
  typeUrl: string;

  // Document sets
  setBook: string;
  setCrm: string;
  setDeclaration: string;
  setStaff: string;
  setWarehouse: string;

  // Messages
  notFound: string;
  notFoundById: string;
  notDownloadable: string;
  downloadHint: string;
  downloadFile: string;
  clickToDownload: string;
  openLink: string;
  fileExpiresIn15Minutes: string;
  deleted: string;
  deletedWarning: string;

  // Errors
  errorFetch: string;
  errorFetchDetails: string;
  errorDownload: string;
  errorDelete: string;
  errorReason: string;
}

export interface HRTranslations {
  // Employee CRUD
  notFound: string;
  employeesTitle: string;
  employeeTitle: string;
  tableHeaders: string;
  created: string;
  createdHint: string;
  updated: string;
  updatedHint: string;
  deleted: string;
  deletedWarning: string;
  updateDeleteHint: string;

  // Field labels
  id: string;
  firstName: string;
  lastName: string;
  pesel: string;
  nip: string;
  email: string;
  phone: string;
  address: string;
  bankAccount: string;
  taxOffice: string;
  position: string;
  department: string;
  hireDate: string;
  field: string;
  value: string;

  // Contract types
  contractType: string;
  boardResolution: string;
  employment: string;
  mandateContract: string;
  workContract: string;
  dividend: string;

  // Contract statuses
  contractStatus: string;
  draft: string;
  active: string;
  terminated: string;
  expired: string;

  // Payroll labels
  payrollTitle: string;
  grossAmount: string;
  netAmount: string;
  bonuses: string;
  deductions: string;
  period: string;
  totalEmployerCost: string;

  // ZUS labels
  zusTitle: string;
  zusEmerytalne: string;
  zusRentowe: string;
  zusChorobowe: string;
  zusZdrowotne: string;
  zusEmployer: string;

  // Tax labels
  taxTitle: string;
  taxBase: string;
  incomeTax: string;

  // Absence types
  absencesTitle: string;
  vacation: string;
  sickLeave: string;
  maternity: string;
  unpaid: string;

  // Payroll save/delete
  payrollSaved: string;
  payrollSavedHint: string;
  payrollDeleted: string;
  payrollDeletedWarning: string;

  // Summary labels
  hrSummary: string;
  totalEmployees: string;
  activeContracts: string;
  totalPayrollFund: string;

  // Errors
  errorFetch: string;
  errorCreate: string;
  errorUpdate: string;
  errorDelete: string;
  errorCreateTitle: string;
  errorReason: string;
  requiredFields: string;
  tryAgain: string;
}

export interface KSeFTranslations {
  // Send
  sendSuccess: string;
  sendFailed: string;

  // Status
  statusTitle: string;
  statusPending: string;
  statusSending: string;
  statusSent: string;
  statusAccepted: string;
  statusRejected: string;
  statusCompleted: string;
  statusFailed: string;

  // Fields
  field: string;
  value: string;
  referenceNumber: string;
  invoiceNumber: string;
  status: string;
  adapter: string;
  directAPI: string;
  timestamp: string;
  sentAt: string;
  acceptedAt: string;
  rejectedAt: string;
  direction: string;
  directionSent: string;
  directionReceived: string;

  // UPO
  upoDownloaded: string;
  upoAvailableHint: string;
  upoSavedHint: string;
  fileName: string;
  fileSize: string;

  // Lists
  invoicesTitle: string;
  tableHeaders: string;
  noInvoicesFound: string;

  // Statistics
  statisticsTitle: string;
  totalSent: string;
  totalReceived: string;
  accepted: string;
  rejected: string;
  pending: string;
  completed: string;
  monthlyTrend: string;

  // Bulk
  bulkSendTitle: string;
  bulkSendResult: string;
  bulkSuccessful: string;
  bulkFailed: string;

  // Hints
  statusCheckHint: string;
  queryHint: string;
  checkWFirmaConfig: string;

  // Incoming invoices
  incomingTitle: string;
  incomingTableHeaders: string;
  noIncomingInvoices: string;
  incomingMatchTitle: string;
  incomingMatchHint: string;
  matchResult: string;
  matchFound: string;
  matchNotFound: string;
  matchCount: string;
  matchedInvoicesTitle: string;
  matchContractor: string;
  matchAmount: string;
  matchDate: string;
  noMatchHint: string;

  // Errors
  errorSend: string;
  errorStatus: string;
  errorUPO: string;
  errorQuery: string;
  errorQueryIncoming: string;
  errorMatchIncoming: string;
  errorStatistics: string;
  errorBulkSend: string;
  errorDirectSend: string;
  errorReason: string;

  // Token auth config
  ksefToken: string;
  ksefNip: string;
  ksefTokenHint: string;
  ksefNipHint: string;
}

export interface TaxCalendarTranslations {
  title: string;
  deadlinesTitle: string;
  date: string;
  name: string;
  description: string;
  category: string;
  status: string;
  obligatory: string;
  optional: string;
  statusOverdue: string;
  statusToday: string;
  statusUpcoming: string;
  shiftNote: string;
  optionalNote: string;
  notFound: string;
  errorFetch: string;
  pit4r: string;
  pcc: string;
  dividend: string;
  zus: string;
  cit: string;
  vat7: string;
  vatue: string;
  pit11: string;
  cit8: string;
  categoryVat: string;
  categoryCit: string;
  categoryPit: string;
  categoryZus: string;
  categoryPcc: string;
  categoryDividend: string;
}

export interface TaxRegisterTranslations {
  title: string;
  entries: string;
  sums: string;
  totalSums: string;
  date: string;
  name: string;
  lp: string;
  income: string;
  expense: string;
  contractor: string;
  noEntries: string;
  errorFetch: string;
  summary: string;
  profit: string;
  loss: string;
}

export interface CommonTranslations {
  wfirmaLimitReached: string;
  aiLimitReached: string;
  subscriptionRequired: string;
}

export interface Translations {
  common: CommonTranslations;
  contractor: ContractorTranslations;
  invoice: InvoiceTranslations;
  company: CompanyTranslations;
  user: UserTranslations;
  payment: PaymentTranslations;
  expense: ExpenseTranslations;
  vehicle: VehicleTranslations;
  term: TermTranslations;
  declarations: DeclarationTranslations;
  document: DocumentTranslations;
  ledger: LedgerTranslations;
  hr: HRTranslations;
  ksef: KSeFTranslations;
  taxCalendar: TaxCalendarTranslations;
  taxRegister: TaxRegisterTranslations;
}

const translations: Record<Locale, Translations> = {
  pl: plTranslations,
  en: enTranslations,
  ru: ruTranslations,
};

export function getTranslations(locale: Locale = 'pl'): Translations {
  return translations[locale] || translations.pl;
}

export function getContractorTranslations(locale: Locale = 'pl'): ContractorTranslations {
  return getTranslations(locale).contractor;
}

export function getInvoiceTranslations(locale: Locale = 'pl'): InvoiceTranslations {
  return getTranslations(locale).invoice;
}

export function getCompanyTranslations(locale: Locale = 'pl'): CompanyTranslations {
  return getTranslations(locale).company;
}

export function getUserTranslations(locale: Locale = 'pl'): UserTranslations {
  return getTranslations(locale).user;
}

export function getPaymentTranslations(locale: Locale = 'pl'): PaymentTranslations {
  return getTranslations(locale).payment;
}

export function getExpenseTranslations(locale: Locale = 'pl'): ExpenseTranslations {
  return getTranslations(locale).expense;
}

export function getVehicleTranslations(locale: Locale = 'pl'): VehicleTranslations {
  return getTranslations(locale).vehicle;
}

export function getTermTranslations(locale: Locale = 'pl'): TermTranslations {
  return getTranslations(locale).term;
}

export function getDeclarationTranslations(locale: Locale = 'pl'): DeclarationTranslations {
  return getTranslations(locale).declarations;
}

export function getDocumentTranslations(locale: Locale = 'pl'): DocumentTranslations {
  return getTranslations(locale).document;
}

export function getLedgerTranslations(locale: Locale = 'pl'): LedgerTranslations {
  return getTranslations(locale).ledger;
}

export function getHRTranslations(locale: Locale = 'pl'): HRTranslations {
  return getTranslations(locale).hr;
}

export function getKSeFTranslations(locale: Locale = 'pl'): KSeFTranslations {
  return getTranslations(locale).ksef;
}

export function getCommonTranslations(locale: Locale = 'pl'): CommonTranslations {
  return getTranslations(locale).common;
}

export function getTaxCalendarTranslations(locale: Locale = 'pl'): TaxCalendarTranslations {
  return getTranslations(locale).taxCalendar;
}

export function getTaxRegisterTranslations(locale: Locale = 'pl'): TaxRegisterTranslations {
  return getTranslations(locale).taxRegister;
}
