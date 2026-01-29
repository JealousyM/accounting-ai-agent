import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from '@storybook/test';
import { ChatInput } from './ChatInput';

// Default translations for stories
const defaultTranslations = {
  placeholder: 'Type your message...',
  hint: 'Press Enter to send, Shift+Enter for new line',
  voiceStart: 'Start voice input',
  voiceStop: 'Stop voice input',
  voiceListening: 'Listening...',
  voiceNotSupported: 'Voice input not supported',
  voicePermissionDenied: 'Microphone permission denied',
  voiceError: 'Voice input error',
};

const polishTranslations = {
  placeholder: 'Wpisz wiadomosc...',
  hint: 'Nacisnij Enter aby wyslac, Shift+Enter dla nowej linii',
  voiceStart: 'Rozpocznij dyktowanie',
  voiceStop: 'Zatrzymaj dyktowanie',
  voiceListening: 'Nasluchiwanie...',
  voiceNotSupported: 'Dyktowanie glosowe nie jest obslugiwane',
  voicePermissionDenied: 'Brak dostepu do mikrofonu',
  voiceError: 'Blad dyktowania',
};

const russianTranslations = {
  placeholder: 'Vvedite soobshchenie...',
  hint: 'Enter - otpravit, Shift+Enter - novaya stroka',
  voiceStart: 'Nachat golosovoj vvod',
  voiceStop: 'Ostanovit golosovoj vvod',
  voiceListening: 'Slushayu...',
  voiceNotSupported: 'Golosovoj vvod ne podderzhivaetsya',
  voicePermissionDenied: 'Dostup k mikrofonu zapreshchen',
  voiceError: 'Oshibka golosovogo vvoda',
};

const meta = {
  title: 'Chat/ChatInput',
  component: ChatInput,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Disables the input and send button',
    },
    placeholder: {
      control: 'text',
      description: 'Custom placeholder text (overrides translations)',
    },
    locale: {
      control: 'select',
      options: ['en', 'pl', 'ru'],
      description: 'Locale for voice dictation',
    },
  },
  args: {
    onSend: fn(),
    translations: defaultTranslations,
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl mx-auto">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChatInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state of the ChatInput component.
 * Shows the input field with voice button (when supported by browser).
 */
export const Default: Story = {
  args: {
    translations: defaultTranslations,
    locale: 'en',
  },
};

/**
 * Disabled state - typically shown while the AI is processing a response.
 * The input field and buttons are not interactive.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    translations: defaultTranslations,
    locale: 'en',
  },
};

/**
 * Custom placeholder text that overrides the translations.
 * Useful for contextual hints based on the current conversation.
 */
export const WithPlaceholder: Story = {
  args: {
    placeholder: 'Ask me about your invoices...',
    translations: defaultTranslations,
    locale: 'en',
  },
};

/**
 * Sending state - shown while the AI is thinking.
 * The component is disabled and displays a loading spinner on the send button.
 */
export const Sending: Story = {
  args: {
    disabled: true,
    translations: {
      ...defaultTranslations,
      hint: 'AI is thinking...',
    },
    locale: 'en',
  },
};

/**
 * Demonstrates the voice input feature.
 * The microphone button appears when speech recognition is supported.
 * Note: Voice support depends on browser capabilities (works in Chrome, Edge).
 */
export const WithVoiceInput: Story = {
  args: {
    translations: defaultTranslations,
    locale: 'en',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the voice input button when speech recognition is supported. The hook detects browser support automatically.',
      },
    },
  },
};

/**
 * Polish locale with Polish translations.
 */
export const PolishLocale: Story = {
  args: {
    translations: polishTranslations,
    locale: 'pl',
  },
};

/**
 * Russian locale with Russian translations.
 */
export const RussianLocale: Story = {
  args: {
    translations: russianTranslations,
    locale: 'ru',
  },
};

/**
 * Side-by-side comparison of all supported locales.
 */
export const AllLocales: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">English</h3>
        <ChatInput
          onSend={fn()}
          translations={defaultTranslations}
          locale="en"
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Polish</h3>
        <ChatInput
          onSend={fn()}
          translations={polishTranslations}
          locale="pl"
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Russian</h3>
        <ChatInput
          onSend={fn()}
          translations={russianTranslations}
          locale="ru"
        />
      </div>
    </div>
  ),
};

/**
 * Side-by-side comparison of light and dark mode styling.
 * Use the theme switcher in the toolbar to test individual modes.
 */
export const DarkModeComparison: Story = {
  render: () => (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="flex-1 bg-gray-100 p-4 rounded-lg">
        <h3 className="text-sm font-medium mb-4 text-gray-900">Light Mode</h3>
        <ChatInput
          onSend={fn()}
          translations={defaultTranslations}
          locale="en"
        />
      </div>
      <div className="flex-1 bg-gray-900 p-4 rounded-lg dark">
        <h3 className="text-sm font-medium mb-4 text-white">Dark Mode</h3>
        <ChatInput
          onSend={fn()}
          translations={defaultTranslations}
          locale="en"
        />
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'light' },
  },
};

/**
 * Comparison of all component states in one view.
 */
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Default</h3>
        <ChatInput
          onSend={fn()}
          translations={defaultTranslations}
          locale="en"
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Disabled (Sending)</h3>
        <ChatInput
          onSend={fn()}
          disabled={true}
          translations={{
            ...defaultTranslations,
            hint: 'AI is thinking...',
          }}
          locale="en"
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Custom Placeholder</h3>
        <ChatInput
          onSend={fn()}
          placeholder="Ask about your accounting data..."
          translations={defaultTranslations}
          locale="en"
        />
      </div>
    </div>
  ),
};
