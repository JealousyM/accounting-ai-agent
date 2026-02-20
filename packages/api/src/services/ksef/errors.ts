/**
 * KSeF Error Classes
 * Custom error hierarchy for KSeF operations
 */

export class KSeFError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public details?: any,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'KSeFError';
  }
}

export class KSeFAuthenticationError extends KSeFError {
  constructor(message: string = 'KSeF authentication failed', details?: any) {
    super('KSEF_AUTH_ERROR', message, details, 401);
    this.name = 'KSeFAuthenticationError';
  }
}

export class KSeFSessionExpiredError extends KSeFError {
  constructor(message: string = 'KSeF session expired', details?: any) {
    super('KSEF_SESSION_EXPIRED', message, details, 401);
    this.name = 'KSeFSessionExpiredError';
  }
}

export class KSeFConnectionError extends KSeFError {
  constructor(message: string = 'Connection to KSeF failed', details?: any) {
    super('KSEF_CONNECTION_ERROR', message, details, 503);
    this.name = 'KSeFConnectionError';
  }
}

export class KSeFValidationError extends KSeFError {
  constructor(message: string = 'KSeF validation error', details?: any) {
    super('KSEF_VALIDATION_ERROR', message, details, 400);
    this.name = 'KSeFValidationError';
  }
}

export class KSeFInvoiceRejectedError extends KSeFError {
  constructor(message: string, public rejectionReason: string, details?: any) {
    super('KSEF_INVOICE_REJECTED', message, details, 422);
    this.name = 'KSeFInvoiceRejectedError';
  }
}

export class KSeFCertificateError extends KSeFError {
  constructor(message: string = 'KSeF certificate error', details?: any) {
    super('KSEF_CERTIFICATE_ERROR', message, details, 500);
    this.name = 'KSeFCertificateError';
  }
}

export class KSeFXMLGenerationError extends KSeFError {
  constructor(message: string = 'FA(3) XML generation failed', details?: any) {
    super('KSEF_XML_ERROR', message, details, 500);
    this.name = 'KSeFXMLGenerationError';
  }
}

export class KSeFEncryptionError extends KSeFError {
  constructor(message: string = 'KSeF encryption failed', details?: any) {
    super('KSEF_ENCRYPTION_ERROR', message, details, 500);
    this.name = 'KSeFEncryptionError';
  }
}
