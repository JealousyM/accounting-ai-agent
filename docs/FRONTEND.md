# Frontend Documentation

This document describes the Next.js frontend application for the Accounting AI Agent.

## Overview

| Property | Value |
|----------|-------|
| Framework | Next.js 15 (App Router) |
| React | 19 (with Server Components) |
| Styling | Tailwind CSS v4 |
| State Management | Zustand |
| Data Fetching | React Query |
| Forms | React Hook Form + Zod |
| i18n | next-intl |

## Project Structure

```
packages/web/src/
├── app/                        # Next.js App Router
│   ├── [locale]/               # Locale-prefixed routes
│   │   ├── (auth)/             # Auth layout group
│   │   │   ├── login/          # Login page
│   │   │   └── register/       # Registration page
│   │   ├── (dashboard)/        # Dashboard layout group
│   │   │   ├── chat/           # AI Chat page
│   │   │   ├── invoices/       # Invoices page
│   │   │   └── settings/       # Settings page
│   │   ├── layout.tsx          # Root layout with i18n
│   │   └── page.tsx            # Home page
│   ├── api/                    # API routes (if needed)
│   └── globals.css             # Global styles
│
├── components/                 # React components
│   ├── auth/                   # Authentication components
│   │   ├── LoginForm.tsx
│   │   ├── RegistrationForm.tsx
│   │   └── OAuthButtons.tsx
│   ├── chat/                   # AI Chat components
│   │   ├── ChatContainer.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   └── ChatMessage.tsx
│   ├── layout/                 # Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   └── ui/                     # Base UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Card.tsx
│       └── ...
│
├── hooks/                      # Custom React hooks
│   ├── useAuth.ts              # Authentication hook
│   ├── useChat.ts              # Chat functionality hook
│   └── useWFirma.ts            # wFirma data hook
│
├── lib/                        # Utilities
│   ├── api/                    # API client
│   │   ├── client.ts           # Axios instance
│   │   ├── auth.ts             # Auth API calls
│   │   └── chat.ts             # Chat API calls
│   ├── validations/            # Zod schemas
│   │   └── auth.ts
│   └── utils.ts                # Helper functions
│
├── i18n/                       # Internationalization
│   ├── config.ts               # i18n configuration
│   └── locales/                # Translation files
│       ├── en.json
│       ├── pl.json
│       └── ru.json
│
├── stores/                     # Zustand stores
│   ├── authStore.ts
│   └── chatStore.ts
│
└── types/                      # TypeScript types
    ├── auth.ts
    ├── chat.ts
    └── api.ts
```

## Key Features

### Server Components

Next.js 15 with React 19 enables Server Components by default:

```tsx
// Server Component (default)
export default async function InvoicesPage() {
  const invoices = await fetchInvoices(); // Server-side data fetching

  return (
    <div>
      <InvoiceList invoices={invoices} />
    </div>
  );
}
```

### Client Components

Use `'use client'` directive for interactive components:

```tsx
'use client';

import { useState } from 'react';

export function ChatInput() {
  const [message, setMessage] = useState('');

  return (
    <input
      value={message}
      onChange={(e) => setMessage(e.target.value)}
    />
  );
}
```

## Internationalization

### Supported Languages

| Language | Code | Default |
|----------|------|---------|
| English | en | Yes |
| Polish | pl | No |
| Russian | ru | No |

### Route Structure

```
/en/login     # English login
/pl/login     # Polish login
/ru/login     # Russian login
```

### Translation Usage

```tsx
import { useTranslations } from 'next-intl';

export function LoginForm() {
  const t = useTranslations('auth');

  return (
    <form>
      <label>{t('email')}</label>
      <button>{t('login')}</button>
    </form>
  );
}
```

### Translation Files

```json
// locales/en.json
{
  "auth": {
    "email": "Email",
    "password": "Password",
    "login": "Sign In",
    "register": "Create Account"
  },
  "chat": {
    "placeholder": "Type your message...",
    "send": "Send"
  }
}
```

## State Management

### Zustand Store

```tsx
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  token: string | null;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'auth-storage' }
  )
);
```

### React Query

```tsx
// hooks/useChat.ts
import { useQuery, useMutation } from '@tanstack/react-query';

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (message: string) => api.sendMessage(message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
```

## API Client

### Configuration

```tsx
// lib/api/client.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token interceptor
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token refresh interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      await refreshToken();
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);

export default api;
```

### API Functions

```tsx
// lib/api/auth.ts
import api from './client';

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: RegisterInput) =>
    api.post('/auth/register', data),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  logout: () =>
    api.post('/auth/logout'),
};
```

## Form Handling

### Zod Validation

```tsx
// lib/validations/auth.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[!@#$%^&*]/, 'Must contain special character'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});
```

### React Hook Form

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/lib/validations/auth';

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    await authApi.login(data.email, data.password);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        {...register('email')}
        error={errors.email?.message}
      />
      <Input
        type="password"
        {...register('password')}
        error={errors.password?.message}
      />
      <Button type="submit" loading={isSubmitting}>
        Sign In
      </Button>
    </form>
  );
}
```

## UI Components

### Button Component

```tsx
// components/ui/Button.tsx
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        // Variant styles
        variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
        variant === 'secondary' && 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        variant === 'outline' && 'border border-gray-300 hover:bg-gray-50',
        variant === 'ghost' && 'hover:bg-gray-100',
        // Size styles
        size === 'sm' && 'h-8 px-3 text-sm',
        size === 'md' && 'h-10 px-4',
        size === 'lg' && 'h-12 px-6 text-lg',
        // Disabled state
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="mr-2" />}
      {children}
    </button>
  );
}
```

### Input Component

```tsx
// components/ui/Input.tsx
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-md border border-gray-300 px-3 py-2',
            'focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);
```

## Chat Interface

### Chat Container

```tsx
// components/chat/ChatContainer.tsx
'use client';

import { useChat } from '@/hooks/useChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export function ChatContainer() {
  const { messages, sendMessage, isLoading } = useChat();

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
```

### Message Component

```tsx
// components/chat/ChatMessage.tsx
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div className={cn(
      'flex',
      role === 'user' ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        'max-w-[80%] rounded-lg px-4 py-2',
        role === 'user'
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-900'
      )}>
        {role === 'assistant' ? (
          <ReactMarkdown className="prose prose-sm">
            {content}
          </ReactMarkdown>
        ) : (
          <p>{content}</p>
        )}
      </div>
    </div>
  );
}
```

## Styling

### Tailwind CSS v4

Configuration in `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### Global Styles

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900;
  }
}

@layer components {
  .card {
    @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6;
  }
}
```

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=Accounting AI Agent

# OAuth (for frontend redirect)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_GITHUB_CLIENT_ID=your-github-client-id
```

## Build & Deployment

### Development

```bash
npm run dev
# Opens at http://localhost:3000
```

### Production Build

```bash
npm run build
npm start
```

### Static Export (if applicable)

```bash
npm run build
# Output in .next/
```

## Testing

### Unit Tests

```bash
npm run test
```

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

## Related Documentation

- [Architecture](./ARCHITECTURE.md)
- [API Reference](./API_REFERENCE.md)
- [Authentication](./AUTHENTICATION.md)
