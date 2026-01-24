/**
 * Application configuration
 * Centralized config to avoid duplication
 */

if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn('NEXT_PUBLIC_API_URL is not set. API calls may fail.');
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
