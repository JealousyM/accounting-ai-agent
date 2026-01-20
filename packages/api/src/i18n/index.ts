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
  errorFetch: string;
  errorFetchDetails: string;
  errorSend: string;
  errorAddNote: string;
  errorFetchNotes: string;
  errorDeleteNote: string;
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

export interface Translations {
  contractor: ContractorTranslations;
  invoice: InvoiceTranslations;
  company: CompanyTranslations;
  user: UserTranslations;
  payment: PaymentTranslations;
  expense: ExpenseTranslations;
  vehicle: VehicleTranslations;
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
