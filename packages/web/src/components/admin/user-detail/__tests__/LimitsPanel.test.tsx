import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LimitsPanel } from '../LimitsPanel';
import * as adminApi from '@/lib/api/admin';

// Mock the admin API
jest.mock('@/lib/api/admin', () => ({
  updateUserLimits: jest.fn(),
  resetUserUsage: jest.fn(),
}));

// Mock LocaleContext
jest.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

// Mock translation files
jest.mock('@/i18n/locales/en.json', () => ({
  admin: {
    userDetail: {
      limits: {
        title: 'Usage limits',
        aiMessages: 'AI messages limit',
        wfirmaRequests: 'wFirma requests limit',
        save: 'Save limits',
        saved: 'Limits updated',
        resetAi: 'Reset AI usage',
        resetWfirma: 'Reset wFirma usage',
        resetBoth: 'Reset both',
        confirmReset: 'Reset usage counter to 0?',
        confirm: 'Confirm',
        cancel: 'Cancel',
        used: 'Used: {used} / {limit}',
      },
    },
  },
}));
jest.mock('@/i18n/locales/pl.json', () => ({ admin: { userDetail: { limits: {} } } }));
jest.mock('@/i18n/locales/ru.json', () => ({ admin: { userDetail: { limits: {} } } }));

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'user' as const,
  locale: 'en',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  deletedAt: null,
  subscriptionPlan: 'free',
  subscriptionStatus: 'active',
  subscriptionEndDate: null,
  aiMessagesLimit: 100,
  aiMessagesUsed: 30,
  wfirmaRequestsLimit: 500,
  wfirmaRequestsUsed: 10,
  ttsCharactersUsed: 0,
  ttsCostUsd: 0,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

describe('LimitsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders inputs with initial values from user', () => {
    render(<LimitsPanel user={mockUser} />, { wrapper: createWrapper() });

    const aiInput = screen.getByLabelText('AI messages limit') as HTMLInputElement;
    const wfirmaInput = screen.getByLabelText('wFirma requests limit') as HTMLInputElement;

    expect(aiInput.value).toBe('100');
    expect(wfirmaInput.value).toBe('500');

    expect(screen.getByText('Used: 30 / 100')).toBeInTheDocument();
    expect(screen.getByText('Used: 10 / 500')).toBeInTheDocument();
  });

  it('clicking Reset AI usage shows confirmation; Confirm calls resetUserUsage; Cancel hides without API call', async () => {
    const mockReset = jest.fn().mockResolvedValue({ id: 'user-1', aiMessagesUsed: 0, wfirmaRequestsUsed: 10 });
    (adminApi.resetUserUsage as jest.Mock).mockImplementation(mockReset);

    render(<LimitsPanel user={mockUser} />, { wrapper: createWrapper() });

    // Click Reset AI usage
    fireEvent.click(screen.getByText('Reset AI usage'));

    // Confirmation row should appear
    expect(screen.getByText('Reset usage counter to 0?')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    // Test Cancel — hides confirmation without calling API
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Reset usage counter to 0?')).not.toBeInTheDocument();
    expect(mockReset).not.toHaveBeenCalled();

    // Show confirmation again and click Confirm
    fireEvent.click(screen.getByText('Reset AI usage'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith('user-1', 'ai');
    });
  });

  it('clicking save with changed values calls updateUserLimits', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({ id: 'user-1', aiMessagesLimit: 200, wfirmaRequestsLimit: 500 });
    (adminApi.updateUserLimits as jest.Mock).mockImplementation(mockUpdate);

    render(<LimitsPanel user={mockUser} />, { wrapper: createWrapper() });

    const aiInput = screen.getByLabelText('AI messages limit');
    fireEvent.change(aiInput, { target: { value: '200' } });

    fireEvent.click(screen.getByText('Save limits'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('user-1', {
        aiMessagesLimit: 200,
        wfirmaRequestsLimit: 500,
      });
    });
  });
});
