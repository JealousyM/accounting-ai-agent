import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from '@storybook/test';
import { ConversationList } from './ConversationList';

const defaultTranslations = {
  noConversations: 'No conversations yet',
  startNewChat: 'Start a new chat to begin',
  deleteConfirm: 'Are you sure you want to delete this conversation?',
  yesterday: 'Yesterday',
  messages: 'messages',
  deleteTitle: 'Delete conversation',
  deleteWarning: 'This action cannot be undone.',
  deleteCancel: 'Cancel',
  deleteButton: 'Delete',
};

const mockConversations = [
  {
    id: '1',
    title: 'Invoice questions',
    lastMessage: 'How do I create a new invoice?',
    messageCount: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Tax calculations',
    lastMessage: 'What is the VAT rate for services?',
    messageCount: 12,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    title: 'Customer management',
    lastMessage: 'How to add a new customer to the system?',
    messageCount: 3,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

const meta = {
  title: 'Chat/ConversationList',
  component: ConversationList,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    isLoading: {
      control: 'boolean',
      description: 'Shows loading spinner',
    },
    currentId: {
      control: 'text',
      description: 'ID of the currently selected conversation',
    },
  },
  args: {
    onSelect: fn(),
    onDelete: fn(),
    translations: defaultTranslations,
  },
} satisfies Meta<typeof ConversationList>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default state with several conversations
export const Default: Story = {
  args: {
    conversations: mockConversations,
    currentId: null,
    isLoading: false,
  },
};

// Empty state - no conversations
export const Empty: Story = {
  args: {
    conversations: [],
    currentId: null,
    isLoading: false,
  },
};

// Loading state
export const Loading: Story = {
  args: {
    conversations: [],
    currentId: null,
    isLoading: true,
  },
};

// With a selected conversation
export const WithSelected: Story = {
  args: {
    conversations: mockConversations,
    currentId: '2',
    isLoading: false,
  },
};

// Scrollable list with many conversations
export const ManyConversations: Story = {
  decorators: [
    (Story) => (
      <div className="w-72 h-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-auto">
        <Story />
      </div>
    ),
  ],
  args: {
    conversations: [
      ...mockConversations,
      {
        id: '4',
        title: 'Expense tracking',
        lastMessage: 'How to categorize business expenses?',
        messageCount: 8,
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        updatedAt: new Date(Date.now() - 259200000).toISOString(),
      },
      {
        id: '5',
        title: 'Report generation',
        lastMessage: 'Can you generate a monthly report?',
        messageCount: 15,
        createdAt: new Date(Date.now() - 345600000).toISOString(),
        updatedAt: new Date(Date.now() - 345600000).toISOString(),
      },
      {
        id: '6',
        title: 'Payment reminders',
        lastMessage: 'Set up automatic payment reminders',
        messageCount: 4,
        createdAt: new Date(Date.now() - 432000000).toISOString(),
        updatedAt: new Date(Date.now() - 432000000).toISOString(),
      },
      {
        id: '7',
        title: 'Bank integration',
        lastMessage: 'How to connect my bank account?',
        messageCount: 7,
        createdAt: new Date(Date.now() - 518400000).toISOString(),
        updatedAt: new Date(Date.now() - 518400000).toISOString(),
      },
      {
        id: '8',
        title: 'Annual summary',
        lastMessage: 'Generate annual financial summary',
        messageCount: 22,
        createdAt: new Date(Date.now() - 604800000).toISOString(),
        updatedAt: new Date(Date.now() - 604800000).toISOString(),
      },
      {
        id: '9',
        title: 'Contractor payments',
        lastMessage: 'How to process contractor invoices?',
        messageCount: 6,
        createdAt: new Date(Date.now() - 691200000).toISOString(),
        updatedAt: new Date(Date.now() - 691200000).toISOString(),
      },
      {
        id: '10',
        title: 'Currency conversion',
        lastMessage: 'Handle multi-currency transactions',
        messageCount: 9,
        createdAt: new Date(Date.now() - 777600000).toISOString(),
        updatedAt: new Date(Date.now() - 777600000).toISOString(),
      },
    ],
    currentId: '5',
    isLoading: false,
  },
};

// With long titles (truncation test)
export const LongTitles: Story = {
  args: {
    conversations: [
      {
        id: '1',
        title: 'This is a very long conversation title that should be truncated',
        lastMessage: 'This is also a very long last message that should be truncated in the UI',
        messageCount: 42,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Another extremely long title for testing purposes',
        lastMessage: 'Short message',
        messageCount: 3,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    currentId: null,
    isLoading: false,
  },
};

// Dark mode comparison
export const DarkModeComparison: Story = {
  decorators: [
    (Story) => (
      <div className="flex gap-4">
        <div className="w-72 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-200 text-sm font-medium text-gray-900">
            Light Mode
          </div>
          <Story />
        </div>
        <div className="w-72 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden dark">
          <div className="px-3 py-2 border-b border-gray-700 text-sm font-medium text-white">
            Dark Mode
          </div>
          <Story />
        </div>
      </div>
    ),
  ],
  args: {
    conversations: mockConversations.slice(0, 2),
    currentId: '1',
    isLoading: false,
  },
};

// Polish translations
export const PolishTranslations: Story = {
  args: {
    conversations: [],
    currentId: null,
    isLoading: false,
    translations: {
      noConversations: 'Brak rozmow',
      startNewChat: 'Rozpocznij nowy czat',
      deleteConfirm: 'Czy na pewno chcesz usunac te rozmowe?',
      yesterday: 'Wczoraj',
      messages: 'wiadomosci',
      deleteTitle: 'Usun rozmowe',
      deleteWarning: 'Tej operacji nie mozna cofnac.',
      deleteCancel: 'Anuluj',
      deleteButton: 'Usun',
    },
  },
};
