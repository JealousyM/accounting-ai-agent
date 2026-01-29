import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from '@storybook/test';
import { Input } from './input';

const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
      description: 'Input type',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    error: {
      control: 'boolean',
      description: 'Shows error state with red border',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the input',
    },
  },
  args: {
    onChange: fn(),
    onFocus: fn(),
    onBlur: fn(),
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default state
export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

// Input types
export const Text: Story = {
  args: {
    type: 'text',
    placeholder: 'Enter your name',
  },
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'email@example.com',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password',
  },
};

export const Number: Story = {
  args: {
    type: 'number',
    placeholder: '0',
  },
};

export const Search: Story = {
  args: {
    type: 'search',
    placeholder: 'Search...',
  },
};

// States
export const WithValue: Story = {
  args: {
    defaultValue: 'Hello World',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled input',
  },
};

export const DisabledWithValue: Story = {
  args: {
    disabled: true,
    defaultValue: 'Cannot edit this',
  },
};

export const Error: Story = {
  args: {
    error: true,
    placeholder: 'Invalid input',
  },
};

export const ErrorWithValue: Story = {
  args: {
    error: true,
    defaultValue: 'Invalid email format',
  },
};

// With form context
export const WithLabel: Story = {
  render: (args) => (
    <div className="flex flex-col gap-2 w-72">
      <label htmlFor="labeled-input" className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Email Address
      </label>
      <Input {...args} id="labeled-input" />
    </div>
  ),
  args: {
    type: 'email',
    placeholder: 'you@example.com',
  },
};

export const WithLabelAndError: Story = {
  render: (args) => (
    <div className="flex flex-col gap-2 w-72">
      <label htmlFor="error-input" className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Email Address
      </label>
      <Input {...args} id="error-input" />
      <p className="text-sm text-red-500">Please enter a valid email address</p>
    </div>
  ),
  args: {
    type: 'email',
    error: true,
    defaultValue: 'invalid-email',
  },
};

export const WithHelperText: Story = {
  render: (args) => (
    <div className="flex flex-col gap-2 w-72">
      <label htmlFor="helper-input" className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Password
      </label>
      <Input {...args} id="helper-input" />
      <p className="text-sm text-gray-500 dark:text-gray-400">Must be at least 8 characters</p>
    </div>
  ),
  args: {
    type: 'password',
    placeholder: 'Create a password',
  },
};

// All variants showcase
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <div>
        <p className="text-xs text-gray-500 mb-1">Default</p>
        <Input placeholder="Default input" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">With Value</p>
        <Input defaultValue="Some value" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">Disabled</p>
        <Input disabled placeholder="Disabled" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">Error</p>
        <Input error placeholder="Error state" />
      </div>
    </div>
  ),
};

// Input types showcase
export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <div>
        <p className="text-xs text-gray-500 mb-1">Text</p>
        <Input type="text" placeholder="Text input" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">Email</p>
        <Input type="email" placeholder="email@example.com" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">Password</p>
        <Input type="password" placeholder="Password" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">Number</p>
        <Input type="number" placeholder="0" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">Search</p>
        <Input type="search" placeholder="Search..." />
      </div>
    </div>
  ),
};

// Dark mode comparison
export const DarkModeComparison: Story = {
  render: () => (
    <div className="flex gap-8">
      <div className="bg-white p-6 rounded-lg">
        <h3 className="text-sm font-medium mb-4 text-gray-900">Light Mode</h3>
        <div className="flex flex-col gap-3 w-64">
          <Input placeholder="Default" />
          <Input defaultValue="With value" />
          <Input error placeholder="Error" />
          <Input disabled placeholder="Disabled" />
        </div>
      </div>
      <div className="bg-gray-900 p-6 rounded-lg dark">
        <h3 className="text-sm font-medium mb-4 text-white">Dark Mode</h3>
        <div className="flex flex-col gap-3 w-64">
          <Input placeholder="Default" />
          <Input defaultValue="With value" />
          <Input error placeholder="Error" />
          <Input disabled placeholder="Disabled" />
        </div>
      </div>
    </div>
  ),
};

// Form example
export const FormExample: Story = {
  render: () => (
    <form className="flex flex-col gap-4 w-80 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex flex-col gap-2">
        <label htmlFor="form-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Full Name
        </label>
        <Input id="form-name" type="text" placeholder="John Doe" />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="form-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Email
        </label>
        <Input id="form-email" type="email" placeholder="john@example.com" />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="form-password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Password
        </label>
        <Input id="form-password" type="password" placeholder="Create a password" />
        <p className="text-xs text-gray-500 dark:text-gray-400">Minimum 8 characters</p>
      </div>
    </form>
  ),
};
