// ============================================
// TYPES
// ============================================

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: ValidationError[];
}

/**
 * Validation error detail
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * API Error
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: ValidationError[],
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Network Error
 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Request options
 */
interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
}

// ============================================
// API CLIENT
// ============================================

/**
 * API Client
 * 
 * Features:
 * - Automatic token management
 * - Token refresh on 401
 * - Request retry with exponential backoff
 * - Type-safe responses
 * - Error handling
 * - Request/response logging
 * - Timeout handling
 */
export class ApiClient {
  private baseURL: string;
  private defaultTimeout: number = 30000; // 30 seconds
  private maxRetries: number = 3;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || this.getBaseURL();
  }

  /**
   * Get base URL from environment or default
   */
  private getBaseURL(): string {
    return process.env.NEXT_PUBLIC_API_URL || '';
  }

  /**
   * Get token from localStorage
   */
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  /**
   * Get refresh token from localStorage
   */
  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  /**
   * Save tokens to localStorage
   */
  private saveTokens(token: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
  }

  /**
   * Clear tokens from localStorage
   */
  private clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<boolean> {
    // If already refreshing, wait for that promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform token refresh
   */
  private async performTokenRefresh(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken();

      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const data: ApiResponse = await response.json();

      if (data.success && data.data) {
        this.saveTokens(data.data.token, data.data.refreshToken);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Build headers for request
   */
  private buildHeaders(skipAuth: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!skipAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Handle fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new NetworkError('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Parse error response
   */
  private async parseError(response: Response): Promise<ApiError> {
    try {
      const data: ApiResponse = await response.json();
      return new ApiError(
        data.error || 'API_ERROR',
        data.message || 'An error occurred',
        data.details,
        response.status
      );
    } catch {
      return new ApiError(
        'PARSE_ERROR',
        `HTTP ${response.status}: ${response.statusText}`,
        undefined,
        response.status
      );
    }
  }

  /**
   * Exponential backoff delay
   */
  private async delay(attempt: number): Promise<void> {
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(
    method: string,
    path: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      headers: customHeaders = {},
      timeout = this.defaultTimeout,
      retries = this.maxRetries,
      skipAuth = false,
    } = options;

    const url = `${this.baseURL}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Build request options
        const headers = {
          ...this.buildHeaders(skipAuth),
          ...customHeaders,
        };

        const requestOptions: RequestInit = {
          method,
          headers,
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          requestOptions.body = JSON.stringify(data);
        }

        // Log request in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API] ${method} ${path}`, data);
        }

        // Make request
        const response = await this.fetchWithTimeout(url, requestOptions, timeout);

        // Handle 401 Unauthorized - try to refresh token
        if (response.status === 401 && !skipAuth) {
          const refreshed = await this.refreshAccessToken();

          if (refreshed) {
            // Retry request with new token
            return this.request<T>(method, path, data, options);
          } else {
            // Refresh failed - clear tokens and throw error
            this.clearTokens();
            throw new ApiError(
              'UNAUTHORIZED',
              'Session expired. Please login again.',
              undefined,
              401
            );
          }
        }

        // Handle error responses
        if (!response.ok) {
          const error = await this.parseError(response);
          throw error;
        }

        // Parse success response
        const responseData: ApiResponse<T> = await response.json();

        // Log response in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API] ${method} ${path} - Success`, responseData);
        }

        // Return data
        if (responseData.success && responseData.data !== undefined) {
          return responseData.data;
        }

        // If no data field, return whole response
        return responseData as unknown as T;
      } catch (error: any) {
        lastError = error;

        // Don't retry on certain errors
        if (
          error instanceof ApiError &&
          (error.statusCode === 400 ||
            error.statusCode === 401 ||
            error.statusCode === 403 ||
            error.statusCode === 404)
        ) {
          throw error;
        }

        // Log error in development
        if (process.env.NODE_ENV === 'development') {
          console.error(`[API] ${method} ${path} - Attempt ${attempt + 1} failed:`, error);
        }

        // If not last attempt, wait before retry
        if (attempt < retries) {
          await this.delay(attempt);
        }
      }
    }

    // All retries failed
    throw lastError || new NetworkError('Request failed after multiple retries');
  }

  /**
   * GET request
   */
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  /**
   * POST request
   */
  async post<T>(path: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, data, options);
  }

  /**
   * PUT request
   */
  async put<T>(path: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, data, options);
  }

  /**
   * PATCH request
   */
  async patch<T>(path: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, data, options);
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  /**
   * Upload file
   */
  async upload<T>(
    path: string,
    file: File,
    additionalData?: Record<string, any>
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const token = this.getToken();
    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await this.parseError(response);
      throw error;
    }

    const data: ApiResponse<T> = await response.json();
    return data.data as T;
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * GET request
 */
export const get = <T>(path: string, options?: RequestOptions): Promise<T> => {
  return apiClient.get<T>(path, options);
};

/**
 * POST request
 */
export const post = <T>(path: string, data?: any, options?: RequestOptions): Promise<T> => {
  return apiClient.post<T>(path, data, options);
};

/**
 * PUT request
 */
export const put = <T>(path: string, data?: any, options?: RequestOptions): Promise<T> => {
  return apiClient.put<T>(path, data, options);
};

/**
 * PATCH request
 */
export const patch = <T>(path: string, data?: any, options?: RequestOptions): Promise<T> => {
  return apiClient.patch<T>(path, data, options);
};

/**
 * DELETE request
 */
export const del = <T>(path: string, options?: RequestOptions): Promise<T> => {
  return apiClient.delete<T>(path, options);
};

/**
 * Upload file
 */
export const upload = <T>(
  path: string,
  file: File,
  additionalData?: Record<string, any>
): Promise<T> => {
  return apiClient.upload<T>(path, file, additionalData);
};
