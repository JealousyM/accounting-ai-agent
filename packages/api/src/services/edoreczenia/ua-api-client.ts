import https from 'https';
import axios, { AxiosInstance } from 'axios';
import { UAMessageSummary, UAMessageContent } from './types';

export interface UAApiClientOptions {
  baseUrl: string;
  certPem: string;
  privateKeyPem: string;
}

/**
 * Thin REST client for UA API v3. Authenticates via mTLS using the user's
 * issued certificate + server-held private key.
 *
 * ⚠️ PLACEHOLDER FIELD NAMES: the request paths (`/messages`,
 * `/messages/:id`) and response field names (`messages`, `messageId`,
 * `senderName`, `subject`, `receivedDate`, `hasAttachments`, `body`,
 * `attachments[].contentBase64`, ...) are provisional. Replace them with the
 * exact ones from the Task 1 INT spike findings doc
 * (docs/superpowers/specs/2026-07-15-edoreczenia-spike-findings.md) before
 * going near PROD. All UA API wire-format knowledge is deliberately isolated
 * to this one file so the reconciliation is a single-file change.
 */
export class UAApiClient {
  private readonly http: AxiosInstance;

  constructor(opts: UAApiClientOptions) {
    this.http = axios.create({
      baseURL: opts.baseUrl,
      httpsAgent: new https.Agent({ cert: opts.certPem, key: opts.privateKeyPem }),
      timeout: 30_000,
    });
  }

  async listMessages(): Promise<UAMessageSummary[]> {
    const res = await this.http.get('/messages');
    const raw = (res.data?.messages ?? []) as Array<Record<string, unknown>>;
    return raw.map((m) => ({
      messageId: String(m.messageId),
      senderName: (m.senderName as string) ?? null,
      subject: (m.subject as string) ?? null,
      receivedAt: new Date(m.receivedDate as string),
      hasAttachments: Boolean(m.hasAttachments),
    }));
  }

  async receiveMessage(messageId: string): Promise<UAMessageContent> {
    const res = await this.http.get(`/messages/${encodeURIComponent(messageId)}`);
    const d = res.data ?? {};
    const attachments = ((d.attachments ?? []) as Array<Record<string, unknown>>).map((a) => {
      const content = Buffer.from(String(a.contentBase64 ?? ''), 'base64');
      return {
        filename: String(a.filename ?? 'attachment'),
        mimeType: String(a.mimeType ?? 'application/octet-stream'),
        sizeBytes: content.length,
        content,
      };
    });
    return { messageId: String(d.messageId ?? messageId), bodyText: String(d.body ?? ''), attachments };
  }
}
