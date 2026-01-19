/**
 * wFirma API Error Classes
 */

export class WFirmaError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public details?: any,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'WFirmaError';
  }
}

export class WFirmaAuthenticationError extends WFirmaError {
  constructor(message: string = 'Authentication failed', details?: any) {
    super('WFIRMA_AUTH_ERROR', message, details, 401);
  }
}

export class WFirmaConnectionError extends WFirmaError {
  constructor(message: string = 'Connection to wFirma failed', details?: any) {
    super('WFIRMA_CONNECTION_ERROR', message, details, 503);
  }
}

export class WFirmaValidationError extends WFirmaError {
  constructor(message: string = 'Validation error', details?: any) {
    super('WFIRMA_VALIDATION_ERROR', message, details, 400);
  }
}
