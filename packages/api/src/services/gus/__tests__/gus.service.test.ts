import { GusService, extractFirstString, parseBasicEntity } from '../gus.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Realistic SOAP envelope shape returned by GUS BIR1.1.
const loginResponse = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <ZalogujResponse xmlns="http://CIS/BIR/PUBL/2014/07">
      <ZalogujResult>fake-sid-123</ZalogujResult>
    </ZalogujResponse>
  </s:Body>
</s:Envelope>`;

// The inner DaneSzukajPodmiotyResult is an XML-encoded string. xml2js
// decodes the surrounding envelope; we hand-build a realistic decoded
// inner doc here. The double-encoding intricacy is exercised below.
function searchResponseFor(innerXml: string): string {
  const escaped = innerXml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <DaneSzukajPodmiotyResponse xmlns="http://CIS/BIR/PUBL/2014/07">
      <DaneSzukajPodmiotyResult>${escaped}</DaneSzukajPodmiotyResult>
    </DaneSzukajPodmiotyResponse>
  </s:Body>
</s:Envelope>`;
}

const legalPersonInner = `<root>
  <dane>
    <Regon>523456789</Regon>
    <Nip>5260205428</Nip>
    <Nazwa>MICODE SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ</Nazwa>
    <Wojewodztwo>MAZOWIECKIE</Wojewodztwo>
    <Powiat>m. st. Warszawa</Powiat>
    <Gmina>Wola</Gmina>
    <Miejscowosc>Warszawa</Miejscowosc>
    <KodPocztowy>00-672</KodPocztowy>
    <Ulica>ul. Piękna</Ulica>
    <NrNieruchomosci>47B</NrNieruchomosci>
    <NrLokalu>8</NrLokalu>
    <Typ>P</Typ>
  </dane>
</root>`;

const solePropInner = `<root>
  <dane>
    <Regon>123456789</Regon>
    <Nip>5842872418</Nip>
    <Nazwa>JAN KOWALSKI - DZIAŁALNOŚĆ INDYWIDUALNA</Nazwa>
    <Miejscowosc>Kraków</Miejscowosc>
    <KodPocztowy>30-010</KodPocztowy>
    <Ulica>ul. Kwiatowa</Ulica>
    <NrNieruchomosci>5</NrNieruchomosci>
    <Typ>F</Typ>
  </dane>
</root>`;

const emptyInner = `<root></root>`;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GusService.lookupByNip', () => {
  it('returns null for malformed NIP without hitting the network', async () => {
    const service = new GusService({ apiKey: 'k' });
    const result = await service.lookupByNip('not-a-nip');
    expect(result).toBeNull();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('logs in once, then searches; parses a legal-person record', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: loginResponse })
      .mockResolvedValueOnce({ data: searchResponseFor(legalPersonInner) });

    const service = new GusService({ apiKey: 'k' });
    const result = await service.lookupByNip('5260205428');

    expect(result).not.toBeNull();
    expect(result!.name).toBe('MICODE SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ');
    expect(result!.regon).toBe('523456789');
    expect(result!.type).toBe('P');
    expect(result!.street).toBe('ul. Piękna');
    expect(result!.buildingNumber).toBe('47B');
    expect(result!.flatNumber).toBe('8');
    expect(result!.city).toBe('Warszawa');
    expect(result!.zip).toBe('00-672');

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    // Second call must include the sid header from login
    const [, , searchOpts] = mockedAxios.post.mock.calls[1];
    expect((searchOpts as { headers: Record<string, string> }).headers.sid).toBe('fake-sid-123');
  });

  it('reuses the session for back-to-back lookups (no re-login)', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: loginResponse })
      .mockResolvedValueOnce({ data: searchResponseFor(legalPersonInner) })
      .mockResolvedValueOnce({ data: searchResponseFor(legalPersonInner) });

    const service = new GusService({ apiKey: 'k' });
    await service.lookupByNip('5260205428');
    await service.lookupByNip('5260205428');

    // 1 login + 2 searches
    expect(mockedAxios.post).toHaveBeenCalledTimes(3);
  });

  it('parses a sole-proprietor record (Typ F)', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: loginResponse })
      .mockResolvedValueOnce({ data: searchResponseFor(solePropInner) });

    const service = new GusService({ apiKey: 'k' });
    const result = await service.lookupByNip('5842872418');

    expect(result).not.toBeNull();
    expect(result!.type).toBe('F');
    expect(result!.name).toBe('JAN KOWALSKI - DZIAŁALNOŚĆ INDYWIDUALNA');
    expect(result!.flatNumber).toBeUndefined();
  });

  it('returns null on empty result body (NIP not found)', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: loginResponse })
      .mockResolvedValueOnce({ data: searchResponseFor(emptyInner) });

    const service = new GusService({ apiKey: 'k' });
    const result = await service.lookupByNip('9999999999');

    expect(result).toBeNull();
  });

  it('returns null when login fails (no crash)', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const service = new GusService({ apiKey: 'k' });
    const result = await service.lookupByNip('5260205428');

    expect(result).toBeNull();
  });

  it('returns null when search fails (no crash)', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: loginResponse })
      .mockRejectedValueOnce(new Error('500 Internal'));

    const service = new GusService({ apiKey: 'k' });
    const result = await service.lookupByNip('5260205428');

    expect(result).toBeNull();
  });

  it('returns null when the inner payload contains an ErrorCode', async () => {
    const errorInner = `<root><ErrorCode>4</ErrorCode><ErrorMessageEn>Session id expired</ErrorMessageEn></root>`;
    mockedAxios.post
      .mockResolvedValueOnce({ data: loginResponse })
      .mockResolvedValueOnce({ data: searchResponseFor(errorInner) });

    const service = new GusService({ apiKey: 'k' });
    const result = await service.lookupByNip('5260205428');

    expect(result).toBeNull();
  });
});

describe('extractFirstString', () => {
  it('finds a string by key at any depth', () => {
    const obj = { a: { b: { c: 'hello' } } };
    expect(extractFirstString(obj, 'c')).toBe('hello');
  });

  it('matches namespace-prefixed keys (e.g. "ns:Foo")', () => {
    const obj = { 's:Envelope': { 's:Body': { 'ns:Foo': 'value' } } };
    expect(extractFirstString(obj, 'Foo')).toBe('value');
  });

  it('returns null when key not found', () => {
    expect(extractFirstString({ a: 1 }, 'x')).toBeNull();
  });

  it('returns null for nullish input', () => {
    expect(extractFirstString(null, 'x')).toBeNull();
    expect(extractFirstString(undefined, 'x')).toBeNull();
  });
});

describe('parseBasicEntity', () => {
  it('returns null for missing required fields', () => {
    expect(parseBasicEntity({ Nip: '5260205428' })).toBeNull();
  });

  it('returns null for unknown Typ', () => {
    expect(parseBasicEntity({
      Nip: '5260205428', Regon: '1', Nazwa: 'x', Typ: 'X',
    })).toBeNull();
  });
});
