// packages/api/src/middleware/__tests__/validation.middleware.test.ts
import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import supertest from 'supertest';
import express, { Application } from 'express';
import { validateRequest } from '../validation.middleware';

// -----------------------------------------------
// Mock logger
// -----------------------------------------------
jest.mock('../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { logger } from '../../utils/logger';

describe('validateRequest middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {},
      path: '/test',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  // -------------------------------------------
  // 1. Happy path
  // -------------------------------------------
  it('should call next() when validation succeeds', async () => {
    const schema = z.object({
      body: z.object({
        name: z.string(),
      }),
      query: z.any(),
      params: z.any(),
    });

    mockRequest.body = { name: 'john' };

    const middleware = validateRequest(schema);

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  // -------------------------------------------
  // 2. Single validation error
  // -------------------------------------------
  it('should return 400 with correct payload for single validation error', async () => {
    const schema = z.object({
      body: z.object({
        name: z.string(),
      }),
      query: z.any(),
      params: z.any(),
    });

    const middleware = validateRequest(schema);

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Validation Error',
        message: 'Invalid request data',
        details: [
          {
            field: 'body.name',
            message: expect.any(String),
          },
        ],
      })
    );
    expect(nextFunction).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith('Validation error', {
      path: '/test',
      errors: expect.any(Array),
    });
  });

  // -------------------------------------------
  // 3. Multiple validation errors
  // -------------------------------------------
  it('should aggregate and map multiple validation errors', async () => {
    const schema = z.object({
      body: z.object({
        email: z.string().email(),
      }),
      query: z.object({
        page: z.number(),
      }),
      params: z.any(),
    });

    const middleware = validateRequest(schema);

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    const [, payload] = (mockResponse.json as jest.Mock).mock.calls[0];

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(payload.details).toHaveLength(2);
    expect(payload.details[0]).toEqual({
      field: 'body.email',
      message: expect.any(String),
    });
    expect(payload.details[1]).toEqual({
      field: 'query.page',
      message: expect.any(String),
    });
  });

  // -------------------------------------------
  // 4. Zod refinement failure
  // -------------------------------------------
  it('should surface errors from Zod refinement', async () => {
    const schema = z
      .object({
        body: z.object({
          age: z.number(),
        }),
        query: z.any(),
        params: z.any(),
      })
      .refine((data) => data.body.age >= 18, {
        path: ['body', 'age'],
        message: 'Must be adult',
      });

    mockRequest.body = { age: 16 };

    const middleware = validateRequest(schema);

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    const [, payload] = (mockResponse.json as jest.Mock).mock.calls[0];

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(payload.details[0]).toEqual({
      field: 'body.age',
      message: 'Must be adult',
    });
  });

  // -------------------------------------------
  // 5. Unexpected non-Zod error
  // -------------------------------------------
  it('should handle unexpected errors with 500 status', async () => {
    const schema = z.object({
      body: z.any(),
      query: z.any(),
      params: z.any(),
    });

    jest
      .spyOn(schema, 'parseAsync')
      .mockRejectedValueOnce(new Error('boom'));

    const middleware = validateRequest(schema);

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Unexpected validation error',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  // -------------------------------------------
  // 6. Asynchronous parse rejection with ZodError
  // -------------------------------------------
  it('should treat rejected promise containing ZodError as validation error', async () => {
    const baseSchema = z.object({
      body: z.object({
        prop: z.string(),
      }),
      query: z.any(),
      params: z.any(),
    });

    const errorResult = baseSchema.safeParse({
      body: {},
      query: {},
      params: {},
    });
    if (errorResult.success) {
      throw new Error('Expected parse to fail');
    }

    jest
      .spyOn(baseSchema, 'parseAsync')
      .mockRejectedValueOnce(errorResult.error);

    const middleware = validateRequest(baseSchema);

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Validation Error',
      })
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  // -------------------------------------------
  // 7. Deep path with array indices
  // -------------------------------------------
  it('should join array indices correctly in error paths', async () => {
    const schema = z.object({
      body: z.object({
        items: z.array(
          z.object({
            price: z.number(),
          })
        ),
      }),
      query: z.any(),
      params: z.any(),
    });

    mockRequest.body = { items: [{}] };

    const middleware = validateRequest(schema);

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    const [, payload] = (mockResponse.json as jest.Mock).mock.calls[0];

    expect(payload.details[0].field).toBe('body.items.0.price');
  });
});

// -----------------------------------------------
// Integration tests with supertest
// -----------------------------------------------
describe('validateRequest middleware – integration', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  it('should return 200 for valid request', async () => {
    const schema = z.object({
      body: z.object({
        name: z.string(),
      }),
      query: z.any(),
      params: z.any(),
    });

    app.post(
      '/test',
      validateRequest(schema),
      (_req, res) => res.status(200).json({ ok: true })
    );

    await supertest(app)
      .post('/test')
      .send({ name: 'john' })
      .expect(200)
      .expect({ ok: true });
  });

  it('should return 400 for invalid request', async () => {
    const schema = z.object({
      body: z.object({
        name: z.string(),
      }),
      query: z.any(),
      params: z.any(),
    });

    app.post(
      '/test',
      validateRequest(schema),
      (_req, res) => res.status(200).json({ ok: true })
    );

    const response = await supertest(app)
      .post('/test')
      .send({})
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        error: 'Validation Error',
        details: expect.any(Array),
      })
    );
  });
});