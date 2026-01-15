/**
 * API Endpoints
 * 
 * Centralized API endpoint definitions
 */

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    ME: '/api/auth/me',
    OAUTH_GOOGLE: '/api/auth/oauth/google',
    OAUTH_GITHUB: '/api/auth/oauth/github',
  },

  // Users
  USERS: {
    LOCALE: '/api/users/locale',
    PROFILE: '/api/users/profile',
    UPDATE: '/api/users/update',
  },

  // Invoices
  INVOICES: {
    LIST: '/api/invoices',
    GET: (id: string) => `/api/invoices/${id}`,
    CREATE: '/api/invoices',
    UPDATE: (id: string) => `/api/invoices/${id}`,
    DELETE: (id: string) => `/api/invoices/${id}`,
  },

  // Customers
  CUSTOMERS: {
    LIST: '/api/customers',
    GET: (id: string) => `/api/customers/${id}`,
    CREATE: '/api/customers',
    UPDATE: (id: string) => `/api/customers/${id}`,
    DELETE: (id: string) => `/api/customers/${id}`,
  },

  // AI
  AI: {
    CONVERSATIONS: '/api/ai/conversations',
    CONVERSATION: (id: string) => `/api/ai/conversations/${id}`,
    SEND_MESSAGE: (id: string) => `/api/ai/conversations/${id}/messages`,
    RECOMMENDATIONS: '/api/ai/recommendations',
    ANALYZE: '/api/ai/analyze',
  },
} as const;
