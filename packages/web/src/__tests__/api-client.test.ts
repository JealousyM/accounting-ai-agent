import { ApiClient, ApiError } from '../lib/api/api-client';

// Mock fetch
global.fetch = jest.fn();

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient('http://localhost:3001');
    jest.clearAllMocks();
    
    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
  });

  describe('GET request', () => {
    it('should make successful GET request', async () => {
      const mockData = { id: 1, name: 'Test' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      });

      const result = await client.get('/api/test');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle 404 error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: 'NOT_FOUND',
          message: 'Resource not found',
        }),
      });

      await expect(client.get('/api/test')).rejects.toThrow(ApiError);
    });
  });

  describe('POST request', () => {
    it('should make successful POST request', async () => {
      const mockData = { id: 1, name: 'Created' };
      const postData = { name: 'Test' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      });

      const result = await client.post('/api/test', postData);

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
        })
      );
    });
  });

  describe('Token refresh', () => {
    it('should refresh token on 401 and retry', async () => {
      const mockData = { id: 1, name: 'Test' };

      // First call returns 401
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Token expired',
        }),
      });

      // Refresh token call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { token: 'new-token', refreshToken: 'new-refresh' },
        }),
      });

      // Retry with new token
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      });

      (Storage.prototype.getItem as jest.Mock).mockReturnValue('old-refresh-token');

      const result = await client.get('/api/test');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Retry logic', () => {
    it('should retry on network error', async () => {
      const mockData = { id: 1, name: 'Test' };

      // First two calls fail
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockData }),
        });

      const result = await client.get('/api/test', { retries: 2 });

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });
});
