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

  if (missing.length > 0) {
    console.warn(`Missing wFirma environment variables: ${missing.join(', ')}`);
  }

  return missing.length === 0;
};

// Log which env file was loaded (for debugging)
if (process.env.NODE_ENV !== 'production') {
  console.log(`[ENV] Loaded from: ${result.parsed ? envPath : 'default location'}`);
  console.log(`[ENV] WFIRMA_ACCESS_KEY: ${process.env.WFIRMA_ACCESS_KEY ? '***' + process.env.WFIRMA_ACCESS_KEY.slice(-4) : 'NOT SET'}`);
  console.log(`[ENV] WFIRMA_COMPANY_ID: ${process.env.WFIRMA_COMPANY_ID || 'NOT SET'}`);
}
