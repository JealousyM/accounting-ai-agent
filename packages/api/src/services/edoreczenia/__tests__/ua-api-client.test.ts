import axios from 'axios';
import { UAApiClient } from '../ua-api-client';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('UAApiClient', () => {
  const get = jest.fn();
  let client: UAApiClient;
  beforeEach(() => {
    mockedAxios.create.mockReturnValue({ get } as never);
    get.mockReset();
    // Construct after the axios.create mock is set so this.http === { get }.
    client = new UAApiClient({ baseUrl: 'https://int.example', certPem: 'C', privateKeyPem: 'K' });
  });

  it('maps the message list into UAMessageSummary[]', async () => {
    get.mockResolvedValueOnce({
      data: { messages: [
        { messageId: 'M1', senderName: 'Urząd Skarbowy', subject: 'Wezwanie', receivedDate: '2026-10-01T08:00:00Z', hasAttachments: true },
      ] },
    });
    const out = await client.listMessages();
    expect(out).toHaveLength(1);
    expect(out[0].messageId).toBe('M1');
    expect(out[0].receivedAt.toISOString()).toBe('2026-10-01T08:00:00.000Z');
    expect(out[0].hasAttachments).toBe(true);
  });

  it('receiveMessage returns body + decoded attachments', async () => {
    get.mockResolvedValueOnce({
      data: {
        messageId: 'M1',
        body: 'Treść pisma',
        attachments: [{ filename: 'wezwanie.pdf', mimeType: 'application/pdf', contentBase64: Buffer.from('pdf').toString('base64') }],
      },
    });
    const out = await client.receiveMessage('M1');
    expect(out.bodyText).toBe('Treść pisma');
    expect(out.attachments[0].filename).toBe('wezwanie.pdf');
    expect(out.attachments[0].content.toString()).toBe('pdf');
    expect(out.attachments[0].sizeBytes).toBe(3);
  });
});
