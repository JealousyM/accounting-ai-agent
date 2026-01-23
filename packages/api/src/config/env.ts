/**
 * Environment configuration
 * This file MUST be imported first before any other module
 * to ensure environment variables are loaded
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env file from packages/api directory
const envPath = path.resolve(__dirname, '../../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  // Try loading from current working directory as fallback
  dotenv.config();
}

// Export config validation
export const validateEnv = () => {
  const required = ['WFIRMA_ACCESS_KEY', 'WFIRMA_SECRET_KEY', 'WFIRMA_APP_KEY'];
  const missing = required.filter((key) => !process.env[key]);

  // Note: We intentionally don't log which variables are missing
  // to avoid exposing configuration details
  return missing.length === 0;
};

// Note: Removed credential logging for security - even masked values
// can leak information about which services are configured
