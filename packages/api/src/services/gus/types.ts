/**
 * GUS BIR1.1 Types
 *
 * Subset of fields returned by the REGON SOAP service that we actually
 * use for contractor autofill. The full report has dozens of fields per
 * legal-form variant — we only surface what's needed to populate a
 * wFirma contractor.
 */

export type GusEntityType =
  | 'P'   // legal person (sp. z o.o., S.A., etc.)
  | 'F'   // physical person (sole proprietor)
  | 'LP'  // local of a legal person
  | 'LF'; // local of a physical person

/**
 * Result of `DaneSzukajPodmioty(nip)` — one match per NIP in practice.
 * Field names mirror the GUS XML element names verbatim, lowercased and
 * camelCased where appropriate.
 */
export interface GusBasicEntity {
  regon: string;
  nip: string;
  /** Full legal name (osoba prawna) or "Nazwisko Imię" (osoba fizyczna) */
  name: string;
  /** P / F / LP / LF */
  type: GusEntityType;
  /** Optional KRS number (only for legal persons that have one) */
  krs?: string;
  /** Address fields — present in basic search response */
  street?: string;
  buildingNumber?: string;
  flatNumber?: string;
  city?: string;
  zip?: string;
  voivodeship?: string;
  district?: string;
  commune?: string;
  /** First date the entity appears in the registry (registration date) */
  registrationDate?: string;
}
