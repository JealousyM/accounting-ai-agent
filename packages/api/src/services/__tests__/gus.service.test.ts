/**
 * GusService Unit Tests
 *
 * Tests the three exported pure helpers (no I/O):
 *   unwrapSoapBody, extractFirstString, parseBasicEntity
 *
 * And smoke-tests lookupByNip for input validation
 * (no real HTTP calls — axios is mocked).
 */

import { GusService, unwrapSoapBody, extractFirstString, parseBasicEntity } from '../gus/gus.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// ---------------------------------------------------------------
// unwrapSoapBody
// ---------------------------------------------------------------

describe('unwrapSoapBody', () => {
  it('returns plain SOAP body unchanged', () => {
    const body = '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body>hello</s:Body></s:Envelope>';
    expect(unwrapSoapBody(body, 'application/soap+xml')).toBe(body);
  });

  it('strips a leading BOM from plain SOAP', () => {
    const body = '﻿<s:Envelope/>';
    expect(unwrapSoapBody(body, 'text/xml')).toBe('<s:Envelope/>');
  });

  it('extracts the SOAP envelope from a multipart/related body', () => {
    // The code lowercases the Content-Type before extracting the boundary string,
    // so the boundary name used in the body must be lowercase to match the split key.
    const boundary = 'mimeboundary';
    const envelope = '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body>ok</s:Body></s:Envelope>';
    const multipart = [
      `--${boundary}`,
      'Content-Type: application/xop+xml; charset=UTF-8; type="application/soap+xml"',
      '',
      envelope,
      `--${boundary}--`,
    ].join('\r\n');
    const ct = `multipart/related; type="application/xop+xml"; boundary="${boundary}"`;
    expect(unwrapSoapBody(multipart, ct)).toBe(envelope);
  });

  it('returns raw body when multipart has no boundary header', () => {
    const raw = 'some garbage';
    const result = unwrapSoapBody(raw, 'multipart/related');
    expect(result).toBe(raw);
  });

  it('accepts Buffer input', () => {
    const buf = Buffer.from('<s:Envelope/>', 'utf8');
    expect(unwrapSoapBody(buf, 'application/soap+xml')).toBe('<s:Envelope/>');
  });
});

// ---------------------------------------------------------------
// extractFirstString
// ---------------------------------------------------------------

describe('extractFirstString', () => {
  it('finds a top-level key', () => {
    expect(extractFirstString({ ZalogujResult: 'abc-session' }, 'ZalogujResult')).toBe('abc-session');
  });

  it('finds a namespace-prefixed key', () => {
    const obj = { 'ns0:ZalogujResult': 'session-123' };
    expect(extractFirstString(obj, 'ZalogujResult')).toBe('session-123');
  });

  it('finds a key nested inside multiple levels', () => {
    const obj = { Envelope: { Body: { ZalogujResponse: { ZalogujResult: 'deep' } } } };
    expect(extractFirstString(obj, 'ZalogujResult')).toBe('deep');
  });

  it('extracts value from xml2js text-node objects ({ _: "..." })', () => {
    const obj = { ZalogujResult: { _: 'txt-value', $: {} } };
    expect(extractFirstString(obj, 'ZalogujResult')).toBe('txt-value');
  });

  it('returns null when key is absent', () => {
    expect(extractFirstString({ foo: 'bar' }, 'ZalogujResult')).toBeNull();
  });

  it('returns null for null/undefined input', () => {
    expect(extractFirstString(null, 'anything')).toBeNull();
    expect(extractFirstString(undefined, 'anything')).toBeNull();
  });
});

// ---------------------------------------------------------------
// parseBasicEntity
// ---------------------------------------------------------------

describe('parseBasicEntity', () => {
  const validDane = {
    Nip: '1234567890',
    Regon: '123456789',
    Nazwa: 'Testowa Spółka S.A.',
    Typ: 'P',
    Ulica: 'ul. Testowa',
    NrNieruchomosci: '10',
    NrLokalu: '2A',
    Miejscowosc: 'Warszawa',
    KodPocztowy: '00-001',
    Wojewodztwo: 'mazowieckie',
    Powiat: 'Warszawa',
    Gmina: 'Warszawa',
  };

  it('parses a complete entity record', () => {
    const result = parseBasicEntity(validDane);
    expect(result).not.toBeNull();
    expect(result!.nip).toBe('1234567890');
    expect(result!.regon).toBe('123456789');
    expect(result!.name).toBe('Testowa Spółka S.A.');
    expect(result!.type).toBe('P');
    expect(result!.city).toBe('Warszawa');
    expect(result!.zip).toBe('00-001');
  });

  it('accepts all valid entity types', () => {
    for (const typ of ['P', 'F', 'LP', 'LF']) {
      const result = parseBasicEntity({ ...validDane, Typ: typ });
      expect(result).not.toBeNull();
      expect(result!.type).toBe(typ);
    }
  });

  it('returns null for an unknown entity type', () => {
    expect(parseBasicEntity({ ...validDane, Typ: 'X' })).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    expect(parseBasicEntity({ ...validDane, Nip: '' })).toBeNull();
    expect(parseBasicEntity({ ...validDane, Nazwa: '   ' })).toBeNull();
    expect(parseBasicEntity({ ...validDane, Regon: undefined })).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(parseBasicEntity(null)).toBeNull();
    expect(parseBasicEntity('string')).toBeNull();
  });

  it('krs is always undefined (basic search only)', () => {
    const result = parseBasicEntity(validDane);
    expect(result!.krs).toBeUndefined();
  });
});

// ---------------------------------------------------------------
// GusService.lookupByNip — input validation (no real HTTP)
// ---------------------------------------------------------------

describe('GusService.lookupByNip', () => {
  let service: GusService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress the "no GUS_API_KEY" warning noise in test output
    service = new GusService({ apiKey: 'test-key', baseUrl: 'http://mock-gus' });
  });

  it('returns null immediately for NIPs shorter than 10 digits', async () => {
    const result = await service.lookupByNip('123456789'); // 9 digits
    expect(result).toBeNull();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('returns null immediately for NIPs longer than 10 digits', async () => {
    const result = await service.lookupByNip('12345678901'); // 11 digits
    expect(result).toBeNull();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('returns null immediately for NIPs with non-digit characters', async () => {
    const result = await service.lookupByNip('123-456-78-90');
    expect(result).toBeNull();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('returns null and does not throw when axios rejects (infrastructure error)', async () => {
    mockedAxios.post.mockRejectedValue(new Error('connection refused'));
    const result = await service.lookupByNip('1234567890');
    expect(result).toBeNull();
  });
});
