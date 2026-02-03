import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { MessageBubble } from './MessageBubble';

const meta = {
  title: 'Chat/MessageBubble',
  component: MessageBubble,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-gray-100 dark:bg-gray-900 p-6 rounded-lg min-w-[400px] max-w-[600px]">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    message: {
      description: 'The chat message object containing role, content, and metadata',
    },
    translations: {
      description: 'Translation strings for the component',
    },
    toolsTranslations: {
      description: 'Translation strings for tool names',
    },
  },
} satisfies Meta<typeof MessageBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default translations used across stories
const defaultTranslations = {
  toolsUsed: 'Tools used:',
};

const defaultToolsTranslations = {
  companyInfo: 'Company Info',
  contractors: 'Contractors',
  financials: 'Financial Summary',
  invoices: 'Invoices',
  createContractor: 'Create Contractor',
  updateContractor: 'Update Contractor',
  deleteContractor: 'Delete Contractor',
};

const defaultTTSTranslations = {
  play: 'Read aloud',
  stop: 'Stop reading',
};

// User Message
export const UserMessage: Story = {
  args: {
    message: {
      id: '1',
      role: 'user',
      content: 'Can you show me the list of invoices from last month?',
      timestamp: new Date().toISOString(),
    },
    translations: defaultTranslations,
    toolsTranslations: defaultToolsTranslations,
    ttsTranslations: defaultTTSTranslations,
  },
};

// Assistant Message
export const AssistantMessage: Story = {
  args: {
    message: {
      id: '2',
      role: 'assistant',
      content: 'Here are the invoices from last month. You have 12 invoices with a total value of 45,000 PLN.',
      timestamp: new Date().toISOString(),
    },
    translations: defaultTranslations,
    toolsTranslations: defaultToolsTranslations,
    ttsTranslations: defaultTTSTranslations,
  },
};

// Message with Tool Calls
export const WithToolCalls: Story = {
  args: {
    message: {
      id: '3',
      role: 'assistant',
      content: 'I found 5 contractors in your database. Here are the details:\n\n1. **ABC Company** - Warsaw\n2. **XYZ Ltd** - Krakow\n3. **Tech Solutions** - Gdansk',
      timestamp: new Date().toISOString(),
      toolCalls: [
        { id: 'tc1', name: 'get_contractors', arguments: '{}' },
        { id: 'tc2', name: 'get_company_info', arguments: '{}' },
      ],
    },
    translations: defaultTranslations,
    toolsTranslations: defaultToolsTranslations,
    ttsTranslations: defaultTTSTranslations,
  },
};

// Message with Markdown content
export const WithMarkdown: Story = {
  args: {
    message: {
      id: '4',
      role: 'assistant',
      content: `Here's a summary of your financial data:

## Revenue Overview

| Month | Revenue | Expenses | Profit |
|-------|---------|----------|--------|
| Jan   | 50,000  | 30,000   | 20,000 |
| Feb   | 55,000  | 32,000   | 23,000 |
| Mar   | 48,000  | 28,000   | 20,000 |

### Key Insights

- Revenue increased by **10%** compared to last quarter
- Top expense category: *Operating costs*
- Recommended action: Review supplier contracts

\`\`\`json
{
  "totalRevenue": 153000,
  "totalExpenses": 90000,
  "netProfit": 63000
}
\`\`\`

You can download the full report [here](#).`,
      timestamp: new Date().toISOString(),
    },
    translations: defaultTranslations,
    toolsTranslations: defaultToolsTranslations,
    ttsTranslations: defaultTTSTranslations,
  },
};

// Long Message
export const LongMessage: Story = {
  args: {
    message: {
      id: '5',
      role: 'assistant',
      content: `Based on my analysis of your accounting data, I've identified several important points that require your attention.

First, your accounts receivable has increased by 25% over the past quarter, which might indicate potential cash flow issues if customers continue to delay payments. I recommend implementing stricter payment terms or offering early payment discounts.

Second, your operating expenses have remained stable, which is positive. However, there's an opportunity to optimize costs in the following areas:

1. **Office supplies** - Consider switching to a bulk purchasing agreement
2. **Software subscriptions** - Review unused licenses
3. **Utility costs** - Evaluate energy-efficient alternatives

Third, your tax obligations for the upcoming quarter are estimated at approximately 15,000 PLN based on current revenue projections. Make sure to set aside adequate funds for this payment.

Finally, I noticed that several invoices from December are still pending. Would you like me to generate a reminder list for these outstanding payments?`,
      timestamp: new Date().toISOString(),
    },
    translations: defaultTranslations,
    toolsTranslations: defaultToolsTranslations,
    ttsTranslations: defaultTTSTranslations,
  },
};

// Message with Model Info
export const WithModelInfo: Story = {
  args: {
    message: {
      id: '6',
      role: 'assistant',
      content: 'Your company information has been retrieved successfully. The registered address is Warsaw, Poland.',
      timestamp: new Date().toISOString(),
      metadata: {
        model: 'gpt-4-turbo',
        provider: 'openai',
        tokens: {
          prompt: 150,
          completion: 45,
        },
      },
    },
    translations: defaultTranslations,
    toolsTranslations: defaultToolsTranslations,
    ttsTranslations: defaultTTSTranslations,
  },
};

// System Message (should render null)
export const SystemMessage: Story = {
  args: {
    message: {
      id: '7',
      role: 'system',
      content: 'You are a helpful accounting assistant.',
      timestamp: new Date().toISOString(),
    },
    translations: defaultTranslations,
    toolsTranslations: defaultToolsTranslations,
    ttsTranslations: defaultTTSTranslations,
  },
  parameters: {
    docs: {
      description: {
        story: 'System messages are hidden and render as null.',
      },
    },
  },
};

// Conversation Flow
export const ConversationFlow: Story = {
  args: {
    message: {
      id: '1',
      role: 'user' as const,
      content: 'Show me all invoices from January.',
      timestamp: new Date().toISOString(),
    },
    translations: defaultTranslations,
    toolsTranslations: defaultToolsTranslations,
    ttsTranslations: defaultTTSTranslations,
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <MessageBubble
        message={{
          id: '1',
          role: 'user',
          content: 'Show me all invoices from January.',
          timestamp: new Date(Date.now() - 60000).toISOString(),
        }}
        translations={defaultTranslations}
        toolsTranslations={defaultToolsTranslations}
        ttsTranslations={defaultTTSTranslations}
      />
      <MessageBubble
        message={{
          id: '2',
          role: 'assistant',
          content: 'I found 8 invoices from January 2024 with a total value of **32,500 PLN**. Would you like me to provide more details?',
          timestamp: new Date(Date.now() - 30000).toISOString(),
          toolCalls: [{ id: 'tc1', name: 'get_invoices', arguments: '{"month": "2024-01"}' }],
          metadata: { model: 'claude-3-opus' },
        }}
        translations={defaultTranslations}
        toolsTranslations={defaultToolsTranslations}
        ttsTranslations={defaultTTSTranslations}
      />
      <MessageBubble
        message={{
          id: '3',
          role: 'user',
          content: 'Yes, please show me the unpaid ones.',
          timestamp: new Date().toISOString(),
        }}
        translations={defaultTranslations}
        toolsTranslations={defaultToolsTranslations}
        ttsTranslations={defaultTTSTranslations}
      />
    </div>
  ),
  decorators: [
    (Story) => (
      <div className="bg-gray-100 dark:bg-gray-900 p-6 rounded-lg min-w-[500px] max-w-[700px]">
        <Story />
      </div>
    ),
  ],
};

// Dark Mode Comparison
export const DarkModeComparison: Story = {
  args: {
    message: { id: '1', role: 'user' as const, content: 'Hello', timestamp: new Date().toISOString() },
    translations: defaultTranslations,
    toolsTranslations: defaultToolsTranslations,
    ttsTranslations: defaultTTSTranslations,
  },
  render: () => (
    <div className="flex gap-8">
      <div className="bg-gray-100 p-6 rounded-lg min-w-[350px]">
        <h3 className="text-sm font-medium mb-4 text-gray-900">Light Mode</h3>
        <div className="flex flex-col gap-4">
          <MessageBubble
            message={{
              id: '1',
              role: 'user',
              content: 'Hello, show me my invoices.',
              timestamp: new Date().toISOString(),
            }}
            translations={defaultTranslations}
            toolsTranslations={defaultToolsTranslations}
            ttsTranslations={defaultTTSTranslations}
          />
          <MessageBubble
            message={{
              id: '2',
              role: 'assistant',
              content: 'Here are your recent invoices.',
              timestamp: new Date().toISOString(),
              toolCalls: [{ id: 'tc1', name: 'get_invoices', arguments: '{}' }],
            }}
            translations={defaultTranslations}
            toolsTranslations={defaultToolsTranslations}
            ttsTranslations={defaultTTSTranslations}
          />
        </div>
      </div>
      <div className="bg-gray-900 p-6 rounded-lg min-w-[350px] dark">
        <h3 className="text-sm font-medium mb-4 text-white">Dark Mode</h3>
        <div className="flex flex-col gap-4">
          <MessageBubble
            message={{
              id: '3',
              role: 'user',
              content: 'Hello, show me my invoices.',
              timestamp: new Date().toISOString(),
            }}
            translations={defaultTranslations}
            toolsTranslations={defaultToolsTranslations}
            ttsTranslations={defaultTTSTranslations}
          />
          <MessageBubble
            message={{
              id: '4',
              role: 'assistant',
              content: 'Here are your recent invoices.',
              timestamp: new Date().toISOString(),
              toolCalls: [{ id: 'tc1', name: 'get_invoices', arguments: '{}' }],
            }}
            translations={defaultTranslations}
            toolsTranslations={defaultToolsTranslations}
            ttsTranslations={defaultTTSTranslations}
          />
        </div>
      </div>
    </div>
  ),
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
};

// All Tool Types
export const AllToolTypes: Story = {
  args: {
    message: { id: '1', role: 'user' as const, content: 'Hello', timestamp: new Date().toISOString() },
    translations: defaultTranslations,
    toolsTranslations: defaultToolsTranslations,
    ttsTranslations: defaultTTSTranslations,
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <MessageBubble
        message={{
          id: '1',
          role: 'assistant',
          content: 'Retrieved company information.',
          timestamp: new Date().toISOString(),
          toolCalls: [{ id: 'tc1', name: 'get_company_info', arguments: '{}' }],
        }}
        translations={defaultTranslations}
        toolsTranslations={defaultToolsTranslations}
        ttsTranslations={defaultTTSTranslations}
      />
      <MessageBubble
        message={{
          id: '2',
          role: 'assistant',
          content: 'Retrieved contractors list.',
          timestamp: new Date().toISOString(),
          toolCalls: [{ id: 'tc2', name: 'get_contractors', arguments: '{}' }],
        }}
        translations={defaultTranslations}
        toolsTranslations={defaultToolsTranslations}
        ttsTranslations={defaultTTSTranslations}
      />
      <MessageBubble
        message={{
          id: '3',
          role: 'assistant',
          content: 'Retrieved financial summary.',
          timestamp: new Date().toISOString(),
          toolCalls: [{ id: 'tc3', name: 'get_financial_summary', arguments: '{}' }],
        }}
        translations={defaultTranslations}
        toolsTranslations={defaultToolsTranslations}
        ttsTranslations={defaultTTSTranslations}
      />
      <MessageBubble
        message={{
          id: '4',
          role: 'assistant',
          content: 'Retrieved invoices.',
          timestamp: new Date().toISOString(),
          toolCalls: [{ id: 'tc4', name: 'get_invoices', arguments: '{}' }],
        }}
        translations={defaultTranslations}
        toolsTranslations={defaultToolsTranslations}
        ttsTranslations={defaultTTSTranslations}
      />
      <MessageBubble
        message={{
          id: '5',
          role: 'assistant',
          content: 'Created new contractor.',
          timestamp: new Date().toISOString(),
          toolCalls: [{ id: 'tc5', name: 'create_contractor', arguments: '{}' }],
        }}
        translations={defaultTranslations}
        toolsTranslations={defaultToolsTranslations}
        ttsTranslations={defaultTTSTranslations}
      />
      <MessageBubble
        message={{
          id: '6',
          role: 'assistant',
          content: 'Updated contractor.',
          timestamp: new Date().toISOString(),
          toolCalls: [{ id: 'tc6', name: 'update_contractor', arguments: '{}' }],
        }}
        translations={defaultTranslations}
        toolsTranslations={defaultToolsTranslations}
        ttsTranslations={defaultTTSTranslations}
      />
      <MessageBubble
        message={{
          id: '7',
          role: 'assistant',
          content: 'Deleted contractor.',
          timestamp: new Date().toISOString(),
          toolCalls: [{ id: 'tc7', name: 'delete_contractor', arguments: '{}' }],
        }}
        translations={defaultTranslations}
        toolsTranslations={defaultToolsTranslations}
        ttsTranslations={defaultTTSTranslations}
      />
    </div>
  ),
};
