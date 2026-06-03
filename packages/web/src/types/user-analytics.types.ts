export type AnalyticsRange = 'week' | 'month' | 'year';

export interface UserAnalytics {
  range: AnalyticsRange;
  conversations: {
    totalInRange: number;
  };
  toolUsage: {
    totalCalls: number;
    topTools: Array<{ toolName: string; count: number }>;
  };
  activityByDay: Array<{ date: string; conversations: number; toolCalls: number }>;
  usageQuota: {
    used: number;
    limit: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
