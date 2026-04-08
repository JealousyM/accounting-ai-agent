import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DangerZone } from '../DangerZone';
import * as adminApi from '@/lib/api/admin';

// Mock admin API
jest.mock('@/lib/api/admin', () => ({
  softDeleteUser: jest.fn(),
  hardDeleteUser: jest.fn(),
}));

// Mock LocaleContext
jest.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

// Mock AuthContext — default: current admin is a different user
const mockUseAuth = jest.fn(() => ({ user: { id: 'admin-999' } }));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock translation files
jest.mock('@/i18n/locales/en.json', () => ({
  admin: {
    userDetail: {
      danger: {
        title: 'Danger zone',
        softDelete: 'Soft delete user',
        softDeleteHint: 'User will be hidden from lists; data is preserved.',
        softDeleteConfirm: 'Soft-delete this user?',
        hardDelete: 'Hard delete user',
        hardDeleteHint: 'Irreversible. Removes the user and all related data.',
        hardDeleteConfirm: "To confirm, type the user's email exactly:",
        confirm: 'Confirm',
        cancel: 'Cancel',
        selfActionDisabled: 'You cannot perform this action on your own account',
      },
    },
  },
}));
jest.mock('@/i18n/locales/pl.json', () => ({ admin: { userDetail: { danger: {} } } }));
jest.mock('@/i18n/locales/ru.json', () => ({ admin: { userDetail: { danger: {} } } }));

const mockUser = {
  id: 'user-1',
  email: 'target@example.com',
  firstName: 'Target',
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

describe('DangerZone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'admin-999' } });
  });

  describe('Hard delete', () => {
    it('opens modal on button click; Confirm is disabled until email matches', () => {
      render(<DangerZone user={mockUser} />, { wrapper: createWrapper() });

      // Find the hard delete trigger button specifically in the card (not inside a modal)
      const hardDeleteButtons = screen.getAllByRole('button', { name: 'Hard delete user' });
      // Before modal opens there is exactly one such button
      expect(hardDeleteButtons).toHaveLength(1);
      fireEvent.click(hardDeleteButtons[0]);

      // Modal should be visible — the email input appears
      const emailInput = screen.getByRole('textbox');
      expect(emailInput).toBeInTheDocument();

      // Confirm button starts disabled
      const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmBtn).toBeDisabled();

      // Type wrong email — still disabled
      fireEvent.change(emailInput, { target: { value: 'wrong@email.com' } });
      expect(confirmBtn).toBeDisabled();

      // Type correct email — enabled
      fireEvent.change(emailInput, { target: { value: 'target@example.com' } });
      expect(confirmBtn).not.toBeDisabled();
    });

    it('calls hardDeleteUser and navigates on confirm', async () => {
      const mockHard = jest.fn().mockResolvedValue(undefined);
      (adminApi.hardDeleteUser as jest.Mock).mockImplementation(mockHard);

      render(<DangerZone user={mockUser} />, { wrapper: createWrapper() });

      fireEvent.click(screen.getAllByRole('button', { name: 'Hard delete user' })[0]);

      const emailInput = screen.getByRole('textbox');
      fireEvent.change(emailInput, { target: { value: 'target@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

      await waitFor(() => {
        expect(mockHard).toHaveBeenCalledWith('user-1');
        expect(mockPush).toHaveBeenCalledWith('/admin');
      });
    });
  });

  describe('Self-action guard', () => {
    it('disables both buttons and shows warning when user.id === currentAdminId', () => {
      // currentAdmin is the same user being viewed
      mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });

      render(<DangerZone user={mockUser} />, { wrapper: createWrapper() });

      // Self-action warning should be visible
      expect(
        screen.getByText('You cannot perform this action on your own account')
      ).toBeInTheDocument();

      // Soft delete button should be disabled
      expect(screen.getByRole('button', { name: 'Soft delete user' })).toBeDisabled();

      // Hard delete button — find by its role among all buttons
      const hardDeleteBtn = screen.getAllByRole('button', { name: 'Hard delete user' })[0];
      expect(hardDeleteBtn).toBeDisabled();
    });
  });
});
