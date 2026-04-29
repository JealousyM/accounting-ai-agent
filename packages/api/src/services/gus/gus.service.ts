/**
 * GUS BIR1.1 SOAP Client
 *
 * The Polish Główny Urząd Statystyczny (GUS) exposes a free SOAP API for
 * looking up any NIP-registered entity (companies + sole proprietors +
 * spółki cywilne) by NIP. Returns the legal name and structured address
 * — exactly what we need for `create_contractor` autofill.
 *
 * Why GUS instead of Biała Lista for lookups: Biała Lista is a VAT-status
 * registry — it only lists active VAT taxpayers, so it misses everyone
 * exempt or under threshold. GUS covers every NIP-registered entity.
 *
 * Auth model:
 *  - Free, but you need a user key (`GUS_API_KEY`).
 *  - Without a key we fall back to the public test environment which
 *    only knows a handful of canned NIPs — useful for tests, useless in
 *    production.
 *
 * Protocol:
 *  - Plain HTTP+SOAP. We use axios + xml2js. No `soap` library — the
 *    contract is small enough that hand-rolled SOAP envelopes are
 *    simpler to maintain and easier to test.
 *  - Login (Zaloguj) returns a session id (`sid`); subsequent calls send
 *    it as the HTTP `sid` header. Sessions live ~60min; we cache for 50min.
 *
 * Annoyance: GUS wraps the search response payload as an *escaped XML
 * string* inside the SOAP body, so we have to parse twice (outer SOAP
 * envelope, then the inner string).
 */

import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { logger } from '../../utils/logger';
import { GusBasicEntity, GusEntityType } from './types';

const PROD_URL = 'https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc';
const TEST_URL = 'https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc';
/** Public test key — only works against the test environment. */
const PUBLIC_TEST_KEY = 'abcde12345abcde12345';

const SOAP_ACTION_LOGIN = 'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Zaloguj';
const SOAP_ACTION_SEARCH = 'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/DaneSzukajPodmioty';

const SESSION_TTL_MS = 50 * 60 * 1000; // 50 min — refresh before GUS expires it
const REQUEST_TIMEOUT_MS = 10_000;

interface SessionCache {
  sid: string;
  expiresAt: number;
}

export class GusService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly isTestEnv: boolean;
  private session: SessionCache | null = null;
  /** Per-process inflight login dedup so a burst of calls doesn't trigger multiple Zaloguj. */
  private loginInflight: Promise<string> | null = null;

  constructor(opts?: { apiKey?: string; baseUrl?: string }) {
    const userKey = opts?.apiKey ?? process.env.GUS_API_KEY;
    if (userKey) {
      this.apiKey = userKey;
      this.baseUrl = opts?.baseUrl ?? PROD_URL;
      this.isTestEnv = false;
    } else {
      this.apiKey = PUBLIC_TEST_KEY;
      this.baseUrl = opts?.baseUrl ?? TEST_URL;
      this.isTestEnv = true;
      logger.warn(
        '[GUS] Using public test key + test environment. Set GUS_API_KEY in .env to enable production lookups (free registration at https://api.stat.gov.pl/Home/RegonApi).',
      );
    }
  }

  /**
   * Look up a single NIP. Returns the entity's basic record (name + address)
   * or null if the NIP is not in GUS. Throws only on infrastructure errors
   * (network, malformed SOAP) — "not found" is a normal null return.
   */
  async lookupByNip(nip: string): Promise<GusBasicEntity | null> {
    if (!/^\d{10}$/.test(nip)) return null;

    try {
      const sid = await this.getSession();
      return await this.searchByNip(sid, nip);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('[GUS] lookupByNip failed', { nip, error: message });
      return null;
    }
  }

  // ---------------------------------------------------------------
  // Session
  // ---------------------------------------------------------------

  private async getSession(): Promise<string> {
    const now = Date.now();
    if (this.session && this.session.expiresAt > now) {
      return this.session.sid;
    }
    if (this.loginInflight) {
      return this.loginInflight;
    }
    this.loginInflight = this.login().finally(() => {
      this.loginInflight = null;
    });
    return this.loginInflight;
  }

  private async login(): Promise<string> {
    const envelope = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ns="http://CIS/BIR/PUBL/2014/07">
  <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
    <wsa:Action>${SOAP_ACTION_LOGIN}</wsa:Action>
    <wsa:To>${this.baseUrl}</wsa:To>
  </soap:Header>
  <soap:Body>
    <ns:Zaloguj>
      <ns:pKluczUzytkownika>${this.apiKey}</ns:pKluczUzytkownika>
    </ns:Zaloguj>
  </soap:Body>
</soap:Envelope>`;

    const response = await axios.post(this.baseUrl, envelope, {
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
      },
      timeout: REQUEST_TIMEOUT_MS,
    });

    const xml = unwrapSoapBody(response.data, response.headers?.['content-type']);
    const parsed = await parseStringPromise(xml, { explicitArray: false });
    const sid = extractFirstString(parsed, 'ZalogujResult');
    if (!sid) {
      throw new Error('GUS Zaloguj returned no session id');
    }

    this.session = { sid, expiresAt: Date.now() + SESSION_TTL_MS };
    logger.info('[GUS] Logged in', { isTestEnv: this.isTestEnv });
    return sid;
  }

  // ---------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------

  private async searchByNip(sid: string, nip: string): Promise<GusBasicEntity | null> {
    const envelope = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ns="http://CIS/BIR/PUBL/2014/07" xmlns:dat="http://CIS/BIR/PUBL/2014/07/DataContract">
  <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
    <wsa:Action>${SOAP_ACTION_SEARCH}</wsa:Action>
    <wsa:To>${this.baseUrl}</wsa:To>
  </soap:Header>
  <soap:Body>
    <ns:DaneSzukajPodmioty>
      <ns:pParametryWyszukiwania>
        <dat:Nip>${nip}</dat:Nip>
      </ns:pParametryWyszukiwania>
    </ns:DaneSzukajPodmioty>
  </soap:Body>
</soap:Envelope>`;

    const response = await axios.post(this.baseUrl, envelope, {
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        sid, // GUS accepts the session id as a regular HTTP header
      },
      timeout: REQUEST_TIMEOUT_MS,
    });

    const xml = unwrapSoapBody(response.data, response.headers?.['content-type']);
    const outer = await parseStringPromise(xml, { explicitArray: false });
    const innerXml = extractFirstString(outer, 'DaneSzukajPodmiotyResult');
    if (!innerXml) {
      // Empty result body → NIP not found.
      return null;
    }

    // The inner payload is a `<root>...</root>` document, doubly-encoded.
    // It might also be empty (e.g. `<root></root>`) when no match.
    if (innerXml.trim() === '' || innerXml.includes('<ErrorCode>')) {
      return null;
    }

    const inner = await parseStringPromise(innerXml, { explicitArray: false });
    const dane = inner?.root?.dane;
    if (!dane) return null;

    return parseBasicEntity(dane);
  }
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

/**
 * Unwrap a SOAP body from the response.
 *
 * GUS BIR1.1 PRODUCTION returns MTOM-wrapped SOAP (`multipart/related;
 * type="application/xop+xml"`) by default. The actual envelope is one
 * of several MIME parts. The TEST environment returns plain SOAP.
 *
 * Returns the inner XML string ready for xml2js parsing.
 */
export function unwrapSoapBody(
  raw: string | Buffer | ArrayBuffer | undefined,
  contentType: string | undefined,
): string {
  let body = '';
  if (typeof raw === 'string') body = raw;
  else if (Buffer.isBuffer(raw)) body = raw.toString('utf8');
  else if (raw instanceof ArrayBuffer) body = Buffer.from(raw).toString('utf8');
  else if (raw && typeof raw === 'object' && 'toString' in raw) body = String(raw);

  const ct = (contentType || '').toLowerCase();
  if (!ct.startsWith('multipart/')) {
    // Plain SOAP — strip a stray BOM if any and we're done.
    return body.replace(/^﻿/, '');
  }

  // Pull boundary out of the Content-Type header.
  const match = ct.match(/boundary="?([^";]+)"?/);
  if (!match) return body;
  const boundary = match[1];

  // Split into MIME parts and pick the one that actually contains a SOAP
  // envelope. We don't care about other XOP attachments.
  const parts = body.split(`--${boundary}`);
  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd < 0) continue;
    const partBody = part.slice(headerEnd + 4).trimEnd();
    if (partBody.includes('<') && partBody.toLowerCase().includes('envelope')) {
      return partBody.replace(/^﻿/, '');
    }
  }
  return body;
}

/**
 * Walk a parsed SOAP envelope looking for the first leaf node whose key
 * matches `targetKey`. xml2js returns deeply-nested objects with
 * namespace-prefixed keys, so a recursive search is the simplest stable
 * extractor.
 */
export function extractFirstString(obj: unknown, targetKey: string): string | null {
  if (obj == null) return null;
  if (typeof obj !== 'object') return null;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (k === targetKey || k.endsWith(`:${targetKey}`)) {
      if (typeof v === 'string') return v;
      if (v && typeof v === 'object' && '_' in (v as Record<string, unknown>)) {
        const inner = (v as Record<string, unknown>)._;
        if (typeof inner === 'string') return inner;
      }
    }
    if (v && typeof v === 'object') {
      const found = extractFirstString(v, targetKey);
      if (found != null) return found;
    }
  }
  return null;
}

function pickString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  if (typeof v === 'string') {
    const trimmed = v.trim();
    return trimmed.length ? trimmed : undefined;
  }
  return undefined;
}

/**
 * Parse the `<dane>` element from `DaneSzukajPodmioty` into our shape.
 * Element names follow GUS docs: Nip, Regon, Nazwa, Typ,
 * Ulica, NrNieruchomosci, NrLokalu, Miejscowosc, KodPocztowy, etc.
 */
export function parseBasicEntity(dane: unknown): GusBasicEntity | null {
  if (!dane || typeof dane !== 'object') return null;
  const d = dane as Record<string, unknown>;

  const nip = pickString(d, 'Nip');
  const regon = pickString(d, 'Regon');
  const name = pickString(d, 'Nazwa');
  const typ = pickString(d, 'Typ');

  if (!nip || !regon || !name || !typ) return null;
  if (!isEntityType(typ)) return null;

  return {
    nip,
    regon,
    name,
    type: typ,
    krs: undefined, // basic search doesn't include KRS — only the full report does
    street: pickString(d, 'Ulica'),
    buildingNumber: pickString(d, 'NrNieruchomosci'),
    flatNumber: pickString(d, 'NrLokalu'),
    city: pickString(d, 'Miejscowosc'),
    zip: pickString(d, 'KodPocztowy'),
    voivodeship: pickString(d, 'Wojewodztwo'),
    district: pickString(d, 'Powiat'),
    commune: pickString(d, 'Gmina'),
    registrationDate: pickString(d, 'DataZakonczeniaDzialalnosci')
      || pickString(d, 'DataRozpoczeciaDzialalnosci'),
  };
}

function isEntityType(t: string): t is GusEntityType {
  return t === 'P' || t === 'F' || t === 'LP' || t === 'LF';
}
