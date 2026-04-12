import { apiClient } from './api-client';

// ============================================
// TYPES
// ============================================

export interface ReferralInfo {
  referralCode: string;
  shareLink: string;
  stats: {
    totalReferred: number;
    converted: number;
    pending: number;
    totalRewardsEarned: number;
  };
}

export interface ReferralDetail {
  id: string;
  referredUserName: string;
  status: 'pending' | 'converted' | 'revoked';
  createdAt: string;
  convertedAt: string | null;
}

export interface ReferralStats {
  referrals: ReferralDetail[];
}

export interface ValidateCodeResult {
  valid: boolean;
  referrerFirstName?: string;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get current user's referral info (code, link, stats summary)
 */
export const getReferralInfo = async (): Promise<ReferralInfo> => {
  return apiClient.get<ReferralInfo>('/api/referral');
};

/**
 * Get detailed referral stats with individual referral list
 */
export const getReferralStats = async (): Promise<ReferralStats> => {
  return apiClient.get<ReferralStats>('/api/referral/stats');
};

/**
 * Validate a referral code (used during registration)
 */
export const validateReferralCode = async (code: string): Promise<ValidateCodeResult> => {
  return apiClient.post<ValidateCodeResult>('/api/referral/validate', { code });
};
